const User = require('../models/User');

function extractUserId(req) {
  if (!req?.user) return null;
  return req.user._id || req.user.id || req.user.userId || null;
}

exports.getWalletBalance = async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId).select({ coins: 1, keys: 1 }).lean();
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const coinsValue = Number(user.coins);
    const keysValue = Number(user.keys);
    const coins = Number.isFinite(coinsValue) ? coinsValue : 0;
    const keys = Number.isFinite(keysValue) ? keysValue : 0;

    return res.json({ ok: true, data: { coins, keys } });
  } catch (error) {
    next(error);
  }
};
