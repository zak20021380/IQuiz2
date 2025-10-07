const router = require('express').Router();
const { requireAdmin } = require('../../middleware/adminAuth');
const { getRevenueOverview } = require('../../services/adminShopAnalytics');

router.use(requireAdmin);

router.get('/revenue', async (req, res, next) => {
  try {
    const data = await getRevenueOverview();
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
