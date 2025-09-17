const User = require('../models/User');

exports.create = async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ ok:true, data:{ id:user._id, username:user.username, email:user.email } });
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const { page=1, limit=20, q='', role, status } = req.query;
    const where = {};
    if (q) where.$or = [{ username: { $regex:q, $options:'i' } }, { email: { $regex:q, $options:'i' } }];
    if (role) where.role = role;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      User.find(where).sort({ createdAt:-1 }).skip((page-1)*limit).limit(Number(limit)),
      User.countDocuments(where)
    ]);
    res.json({ ok:true, data:items, meta:{ total, page:Number(page), limit:Number(limit) } });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new:true, runValidators:true });
    res.json({ ok:true, data:updated });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok:true });
  } catch (e) { next(e); }
};
