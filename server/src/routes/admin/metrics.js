const router = require('express').Router();
const { protect, adminOnly } = require('../../middleware/auth');
const questionConfig = require('../../config/questions');
const questionPicker = require('../../services/QuestionPicker');

function computePercentile(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(percentile * (sorted.length - 1))));
  return sorted[index];
}

function computeMedian(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

router.use(protect, adminOnly);

router.get('/questions/repeat-rate', async (req, res, next) => {
  try {
    const daysRaw = Number.parseInt(req.query.days, 10);
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 90) : 30;
    const store = questionPicker.getStore();
    const entries = await store.getRepeatRates(days);
    const rates = entries.map((entry) => entry.repeatRate);
    res.json({
      ok: true,
      data: {
        days,
        users: entries.length,
        medianRepeatRate: computeMedian(rates),
        p90RepeatRate: computePercentile(rates, 0.9),
        details: entries
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/questions/hot-buckets', async (req, res, next) => {
  try {
    const limitRaw = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const store = questionPicker.getStore();
    const buckets = await store.getHotBuckets(limit);
    res.json({
      ok: true,
      data: {
        limit,
        threshold: questionConfig.HOT_BUCKET_THRESHOLD,
        buckets
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
