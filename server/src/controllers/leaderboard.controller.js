const jwt = require('jsonwebtoken');

const leaderboardService = require('../services/leaderboard');
const User = require('../models/User');
const env = require('../config/env');

function normalizeGroupPayload(body) {
  if (!body) return undefined;
  if (Object.prototype.hasOwnProperty.call(body, 'group')) {
    const value = body.group;
    if (value == null) return null;
    return value;
  }
  const id = body.groupId ?? body.group_id;
  const name = body.groupName ?? body.group_name;
  if (id == null && name == null) return undefined;
  if (id == null && name) {
    return { id: name, name };
  }
  return { id, name };
}

const { jwt: jwtConfig } = env;

function signJwt(id) {
  return jwt.sign({ id }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
}

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGuestName(value) {
  const raw = sanitizeString(value);
  if (!raw) return '';
  return raw.slice(0, 80);
}

function normalizeProvince(value) {
  const raw = sanitizeString(value);
  if (!raw) return '';
  return raw.slice(0, 60);
}

async function generateGuestUsername(guestId, name) {
  const baseInput = sanitizeString(name) || sanitizeString(guestId) || 'guest';
  const normalizedBase = baseInput
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'guest';

  let base = normalizedBase.slice(0, 20) || 'guest';
  if (!/^[a-z]/.test(base)) {
    base = `g_${base}`.slice(0, 20);
  }

  let candidate = base;
  let suffix = 0;
  while (await User.exists({ username: candidate })) {
    suffix += 1;
    const suffixStr = suffix.toString();
    const maxBaseLength = Math.max(4, 24 - suffixStr.length);
    candidate = `${base.slice(0, maxBaseLength)}${suffixStr}`;
    if (suffix > 9999) {
      candidate = `${base.slice(0, 12)}${Date.now().toString(36)}`;
      break;
    }
  }

  return candidate;
}

exports.overview = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id || null;
    const data = await leaderboardService.getOverview({ userId });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
};

exports.recordProgress = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    const rawDelta = req.body?.scoreDelta ?? req.body?.delta ?? req.body?.score;
    const scoreDelta = Number(rawDelta);
    if (!Number.isFinite(scoreDelta)) {
      return res.status(400).json({ ok: false, message: 'scoreDelta must be a number' });
    }

    const province = req.body?.province;
    const group = normalizeGroupPayload(req.body);

    const data = await leaderboardService.applyScoreDelta({
      userId,
      scoreDelta,
      province,
      group,
    });

    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    const provinceProvided = Object.prototype.hasOwnProperty.call(req.body || {}, 'province');
    const group = normalizeGroupPayload(req.body);

    if (!provinceProvided && group === undefined) {
      return res.status(400).json({ ok: false, message: 'No profile fields provided' });
    }

    const province = provinceProvided ? req.body.province : undefined;

    const data = await leaderboardService.updateProfile({
      userId,
      province,
      group,
    });

    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
};

exports.registerGuest = async (req, res, next) => {
  try {
    const headerGuestId = sanitizeString(req.get('x-guest-id'));
    const bodyGuestId = sanitizeString(req.body?.guestId || req.body?.guest_id || req.body?.sessionId);
    const guestId = headerGuestId || bodyGuestId;

    if (!guestId) {
      return res.status(400).json({ ok: false, message: 'guestId is required' });
    }

    const name = normalizeGuestName(
      req.body?.name
        ?? req.body?.displayName
        ?? req.body?.fullName
        ?? req.body?.username
    );

    if (!name) {
      return res.status(400).json({ ok: false, message: 'name is required' });
    }

    const province = Object.prototype.hasOwnProperty.call(req.body || {}, 'province')
      ? normalizeProvince(req.body.province)
      : undefined;

    let user = await User.findOne({ guestId });
    let isNew = false;

    if (!user) {
      isNew = true;
      const username = await generateGuestUsername(guestId, name);
      user = new User({
        guestId,
        username,
        name,
        province: province || '',
        status: 'active',
        isActive: true,
      });
    } else {
      user.name = name;
      if (!user.username) {
        user.username = await generateGuestUsername(guestId, name);
      }
      if (province !== undefined) {
        user.province = province;
      }
    }

    await user.save();

    const token = signJwt(user._id);
    const leaderboard = await leaderboardService.getOverview({ userId: user._id });

    res.json({
      ok: true,
      token,
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          username: user.username,
          province: user.province || '',
          groupId: user.groupId || '',
          groupName: user.groupName || '',
          score: Number.isFinite(user.score) ? user.score : 0,
          coins: Number.isFinite(user.coins) ? user.coins : 0,
          avatar: user.avatar || '',
        },
        leaderboard,
        isNew,
      },
    });
  } catch (error) {
    next(error);
  }
};
