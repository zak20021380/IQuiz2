import Net, { createRequestHeaders } from './net.js';
import { getRecentQuestionIds } from '../state/question-history.js';

export const API_BASE = '/api/public';
const GROUP_BATTLES_BASE = '/api/group-battles';
const GROUPS_BASE = '/api/groups';
const DUELS_BASE = '/api/duels';
const PUBLIC_QUESTIONS_NEXT = '/api/questions/public/next';
const LEGACY_GENERAL_SLUG = 'general';
const DEFAULT_GENERAL_SLUG = 'general-knowledge';

function normalizeCategorySlugValue(categorySlug, categoryId) {
  const candidates = [categorySlug, categoryId];
  for (let idx = 0; idx < candidates.length; idx += 1) {
    const candidate = candidates[idx];
    if (candidate == null) continue;
    const raw = String(candidate).trim();
    if (!raw) continue;
    const lower = raw.toLowerCase();
    if (lower === LEGACY_GENERAL_SLUG) return DEFAULT_GENERAL_SLUG;
    return lower;
  }
  return '';
}

export async function config() {
  return await Net.jget(`${API_BASE}/config`);
}

export async function content() {
  return await Net.jget(`${API_BASE}/content`);
}

export async function categories() {
  return await Net.jget(`${API_BASE}/categories`);
}

export async function questions({ categoryId, categorySlug, count, difficulty } = {}) {
  const qs = new URLSearchParams();
  const numericCount = Number(count);
  if (Number.isFinite(numericCount) && numericCount > 0) {
    const limit = Math.max(1, Math.min(50, Math.trunc(numericCount)));
    qs.set('limit', String(limit));
  }

  const slug = normalizeCategorySlugValue(categorySlug, categoryId);
  if (slug) {
    qs.set('categorySlug', slug);
  }
  if (difficulty) {
    qs.set('difficulty', String(difficulty));
  }

  const query = qs.toString();
  const url = query ? `${PUBLIC_QUESTIONS_NEXT}?${query}` : PUBLIC_QUESTIONS_NEXT;
  const answeredIds = getRecentQuestionIds();

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: createRequestHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ answeredIds }),
      cache: 'no-store',
    });
  } catch (error) {
    const friendlyMessage = 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کن و دوباره تلاش کن.';
    const wrapped = new Error(friendlyMessage);
    wrapped.cause = error;
    wrapped.isNetworkError = true;
    wrapped.friendlyMessage = friendlyMessage;
    throw wrapped;
  }

  let payload = null;
  try {
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (_) {
        payload = null;
      }
    }
  } catch (_) {
    payload = null;
  }

  if (!response.ok) {
    let serverMessage = '';
    if (payload && typeof payload === 'object') {
      const messageCandidate = payload.message || payload.error || payload.reason;
      if (typeof messageCandidate === 'string') {
        serverMessage = messageCandidate.trim();
      }
    }
    const friendlyMessage = serverMessage || 'در دریافت سوالات جدید مشکلی پیش آمد. لطفاً دوباره تلاش کن.';
    const error = new Error(friendlyMessage);
    error.status = response.status;
    error.payload = payload;
    error.friendlyMessage = friendlyMessage;
    throw error;
  }

  return payload;
}

export async function recordAnswers(questionIds = []) {
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return null;
  }
  return await Net.jpost(`${API_BASE}/answers`, { questionIds });
}

export async function provinces() {
  return await Net.jget(`${API_BASE}/provinces`);
}

export async function groups() {
  return await Net.jget(GROUPS_BASE);
}

export async function createGroup(payload) {
  return await Net.jpost(GROUPS_BASE, payload);
}

export async function joinGroup(groupId) {
  if (!groupId) return null;
  return await Net.jpost(`${GROUPS_BASE}/${groupId}/join`, {});
}

export async function leaveGroup(groupId) {
  if (!groupId) return null;
  return await Net.jpost(`${GROUPS_BASE}/${groupId}/leave`, {});
}

export async function deleteGroup(groupId) {
  if (!groupId) return null;
  return await Net.jdel(`${GROUPS_BASE}/${groupId}`);
}

export async function groupBattles() {
  return await Net.jget(GROUP_BATTLES_BASE);
}

export async function leaderboard() {
  return await Net.jget(`${API_BASE}/leaderboard`);
}

export async function submitProgress(payload) {
  return await Net.jpost(`${API_BASE}/progress`, payload);
}

export async function updateProfile(payload) {
  return await Net.jpatch(`${API_BASE}/profile`, payload);
}

export async function registerProfile(payload) {
  return await Net.jpost(`${API_BASE}/register`, payload);
}

export async function startGroupBattle(payload) {
  return await Net.jpost(GROUP_BATTLES_BASE, payload);
}

export async function duelOverview(params = {}) {
  const qs = new URLSearchParams();
  if (params.userId) qs.set('userId', params.userId);
  if (params.userName) qs.set('userName', params.userName);
  if (params.avatar) qs.set('avatar', params.avatar);
  const query = qs.toString();
  return await Net.jget(query ? `${DUELS_BASE}/overview?${query}` : `${DUELS_BASE}/overview`);
}

export async function duelMatchmaking(payload) {
  return await Net.jpost(`${DUELS_BASE}/matchmaking`, payload);
}

export async function duelSendInvite(payload) {
  return await Net.jpost(`${DUELS_BASE}/invites`, payload);
}

export async function duelAcceptInvite(inviteId, payload) {
  return await Net.jpost(`${DUELS_BASE}/invites/${inviteId}/accept`, payload);
}

export async function duelDeclineInvite(inviteId, payload) {
  return await Net.jpost(`${DUELS_BASE}/invites/${inviteId}/decline`, payload);
}

export async function duelAssignCategory(duelId, roundIndex, payload) {
  return await Net.jpost(`${DUELS_BASE}/${duelId}/rounds/${roundIndex}/category`, payload);
}

export async function duelSubmitRound(duelId, roundIndex, payload) {
  return await Net.jpost(`${DUELS_BASE}/${duelId}/rounds/${roundIndex}/result`, payload);
}

const Api = {
  config,
  content,
  categories,
  questions,
  provinces,
  groups,
  createGroup,
  joinGroup,
  leaveGroup,
  deleteGroup,
  groupBattles,
  startGroupBattle,
  duelOverview,
  duelMatchmaking,
  duelSendInvite,
  duelAcceptInvite,
  duelDeclineInvite,
  duelAssignCategory,
  duelSubmitRound,
  recordAnswers,
  leaderboard,
  submitProgress,
  updateProfile,
  registerProfile,
};
export default Api;
