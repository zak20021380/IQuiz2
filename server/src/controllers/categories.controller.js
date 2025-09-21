const mongoose = require('mongoose');
const Category = require('../models/Category');
const Question = require('../models/Question');

const ALLOWED_STATUS = new Set(['active', 'pending', 'disabled']);
const ALLOWED_COLORS = new Set(['blue', 'green', 'orange', 'purple', 'yellow', 'pink', 'red', 'teal', 'indigo']);
const ALLOWED_PROVIDERS = new Set(['manual', 'opentdb', 'the-trivia-api', 'jservice']);

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

function sanitizeStatus(value, fallback = 'active') {
  const normalized = sanitizeString(value).toLowerCase();
  return ALLOWED_STATUS.has(normalized) ? normalized : fallback;
}

function sanitizeColor(value, fallback = 'blue') {
  const normalized = sanitizeString(value).toLowerCase();
  return ALLOWED_COLORS.has(normalized) ? normalized : fallback;
}

function sanitizeProvider(value, fallback = 'manual') {
  const normalized = sanitizeString(value).toLowerCase();
  return ALLOWED_PROVIDERS.has(normalized) ? normalized : fallback;
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
    const icon = sanitizeString(req.body.icon) || 'fa-globe';
    const color = sanitizeColor(req.body.color);
    const status = sanitizeStatus(req.body.status);
    const provider = sanitizeProvider(req.body.provider);
    const providerCategoryId = provider === 'manual'
      ? null
      : (sanitizeString(req.body.providerCategoryId) || null);
    const aliases = sanitizeAliases(req.body.aliases, [name, displayName]);

    const category = await Category.create({
      name,
      displayName,
      description,
      icon,
      color,
      status,
      provider,
      providerCategoryId,
      aliases
    });
    res.status(201).json({ ok: true, data: category });
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
      Category.find(where).sort({ createdAt: -1 }).skip(skip).limit(limitNumber).lean(),
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
    const items = itemsRaw.map((category) => {
      const stat = statsMap.get(String(category._id)) || null;
      const totalQuestions = stat?.total || 0;
      const activeQuestions = stat?.active || 0;
      const inactiveQuestions = Math.max(totalQuestions - activeQuestions, 0);
      return {
        ...category,
        questionCount: totalQuestions,
        activeQuestionCount: activeQuestions,
        inactiveQuestionCount: inactiveQuestions
      };
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

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const name = sanitizeString(req.body.name);
      if (!name) {
        return res.status(400).json({ ok: false, message: 'Category name cannot be empty' });
      }
      category.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'displayName')) {
      const displayName = sanitizeString(req.body.displayName);
      category.displayName = displayName || category.name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
      category.description = sanitizeString(req.body.description);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'icon')) {
      category.icon = sanitizeString(req.body.icon) || 'fa-globe';
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'color')) {
      category.color = sanitizeColor(req.body.color, category.color);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      category.status = sanitizeStatus(req.body.status, category.status);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'provider')) {
      const provider = sanitizeProvider(req.body.provider, category.provider);
      category.provider = provider;
      if (provider === 'manual') {
        category.providerCategoryId = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'providerCategoryId')) {
      const providerCategoryId = sanitizeString(req.body.providerCategoryId);
      category.providerCategoryId = providerCategoryId || category.providerCategoryId || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'aliases')) {
      category.aliases = sanitizeAliases(req.body.aliases, [category.name, category.displayName]);
    } else {
      category.aliases = sanitizeAliases(category.aliases, [category.name, category.displayName]);
    }

    await category.save();
    res.json({ ok: true, data: category.toObject() });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ ok:true });
  } catch (e) { next(e); }
};
