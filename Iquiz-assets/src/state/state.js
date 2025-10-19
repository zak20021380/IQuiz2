import { getAdminSettings, subscribeToAdminSettings } from '../config/admin-settings.js';

const STORAGE_KEY = 'quiz_webapp_pro_state_v2_fa';

let ADMIN_SETTINGS = getAdminSettings();
let GENERAL_SETTINGS = ADMIN_SETTINGS?.general || {};
let DEFAULT_QUESTION_TIME = Math.max(5, Number(GENERAL_SETTINGS.questionTime) || 30);
let DEFAULT_MAX_QUESTIONS = Math.max(3, Number(GENERAL_SETTINGS.maxQuestions) || 10);

const DAY_MS = 24 * 60 * 60 * 1000;
const DUEL_INVITE_TIMEOUT_MS = DAY_MS;

const DEFAULT_DUEL_INVITES = [];

const DEFAULT_DUEL_FRIENDS = Object.freeze([]);

function normalizeKeyCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
}

function normalizeKeyAdjustment(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
}

function sanitizeRosterPlayer(player){
  if (!player || typeof player !== 'object') return null;
  const name = typeof player.name === 'string' ? player.name.trim() : '';
  const avatar = typeof player.avatar === 'string' ? player.avatar : '';
  const role = typeof player.role === 'string' ? player.role : '';

  const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const normalized = { name, avatar, role };
  const power = toNumber(player.power);
  const accuracy = toNumber(player.accuracy);
  const avgScore = toNumber(player.avgScore);
  const speed = toNumber(player.speed);

  if (!name && !avatar && !role && power === null && accuracy === null && avgScore === null && speed === null) {
    return null;
  }

  if (power !== null) normalized.power = Math.round(power);
  if (accuracy !== null) normalized.accuracy = Math.round(accuracy);
  if (avgScore !== null) normalized.avgScore = Math.round(avgScore);
  if (speed !== null) normalized.speed = speed;

  return normalized;
}

const State = {
  user:{ id:'', name:'', username:'', avatar:'', province:'', group:'', groupId:'' },
  score:0, coins:0, keys:0, lives:3, vip:false,
  streak:0, lastClaim:0, boostUntil:0,
  theme:'ocean',
  duelOpponent:null,
  duelWins:0,
  duelLosses:0,
  duelDraws:0,
  pendingDuels:[],
  duelInvites: DEFAULT_DUEL_INVITES.map(invite => ({ ...invite })),
  duelFriends: DEFAULT_DUEL_FRIENDS.map(friend => ({ ...friend })),
  duelHistory:[],
  achievements:{ firstWin:false, tenCorrect:false, streak3:false, vipBought:false },
  settings:{ sound:true, haptics:true, blockDuels:false },
  leaderboard:[],
  provinces: [],
  groups: [],
  quiz:{
    inProgress:false, answered:false, correctIndex:-1,
    duration:DEFAULT_QUESTION_TIME, remain:DEFAULT_QUESTION_TIME, timer:null,
    list:[], idx:0, cat:'عمومی', diff:'آسان', diffValue:'easy',
    sessionEarned:0, results:[],
    baseDuration: DEFAULT_QUESTION_TIME,
    maxQuestions: DEFAULT_MAX_QUESTIONS,
    correctStreak: 0,
    recentQuestions: [],
    recentQuestionIds: [],
    pendingAnswerIds: []
  },
  notifications:[],
  groupBattle: { selectedHostId: '', selectedOpponentId: '', lastResult: null },
};

const INTERNAL_KEY_STATE = { value: normalizeKeyCount(State.lives) };

Object.defineProperty(State, 'lives', {
  get() {
    return INTERNAL_KEY_STATE.value;
  },
  set(value) {
    INTERNAL_KEY_STATE.value = normalizeKeyCount(value);
  },
  enumerable: true,
  configurable: false,
});

function spendKeys(amount = 1) {
  const deduction = normalizeKeyAdjustment(amount);
  if (deduction <= 0) return State.lives;
  const remaining = INTERNAL_KEY_STATE.value - deduction;
  State.lives = remaining;
  return State.lives;
}

function ensureGroupRosters(){
  if (!Array.isArray(State.groups)) {
    State.groups = [];
    return;
  }

  State.groups.forEach(group => {
    if (!group || typeof group !== 'object') return;

    const roster = Array.isArray(group.roster) ? group.roster : [];
    const normalized = roster
      .map(sanitizeRosterPlayer)
      .filter(Boolean)
      .slice(0, 10);

    group.roster = normalized;

    if (!Array.isArray(group.memberList)) {
      group.memberList = [];
    } else {
      group.memberList = group.memberList
        .map(name => (typeof name === 'string' ? name.trim() : ''))
        .filter(Boolean);
    }

    const memberSet = new Set(group.memberList);
    normalized.forEach(player => {
      if (player.name) memberSet.add(player.name);
    });

    const knownMembers = memberSet.size;
    if (!Number.isFinite(group.members) || group.members < knownMembers) {
      group.members = knownMembers;
    } else {
      group.members = Math.max(0, Math.round(group.members));
    }

    if (!Number.isFinite(group.wins)) group.wins = 0;
    if (!Number.isFinite(group.losses)) group.losses = 0;
    group.wins = Math.max(0, Math.round(group.wins));
    group.losses = Math.max(0, Math.round(group.losses));
  });
}

function getUserGroup(){
  return State.groups.find(g => g.memberList?.includes(State.user.name));
}

function isUserGroupAdmin(){
  return State.groups.some(g => g.admin === State.user.name);
}

function isUserInGroup(){
  return !!State.user.group || !!getUserGroup();
}

function applyAdminGeneralSettings(settings) {
  ADMIN_SETTINGS = settings || {};
  GENERAL_SETTINGS = ADMIN_SETTINGS?.general || {};
  const nextQuestionTime = Math.max(5, Number(GENERAL_SETTINGS.questionTime) || 30);
  const nextMaxQuestions = Math.max(3, Number(GENERAL_SETTINGS.maxQuestions) || 10);
  DEFAULT_QUESTION_TIME = nextQuestionTime;
  DEFAULT_MAX_QUESTIONS = nextMaxQuestions;

  if (State && State.quiz) {
    State.quiz.baseDuration = nextQuestionTime;
    if (!State.quiz.inProgress) {
      State.quiz.duration = nextQuestionTime;
      State.quiz.remain = nextQuestionTime;
    }
    State.quiz.maxQuestions = nextMaxQuestions;
  }
}

subscribeToAdminSettings((next) => {
  applyAdminGeneralSettings(next);
});

ensureGroupRosters();

export {
  State,
  STORAGE_KEY,
  DEFAULT_QUESTION_TIME,
  DEFAULT_MAX_QUESTIONS,
  ensureGroupRosters,
  getUserGroup,
  isUserGroupAdmin,
  isUserInGroup,
  spendKeys,
  DUEL_INVITE_TIMEOUT_MS,
  DEFAULT_DUEL_FRIENDS
};
