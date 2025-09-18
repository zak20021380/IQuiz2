const router = require('express').Router();

const { protect, adminOnly } = require('../middleware/auth');
const { importTrivia } = require('../services/triviaImporter');

router.post('/import', protect, adminOnly, async (req, res, next) => {
  try {
    const result = await importTrivia();
    res.json({ ok: true, inserted: result.inserted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
