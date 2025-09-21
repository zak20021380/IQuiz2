'use strict';

const router = require('express').Router();

const {
  getRandomClues,
  getCluesByCategory,
  getCategories,
  clampCount,
  clampCategoryCount,
  clampCategoryOffset,
  getCacheSnapshot,
} = require('../services/jservice');

function normalizeDateParam(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) {
    return null;
  }
  try {
    return new Date(ts).toISOString().split('T')[0];
  } catch (err) {
    return null;
  }
}

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

router.get('/clues', async (req, res, next) => {
  const categoryParam = req.query.category ?? req.query.categoryId;
  const categoryId = Number.parseInt(categoryParam, 10);
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return res.status(400).json({ ok: false, message: 'category must be a positive integer' });
  }

  const count = clampCount(req.query.count);
  const options = { count };

  if (req.query.value !== undefined) {
    const value = Number.parseInt(req.query.value, 10);
    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ ok: false, message: 'value must be a positive integer' });
    }
    options.value = value;
  }

  if (req.query.offset !== undefined) {
    const offset = Number.parseInt(req.query.offset, 10);
    if (!Number.isFinite(offset) || offset < 0) {
      return res.status(400).json({ ok: false, message: 'offset must be a non-negative integer' });
    }
    options.offset = offset;
  }

  if (req.query.minDate !== undefined) {
    const normalized = normalizeDateParam(req.query.minDate);
    if (normalized === null) {
      return res.status(400).json({ ok: false, message: 'minDate must be a valid date value' });
    }
    if (normalized) {
      options.minDate = normalized;
    }
  }

  if (req.query.maxDate !== undefined) {
    const normalized = normalizeDateParam(req.query.maxDate);
    if (normalized === null) {
      return res.status(400).json({ ok: false, message: 'maxDate must be a valid date value' });
    }
    if (normalized) {
      options.maxDate = normalized;
    }
  }

  if (options.minDate && options.maxDate && options.minDate > options.maxDate) {
    return res.status(400).json({ ok: false, message: 'minDate cannot be after maxDate' });
  }

  try {
    const clues = await getCluesByCategory(categoryId, options);
    const meta = {
      requested: count,
      delivered: clues.length,
      cacheSize: getCacheSnapshot().size,
      categoryId,
    };
    if (options.value) meta.value = options.value;
    if (typeof options.offset === 'number') meta.offset = options.offset;
    if (options.minDate) meta.minDate = options.minDate;
    if (options.maxDate) meta.maxDate = options.maxDate;
    res.json({ ok: true, data: clues, meta });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 502;
    }
    next(error);
  }
});

router.get('/categories', async (req, res, next) => {
  let count;
  if (req.query.count !== undefined) {
    const parsed = Number.parseInt(req.query.count, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return res.status(400).json({ ok: false, message: 'count must be a positive integer' });
    }
    count = parsed;
  }

  let offset;
  if (req.query.offset !== undefined) {
    const parsed = Number.parseInt(req.query.offset, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return res.status(400).json({ ok: false, message: 'offset must be a non-negative integer' });
    }
    offset = parsed;
  }

  const normalizedCount = clampCategoryCount(count);
  const normalizedOffset = clampCategoryOffset(offset);

  try {
    const categories = await getCategories({ count: normalizedCount, offset: normalizedOffset });
    res.json({
      ok: true,
      data: categories,
      meta: {
        requested: normalizedCount,
        offset: normalizedOffset,
        delivered: categories.length,
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
