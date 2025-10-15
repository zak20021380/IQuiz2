const leaderboardService = require('../services/leaderboard');

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
