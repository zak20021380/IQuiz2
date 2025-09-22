const { generateQuestions } = require('../services/aiQuestionGenerator');

function parsePreviewFlag(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'preview'].includes(normalized);
  }
  return false;
}

exports.generate = async (req, res, next) => {
  try {
    const body = req.body || {};
    const previewOnly = parsePreviewFlag(body.previewOnly || body.preview);
    const payload = {
      count: body.count,
      categorySlug: body.categorySlug,
      difficulty: body.difficulty,
      topicHints: body.topicHints,
      temperature: body.temperature,
      seed: body.seed,
      previewOnly,
      requestedBy: req.user?._id ? String(req.user._id) : undefined
    };

    const result = await generateQuestions(payload);
    const status = previewOnly ? 200 : (result.inserted > 0 ? 201 : 200);
    res.status(status).json({ ok: true, ...result });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ ok: false, message: error.message });
    }
    return next(error);
  }
};
