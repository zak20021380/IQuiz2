import Net from './net.js';
import { getGuestId } from '../utils/guest.js';

export const API_BASE = '/api/public';
const GROUP_BATTLES_BASE = '/api/group-battles';
const DUELS_BASE = '/api/duels';

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
  if (categoryId) qs.set('categoryId', categoryId);
  if (categorySlug) qs.set('categorySlug', categorySlug);
  if (count) qs.set('count', count);
  if (difficulty) qs.set('difficulty', difficulty);
  const guestId = getGuestId();
  if (guestId) qs.set('guestId', guestId);
  const query = qs.toString();
  const url = query ? `${API_BASE}/questions?${query}` : `${API_BASE}/questions`;
  return await Net.jget(url);
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
  return await Net.jget(`${GROUP_BATTLES_BASE}/groups`);
}

export async function groupBattles() {
  return await Net.jget(GROUP_BATTLES_BASE);
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
  groupBattles,
  startGroupBattle,
  duelOverview,
  duelMatchmaking,
  duelSendInvite,
  duelAcceptInvite,
  duelDeclineInvite,
  duelAssignCategory,
  duelSubmitRound,
  recordAnswers
};
export default Api;
