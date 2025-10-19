import { getAdminSettings, subscribeToAdminSettings } from '../config/admin-settings.js';

const STORAGE_KEY = 'quiz_webapp_pro_state_v2_fa';

let ADMIN_SETTINGS = getAdminSettings();
let GENERAL_SETTINGS = ADMIN_SETTINGS?.general || {};
let DEFAULT_QUESTION_TIME = Math.max(5, Number(GENERAL_SETTINGS.questionTime) || 30);
let DEFAULT_MAX_QUESTIONS = Math.max(3, Number(GENERAL_SETTINGS.maxQuestions) || 10);

const ROSTER_ROLES = ['دانش عمومی','رهبر استراتژی','متخصص علوم','استاد ادبیات','تحلیل‌گر داده','هوش تاریخی','ریاضی‌دان','کارشناس فناوری','حل مسئله سریع','هوش مصنوعی'];
const ROSTER_FIRST_NAMES = ['آرمان','نیلوفر','شروین','فرناز','پارسا','یاسمن','کاوه','مینا','هومن','هستی','رامتین','سولماز','آرین','بهاره','پریسا','بردیا','کیانا','مانی','ترانه','هانیه'];
const ROSTER_LAST_NAMES = ['قاسمی','حسینی','موسوی','محمدی','کاظمی','نعمتی','شکیبا','زارع','فاضلی','رستگار','صادقی','نیک‌پور','شریفی','فرهادی','پاکزاد','نادری','گودرزی','مرادی','توکلی','شفیعی'];

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

function stringToSeed(str){
  if (!str) return 1;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 2147483647;
  }
  return hash || 1;
}

function seededRandom(seed){
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function seededFloat(seed, min, max){
  return min + (max - min) * seededRandom(seed);
}

function pickFrom(list, seed, offset = 0){
  if (!Array.isArray(list) || list.length === 0) return '';
  const idx = Math.abs(Math.floor(seed + offset)) % list.length;
  return list[idx];
}

function createSyntheticNameForGroup(group, index){
  const seed = stringToSeed(`${group?.id || ''}-${group?.name || ''}`);
  const first = pickFrom(ROSTER_FIRST_NAMES, seed, index * 3);
  const last = pickFrom(ROSTER_LAST_NAMES, seed, index * 7);
  return `${first} ${last}`.trim();
}

function buildRosterEntry(name, index, baseSeed){
  const seed = baseSeed + index * 17;
  const role = pickFrom(ROSTER_ROLES, seed, index * 5) || 'دانش عمومی';
  const power = Math.round(Math.max(68, Math.min(96, seededFloat(seed, 74, 94))));
  const accuracy = Math.round(Math.max(60, Math.min(97, seededFloat(seed + 5, 72, 95))));
  const avgScore = Math.round(Math.max(640, Math.min(940, seededFloat(seed + 9, 700, 920))));
  const speed = Math.round(Math.max(5.2, Math.min(9.0, seededFloat(seed + 13, 5.6, 8.6))) * 10) / 10;
  return {
    name,
    avatar: `https://i.pravatar.cc/100?u=${encodeURIComponent(name)}`,
    role,
    power,
    accuracy,
    avgScore,
    speed
  };
}

function generateRosterFromMembers(group, desiredCount = 10){
  const roster = [];
  const used = new Set();
  const baseSeed = stringToSeed(`${group?.id || ''}-${group?.name || ''}`);
  const baseMembers = Array.isArray(group?.memberList) ? group.memberList.filter(Boolean) : [];
  baseMembers.forEach((memberName, idx) => {
    if (used.has(memberName)) return;
    const entry = buildRosterEntry(memberName, idx, baseSeed);
    roster.push(entry);
    used.add(memberName);
  });
  let idx = roster.length;
  while (roster.length < desiredCount){
    const synthetic = createSyntheticNameForGroup(group, idx);
    if (used.has(synthetic)) { idx++; continue; }
    const entry = buildRosterEntry(synthetic, idx, baseSeed);
    roster.push(entry);
    used.add(synthetic);
    idx++;
  }
  return roster.slice(0, desiredCount);
}

function normalizeRosterMember(player, fallback, index, group){
  const source = player && typeof player === 'object' ? player : {};
  const baseSeed = stringToSeed(`${group?.id || ''}-${group?.name || ''}-${index}`);
  const fallbackSource = (fallback && typeof fallback === 'object' && Object.keys(fallback).length)
    ? fallback
    : buildRosterEntry(createSyntheticNameForGroup(group, index), index, baseSeed);
  const name = source.name || fallbackSource.name || createSyntheticNameForGroup(group, index);
  const avatar = source.avatar || fallbackSource.avatar || `https://i.pravatar.cc/100?u=${encodeURIComponent(name)}`;
  const role = source.role || fallbackSource.role || pickFrom(ROSTER_ROLES, baseSeed, index * 3) || 'دانش عمومی';
  const power = Number.isFinite(source.power) ? Math.round(source.power) : Number.isFinite(fallbackSource.power) ? Math.round(fallbackSource.power) : Math.round(Math.max(68, Math.min(96, seededFloat(baseSeed, 74, 92))));
  const accuracy = Number.isFinite(source.accuracy) ? Math.round(source.accuracy) : Number.isFinite(fallbackSource.accuracy) ? Math.round(fallbackSource.accuracy) : Math.round(Math.max(60, Math.min(97, seededFloat(baseSeed + 5, 72, 94))));
  const avgScore = Number.isFinite(source.avgScore) ? Math.round(source.avgScore) : Number.isFinite(fallbackSource.avgScore) ? Math.round(fallbackSource.avgScore) : Math.round(Math.max(640, Math.min(920, seededFloat(baseSeed + 9, 690, 900))));
  const speed = Number.isFinite(source.speed) ? Number(source.speed) : (Number.isFinite(fallbackSource.speed) ? Number(fallbackSource.speed) : Math.round(Math.max(5.4, Math.min(9, seededFloat(baseSeed + 13, 5.6, 8.7))) * 10) / 10);
  return { name, avatar, role, power, accuracy, avgScore, speed };
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
  if (!Array.isArray(State.groups)) State.groups = [];
  State.groups.forEach(group => {
    if (!group || typeof group !== 'object') return;
    const desiredCount = 10;
    const baseRoster = Array.isArray(group.roster) ? group.roster.slice(0, desiredCount) : [];
    const fallback = generateRosterFromMembers(group, desiredCount);
    const normalized = [];
    for (let i = 0; i < desiredCount; i++){
      const current = baseRoster[i];
      const fallbackPlayer = fallback[i];
      normalized.push(normalizeRosterMember(current, fallbackPlayer, i, group));
    }
    group.roster = normalized;
    group.members = Math.max(group.members || 0, normalized.length);
    if (!Array.isArray(group.memberList) || group.memberList.length === 0) {
      group.memberList = normalized.slice(0, Math.min(5, normalized.length)).map(p => p.name);
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
  stringToSeed,
  buildRosterEntry,
  seededFloat,
  spendKeys,
  DUEL_INVITE_TIMEOUT_MS,
  DEFAULT_DUEL_FRIENDS
};
