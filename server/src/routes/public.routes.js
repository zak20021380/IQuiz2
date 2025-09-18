const router = require('express').Router();
const mongoose = require('mongoose');

const logger = require('../config/logger');
const Category = require('../models/Category');
const Question = require('../models/Question');
const {
  getFallbackCategories,
  mapCategoryDocument,
  getFallbackProvinces,
  getFallbackConfig,
  sanitizeDifficulty,
  getFallbackQuestions,
  mapQuestionDocument
} = require('../services/publicContent');

const MAX_PUBLIC_QUESTIONS = 20;

function sanitizeCount(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(parsed, 1), MAX_PUBLIC_QUESTIONS);
}

function buildCategoryMap(items) {
  const map = new Map();
  items.forEach(item => {
    if (item && item.id) {
      map.set(String(item.id), item);
    }
  });
  return map;
}

router.get('/config', (req, res) => {
  res.json(getFallbackConfig());
});

router.get('/categories', async (req, res) => {
  try {
    const docs = await Category.find({ status: 'active' }).sort({ name: 1 }).lean();
    const normalized = docs
      .map(mapCategoryDocument)
      .filter(cat => cat && cat.isActive);
    if (normalized.length > 0) {
      return res.json(normalized);
    }
  } catch (error) {
    logger.warn(`Failed to load categories from database: ${error.message}`);
  }
  return res.json(getFallbackCategories());
});

router.get('/provinces', (req, res) => {
  res.json(getFallbackProvinces());
});

router.get('/questions', async (req, res) => {
  const count = sanitizeCount(req.query.count);
  const difficulty = sanitizeDifficulty(req.query.difficulty);
  const categoryIdRaw = typeof req.query.categoryId === 'string' ? req.query.categoryId.trim() : '';

  const fallbackResponse = () => {
    res.json(getFallbackQuestions({ categoryId: categoryIdRaw || null, difficulty, count }));
  };

  let useFallback = false;
  const match = { active: true };
  if (difficulty) {
    match.difficulty = difficulty;
  }

  if (categoryIdRaw) {
    if (mongoose.Types.ObjectId.isValid(categoryIdRaw)) {
      match.category = new mongoose.Types.ObjectId(categoryIdRaw);
    } else {
      useFallback = true;
    }
  }

  if (useFallback) {
    return fallbackResponse();
  }

  try {
    const pipeline = [
      { $match: match },
      { $sample: { size: count } }
    ];
    const docs = await Question.aggregate(pipeline);

    if (Array.isArray(docs) && docs.length > 0) {
      const categoryIds = docs
        .map(doc => (doc.category ? String(doc.category) : null))
        .filter(Boolean);
      let categoryMap = new Map();
      if (categoryIds.length > 0) {
        const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
        categoryMap = buildCategoryMap(categories.map(mapCategoryDocument));
      }

      const normalized = docs
        .map(doc => mapQuestionDocument(doc, categoryMap))
        .filter(Boolean)
        .slice(0, count);

      if (normalized.length > 0) {
        return res.json(normalized);
      }
    }
  } catch (error) {
    logger.warn(`Failed to load questions from database: ${error.message}`);
  }

  return fallbackResponse();
});

module.exports = router;
