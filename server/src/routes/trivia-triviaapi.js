const router = require('express').Router();

const env = require('../config/env');
const { protect, adminOnly } = require('../middleware/auth');
const Category = require('../models/Category');
const Question = require('../models/Question');
const { getFromTheTriviaAPI } = require('../providers/thetrivia');

const DEFAULT_CATEGORY = 'General Knowledge';
const MAX_LIMIT = 50;

function sanitizeText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function shuffle(array) {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

async function ensureCategories(names) {
  const uniqueNames = [...new Set((names || []).map(name => sanitizeText(name)).filter(Boolean))];
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

function normalizeAnswers(correctAnswer, incorrectAnswers) {
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

function buildTriviaApiUrl(baseUrl, params = {}) {
  const normalizedBase = sanitizeText(baseUrl);
  const url = new URL(normalizedBase || 'https://the-trivia-api.com/v2/questions?limit=20');

  const { limit: rawLimit, ...rest } = params || {};

  if (rawLimit !== undefined) {
    const parsedLimit = Number.parseInt(rawLimit, 10);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      const error = new Error('limit must be a positive integer');
      error.statusCode = 400;
      throw error;
    }
    const bounded = Math.min(Math.max(parsedLimit, 1), MAX_LIMIT);
    url.searchParams.set('limit', String(bounded));
  }

  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      const normalizedItems = value.map(item => sanitizeText(item)).filter(Boolean);
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

router.post('/trivia/import/triviaapi', protect, adminOnly, async (req, res, next) => {
  try {
    const requestBody = req.body && typeof req.body === 'object' ? req.body : {};
    const requestUrl = buildTriviaApiUrl(env.trivia.theTriviaUrl, requestBody);

    const questions = await getFromTheTriviaAPI(requestUrl);

    if (questions.length === 0) {
      return res.json({ ok: true, count: 0 });
    }

    const categoryMap = await ensureCategories(
      questions.map(question => question.categoryName || DEFAULT_CATEGORY)
    );

    const operations = [];
    for (const question of questions) {
      const categoryName = question.categoryName || DEFAULT_CATEGORY;
      const categoryDoc = categoryMap.get(categoryName);
      if (!categoryDoc) {
        continue;
      }

      const normalized = normalizeAnswers(question.correctAnswer, question.incorrectAnswers);
      if (!normalized) {
        continue;
      }

      const { answers, correct } = normalized;
      const choices = shuffle(answers);
      const correctIndex = choices.findIndex(choice => choice === correct);
      if (correctIndex < 0) {
        continue;
      }

      const checksum = Question.generateChecksum(question.question, answers);

      const document = {
        text: question.question,
        choices,
        correctIndex,
        difficulty: question.difficulty,
        category: categoryDoc._id,
        categoryName,
        source: question.source,
        type: question.type,
        lang: question.lang,
        checksum,
        active: true
      };

      operations.push({
        updateOne: {
          filter: { checksum },
          update: { $setOnInsert: document },
          upsert: true
        }
      });
    }

    if (operations.length === 0) {
      return res.json({ ok: true, count: 0 });
    }

    const result = await Question.bulkWrite(operations, { ordered: false });
    const insertedCount = result.upsertedCount || 0;

    return res.json({ ok: true, count: insertedCount });
  } catch (error) {
    if (error?.statusCode === 400) {
      return res.status(400).json({ ok: false, message: error.message });
    }
    return next(error);
  }
});

module.exports = router;

