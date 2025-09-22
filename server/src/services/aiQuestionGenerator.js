const env = require('../config/env');
const logger = require('../config/logger');
const Question = require('../models/Question');
const { fetchWithRetry } = require('../lib/http');
const { createQuestionUid } = require('../utils/hash');

const MAX_COUNT = 50;
const DEFAULT_MODEL = process.env.OPENAI_MODEL || env.ai?.openai?.model || 'gpt-5-mini';

function sanitizeTopic(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.slice(0, 160);
}

function sanitizeDifficulty(value) {
  const allowed = new Set(['easy', 'medium', 'hard']);
  if (typeof value !== 'string') return 'medium';
  const normalized = value.trim().toLowerCase();
  return allowed.has(normalized) ? normalized : 'medium';
}

function sanitizeLang(value) {
  if (typeof value !== 'string') return 'fa';
  const normalized = value.trim().toLowerCase();
  if (!normalized) return 'fa';
  return normalized.slice(0, 10);
}

function sanitizeCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  if (parsed > MAX_COUNT) return MAX_COUNT;
  return parsed;
}

function normalizeOption(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slugifyTopic(topic) {
  return String(topic || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildPrompt({ topic, count, difficulty, lang }) {
  const safeTopic = topic.replace(/'/g, "\\'");
  const safeDifficulty = difficulty.replace(/'/g, "\\'");
  const safeLang = lang.replace(/'/g, "\\'");
  return `You are an MCQ generator. Return ONLY a JSON array length=${count}. Each: {question,options[4],answerIndex,category:'${safeTopic}',difficulty:'${safeDifficulty}'}. Language=${safeLang}. Constraints: concise; factual; no explanations; no markdown; options mutually exclusive; no 'All/None'; vary answer position; avoid duplicates.`;
}

function buildResponseFormat(count) {
  const normalizedCount = Math.max(1, Math.min(count, MAX_COUNT));
  return {
    type: 'json_schema',
    json_schema: {
      name: 'ai_mcq_batch',
      schema: {
        type: 'array',
        minItems: 1,
        maxItems: normalizedCount,
        items: {
          type: 'object',
          required: ['question', 'options', 'answerIndex'],
          properties: {
            question: { type: 'string', minLength: 6, maxLength: 400 },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string', minLength: 1, maxLength: 200 }
            },
            answerIndex: { type: 'integer', minimum: 0, maximum: 3 },
            category: { type: 'string' },
            difficulty: { type: 'string' }
          }
        }
      }
    }
  };
}

async function callOpenAi({ topic, count, difficulty, lang, model }) {
  const apiKey = process.env.OPENAI_API_KEY || env.ai?.openai?.apiKey;
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not configured');
    error.statusCode = 503;
    throw error;
  }

  const baseUrl = env.ai?.openai?.baseUrl || 'https://api.openai.com/v1';
  const prompt = buildPrompt({ topic, count, difficulty, lang });
  const payload = {
    model,
    input: [
      {
        role: 'system',
        content: [
          { type: 'text', text: 'You create high-quality multiple choice questions for quizzes.' }
        ]
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt }
        ]
      }
    ],
    temperature: 0.4,
    top_p: 0.9,
    max_output_tokens: Math.min(120 * count, 120 * MAX_COUNT),
    text: {
      format: buildResponseFormat(count)
    }
  };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  };

  if (env.ai?.openai?.organization) {
    headers['OpenAI-Organization'] = env.ai.openai.organization;
  }
  if (env.ai?.openai?.project) {
    headers['OpenAI-Project'] = env.ai.openai.project;
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/responses`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    timeout: 60000,
    retries: 2,
    retryOn: new Set([408, 425, 429, 500, 502, 503, 504])
  });

  if (!response.ok) {
    let message = `Failed to call OpenAI (status ${response.status})`;
    try {
      const errorBody = await response.json();
      if (errorBody?.error?.message) {
        message = errorBody.error.message;
      }
    } catch (parseError) {
      // ignore parse error, keep default message
    }
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    const err = new Error('Failed to parse OpenAI response');
    err.cause = error;
    err.statusCode = 502;
    throw err;
  }

  const usage = data?.usage || null;
  const items = extractItemsFromResponse(data);
  return { items, usage };
}

function extractItemsFromResponse(payload) {
  if (!payload) return [];

  if (Array.isArray(payload.output)) {
    for (const block of payload.output) {
      if (!Array.isArray(block?.content)) continue;
      for (const part of block.content) {
        if (part?.type === 'output_json' && part.json) {
          if (Array.isArray(part.json)) return part.json;
          if (typeof part.json === 'string') {
            try {
              const parsed = JSON.parse(part.json);
              if (Array.isArray(parsed)) return parsed;
            } catch (err) {
              // ignore
            }
          }
        }
        if (part?.type === 'output_text' || part?.type === 'text') {
          if (typeof part.text === 'string' && part.text.trim()) {
            try {
              const parsed = JSON.parse(part.text);
              if (Array.isArray(parsed)) return parsed;
            } catch (error) {
              // ignore and continue
            }
          }
        }
      }
    }
  }

  if (Array.isArray(payload.choices)) {
    const message = payload.choices[0]?.message;
    if (message?.parsed && Array.isArray(message.parsed)) {
      return message.parsed;
    }
    if (typeof message?.content === 'string') {
      try {
        const parsed = JSON.parse(message.content);
        if (Array.isArray(parsed)) return parsed;
      } catch (error) {
        // ignore
      }
    }
  }

  if (typeof payload.output_text === 'string') {
    try {
      const parsed = JSON.parse(payload.output_text);
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      // ignore
    }
  }

  return [];
}

function buildInvalidEntry(raw, reason) {
  const questionText = typeof raw?.question === 'string' ? raw.question : '';
  return { question: questionText, reason };
}

function normalizeQuestionItem(raw, context) {
  const questionText = normalizeOption(raw?.question);
  if (!questionText || questionText.length < 6) {
    return { error: buildInvalidEntry(raw, 'متن سوال نامعتبر است') };
  }

  const rawOptions = Array.isArray(raw?.options) ? raw.options.slice(0, 4) : [];
  if (rawOptions.length !== 4) {
    return { error: buildInvalidEntry(raw, 'باید دقیقا چهار گزینه وجود داشته باشد') };
  }

  const options = rawOptions.map(normalizeOption);
  if (options.some((option) => !option)) {
    return { error: buildInvalidEntry(raw, 'تمام گزینه‌ها باید تکمیل شوند') };
  }

  const uniqueOptions = new Set(options.map((opt) => opt.toLowerCase()));
  if (uniqueOptions.size < 4) {
    return { error: buildInvalidEntry(raw, 'گزینه‌های تکراری مجاز نیست') };
  }

  const answerIndex = Number(raw?.answerIndex);
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
    return { error: buildInvalidEntry(raw, 'پاسخ صحیح نامعتبر است') };
  }

  const uid = createQuestionUid(questionText);
  if (!uid) {
    return { error: buildInvalidEntry(raw, 'امکان ایجاد شناسه یکتا نبود') };
  }

  const itemDifficulty = sanitizeDifficulty(raw?.difficulty || context.difficulty);
  const category = sanitizeTopic(raw?.category) || context.topic;

  return {
    value: {
      uid,
      question: questionText,
      options,
      answerIndex,
      difficulty: itemDifficulty,
      category,
      lang: context.lang
    }
  };
}

function validateItems(items, context) {
  const valid = [];
  const invalid = [];

  items.forEach((raw) => {
    const normalized = normalizeQuestionItem(raw, context);
    if (normalized.error) {
      invalid.push(normalized.error);
    } else if (normalized.value) {
      valid.push(normalized.value);
    }
  });

  return { valid, invalid };
}

async function filterDuplicates(items) {
  const duplicates = [];
  const uniqueMap = new Map();

  items.forEach((item) => {
    const existing = uniqueMap.get(item.uid);
    if (existing) {
      duplicates.push({ ...item, reason: 'batch' });
    } else {
      uniqueMap.set(item.uid, item);
    }
  });

  const uniqueItems = Array.from(uniqueMap.values());
  if (!uniqueItems.length) {
    return { unique: [], duplicates };
  }

  const existingDocs = await Question.find({ uid: { $in: uniqueItems.map((item) => item.uid) } })
    .select('_id uid text createdAt difficulty categoryName')
    .lean();

  const existingMap = new Map();
  existingDocs.forEach((doc) => {
    existingMap.set(doc.uid, doc);
  });

  const filtered = [];
  uniqueItems.forEach((item) => {
    const existingDoc = existingMap.get(item.uid);
    if (existingDoc) {
      duplicates.push({ ...item, reason: 'exists', existing: existingDoc });
    } else {
      filtered.push(item);
    }
  });

  return { unique: filtered, duplicates };
}

function mapDuplicateForResponse(item) {
  const base = {
    uid: item.uid,
    question: item.question,
    reason: item.reason || 'exists'
  };

  if (item.existing) {
    base.existingId = item.existing._id;
    base.existingQuestion = item.existing.text;
    base.existingCreatedAt = item.existing.createdAt;
  }

  return base;
}

function mapPreviewItem(item) {
  return {
    uid: item.uid,
    question: item.question,
    options: item.options,
    answerIndex: item.answerIndex,
    difficulty: item.difficulty,
    category: item.category,
    lang: item.lang
  };
}

async function insertQuestions(items, context) {
  if (!items.length) return 0;

  const docs = items.map((item) => {
    const options = item.options;
    const slug = slugifyTopic(item.category);
    const meta = {
      generator: 'openai-responses',
      topic: item.category,
      lang: item.lang,
      model: context.model
    };
    if (context.requestedBy) {
      meta.requestedBy = context.requestedBy;
    }
    return {
      uid: item.uid,
      text: item.question,
      choices: options,
      options,
      correctIndex: item.answerIndex,
      correctIdx: item.answerIndex,
      difficulty: item.difficulty,
      categoryName: item.category,
      categorySlug: slug,
      provider: 'ai-gen',
      source: 'AI',
      lang: item.lang,
      status: 'approved',
      isApproved: true,
      active: true,
      authorName: 'AI Generator',
      submittedBy: context.requestedBy || undefined,
      meta
    };
  });

  const inserted = await Question.insertMany(docs, { ordered: false });
  return Array.isArray(inserted) ? inserted.length : 0;
}

function logUsage(usage, meta = {}) {
  if (!usage) return;
  const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? (inputTokens + outputTokens);
  const parts = [`prompt=${inputTokens}`, `completion=${outputTokens}`, `total=${totalTokens}`];
  if (meta.topic) parts.push(`topic="${meta.topic}"`);
  if (meta.count) parts.push(`count=${meta.count}`);
  logger.info(`[AI] OpenAI usage ${parts.join(' | ')}`);
}

async function generateQuestions(options = {}) {
  const topic = sanitizeTopic(options.topic);
  if (!topic) {
    const error = new Error('موضوع سوال الزامی است.');
    error.statusCode = 400;
    throw error;
  }

  const count = sanitizeCount(options.count);
  const difficulty = sanitizeDifficulty(options.difficulty);
  const lang = sanitizeLang(options.lang || 'fa');
  const previewOnly = Boolean(options.previewOnly);
  const model = DEFAULT_MODEL;

  const reusePreview = Array.isArray(options.previewQuestions) && options.previewQuestions.length > 0;

  let rawItems;
  let usage = null;

  if (reusePreview) {
    rawItems = options.previewQuestions;
  } else {
    const response = await callOpenAi({ topic, count, difficulty, lang, model });
    rawItems = response.items;
    usage = response.usage;
    logUsage(usage, { topic, count });
  }

  const { valid, invalid } = validateItems(rawItems || [], { topic, difficulty, lang });
  const { unique, duplicates } = await filterDuplicates(valid);

  let inserted = 0;
  if (!previewOnly && unique.length) {
    try {
      inserted = await insertQuestions(unique, { requestedBy: options.requestedBy, model });
    } catch (error) {
      logger.error(`[AI] Failed to insert generated questions: ${error.message}`);
      throw error;
    }
  }

  const preview = unique.map(mapPreviewItem);
  const duplicateSummaries = duplicates.map(mapDuplicateForResponse);

  return {
    requested: count,
    generated: unique.length,
    inserted,
    preview,
    duplicates: duplicateSummaries,
    invalid,
    reusedPreview: reusePreview
  };
}

module.exports = {
  generateQuestions,
};
