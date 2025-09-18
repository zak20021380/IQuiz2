const logger = require('../config/logger');
const env = require('../config/env');
const { fetchWithRetry } = require('../lib/http');
const Question = require('../models/Question');
const Category = require('../models/Category');

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

function normalizeDifficulty(value) {
  const normalized = String(value || '').toLowerCase();
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

function normalizeQuestion(raw) {
  if (!raw) return null;

  const questionText = decodeHtml(raw.question || '').trim();
  const correctAnswer = decodeHtml(raw.correct_answer || '').trim();
  const incorrectAnswers = Array.isArray(raw.incorrect_answers)
    ? raw.incorrect_answers.map(answer => decodeHtml(answer).trim())
    : [];

  const normalizedType = String(raw.type || 'multiple').toLowerCase();
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
      .map(answer => ({ text: answer, isCorrect: false }))
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
  const correctIndex = shuffled.findIndex(answer => answer.isCorrect);
  if (correctIndex < 0) {
    return null;
  }

  const choices = shuffled.map(answer => answer.text);
  const checksumSourceChoices = uniqueAnswers.map(answer => answer.text);
  const checksum = Question.generateChecksum(
    questionText,
    checksumSourceChoices
  );

  const categoryNameRaw = decodeHtml(raw.category || '').trim();
  const categoryName = categoryNameRaw || 'General Knowledge';

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
  const uniqueNames = [...new Set((names || []).map(name => String(name).trim()).filter(Boolean))];
  const categoryMap = new Map();

  if (uniqueNames.length === 0) {
    return categoryMap;
  }

  const existing = await Category.find({ name: { $in: uniqueNames } });
  existing.forEach(category => {
    categoryMap.set(category.name, category);
  });

  const missing = uniqueNames.filter(name => !categoryMap.has(name));

  for (const name of missing) {
    const category = await Category.findOneAndUpdate(
      { name },
      { name },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );
    categoryMap.set(category.name, category);
  }

  return categoryMap;
}

async function importTrivia({ url = env.trivia.url } = {}) {
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

  if (payload.response_code && payload.response_code !== 0) {
    throw new Error(`Trivia provider responded with error code ${payload.response_code}`);
  }

  const normalizedQuestions = payload.results
    .map(normalizeQuestion)
    .filter(Boolean);

  const deduped = new Map();
  for (const question of normalizedQuestions) {
    if (!deduped.has(question.checksum)) {
      deduped.set(question.checksum, question);
    }
  }

  const questions = Array.from(deduped.values());

  if (questions.length === 0) {
    logger.info('[TriviaImporter] No new questions returned by provider');
    return {
      inserted: 0,
      total: 0,
      duplicates: 0,
      fetchDurationMs: Date.now() - fetchStart
    };
  }

  const categoryMap = await ensureCategories(questions.map(question => question.categoryName));

  const operations = [];
  for (const question of questions) {
    const categoryDoc = categoryMap.get(question.categoryName);
    if (!categoryDoc) {
      logger.warn(`[TriviaImporter] Missing category document for "${question.categoryName}". Skipping question.`);
      continue;
    }

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
            active: true
          }
        },
        upsert: true
      }
    });
  }

  if (operations.length === 0) {
    return {
      inserted: 0,
      total: questions.length,
      duplicates: questions.length,
      fetchDurationMs: Date.now() - fetchStart
    };
  }

  const writeResult = await Question.bulkWrite(operations, { ordered: false });
  const inserted = writeResult.upsertedCount || 0;

  return {
    inserted,
    total: questions.length,
    duplicates: questions.length - inserted,
    fetchDurationMs: Date.now() - fetchStart
  };
}

module.exports = {
  importTrivia,
};
