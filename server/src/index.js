// server/src/index.js
require('dotenv').config();
const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const { startTriviaPoller } = require('./poller/triviaPoller');
const { ensureInitialCategories, syncProviderCategories } = require('./services/categorySeeder');
const { createApp } = require('./app');

// init
const app = createApp();

// ───────────────── Start
let server;
let triviaPollerInstance;

const startApp = async () => {
  await connectDB();

  await ensureInitialCategories();
  try {
    await syncProviderCategories();
  } catch (err) {
    logger.warn(`Failed to sync provider categories: ${err.message}`);
  }

  if (env.trivia.enablePoller) {
    triviaPollerInstance = startTriviaPoller();
  }

  server = app.listen(env.port, () => logger.info(`🚀 API running on http://localhost:${env.port}`));
};

startApp().catch(err => {
  logger.error(`Failed to start application: ${err.message}`, err);
  process.exit(1);
});

const shutdown = () => {
  logger.info('Shutting down...');

  if (triviaPollerInstance) {
    triviaPollerInstance.stop();
  }

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
