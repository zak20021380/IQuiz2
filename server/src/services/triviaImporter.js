const logger = require('../config/logger');
const env = require('../config/env');
const { fetchWithRetry } = require('../lib/http');
const Question = require('../models/Question');
const Category = require('../models/Category');
const { getTriviaProviderById, normalizeProviderId } = require('./triviaProviders');
const { getFromTheTriviaAPI } = require('../providers/thetrivia');
const {
  fetchRandomClues: fetchCluebaseRandomClues,
  sanitizePlainText: sanitizeCluebasePlainText,
  sanitizeAnswer: sanitizeCluebaseAnswer,
  sanitizeCategory: sanitizeCluebaseCategory,
  mapDifficulty: mapCluebaseDifficulty,
  clampLimit: clampCluebaseLimit,
  getBaseUrl: getCluebaseBaseUrl,
} = require('./cluebase/client');

const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const HTML_ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&apos;': "'",
  '&rsquo;': "'",
  '&lsquo;': "'",
  '&ldquo;': '"',
  '&rdquo;': '"',
  '&hellip;': '…',
  '&amp;quot;': '"',
  '&nbsp;': ' '
};

const HTML_TAG_REGEX = /<[^>]*>/g;
const DEFAULT_TRIVIA_CATEGORY = 'General Knowledge';
const OPEN_TDB_MAX_AMOUNT = 200;
const TRIVIA_API_MAX_LIMIT = 50;
const CLUEBASE_DEFAULT_LIMIT = clampCluebaseLimit(env?.trivia?.cluebase?.limit || 50);
const CLUEBASE_MAX_AMOUNT = CLUEBASE_DEFAULT_LIMIT;
const CLUEBASE_MAX_ATTEMPTS = 4;

const AUTO_IMPORT_SOURCES = ['opentdb', 'the-trivia-api', 'cluebase', 'jservice'];
const AUTO_APPROVE_PROVIDER_SET = new Set(
  Array.isArray(env.importer?.autoApproveProviders)
    ? env.importer.autoApproveProviders
        .map((providerId) => normalizeImportProvider(providerId))
        .filter(Boolean)
    : []
);
const GLOBAL_AUTO_APPROVE = env.importer?.autoApprove !== false;
const DEFAULT_IMPORTED_STATUS = GLOBAL_AUTO_APPROVE ? 'approved' : 'pending';
const VALID_IMPORTED_STATUSES = new Set(['pending', 'approved', 'rejected', 'draft', 'archived']);

let ensureAutoImportStatusPromise;

async function ensureAutoImportStatuses() {
  if (!ensureAutoImportStatusPromise) {
    ensureAutoImportStatusPromise = (async () => {
      try {
        const result = await Question.updateMany(
          {
            source: { $in: AUTO_IMPORT_SOURCES },
            $or: [
              { status: { $exists: false } },
              { status: null },
              { status: '' }
            ]
          },
          { $set: { status: DEFAULT_IMPORTED_STATUS, isApproved: DEFAULT_IMPORTED_STATUS === 'approved' } }
        );

        const modified = result?.modifiedCount || result?.nModified || 0;
        if (modified > 0) {
          logger.info(`[TriviaImporter] Backfilled status "${DEFAULT_IMPORTED_STATUS}" for ${modified} auto-imported questions.`);
        }
      } catch (err) {
        logger.error(`[TriviaImporter] Failed to backfill import status on auto-imported questions: ${err.message}`);
      }
    })();
  }

  return ensureAutoImportStatusPromise;
}

function decodeHtml(value) {
  if (value === undefined || value === null) return '';
  const str = String(value);
  return str.replace(/&#(x?[0-9a-fA-F]+);|&[a-zA-Z]+;/g, (entity, numeric) => {
    if (numeric) {
      const isHex = numeric.startsWith('x');
      const codePoint = Number.parseInt(isHex ? numeric.slice(1) : numeric, isHex ? 16 : 10);
      if (Number.isFinite(codePoint)) {
        try {
          return String.fromCodePoint(codePoint);
        } catch (err) {
          return entity;
        }
      }
      return entity;
    }
    const mapped = HTML_ENTITY_MAP[entity];
    return mapped !== undefined ? mapped : entity;
  });
}

function sanitizeText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeImportStatus(value) {
  const normalized = sanitizeText(value).toLowerCase();
  if (VALID_IMPORTED_STATUSES.has(normalized)) {
    return normalized;
  }
  return DEFAULT_IMPORTED_STATUS;
}

function normalizeImportProvider(value, fallback = '') {
  const normalized = sanitizeText(value).toLowerCase();
  if (normalized) return normalized;
  const fallbackNormalized = sanitizeText(fallback).toLowerCase();
  return fallbackNormalized;
}

