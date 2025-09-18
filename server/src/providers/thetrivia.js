const env = require('../config/env');
const logger = require('../config/logger');
const { fetchWithRetry } = require('../lib/http');

const DEFAULT_CATEGORY = 'General Knowledge';
const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function sanitizeText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeDifficulty(value) {
  const normalized = sanitizeText(value).toLowerCase();
  return ALLOWED_DIFFICULTIES.has(normalized) ? normalized : 'medium';
}

function normalizeQuestion(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const questionText = sanitizeText(raw.question?.text ?? raw.question);
  const correctAnswer = sanitizeText(raw.correctAnswer);
  const incorrectAnswersRaw = Array.isArray(raw.incorrectAnswers)
    ? raw.incorrectAnswers.map(sanitizeText)
    : [];

  if (!questionText || !correctAnswer) {
    return null;
  }

  const incorrectAnswers = [];
  const seenIncorrect = new Set();
  const correctKey = correctAnswer.toLowerCase();
  for (const answer of incorrectAnswersRaw) {
    if (!answer) continue;
    const key = answer.toLowerCase();
    if (key === correctKey) continue;
    if (seenIncorrect.has(key)) continue;
    seenIncorrect.add(key);
    incorrectAnswers.push(answer);
  }

  if (incorrectAnswers.length === 0) {
    return null;
  }

  const categoryName = sanitizeText(raw.category) || DEFAULT_CATEGORY;

  return {
    source: 'the-trivia-api',
    question: questionText,
    correctAnswer,
    incorrectAnswers,
    categoryName,
    difficulty: normalizeDifficulty(raw.difficulty),
    type: 'multiple',
    lang: 'en'
  };
}

async function getFromTheTriviaAPI(url = env.trivia.theTriviaUrl) {
  const targetUrl = sanitizeText(url) || env.trivia.theTriviaUrl;

  if (!targetUrl) {
    throw new Error('The Trivia API URL is not configured');
  }

  let response;
  try {
    response = await fetchWithRetry(targetUrl, {
      timeout: 15000,
      retries: 2,
      retryDelay: ({ attempt }) => attempt * 500,
      headers: { Accept: 'application/json' }
    });
  } catch (error) {
    logger.error(`[TheTriviaAPI] Failed to reach provider: ${error.message}`);
    throw new Error('Failed to reach The Trivia API');
  }

  if (!response.ok) {
    const error = new Error(`The Trivia API request failed with status ${response.status}`);
    logger.error(error.message);
    throw error;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    logger.error('[TheTriviaAPI] Failed to parse JSON response', error);
    throw new Error('Failed to parse The Trivia API response as JSON');
  }

  if (!Array.isArray(payload)) {
    throw new Error('The Trivia API returned an unexpected payload');
  }

  return payload.map(normalizeQuestion).filter(Boolean);
}

module.exports = {
  getFromTheTriviaAPI,
};

