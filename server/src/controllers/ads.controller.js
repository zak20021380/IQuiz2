const mongoose = require('mongoose');
const AdModel = require('../models/Ad');
const {
  AD_PLACEMENTS,
  AD_STATUSES,
  AD_CREATIVE_TYPES,
  AD_REWARD_TYPES
} = AdModel;
const { filterAllowedProvinceNames } = require('../services/provinceService');

const Ad = AdModel;

const PLACEMENTS = new Set(AD_PLACEMENTS);
const STATUSES = new Set(AD_STATUSES);
const CREATIVE_TYPES = new Set(AD_CREATIVE_TYPES);
const REWARD_TYPES = new Set(AD_REWARD_TYPES);

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

function sanitizePlacement(value) {
  const normalized = sanitizeString(value).toLowerCase();
  return PLACEMENTS.has(normalized) ? normalized : '';
}

function sanitizeStatus(value, fallback = 'draft') {
  const normalized = sanitizeString(value).toLowerCase();
  if (!normalized) return fallback;
  return STATUSES.has(normalized) ? normalized : fallback;
}

function sanitizeCreativeType(value, fallback = 'image') {
  const normalized = sanitizeString(value).toLowerCase();
  return CREATIVE_TYPES.has(normalized) ? normalized : fallback;
}

function sanitizeRewardType(value, fallback = 'coins') {
  const normalized = sanitizeString(value).toLowerCase();
  return REWARD_TYPES.has(normalized) ? normalized : fallback;
}

function sanitizeUrl(value, { allowEmpty = true } = {}) {
  const url = sanitizeString(value);
  if (!url) return allowEmpty ? '' : null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return allowEmpty ? '' : null;
    return parsed.toString();
  } catch (err) {
    return allowEmpty ? '' : null;
  }
}

function sanitizeNumber(value, { fallback = 0, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, round = false } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  let normalized = num;
  if (round) normalized = Math.round(normalized);
  if (normalized < min) normalized = min;
  if (normalized > max) normalized = max;
  return normalized;
}

