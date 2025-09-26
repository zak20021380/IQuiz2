const router = require('express').Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const LIMIT_KEYS = ['matches', 'duels', 'lives', 'groupBattles', 'energy'];

function getStartOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

router.post('/reset', protect, async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const startOfToday = getStartOfToday();
    const set = {};

    for (const key of LIMIT_KEYS) {
      set[`limits.${key}.used`] = 0;
      set[`limits.${key}.lastReset`] = new Date(startOfToday);
      set[`limits.${key}.lastRecovery`] = new Date(startOfToday);
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: set },
      { new: true, runValidators: false }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
