'use strict';

const router = require('express').Router();

const Question = require('../models/Question');
const Category = require('../models/Category');
const {
  getFallbackQuestions,
  getFallbackCategories,
  mapCategoryDocument
} = require('../services/publicContent');

const MAX_REQUEST = 20;
const FALLBACK_POOL_SIZE = 100;

function clampCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 5;
  if (parsed < 1) return 1;
  if (parsed > MAX_REQUEST) return MAX_REQUEST;
  return parsed;
}

function normalizeText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function sanitizeOption(value) {
  const normalized = normalizeText(value);
  return normalized;
}

function resolveAnswer(options, index, fallbacks = []) {
  if (Array.isArray(options) && options.length) {
    const safeIndex = Number.parseInt(index, 10);
    if (Number.isInteger(safeIndex) && safeIndex >= 0 && safeIndex < options.length) {
      const candidate = sanitizeOption(options[safeIndex]);
      if (candidate) return candidate;
    }
  }

  for (const fallback of fallbacks) {
    const candidate = sanitizeOption(fallback);
    if (candidate) return candidate;
  }

  return '';
}

function mapCategoryForResponse(category) {
  if (!category) return null;
  const id = category.id || (category._id ? String(category._id) : null);
  const title = normalizeText(category.title || category.displayName || category.name);
  if (!title) return null;
  return {
    id,
    title,
    name: category.name ? normalizeText(category.name) || title : title,
    displayName: category.displayName ? normalizeText(category.displayName) || title : title,
    provider: category.provider || 'local',
    color: category.color || '#60a5fa',
    clues_count: category.clues_count ?? null
  };
}

function mapQuestionDocumentToClue(doc) {
  if (!doc) return null;

  const id = doc._id ? String(doc._id) : doc.id;
  const questionText = normalizeText(doc.text || doc.question || doc.title);
  if (!id || !questionText) return null;

  const rawChoices = Array.isArray(doc.choices)
    ? doc.choices
    : Array.isArray(doc.options)
      ? doc.options
      : Array.isArray(doc.meta?.options)
        ? doc.meta.options
        : [];
  const options = rawChoices.map((choice) => sanitizeOption(choice)).filter(Boolean);

  const fallbackAnswers = [];
  if (typeof doc.correctAnswer === 'string') fallbackAnswers.push(doc.correctAnswer);
  if (typeof doc.meta?.correctAnswer === 'string') fallbackAnswers.push(doc.meta.correctAnswer);

  const indexCandidates = [
    doc.correctIndex,
    doc.correctIdx,
    doc.answerIndex,
    doc.meta?.correctIdx,
    doc.meta?.correctIndex,
    doc.meta?.answerIndex
  ];
  let resolvedIndex;
  for (const candidate of indexCandidates) {
    const parsed = Number.parseInt(candidate, 10);
    if (Number.isInteger(parsed)) {
      resolvedIndex = parsed;
      break;
    }
  }

  const answer = resolveAnswer(options, resolvedIndex, fallbackAnswers);
  if (!answer) return null;

  const categoryDoc = doc.categoryDoc && typeof doc.categoryDoc === 'object'
    ? doc.categoryDoc
    : null;
  const categoryName = normalizeText(
    doc.categoryName
    || categoryDoc?.displayName
    || categoryDoc?.name
    || categoryDoc?.title
  ) || 'عمومی';
  const categoryId = categoryDoc?._id
    ? String(categoryDoc._id)
    : (doc.category && typeof doc.category?.toString === 'function'
      ? doc.category.toString()
      : (doc.category ? String(doc.category) : null));

  return {
    id,
    question: questionText,
    answer,
    category: {
      id: categoryId,
      title: categoryName,
      name: categoryName,
    },
    value: null,
    airdate: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  };
}

function mapFallbackQuestionToClue(item) {
  if (!item) return null;
  const id = item.id ? String(item.id) : null;
  const questionText = normalizeText(item.text || item.title);
  if (!id || !questionText) return null;

  const options = Array.isArray(item.options)
    ? item.options.map((choice) => sanitizeOption(choice)).filter(Boolean)
    : [];
  const answer = resolveAnswer(options, item.correctIdx ?? item.correctIndex ?? item.answerIndex);
  if (!answer) return null;

  const categoryName = normalizeText(item.categoryName || item.cat) || 'عمومی';

  return {
    id,
    question: questionText,
    answer,
    category: {
      id: item.categoryId || null,
      title: categoryName,
      name: categoryName,
    },
    value: null,
    airdate: null,
  };
}

function shuffle(array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function fetchRandomQuestions(requested) {
  const pipeline = [
    { $match: { active: true, status: 'approved' } },
    { $sample: { size: requested } },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDoc'
      }
    },
    {
      $addFields: {
        categoryDoc: { $arrayElemAt: ['$categoryDoc', 0] }
      }
    }
  ];

  return Question.aggregate(pipeline);
}

function buildFallbackClues(count) {
  if (count <= 0) return [];
  const fallbackPool = getFallbackQuestions({ count: FALLBACK_POOL_SIZE });
  if (!Array.isArray(fallbackPool) || fallbackPool.length === 0) return [];
  const shuffled = shuffle(fallbackPool);
  return shuffled
    .slice(0, Math.min(count, shuffled.length))
    .map((item) => mapFallbackQuestionToClue(item))
    .filter(Boolean);
}

async function gatherClues(requested) {
  let documents = [];
  try {
    documents = await fetchRandomQuestions(requested);
  } catch (error) {
    documents = [];
  }

  let clues = Array.isArray(documents)
    ? documents.map((doc) => mapQuestionDocumentToClue(doc)).filter(Boolean)
    : [];

  if (clues.length > requested) {
    clues = clues.slice(0, requested);
  }

  let source = clues.length ? 'database' : 'fallback';

  if (clues.length < requested) {
    const fallbackClues = buildFallbackClues(requested - clues.length);
    if (fallbackClues.length) {
      source = clues.length ? 'mixed' : 'fallback';
      clues = clues.concat(fallbackClues).slice(0, requested);
    }
  }

  return { clues, source };
}

async function gatherCategories() {
  try {
    const docs = await Category.find({}).sort({ order: 1, createdAt: -1 });
    const mapped = docs
      .map((doc) => mapCategoryDocument(doc))
      .map((category) => mapCategoryForResponse(category))
      .filter(Boolean);
    if (mapped.length) {
      return { categories: mapped, source: 'database' };
    }
  } catch (error) {
    // ignore database errors and fall back to static data
  }

  const fallback = getFallbackCategories()
    .map((category) => mapCategoryForResponse(category))
    .filter(Boolean);
  return { categories: fallback, source: 'fallback' };
}

async function handleClueRequest(req, res, next) {
  try {
    const requested = clampCount(req.query.count);
    const { clues, source } = await gatherClues(requested);
    res.json({
      ok: true,
      data: clues,
      meta: {
        requested,
        delivered: clues.length,
        source
      }
    });
  } catch (error) {
    next(error);
  }
}

router.get('/random', handleClueRequest);
router.get('/clues', handleClueRequest);

router.get('/categories', async (req, res, next) => {
  try {
    const { categories, source } = await gatherCategories();
    res.json({
      ok: true,
      data: categories,
      meta: {
        count: categories.length,
        source
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
