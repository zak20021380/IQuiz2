// server/src/controllers/ai.controller.js
const Category = require('../models/Category');
const Question = require('../models/Question');
const { resolveCategory } = require('../config/categories');
const { createQuestionUid } = require('../utils/hash');
const { generateQuestions } = require('../services/aiQuestionGenerator');

const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const DEFAULT_DIFFICULTY = 'medium';
const DEFAULT_LANG = 'fa';
const DEFAULT_AUTHOR = 'هوش مصنوعی آیکوئیز';

function clampCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 5;
  return Math.max(1, Math.min(50, Math.round(numeric)));
}

function normalizeDifficulty(value) {
  if (!value) return DEFAULT_DIFFICULTY;
  const normalized = String(value).trim().toLowerCase();
  return ALLOWED_DIFFICULTIES.has(normalized) ? normalized : DEFAULT_DIFFICULTY;
}

function normalizeLang(value) {
  if (!value) return DEFAULT_LANG;
  const normalized = String(value).trim().toLowerCase();
  return normalized || DEFAULT_LANG;
}

function parseTemperature(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const clamped = Math.max(0, Math.min(1, numeric));
  return Math.round(clamped * 100) / 100;
}

function parseSeed(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.round(numeric);
  return Number.isSafeInteger(rounded) ? rounded : null;
}

function buildSchema(count) {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    additionalProperties: false,
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        minItems: count,
        maxItems: count,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'options', 'correct_index'],
          properties: {
            question: { type: 'string' },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string' }
            },
            correct_index: { type: 'integer', minimum: 0, maximum: 3 },
            explanation: { type: 'string' }
          }
        }
      }
    }
  };
}

function pickCategoryFromPayload(body = {}) {
  const candidates = [];
  const push = (value) => {
    if (value !== undefined && value !== null && value !== '') {
      candidates.push(value);
    }
  };

  push(body.categorySlug);
  push(body.categoryId);
  push(body.categoryKey);
  push(body.category);
  push(body.categoryName);
  push(body.categoryTitle);
  push(body.categoryMeta);
  push(body.categoryInfo);
  push(body.categoryData);
  if (body.category && typeof body.category === 'object') {
    candidates.push(body.category);
  }

  for (const candidate of candidates) {
    const resolved = resolveCategory(candidate);
    if (resolved) return resolved;
  }

  return resolveCategory('general');
}

async function ensureCategoryDocument(canonical) {
  if (!canonical) return null;

  let category = await Category.findOne({ slug: canonical.slug });
  if (category) {
    return category;
  }

  category = await Category.create({
    name: canonical.name,
    displayName: canonical.displayName || canonical.name,
    description: canonical.description || '',
    icon: canonical.icon || 'fa-layer-group',
    color: canonical.color || 'blue',
    status: 'active',
    provider: canonical.provider || 'ai-gen',
    providerCategoryId: canonical.providerCategoryId || canonical.slug,
    aliases: Array.isArray(canonical.aliases) ? canonical.aliases : [],
    slug: canonical.slug,
    order: canonical.order
  });

  return category;
}

function buildPrompts({ count, lang, difficulty, category, subject, topicHints, prompt }) {
  const langLabel = lang === 'fa' ? 'Persian' : lang;
  const categoryLabel = category?.displayName || category?.name || '';

  const focusSegments = [];
  if (categoryLabel) focusSegments.push(`category: ${categoryLabel}`);
  if (subject) focusSegments.push(`topic: ${subject}`);
  if (topicHints && !subject?.includes(topicHints)) {
    focusSegments.push(`focus on: ${topicHints}`);
  }

  const userParts = [
    `Generate ${count} ${langLabel} multiple-choice questions (MCQs)`,
    `difficulty: ${difficulty}`
  ];

  if (focusSegments.length) {
    userParts.push(focusSegments.join('. '));
  }

  if (prompt) {
    userParts.push(`Additional instructions: ${prompt}`);
  }

  userParts.push('Return pure JSON only (no markdown, no commentary).');

  const systemPrompt = [
    `You are an MCQ generator for ${langLabel} content.`,
    'Each question must include exactly 4 answer choices and exactly 1 correct answer.',
    'The output MUST strictly follow the provided JSON schema without any extra fields or prose.'
  ].join(' ');

  const userPrompt = userParts.filter(Boolean).join(' ');
  return { systemPrompt, userPrompt };
}

