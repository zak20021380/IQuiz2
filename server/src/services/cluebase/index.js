'use strict';

const { fetchRandomClues } = require('./client');

const MAX_REQUEST = 20;

function clampCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(parsed, 1), MAX_REQUEST);
}

function mapForResponse(clue) {
  if (!clue || typeof clue !== 'object') {
    return {
      id: null,
      category: 'General',
      question: '',
      answer: '',
      value: null,
      round: null,
      gameId: null,
    };
  }

  return {
    id: clue.id ?? null,
    category: clue.category ?? 'General',
    question: clue.clue ?? '',
    answer: clue.response ?? '',
    value: typeof clue.value === 'number' ? clue.value : null,
    round: clue.round || null,
    gameId: clue.gameId || null,
  };
}

async function random(count) {
  const requested = clampCount(count);
  const result = await fetchRandomClues(requested);
  const items = Array.isArray(result?.items) ? result.items.slice(0, requested) : [];
  const data = items.map(mapForResponse);
  return {
    ok: true,
    data,
    meta: {
      requested,
      delivered: data.length,
      status: result?.status ?? null,
    },
  };
}

async function clues(params = {}) {
  const requested = clampCount(params?.count ?? MAX_REQUEST);
  const result = await fetchRandomClues(requested);
  const items = Array.isArray(result?.items) ? result.items.slice(0, requested) : [];
  const data = items.map(mapForResponse);
  return {
    ok: true,
    data,
    meta: {
      count: data.length,
      status: result?.status ?? null,
    },
  };
}

async function categories() {
  return {
    ok: true,
    data: [],
    meta: { count: 0 },
  };
}

module.exports = {
  random,
  clues,
  categories,
  clampCount,
};
