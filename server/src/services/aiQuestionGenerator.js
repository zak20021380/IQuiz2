const env = require('../config/env');
const logger = require('../config/logger');
const Question = require('../models/Question');
const Category = require('../models/Category');
const { fetchWithRetry } = require('../lib/http');

const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const MAX_COUNT = 100;
const PREVIEW_LIMIT = 10;

function sanitizeCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 1) return 1;
  if (parsed > MAX_COUNT) return MAX_COUNT;
  return parsed;
}

function sanitizeTemperature(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric < 0) return 0;
  if (numeric > 1) return 1;
  return Math.round(numeric * 100) / 100;
}

function sanitizeSeed(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

function sanitizeTopicHints(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 400);
}

function sanitizePrompt(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 600);
}

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeChoice(value) {
  return sanitizeString(value).replace(/\s+/g, ' ').trim();
}

function normalizeQuestionText(value) {
  return sanitizeString(value).replace(/\s+/g, ' ').trim();
}

function normalizeExplanation(value) {
  return sanitizeString(value).replace(/\s+/g, ' ').trim();
}

function mapInvalid(item, reason) {
  return {
    text: sanitizeString(item?.text),
    reason
  };
}

function buildSchema(count) {
  return {
    name: 'quiz_batch',
    schema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          maxItems: count,
          items: {
            type: 'object',
            required: ['text', 'choices', 'correctIndex'],
            properties: {
              text: { type: 'string', minLength: 12, maxLength: 320 },
              choices: {
                type: 'array',
                minItems: 4,
                maxItems: 4,
                items: { type: 'string', minLength: 1, maxLength: 160 }
              },
              correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
              explanation: { type: 'string' }
            }
          }
        }
      }
    }
  };
}

function extractResponsePayload(data) {
  if (!data) return null;
  const firstChoice = Array.isArray(data.choices) ? data.choices[0] : null;
  const message = firstChoice?.message;
  if (!message) return null;

  if (message.parsed) {
    return message.parsed;
  }

  if (typeof message.content === 'string') {
    try {
      return JSON.parse(message.content);
    } catch (error) {
      return null;
    }
  }

  if (Array.isArray(message.content)) {
    const jsonPart = message.content.find((part) => part?.type === 'json' || part?.type === 'output_text' || part?.type === 'text');
    if (jsonPart?.text) {
      try {
        return JSON.parse(jsonPart.text);
      } catch (error) {
        return null;
      }
    }
    if (jsonPart?.data) {
      return jsonPart.data;
    }
  }

  return null;
}

async function callModel({ count, category, difficulty, topicHints, temperature, seed, customPrompt }) {
  const apiKey = env.ai?.openai?.apiKey;
  if (!apiKey) {
    const error = new Error('پیکربندی کلید OpenAI یافت نشد.');
    error.statusCode = 503;
    throw error;
  }

  const baseUrl = env.ai?.openai?.baseUrl || 'https://api.openai.com/v1';
  const model = env.ai?.openai?.model || 'gpt-4o-mini';
  const temperatureValue = sanitizeTemperature(temperature, env.ai?.defaultTemperature ?? 0.35);
  const instructions = [
    'Write clear and concise quiz questions in Persian with natural phrasing.',
    'Choices must be short (under 40 characters) and mutually exclusive.',
    'Provide exactly four answer options and mark the index of the correct choice.',
    'Avoid repeating the question text in the choices and avoid answers like "همه موارد".',
    'Each question must be unique within this batch and should not duplicate common public trivia verbatim.',
    'Prefer Iran-centric knowledge when relevant to the requested category.'
  ];

  if (customPrompt) {
    instructions.push(customPrompt);
  }

  if (topicHints) {
    instructions.push(`Use these topic hints as inspiration: ${topicHints}`);
  }

  const payload = {
    model,
    temperature: temperatureValue,
    response_format: { type: 'json_schema', json_schema: buildSchema(count) },
    messages: [
      {
        role: 'system',
        content: 'You are an expert quiz creator that writes multiple choice questions in Persian (Farsi). Every response must follow the provided JSON schema.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          language: 'fa-IR',
          count,
          difficulty,
          category: {
            slug: category.slug,
            name: category.name,
            displayName: category.displayName
          },
          topicHints,
          instructions,
          customPrompt: customPrompt || undefined
        }, null, 2)
      }
    ]
  };

  if (seed !== null && seed !== undefined) {
    payload.seed = seed;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  if (env.ai?.openai?.organization) {
    headers['OpenAI-Organization'] = env.ai.openai.organization;
  }
  if (env.ai?.openai?.project) {
    headers['OpenAI-Project'] = env.ai.openai.project;
  }

  const targetUrl = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const response = await fetchWithRetry(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    timeout: 60000,
    retries: 0
  });

  if (!response.ok) {
    let message = `خطا در فراخوانی سرویس هوش مصنوعی (کد ${response.status})`;
    try {
      const errorBody = await response.json();
      if (errorBody?.error?.message) {
        message = errorBody.error.message;
      }
    } catch (err) {
      logger.warn(`[AI] Failed to parse error response: ${err.message}`);
    }
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    const err = new Error('پاسخ سرویس هوش مصنوعی معتبر نبود.');
    err.cause = error;
    throw err;
  }

  const parsed = extractResponsePayload(data);
  if (!parsed || !Array.isArray(parsed.items)) {
    const error = new Error('ساختار خروجی مدل معتبر نیست.');
    error.statusCode = 502;
    throw error;
  }

  return parsed.items;
}

