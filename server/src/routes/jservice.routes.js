'use strict';

const router = require('express').Router();

const { getRandomClues, clampCount, getCacheSnapshot } = require('../services/jservice');

router.get('/random', async (req, res, next) => {
  const count = clampCount(req.query.count);
  try {
    const clues = await getRandomClues(count);
    res.json({
      ok: true,
      data: clues,
      meta: {
        requested: count,
        delivered: clues.length,
        cacheSize: getCacheSnapshot().size,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 502;
    }
    next(error);
  }
});

module.exports = router;
