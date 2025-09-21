const logger = require('../config/logger');
const env = require('../config/env');
const { fetchWithRetry } = require('../lib/http');
const Question = require('../models/Question');
const Category = require('../models/Category');
const { getTriviaProviderById, normalizeProviderId } = require('./triviaProviders');
const { getFromTheTriviaAPI } = require('../providers/thetrivia');
const { random: fetchJServiceRandomClues } = require('./jservice/client');

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
  '&amp;quot;': '"'
};

const DEFAULT_TRIVIA_CATEGORY = 'General Knowledge';
const OPEN_TDB_MAX_AMOUNT = 200;
const TRIVIA_API_MAX_LIMIT = 50;
const JSERVICE_MAX_AMOUNT = 50;
const JSERVICE_FETCH_LIMIT = 100;
const JSERVICE_MAX_ATTEMPTS = 3;
const JSERVICE_FALLBACK_DISTRACTORS = [
  'Mount Everest',
  'Photosynthesis',
  'Alexander Hamilton',
  'The Pacific Ocean',
  'Isaac Newton',
  'Saturn',
  'The Amazon River',
  'The Mona Lisa',
  'Pythagoras',
  'Silicon Valley',
  'Mercury',
  'Neil Armstrong'
];

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
  const checksumSourceChoices = uniqueAnswers.map((answer) => answer.text);
  const checksum = Question.generateChecksum(
    questionText,
    checksumSourceChoices
  );

  const categoryNameRaw = decodeHtml(raw.category || '').trim();
  const categoryName = categoryNameRaw || DEFAULT_TRIVIA_CATEGORY;

  return {
    text: questionText,
    choices,
    correctIndex,
    difficulty: normalizeDifficulty(raw.difficulty),
    categoryName,
    checksum,
    type: normalizedType,
    lang: 'en',
    source: 'opentdb'
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
    if (!question || !question.checksum) continue;
    if (!deduped.has(question.checksum)) {
      deduped.set(question.checksum, question);
    }
  }
  return Array.from(deduped.values());
}