function shouldAutoApproveProvider(providerId) {
  const normalized = normalizeImportProvider(providerId);
  if (normalized && AUTO_APPROVE_PROVIDER_SET.has(normalized)) {
    return true;
  }
  return GLOBAL_AUTO_APPROVE;
}

function normalizeDifficulty(value) {
  const normalized = sanitizeText(value).toLowerCase();
  return ALLOWED_DIFFICULTIES.has(normalized) ? normalized : 'medium';
}

function shuffle(array) {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  let normalized = value;
  if (typeof min === 'number') normalized = Math.max(min, normalized);
  if (typeof max === 'number') normalized = Math.min(max, normalized);
  return normalized;
}

function sanitizePositiveInteger(value, { min = 1, max } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num <= 0) return null;
  if (typeof max === 'number') {
    return clamp(num, min, max);
  }
  return Math.max(min, num);
}

function sanitizeCategoryList(input) {
  if (!input) return [];
  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : [];
  const unique = new Set();
  values.forEach((item) => {
    const parsed = Number.parseInt(item, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      unique.add(String(parsed));
    }
  });
  return Array.from(unique);
}

function sanitizeDifficultyList(input) {
  if (!input) return [];
  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : [];
  const unique = new Set();
  values.forEach((item) => {
    const normalized = sanitizeText(item).toLowerCase();
    if (ALLOWED_DIFFICULTIES.has(normalized)) {
      unique.add(normalized);
    }
  });
  return Array.from(unique);
}

function resolveDefaultOpenTdbAmount(baseUrl) {
  try {
    const url = new URL(baseUrl || env.trivia.url || 'https://opentdb.com/api.php');
    const amountParam = url.searchParams.get('amount');
    const parsed = Number.parseInt(amountParam, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return clamp(parsed, 1, OPEN_TDB_MAX_AMOUNT);
    }
  } catch (err) {
    logger.warn(`[TriviaImporter] Failed to parse default OpenTDB amount from URL: ${err.message}`);
  }
  return 20;
}

function ensureTypeMultiple(url) {
  const normalized = new URL(url || 'https://opentdb.com/api.php');
  const type = normalized.searchParams.get('type');
  if (!type) {
    normalized.searchParams.set('type', 'multiple');
  }
  return normalized;
}

function buildOpenTdbUrl(baseUrl, { amount, categoryId, difficulty }) {
  const url = ensureTypeMultiple(baseUrl || env.trivia.url || 'https://opentdb.com/api.php');
  if (Number.isFinite(amount) && amount > 0) {
    url.searchParams.set('amount', String(amount));
  }
  if (categoryId) {
    url.searchParams.set('category', String(categoryId));
  } else {
    url.searchParams.delete('category');
  }
  if (difficulty) {
    url.searchParams.set('difficulty', difficulty);
  } else {
    url.searchParams.delete('difficulty');
  }
  return url.toString();
}

function buildOpenTdbPlan(options = {}) {
  const baseUrl = options.url || env.trivia.url || 'https://opentdb.com/api.php';
  const requestedAmount = sanitizePositiveInteger(options.amount, { min: 1, max: OPEN_TDB_MAX_AMOUNT });
  const categories = sanitizeCategoryList(options.categories);
  const difficulties = sanitizeDifficultyList(options.difficulties);

  const resolvedAmount = requestedAmount || resolveDefaultOpenTdbAmount(baseUrl);

  if (categories.length === 0 && difficulties.length === 0) {
    return [{
      url: buildOpenTdbUrl(baseUrl, { amount: resolvedAmount }),
      amount: resolvedAmount,
      categoryId: null,
      difficulty: null
    }];
  }

  const categoryList = categories.length > 0 ? categories : [null];
  const difficultyList = difficulties.length > 0 ? difficulties : [null];
  const combinations = [];
  categoryList.forEach((categoryId) => {
    difficultyList.forEach((difficulty) => {
      combinations.push({ categoryId, difficulty });
    });
  });

  const limitedCombinations = combinations.slice(0, Math.max(1, Math.min(combinations.length, resolvedAmount)));
  const count = limitedCombinations.length || 1;
  const baseShare = Math.floor(resolvedAmount / count);
  const remainder = resolvedAmount % count;

  return limitedCombinations.map((combo, index) => {
    const amountShare = Math.max(1, baseShare + (index < remainder ? 1 : 0));
    return {
      url: buildOpenTdbUrl(baseUrl, {
        amount: amountShare,
        categoryId: combo.categoryId,
        difficulty: combo.difficulty
      }),
      amount: amountShare,
      categoryId: combo.categoryId,
      difficulty: combo.difficulty
    };
  });
}

