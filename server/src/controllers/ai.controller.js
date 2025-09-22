const { generateQuestions } = require('../services/aiQuestionGenerator');

function parseBooleanFlag(value) {
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
    const previewOnly = parseBooleanFlag(body.previewOnly ?? body.preview);
    const previewQuestions = Array.isArray(body.previewQuestions)
      ? body.previewQuestions
      : Array.isArray(body.questions)
        ? body.questions
        : undefined;
    const payload = {
      topic: body.topic,
      count: body.count,
      difficulty: body.difficulty,
      lang: body.lang,
      previewOnly,
      previewQuestions,
      requestedBy: req.user?._id ? String(req.user._id) : undefined
    };

    const result = await generateQuestions(payload);
    const status = !previewOnly && result.inserted > 0 ? 201 : 200;
    res.status(status).json({ ok: true, ...result });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ ok: false, message: error.message });
    }
    return next(error);
  }
};
