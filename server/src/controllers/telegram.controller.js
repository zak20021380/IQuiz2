const jwt = require('jsonwebtoken');

const env = require('../config/env');
const logger = require('../config/logger');
const User = require('../models/User');
const { verifyTelegramInitData, normalizeTelegramProfile } = require('../services/telegramAuth');

const { jwt: jwtConfig, telegram: telegramConfig } = env;

function signJwt(id) {
  return jwt.sign({ id }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
}

function deriveUsername(profile) {
  const base = profile.telegramUsername || profile.name || `tg_${profile.telegramId}`;
  if (!base) {
    return `tg_${Date.now()}`;
  }

  const sanitized = base
    .toString()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w.-]/g, '')
    .replace(/_{2,}/g, '_');

  return sanitized || `tg_${profile.telegramId || Date.now()}`;
}

exports.createSession = async (req, res, next) => {
  try {
    if (!telegramConfig.botToken) {
      return res.status(503).json({ ok: false, message: 'Telegram authentication is not configured' });
    }

    const initDataInput = typeof req.body?.initData === 'string' ? req.body.initData : req.body;
    const verification = verifyTelegramInitData(initDataInput, telegramConfig.botToken);

    if (!verification.ok) {
      logger.warn(`[telegram-auth] Verification failed: ${verification.reason || 'unknown reason'}`);
      return res.status(401).json({ ok: false, message: 'Invalid init data signature' });
    }

    const normalized = normalizeTelegramProfile(initDataInput);
    const profile = normalized.profile;

    if (!profile.telegramId) {
      return res.status(400).json({ ok: false, message: 'Missing Telegram user identifier' });
    }

    let user = await User.findOne({ telegramId: profile.telegramId });
    let isNew = false;

    if (!user) {
      isNew = true;
      const username = deriveUsername(profile);
      user = new User({
        username,
        name: profile.name || username,
        telegramId: profile.telegramId,
        telegramUsername: profile.telegramUsername || '',
        avatar: profile.avatar || ''
      });
    } else {
      if (profile.name) {
        user.name = profile.name;
      }
      if (profile.telegramUsername) {
        user.telegramUsername = profile.telegramUsername;
      }
      if (profile.avatar) {
        user.avatar = profile.avatar;
      }
    }

    if (normalized.authDate instanceof Date && Number.isFinite(normalized.authDate.getTime())) {
      user.lastTelegramAuthAt = normalized.authDate;
    }

    await user.save();

    const token = signJwt(user._id);
    res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        telegramId: user.telegramId,
        telegramUsername: user.telegramUsername,
        avatar: user.avatar,
        role: user.role
      },
      isNew
    });
  } catch (error) {
    next(error);
  }
};
