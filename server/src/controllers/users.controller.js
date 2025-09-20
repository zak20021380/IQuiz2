const User = require('../models/User');

exports.create = async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ ok:true, data:{ id:user._id, username:user.username, email:user.email } });
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const pageRaw = Number.parseInt(req.query.page, 10);
    const limitRaw = Number.parseInt(req.query.limit, 10);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const province = typeof req.query.province === 'string' ? req.query.province.trim() : '';
    const sortKey = req.query.sort === 'oldest' ? 'oldest' : 'newest';

    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const skip = (page - 1) * limit;

    const where = {};
    if (q) {
      where.$or = [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;
    if (province) where.province = province;

    const sort = sortKey === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

    const [items, total] = await Promise.all([
      User.find(where).sort(sort).skip(skip).limit(limit),
      User.countDocuments(where)
    ]);
    res.json({ ok: true, data: items, meta: { total, page, limit } });
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
