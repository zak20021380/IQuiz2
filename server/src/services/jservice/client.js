'use strict';

const zlib = require('zlib');

const env = require('../../config/env');
const { fetchWithRetry } = require('../../lib/http');

const DEFAULT_BASE_URL = 'https://jservice.io/api';
const CONFIGURED_BASE = env && env.trivia && env.trivia.jserviceBase;
const JSERVICE_BASE = (CONFIGURED_BASE || DEFAULT_BASE_URL).replace(/\/+$/, '');
const MAX_BATCH = 100;
const RETRY_DELAYS = [250, 500, 1000];

function buildUrl(endpoint, params = {}) {
  const normalizedPath = typeof endpoint === 'string' ? endpoint.trim().replace(/^\/+/, '') : '';
  const base = `${JSERVICE_BASE}/`;
  const url = new URL(normalizedPath || '', base);
  const searchParams = new URLSearchParams();

  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry === undefined || entry === null || entry === '') return;
          searchParams.append(key, entry);
        });
      } else {
        searchParams.append(key, value);
      }
    });
  }

  const queryString = searchParams.toString();
  if (queryString) {
    url.search = queryString;
  }

  return url.toString();
}

async function requestFromApi(endpoint, params = {}) {
  const url = buildUrl(endpoint, params);
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

  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch (error) {
    const err = new Error('Failed to parse JService response');
    err.cause = error;
    err.responseSnippet = bodyText.slice(0, 200);
    throw err;
  }

  return payload;
}

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
 * @returns {{id:number, category:{id:(number|null), title:string, clues_count?:number}, question:string, answer:string, airdate:string|null, value:(number|null)}|null}
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
  const categoryCluesCountRaw = raw.category && Number.parseInt(raw.category.clues_count, 10);
  const valueRaw = Number.parseInt(raw.value, 10);
  const categoryTitle = normalizeText(categoryTitleRaw || '');
  const categoryId = Number.isFinite(categoryIdRaw) ? categoryIdRaw : null;
  const cluesCount = Number.isFinite(categoryCluesCountRaw) ? categoryCluesCountRaw : null;
  const category = {
    id: categoryId,
    title: categoryTitle || 'General',
  };
  if (Number.isFinite(cluesCount)) {
    category.clues_count = cluesCount;
  }
  return {
    id,
    category,
    question,
    answer,
    airdate: normalizeAirdate(raw.airdate || null),
    value: Number.isFinite(valueRaw) ? valueRaw : null
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
    // Some JService responses incorrectly advertise compression even though the
    // payload is plain text. Attempting to decompress such responses throws a
    // `Z_DATA_ERROR`. In that case we gracefully fall back to treating the
    // buffer as an uncompressed UTF-8 string instead of failing the request.
    if (error && (error.code === 'Z_DATA_ERROR' || error.code === 'ERR_Z_DATA_ERROR' || error.errno === -3)) {
      return buffer.toString('utf8');
    }

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

function normalizeClueList(payload) {
  const items = Array.isArray(payload) ? payload : [];
  const normalized = [];
  items.forEach((item) => {
    const clue = normalizeClue(item);
    if (clue) normalized.push(clue);
  });
  return normalized;
}

async function random(count) {
  const parsed = Number.parseInt(count, 10);
  const size = Math.min(Math.max(Number.isFinite(parsed) ? parsed : 1, 1), MAX_BATCH);
  const payload = await requestFromApi('random', { count: size });
  if (!payload) return [];
  return normalizeClueList(payload);
}

async function clues(params = {}) {
  const payload = await requestFromApi('clues', params);
  if (!payload) return [];
  return normalizeClueList(payload);
}

async function categories({ count, offset } = {}) {
  const normalizedParams = {};
  if (count !== undefined) {
    const parsedCount = Number.parseInt(count, 10);
    if (Number.isFinite(parsedCount)) {
      normalizedParams.count = Math.min(Math.max(parsedCount, 1), MAX_BATCH);
    }
  }
  if (offset !== undefined) {
    const parsedOffset = Number.parseInt(offset, 10);
    if (Number.isFinite(parsedOffset) && parsedOffset >= 0) {
      normalizedParams.offset = parsedOffset;
    }
  }
  const payload = await requestFromApi('categories', normalizedParams);
  if (!payload) return [];
  return Array.isArray(payload) ? payload : [];
}

module.exports = {
  random,
  clues,
  categories,
  normalizeClue,
  decodeHtmlEntities,
  normalizeText,
};
