'use strict';

const router = require('express').Router();

const JService = require('../services/jservice');

function handleUpstreamError(error, next) {
  if (!error.statusCode) {
    error.statusCode = 502;
  }
  next(error);
}

router.get('/random', async (req, res, next) => {
  try {
    const payload = await JService.random(req.query.count);
    res.json(payload);
  } catch (error) {
    handleUpstreamError(error, next);
  }
});

router.get('/clues', async (req, res, next) => {
  try {
    const payload = await JService.clues(req.query);
    res.json(payload);
  } catch (error) {
    handleUpstreamError(error, next);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    const payload = await JService.categories({
      count: req.query.count,
      offset: req.query.offset,
    });
    res.json(payload);
  } catch (error) {
    handleUpstreamError(error, next);
  }
});

module.exports = router;
