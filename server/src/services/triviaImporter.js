const logger = require('../config/logger');
const Question = require('../models/Question');
const Category = require('../models/Category');

const DEFAULT_TRIVIA_URL = 'https://opentdb.com/api.php?amount=20&type=multiple';
const TRIVIA_URL = process.env.TRIVIA_URL || DEFAULT_TRIVIA_URL;

let fetchImpl = globalThis.fetch;
try {
  // node-fetch@2 (CommonJS) - preferred per requirements
  fetchImpl = require('node-fetch');
} catch (err) {
  if (typeof fetchImpl !== 'function') throw err;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function fetchAndStoreTriviaBatch() {
  const response = await fetchImpl(TRIVIA_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch trivia questions: ${response.status}`);
  }

  const payload = await response.json();
  if (payload.response_code && payload.response_code !== 0) {
    return {
      status: 502,
      body: { ok: false, message: 'Trivia provider returned an error' }
    };
  }

  const questions = Array.isArray(payload.results) ? payload.results : [];
  if (questions.length === 0) {
    return {
      status: 502,
      body: { ok: false, message: 'No trivia questions returned from provider' }
    };
  }

  const categoryCache = new Map();
  const docs = [];

  for (const item of questions) {
    const incorrect = Array.isArray(item.incorrect_answers) ? item.incorrect_answers : [];
    const correct = item.correct_answer;
    const choices = shuffle([...incorrect, correct]);
    const correctIndex = choices.indexOf(correct);

    const categoryName = item.category || 'General';
    let categoryDoc = categoryCache.get(categoryName);
    if (!categoryDoc) {
      categoryDoc = await Category.findOne({ name: categoryName });
      if (!categoryDoc) {
        categoryDoc = await Category.create({ name: categoryName });
      }
      categoryCache.set(categoryName, categoryDoc);
    }

    docs.push({
      text: item.question,
      choices,
      correctIndex,
      difficulty: item.difficulty || 'easy',
      category: categoryDoc._id,
      categoryName,
      source: 'opentdb'
    });
  }

  const inserted = await Question.insertMany(docs);
  return { status: 200, body: { ok: true, count: inserted.length } };
}

function startTriviaPoller({ intervalMs = 5000, maxRuns = Infinity } = {}) {
  const intervalNumber = Number(intervalMs);
  const safeInterval = Number.isFinite(intervalNumber) && intervalNumber > 0 ? intervalNumber : 5000;

  const maxRunsNumber = Number(maxRuns);
  const normalizedMaxRuns = Number.isFinite(maxRunsNumber) && maxRunsNumber > 0 ? Math.floor(maxRunsNumber) : Infinity;

  let runCount = 0;
  let timer = null;
  let stopped = false;

  const stop = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!stopped) {
      stopped = true;
      logger.info('[TriviaPoller] Stopped');
    }
  };

  const runCycle = async () => {
    if (stopped) return;

    runCount += 1;

    try {
      const { status, body } = await fetchAndStoreTriviaBatch();
      if (status >= 400 || body?.ok === false) {
        const message = body?.message || 'Unknown error';
        logger.warn(`[TriviaPoller] Run #${runCount} completed with status ${status}: ${message}`);
      } else {
        logger.info(`[TriviaPoller] Run #${runCount} imported ${body?.count ?? 0} questions.`);
      }
    } catch (err) {
      logger.error(`[TriviaPoller] Critical error on run #${runCount}: ${err.message}`);
      stop();
      return;
    }

    if (Number.isFinite(normalizedMaxRuns) && runCount >= normalizedMaxRuns) {
      logger.info(`[TriviaPoller] Reached max runs (${normalizedMaxRuns}). Stopping.`);
      stop();
      return;
    }

    if (stopped) return;
    timer = setTimeout(runCycle, safeInterval);
  };

  logger.info(`[#TriviaPoller] Starting with interval=${safeInterval}ms${Number.isFinite(normalizedMaxRuns) ? `, maxRuns=${normalizedMaxRuns}` : ''}.`);
  runCycle();

  return {
    stop,
    getRunCount: () => runCount,
    isRunning: () => !stopped
  };
}

module.exports = {
  fetchAndStoreTriviaBatch,
  startTriviaPoller
};
