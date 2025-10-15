const mongoose = require('mongoose');
const Category = require('../models/Category');
const Question = require('../models/Question');
const { resolveCategory } = require('../config/categories');

const ALLOWED_STATUS = new Set(['active', 'pending', 'disabled']);
const DEFAULT_ICON = 'fa-layer-group';

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

function sanitizeSlug(value, fallback = '') {
  const normalized = sanitizeString(value)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (normalized) return normalized;
  const fallbackNormalized = sanitizeString(fallback)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return fallbackNormalized || 'category';
}

function sanitizeStatus(value, fallback = 'active') {
  const normalized = sanitizeString(value).toLowerCase();
  return ALLOWED_STATUS.has(normalized) ? normalized : fallback;
}

function sanitizeAliases(values, fallbacks = []) {
  const list = Array.isArray(values) ? values : [];
  const merged = [...list, ...fallbacks];
  const normalized = merged
    .map((item) => sanitizeString(item))
    .filter((item) => item.length > 0);
  return Array.from(new Set(normalized));
}

function sanitizeIcon(value) {
  const normalized = sanitizeString(value);
  return normalized || DEFAULT_ICON;
}

function sanitizeColor(value, fallback = 'blue') {
  const normalized = sanitizeString(value).toLowerCase();
  return normalized || fallback;
}

function sanitizeProvider(value, fallback = 'manual') {
  const normalized = sanitizeString(value);
  return normalized || fallback;
}

