const logger = require('./logger');

const DEFAULT_PORT = 4000;
const DEFAULT_NODE_ENV = 'development';
const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/iquiz';
const DEFAULT_TRIVIA_URL = 'https://opentdb.com/api.php?amount=20&type=multiple';
const DEFAULT_TRIVIA_INTERVAL = 5000;
const DEFAULT_THE_TRIVIA_URL = 'https://the-trivia-api.com/v2/questions?limit=20';
const DEFAULT_CLUEBASE_URL = 'https://cluebase.lukelav.in';
const DEFAULT_CLUEBASE_LIMIT = 50;
const DEFAULT_MONGO_MAX_POOL = 10;

const truthyValues = new Set(['true', '1', 'yes', 'y', 'on']);
const falsyValues = new Set(['false', '0', 'no', 'n', 'off']);

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (truthyValues.has(normalized)) return true;
  if (falsyValues.has(normalized)) return false;
  return defaultValue;
}

function parseNumber(value, defaultValue, { min, max } = {}) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return defaultValue;

  let normalized = parsed;
  if (typeof min === 'number' && normalized < min) normalized = min;
  if (typeof max === 'number' && normalized > max) normalized = max;
  return normalized;
}

function parseAllowedOrigins(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || DEFAULT_NODE_ENV;
const mongoUri = process.env.MONGO_URI || DEFAULT_MONGO_URI;
const mongoMaxPool = parseNumber(process.env.MONGO_MAX_POOL, DEFAULT_MONGO_MAX_POOL, { min: 1 });
const enableTriviaPoller = parseBoolean(process.env.ENABLE_TRIVIA_POLLER, false);
const pollerIntervalMs = parseNumber(process.env.TRIVIA_POLLER_INTERVAL_MS, DEFAULT_TRIVIA_INTERVAL, { min: 1000 });
const pollerMaxRunsCandidate = parseNumber(process.env.TRIVIA_POLLER_MAX_RUNS, 0, { min: 0 });
const pollerMaxRuns = pollerMaxRunsCandidate > 0 ? Math.floor(pollerMaxRunsCandidate) : null;
const triviaUrl = process.env.TRIVIA_URL || DEFAULT_TRIVIA_URL;
const theTriviaUrl = process.env.THETRIVIA_URL || DEFAULT_THE_TRIVIA_URL;
const cluebaseUrl = (process.env.CLUEBASE_URL || DEFAULT_CLUEBASE_URL).trim().replace(/\/+$/, '');
const cluebaseLimit = parseNumber(process.env.CLUEBASE_LIMIT, DEFAULT_CLUEBASE_LIMIT, { min: 1, max: 100 });
const port = parseNumber(process.env.PORT, DEFAULT_PORT, { min: 1 });
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
const importApprove = parseBoolean(process.env.IMPORT_APPROVE, true);

function parseProviderList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const importAutoApproveProviders = parseProviderList(process.env.TRIVIA_AUTO_APPROVE);

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port,
  mongo: {
    uri: mongoUri,
    maxPoolSize: mongoMaxPool
  },
  trivia: {
    enablePoller: enableTriviaPoller,
    pollerIntervalMs,
    pollerMaxRuns,
    url: triviaUrl,
    theTriviaUrl,
    cluebase: {
      url: cluebaseUrl,
      limit: cluebaseLimit,
    },
  },
  importer: {
    autoApprove: importApprove,
    autoApproveProviders: importAutoApproveProviders
  },
  cors: {
    allowedOrigins
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  }
};

if (!env.jwt.secret) {
  if (env.isProduction) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  env.jwt.secret = 'development-only-jwt-secret-change-me';
  logger.warn('JWT_SECRET environment variable is not set. Using an insecure fallback secret for development.');
}

module.exports = Object.freeze(env);
