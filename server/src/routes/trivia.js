const router = require('express').Router();
const { fetchAndStoreTriviaBatch } = require('../services/triviaImporter');

router.post('/import', async (req, res, next) => {
  try {
    const { status, body } = await fetchAndStoreTriviaBatch();
    res.status(status).json(body);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
