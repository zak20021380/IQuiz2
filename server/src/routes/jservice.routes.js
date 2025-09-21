'use strict';

const router = require('express').Router();

const CluebaseService = require('../services/cluebase');

function handleUpstreamError(error, next) {
  if (!error.statusCode) {
    error.statusCode = 502;
  }
  next(error);
}

router.get('/random', async (req, res, next) => {
  try {
    const payload = await CluebaseService.random(req.query.count);
    res.json(payload);
  } catch (error) {
    handleUpstreamError(error, next);
  }
});

router.get('/clues', async (req, res, next) => {
  try {
    const payload = await CluebaseService.clues(req.query);
    res.json(payload);
  } catch (error) {
    handleUpstreamError(error, next);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    const payload = await CluebaseService.categories({
      count: req.query.count,
      offset: req.query.offset,
    });
    res.json(payload);
  } catch (error) {
    handleUpstreamError(error, next);
  }
});

module.exports = router;
