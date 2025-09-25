const logger = require('../config/logger');
const QuestionService = require('./questionService');

const MAX_DUEL_QUESTIONS = 20;

function sanitizeRequested(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 12;
  return Math.min(parsed, MAX_DUEL_QUESTIONS);
}

async function loadDuelQuestions(ctx = {}) {
  const requested = sanitizeRequested(ctx.requested ?? ctx.count ?? ctx.rounds);
  const category = typeof ctx.category === 'string' ? ctx.category.trim() : '';
  const difficulty = typeof ctx.difficulty === 'string' ? ctx.difficulty.trim().toLowerCase() : '';
  const userId = ctx.userId || ctx.user?._id || ctx.user?.id;
  const guestId = ctx.guestId || ctx.guestKey || ctx.guest;

  const { ok, items } = await QuestionService.getQuestions({
    count: requested,
    category,
    difficulty,
    userId,
    guestId,
    user: ctx.user
  });

  if (!ok || !Array.isArray(items) || items.length === 0) {
    throw new Error('no_questions');
  }

  const seen = new Set();
  const unique = [];
  for (const item of items) {
    if (!item || !item.id) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
    if (unique.length === requested) break;
  }

  logger.info(
    `[duel] requested=${requested} delivered=${unique.length} category=${category || 'any'} difficulty=${difficulty || 'any'}`
  );

  if (!unique.length) {
    throw new Error('no_questions');
  }

  return unique;
}

module.exports = {
  MAX_DUEL_QUESTIONS,
  loadDuelQuestions
};
