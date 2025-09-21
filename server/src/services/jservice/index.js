'use strict';

const JServiceCache = require('./cache');
const { fetchRandomClues, fetchCluesByCategory, fetchCategories } = require('./client');

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const CACHE_MAX = 200;
const MAX_REQUEST = 20;
const MAX_FETCH_ATTEMPTS = 4;
const MAX_CATEGORY_COUNT = 100;
const DEFAULT_CATEGORY_COUNT = 20;

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

function hasClueFilters(options = {}) {
  if (!options) return false;
  if (Number.isFinite(options.value) && options.value > 0) return true;
  if (Number.isFinite(options.offset) && options.offset > 0) return true;
  if (typeof options.minDate === 'string' && options.minDate) return true;
  if (typeof options.maxDate === 'string' && options.maxDate) return true;
  return false;
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

async function getCluesByCategory(categoryId, options = {}) {
  const limit = clampCount(typeof options.count !== 'undefined' ? options.count : undefined);

  const fetchOptions = {
    value: Number.isFinite(options.value) && options.value > 0 ? options.value : undefined,
    offset: Number.isFinite(options.offset) && options.offset > 0 ? options.offset : undefined,
    minDate: typeof options.minDate === 'string' && options.minDate ? options.minDate : undefined,
    maxDate: typeof options.maxDate === 'string' && options.maxDate ? options.maxDate : undefined,
  };

  const useCachePriming = !hasClueFilters(fetchOptions);
  const cached = useCachePriming ? cache.getByCategory({ categoryId }) : [];
  let fetched = [];
  try {
    fetched = await fetchCluesByCategory(categoryId, fetchOptions);
  } catch (error) {
    if (!cached.length) {
      throw error;
    }
    fetched = [];
  }

  const combined = [];
  const seen = new Set();
  const pushUnique = (clue) => {
    if (!clue || seen.has(clue.id) || combined.length >= limit) return;
    seen.add(clue.id);
    combined.push(clue);
  };

  fetched.forEach((clue) => {
    cache.set(clue);
    pushUnique(clue);
  });

  if (useCachePriming && combined.length < limit) {
    cached.forEach((clue) => {
      pushUnique(clue);
    });
  }

  return combined.map(mapForResponse);
}

function clampCategoryCount(value = DEFAULT_CATEGORY_COUNT) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_CATEGORY_COUNT;
  return Math.min(Math.max(parsed, 1), MAX_CATEGORY_COUNT);
}

function clampCategoryOffset(value = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

async function getCategories(options = {}) {
  const count = clampCategoryCount(options.count);
  const offset = clampCategoryOffset(options.offset);
  const categories = await fetchCategories({ count, offset });
  return categories.map((category) => ({
    id: category.id,
    title: category.title,
    cluesCount: category.cluesCount,
  }));
}

function getCacheSnapshot() {
  return {
    size: cache.size(),
  };
}

module.exports = {
  getRandomClues,
  getCluesByCategory,
  getCategories,
  getCacheSnapshot,
  clampCount,
  clampCategoryCount,
  clampCategoryOffset,
};
