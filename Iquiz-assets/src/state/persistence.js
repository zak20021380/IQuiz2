import { State, STORAGE_KEY, ensureGroupRosters } from './state.js';
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
  if (!Array.isArray(State.duelHistory)) State.duelHistory = [];
  State.duelHistory = State.duelHistory.slice(0, 20);
  State.duelOpponent = null;
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
