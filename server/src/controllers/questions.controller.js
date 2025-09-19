const Question = require('../models/Question');
const Category = require('../models/Category');

exports.create = async (req, res, next) => {
  try {
    const { text, options, correctIdx, difficulty, categoryId, active, lang } = req.body;

    const trimmedText = typeof text === 'string' ? text.trim() : '';
    if (!trimmedText) {
      return res.status(400).json({ ok: false, message: 'Question text is required' });
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ ok: false, message: 'options must be array of 4 strings' });
    }

    const normalizedOptions = options.map((choice) => String(choice ?? '').trim());
    if (normalizedOptions.some((choice) => choice.length === 0)) {
      return res.status(400).json({ ok: false, message: 'All options must be non-empty strings' });
    }

    const idx = Number(correctIdx);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
      return res.status(400).json({ ok: false, message: 'correctIdx must be between 0 and 3' });
    }

    if (!categoryId) {
      return res.status(400).json({ ok: false, message: 'categoryId is required' });
    }

    let category;
    try {
      category = await Category.findById(categoryId);
    } catch (error) {
      if (error?.name === 'CastError') {
        return res.status(400).json({ ok: false, message: 'Invalid categoryId' });
      }
      throw error;
    }
    if (!category) {
      return res.status(404).json({ ok: false, message: 'Category not found' });
    }

    const difficultyKey = typeof difficulty === 'string' ? difficulty.toLowerCase() : 'easy';
    const allowedDifficulties = ['easy', 'medium', 'hard'];
    const safeDifficulty = allowedDifficulties.includes(difficultyKey) ? difficultyKey : 'easy';
    const isActive = typeof active === 'boolean' ? active : true;
    const detectedLang = typeof lang === 'string' && lang.trim() ? lang.trim() : 'fa';

    const q = await Question.create({
      text: trimmedText,
      options: normalizedOptions,
      choices: normalizedOptions,
      correctIdx: idx,
      correctIndex: idx,
      difficulty: safeDifficulty,
      category: category._id,
      categoryName: category.name,
      active: isActive,
      lang: detectedLang,
      source: 'manual'
    });
    res.status(201).json({ ok: true, data: q });
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const { page=1, limit=20, q='', category, difficulty, sort='newest', source } = req.query;
    const where = {};
    if (q) where.text = { $regex: q, $options: 'i' };
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (source && ['manual', 'opentdb', 'the-trivia-api'].includes(source)) where.source = source;

    const normalizedSort = typeof sort === 'string' ? sort.toLowerCase() : 'newest';
    const sortOption = normalizedSort === 'oldest'
      ? { createdAt: 1 }
      : { createdAt: -1 };

    const [items, total] = await Promise.all([
      Question.find(where)
        .populate('category','name')
        .sort(sortOption)
        .skip((page-1)*limit)
        .limit(Number(limit)),
      Question.countDocuments(where)
    ]);
    res.json({ ok:true, data:items, meta:{ total, page:Number(page), limit:Number(limit) } });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { text, options, correctIdx, difficulty, active } = req.body;
    const updates = {};

    if (typeof text === 'string' && text.trim()) {
      updates.text = text.trim();
    }

    if (Array.isArray(options)) {
      if (options.length !== 4) {
        return res.status(400).json({ ok: false, message: 'options must be array of 4 strings' });
      }
      const normalizedOptions = options.map((choice) => String(choice ?? '').trim());
      if (normalizedOptions.some((choice) => choice.length === 0)) {
        return res.status(400).json({ ok: false, message: 'All options must be non-empty strings' });
      }
      updates.options = normalizedOptions;
      updates.choices = normalizedOptions;
    }

    if (correctIdx !== undefined) {
      const idx = Number(correctIdx);
      if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
        return res.status(400).json({ ok: false, message: 'correctIdx must be between 0 and 3' });
      }
      updates.correctIdx = idx;
      updates.correctIndex = idx;
    }

    if (typeof difficulty === 'string') {
      const difficultyKey = difficulty.toLowerCase();
      const allowedDifficulties = ['easy', 'medium', 'hard'];
      if (!allowedDifficulties.includes(difficultyKey)) {
        return res.status(400).json({ ok: false, message: 'Invalid difficulty' });
      }
      updates.difficulty = difficultyKey;
    }

    if (typeof active === 'boolean') {
      updates.active = active;
    }

    let categoryCandidate = req.body.categoryId;
    if (!categoryCandidate && typeof req.body.category === 'string') {
      categoryCandidate = req.body.category;
    }
    if (!categoryCandidate && req.body.category && typeof req.body.category._id === 'string') {
      categoryCandidate = req.body.category._id;
    }

    if (categoryCandidate) {
      let category;
      try {
        category = await Category.findById(categoryCandidate);
      } catch (error) {
        if (error?.name === 'CastError') {
          return res.status(400).json({ ok: false, message: 'Invalid categoryId' });
        }
        throw error;
      }
      if (!category) {
        return res.status(404).json({ ok: false, message: 'Category not found' });
      }
      updates.category = category._id;
      updates.categoryName = category.name;
    }

    const updated = await Question.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) {
      return res.status(404).json({ ok: false, message: 'Question not found' });
    }
    res.json({ ok: true, data: updated });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ ok:true });
  } catch (e) { next(e); }
};

exports.statsSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const [total, today, yesterday] = await Promise.all([
      Question.countDocuments(),
      Question.countDocuments({ createdAt: { $gte: startOfToday, $lt: startOfTomorrow } }),
      Question.countDocuments({ createdAt: { $gte: startOfYesterday, $lt: startOfToday } })
    ]);

    res.json({ ok: true, data: { total, today, yesterday } });
  } catch (e) {
    next(e);
  }
};
