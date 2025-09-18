const Question = require('../models/Question');
const Category = require('../models/Category');

exports.create = async (req, res, next) => {
  try {
    const { text, options, correctIdx, difficulty, categoryId } = req.body;

    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ ok:false, message:'options must be array of 4 strings' });
    }
    const category = await Category.findById(categoryId);
    if (!category) return res.status(404).json({ ok:false, message:'Category not found' });

    const q = await Question.create({
      text,
      options,
      correctIdx,
      difficulty: difficulty || 'easy',
      category: categoryId,
      categoryName: category.name,
      source: 'manual'
    });
    res.status(201).json({ ok:true, data:q });
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
    const updated = await Question.findByIdAndUpdate(req.params.id, req.body, { new:true });
    res.json({ ok:true, data:updated });
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
