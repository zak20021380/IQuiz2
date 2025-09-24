const env = require('../config/env');
const logger = require('../config/logger');
const Question = require('../models/Question');
const { createQuestionUid } = require('../utils/hash');
const { openai } = require('../lib/openaiClient');

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

function buildSystemPrompt(lang) {
  const localized = lang === 'fa' ? 'Persian (Farsi)' : lang;
  return `You are an expert quiz question generator. You craft ${localized} multiple-choice questions with exactly four answer options and one correct answer. Your responses must be valid JSON that adheres to the provided schema.`;
}

function buildUserPrompt({ topic, count, difficulty, lang }) {
  const safeTopic = topic.replace(/\"/g, '\\"');
  const safeDifficulty = difficulty.replace(/\"/g, '\\"');
  const safeLang = lang.replace(/\"/g, '\\"');
  return [
    `Generate ${count} ${safeLang} multiple-choice questions about "${safeTopic}" with overall difficulty "${safeDifficulty}".`,
    'Each question must have exactly four distinct answer options and specify the correct option index (0-based).',
    'Avoid repeating questions, avoid answers like "All of the above" or "None of the above", and keep the content concise and factual.',
    'Return ONLY valid JSON that satisfies the provided schema (an object with an "items" array). Do not include markdown or prose.'
  ].join(' ');
}

function buildResponseFormat(count) {
  const normalizedCount = Math.max(1, Math.min(count, MAX_COUNT));
  return {
    type: 'json_schema',
    json_schema: {
      name: 'ai_mcq_batch',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            minItems: normalizedCount,
            maxItems: normalizedCount,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['question', 'options', 'correct_index'],
              properties: {
                question: { type: 'string', minLength: 6, maxLength: 400 },
                options: {
                  type: 'array',
                  minItems: 4,
                  maxItems: 4,
                  items: { type: 'string', minLength: 1, maxLength: 200 }
                },
                correct_index: { type: 'integer', minimum: 0, maximum: 3 },
                explanation: { type: 'string', minLength: 0, maxLength: 600 },
                category: { type: 'string', minLength: 1, maxLength: 160 },
                difficulty: { type: 'string', minLength: 1, maxLength: 16 }
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
  const systemPrompt = buildSystemPrompt(lang);
  const userPrompt = buildUserPrompt({ topic, count, difficulty, lang });

  let response;
  try {
    response = await openai.responses.create({
      model,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'input_text', text: userPrompt }] }
      ],
      response_format: buildResponseFormat(count),
      temperature: 0.4,
      top_p: 0.9,
      max_output_tokens: Math.min(160 * count, 160 * MAX_COUNT)
    });
  } catch (error) {
    const err = new Error(error?.message || 'Failed to call OpenAI');
    err.statusCode = error?.status ?? error?.statusCode ?? 502;
    err.cause = error;
    throw err;
  }

  const usage = response?.usage || null;
  const rawItems = extractItemsFromResponse(response);
  const items = normalizeResponseItems(rawItems);
  return { items, usage };
}

function parseJsonSafe(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return null;
  }
}

function coerceItemArray(candidate) {
  if (!candidate) return [];
  if (Array.isArray(candidate)) return candidate;
  if (typeof candidate === 'object') {
    if (Array.isArray(candidate.items)) return candidate.items;
    if (Array.isArray(candidate.questions)) return candidate.questions;
    if (Array.isArray(candidate.data)) return candidate.data;
  }
  return [];
}

function extractItemsFromResponse(payload) {
  if (!payload) return [];

  const fromCandidate = (candidate) => {
    const arr = coerceItemArray(candidate);
    return arr.length ? arr : null;
  };

  if (typeof payload.output_text === 'string') {
    const arr = fromCandidate(parseJsonSafe(payload.output_text));
    if (arr) return arr;
  }

  if (Array.isArray(payload.output)) {
    for (const block of payload.output) {
      if (!Array.isArray(block?.content)) continue;
      for (const part of block.content) {
        if (part?.type === 'output_json') {
          const arr = fromCandidate(part.json);
          if (arr) return arr;
        }
        if ((part?.type === 'output_text' || part?.type === 'text') && typeof part.text === 'string') {
          const arr = fromCandidate(parseJsonSafe(part.text));
          if (arr) return arr;
        }
      }
    }
  }

  if (Array.isArray(payload.choices)) {
    const message = payload.choices[0]?.message;
    if (message?.parsed) {
      const arr = fromCandidate(message.parsed);
      if (arr) return arr;
    }
    if (typeof message?.content === 'string') {
      const arr = fromCandidate(parseJsonSafe(message.content));
      if (arr) return arr;
    }
  }

  return [];
}

function normalizeResponseItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];

  return rawItems.map((item) => {
    const options = Array.isArray(item?.options) ? item.options : [];
    const answerIndex =
      item?.answerIndex ??
      item?.correct_index ??
      item?.correctIndex ??
      item?.correct_option ??
      item?.correctOption;

    const explanation = typeof item?.explanation === 'string' ? item.explanation : undefined;
    const difficulty = typeof item?.difficulty === 'string' ? item.difficulty : undefined;
    const category = typeof item?.category === 'string' ? item.category : undefined;

    return {
      question: typeof item?.question === 'string' ? item.question : '',
      options,
      answerIndex,
      difficulty,
      category,
      explanation
    };
  });
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

  const rawAnswerIndex =
    raw?.answerIndex ??
    raw?.correct_index ??
    raw?.correctIndex ??
    raw?.correct_option ??
    raw?.correctOption;
  const answerIndex = Number(rawAnswerIndex);
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
    return { error: buildInvalidEntry(raw, 'پاسخ صحیح نامعتبر است') };
  }

  const uid = createQuestionUid(questionText);
  if (!uid) {
    return { error: buildInvalidEntry(raw, 'امکان ایجاد شناسه یکتا نبود') };
  }

  const itemDifficulty = sanitizeDifficulty(raw?.difficulty || context.difficulty);
  const category = sanitizeTopic(raw?.category) || context.topic;
  const explanation = typeof raw?.explanation === 'string' ? raw.explanation.trim() : '';

  return {
    value: {
      uid,
      question: questionText,
      options,
      answerIndex,
      difficulty: itemDifficulty,
      category,
      lang: context.lang,
      explanation: explanation || undefined
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
    lang: item.lang,
    explanation: item.explanation || ''
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
    if (item.explanation) {
      meta.explanation = item.explanation;
    }
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
