'use strict';

const zlib = require('zlib');

const env = require('../../config/env');
const { fetchWithRetry } = require('../../lib/http');

const DEFAULT_BASE = 'http://jservice.io/api';

function sanitizeBase(base) {
  if (typeof base !== 'string') {
    return '';
  }
  const trimmed = base.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.replace(/\/+$/, '');
}

function deriveBaseFromUrl(url) {
  if (typeof url !== 'string') {
    return '';
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }

  const sanitized = trimmed.replace(/\/+$/, '');
  try {
    const parsed = new URL(sanitized);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      segments.pop();
      parsed.pathname = segments.length ? `/${segments.join('/')}` : '/';
    }
    parsed.search = '';
    parsed.hash = '';
    return sanitizeBase(parsed.toString());
  } catch (error) {
    const withoutQuery = sanitized.split(/[?#]/)[0];
    const fallbackNormalized = sanitizeBase(withoutQuery);
    const schemeIndex = fallbackNormalized.indexOf('://');
    const minimumSliceIndex = schemeIndex >= 0 ? schemeIndex + 3 : 0;
    const lastSlashIndex = fallbackNormalized.lastIndexOf('/');
    if (lastSlashIndex > minimumSliceIndex) {
      return fallbackNormalized.slice(0, lastSlashIndex);
    }
  }

  return '';
}

const triviaEnv = (env && env.trivia) || {};
let resolvedBase = sanitizeBase(triviaEnv.jserviceBase) || DEFAULT_BASE;
const baseIsDefault = resolvedBase === DEFAULT_BASE;
const defaultRandomEndpoint = `${resolvedBase}/random`;
const legacyRandom = typeof triviaEnv.jserviceUrl === 'string' ? triviaEnv.jserviceUrl.trim() : '';
const sanitizedLegacyRandom = sanitizeBase(legacyRandom);
const sanitizedDefaultRandomEndpoint = sanitizeBase(defaultRandomEndpoint);
let randomEndpoint = defaultRandomEndpoint;

if (sanitizedLegacyRandom && sanitizedLegacyRandom !== sanitizedDefaultRandomEndpoint) {
  randomEndpoint = legacyRandom;
  if (baseIsDefault) {
    const derivedBase = deriveBaseFromUrl(legacyRandom);
    if (derivedBase) {
      resolvedBase = derivedBase;
    }
  }
}

const API_ENDPOINTS = {
  random: randomEndpoint,
  clues: `${resolvedBase}/clues`,
  categories: `${resolvedBase}/categories`,
};
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

async function fetchRandomClues(count) {
  const size = Math.min(Math.max(Math.floor(count) || 1, 1), MAX_BATCH);
  const url = `${API_ENDPOINTS.random}?count=${size}`;
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
    return [];
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
