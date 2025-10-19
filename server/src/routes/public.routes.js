const router = require('express').Router();

const logger = require('../config/logger');
const Category = require('../models/Category');
const questionsController = require('../controllers/questions.controller');
const AdModel = require('../models/Ad');
const QuestionService = require('../services/questionService');
const telegramController = require('../controllers/telegram.controller');
const leaderboardController = require('../controllers/leaderboard.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const { resolveCategory } = require('../config/categories');
const { recordAnswerEvent } = require('../controllers/answers');
const { mapCategoryDocument } = require('../services/publicContent');
const { sanitizeDifficulty } = require('../utils');
const { getAdminSettingsSnapshot } = require('../config/adminSettings');

const {
  getFallbackCategories,
  getFallbackProvinces,
  getFallbackConfig
} = require('../utils/fallbacks');

const MAX_PUBLIC_QUESTIONS = 30;
const AD_PLACEMENTS = new Set(AdModel.AD_PLACEMENTS || ['banner', 'native', 'interstitial', 'rewarded']);

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

function sanitizeCount(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(parsed, 1), MAX_PUBLIC_QUESTIONS);
}

function resolveGuestId(req) {
  const header = sanitizeString(req.headers['x-guest-id']);
  if (header) return header;
  const query = sanitizeString(req.query?.guestId);
  if (query) return query;
  return '';
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

router.get('/config', (req, res) => {
  res.json(getFallbackConfig());
});

router.get('/admin-settings', (req, res) => {
  try {
    const data = getAdminSettingsSnapshot();
    res.json({ ok: true, data });
  } catch (error) {
    logger.error('[public] failed to load admin settings snapshot', error);
    res.status(500).json({ ok: false, message: 'failed to load admin settings' });
  }
});

router.post('/questions/submit', questionsController.submitPublic);
router.post('/telegram/session', telegramController.createSession);

router.post('/answers', async (req, res, next) => {
  try {
    const rawIds = Array.isArray(req.body?.questionIds)
      ? req.body.questionIds
      : Array.isArray(req.body?.questions)
        ? req.body.questions
        : [];

    const normalized = [];
    const seen = new Set();
    for (const entry of rawIds) {
      const value = typeof entry === 'string'
        ? entry.trim()
        : entry && typeof entry === 'object' && entry.id
          ? String(entry.id).trim()
          : '';
      if (!value || seen.has(value)) continue;
      seen.add(value);
      normalized.push(value);
      if (normalized.length >= 120) break;
    }

    if (!normalized.length) {
      return res.status(400).json({ ok: false, message: 'questionIds array is required' });
    }

    const guestId = resolveGuestId(req);
    const userId = req.user?._id || req.user?.id;
    let recorded = 0;

    for (const questionId of normalized) {
      const success = await recordAnswerEvent({
        userId,
        user: req.user,
        guestId,
        questionId,
      });
      if (success) recorded += 1;
    }

    res.json({ ok: true, recorded, total: normalized.length });
  } catch (error) {
    next(error);
  }
});

router.post('/register', leaderboardController.registerGuest);

router.get('/leaderboard', optionalAuth, leaderboardController.overview);
router.post('/progress', protect, leaderboardController.recordProgress);
router.patch('/profile', protect, leaderboardController.updateProfile);

router.get('/categories', async (req, res) => {
  try {
    const docs = await Category.find({ status: { $ne: 'disabled' } })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    const mapped = docs
      .map((doc) => mapCategoryDocument(doc))
      .filter(Boolean);
    if (mapped.length > 0) {
      return res.json(mapped);
    }
  } catch (error) {
    logger.warn(`[public] failed to load categories from database: ${error.message}`);
  }

  try {
    const fallback = await getFallbackCategories();
    return res.json(fallback);
  } catch (error) {
    logger.warn(`[public] failed to load fallback categories: ${error.message}`);
    return res.json([]);
  }
});



router.get('/provinces', async (req, res) => {
  try {
    const data = await getFallbackProvinces();    // 31 استان
    return res.json(data);
  } catch (error) {
    return res.json([]);
  }
});



router.get('/questions', async (req, res, next) => {
  try {
    const count = sanitizeCount(req.query.count);
    const difficulty = sanitizeDifficulty(req.query.difficulty);
    const categoryInputs = [
      req.query.categoryId,
      req.query.categorySlug,
      req.query.category,
      req.query.slug
    ].filter(Boolean);

    let resolvedCategorySlug = '';

    if (typeof req.query.categoryName === 'string') {
      categoryInputs.push(req.query.categoryName);
    }

    categoryInputs.forEach((input) => {
      const resolved = resolveCategory(input);
      if (resolved) {
        if (!resolvedCategorySlug && typeof resolved.slug === 'string') {
          resolvedCategorySlug = resolved.slug.trim();
        }
        categoryInputs.push(resolved.slug, resolved.providerCategoryId, resolved.name, resolved.displayName);
      }
    });

    const category = categoryInputs
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .find((value) => value.length > 0);

    const rawCategorySlug = typeof req.query.categorySlug === 'string' ? req.query.categorySlug.trim() : '';
    const rawSlug = rawCategorySlug
      || (typeof req.query.slug === 'string' ? req.query.slug.trim() : '');
    const rawCategory = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const looksLikeObjectId = /^[a-f0-9]{24}$/i.test(rawCategory);
    const fallbackCategorySlug = looksLikeObjectId ? '' : rawCategory;
    const categorySlug = resolvedCategorySlug || rawSlug || fallbackCategorySlug;

    const guestId = resolveGuestId(req);
    const userId = req.user?._id || req.user?.id;

    const result = await QuestionService.getQuestions({
      count,
      difficulty,
      category,
      categorySlug,
      userId,
      guestId,
      user: req.user
    });

    const status = !result.ok
      ? 404
      : result.countReturned < result.countRequested
        ? 206
        : 200;
    res.status(status).json(result);
  } catch (error) {
    next(error);
  }
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
