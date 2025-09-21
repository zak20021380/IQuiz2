'use strict';

const zlib = require('zlib');

const env = require('../../config/env');
const { fetchWithRetry } = require('../../lib/http');

const DEFAULT_BASE = 'https://jservice.io/api';

function deriveJServiceEndpoints(configured) {
  const fallback = { base: DEFAULT_BASE, random: `${DEFAULT_BASE}/random` };
  if (typeof configured !== 'string') return fallback;
  const trimmed = configured.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = new URL(trimmed);
    const path = (parsed.pathname || '').replace(/\/+$/, '');
    let basePath = path;
    if (basePath.toLowerCase().endsWith('/random')) {
      basePath = basePath.slice(0, -7);
    }
    if (!basePath) {
      basePath = '/api';
    }
    const base = `${parsed.origin}${basePath.replace(/\/+$/, '')}`;
    const normalizedBase = base.replace(/\/+$/, '');
    if (!normalizedBase) return fallback;
    return { base: normalizedBase, random: `${normalizedBase}/random` };
  } catch (err) {
    const sanitized = trimmed.replace(/\/+$/, '');
    if (/\/random$/i.test(sanitized)) {
      const base = sanitized.replace(/\/random$/i, '').replace(/\/+$/, '');
      const normalizedBase = base || DEFAULT_BASE;
      return { base: normalizedBase, random: `${normalizedBase}/random` };
    }
    const normalizedBase = sanitized || DEFAULT_BASE;
    return { base: normalizedBase, random: `${normalizedBase}/random` };
  }
}

const configuredEndpoint = (env && env.trivia && env.trivia.jserviceUrl) || `${DEFAULT_BASE}/random`;
const { base: API_BASE, random: RANDOM_ENDPOINT } = deriveJServiceEndpoints(configuredEndpoint);
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
  const valueRaw = Number.parseInt(raw.value, 10);
  const categoryTitle = normalizeText(categoryTitleRaw || '');
  return {
    id,
    categoryId: Number.isFinite(categoryIdRaw) ? categoryIdRaw : null,
    category: categoryTitle || 'General',
    question,
    answer,
    airdate: normalizeAirdate(raw.airdate || null),
    value: Number.isFinite(valueRaw) ? valueRaw : null
  };
}

function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = Number.parseInt(raw.id, 10);
  if (!Number.isFinite(id)) return null;
  const title = normalizeText(raw.title || raw.category || '');
  const cluesCountRaw = Number.parseInt(raw.clues_count, 10);
  return {
    id,
    title: title || 'General',
    cluesCount: Number.isFinite(cluesCountRaw) && cluesCountRaw >= 0 ? cluesCountRaw : null,
  };
}

/**
 * @param {number} count
 * @returns {Promise<object[]>}
 */
function decodeResponseBuffer(buffer, encoding) {
  if (!buffer || buffer.length === 0) {
    return '';
  }

  const normalizedEncoding = typeof encoding === 'string' ? encoding.toLowerCase() : '';

  try {
    if (normalizedEncoding === 'br') {
      if (typeof zlib.brotliDecompressSync === 'function') {
        return zlib.brotliDecompressSync(buffer).toString('utf8');
      }
      // If brotli is not supported fall back to plain text to avoid throwing.
    } else if (normalizedEncoding === 'gzip' || normalizedEncoding === 'x-gzip') {
      return zlib.gunzipSync(buffer).toString('utf8');
    } else if (normalizedEncoding === 'deflate' || normalizedEncoding === 'x-deflate') {
      try {
        return zlib.inflateSync(buffer).toString('utf8');
      } catch (inflateErr) {
        return zlib.inflateRawSync(buffer).toString('utf8');
      }
    }
  } catch (error) {
    const err = new Error('Failed to decode JService response');
    err.cause = error;
    throw err;
  }

  return buffer.toString('utf8');
}

function sanitizePayloadText(text) {
  if (typeof text !== 'string') {
    return '';
  }

  const withoutBom = text.replace(/^[\uFEFF\u200B\u200C\u200D\u2060]+/, '');
  const trimmed = withoutBom.trim();
  if (!trimmed) {
    return '';
  }

  const firstJsonCharIndex = trimmed.search(/[\[{]/);
  if (firstJsonCharIndex > 0) {
    return trimmed.slice(firstJsonCharIndex);
  }

  return trimmed;
}

async function requestJson(url) {
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

  let rawBuffer;
  try {
    rawBuffer = await response.buffer();
  } catch (error) {
    const err = new Error('Failed to read JService response');
    err.cause = error;
    throw err;
  }

  const encoding = response.headers.get('content-encoding');
  const bodyText = sanitizePayloadText(decodeResponseBuffer(rawBuffer, encoding));

  if (!bodyText) {
    return null;
  }

  try {
    return JSON.parse(bodyText);
  } catch (error) {
    const err = new Error('Failed to parse JService response');
    err.cause = error;
    err.responseSnippet = bodyText.slice(0, 200);
    throw err;
  }
}

async function fetchRandomClues(count) {
  const size = Math.min(Math.max(Math.floor(count) || 1, 1), MAX_BATCH);
  const url = new URL(RANDOM_ENDPOINT);
  url.searchParams.set('count', size);
  const payload = await requestJson(url.toString());
  const items = Array.isArray(payload) ? payload : [];
  const normalized = [];
  items.forEach((item) => {
    const clue = normalizeClue(item);
    if (clue) normalized.push(clue);
  });

  return normalized;
}

async function fetchCluesByCategory(categoryId, options = {}) {
  const params = {
    category: categoryId,
  };
  if (Number.isFinite(options.value) && options.value > 0) {
    params.value = options.value;
  }
  if (Number.isFinite(options.offset) && options.offset > 0) {
    params.offset = options.offset;
  }
  if (typeof options.minDate === 'string' && options.minDate) {
    params.min_date = options.minDate;
  }
  if (typeof options.maxDate === 'string' && options.maxDate) {
    params.max_date = options.maxDate;
  }

  const endpoint = `${API_BASE}/clues`;
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  const payload = await requestJson(url.toString());
  const items = Array.isArray(payload) ? payload : [];
  const normalized = [];
  items.forEach((item) => {
    const clue = normalizeClue(item);
    if (clue) normalized.push(clue);
  });
  return normalized;
}

async function fetchCategories(options = {}) {
  const params = {};
  if (Number.isFinite(options.count) && options.count > 0) {
    params.count = options.count;
  }
  if (Number.isFinite(options.offset) && options.offset > 0) {
    params.offset = options.offset;
  }
  const endpoint = `${API_BASE}/categories`;
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  const payload = await requestJson(url.toString());
  const items = Array.isArray(payload) ? payload : [];
  const normalized = [];
  items.forEach((item) => {
    const category = normalizeCategory(item);
    if (category) normalized.push(category);
  });
  return normalized;
}

module.exports = {
  fetchRandomClues,
  fetchCluesByCategory,
  fetchCategories,
  normalizeClue,
  decodeHtmlEntities,
  normalizeText,
};