function validateAndNormalizeItems(items, context) {
  const results = [];
  const invalid = [];

  items.forEach((item, index) => {
    const text = normalizeQuestionText(item?.text);
    if (!text || text.length < 12 || text.length > 320) {
      invalid.push(mapInvalid(item, 'طول متن سوال نامعتبر است'));
      return;
    }

    const rawChoices = Array.isArray(item?.choices) ? item.choices : [];
    if (rawChoices.length !== 4) {
      invalid.push(mapInvalid(item, 'باید دقیقا چهار گزینه وجود داشته باشد'));
      return;
    }

    const choices = rawChoices.map(normalizeChoice);
    if (choices.some((choice) => !choice)) {
      invalid.push(mapInvalid(item, 'تمام گزینه‌ها باید تکمیل شوند'));
      return;
    }

    const uniqueChoices = new Set(choices.map((choice) => choice.toLowerCase()));
    if (uniqueChoices.size < 4) {
      invalid.push(mapInvalid(item, 'گزینه‌های تکراری مجاز نیست'));
      return;
    }

    const correctIndex = Number.isInteger(item?.correctIndex)
      ? Number(item.correctIndex)
      : Number.parseInt(item?.correctIndex, 10);

    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      invalid.push(mapInvalid(item, 'اندیس گزینه صحیح نامعتبر است'));
      return;
    }

    const explanation = normalizeExplanation(item?.explanation);

    results.push({
      text,
      choices,
      correctIndex,
      explanation,
      difficulty: context.difficulty,
      categorySlug: context.categorySlug,
      rawIndex: index
    });
  });

  return { valid: results, invalid };
}

async function filterDuplicates(provider, items) {
  if (!items.length) {
    return { unique: [], duplicates: [] };
  }

  const hashMap = new Map();
  const duplicateWithinRequest = [];
  const uniqueItems = [];

  items.forEach((item) => {
    try {
      const choice = item.choices[item.correctIndex];
      const hash = Question.generateHash(item.text, choice);
      if (!hash) {
        duplicateWithinRequest.push({ text: item.text, reason: 'عدم امکان محاسبه هش' });
        return;
      }
      if (hashMap.has(hash)) {
        duplicateWithinRequest.push({ text: item.text, reason: 'تکراری در همین درخواست' });
        return;
      }
      hashMap.set(hash, item);
      uniqueItems.push({ ...item, hash });
    } catch (error) {
      duplicateWithinRequest.push({ text: item.text, reason: 'خطا در محاسبه هش' });
    }
  });

  const hashes = Array.from(hashMap.keys());
  if (!hashes.length) {
    return { unique: [], duplicates: duplicateWithinRequest };
  }

  const existing = await Question.find({ provider, hash: { $in: hashes } }, { hash: 1, _id: 0 }).lean();
  const existingSet = new Set(existing.map((doc) => doc.hash));
  const filtered = [];
  const duplicates = [...duplicateWithinRequest];

  uniqueItems.forEach((item) => {
    if (existingSet.has(item.hash)) {
      duplicates.push({ text: item.text, reason: 'در بانک سوال موجود است' });
    } else {
      filtered.push(item);
    }
  });

  return { unique: filtered, duplicates };
}

