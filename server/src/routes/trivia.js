const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { fetchAndStoreTriviaBatch, fetchOpenTdbCategories } = require('../services/triviaImporter');

router.use(protect, adminOnly);

router.get('/providers/opentdb/categories', async (req, res, next) => {
  try {
    const categories = await fetchOpenTdbCategories();
    res.json({ ok: true, data: categories });
  } catch (err) {
    next(err);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const { amount, categories, difficulties } = req.body || {};
    const { status, body } = await fetchAndStoreTriviaBatch({ amount, categories, difficulties });
    res.status(status).json(body);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
