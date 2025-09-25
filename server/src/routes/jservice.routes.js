'use strict';

const router = require('express').Router();

const Category = require('../models/Category');
const { mapCategoryDocument, getFallbackCategories } = require('../services/publicContent');
const QuestionService = require('../services/questionService');

const MAX_REQUEST = 20;

function clampCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 5;
  if (parsed < 1) return 1;
  if (parsed > MAX_REQUEST) return MAX_REQUEST;
  return parsed;
}

function resolveGuestId(req) {
  const header = typeof req.headers['x-guest-id'] === 'string' ? req.headers['x-guest-id'].trim() : '';
  if (header) return header;
  const query = typeof req.query?.guestId === 'string' ? req.query.guestId.trim() : '';
  return query;
}

function mapQuestionToClue(item) {
  if (!item || !item.options || typeof item.correctIndex !== 'number') return null;
  const answer = item.options[item.correctIndex];
  if (!answer) return null;
  return {
    id: item.id,
    question: item.text,
    answer,
    category: {
      title: item.category,
      name: item.category
    }
  };
}

router.get('/random', async (req, res, next) => {
  try {
    const count = clampCount(req.query.count);
    const guestId = resolveGuestId(req);
    const userId = req.user?._id || req.user?.id;
    const { ok, items, countRequested } = await QuestionService.getQuestions({
      count,
      category: req.query.category,
      difficulty: req.query.difficulty,
      userId,
      guestId,
      user: req.user
    });

    const clues = Array.isArray(items) ? items.map(mapQuestionToClue).filter(Boolean) : [];
    res.json({
      ok,
      data: clues,
      meta: {
        requested: countRequested,
        delivered: clues.length,
        source: 'database'
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    const docs = await Category.find({}).sort({ order: 1, createdAt: -1 });
    const mapped = docs
      .map((doc) => mapCategoryDocument(doc))
      .filter(Boolean);
    if (mapped.length) {
      res.json({ ok: true, data: mapped, meta: { count: mapped.length, source: 'database' } });
      return;
    }
  } catch (error) {
    // ignore and fall back to static data
  }

  const fallback = getFallbackCategories();
  res.json({ ok: true, data: fallback, meta: { count: fallback.length, source: 'fallback' } });
});

module.exports = router;
