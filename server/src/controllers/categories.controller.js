const Category = require('../models/Category');

exports.create = async (req, res, next) => {
  try {
    const cat = await Category.create(req.body);
    res.status(201).json({ ok:true, data:cat });
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const { page=1, limit=20, q='' } = req.query;
    const where = q ? { name: { $regex: q, $options: 'i' } } : {};
    const [items, total] = await Promise.all([
      Category.find(where).sort({ createdAt:-1 }).skip((page-1)*limit).limit(Number(limit)),
      Category.countDocuments(where)
    ]);
    res.json({ ok:true, data:items, meta:{ total, page:Number(page), limit:Number(limit) } });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new:true });
    res.json({ ok:true, data:updated });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ ok:true });
  } catch (e) { next(e); }
};
