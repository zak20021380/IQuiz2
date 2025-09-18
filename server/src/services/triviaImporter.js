const logger = require('../config/logger');
const Question = require('../models/Question');
const Category = require('../models/Category');

const DEFAULT_TRIVIA_URL = 'https://opentdb.com/api.php?amount=20&type=multiple';
const TRIVIA_URL_TEMPLATE = process.env.TRIVIA_URL || DEFAULT_TRIVIA_URL;
const [TRIVIA_BASE_URL, TRIVIA_DEFAULT_QUERY = ''] = TRIVIA_URL_TEMPLATE.split('?');
const TRIVIA_DEFAULT_PARAMS = new URLSearchParams(TRIVIA_DEFAULT_QUERY);
const defaultAmountCandidate = Number(TRIVIA_DEFAULT_PARAMS.get('amount'));
const DEFAULT_TRIVIA_AMOUNT = Number.isFinite(defaultAmountCandidate) && defaultAmountCandidate > 0
  ? Math.floor(defaultAmountCandidate)
  : 20;

if (!TRIVIA_DEFAULT_PARAMS.has('type')) {
  TRIVIA_DEFAULT_PARAMS.set('type', 'multiple');
}
TRIVIA_DEFAULT_PARAMS.delete('amount');

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function buildTriviaUrl({ amount, category, difficulty }) {
  const params = new URLSearchParams(TRIVIA_DEFAULT_PARAMS.toString());
  const normalizedAmount = Number.isFinite(Number(amount)) && Number(amount) > 0
    ? Math.floor(Number(amount))
    : DEFAULT_TRIVIA_AMOUNT;
  params.set('amount', String(normalizedAmount));

  if (category) params.set('category', String(category));
  else params.delete('category');

  if (difficulty && VALID_DIFFICULTIES.has(String(difficulty).toLowerCase())) {
    params.set('difficulty', String(difficulty).toLowerCase());
  } else {
    params.delete('difficulty');
  }

  return `${TRIVIA_BASE_URL}?${params.toString()}`;
}

function sanitizeAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return DEFAULT_TRIVIA_AMOUNT;
  return Math.min(Math.floor(num), 200);
}

function sanitizeCategories(categories) {
  if (!Array.isArray(categories)) return [];
  return categories
    .map((cat) => String(cat).trim())
    .filter((cat) => cat !== '');
}

function sanitizeDifficulties(difficulties) {
  if (!Array.isArray(difficulties)) return [];
  return difficulties
    .map((difficulty) => String(difficulty).toLowerCase())
    .filter((difficulty) => VALID_DIFFICULTIES.has(difficulty));
}

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

async function fetchOpenTdbCategories() {
  const response = await fetchImpl('https://opentdb.com/api_category.php');
  if (!response.ok) {
    throw new Error(`Failed to fetch trivia categories: ${response.status}`);
  }

  const payload = await response.json();
  const categories = Array.isArray(payload?.trivia_categories) ? payload.trivia_categories : [];

  return categories.map((item) => ({
    id: item.id,
    name: item.name,
  }));
}

async function fetchAndStoreTriviaBatch(options = {}) {
  const sanitizedAmount = sanitizeAmount(options.amount);
  const categoryTargets = sanitizeCategories(options.categories);
  const difficultyTargets = sanitizeDifficulties(options.difficulties);

  const categoryList = categoryTargets.length > 0 ? categoryTargets : [null];
  const difficultyList = difficultyTargets.length > 0 ? difficultyTargets : [null];

  const combinations = [];
  for (const category of categoryList) {
    for (const difficulty of difficultyList) {
      combinations.push({ category, difficulty });
    }
  }

  if (combinations.length === 0) {
    combinations.push({ category: null, difficulty: null });
  }

  const safeAmount = sanitizedAmount > 0 ? sanitizedAmount : DEFAULT_TRIVIA_AMOUNT;
  const perComboBase = Math.floor(safeAmount / combinations.length);
  let remainder = safeAmount % combinations.length;

  const categoryCache = new Map();
  const docs = [];
  const breakdown = [];

  for (const combo of combinations) {
    let comboAmount = perComboBase;
    if (remainder > 0) {
      comboAmount += 1;
      remainder -= 1;
    }

    if (comboAmount <= 0) {
      breakdown.push({
        providerCategoryId: combo.category,
        providerDifficulty: combo.difficulty || 'mixed',
        requested: 0,
        received: 0,
      });
      continue;
    }

    let remaining = comboAmount;
    let receivedTotal = 0;
    let providerCategoryName = null;
    let providerError;

    while (remaining > 0) {
      const perRequestAmount = Math.min(remaining, 50);
      const url = buildTriviaUrl({
        amount: perRequestAmount,
        category: combo.category,
        difficulty: combo.difficulty,
      });

      const response = await fetchImpl(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch trivia questions: ${response.status}`);
      }

      const payload = await response.json();
      if (payload.response_code && payload.response_code !== 0) {
        providerError = 'Trivia provider returned an error';
        break;
      }

      const questions = Array.isArray(payload.results) ? payload.results : [];
      if (!providerCategoryName && questions[0]) {
        providerCategoryName = questions[0]?.category || null;
      }

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
          source: 'opentdb',
        });
      }

      receivedTotal += questions.length;
      remaining -= perRequestAmount;

      if (questions.length < perRequestAmount) {
        // Provider returned less than requested; avoid tight loops.
        break;
      }
    }

    breakdown.push({
      providerCategoryId: combo.category,
      providerDifficulty: combo.difficulty || 'mixed',
      requested: comboAmount,
      received: receivedTotal,
      categoryName: providerCategoryName,
      error: providerError,
    });
  }

  if (docs.length === 0) {
    return {
      status: 200,
      body: {
        ok: false,
        message: 'No trivia questions returned from provider',
        breakdown,
      },
    };
  }

  const inserted = await Question.insertMany(docs);
  const partial = breakdown.some((item) => (item?.error) || (Number.isFinite(item?.requested) && Number.isFinite(item?.received) && item.received < item.requested));
  return {
    status: 200,
    body: {
      ok: true,
      count: inserted.length,
      breakdown,
      partial,
    },
  };
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
  fetchOpenTdbCategories,
  fetchAndStoreTriviaBatch,
  startTriviaPoller
};
