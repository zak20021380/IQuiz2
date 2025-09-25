const DEFAULT_SIMHASH_HAMMING_NEAR = 3;
const DEFAULT_LSH_PREFIX_BITS = 12;
const DEFAULT_RECENT_KEEP = 400;
const DEFAULT_RECENT_QUESTION_TTL_DAYS = 3;
const DEFAULT_RECENT_QUESTION_LIMIT = 500;
const DEFAULT_CANDIDATE_MULTIPLIER = 8;
const DEFAULT_HOT_BUCKET_THRESHOLD = 75;
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60; // 1 hour
const DEFAULT_SERVE_LOG_TTL_SECONDS = 60 * 60 * 24 * 35; // 35 days for repeat metrics

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseNumber(value, fallback, { min, max } = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  let normalized = parsed;
  if (typeof min === 'number' && normalized < min) normalized = min;
  if (typeof max === 'number' && normalized > max) normalized = max;
  return normalized;
}

const config = Object.freeze({
  SIMHASH_HAMMING_NEAR: parseNumber(process.env.SIMHASH_HAMMING_NEAR, DEFAULT_SIMHASH_HAMMING_NEAR, { min: 1, max: 16 }),
  LSH_PREFIX_BITS: parseNumber(process.env.LSH_PREFIX_BITS, DEFAULT_LSH_PREFIX_BITS, { min: 4, max: 32 }),
  RECENT_KEEP: parseNumber(process.env.RECENT_QUESTION_KEEP, DEFAULT_RECENT_KEEP, { min: 50, max: 2000 }),
  RECENT_QUESTION_TTL_DAYS: parseNumber(
    process.env.RECENT_QUESTION_TTL_DAYS,
    DEFAULT_RECENT_QUESTION_TTL_DAYS,
    { min: 0.1, max: 30 }
  ),
  RECENT_QUESTION_LIMIT: parseNumber(
    process.env.RECENT_QUESTION_LIMIT,
    DEFAULT_RECENT_QUESTION_LIMIT,
    { min: 50, max: 5000 }
  ),
  CANDIDATE_MULTIPLIER: parseNumber(process.env.QUESTION_CANDIDATE_MULTIPLIER, DEFAULT_CANDIDATE_MULTIPLIER, { min: 2, max: 20 }),
  HOT_BUCKET_THRESHOLD: parseNumber(process.env.HOT_BUCKET_THRESHOLD, DEFAULT_HOT_BUCKET_THRESHOLD, { min: 10, max: 1000 }),
  SESSION_TTL_SECONDS: parseNumber(process.env.QUESTION_SESSION_TTL, DEFAULT_SESSION_TTL_SECONDS, { min: 60, max: 6 * 60 * 60 }),
  SERVE_LOG_TTL_SECONDS: parseNumber(process.env.QUESTION_SERVE_LOG_TTL, DEFAULT_SERVE_LOG_TTL_SECONDS, { min: 60 * 60 * 24, max: 60 * 60 * 24 * 90 }),
  features: {
    useBloomFilter: parseBoolean(process.env.ENABLE_RECENT_BLOOM_FILTER, false),
    hotBucketPenalty: parseBoolean(process.env.ENABLE_HOT_BUCKET_PENALTY, true)
  },
  penalties: {
    novelty: -0.2
  }
});

module.exports = config;
