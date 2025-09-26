import Net from './net.js';

export const API_BASE = '/api/public';
const GROUP_BATTLES_BASE = '/api/group-battles';

export async function config() {
  return await Net.jget(`${API_BASE}/config`);
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
  const query = qs.toString();
  const url = query ? `${API_BASE}/questions?${query}` : `${API_BASE}/questions`;
  return await Net.jget(url);
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

const Api = { config, categories, questions, provinces, groups, groupBattles, startGroupBattle };
export default Api;
