const router = require('express').Router();

const { protect, adminOnly } = require('../middleware/auth');
const { importTrivia } = require('../services/triviaImporter');
const {
  fetchOpenTdbCategories,
  listTriviaProviders,
  normalizeProviderId
} = require('../services/triviaProviders');

router.get('/providers', protect, adminOnly, (req, res) => {
  const providers = listTriviaProviders();
  res.json({ ok: true, data: providers });
});

router.get('/providers/:providerId/categories', protect, adminOnly, async (req, res, next) => {
  try {
    const providerId = normalizeProviderId(req.params.providerId);
    if (providerId !== 'opentdb') {
      return res.status(404).json({ ok: false, message: 'دسته‌بندی برای این منبع در دسترس نیست' });
    }
    const categories = await fetchOpenTdbCategories();
    res.json({ ok: true, data: categories });
  } catch (err) {
    next(err);
  }
});

router.post('/import', protect, adminOnly, async (req, res, next) => {
  try {
    const result = await importTrivia(req.body || {});
    res.json({ ok: true, ...result });
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ ok: false, message: err.message });
    }
    next(err);
  }
});

module.exports = router;
