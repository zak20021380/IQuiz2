const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwt: jwtConfig } = require('../config/env');

const extractToken = (req) => {
  if (req?.cookies?.admin_jwt) return req.cookies.admin_jwt;
  const header = req.get('authorization') || req.get('Authorization') || '';
  if (!header || typeof header !== 'string') return null;
  const match = header.trim().match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
};

exports.requireAdmin = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtConfig.secret);
    } catch (error) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    Object.assign(user, { isAdmin });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
