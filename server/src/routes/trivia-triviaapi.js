const router = require('express').Router();

const { protect, adminOnly } = require('../middleware/auth');
const { importTrivia } = require('../services/triviaImporter');

router.post('/trivia/import/triviaapi', protect, adminOnly, async (req, res, next) => {
  try {
    const payload = { ...(req.body || {}), provider: 'the-trivia-api' };
    const result = await importTrivia(payload);
    res.json({ ok: true, ...result });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ ok: false, message: error.message });
    }
    return next(error);
  }
});

module.exports = router;
