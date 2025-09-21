'use strict';

const JServiceCache = require('./cache');
const { fetchRandomClues } = require('./client');

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
 * Normalize clue for API response.
 * @param {{id:number, category:string, question:string, answer:string, airdate:string|null}} clue
 * @returns {{id:number, category:string, question:string, answer:string, airdate:string|null}}
 */
function mapForResponse(clue) {
  return {
    id: clue.id,
    category: clue.category,
    question: clue.question,
    answer: clue.answer,
    airdate: clue.airdate || null,
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

module.exports = {
  getRandomClues,
  getCacheSnapshot,
  clampCount,
};