function sanitizeDate(value) {
  const str = sanitizeString(value);
  if (!str) return null;
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function sanitizeProvinces(list) {
  const values = Array.isArray(list) ? list : [];
  const unique = new Set();
  values.forEach((item) => {
    const normalized = sanitizeString(item);
    if (normalized) unique.add(normalized);
  });
  return Array.from(unique);
}

function mapAdDocument(doc) {
  if (!doc) return null;
  const raw = doc.toObject ? doc.toObject() : doc;
  const id = raw._id ? String(raw._id) : null;
  return {
    id,
    name: raw.name || '',
    placement: raw.placement,
    status: raw.status,
    priority: raw.priority,
    creativeUrl: raw.creativeUrl,
    creativeType: raw.creativeType,
    landingUrl: raw.landingUrl || '',
    headline: raw.headline || '',
    body: raw.body || '',
    ctaLabel: raw.ctaLabel || '',
    rewardType: raw.rewardType || 'coins',
    rewardAmount: raw.rewardAmount ?? 0,
    provinces: Array.isArray(raw.provinces) ? raw.provinces : [],
    startDate: raw.startDate,
    endDate: raw.endDate,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  };
}

exports.create = async (req, res, next) => {
  try {
    const name = sanitizeString(req.body.name);
    const placement = sanitizePlacement(req.body.placement);
    const status = sanitizeStatus(req.body.status, 'active');
    const creativeUrl = sanitizeUrl(req.body.creativeUrl, { allowEmpty: false });
    const landingUrl = sanitizeUrl(req.body.landingUrl);
    const creativeType = sanitizeCreativeType(req.body.creativeType, placement === 'rewarded' ? 'video' : placement === 'interstitial' ? 'html' : 'image');
    const headline = sanitizeString(req.body.headline);
    const body = sanitizeString(req.body.body);
    const ctaLabel = sanitizeString(req.body.ctaLabel) || 'مشاهده';
    const requestedProvinces = sanitizeProvinces(req.body.provinces);
    const provinces = await filterAllowedProvinceNames(requestedProvinces);
    if (requestedProvinces.length !== provinces.length) {
      return res.status(400).json({ ok: false, message: 'برخی از استان‌های انتخاب‌شده معتبر نیستند' });
    }
    const startDate = sanitizeDate(req.body.startDate);
    const endDate = sanitizeDate(req.body.endDate);
    const rewardType = sanitizeRewardType(req.body.rewardType, 'coins');
    const rewardAmount = sanitizeNumber(req.body.rewardAmount, { fallback: 20, min: 0, max: 1000, round: true });
    const priority = sanitizeNumber(req.body.priority, { fallback: 1, min: 0, max: 100, round: true });

    if (!name) {
      return res.status(400).json({ ok: false, message: 'نام تبلیغ الزامی است' });
    }
    if (!placement) {
      return res.status(400).json({ ok: false, message: 'جایگاه تبلیغ نامعتبر است' });
    }
    if (!creativeUrl) {
      return res.status(400).json({ ok: false, message: 'آدرس محتوای تبلیغ الزامی است' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ ok: false, message: 'بازه زمانی تبلیغ معتبر نیست' });
    }
    if (startDate.getTime() > endDate.getTime()) {
      return res.status(400).json({ ok: false, message: 'تاریخ پایان باید بعد از تاریخ شروع باشد' });
    }

    if (['banner', 'native', 'rewarded'].includes(placement) && !landingUrl) {
      return res.status(400).json({ ok: false, message: 'لینک مقصد برای این جایگاه الزامی است' });
    }
    if (placement === 'native' && !headline) {
      return res.status(400).json({ ok: false, message: 'عنوان تبلیغ همسان را وارد کنید' });
    }
    if (placement === 'rewarded' && rewardAmount <= 0) {
      return res.status(400).json({ ok: false, message: 'مقدار پاداش باید بزرگ‌تر از صفر باشد' });
    }

    const ad = await Ad.create({
      name,
      placement,
      status,
      creativeUrl,
      landingUrl,
      creativeType,
      headline,
      body,
      ctaLabel,
      provinces,
      startDate,
      endDate,
      rewardType,
      rewardAmount,
      priority
    });

    res.status(201).json({ ok: true, data: mapAdDocument(ad) });
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const page = sanitizeNumber(req.query.page, { fallback: 1, min: 1, max: 500, round: true });
    const limit = sanitizeNumber(req.query.limit, { fallback: 50, min: 1, max: 200, round: true });
    const skip = (page - 1) * limit;
    const placement = sanitizePlacement(req.query.placement);
    const status = sanitizeStatus(req.query.status, '');
    const q = sanitizeString(req.query.q);

    const where = {};
    if (placement) where.placement = placement;
    if (status) where.status = status;
    if (q) {
      where.name = { $regex: q, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      Ad.find(where).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Ad.countDocuments(where)
    ]);

    res.json({
      ok: true,
      data: items.map(mapAdDocument),
      meta: { total, page, limit }
    });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ ok: false, message: 'Ad not found' });
    }
    await Ad.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ ok: false, message: 'Ad not found' });
    }

    const ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ ok: false, message: 'Ad not found' });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const name = sanitizeString(req.body.name);
      if (!name) {
        return res.status(400).json({ ok: false, message: 'نام تبلیغ نمی‌تواند خالی باشد' });
      }
      ad.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'placement')) {
      const placement = sanitizePlacement(req.body.placement);
      if (!placement) {
        return res.status(400).json({ ok: false, message: 'جایگاه تبلیغ نامعتبر است' });
      }
      ad.placement = placement;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      ad.status = sanitizeStatus(req.body.status, ad.status);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'creativeUrl')) {
      const creativeUrl = sanitizeUrl(req.body.creativeUrl, { allowEmpty: false });
      if (!creativeUrl) {
        return res.status(400).json({ ok: false, message: 'آدرس محتوای تبلیغ الزامی است' });
      }
      ad.creativeUrl = creativeUrl;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'landingUrl')) {
      ad.landingUrl = sanitizeUrl(req.body.landingUrl) || '';
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'creativeType')) {
      ad.creativeType = sanitizeCreativeType(req.body.creativeType, ad.creativeType);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'headline')) {
      ad.headline = sanitizeString(req.body.headline);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'body')) {
      ad.body = sanitizeString(req.body.body);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'ctaLabel')) {
      ad.ctaLabel = sanitizeString(req.body.ctaLabel) || ad.ctaLabel;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'provinces')) {
      const requested = sanitizeProvinces(req.body.provinces);
      const allowed = await filterAllowedProvinceNames(requested);
      if (requested.length !== allowed.length) {
        return res.status(400).json({ ok: false, message: 'برخی از استان‌های انتخاب‌شده معتبر نیستند' });
      }
      ad.provinces = allowed;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'startDate')) {
      const start = sanitizeDate(req.body.startDate);
      if (!start) {
        return res.status(400).json({ ok: false, message: 'تاریخ شروع نامعتبر است' });
      }
      ad.startDate = start;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'endDate')) {
      const end = sanitizeDate(req.body.endDate);
      if (!end) {
        return res.status(400).json({ ok: false, message: 'تاریخ پایان نامعتبر است' });
      }
      ad.endDate = end;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'priority')) {
      ad.priority = sanitizeNumber(req.body.priority, { fallback: ad.priority, min: 0, max: 100, round: true });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'rewardType')) {
      ad.rewardType = sanitizeRewardType(req.body.rewardType, ad.rewardType);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'rewardAmount')) {
      ad.rewardAmount = sanitizeNumber(req.body.rewardAmount, { fallback: ad.rewardAmount, min: 0, max: 1000, round: true });
    }

    if (ad.startDate && ad.endDate && ad.startDate.getTime() > ad.endDate.getTime()) {
      return res.status(400).json({ ok: false, message: 'تاریخ پایان باید بعد از تاریخ شروع باشد' });
    }

    await ad.save();
    res.json({ ok: true, data: mapAdDocument(ad) });
  } catch (error) {
    next(error);
  }
};