function normalizeOpenTdbQuestion(raw) {
  if (!raw) return null;

  const questionText = decodeHtml(raw.question || '').trim();
  const correctAnswer = decodeHtml(raw.correct_answer || '').trim();
  const incorrectAnswers = Array.isArray(raw.incorrect_answers)
    ? raw.incorrect_answers.map((answer) => decodeHtml(answer).trim())
    : [];

  const normalizedType = sanitizeText(raw.type || 'multiple').toLowerCase();
  if (normalizedType !== 'multiple') {
    return null;
  }

  if (!questionText || !correctAnswer) {
    return null;
  }

  const answers = [
    { text: correctAnswer, isCorrect: true },
    ...incorrectAnswers
      .filter(Boolean)
      .map((answer) => ({ text: answer, isCorrect: false }))
  ];

  const uniqueAnswers = [];
  const seen = new Set();
  for (const answer of answers) {
    const key = answer.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueAnswers.push(answer);
  }

  if (uniqueAnswers.length !== 4) {
    return null;
  }

  const shuffled = shuffle(uniqueAnswers);
  const correctIndex = shuffled.findIndex((answer) => answer.isCorrect);
  if (correctIndex < 0) {
    return null;
  }

  const choices = shuffled.map((answer) => answer.text);
  const hashSourceChoices = uniqueAnswers.map((answer) => answer.text);
  const hash = Question.generateChecksum(
    questionText,
    hashSourceChoices
  );

  const categoryNameRaw = decodeHtml(raw.category || '').trim();
  const categoryName = categoryNameRaw || DEFAULT_TRIVIA_CATEGORY;

  return {
    text: questionText,
    choices,
    correctIndex,
    difficulty: normalizeDifficulty(raw.difficulty),
    categoryName,
    hash,
    checksum: hash,
    type: normalizedType,
    lang: 'en',
    source: 'opentdb',
    provider: 'opentdb',
    status: DEFAULT_IMPORTED_STATUS
  };
}

async function ensureCategories(names) {
  const uniqueNames = [...new Set((names || []).map((name) => sanitizeText(name)).filter(Boolean))];
  const categoryMap = new Map();

  if (uniqueNames.length === 0) {
    return categoryMap;
  }

  const existing = await Category.find({
    $or: [
      { name: { $in: uniqueNames } },
      { aliases: { $in: uniqueNames } }
    ]
  });

  existing.forEach((category) => {
    const aliases = Array.isArray(category.aliases) ? category.aliases : [];
    const keys = new Set([
      category.name,
      category.displayName,
      ...aliases
    ]);
    keys.forEach((key) => {
      if (key) {
        categoryMap.set(key, category);
      }
    });
  });

  const missing = uniqueNames.filter((name) => !categoryMap.has(name));

  for (const name of missing) {
    let category = await Category.findOne({
      $or: [
        { name },
        { aliases: name }
      ]
    });

    if (!category) {
      category = await Category.create({
        name,
        displayName: name,
        aliases: [name],
        provider: 'manual',
        status: 'active'
      });
    } else {
      const aliasSet = new Set([
        ...(Array.isArray(category.aliases) ? category.aliases : []),
        category.name,
        category.displayName,
        name
      ]);
      category.aliases = Array.from(aliasSet).filter(Boolean);
      if (!category.displayName) {
        category.displayName = category.name;
      }
      await category.save();
    }

    const keys = new Set([
      category.name,
      category.displayName,
      ...(Array.isArray(category.aliases) ? category.aliases : [])
    ]);
    keys.forEach((key) => {
      if (key) {
        categoryMap.set(key, category);
      }
    });
  }

  return categoryMap;
}