async function storeNormalizedQuestions(questions, { fetchDurationMs = 0 } = {}) {
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

    const insertedAt = new Date();

    operations.push({
      updateOne: {
        filter: { checksum: question.checksum },
        update: {
          $setOnInsert: {
            text: question.text,
            choices: question.choices,
            correctIndex: question.correctIndex,
            difficulty: question.difficulty,
            category: categoryDoc._id,
            categoryName: question.categoryName,
            source: question.source,
            lang: question.lang,
            type: question.type,
            checksum: question.checksum,
            active: true,
            createdAt: insertedAt,
            updatedAt: insertedAt
          }
        },
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

  return {
    provider: 'opentdb',
    providerName: 'Open Trivia Database',
    providerShortName: 'OpenTDB',
    count: storeResult.inserted,
    inserted: storeResult.inserted,
    duplicates: storeResult.duplicates,
    totalRequested,
    totalReceived: aggregatedQuestions.length,
    totalStored: storeResult.total,
    fetchDurationMs: storeResult.fetchDurationMs,
    breakdown,
    partial
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

  const checksum = Question.generateChecksum(questionText, normalizedAnswers.answers);

  return {
    text: questionText,
    choices,
    correctIndex,
    difficulty: normalizeDifficulty(raw.difficulty),
    categoryName: sanitizeText(raw.categoryName) || DEFAULT_TRIVIA_CATEGORY,
    checksum,
    type: sanitizeText(raw.type) || 'multiple',
    lang: sanitizeText(raw.lang) || 'en',
    source: 'the-trivia-api'
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

  return {
    provider: 'the-trivia-api',
    providerName: 'The Trivia API',
    providerShortName: 'The Trivia API',
    count: storeResult.inserted,
    inserted: storeResult.inserted,
    duplicates: storeResult.duplicates,
    totalRequested: limit,
    totalReceived: normalizedQuestions.length,
    totalStored: storeResult.total,
    fetchDurationMs: storeResult.fetchDurationMs,
    breakdown,
    partial
  };
}

function sanitizeJServiceAmount(value) {
  const amount = sanitizePositiveInteger(value, { min: 1, max: JSERVICE_MAX_AMOUNT });
  return amount || 15;
}

function normalizeJServiceDifficulty(value) {
  const score = Number.parseInt(value, 10);
  if (!Number.isFinite(score)) return 'medium';
  if (score <= 200) return 'easy';
  if (score <= 600) return 'medium';
  return 'hard';
}

function normalizeJServiceCategory(value) {
  if (!value) {
    return DEFAULT_TRIVIA_CATEGORY;
  }

  if (typeof value === 'object') {
    const title = sanitizeText(value.title);
    if (title) return title;

    const name = sanitizeText(value.name);
    if (name) return name;
  }

  const normalized = sanitizeText(value);
  return normalized || DEFAULT_TRIVIA_CATEGORY;
}

function gatherJServiceCandidates(currentClue, pool) {
  const correctAnswer = sanitizeText(currentClue?.answer);
  if (!correctAnswer) return [];
  const targetLength = correctAnswer.length;
  const categoryKey = normalizeJServiceCategory(currentClue?.category).toLowerCase();
  const candidates = [];

  (Array.isArray(pool) ? pool : []).forEach((candidate) => {
    if (!candidate || candidate.id === currentClue.id) return;
    const candidateAnswer = sanitizeText(candidate.answer);
    if (!candidateAnswer) return;
    const normalizedAnswer = candidateAnswer.toLowerCase();
    const normalizedCategory = normalizeJServiceCategory(candidate.category).toLowerCase();
    const sameCategory = categoryKey && normalizedCategory === categoryKey;
    const weight = Math.abs(candidateAnswer.length - targetLength);
    candidates.push({
      value: candidateAnswer,
      normalizedAnswer,
      sameCategory,
      weight
    });
  });

  candidates.sort((a, b) => {
    if (a.sameCategory !== b.sameCategory) {
      return a.sameCategory ? -1 : 1;
    }
    return a.weight - b.weight;
  });

  return candidates;
}

function buildJServiceIncorrectAnswers(clue, pool) {
  const correctAnswer = sanitizeText(clue?.answer);
  if (!correctAnswer) return null;

  const normalizedCorrect = correctAnswer.toLowerCase();
  const seen = new Set([normalizedCorrect]);
  const incorrect = [];

  const prioritized = gatherJServiceCandidates(clue, pool);
  prioritized.forEach((candidate) => {
    if (incorrect.length >= 3) return;
    if (seen.has(candidate.normalizedAnswer)) return;
    seen.add(candidate.normalizedAnswer);
    incorrect.push(candidate.value);
  });

  if (incorrect.length < 3) {
    for (const fallback of JSERVICE_FALLBACK_DISTRACTORS) {
      if (incorrect.length >= 3) break;
      const sanitized = sanitizeText(fallback);
      if (!sanitized) continue;
      const normalized = sanitized.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      incorrect.push(sanitized);
    }
  }

  if (incorrect.length < 3) return null;
  return incorrect.slice(0, 3);
}

function normalizeJServiceQuestion(clue, pool) {
  if (!clue) return null;

  const questionText = sanitizeText(clue.question);
  const correctAnswer = sanitizeText(clue.answer);
  if (!questionText || !correctAnswer) {
    return null;
  }

  const incorrectAnswers = buildJServiceIncorrectAnswers(clue, pool);
  if (!incorrectAnswers) return null;

  const baseAnswers = [correctAnswer, ...incorrectAnswers];
  const choices = shuffle(baseAnswers);
  const correctIndex = choices.findIndex((choice) => choice === correctAnswer);
  if (correctIndex < 0) return null;

  const checksum = Question.generateChecksum(questionText, baseAnswers);

  return {
    text: questionText,
    choices,
    correctIndex,
    difficulty: normalizeJServiceDifficulty(clue.value),
    categoryName: normalizeJServiceCategory(clue.category),
    checksum,
    type: 'multiple',
    lang: 'en',
    source: 'jservice'
  };
}

async function importFromJService(options = {}) {
  const amount = sanitizeJServiceAmount(options.amount);
  const pool = [];
  const normalizedQuestions = [];
  const usedClueIds = new Set();
  let totalFetchDurationMs = 0;
  let attempts = 0;

  while (normalizedQuestions.length < amount && attempts < JSERVICE_MAX_ATTEMPTS) {
    const remaining = amount - normalizedQuestions.length;
    const fetchCount = Math.min(
      JSERVICE_FETCH_LIMIT,
      Math.max(remaining * 4, amount * (attempts === 0 ? 2 : 3), 10)
    );

    const fetchStart = Date.now();
    const batch = await fetchJServiceRandomClues(fetchCount);
    totalFetchDurationMs += Date.now() - fetchStart;

    if (!Array.isArray(batch) || batch.length === 0) {
      attempts += 1;
      continue;
    }

    pool.push(...batch);

    for (const clue of pool) {
      if (normalizedQuestions.length >= amount) break;
      if (!clue || usedClueIds.has(clue.id)) continue;
      const question = normalizeJServiceQuestion(clue, pool);
      if (!question) continue;
      normalizedQuestions.push(question);
      usedClueIds.add(clue.id);
    }

    attempts += 1;
  }

  const limitedQuestions = normalizedQuestions.slice(0, amount);
  const storeResult = await storeNormalizedQuestions(limitedQuestions, { fetchDurationMs: totalFetchDurationMs });

  const breakdown = [{
    providerCategoryId: null,
    categoryName: 'انتخاب تصادفی',
    providerDifficulty: 'mixed',
    requested: amount,
    received: limitedQuestions.length,
    note: limitedQuestions.length < amount
      ? 'تعداد سوالات تولید شده کمتر از مقدار درخواستی بود.'
      : undefined
  }];

  const { partial } = summarizeBreakdown(breakdown);

  logger.info(`[TriviaImporter] JService inserted ${storeResult.inserted} questions (duplicates: ${storeResult.duplicates})`);

  return {
    provider: 'jservice',
    providerName: 'JService Trivia Archive',
    providerShortName: 'JService',
    count: storeResult.inserted,
    inserted: storeResult.inserted,
    duplicates: storeResult.duplicates,
    totalRequested: amount,
    totalReceived: limitedQuestions.length,
    totalStored: storeResult.total,
    fetchDurationMs: storeResult.fetchDurationMs,
    breakdown,
    partial
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

  if (provider.id === 'jservice') {
    return importFromJService(options);
  }

  const error = new Error('Trivia provider is not configured');
  error.statusCode = 400;
  throw error;
}

module.exports = {
  importTrivia,
  buildTriviaApiUrl,
};
