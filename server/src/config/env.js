const logger = require('./logger');

const DEFAULT_PORT = 4000;
const DEFAULT_NODE_ENV = 'development';
const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/iquiz';
const DEFAULT_MONGO_MAX_POOL = 10;
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

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
const port = parseNumber(process.env.PORT, DEFAULT_PORT, { min: 1 });
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
const defaultTemperature = parseNumber(process.env.AI_DEFAULT_TEMPERATURE, 0.35, { min: 0, max: 1 });
const openAiBaseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).trim().replace(/\/+$/, '');
const openAiModel = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
const openAiApiKey = process.env.OPENAI_API_KEY || '';
const openAiOrganization = process.env.OPENAI_ORG || process.env.OPENAI_ORGANIZATION || '';
const openAiProject = process.env.OPENAI_PROJECT || '';

const allowReviewModeAll = parseBoolean(process.env.ALLOW_REVIEW_MODE_ALL, true);

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port,
  mongo: {
    uri: mongoUri,
    maxPoolSize: mongoMaxPool
  },
  cors: {
    allowedOrigins
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  ai: {
    defaultTemperature,
    openai: {
      baseUrl: openAiBaseUrl,
      model: openAiModel,
      apiKey: openAiApiKey,
      organization: openAiOrganization,
      project: openAiProject
    }
  },
  features: {
    allowReviewModeAll
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