async function fetchOpenTdbQuestions(url) {
  const fetchStart = Date.now();
  const response = await fetchWithRetry(url, {
    timeout: 15000,
    retries: 2,
    retryDelay: ({ attempt }) => 500 * attempt,
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch trivia questions (${response.status} ${response.statusText})`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    throw new Error('Failed to parse trivia provider response as JSON');
  }

  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.results)) {
    throw new Error('Trivia provider returned an unexpected payload');
  }

  const responseCode = Number(payload.response_code) || 0;
  if (responseCode && responseCode !== 1) {
    const error = new Error(`Trivia provider responded with error code ${responseCode}`);
    error.responseCode = responseCode;
    throw error;
  }

  const normalizedQuestions = payload.results
    .map(normalizeOpenTdbQuestion)
    .filter(Boolean);

  return {
    questions: normalizedQuestions,
    fetchDurationMs: Date.now() - fetchStart,
    responseCode
  };
}

function dedupeQuestions(questions) {
  const deduped = new Map();
  for (const question of Array.isArray(questions) ? questions : []) {
    if (!question) continue;
    const key = sanitizeText(question.hash || question.checksum);
    if (!key) continue;
    if (!deduped.has(key)) {
      question.hash = key;
      question.checksum = key;
      deduped.set(key, question);
    }
  }
  return Array.from(deduped.values());
}

async function storeNormalizedQuestions(questions, { fetchDurationMs = 0 } = {}) {
  await ensureAutoImportStatuses();

  const deduped = dedupeQuestions(questions);
  if (deduped.length === 0) {
    return {
      inserted: 0,
      duplicates: 0,
      total: 0,
      fetchDurationMs
    };
  }

  const categoryMap = await ensureCategories(deduped.map((question) => question.categoryName));

  const operations = [];
  for (const question of deduped) {
    const categoryDoc = categoryMap.get(question.categoryName);
    if (!categoryDoc) {
      logger.warn(`[TriviaImporter] Missing category document for "${question.categoryName}". Skipping question.`);
      continue;
    }

    const hash = sanitizeText(question.hash || question.checksum);
    if (!hash) {
      logger.warn('[TriviaImporter] Skipping imported question with missing hash.');
      continue;
    }

    const text = sanitizeText(question.text);
    if (!text) {
      logger.warn(`[TriviaImporter] Skipping imported question ${hash} due to empty text.`);
      continue;
    }

    const rawChoices = Array.isArray(question.choices) ? question.choices : [];
    const sanitizedChoices = rawChoices.map((choice) => sanitizeText(choice));
    if (sanitizedChoices.length !== 4) {
      logger.warn(`[TriviaImporter] Skipping imported question ${hash} due to invalid choice count (${sanitizedChoices.length}).`);
      continue;
    }
    if (sanitizedChoices.some((choice) => !choice)) {
      logger.warn(`[TriviaImporter] Skipping imported question ${hash} due to empty choice value.`);
      continue;
    }

    const parsedCorrectIndex = Number(question.correctIndex);
    if (!Number.isInteger(parsedCorrectIndex) || parsedCorrectIndex < 0 || parsedCorrectIndex >= sanitizedChoices.length) {
      logger.warn(`[TriviaImporter] Skipping imported question ${hash} due to invalid correct index (${question.correctIndex}).`);
      continue;
    }

    const normalizedDifficulty = sanitizeText(question.difficulty).toLowerCase();
    const difficulty = ALLOWED_DIFFICULTIES.has(normalizedDifficulty) ? normalizedDifficulty : 'medium';
    const normalizedSource = normalizeImportProvider(question.source, 'manual') || 'manual';
    const normalizedProvider = normalizeImportProvider(question.provider, normalizedSource);
    const normalizedType = sanitizeText(question.type) || 'multiple';
    const normalizedLang = sanitizeText(question.lang) || 'en';
    const providerId = sanitizeText(question.providerId);
    const rawStatus = typeof question.status === 'string' ? question.status : null;
    const normalizedStatus = rawStatus
      ? normalizeImportStatus(rawStatus)
      : typeof question.isApproved === 'boolean'
        ? (question.isApproved ? 'approved' : 'pending')
        : DEFAULT_IMPORTED_STATUS;
    const isApproved = normalizedStatus === 'approved';
    const active = typeof question.active === 'boolean' ? question.active : isApproved;
    const authorName = sanitizeText(question.authorName) || 'IQuiz Team';
    let meta = null;
    if (question.meta && typeof question.meta === 'object' && !Array.isArray(question.meta)) {
      try {
        meta = JSON.parse(JSON.stringify(question.meta));
      } catch (err) {
        meta = null;
      }
    }
    const providerForUpdate = normalizedProvider || normalizedSource;
    const updateDocument = {
      $setOnInsert: {
        text,
        choices: sanitizedChoices,
        correctIndex: parsedCorrectIndex,
        difficulty,
        category: categoryDoc._id,
        categoryName: categoryDoc.name,
        source: normalizedSource,
        lang: normalizedLang,
        type: normalizedType,
        hash,
        checksum: hash,
        authorName
      },
      $set: {
        status: normalizedStatus,
        isApproved,
        active
      }
    };

    if (providerForUpdate) {
      updateDocument.$set.provider = providerForUpdate;
    }

    if (providerId) {
      updateDocument.$set.providerId = providerId;
    }

    if (meta) {
      updateDocument.$set.meta = meta;
    }

    operations.push({
      updateOne: {
        filter: { hash },
        update: updateDocument,
        upsert: true
      }
    });
  }

  if (operations.length === 0) {
    return {
      inserted: 0,
      duplicates: deduped.length,
      total: deduped.length,
      fetchDurationMs
    };
  }

  const writeResult = await Question.bulkWrite(operations, { ordered: false });
  const inserted = writeResult.upsertedCount || 0;

  return {
    inserted,
    duplicates: Math.max(0, deduped.length - inserted),
    total: deduped.length,
    fetchDurationMs
  };
}

function summarizeBreakdown(entries = []) {
  const breakdown = Array.isArray(entries) ? entries : [];
  const hasErrors = breakdown.some((entry) => entry && entry.error);
  const hasShortage = breakdown.some((entry) => entry && Number(entry.received) < Number(entry.requested));
  return { breakdown, partial: hasErrors || hasShortage };
}

async function importFromOpenTdb(options = {}) {
  const plan = buildOpenTdbPlan(options);
  if (plan.length === 0) {
    const error = new Error('No valid plan generated for OpenTDB provider');
    error.statusCode = 400;
    throw error;
  }

  const selectedDifficulties = sanitizeDifficultyList(options.difficulties);
  const fallbackDifficulty = selectedDifficulties.length === 1 ? selectedDifficulties[0] : 'mixed';

  const breakdownEntries = [];
  const aggregatedQuestions = [];
  let totalFetchDurationMs = 0;
  let totalRequested = 0;

  for (const step of plan) {
    totalRequested += step.amount;
    try {
      const { questions, fetchDurationMs, responseCode } = await fetchOpenTdbQuestions(step.url);
      totalFetchDurationMs += fetchDurationMs;
      aggregatedQuestions.push(...questions);

      breakdownEntries.push({
        providerCategoryId: step.categoryId,
        categoryName: questions[0]?.categoryName || (step.categoryId ? null : 'General Knowledge'),
        providerDifficulty: step.difficulty || fallbackDifficulty,
        requested: step.amount,
        received: questions.length,
        note: responseCode === 1
          ? 'بانک سوالات OpenTDB به اندازه کافی سوال در این ترکیب نداشت.'
          : undefined
      });
    } catch (error) {
      logger.error(`[TriviaImporter] Failed to fetch OpenTDB questions: ${error.message}`);
      breakdownEntries.push({
        providerCategoryId: step.categoryId,
        categoryName: null,
        providerDifficulty: step.difficulty || fallbackDifficulty,
        requested: step.amount,
        received: 0,
        error: error.message
      });
    }
  }

  const storeResult = await storeNormalizedQuestions(aggregatedQuestions, { fetchDurationMs: totalFetchDurationMs });
  const { breakdown, partial } = summarizeBreakdown(breakdownEntries);

  logger.info(`[TriviaImporter] OpenTDB inserted ${storeResult.inserted} questions (duplicates: ${storeResult.duplicates})`);

  const counts = {
    inserted: storeResult.inserted,
    duplicates: storeResult.duplicates,
    invalid: []
  };

  return {
    provider: 'opentdb',
    providerName: 'Open Trivia Database',
    providerShortName: 'OpenTDB',
    count: storeResult.inserted,
    inserted: storeResult.inserted,
    duplicates: storeResult.duplicates,
    invalid: [],
    totalRequested,
    totalReceived: aggregatedQuestions.length,
    totalStored: storeResult.total,
    fetchDurationMs: storeResult.fetchDurationMs,
    breakdown,
    partial,
    counts
  };
}

function normalizeTriviaApiAnswers(correctAnswer, incorrectAnswers) {
  const correct = sanitizeText(correctAnswer);
  if (!correct) return null;

  const answers = [];
  const seen = new Set();
  const correctKey = correct.toLowerCase();
  seen.add(correctKey);
  answers.push(correct);

  for (const answer of Array.isArray(incorrectAnswers) ? incorrectAnswers : []) {
    const normalized = sanitizeText(answer);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    answers.push(normalized);
    if (answers.length === 4) break;
  }

  if (answers.length !== 4) {
    return null;
  }

  return { answers, correct };
}

function normalizeTriviaApiQuestion(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const questionText = sanitizeText(raw.question?.text ?? raw.question);
  const correctAnswer = sanitizeText(raw.correctAnswer);
  const incorrectAnswers = Array.isArray(raw.incorrectAnswers)
    ? raw.incorrectAnswers.map(sanitizeText)
    : [];

  if (!questionText || !correctAnswer) {
    return null;
  }

  const normalizedAnswers = normalizeTriviaApiAnswers(correctAnswer, incorrectAnswers);
  if (!normalizedAnswers) {
    return null;
  }

  const choices = shuffle(normalizedAnswers.answers);
  const correctIndex = choices.findIndex((choice) => choice === normalizedAnswers.correct);
  if (correctIndex < 0) {
    return null;
  }

  const hash = Question.generateChecksum(questionText, normalizedAnswers.answers);

  return {
    text: questionText,
    choices,
    correctIndex,
    difficulty: normalizeDifficulty(raw.difficulty),
    categoryName: sanitizeText(raw.categoryName) || DEFAULT_TRIVIA_CATEGORY,
    hash,
    checksum: hash,
    type: sanitizeText(raw.type) || 'multiple',
    lang: sanitizeText(raw.lang) || 'en',
    source: 'the-trivia-api',
    provider: 'the-trivia-api',
    status: DEFAULT_IMPORTED_STATUS
  };
}

function sanitizeTriviaApiLimit(value) {
  const limit = sanitizePositiveInteger(value, { min: 1, max: TRIVIA_API_MAX_LIMIT });
  if (limit) return limit;
  return 20;
}

function buildTriviaApiUrl(baseUrl, params = {}) {
  const normalizedBase = sanitizeText(baseUrl) || env.trivia.theTriviaUrl || 'https://the-trivia-api.com/v2/questions?limit=20';
  const url = new URL(normalizedBase);

  const { limit: rawLimit, ...rest } = params || {};

  if (rawLimit !== undefined) {
    const parsedLimit = sanitizePositiveInteger(rawLimit, { min: 1, max: TRIVIA_API_MAX_LIMIT });
    if (!parsedLimit) {
      const error = new Error('limit must be a positive integer');
      error.statusCode = 400;
      throw error;
    }
    url.searchParams.set('limit', String(parsedLimit));
  }

  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      const normalizedItems = value.map((item) => sanitizeText(item)).filter(Boolean);
      if (normalizedItems.length === 0) continue;
      url.searchParams.set(key, normalizedItems.join(','));
      continue;
    }

    if (typeof value === 'object') {
      continue;
    }

    const normalizedValue = sanitizeText(value);
    if (!normalizedValue) continue;
    url.searchParams.set(key, normalizedValue);
  }

  return url.toString();
}

async function importFromTheTriviaApi(options = {}) {
  const limit = sanitizeTriviaApiLimit(options.limit ?? options.amount);
  const difficulties = sanitizeDifficultyList(options.difficulties);

  const requestUrl = buildTriviaApiUrl(options.url || env.trivia.theTriviaUrl, {
    limit,
    difficulties: difficulties.length > 0 ? difficulties : undefined
  });

  const fetchStart = Date.now();
  const rawQuestions = await getFromTheTriviaAPI(requestUrl);
  const fetchDurationMs = Date.now() - fetchStart;

  const normalizedQuestions = rawQuestions
    .map(normalizeTriviaApiQuestion)
    .filter(Boolean);

  const storeResult = await storeNormalizedQuestions(normalizedQuestions, { fetchDurationMs });
  const breakdown = [{
    providerCategoryId: null,
    categoryName: 'مجموع درخواست',
    providerDifficulty: difficulties.length === 1 ? difficulties[0] : (difficulties.length > 1 ? 'mixed' : 'mixed'),
    requested: limit,
    received: normalizedQuestions.length,
    note: normalizedQuestions.length < limit
      ? 'تعداد سوالات دریافتی کمتر از مقدار درخواستی بود.'
      : undefined
  }];

  const { partial } = summarizeBreakdown(breakdown);

  logger.info(`[TriviaImporter] The Trivia API inserted ${storeResult.inserted} questions (duplicates: ${storeResult.duplicates})`);

  const counts = {
    inserted: storeResult.inserted,
    duplicates: storeResult.duplicates,
    invalid: []
  };

  return {
    provider: 'the-trivia-api',
    providerName: 'The Trivia API',
    providerShortName: 'The Trivia API',
    count: storeResult.inserted,
    inserted: storeResult.inserted,
    duplicates: storeResult.duplicates,
    invalid: [],
    totalRequested: limit,
    totalReceived: normalizedQuestions.length,
    totalStored: storeResult.total,
    fetchDurationMs: storeResult.fetchDurationMs,
    breakdown,
    partial,
    counts
  };
}

function sanitizeCluebaseAmount(value) {
  const amount = sanitizePositiveInteger(value, { min: 1, max: CLUEBASE_MAX_AMOUNT });
  return amount || Math.min(15, CLUEBASE_MAX_AMOUNT);
}

function normalizeCluebaseCategory(value) {
  const normalized = sanitizeCluebaseCategory(value);
  return normalized || DEFAULT_TRIVIA_CATEGORY;
}

function getCluebaseClueKey(clue) {
  if (!clue) return null;
  if (clue.id !== undefined && clue.id !== null) {
    return `id:${String(clue.id)}`;
  }
  const questionText = sanitizeCluebasePlainText(clue?.clue ?? clue?.question);
  if (questionText) {
    return `text:${questionText.toLowerCase()}`;
  }
  return null;
}

function recordInvalidCluebase(clue, reason, invalidMap) {
  if (!invalidMap) return;
  const entry = {
    id: clue?.id != null ? String(clue.id) : null,
    category: normalizeCluebaseCategory(clue?.category),
    reason,
  };
  const key = getCluebaseClueKey(clue) || `unknown:${invalidMap.size + 1}`;
  const existing = invalidMap.get(key);
  if (!existing || existing.reason !== reason) {
    const clueId = entry.id ? `#${entry.id}` : '#unknown';
    const context = entry.category ? ` (${entry.category})` : '';
    logger.warn(`[TriviaImporter] Skipping Cluebase clue ${clueId}${context}: ${reason}`);
  }
  invalidMap.set(key, entry);
}

function buildCluebaseIncorrectAnswers(clue, pool, correctAnswer) {
  const incorrect = [];
  const seen = new Set();
  const normalizedCorrect = sanitizeText(correctAnswer).toLowerCase();
  if (normalizedCorrect) {
    seen.add(normalizedCorrect);
  }

  const poolArray = Array.isArray(pool) ? pool : [];
  const categoryKey = normalizeCluebaseCategory(clue?.category).toLowerCase();

  const addCandidate = (candidate) => {
    if (!candidate) return false;
    const baseAnswer = typeof candidate === 'string' ? candidate : candidate.response;
    const candidateAnswer = sanitizeCluebaseAnswer(baseAnswer);
    if (!candidateAnswer) return false;
    const normalizedCandidate = candidateAnswer.toLowerCase();
    if (!normalizedCandidate || seen.has(normalizedCandidate)) return false;
    seen.add(normalizedCandidate);
    incorrect.push(candidateAnswer);
    return incorrect.length >= 3;
  };

  if (categoryKey) {
    for (const candidate of poolArray) {
      if (!candidate || candidate.id === clue?.id) continue;
      const candidateCategory = normalizeCluebaseCategory(candidate.category).toLowerCase();
      if (!candidateCategory || candidateCategory !== categoryKey) continue;
      if (addCandidate(candidate)) {
        break;
      }
    }
  }

  if (incorrect.length < 3) {
    for (const candidate of poolArray) {
      if (incorrect.length >= 3) break;
      if (!candidate || candidate.id === clue?.id) continue;
      if (addCandidate(candidate)) {
        break;
      }
    }
  }

  if (incorrect.length < 3) return null;
  return incorrect.slice(0, 3);
}

function normalizeCluebaseQuestion(clue, pool, invalidMap) {
  if (!clue) return null;

  const providerId = clue?.id != null ? String(clue.id).trim() : '';
  if (!providerId) {
    recordInvalidCluebase(clue, 'missing clue identifier', invalidMap);
    return null;
  }

  const questionText = sanitizeCluebasePlainText(clue.clue ?? clue.question);
  const correctAnswer = sanitizeCluebaseAnswer(clue.response ?? clue.answer);
  if (!questionText || !correctAnswer) {
    recordInvalidCluebase(clue, 'missing question or answer', invalidMap);
    return null;
  }

  const incorrectAnswers = buildCluebaseIncorrectAnswers(clue, pool, correctAnswer);
  if (!incorrectAnswers) {
    recordInvalidCluebase(clue, 'insufficient incorrect answers', invalidMap);
    return null;
  }

  const baseAnswers = [correctAnswer, ...incorrectAnswers];
  const choices = shuffle(baseAnswers);
  if (!Array.isArray(choices) || choices.length !== 4) {
    recordInvalidCluebase(clue, `invalid choice count (${Array.isArray(choices) ? choices.length : 0})`, invalidMap);
    return null;
  }

  if (choices.some((choice) => !choice)) {
    recordInvalidCluebase(clue, 'one or more empty choices detected', invalidMap);
    return null;
  }

  const correctIndex = choices.findIndex((choice) => choice === correctAnswer);
  if (correctIndex < 0) {
    recordInvalidCluebase(clue, 'correct answer missing from shuffled choices', invalidMap);
    return null;
  }

  const hash = Question.generateChecksum(questionText, baseAnswers);
  if (!hash) {
    recordInvalidCluebase(clue, 'failed to generate hash', invalidMap);
    return null;
  }

  if (invalidMap) {
    const key = getCluebaseClueKey(clue);
    if (key) invalidMap.delete(key);
  }

  const categoryName = normalizeCluebaseCategory(clue.category);
  const meta = {
    round: clue.round || null,
    gameId: clue.gameId || null,
    value: Number.isFinite(clue.value) ? clue.value : null,
  };

  return {
    text: questionText,
    choices,
    correctIndex,
    difficulty: mapCluebaseDifficulty(clue.value),
    categoryName,
    hash,
    checksum: hash,
    type: 'multiple',
    lang: 'en',
    source: 'cluebase',
    provider: 'cluebase',
    providerId,
    isApproved: true,
    status: 'approved',
    active: true,
    meta,
  };
}

async function importFromCluebase(options = {}) {
  const amount = sanitizeCluebaseAmount(options.amount);
  const poolMap = new Map();
  const normalizedQuestions = [];
  const usedClueIds = new Set();
  const invalidMap = new Map();
  let totalFetchDurationMs = 0;
  let attempts = 0;
  let lastFetchMeta = null;

  while (normalizedQuestions.length < amount && attempts < CLUEBASE_MAX_ATTEMPTS) {
    attempts += 1;

    let batch;
    const fetchStart = Date.now();
    try {
      batch = await fetchCluebaseRandomClues(CLUEBASE_DEFAULT_LIMIT);
    } catch (error) {
      logger.warn(`[TriviaImporter] Failed to fetch Cluebase clues on attempt ${attempts}: ${error.message}`);
      continue;
    }
    totalFetchDurationMs += Date.now() - fetchStart;
    lastFetchMeta = batch;

    const items = Array.isArray(batch?.items) ? batch.items : [];
    if (!items.length) {
      continue;
    }

    for (const clue of items) {
      if (!clue || clue.id == null) continue;
      const providerId = String(clue.id);
      if (!poolMap.has(providerId)) {
        poolMap.set(providerId, clue);
      }
    }

    const pool = Array.from(poolMap.values());
    for (const clue of pool) {
      if (normalizedQuestions.length >= amount) break;
      if (!clue || clue.id == null) continue;
      const providerId = String(clue.id);
      if (usedClueIds.has(providerId)) continue;

      const question = normalizeCluebaseQuestion(clue, pool, invalidMap);
      if (!question) continue;

      normalizedQuestions.push(question);
      usedClueIds.add(providerId);
    }
  }

  const limitedQuestions = normalizedQuestions.slice(0, amount);
  const storeResult = await storeNormalizedQuestions(limitedQuestions, { fetchDurationMs: totalFetchDurationMs });
  const invalidEntries = Array.from(invalidMap.values());

  const breakdown = [{
    providerCategoryId: null,
    categoryName: 'انتخاب تصادفی',
    providerDifficulty: 'mixed',
    requested: amount,
    received: limitedQuestions.length,
    note: limitedQuestions.length < amount
      ? 'تعداد سوالات تولید شده کمتر از مقدار درخواستی بود.'
      : undefined,
  }];

  const { partial } = summarizeBreakdown(breakdown);
  const reasonCounts = new Map();
  invalidEntries.forEach((entry) => {
    if (!entry?.reason) return;
    reasonCounts.set(entry.reason, (reasonCounts.get(entry.reason) || 0) + 1);
  });

  const logPayload = {
    url: lastFetchMeta?.url || `${getCluebaseBaseUrl()}/clues/random`,
    status: lastFetchMeta?.status ?? null,
    length: poolMap.size,
    inserted: storeResult.inserted,
    duplicates: storeResult.duplicates,
    invalid: invalidEntries.length,
    reasons: Array.from(reasonCounts.entries()).map(([reason, count]) => ({ reason, count })),
  };

  logger.info(`[TriviaImporter] Cluebase import ${JSON.stringify(logPayload)}`);

  return {
    provider: 'cluebase',
    providerName: 'Cluebase',
    providerShortName: 'Cluebase',
    count: storeResult.inserted,
    inserted: storeResult.inserted,
    duplicates: storeResult.duplicates,
    invalid: invalidEntries,
    totalRequested: amount,
    totalReceived: limitedQuestions.length,
    totalStored: storeResult.total,
    fetchDurationMs: storeResult.fetchDurationMs,
    breakdown,
    partial,
    counts: {
      inserted: storeResult.inserted,
      duplicates: storeResult.duplicates,
      invalid: invalidEntries,
    },
  };
}

async function importTrivia(options = {}) {
  const providerId = normalizeProviderId(options.provider) || 'opentdb';
  const provider = getTriviaProviderById(providerId);
  if (!provider) {
    const error = new Error('Unsupported trivia provider');
    error.statusCode = 400;
    throw error;
  }

  if (provider.id === 'opentdb') {
    return importFromOpenTdb(options);
  }

  if (provider.id === 'the-trivia-api') {
    return importFromTheTriviaApi(options);
  }

  if (provider.id === 'cluebase') {
    return importFromCluebase(options);
  }

  const error = new Error('Trivia provider is not configured');
  error.statusCode = 400;
  throw error;
}

module.exports = {
  importTrivia,
  buildTriviaApiUrl,
};