function buildQuestionDocs(items, context) {
  return items.map((item) => {
    const correctChoice = item.choices[item.correctIndex];
    const hash = Question.generateHash(item.text, correctChoice);
    const meta = {
      ai: {
        explanation: item.explanation || undefined,
        topicHints: context.topicHints || undefined,
        prompt: context.prompt || undefined,
        seed: context.seed ?? undefined,
        temperature: context.temperature,
      }
    };

    return {
      text: item.text,
      choices: item.choices,
      correctIndex: item.correctIndex,
      difficulty: context.difficulty,
      category: context.categoryId,
      categoryName: context.categoryName,
      categorySlug: context.categorySlug,
      active: true,
      lang: 'fa',
      source: 'ai-gen',
      provider: 'ai-gen',
      status: 'approved',
      isApproved: true,
      authorName: 'تیم هوش مصنوعی آیکوئیز',
      submittedBy: context.requestedBy || undefined,
      hash,
      checksum: hash,
      meta
    };
  });
}

async function generateQuestions(options = {}) {
  const {
    count: countRaw,
    categorySlug: categorySlugRaw,
    difficulty: difficultyRaw,
    topicHints: topicHintsRaw,
    prompt: promptRaw,
    temperature,
    seed,
    previewOnly = false,
    requestedBy
  } = options;

  const count = sanitizeCount(countRaw) || 1;
  const normalizedDifficulty = sanitizeString(difficultyRaw).toLowerCase();
  const difficulty = ALLOWED_DIFFICULTIES.has(normalizedDifficulty) ? normalizedDifficulty : 'medium';
  const topicHints = sanitizeTopicHints(topicHintsRaw);
  const customPrompt = sanitizePrompt(promptRaw);
  const appliedCount = previewOnly ? Math.min(count, PREVIEW_LIMIT) : count;
  const normalizedSlug = sanitizeString(categorySlugRaw).toLowerCase();

  if (!normalizedSlug) {
    const error = new Error('انتخاب دسته‌بندی الزامی است.');
    error.statusCode = 400;
    throw error;
  }

  const category = await Category.findOne({ slug: normalizedSlug }).lean();
  if (!category) {
    const error = new Error('دسته‌بندی انتخاب شده معتبر نیست.');
    error.statusCode = 404;
    throw error;
  }

  const seedValue = sanitizeSeed(seed);
  const temperatureValue = sanitizeTemperature(temperature, env.ai?.defaultTemperature ?? 0.35);

  let rawItems;
  try {
    rawItems = await callModel({
      count: appliedCount,
      category,
      difficulty,
      topicHints,
      customPrompt,
      temperature: temperatureValue,
      seed: seedValue
    });
  } catch (error) {
    logger.error(`[AI] Generation failed: ${error.message}`);
    throw error;
  }

  const { valid, invalid } = validateAndNormalizeItems(rawItems, {
    difficulty,
    categorySlug: category.slug
  });

  const { unique, duplicates } = await filterDuplicates('ai-gen', valid);
  const docs = buildQuestionDocs(unique, {
    difficulty,
    categoryId: category._id,
    categoryName: category.displayName || category.name,
    categorySlug: category.slug,
    topicHints,
    prompt: customPrompt,
    seed: seedValue,
    temperature: temperatureValue,
    requestedBy
  });

  let inserted = 0;
  if (!previewOnly && docs.length) {
    try {
      const result = await Question.insertMany(docs, { ordered: false });
      inserted = Array.isArray(result) ? result.length : 0;
    } catch (error) {
      logger.error(`[AI] Failed to insert generated questions: ${error.message}`);
      throw error;
    }
  }

  const preview = unique.slice(0, PREVIEW_LIMIT).map((item) => ({
    text: item.text,
    choices: item.choices,
    correctIndex: item.correctIndex,
    explanation: item.explanation || ''
  }));

  return {
    inserted,
    invalid,
    duplicates,
    preview,
    generated: unique.length,
    requested: appliedCount
  };
}

module.exports = {
  generateQuestions,
};
