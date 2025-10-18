const duelEngine = require('../services/duelEngine');

function badRequest(message) {
  const error = new Error(message || 'bad_request');
  error.statusCode = 400;
  return error;
}

function extractUser(req) {
  const { userId, userName, avatar, score } = req.body || {};
  const authUser = req.user || {};
  return {
    id: userId || authUser.id || authUser._id || req.query.userId,
    name: userName || authUser.name || req.query.userName,
    avatar: avatar || authUser.avatar,
    score
  };
}

exports.overview = async (req, res, next) => {
  try {
    const overview = await duelEngine.buildOverview({
      id: req.query.userId,
      name: req.query.userName,
      avatar: req.query.avatar
    });
    res.json({ ok: true, data: overview });
  } catch (error) {
    next(error);
  }
};

exports.matchmaking = async (req, res, next) => {
  try {
    const payload = { ...req.body, user: extractUser(req) };
    const result = await duelEngine.createMatchmakingDuel(payload);
    res.status(201).json({ ok: true, data: result, meta: { overview: result.overview } });
  } catch (error) {
    next(error);
  }
};

exports.sendInvite = async (req, res, next) => {
  try {
    const payload = { ...req.body, from: extractUser(req) };
    const result = await duelEngine.createInvite(payload);
    res.status(201).json({ ok: true, data: result.invite, meta: { overview: result.overview } });
  } catch (error) {
    next(error);
  }
};

exports.acceptInvite = async (req, res, next) => {
  try {
    const { inviteId } = req.params;
    if (!inviteId) throw badRequest('inviteId_required');
    const payload = { ...req.body, user: extractUser(req) };
    const result = await duelEngine.acceptInvite(inviteId, payload);
    res.json({ ok: true, data: result, meta: { overview: result.overview } });
  } catch (error) {
    next(error);
  }
};

exports.declineInvite = async (req, res, next) => {
  try {
    const { inviteId } = req.params;
    if (!inviteId) throw badRequest('inviteId_required');
    const result = await duelEngine.declineInvite(inviteId, extractUser(req));
    res.json({ ok: true, data: { inviteId }, meta: { overview: result.overview } });
  } catch (error) {
    next(error);
  }
};

exports.assignCategory = async (req, res, next) => {
  try {
    const { duelId, roundIndex } = req.params;
    if (!duelId) throw badRequest('duelId_required');
    const index = Number.parseInt(roundIndex, 10);
    if (!Number.isInteger(index) || index < 0) throw badRequest('roundIndex_invalid');
    const payload = { ...req.body, user: extractUser(req) };
    const result = await duelEngine.assignRoundCategory(duelId, index, payload);
    res.json({ ok: true, data: result, meta: { overview: result.overview } });
  } catch (error) {
    next(error);
  }
};

exports.submitRound = async (req, res, next) => {
  try {
    const { duelId, roundIndex } = req.params;
    if (!duelId) throw badRequest('duelId_required');
    const index = Number.parseInt(roundIndex, 10);
    if (!Number.isInteger(index) || index < 0) throw badRequest('roundIndex_invalid');
    const payload = { ...req.body, user: extractUser(req) };
    const result = await duelEngine.submitRoundResult(duelId, index, payload);
    res.json({ ok: true, data: result, meta: { overview: result.overview } });
  } catch (error) {
    next(error);
  }
};
