'use strict';

const env = require('../../config/env');
const { fetchWithRetry } = require('../../lib/http');

const DEFAULT_BASE_URL = 'https://cluebase.lukelav.in';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const RETRY_DELAYS = [300, 600, 1200];

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
  divide: '÷'
};

const HTML_TAG_REGEX = /<[^>]*>/g;
const TRAILING_PARENTHESIS_PATTERN = /\s*\((?:[^)(]|\([^)(]*\))*\)\s*$/;
const QUOTE_CHARS = /^["'`]+|["'`]+$/g;

function getBaseUrl() {
  const configured = env?.trivia?.cluebase?.url;
  const base = typeof configured === 'string' && configured.trim()
    ? configured.trim()
    : DEFAULT_BASE_URL;
  return base.replace(/\/+$/, '');
}

function getDefaultLimit() {
  const configured = env?.trivia?.cluebase?.limit;
  if (Number.isFinite(configured)) {
    return clampLimit(configured);
  }
  return DEFAULT_LIMIT;
}

function clampLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  if (parsed > MAX_LIMIT) {
    return MAX_LIMIT;
  }
  return parsed;
}

function decodeHtmlEntities(value) {
  if (typeof value !== 'string' || value.indexOf('&') === -1) {
    return typeof value === 'string' ? value : '';
  }
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const num = isHex
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
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

function sanitizePlainText(value) {
  if (value === undefined || value === null) return '';
  const decoded = decodeHtmlEntities(String(value));
  const withoutTags = decoded.replace(HTML_TAG_REGEX, ' ');
  return withoutTags.replace(/\s+/g, ' ').trim();
}

function stripTrailingParentheses(text) {
  if (!text) return '';
  let result = text;
  let previous;
  do {
    previous = result;
    result = result.replace(TRAILING_PARENTHESIS_PATTERN, '').trim();
  } while (result !== previous);
  return result;
}

function sanitizeAnswer(value) {
  let sanitized = sanitizePlainText(value);
  sanitized = stripTrailingParentheses(sanitized);
  sanitized = sanitized.replace(QUOTE_CHARS, '');
  return sanitized.trim();
}

function sanitizeCategory(value) {
  const normalized = sanitizePlainText(value);
  return normalized || 'General Knowledge';
}

function mapDifficulty(value) {
  const score = Number.parseInt(value, 10);
  if (!Number.isFinite(score)) return 'medium';
  if (score <= 200) return 'easy';
  if (score <= 600) return 'medium';
  return 'hard';
}

function normalizeClue(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const idCandidate = raw.id ?? raw.clue_id ?? raw.clueId;
  const id = Number.isFinite(Number(idCandidate)) ? Number(idCandidate) : null;
  const text = sanitizePlainText(raw.clue ?? raw.question ?? '');
  const response = sanitizeAnswer(raw.response ?? raw.answer ?? '');
  const category = sanitizeCategory(raw.category ?? raw.category_name ?? raw.categoryTitle ?? '');

  if (!id || !text || !response) {
    return null;
  }

  const valueRaw = Number.parseInt(raw.value, 10);
  const round = sanitizePlainText(raw.round ?? raw.round_name ?? '');
  const gameIdCandidate = raw.gameId ?? raw.game_id ?? raw.gameid;
  const gameId = gameIdCandidate !== undefined && gameIdCandidate !== null
    ? String(gameIdCandidate).trim() || null
    : null;

  return {
    id,
    clue: text,
    response,
    category,
    value: Number.isFinite(valueRaw) ? valueRaw : null,
    difficulty: mapDifficulty(valueRaw),
    round: round || null,
    gameId,
  };
}

async function fetchRandomClues(limit = getDefaultLimit()) {
  const requestLimit = clampLimit(limit);
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/clues/random?limit=${requestLimit}`;

  let response;
  try {
    response = await fetchWithRetry(url, {
      headers: { Accept: 'application/json' },
      retries: RETRY_DELAYS.length,
      retryDelay: ({ attempt }) => RETRY_DELAYS[Math.min(attempt - 1, RETRY_DELAYS.length - 1)],
      timeout: 12000,
    });
  } catch (error) {
    const err = new Error(`Failed to reach Cluebase: ${error.message}`);
    err.cause = error;
    throw err;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    const err = new Error('Failed to parse Cluebase response');
    err.cause = error;
    throw err;
  }

  const itemsRaw = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.clues)
      ? payload.clues
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  const items = [];
  for (const entry of itemsRaw) {
    const clue = normalizeClue(entry);
    if (clue) items.push(clue);
  }

  return {
    url,
    status: response.status,
    length: items.length,
    items,
  };
}

module.exports = {
  fetchRandomClues,
  sanitizePlainText,
  sanitizeAnswer,
  sanitizeCategory,
  stripTrailingParentheses,
  mapDifficulty,
  getDefaultLimit,
  clampLimit,
  getBaseUrl,
};
