const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ ok:false, message: 'Email or password is wrong' });
    }
    if (user.role !== 'admin') return res.status(403).json({ ok:false, message:'Admins only' });
    const token = sign(user._id);
    res.json({ ok:true, token, user: { id:user._id, email:user.email, username:user.username } });
  } catch (e) { next(e); }
};
