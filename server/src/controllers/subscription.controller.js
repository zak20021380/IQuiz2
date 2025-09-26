const User = require('../models/User');

function extractUserId(req) {
  if (!req?.user) return null;
  return req.user._id || req.user.id || req.user.userId || null;
}

function normalizeExpiry(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

exports.getSubscriptionStatus = async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId).select({ subscription: 1 }).lean();
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const subscription = user.subscription || {};

    const response = {
      active: Boolean(subscription.active),
      plan: subscription.plan ?? null,
      tier: subscription.tier ?? null,
      expiry: normalizeExpiry(subscription.expiry),
      autoRenew: Boolean(subscription.autoRenew)
    };

    return res.json({ ok: true, data: response });
  } catch (error) {
    next(error);
  }
};
