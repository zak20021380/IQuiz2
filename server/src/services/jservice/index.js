'use strict';

const JServiceCache = require('./cache');
const client = require('./client');

const { random: fetchRandomClues, clues: fetchClues, categories: fetchCategories, normalizeText } = client;

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const CACHE_MAX = 200;
const MAX_REQUEST = 20;
const MAX_FETCH_ATTEMPTS = 4;

const cache = new JServiceCache({ maxSize: CACHE_MAX, ttl: CACHE_TTL });

/**
 * Clamp count to supported range.
 * @param {number} value
 * @returns {number}
 */
function clampCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(parsed, 1), MAX_REQUEST);
}

/**
 * Normalize category metadata for API responses.
 * @param {{id?:number|string, title?:string, clues_count?:number|string}|null} category
 * @returns {{id:(number|null), title:string, clues_count?:number}}
 */
function mapCategory(category) {
  if (!category || typeof category !== 'object') {
    return { id: null, title: 'General' };
  }

  const parsedId = Number.parseInt(category.id, 10);
  const parsedCount = Number.parseInt(category.clues_count, 10);
  const normalizedTitle = normalizeText(category.title || '');

  const result = {
    id: Number.isFinite(parsedId) ? parsedId : null,
    title: normalizedTitle || (typeof category.title === 'string' && category.title.trim() ? category.title.trim() : 'General'),
  };

  if (Number.isFinite(parsedCount)) {
    result.clues_count = parsedCount;
  }

  return result;
}

/**
 * Normalize clue for API response.
 * @param {{id:number, category:{id:(number|null), title:string, clues_count?:number}, question:string, answer:string, airdate:string|null, value:(number|null)}} clue
 * @returns {{id:number, category:{id:(number|null), title:string, clues_count?:number}, question:string, answer:string, airdate:string|null, value:(number|null)}}
 */
function mapForResponse(clue) {
  const category = mapCategory(clue && typeof clue === 'object' ? clue.category : null);
  return {
    id: clue.id,
    category,
    question: clue.question,
    answer: clue.answer,
    airdate: clue.airdate || null,
    value: typeof clue.value === 'number' ? clue.value : null,
  };
}

/**
 * Fetch random clues with caching and de-duplication.
 * @param {number} count
 * @returns {Promise<object[]>}
 */
async function getRandomClues(count) {
  const desired = clampCount(count);
  const unique = new Map();
  const duplicates = [];
  const fetched = new Map();
  let attempts = 0;

  while (unique.size < desired && attempts < MAX_FETCH_ATTEMPTS) {
    const remaining = desired - unique.size;
    const batchSize = Math.min(Math.max(remaining + 2, 1), MAX_REQUEST * 2);
    let batch;
    try {
      batch = await fetchRandomClues(batchSize);
    } catch (error) {
      if (unique.size === 0) {
        throw error;
      }
      break;
    }
    attempts += 1;

    batch.forEach((clue) => {
      fetched.set(clue.id, clue);
      if (unique.has(clue.id)) return;
      if (!cache.has(clue.id)) {
        unique.set(clue.id, clue);
      } else {
        duplicates.push(clue);
      }
    });
  }

  for (const clue of duplicates) {
    if (unique.size >= desired) break;
    unique.set(clue.id, clue);
  }

  if (unique.size < desired) {
    cache.getAll().some((clue) => {
      if (unique.has(clue.id)) return false;
      unique.set(clue.id, clue);
      return unique.size >= desired;
    });
  }

  const result = Array.from(unique.values()).slice(0, desired);

  const persist = new Map();
  result.forEach((clue) => persist.set(clue.id, clue));
  fetched.forEach((clue, id) => {
    if (!persist.has(id)) {
      persist.set(id, clue);
    }
  });
  persist.forEach((clue) => cache.set(clue));

  return result.map(mapForResponse);
}

function getCacheSnapshot() {
  return {
    size: cache.size(),
  };
}

async function random(count) {
  const requested = clampCount(count);
  const data = await getRandomClues(requested);
  return {
    ok: true,
    data,
    meta: {
      requested,
      delivered: data.length,
      cacheSize: getCacheSnapshot().size,
    },
  };
}

async function clues(params = {}) {
  const items = await fetchClues(params);
  const data = Array.isArray(items) ? items.map(mapForResponse) : [];
  return {
    ok: true,
    data,
    meta: {
      count: data.length,
    },
  };
}

async function categories(params = {}) {
  const items = await fetchCategories(params);
  const data = Array.isArray(items) ? items.map(mapCategory) : [];
  return {
    ok: true,
    data,
    meta: {
      count: data.length,
    },
  };
}

module.exports = {
  random,
  clues,
  categories,
  getRandomClues,
  getCacheSnapshot,
  clampCount,
};