function normalizeGeneratedItems(items) {
  const valid = [];
  const invalid = [];

  if (!Array.isArray(items)) return { valid, invalid };

  items.forEach((item, index) => {
    const questionText = typeof item?.question === 'string' ? item.question : item?.text;
    const text = typeof questionText === 'string' ? questionText.trim() : '';
    const label = text || `سوال ${index + 1}`;

    const rawChoices = Array.isArray(item?.options)
      ? item.options
      : Array.isArray(item?.choices)
        ? item.choices
        : [];

    if (rawChoices.length < 4) {
      invalid.push({ text: label, reason: 'گزینه‌ها باید شامل ۴ مورد باشند.' });
      return;
    }

    const choices = rawChoices.slice(0, 4).map((choice) => String(choice ?? '').trim());

    if (!text) {
      invalid.push({ text: label, reason: 'متن سوال خالی است.' });
      return;
    }

    if (choices.some((choice) => !choice)) {
      invalid.push({ text: label, reason: 'تمام گزینه‌ها باید متن داشته باشند.' });
      return;
    }

    const indexCandidates = [
      item?.correct_index,
      item?.correctIndex,
      item?.answerIndex,
      item?.answer_index
    ];

    let correctIndex = null;
    for (const candidate of indexCandidates) {
      const parsed = Number.parseInt(candidate, 10);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed < choices.length) {
        correctIndex = parsed;
        break;
      }
    }

    if (correctIndex === null) {
      invalid.push({ text: label, reason: 'گزینه صحیح مشخص نشده است.' });
      return;
    }

    const answer = choices[correctIndex];
    if (!answer) {
      invalid.push({ text: label, reason: 'گزینه صحیح نامعتبر است.' });
      return;
    }

    const explanation = typeof item?.explanation === 'string' ? item.explanation.trim() : '';
    const hash = Question.generateChecksum(text, answer);
    const uid = createQuestionUid(text);

    valid.push({
      text,
      choices,
      correctIndex,
      explanation,
      answer,
      hash,
      uid
    });
  });

  return { valid, invalid };
}

function partitionBatchDuplicates(items) {
  const seen = new Set();
  const unique = [];
  const duplicates = [];

  items.forEach((item) => {
    const key = item.hash || item.uid;
    if (key && seen.has(key)) {
      duplicates.push({ text: item.text, reason: 'batch' });
      return;
    }
    if (key) seen.add(key);
    unique.push(item);
  });

  return { unique, duplicates };
}

async function partitionExistingDuplicates(items) {
  if (!items.length) {
    return { fresh: [], duplicates: [] };
  }

  const hashes = Array.from(new Set(items.map((item) => item.hash).filter(Boolean)));
  if (!hashes.length) {
    return { fresh: items.slice(), duplicates: [] };
  }

  const existing = await Question.find({ hash: { $in: hashes } })
    .select({ hash: 1, text: 1 })
    .lean();

  const existingMap = new Map(existing.map((doc) => [doc.hash, doc]));
  const fresh = [];
  const duplicates = [];

  items.forEach((item) => {
    const match = existingMap.get(item.hash);
    if (match) {
      duplicates.push({
        text: item.text,
        reason: 'existing',
        existingQuestion: match.text || ''
      });
    } else {
      fresh.push(item);
    }
  });

  return { fresh, duplicates };
}

function mapPreviewPayload(items) {
  return items.map((item) => ({
    text: item.text,
    choices: item.choices,
    correctIndex: item.correctIndex,
    explanation: item.explanation || ''
  }));
}

/**
 * تلاش‌های مقاوم برای بیرون کشیدن JSON از پاسخ Responses API.
 * از چند مسیر متداول می‌خواند و اگر مدل سه‌تا بک‌تیک گذاشته باشد پاک می‌کند.
 */
function extractJsonObject(resp) {
  const candidates = [];

  if (typeof resp?.output_text === 'string') candidates.push(resp.output_text);

  try {
    const outputArr = Array.isArray(resp?.output) ? resp.output : [];
    for (const c of outputArr) {
      const content = Array.isArray(c?.content) ? c.content : [];
      for (const chunk of content) {
        if (typeof chunk?.text === 'string') candidates.push(chunk.text);
      }
    }
  } catch (_) { /* ignore */ }

  for (const raw of candidates) {
    const cleaned = stripFences(String(raw || ''));
    try {
      const obj = JSON.parse(cleaned);
      if (obj && typeof obj === 'object') return obj;
    } catch (_) { /* try next */ }
  }

  const sample = (candidates[0] || '').slice(0, 300);
  throw new Error(`Model did not return valid JSON. Sample: ${sample}`);
}

