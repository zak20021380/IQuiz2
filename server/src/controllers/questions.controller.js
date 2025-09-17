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
      text, options, correctIdx,
      difficulty: difficulty || 'easy',
      category: categoryId
    });
    res.status(201).json({ ok:true, data:q });
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const { page=1, limit=20, q='', category, difficulty } = req.query;
    const where = {};
    if (q) where.text = { $regex: q, $options: 'i' };
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;

    const [items, total] = await Promise.all([
      Question.find(where).populate('category','name').sort({ createdAt:-1 }).skip((page-1)*limit).limit(Number(limit)),
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
