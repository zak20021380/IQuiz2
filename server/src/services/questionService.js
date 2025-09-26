const mongoose = require('mongoose');

const Question = require('../models/Question');
const UserQuestionEvent = require('../models/UserQuestionEvent');
const questionConfig = require('../config/questions');
const logger = require('../config/logger');

const MAX_PER_REQUEST = 30;
const FETCH_MULTIPLIER = 2;
const MAX_FETCH_LIMIT = MAX_PER_REQUEST * 3;
const RECENT_LIMIT = questionConfig.RECENT_QUESTION_LIMIT || 500;
const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function sanitizeCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 5;
  if (parsed <= 0) return 1;
  if (parsed > MAX_PER_REQUEST) return MAX_PER_REQUEST;
  return parsed;
}

function sanitizeDifficulty(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toLowerCase();
  return ALLOWED_DIFFICULTIES.has(normalized) ? normalized : '';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildCategoryFilter(category) {
  const trimmed = typeof category === 'string' ? category.trim() : '';
  if (!trimmed) return null;

  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    return { category: new mongoose.Types.ObjectId(trimmed) };
  }

  const normalized = trimmed.toLowerCase();
  const regex = new RegExp(`^${escapeRegExp(trimmed)}$`, 'i');
  const slugRegex = new RegExp(`^${escapeRegExp(normalized)}$`, 'i');

  return {
    $or: [
      { categorySlug: normalized },
      { categorySlug: slugRegex },
      { categoryName: regex }
    ]
  };
}

function cloneQuery(query = {}) {
  const cloned = { ...query };
  if (Array.isArray(query.$and)) {
    cloned.$and = [...query.$and];
  }
  if (query._id && typeof query._id === 'object') {
    cloned._id = { ...query._id };
  }
  return cloned;
}

function shuffleInPlace(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    if (i === j) continue;
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

function normalizeUserId(value) {
  if (!value) return '';
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toHexString();
  }
  if (typeof value === 'object' && value._id) {
    return normalizeUserId(value._id);
  }
  const stringValue = String(value).trim();
  if (!stringValue) return '';
  if (mongoose.Types.ObjectId.isValid(stringValue)) {
    return new mongoose.Types.ObjectId(stringValue).toHexString();
  }
  return stringValue;
}

function resolveUserKey({ userId, guestId, user }) {
  const normalizedUser = normalizeUserId(userId || user?.id || user?._id);
  if (normalizedUser) {
    return normalizedUser;
  }
  const guestKey = typeof guestId === 'string' ? guestId.trim() : '';
  if (guestKey) {
    return `guest:${guestKey}`;
  }
  return '';
}

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
}

async function collectRecentQuestionIds(userKey) {
  if (!userKey) return [];
  try {
    const docs = await UserQuestionEvent.find({ userId: userKey })
      .sort({ answeredAt: -1 })
      .limit(RECENT_LIMIT)
      .select({ questionId: 1 })
      .lean();
    const ids = [];
    const seen = new Set();
    for (const doc of docs) {
      if (!doc?.questionId) continue;
      const asString = String(doc.questionId);
      if (!asString || seen.has(asString)) continue;
      seen.add(asString);
      ids.push(asString);
    }
    return ids;
  } catch (error) {
    logger.warn(`[questions] failed to load user history: ${error.message}`);
    return [];
  }
}

function normalizeDocuments(docs, seenIds) {
  const normalized = [];
  for (const doc of docs) {
    const question = normalizeQuestionDocument(doc);
    if (!isValidQuestion(question)) continue;
    if (seenIds.has(question.id)) continue;
    seenIds.add(question.id);
    normalized.push(question);
  }
  return normalized;
}

function extractOptions(doc) {
  const source = Array.isArray(doc.options)
    ? doc.options
    : Array.isArray(doc.choices)
      ? doc.choices
      : [];

  return source
    .map((option) => (typeof option === 'string' ? option.trim() : String(option ?? '').trim()))
    .filter((option) => option.length > 0)
    .slice(0, 4);
}

function normalizeQuestionDocument(doc) {
  if (!doc) return null;
  const id = doc._id ? String(doc._id) : (doc.id ? String(doc.id) : null);
  if (!id) return null;

  const text = typeof doc.text === 'string' && doc.text.trim()
    ? doc.text.trim()
    : typeof doc.question === 'string' && doc.question.trim()
      ? doc.question.trim()
      : '';

  const options = extractOptions(doc);

  const indexCandidates = [doc.correctIndex, doc.correctIdx, doc.answerIndex];
  let correctIndex = -1;
  for (const candidate of indexCandidates) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed < options.length) {
      correctIndex = parsed;
      break;
    }
  }

  if (correctIndex < 0 && options.length) {
    const answerCandidates = [doc.correctAnswer, doc.answer, doc.meta?.correctAnswer]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);

    const normalizedOptions = options.map((option) => option.toLowerCase());
    for (const candidate of answerCandidates) {
      const normalizedCandidate = candidate.toLowerCase();
      const matchIndex = normalizedOptions.indexOf(normalizedCandidate);
      if (matchIndex >= 0 && matchIndex < options.length) {
        correctIndex = matchIndex;
        break;
      }
    }
  }

  const category = typeof doc.categorySlug === 'string' && doc.categorySlug.trim()
    ? doc.categorySlug.trim()
    : typeof doc.categoryName === 'string' && doc.categoryName.trim()
      ? doc.categoryName.trim()
      : 'عمومی';

  const difficulty = typeof doc.difficulty === 'string' && doc.difficulty.trim()
    ? doc.difficulty.trim().toLowerCase()
    : '';

  return {
    id,
    text,
    options,
    correctIndex,
    category,
    difficulty
  };
}

