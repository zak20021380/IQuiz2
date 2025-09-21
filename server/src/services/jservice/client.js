'use strict';

const { fetchWithRetry } = require('../../lib/http');

const API_ENDPOINT = 'http://jservice.io/api/random';
const MAX_BATCH = 100;
const RETRY_DELAYS = [250, 500, 1000];

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  pound: '£',
  yen: '¥',
  rs: '₹',
  deg: '°',
  plusmn: '±',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  times: '×',
  divide: '÷',
};

/**
 * Decode HTML entities.
 * @param {string} value
 * @returns {string}
 */
function decodeHtmlEntities(value) {
  if (typeof value !== 'string' || value.indexOf('&') === -1) {
    return typeof value === 'string' ? value : '';
  }
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const num = isHex ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      if (Number.isFinite(num)) {
        try {
          return String.fromCodePoint(num);
        } catch (err) {
          return match;
        }
      }
      return match;
    }
    const replacement = NAMED_ENTITIES[entity.toLowerCase()];
    return typeof replacement === 'string' ? replacement : match;
  });
}

/**
 * Normalize text by decoding HTML entities, stripping tags and collapsing whitespace.
 * @param {string} value
 * @returns {string}
 */
function normalizeText(value) {
  if (typeof value !== 'string') return '';
  const decoded = decodeHtmlEntities(value);
  const withoutTags = decoded.replace(/<[^>]+>/g, ' ');
  return withoutTags.replace(/\s+/g, ' ').trim();
}

/**
 * Normalize airdate to ISO string.
 * @param {string|null} airdate
 * @returns {string|null}
 */
function normalizeAirdate(airdate) {
  if (!airdate) return null;
  const ts = Date.parse(airdate);
  if (!Number.isFinite(ts)) return null;
  try {
    return new Date(ts).toISOString();
  } catch (err) {
    return null;
  }
}

/**
 * @param {object} raw
 * @returns {{id:number, categoryId:number|null, category:string, question:string, answer:string, airdate:string|null}|null}
 */
function normalizeClue(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = Number.parseInt(raw.id, 10);
  if (!Number.isFinite(id)) return null;
  const question = normalizeText(raw.question || '');
  const answer = normalizeText(raw.answer || '');
  if (!question || !answer) return null;
  const categoryIdRaw = raw.category && Number.parseInt(raw.category.id, 10);
  const categoryTitleRaw = raw.category && raw.category.title;
  const categoryTitle = normalizeText(categoryTitleRaw || '');
  return {
    id,
    categoryId: Number.isFinite(categoryIdRaw) ? categoryIdRaw : null,
    category: categoryTitle || 'General',
    question,
    answer,
    airdate: normalizeAirdate(raw.airdate || null)
  };
}

/**
 * @param {number} count
 * @returns {Promise<object[]>}
 */
async function fetchRandomClues(count) {
  const size = Math.min(Math.max(Math.floor(count) || 1, 1), MAX_BATCH);
  const url = `${API_ENDPOINT}?count=${size}`;
  let response;
  try {
    response = await fetchWithRetry(url, {
      headers: { Accept: 'application/json' },
      retries: RETRY_DELAYS.length,
      retryDelay: ({ attempt }) => RETRY_DELAYS[Math.min(attempt - 1, RETRY_DELAYS.length - 1)],
      retryOn: (res) => res && (res.status >= 500 || res.status === 429 || res.status === 408),
      timeout: 8000,
    });
  } catch (error) {
    const err = new Error(`Failed to reach JService: ${error.message}`);
    err.cause = error;
    throw err;
  }

  if (!response.ok) {
    const err = new Error(`JService responded with status ${response.status}`);
    err.status = response.status;
    throw err;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    const err = new Error('Failed to parse JService response');
    err.cause = error;
    throw err;
  }

  const items = Array.isArray(payload) ? payload : [];
  const normalized = [];
  items.forEach((item) => {
    const clue = normalizeClue(item);
    if (clue) normalized.push(clue);
  });

  return normalized;
}

module.exports = {
  fetchRandomClues,
  normalizeClue,
  decodeHtmlEntities,
  normalizeText,
};
