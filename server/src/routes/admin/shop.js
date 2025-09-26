const router = require('express').Router();
const { protect, adminOnly } = require('../../middleware/auth');
const { getRevenueOverview } = require('../../services/adminShopAnalytics');

router.use(protect, adminOnly);

router.get('/revenue', async (req, res, next) => {
  try {
    const data = await getRevenueOverview();
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
