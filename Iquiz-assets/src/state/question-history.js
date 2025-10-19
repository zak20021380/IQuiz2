import { State } from './state.js';
import { saveState } from './persistence.js';

const MAX_RECENT_IDS = 200;

function normalizeId(value) {
  if (value == null) return '';
  const str = typeof value === 'string' ? value.trim() : String(value).trim();
  return str;
}

function ensureRecentIdState() {
  if (!State.quiz || typeof State.quiz !== 'object') {
    State.quiz = {};
  }
  if (!Array.isArray(State.quiz.recentQuestionIds)) {
    State.quiz.recentQuestionIds = [];
  }
  return State.quiz.recentQuestionIds;
}

export function getRecentQuestionIds() {
  const list = ensureRecentIdState();
  return list.slice(0, MAX_RECENT_IDS);
}

export function rememberQuestionIds(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return getRecentQuestionIds();
  }

  const incoming = [];
  const incomingSeen = new Set();
  for (let idx = 0; idx < ids.length; idx += 1) {
    const normalized = normalizeId(ids[idx]);
    if (!normalized || incomingSeen.has(normalized)) continue;
    incoming.push(normalized);
    incomingSeen.add(normalized);
  }

  if (!incoming.length) {
    return getRecentQuestionIds();
  }

  const existing = ensureRecentIdState();
  const merged = [];
  const seen = new Set();

  for (let i = 0; i < incoming.length; i += 1) {
    const id = incoming[i];
    if (seen.has(id)) continue;
    merged.push(id);
    seen.add(id);
    if (merged.length >= MAX_RECENT_IDS) break;
  }

  for (let i = 0; i < existing.length && merged.length < MAX_RECENT_IDS; i += 1) {
    const id = normalizeId(existing[i]);
    if (!id || seen.has(id)) continue;
    merged.push(id);
    seen.add(id);
  }

  State.quiz.recentQuestionIds = merged.slice(0, MAX_RECENT_IDS);
  saveState();
  return State.quiz.recentQuestionIds.slice();
}

export function rememberQuestionEntities(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return getRecentQuestionIds();
  }
  const ids = [];
  for (let idx = 0; idx < items.length; idx += 1) {
    const item = items[idx];
    if (!item || typeof item !== 'object') continue;
    const id = normalizeId(item._id || item.id || item.uid || item.publicId);
    if (!id) continue;
    ids.push(id);
  }
  return rememberQuestionIds(ids);
}

export const QuestionHistory = Object.freeze({
  getRecentQuestionIds,
  rememberQuestionIds,
  rememberQuestionEntities,
});