function isValidQuestion(question) {
  if (!question) return false;
  if (typeof question.text !== 'string' || !question.text.trim()) return false;
  if (!Array.isArray(question.options) || question.options.length !== 4) return false;
  if (!question.options.every((option) => typeof option === 'string' && option.trim())) return false;
  if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) return false;
  return true;
}

function buildBaseQuery(params) {
  const query = {
    active: { $ne: false },
    $and: [
      {
        $or: [
          { status: { $exists: false } },
          { status: 'approved' }
        ]
      }
    ]
  };

  const difficulty = sanitizeDifficulty(params.difficulty);
  if (difficulty) {
    query.difficulty = difficulty;
  }

  const categoryFilter = buildCategoryFilter(params.category || params.categoryId || params.categorySlug);
  if (categoryFilter) {
    if (categoryFilter.category) {
      query.category = categoryFilter.category;
    }
    if (Array.isArray(categoryFilter.$or) && categoryFilter.$or.length) {
      query.$and.push({ $or: categoryFilter.$or });
    }
  }

  return query;
}

async function getQuestions(params = {}) {
  const countRequested = sanitizeCount(params.count);
  const baseQuery = buildBaseQuery(params);
  const fetchLimit = Math.min(
    Math.max(countRequested * FETCH_MULTIPLIER, countRequested),
    MAX_FETCH_LIMIT
  );

  let totalMatched = 0;
  try {
    totalMatched = await Question.countDocuments(baseQuery);
  } catch (error) {
    logger.warn(`[questions] count failed: ${error.message}`);
  }

  const userKey = resolveUserKey(params);
  const recentIds = await collectRecentQuestionIds(userKey);
  const recentObjectIds = recentIds
    .map((id) => toObjectId(id))
    .filter((id) => id);

  const primaryQuery = cloneQuery(baseQuery);
  if (recentObjectIds.length) {
    primaryQuery._id = {
      ...(primaryQuery._id || {}),
      $nin: recentObjectIds
    };
  }

  let primaryDocs = [];
  try {
    primaryDocs = await Question.find(primaryQuery)
      .limit(fetchLimit)
      .lean();
    shuffleInPlace(primaryDocs);
  } catch (error) {
    logger.error(`[questions] query failed: ${error.message}`);
    return {
      ok: false,
      countRequested,
      countReturned: 0,
      totalMatched,
      items: [],
      avoided: recentIds.length,
      message: 'no questions available'
    };
  }

  const seenIds = new Set();
  const primaryNormalized = normalizeDocuments(primaryDocs, seenIds);
  let items = primaryNormalized.slice(0, countRequested);

  if (items.length < countRequested) {
    const missing = countRequested - items.length;
    const excludeObjectIds = Array.from(seenIds)
      .map((id) => toObjectId(id))
      .filter((id) => id);
    const backfillQuery = cloneQuery(baseQuery);
    if (excludeObjectIds.length) {
      backfillQuery._id = {
        ...(backfillQuery._id || {}),
        $nin: excludeObjectIds
      };
    }

    const backfillLimit = Math.min(
      Math.max(missing * FETCH_MULTIPLIER, missing),
      MAX_FETCH_LIMIT
    );

    let backfillDocs = [];
    try {
      backfillDocs = await Question.find(backfillQuery)
        .limit(backfillLimit)
        .lean();
      shuffleInPlace(backfillDocs);
    } catch (error) {
      logger.warn(`[questions] backfill failed: ${error.message}`);
    }

    const backfillNormalized = normalizeDocuments(backfillDocs, seenIds);
    items = items.concat(backfillNormalized).slice(0, countRequested);
  }

  const countReturned = items.length;

  console.info('[questions]', {
    userId: userKey || null,
    want: countRequested,
    recent: recentIds.length,
    primary: primaryNormalized.length,
    returned: countReturned
  });

  if (countReturned === 0) {
    logger.warn(`[questions] empty response want=${countRequested} totalMatched=${totalMatched}`);
  } else if (countReturned < countRequested) {
    logger.warn(
      `[questions] partial response want=${countRequested} returned=${countReturned} totalMatched=${totalMatched}`
    );
  }

  const ok = countReturned > 0;

  return {
    ok,
    countRequested,
    countReturned,
    totalMatched,
    items,
    avoided: recentIds.length,
    ...(ok ? {} : { message: 'no questions available' })
  };
}

module.exports = {
  MAX_PER_REQUEST,
  getQuestions,
  normalizeQuestionDocument,
  isValidQuestion,
  sanitizeCount,
  sanitizeDifficulty
};