function sanitizeOrder(value, fallback = null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

exports.create = async (req, res, next) => {
  try {
    const name = sanitizeString(req.body.name);
    if (!name) {
      return res.status(400).json({ ok: false, message: 'Category name is required' });
    }

    const displayName = sanitizeString(req.body.displayName) || name;
    const description = sanitizeString(req.body.description);
    const status = sanitizeStatus(req.body.status);
    const provider = sanitizeProvider(req.body.provider, 'manual');
    const slugCandidate = sanitizeSlug(req.body.slug, displayName || name);
    const providerCategoryIdCandidate = sanitizeString(req.body.providerCategoryId) || slugCandidate;
    const iconCandidate = sanitizeIcon(req.body.icon);
    const colorCandidate = sanitizeColor(req.body.color);
    const orderCandidate = sanitizeOrder(req.body.order, null);
    const aliasCandidate = sanitizeAliases(req.body.aliases, [
      name,
      displayName,
      slugCandidate,
      providerCategoryIdCandidate
    ]);

    const canonical = resolveCategory({
      slug: slugCandidate,
      name,
      displayName,
      provider,
      providerCategoryId: providerCategoryIdCandidate,
      description,
      icon: iconCandidate,
      color: colorCandidate,
      aliases: aliasCandidate,
      order: orderCandidate
    });

    const aliases = sanitizeAliases(aliasCandidate, canonical?.aliases || []);
    const preferredOrder = sanitizeOrder(orderCandidate, canonical?.order ?? null);
    let order = preferredOrder;
    if (!Number.isFinite(order)) {
      const highest = await Category.findOne().sort({ order: -1 }).select('order').lean();
      const highestOrder = Number(highest?.order);
      order = Number.isFinite(highestOrder) ? highestOrder + 1 : 1;
    }

    const payload = {
      name: canonical?.name || name,
      displayName: canonical?.displayName || displayName || name,
      description: description || canonical?.description || '',
      icon: iconCandidate || canonical?.icon || DEFAULT_ICON,
      color: canonical?.color || colorCandidate || 'blue',
      status,
      provider: canonical?.provider || provider || 'manual',
      providerCategoryId: canonical?.providerCategoryId || providerCategoryIdCandidate || slugCandidate,
      aliases,
      slug: canonical?.slug || slugCandidate,
      order
    };

    const category = await Category.create(payload);
    res.status(201).json({ ok: true, data: category.toObject() });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: 'Category with the same name or slug already exists' });
    }
    next(e);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, q = '' } = req.query;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(Math.min(parseInt(limit, 10) || 20, 200), 1);
    const where = q ? { name: { $regex: q, $options: 'i' } } : {};
    const skip = (pageNumber - 1) * limitNumber;

    const [itemsRaw, total] = await Promise.all([
      Category.find(where)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Category.countDocuments(where)
    ]);

    const categoryIds = itemsRaw
      .map((item) => {
        if (!item?._id) return null;
        if (item._id instanceof mongoose.Types.ObjectId) return item._id;
        if (mongoose.Types.ObjectId.isValid(item._id)) {
          return new mongoose.Types.ObjectId(item._id);
        }
        return null;
      })
      .filter(Boolean);

    let questionStats = [];
    if (categoryIds.length > 0) {
      const uniqueCategoryIds = Array.from(new Set(categoryIds.map((id) => id.toString())))
        .map((id) => new mongoose.Types.ObjectId(id));

      questionStats = await Question.aggregate([
        { $match: { category: { $in: uniqueCategoryIds } } },
        {
          $group: {
            _id: '$category',
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$active', 1, 0] } }
          }
        }
      ]);
    }

    const statsMap = new Map(questionStats.map((stat) => [String(stat._id), {
      total: Number(stat?.total) || 0,
      active: Number(stat?.active) || 0
    }]));
    const items = itemsRaw
      .map((category) => {
        const canonical = resolveCategory(category) || null;

        const stat = statsMap.get(String(category._id)) || null;
        const totalQuestions = stat?.total || 0;
        const activeQuestions = stat?.active || 0;
        const inactiveQuestions = Math.max(totalQuestions - activeQuestions, 0);

        const name = canonical?.name || sanitizeString(category.name) || 'Category';
        const displayName = canonical?.displayName || sanitizeString(category.displayName) || name;
        const slug = canonical?.slug || sanitizeSlug(category.slug, displayName || name);
        const provider = canonical?.provider || sanitizeProvider(category.provider, 'manual');
        const providerCategoryId = canonical?.providerCategoryId
          || sanitizeString(category.providerCategoryId)
          || slug;
        const icon = sanitizeIcon(category.icon || canonical?.icon);
        const color = sanitizeColor(category.color || canonical?.color || 'blue');
        const description = sanitizeString(category.description) || canonical?.description || '';
        const aliases = sanitizeAliases(category.aliases, canonical?.aliases || [name, displayName]);
        const order = Number.isFinite(Number(category.order))
          ? Number(category.order)
          : sanitizeOrder(canonical?.order, 0) || 0;

        return {
          ...category,
          name,
          displayName,
          title: displayName,
          slug,
          provider,
          providerCategoryId,
          icon,
          color,
          description,
          aliases,
          order,
          questionCount: totalQuestions,
          activeQuestionCount: activeQuestions,
          inactiveQuestionCount: inactiveQuestions
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        const aLabel = a.displayName || a.name || '';
        const bLabel = b.displayName || b.name || '';
        return aLabel.localeCompare(bLabel, 'fa');
      });

    res.json({
      ok: true,
      data: items,
      meta: { total, page: pageNumber, limit: limitNumber }
    });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ ok: false, message: 'Category not found' });
    }

    const currentName = category.name || '';
    const currentDisplayName = category.displayName || currentName;

    const nameCandidate = Object.prototype.hasOwnProperty.call(req.body, 'name')
      ? (sanitizeString(req.body.name) || currentName)
      : currentName;
    const displayNameCandidate = Object.prototype.hasOwnProperty.call(req.body, 'displayName')
      ? (sanitizeString(req.body.displayName) || nameCandidate)
      : currentDisplayName;
    const slugCandidate = Object.prototype.hasOwnProperty.call(req.body, 'slug')
      ? sanitizeSlug(req.body.slug, displayNameCandidate || nameCandidate)
      : category.slug;
    const providerCandidate = Object.prototype.hasOwnProperty.call(req.body, 'provider')
      ? sanitizeProvider(req.body.provider, category.provider)
      : sanitizeProvider(category.provider, 'manual');
    const providerCategoryIdCandidate = Object.prototype.hasOwnProperty.call(req.body, 'providerCategoryId')
      ? (sanitizeString(req.body.providerCategoryId) || category.providerCategoryId || slugCandidate)
      : (category.providerCategoryId || slugCandidate);
    const aliasCandidate = Object.prototype.hasOwnProperty.call(req.body, 'aliases')
      ? sanitizeAliases(req.body.aliases, [nameCandidate, displayNameCandidate])
      : sanitizeAliases(category.aliases, [nameCandidate, displayNameCandidate]);

    const descriptionCandidate = Object.prototype.hasOwnProperty.call(req.body, 'description')
      ? sanitizeString(req.body.description)
      : category.description;
    const statusCandidate = Object.prototype.hasOwnProperty.call(req.body, 'status')
      ? sanitizeStatus(req.body.status, category.status)
      : category.status;
    const iconCandidate = Object.prototype.hasOwnProperty.call(req.body, 'icon')
      ? sanitizeIcon(req.body.icon)
      : category.icon;
    const colorCandidate = Object.prototype.hasOwnProperty.call(req.body, 'color')
      ? sanitizeColor(req.body.color)
      : category.color;
    const orderCandidate = Object.prototype.hasOwnProperty.call(req.body, 'order')
      ? sanitizeOrder(req.body.order, category.order)
      : category.order;

    const canonical = resolveCategory({
      slug: slugCandidate,
      name: nameCandidate,
      displayName: displayNameCandidate,
      provider: providerCandidate,
      providerCategoryId: providerCategoryIdCandidate,
      description: descriptionCandidate,
      icon: iconCandidate,
      color: colorCandidate,
      aliases: aliasCandidate,
      order: orderCandidate
    });

    category.name = canonical?.name || nameCandidate;
    category.displayName = canonical?.displayName || displayNameCandidate;
    category.slug = canonical?.slug || slugCandidate;
    category.provider = canonical?.provider || providerCandidate || 'manual';
    category.providerCategoryId = canonical?.providerCategoryId || providerCategoryIdCandidate || category.providerCategoryId;
    category.icon = iconCandidate || canonical?.icon || DEFAULT_ICON;
    category.color = canonical?.color || colorCandidate || 'blue';
    category.order = Number.isFinite(Number(orderCandidate))
      ? Number(orderCandidate)
      : sanitizeOrder(canonical?.order, category.order);
    category.description = descriptionCandidate || canonical?.description || '';
    category.status = statusCandidate;
    category.aliases = sanitizeAliases(aliasCandidate, canonical?.aliases || []);

    await category.save();
    res.json({ ok: true, data: category.toObject() });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ ok: false, message: 'Category not found' });
    }

    const usageCount = await Question.countDocuments({ category: category._id });
    if (usageCount > 0) {
      return res.status(400).json({ ok: false, message: 'Category is in use and cannot be removed' });
    }

    await category.deleteOne();
    res.json({ ok: true, message: 'Category removed' });
  } catch (e) { next(e); }
};
