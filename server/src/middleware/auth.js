const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwt: jwtConfig } = require('../config/env');

exports.protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : null;
    if (!token) return res.status(401).json({ ok:false, message:'Unauthorized' });

    const decoded = jwt.verify(token, jwtConfig.secret);
    const user = await User.findById(decoded.id).select('+password');
    if (!user) return res.status(401).json({ ok:false, message:'User not found' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ ok:false, message:'Invalid token' });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ ok:false, message:'Forbidden' });
  next();
};

exports.optionalAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : null;
    if (!token) return next();
    const decoded = jwt.verify(token, jwtConfig.secret);
    if (!decoded?.id) return next();
    const user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
    }
  } catch (err) {
    // ignore invalid tokens for optional auth
  }
  next();
};
