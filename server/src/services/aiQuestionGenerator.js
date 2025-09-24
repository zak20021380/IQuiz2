const OpenAI = require('openai');

const env = require('../config/env');
const logger = require('../config/logger');
const Question = require('../models/Question');
const { createQuestionUid } = require('../utils/hash');

const MAX_COUNT = 50;
const DEFAULT_MODEL = env.ai?.openai?.model || process.env.OPENAI_MODEL || 'gpt-5';

let openAiClient;

function getOpenAiClient() {
  if (openAiClient) return openAiClient;

  const apiKey = process.env.OPENAI_API_KEY || env.ai?.openai?.apiKey;
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not configured');
    error.statusCode = 503;
    throw error;
  }

  openAiClient = new OpenAI({
    apiKey,
    baseURL: env.ai?.openai?.baseUrl || undefined,
    organization: env.ai?.openai?.organization || undefined,
    project: env.ai?.openai?.project || undefined
  });

  return openAiClient;
}

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

function describeLanguage(lang) {
  if (typeof lang !== 'string') return 'Persian';
  const normalized = lang.trim().toLowerCase();
  if (!normalized) return 'Persian';
  const map = {
    fa: 'Persian',
    en: 'English',
    ar: 'Arabic'
  };
  return map[normalized] || normalized;
}

function buildPrompt({ topic, count, difficulty, lang }) {
  const safeTopic = topic.replace(/"/g, '\\"');
  const safeDifficulty = difficulty.replace(/"/g, '\\"');
  const languageLabel = describeLanguage(lang);
  return `Generate ${count} ${languageLabel} MCQs about "${safeTopic}" (difficulty: ${safeDifficulty}). Each: one correct answer, 4 options, JSON only.`;
}

function buildResponseFormat(count) {
  const normalizedCount = Math.max(1, Math.min(count, MAX_COUNT));
  return {
    type: 'json_schema',
    json_schema: {
      name: 'mcq_batch',
      schema: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            minItems: 1,
            maxItems: normalizedCount,
            items: {
              type: 'object',
              required: ['question', 'options', 'correct_index'],
              properties: {
                question: { type: 'string', minLength: 6, maxLength: 400 },
                options: {
                  type: 'array',
                  minItems: 4,
                  maxItems: 4,
                  items: { type: 'string', minLength: 1, maxLength: 200 }
                },
                correct_index: { type: 'integer', minimum: 0, maximum: 3 }
              }
            }
          }
        }
      },
      strict: true
    }
  };
}

async function callOpenAi({ topic, count, difficulty, lang, model }) {
  const client = getOpenAiClient();
  const prompt = buildPrompt({ topic, count, difficulty, lang });

  let response;
  try {
    response = await client.responses.create({
      model: model || DEFAULT_MODEL,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt }
          ]
        }
      ],
      response_format: buildResponseFormat(count),
      temperature: 0.4,
      top_p: 0.9,
      max_output_tokens: Math.min(160 * count, 160 * MAX_COUNT)
    });
  } catch (error) {
    const status = error?.status || error?.statusCode || 502;
    const err = new Error(error?.message || 'Failed to call OpenAI');
    err.statusCode = status;
    err.cause = error;
    throw err;
  }

  const outputText = typeof response?.output_text === 'string' ? response.output_text.trim() : '';
  if (!outputText) {
    const error = new Error('Empty response from OpenAI');
    error.statusCode = 502;
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    const err = new Error('Failed to parse OpenAI response');
    err.cause = error;
    err.statusCode = 502;
    throw err;
  }

  let itemsRaw = [];
  if (Array.isArray(parsed?.items)) {
    itemsRaw = parsed.items;
  } else if (Array.isArray(parsed)) {
    itemsRaw = parsed;
  }

  const items = Array.isArray(itemsRaw)
    ? itemsRaw
        .filter((item) => item && typeof item === 'object')
        .map((item) => {
          const question = typeof item.question === 'string' ? item.question : '';
          const rawOptions = Array.isArray(item.options) ? item.options : [];
          const options = rawOptions
            .slice(0, 4)
            .map((option) => (typeof option === 'string' ? option : String(option ?? '').trim()));
          while (options.length < 4) options.push('');
          let correctIndex = Number.isInteger(item.correct_index)
            ? item.correct_index
            : Number.parseInt(item.correct_index, 10);
          if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
            correctIndex = 0;
          }
          return {
            question,
            options,
            correct_index: correctIndex,
            difficulty: typeof item.difficulty === 'string' ? item.difficulty : difficulty,
            lang
          };
        })
    : [];

  return { items, usage: response?.usage || null };
}

function buildInvalidEntry(raw, reason) {
  const questionText = typeof raw?.question === 'string' ? raw.question : '';
  return { question: questionText, text: questionText, reason };
}

function normalizeQuestionItem(raw, context) {
  const sourceQuestion = typeof raw?.question === 'string' ? raw.question : raw?.text;
  const questionText = normalizeOption(sourceQuestion);
  if (!questionText || questionText.length < 6) {
    return { error: buildInvalidEntry(raw, 'متن سوال نامعتبر است') };
  }

  const optionSource = Array.isArray(raw?.options) ? raw.options : Array.isArray(raw?.choices) ? raw.choices : [];
  const rawOptions = optionSource.slice(0, 4);
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

  const candidateIndices = [
    raw?.answerIndex,
    raw?.correctIndex,
    raw?.correct_index,
    raw?.correctIdx
  ];

  let answerIndex;
  for (const candidate of candidateIndices) {
    if (candidate == null) continue;
    const parsed = typeof candidate === 'string' ? Number.parseInt(candidate, 10) : candidate;
    if (Number.isInteger(parsed)) {
      answerIndex = parsed;
      break;
    }
  }

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
    text: item.question,
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
  const correctIndex = item.answerIndex;
  return {
    uid: item.uid,
    question: item.question,
    text: item.question,
    options: item.options,
    choices: item.options,
    answerIndex: correctIndex,
    correctIndex,
    correct_index: correctIndex,
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

async function generateMCQs(options = {}) {
  const topic = sanitizeTopic(options.topic);
  if (!topic) {
    const error = new Error('موضوع سوال الزامی است.');
    error.statusCode = 400;
    throw error;
  }

  const count = sanitizeCount(options.count);
  const difficulty = sanitizeDifficulty(options.difficulty);
  const lang = sanitizeLang(options.language || options.lang || 'fa');
  const model = options.model || DEFAULT_MODEL;

  const response = await callOpenAi({ topic, count, difficulty, lang, model });
  logUsage(response.usage, { topic, count });

  const { valid } = validateItems(response.items || [], { topic, difficulty, lang });
  return valid.map((item) => ({
    question: item.question,
    options: item.options,
    correct_index: item.answerIndex
  }));
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
  generateMCQs,
  generateQuestions,
};
