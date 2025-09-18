const env = require('../config/env');
const logger = require('../config/logger');
const { importTrivia } = require('../services/triviaImporter');

function normalizeInterval(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return numeric;
}

function normalizeMaxRuns(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
}

function startTriviaPoller(options = {}) {
  const intervalMs = normalizeInterval(
    options.intervalMs ?? env.trivia.pollerIntervalMs,
    env.trivia.pollerIntervalMs
  );
  const maxRuns = normalizeMaxRuns(options.maxRuns ?? env.trivia.pollerMaxRuns);

  let runCount = 0;
  let timer = null;
  let stopped = false;
  let runningTick = false;

  const logStart = () => {
    const maxRunsLabel = maxRuns ? maxRuns : '∞';
    logger.info(`[TriviaPoller] Starting interval=${intervalMs}ms maxRuns=${maxRunsLabel}`);
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    logger.info('[TriviaPoller] Stopped');
  };

  const executeImport = async () => {
    if (stopped || runningTick) {
      return;
    }

    runningTick = true;
    const startedAt = Date.now();
    try {
      const result = await importTrivia();
      const duration = Date.now() - startedAt;
      const inserted = Number.isFinite(result?.inserted) ? result.inserted : 0;
      logger.info(`[TriviaPoller] +${inserted} inserted in ${duration}ms`);
    } catch (err) {
      const duration = Date.now() - startedAt;
      logger.error(`[TriviaPoller] Error after ${duration}ms: ${err.message}`);
    } finally {
      runningTick = false;
      runCount += 1;
      if (maxRuns && runCount >= maxRuns) {
        stop();
      }
    }
  };

  logStart();

  timer = setInterval(() => {
    executeImport().catch(err => logger.error(`[TriviaPoller] Unexpected failure: ${err.message}`));
  }, intervalMs);

  executeImport().catch(err => logger.error(`[TriviaPoller] Unexpected failure: ${err.message}`));

  return {
    stop,
    getRunCount: () => runCount,
    isRunning: () => !stopped,
  };
}

module.exports = {
  startTriviaPoller,
};
