const Achievement = require('../models/Achievement');

exports.create = async (req, res, next) => {
  try { const a = await Achievement.create(req.body); res.status(201).json({ ok:true, data:a }); }
  catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const { page=1, limit=20, q='' } = req.query;
    const where = q ? { name: { $regex: q, $options: 'i' } } : {};
    const [items, total] = await Promise.all([
      Achievement.find(where).sort({ createdAt:-1 }).skip((page-1)*limit).limit(Number(limit)),
      Achievement.countDocuments(where)
    ]);
    res.json({ ok:true, data:items, meta:{ total, page:Number(page), limit:Number(limit) } });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try { const u = await Achievement.findByIdAndUpdate(req.params.id, req.body, { new:true }); res.json({ ok:true, data:u }); }
  catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try { await Achievement.findByIdAndDelete(req.params.id); res.json({ ok:true }); }
  catch (e) { next(e); }
};
