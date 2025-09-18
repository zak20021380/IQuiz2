const router = require('express').Router();

const { protect, adminOnly } = require('../middleware/auth');
const { importTrivia } = require('../services/triviaImporter');
const { fetchOpenTdbCategories } = require('../services/triviaProviders');

router.get('/providers/opentdb/categories', protect, adminOnly, async (req, res, next) => {
  try {
    const categories = await fetchOpenTdbCategories();
    res.json({ ok: true, data: categories });
  } catch (err) {
    next(err);
  }
});

router.post('/import', protect, adminOnly, async (req, res, next) => {
  try {
    const result = await importTrivia();
    res.json({ ok: true, inserted: result.inserted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