function stripFences(s) {
  return s.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

async function postAiGenerate(req, res) {
  try {
    const payload = req.body || {};
    const previewOnly = payload.previewOnly !== undefined ? Boolean(payload.previewOnly) : true;
    const count = clampCount(payload.count);
    const difficulty = normalizeDifficulty(payload.difficulty);
    const lang = normalizeLang(payload.lang);
    const temperature = parseTemperature(payload.temperature);
    const seed = parseSeed(payload.seed);

    const canonicalCategory = pickCategoryFromPayload(payload);
    if (!canonicalCategory) {
      throw new Error('دسته‌بندی معتبر نیست.');
    }

    const categoryDoc = await ensureCategoryDocument(canonicalCategory);
    const categoryName = categoryDoc?.displayName || canonicalCategory.displayName || canonicalCategory.name || '';

    const topic = typeof payload.topic === 'string' ? payload.topic.trim() : '';
    const topicHints = typeof payload.topicHints === 'string' ? payload.topicHints.trim() : '';
    const manualPrompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
    const subject = topic || topicHints || categoryName || 'general knowledge';

    let rawItems = [];
    let previewSource = 'ai';

    if (Array.isArray(payload.previewQuestions) && payload.previewQuestions.length && !previewOnly) {
      rawItems = payload.previewQuestions;
      previewSource = 'client-preview';
    } else {
      const schema = buildSchema(count);
      const { systemPrompt, userPrompt } = buildPrompts({
        count,
        lang,
        difficulty,
        category: canonicalCategory,
        subject,
        topicHints,
        prompt: manualPrompt
      });

      const response = await generateQuestions({
        systemPrompt,
        userPrompt,
        schema,
        temperature,
        seed
      });

      const data = extractJsonObject(response);
      rawItems = Array.isArray(data?.items) ? data.items : [];
    }

    const { valid, invalid } = normalizeGeneratedItems(rawItems);
    const { unique, duplicates: batchDuplicates } = partitionBatchDuplicates(valid);
    const { fresh, duplicates: existingDuplicates } = await partitionExistingDuplicates(unique);

    const duplicates = [...batchDuplicates, ...existingDuplicates];
    const invalidList = invalid;

    if (previewOnly) {
      const preview = mapPreviewPayload(fresh);
      return res.json({
        preview,
        duplicates,
        invalid: invalidList,
        generated: fresh.length,
        inserted: 0
      });
    }

    const insertedItems = [];
    const now = new Date();
    const aiMetaBase = {
      categorySlug: canonicalCategory.slug,
      categoryName,
      subject,
      topic: topic || undefined,
      topicHints: topicHints || undefined,
      prompt: manualPrompt || undefined,
      temperature: temperature ?? undefined,
      seed: seed ?? undefined,
      previewSource
    };

    const cleanedMetaBase = Object.fromEntries(
      Object.entries(aiMetaBase).filter(([, value]) => value !== undefined && value !== '')
    );

    for (const item of fresh) {
      const aiMeta = { ...cleanedMetaBase };
      if (item.explanation) aiMeta.explanation = item.explanation;

      const doc = {
        text: item.text,
        choices: item.choices,
        options: item.choices,
        correctIdx: item.correctIndex,
        correctIndex: item.correctIndex,
        correctAnswer: item.answer,
        difficulty,
        category: categoryDoc?._id || undefined,
        categoryName,
        categorySlug: canonicalCategory.slug,
        lang,
        source: 'AI',
        provider: 'ai-gen',
        status: 'approved',
        isApproved: true,
        active: true,
        type: 'multiple',
        authorName: DEFAULT_AUTHOR,
        submittedAt: now,
        reviewedAt: now,
        reviewedBy: req.user?._id || undefined,
        meta: { ai: aiMeta },
        hash: item.hash,
        checksum: item.hash,
        uid: item.uid
      };

      try {
        await Question.create(doc);
        insertedItems.push(item);
      } catch (error) {
        if (error?.code === 11000) {
          duplicates.push({ text: item.text, reason: 'existing' });
        } else {
          throw error;
        }
      }
    }

    const preview = mapPreviewPayload(insertedItems);
    return res.json({
      preview,
      duplicates,
      invalid: invalidList,
      generated: fresh.length,
      inserted: insertedItems.length
    });
  } catch (err) {
    console.error('[AI GENERATE ERROR]', err?.message);
    res.status(400).json({ ok: false, message: err?.message || 'AI generation failed' });
  }
}

module.exports = { postAiGenerate };
