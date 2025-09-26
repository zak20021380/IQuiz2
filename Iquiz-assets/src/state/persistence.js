import { State, STORAGE_KEY, ensureGroupRosters, DUEL_INVITE_TIMEOUT_MS, DEFAULT_DUEL_FRIENDS } from './state.js';
import { Server } from './server.js';

const SERVER_STORAGE_KEY = 'server_state';

function loadState(){
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (stored) Object.assign(State, stored);
    if (!State.groupBattle || typeof State.groupBattle !== 'object') {
      State.groupBattle = { selectedHostId: '', selectedOpponentId: '', lastResult: null };
    } else {
      State.groupBattle.selectedHostId = State.groupBattle.selectedHostId || '';
      State.groupBattle.selectedOpponentId = State.groupBattle.selectedOpponentId || '';
      if (!State.groupBattle.lastResult || typeof State.groupBattle.lastResult !== 'object') {
        State.groupBattle.lastResult = null;
      }
    }
    if (!State.quiz) State.quiz = {};
    if (State.quiz.diffValue == null) {
      const label = State.quiz.diff;
      if (typeof label === 'string') {
        const lower = label.toLowerCase();
        if (label.indexOf('سخت') >= 0 || lower === 'hard') {
          State.quiz.diffValue = 'hard';
        } else if (label.indexOf('متوسط') >= 0 || lower === 'medium' || lower === 'normal') {
          State.quiz.diffValue = 'medium';
        } else {
          State.quiz.diffValue = 'easy';
        }
      } else {
        State.quiz.diffValue = 'easy';
      }
    }

    if (!Array.isArray(State.quiz.recentQuestions)) {
      State.quiz.recentQuestions = [];
    } else {
      State.quiz.recentQuestions = State.quiz.recentQuestions
        .map((key) => (typeof key === 'string' ? key.trim().toLowerCase() : ''))
        .filter((key) => key.length > 0)
        .slice(-40);
    }

    const serverState = JSON.parse(localStorage.getItem(SERVER_STORAGE_KEY) || '{}');
    if (serverState.limits) Object.assign(Server.limits, serverState.limits);
    if (!Server.limits.duels) {
      Server.limits.duels = { used: 0, lastReset: 0, lastRecovery: 0 };
    }
    if (serverState.pass) Object.assign(Server.pass, serverState.pass);
  } catch (_) {}

  if (!Array.isArray(State.pendingDuels)) {
    State.pendingDuels = [];
  } else {
    State.pendingDuels = State.pendingDuels.filter(duel => duel && duel.id && Number.isFinite(duel.deadline));
  }
  if (!Array.isArray(State.duelInvites)) {
    State.duelInvites = [];
  } else {
    const now = Date.now();
    const normalized = [];
    for (const invite of State.duelInvites) {
      if (!invite || typeof invite !== 'object') continue;
      const idRaw = invite.id ?? invite.inviteId ?? invite.duelId;
      const id = idRaw != null ? String(idRaw) : '';
      if (!id) continue;
      const opponentRaw = typeof invite.opponent === 'string' ? invite.opponent.trim() : '';
      const opponent = opponentRaw || 'حریف ناشناس';
      const avatar = invite.avatar || `https://i.pravatar.cc/100?u=${encodeURIComponent(`${id}-${opponent}`)}`;
      let requestedAt = Number(invite.requestedAt);
      let deadline = Number(invite.deadline);
      if (!Number.isFinite(requestedAt) && Number.isFinite(deadline)) {
        requestedAt = deadline - DUEL_INVITE_TIMEOUT_MS;
      }
      if (!Number.isFinite(deadline) && Number.isFinite(requestedAt)) {
        deadline = requestedAt + DUEL_INVITE_TIMEOUT_MS;
      }
      if (!Number.isFinite(requestedAt) || !Number.isFinite(deadline)) continue;
      requestedAt = Math.round(requestedAt);
      deadline = Math.round(deadline);
      if (deadline <= now) continue;
      normalized.push({
        id,
        opponent,
        avatar,
        requestedAt,
        deadline,
        message: typeof invite.message === 'string' ? invite.message : 'در انتظار پاسخ',
        source: invite.source || 'friend',
      });
    }
    normalized.sort((a, b) => a.deadline - b.deadline);
    State.duelInvites = normalized.slice(0, 12);
  }
  if (!Array.isArray(State.duelHistory)) State.duelHistory = [];
  State.duelHistory = State.duelHistory.slice(0, 20);
  if (!Array.isArray(State.duelFriends)) {
    State.duelFriends = DEFAULT_DUEL_FRIENDS.map(friend => ({ ...friend }));
  } else {
    const normalizedFriends = [];
    const seen = new Set();
    for (const friend of State.duelFriends) {
      if (!friend || typeof friend !== 'object') continue;
      const name = typeof friend.name === 'string' ? friend.name.trim() : '';
      if (!name || seen.has(name)) continue;
      const entry = { ...friend, name };
      normalizedFriends.push(entry);
      seen.add(name);
      if (normalizedFriends.length >= 20) break;
    }
    State.duelFriends = normalizedFriends.length
      ? normalizedFriends
      : DEFAULT_DUEL_FRIENDS.map(friend => ({ ...friend }));
  }
  if (State.duelOpponent && typeof State.duelOpponent === 'object') {
    const rawOpponent = State.duelOpponent;
    const name = typeof rawOpponent.name === 'string' ? rawOpponent.name.trim() : '';
    let avatar = typeof rawOpponent.avatar === 'string' ? rawOpponent.avatar : '';
    let duelId = typeof rawOpponent.duelId === 'string' ? rawOpponent.duelId : '';
    if (!duelId && Array.isArray(State.pendingDuels)) {
      const matched = State.pendingDuels.find(duel => duel && duel.opponent === name);
      if (matched) duelId = matched.id;
      else if (State.pendingDuels.length === 1 && State.pendingDuels[0]?.id) {
        duelId = State.pendingDuels[0].id;
      }
    }
    const hasPending = duelId
      ? Array.isArray(State.pendingDuels) && State.pendingDuels.some(duel => duel && duel.id === duelId)
      : Array.isArray(State.pendingDuels) && State.pendingDuels.length > 0;
    if (!name || !hasPending) {
      State.duelOpponent = null;
    } else {
      if (!avatar) {
        avatar = `https://i.pravatar.cc/100?u=${encodeURIComponent(name)}`;
      }
      const normalizedOpponent = {
        name,
        avatar,
        source: rawOpponent.source || 'invite'
      };
      if (rawOpponent.id != null) normalizedOpponent.id = rawOpponent.id;
      if (rawOpponent.inviteId != null) normalizedOpponent.inviteId = rawOpponent.inviteId;
      if (duelId) normalizedOpponent.duelId = duelId;
      const acceptedAt = Number(rawOpponent.acceptedAt);
      if (Number.isFinite(acceptedAt) && acceptedAt > 0) {
        normalizedOpponent.acceptedAt = Math.round(acceptedAt);
      }
      State.duelOpponent = normalizedOpponent;
    }
  } else {
    State.duelOpponent = null;
  }
  ensureGroupRosters();
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(State));
  localStorage.setItem(SERVER_STORAGE_KEY, JSON.stringify({
    limits: Server.limits,
    pass: Server.pass
  }));
}

export { loadState, saveState };
