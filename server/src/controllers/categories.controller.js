const mongoose = require('mongoose');
const Category = require('../models/Category');
const Question = require('../models/Question');
const { resolveCategory } = require('../config/categories');

const ALLOWED_STATUS = new Set(['active', 'pending', 'disabled']);

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

exports.create = async (req, res, next) => {
  try {
    const name = sanitizeString(req.body.name);
    if (!name) {
      return res.status(400).json({ ok: false, message: 'Category name is required' });
    }

    const displayName = sanitizeString(req.body.displayName) || name;
    const description = sanitizeString(req.body.description);
    const status = sanitizeStatus(req.body.status);
    const slugCandidate = sanitizeSlug(req.body.slug, displayName || name);
    const providerCategoryIdCandidate = sanitizeString(req.body.providerCategoryId) || slugCandidate;
    const aliasCandidate = sanitizeAliases(req.body.aliases, [name, displayName]);

    const canonical = resolveCategory({
      slug: slugCandidate,
      name,
      displayName,
      providerCategoryId: providerCategoryIdCandidate,
      aliases: aliasCandidate
    });

    if (!canonical) {
      return res.status(400).json({ ok: false, message: 'Only predefined categories are supported' });
    }

    const aliases = sanitizeAliases(aliasCandidate, canonical.aliases);
    const payload = {
      name: canonical.name,
      displayName: canonical.displayName,
      description: description || canonical.description || '',
      icon: canonical.icon || 'fa-globe',
      color: canonical.color || 'blue',
      status,
      provider: canonical.provider || 'ai-gen',
      providerCategoryId: canonical.providerCategoryId || canonical.slug,
      aliases,
      slug: canonical.slug,
      order: canonical.order
    };

    const category = await Category.findOneAndUpdate(
      { slug: canonical.slug },
      { $set: payload },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.status(201).json({ ok: true, data: category.toObject() });
  } catch (e) { next(e); }
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
        const canonical = resolveCategory(category);
        if (!canonical) return null;

        const stat = statsMap.get(String(category._id)) || null;
        const totalQuestions = stat?.total || 0;
        const activeQuestions = stat?.active || 0;
        const inactiveQuestions = Math.max(totalQuestions - activeQuestions, 0);
        const aliases = sanitizeAliases(category.aliases, canonical.aliases);

        return {
          ...category,
          name: canonical.name,
          displayName: canonical.displayName,
          title: canonical.displayName || canonical.name,
          slug: canonical.slug,
          provider: canonical.provider || category.provider || 'ai-gen',
          providerCategoryId: canonical.providerCategoryId || canonical.slug,
          icon: canonical.icon || category.icon,
          color: canonical.color || category.color,
          description: category.description || canonical.description || '',
          aliases,
          order: canonical.order,
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
    const providerCategoryIdCandidate = Object.prototype.hasOwnProperty.call(req.body, 'providerCategoryId')
      ? (sanitizeString(req.body.providerCategoryId) || category.providerCategoryId || slugCandidate)
      : (category.providerCategoryId || slugCandidate);
    const aliasCandidate = Object.prototype.hasOwnProperty.call(req.body, 'aliases')
      ? sanitizeAliases(req.body.aliases, [nameCandidate, displayNameCandidate])
      : sanitizeAliases(category.aliases, [nameCandidate, displayNameCandidate]);

    const canonical = resolveCategory({
      slug: slugCandidate,
      name: nameCandidate,
      displayName: displayNameCandidate,
      providerCategoryId: providerCategoryIdCandidate,
      aliases: aliasCandidate
    });

    if (!canonical) {
      return res.status(400).json({ ok: false, message: 'Only predefined categories are supported' });
    }

    const descriptionCandidate = Object.prototype.hasOwnProperty.call(req.body, 'description')
      ? sanitizeString(req.body.description)
      : category.description;
    const statusCandidate = Object.prototype.hasOwnProperty.call(req.body, 'status')
      ? sanitizeStatus(req.body.status, category.status)
      : category.status;

    category.name = canonical.name;
    category.displayName = canonical.displayName;
    category.slug = canonical.slug;
    category.provider = canonical.provider || 'ai-gen';
    category.providerCategoryId = canonical.providerCategoryId || canonical.slug;
    category.icon = canonical.icon || 'fa-globe';
    category.color = canonical.color || 'blue';
    category.order = canonical.order;
    category.description = descriptionCandidate || canonical.description || '';
    category.status = statusCandidate;
    category.aliases = sanitizeAliases(aliasCandidate, canonical.aliases);

    await category.save();
    res.json({ ok: true, data: category.toObject() });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    res.status(405).json({ ok: false, message: 'Deleting categories is not allowed' });
  } catch (e) { next(e); }
};
