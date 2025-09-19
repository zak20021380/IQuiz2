const router = require('express').Router();
const mongoose = require('mongoose');

const logger = require('../config/logger');
const Category = require('../models/Category');
const Question = require('../models/Question');
const AdModel = require('../models/Ad');
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
const AD_PLACEMENTS = new Set(AdModel.AD_PLACEMENTS || ['banner', 'native', 'interstitial', 'rewarded']);

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

function sanitizeCount(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(parsed, 1), MAX_PUBLIC_QUESTIONS);
}

function sanitizePlacement(value) {
  const normalized = sanitizeString(value).toLowerCase();
  return AD_PLACEMENTS.has(normalized) ? normalized : '';
}

function sanitizeProvince(value) {
  return sanitizeString(value);
}

function isAdActive(ad, nowTs) {
  if (!ad) return false;
  if ((ad.status || '').toLowerCase() !== 'active') return false;
  const start = ad.startDate ? new Date(ad.startDate).getTime() : null;
  const end = ad.endDate ? new Date(ad.endDate).getTime() : null;
  if (Number.isFinite(start) && start > nowTs) return false;
  if (Number.isFinite(end) && end < nowTs) return false;
  return true;
}

function matchesProvince(ad, province) {
  if (!province) return true;
  const list = Array.isArray(ad?.provinces) ? ad.provinces : [];
  if (list.length === 0) return true;
  const normalizedProvince = province.trim();
  return list.some((item) => sanitizeString(item) === normalizedProvince);
}

function pickWeightedAd(ads) {
  if (!Array.isArray(ads) || ads.length === 0) return null;
  if (ads.length === 1) return ads[0];
  const weights = ads.map((ad) => {
    const priority = Number(ad.priority);
    if (!Number.isFinite(priority) || priority <= 0) return 1;
    return Math.min(Math.max(Math.round(priority), 1), 100);
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const target = Math.random() * total;
  let cumulative = 0;
  for (let i = 0; i < ads.length; i += 1) {
    cumulative += weights[i];
    if (target <= cumulative) return ads[i];
  }
  return ads[ads.length - 1];
}

function mapAdForPublic(ad) {
  if (!ad) return null;
  const id = ad._id ? String(ad._id) : ad.id;
  const placement = ad.placement;
  const base = {
    id,
    placement,
    startDate: ad.startDate,
    endDate: ad.endDate
  };

  switch (placement) {
    case 'banner':
      return {
        ...base,
        creativeUrl: ad.creativeUrl,
        creativeType: ad.creativeType || 'image',
        landingUrl: ad.landingUrl || '',
        ctaLabel: ad.ctaLabel || 'مشاهده'
      };
    case 'native':
      return {
        ...base,
        creativeType: ad.creativeType || 'image',
        headline: ad.headline || ad.name || '',
        description: ad.body || '',
        imageUrl: ad.creativeUrl,
        landingUrl: ad.landingUrl || '',
        ctaLabel: ad.ctaLabel || 'مشاهده'
      };
    case 'interstitial':
      return {
        ...base,
        creativeUrl: ad.creativeUrl,
        creativeType: ad.creativeType || 'html',
        landingUrl: ad.landingUrl || ''
      };
    case 'rewarded':
      return {
        ...base,
        videoUrl: ad.creativeUrl,
        creativeType: ad.creativeType || 'video',
        landingUrl: ad.landingUrl || '',
        rewardType: ad.rewardType || 'coins',
        rewardAmount: ad.rewardAmount ?? 0
      };
    default:
      return {
        ...base,
        creativeUrl: ad.creativeUrl,
        landingUrl: ad.landingUrl || ''
      };
  }
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

router.get('/ads', async (req, res) => {
  const placement = sanitizePlacement(req.query.placement);
  if (!placement) {
    return res.status(400).json({ ok: false, message: 'invalid placement' });
  }
  const province = sanitizeProvince(req.query.province || '');
  const now = new Date();
  const nowTs = now.getTime();

  try {
    const docs = await AdModel.find({
      placement,
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).sort({ priority: -1, updatedAt: -1 }).lean();

    const eligible = docs.filter((ad) => isAdActive(ad, nowTs) && matchesProvince(ad, province));
    const selected = pickWeightedAd(eligible);

    res.json({ ok: true, data: mapAdForPublic(selected) });
  } catch (error) {
    logger.warn(`Failed to load ads for placement ${placement}: ${error.message}`);
    res.json({ ok: true, data: null });
  }
});

module.exports = router;
