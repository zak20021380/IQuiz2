const router = require('express').Router();
const AdminSetting = require('../models/AdminSetting');
const { requireAdmin } = require('../middleware/adminAuth');

const DEFAULT_DATA = AdminSetting.defaultData();

const sanitizeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const sanitizeData = (raw) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  const normalized = { ...DEFAULT_DATA };

  if (Object.prototype.hasOwnProperty.call(source, 'appName')) {
    normalized.appName = typeof source.appName === 'string' ? source.appName.trim() : '';
  }

  if (Object.prototype.hasOwnProperty.call(source, 'defaultLang')) {
    const lang = typeof source.defaultLang === 'string' ? source.defaultLang.trim() : '';
    normalized.defaultLang = lang || DEFAULT_DATA.defaultLang;
  }

  if (Object.prototype.hasOwnProperty.call(source, 'questionTimeSec')) {
    const value = sanitizeNumber(source.questionTimeSec, DEFAULT_DATA.questionTimeSec);
    normalized.questionTimeSec = value >= 0 ? value : DEFAULT_DATA.questionTimeSec;
  }

  if (Object.prototype.hasOwnProperty.call(source, 'maxQuestionsPerMatch')) {
    const value = sanitizeNumber(source.maxQuestionsPerMatch, DEFAULT_DATA.maxQuestionsPerMatch);
    normalized.maxQuestionsPerMatch = value >= 0 ? value : DEFAULT_DATA.maxQuestionsPerMatch;
  }

  if (Object.prototype.hasOwnProperty.call(source, 'minimumSettlement')) {
    const value = sanitizeNumber(source.minimumSettlement, DEFAULT_DATA.minimumSettlement);
    normalized.minimumSettlement = value >= 0 ? value : DEFAULT_DATA.minimumSettlement;
  }

  if (Object.prototype.hasOwnProperty.call(source, 'roundingStep')) {
    const value = sanitizeNumber(source.roundingStep, DEFAULT_DATA.roundingStep);
    normalized.roundingStep = value > 0 ? value : DEFAULT_DATA.roundingStep;
  }

  if (Object.prototype.hasOwnProperty.call(source, 'settlementAmounts')) {
    const list = Array.isArray(source.settlementAmounts)
      ? source.settlementAmounts
      : typeof source.settlementAmounts === 'string'
        ? source.settlementAmounts.split(/[,\n]+/)
        : [];
    const normalizedList = list
      .map((value) => sanitizeNumber(value, NaN))
      .filter((value) => Number.isFinite(value) && value >= 0);
    const uniqueSorted = Array.from(new Set(normalizedList)).sort((a, b) => a - b);
    normalized.settlementAmounts = uniqueSorted;
  }

  if (Object.prototype.hasOwnProperty.call(source, 'monthlyBudget')) {
    const value = sanitizeNumber(source.monthlyBudget, DEFAULT_DATA.monthlyBudget);
    normalized.monthlyBudget = value >= 0 ? value : DEFAULT_DATA.monthlyBudget;
  }

  return normalized;
};

const buildResponse = (doc) => {
  const data = doc && doc.data && typeof doc.data === 'object' ? doc.data : {};
  const merged = sanitizeData({ ...DEFAULT_DATA, ...data });
  const updatedAt = doc?.updatedAt ? new Date(doc.updatedAt) : null;
  return {
    data: merged,
    version: typeof doc?.version === 'number' ? doc.version : 0,
    updatedAt: updatedAt ? updatedAt.toISOString() : null
  };
};

router.get('/admin/settings', requireAdmin, async (req, res, next) => {
  try {
    const existing = await AdminSetting.findById('global').lean();
    const payload = buildResponse(existing || {});
    res.json({ ok: true, ...payload });
  } catch (error) {
    next(error);
  }
});

router.put('/admin/settings', requireAdmin, async (req, res, next) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const sanitized = sanitizeData(payload.data);
    const actorId = req.user?._id?.toString?.() || req.user?.id || req.user?._id || null;
    const now = new Date();

    const updatedDoc = await AdminSetting.findOneAndUpdate(
      { _id: 'global' },
      {
        $set: {
          data: sanitized,
          updatedBy: actorId,
          updatedAt: now
        },
        $setOnInsert: { version: 0 },
        $inc: { version: 1 }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    ).lean();

    const response = buildResponse(updatedDoc);
    res.json({ ok: true, ...response });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
