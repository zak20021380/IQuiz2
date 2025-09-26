import { getAdminSettings } from '../config/admin-settings.js';

const STORAGE_KEY = 'quiz_webapp_pro_state_v2_fa';

const ADMIN_SETTINGS = getAdminSettings();
const GENERAL_SETTINGS = ADMIN_SETTINGS?.general || {};
const DEFAULT_QUESTION_TIME = Math.max(5, Number(GENERAL_SETTINGS.questionTime) || 30);
const DEFAULT_MAX_QUESTIONS = Math.max(3, Number(GENERAL_SETTINGS.maxQuestions) || 10);

const ROSTER_ROLES = ['دانش عمومی','رهبر استراتژی','متخصص علوم','استاد ادبیات','تحلیل‌گر داده','هوش تاریخی','ریاضی‌دان','کارشناس فناوری','حل مسئله سریع','هوش مصنوعی'];
const ROSTER_FIRST_NAMES = ['آرمان','نیلوفر','شروین','فرناز','پارسا','یاسمن','کاوه','مینا','هومن','هستی','رامتین','سولماز','آرین','بهاره','پریسا','بردیا','کیانا','مانی','ترانه','هانیه'];
const ROSTER_LAST_NAMES = ['قاسمی','حسینی','موسوی','محمدی','کاظمی','نعمتی','شکیبا','زارع','فاضلی','رستگار','صادقی','نیک‌پور','شریفی','فرهادی','پاکزاد','نادری','گودرزی','مرادی','توکلی','شفیعی'];

const DEFAULT_GROUP_ROSTERS = {
  g1: [
    { name:'علی رضایی', avatar:'https://i.pravatar.cc/100?img=12', role:'رهبر تیم', power:94, avgScore:890, accuracy:92, speed:6.1 },
    { name:'سارا اکبری', avatar:'https://i.pravatar.cc/100?img=32', role:'استاد ادبیات', power:91, avgScore:872, accuracy:90, speed:6.4 },
    { name:'رضا کریمی', avatar:'https://i.pravatar.cc/100?img=45', role:'تحلیل‌گر تیزبین', power:89, avgScore:860, accuracy:89, speed:6.6 },
    { name:'ندا فرهمند', avatar:'https://i.pravatar.cc/100?img=36', role:'متخصص تاریخ', power:87, avgScore:845, accuracy:88, speed:6.9 },
    { name:'پیام سالاری', avatar:'https://i.pravatar.cc/100?img=24', role:'ریاضی برتر', power:85, avgScore:832, accuracy:87, speed:7.1 },
    { name:'آرزو مرادی', avatar:'https://i.pravatar.cc/100?img=54', role:'هوش کلامی', power:83, avgScore:820, accuracy:85, speed:7.4 },
    { name:'احسان کاوه', avatar:'https://i.pravatar.cc/100?img=13', role:'مغز تکنولوژی', power:82, avgScore:808, accuracy:84, speed:7.6 },
    { name:'نگار میرزایی', avatar:'https://i.pravatar.cc/100?img=47', role:'دانش عمومی', power:80, avgScore:798, accuracy:83, speed:7.8 },
    { name:'شهاب احمدپور', avatar:'https://i.pravatar.cc/100?img=58', role:'فیزیک‌دان جوان', power:78, avgScore:785, accuracy:81, speed:8.0 },
    { name:'کیانا شریفی', avatar:'https://i.pravatar.cc/100?img=21', role:'تحلیل‌گر داده', power:76, avgScore:770, accuracy:80, speed:8.2 }
  ],
  g2: [
    { name:'سارا محمدی', avatar:'https://i.pravatar.cc/100?img=29', role:'استراتژیست ارشد', power:92, avgScore:875, accuracy:91, speed:6.3 },
    { name:'مهدی احمدی', avatar:'https://i.pravatar.cc/100?img=17', role:'تحلیل‌گر منطق', power:88, avgScore:852, accuracy:88, speed:6.7 },
    { name:'الهام برزگر', avatar:'https://i.pravatar.cc/100?img=53', role:'متخصص علوم', power:86, avgScore:838, accuracy:87, speed:7.0 },
    { name:'حسین فلاح', avatar:'https://i.pravatar.cc/100?img=25', role:'ریاضی‌دان تیم', power:84, avgScore:826, accuracy:85, speed:7.3 },
    { name:'نگین شریعتی', avatar:'https://i.pravatar.cc/100?img=41', role:'هوش تاریخی', power:83, avgScore:815, accuracy:84, speed:7.5 },
    { name:'پژمان نظری', avatar:'https://i.pravatar.cc/100?img=34', role:'کارشناس فناوری', power:81, avgScore:804, accuracy:83, speed:7.8 },
    { name:'بهاره کاظمی', avatar:'https://i.pravatar.cc/100?img=59', role:'ادبیات پژوه', power:79, avgScore:792, accuracy:82, speed:8.0 },
    { name:'شروین فرهادی', avatar:'https://i.pravatar.cc/100?img=23', role:'هوش مصنوعی', power:78, avgScore:780, accuracy:81, speed:8.2 },
    { name:'مینا رستگار', avatar:'https://i.pravatar.cc/100?img=42', role:'دانش عمومی', power:76, avgScore:768, accuracy:80, speed:8.4 },
    { name:'آرین ساعی', avatar:'https://i.pravatar.cc/100?img=14', role:'حل مسئله سریع', power:75, avgScore:756, accuracy:79, speed:8.6 }
  ],
  g3: [
    { name:'رضا قاسمی', avatar:'https://i.pravatar.cc/100?img=19', role:'رهبر خلاق', power:90, avgScore:862, accuracy:89, speed:6.5 },
    { name:'نازنین فراهانی', avatar:'https://i.pravatar.cc/100?img=38', role:'محقق علوم', power:87, avgScore:840, accuracy:87, speed:6.9 },
    { name:'کیاوش نادری', avatar:'https://i.pravatar.cc/100?img=49', role:'استاد منطق', power:85, avgScore:828, accuracy:85, speed:7.2 },
    { name:'الینا رضوی', avatar:'https://i.pravatar.cc/100?img=28', role:'تحلیل‌گر داده', power:83, avgScore:815, accuracy:84, speed:7.4 },
    { name:'پارسا بهمنی', avatar:'https://i.pravatar.cc/100?img=33', role:'هوش ریاضی', power:82, avgScore:804, accuracy:83, speed:7.6 },
    { name:'آیدا صفوی', avatar:'https://i.pravatar.cc/100?img=52', role:'تاریخ‌دان', power:80, avgScore:792, accuracy:82, speed:7.9 },
    { name:'مانی فرهودی', avatar:'https://i.pravatar.cc/100?img=22', role:'متخصص سرعت', power:79, avgScore:780, accuracy:81, speed:8.0 },
    { name:'سینا کیا', avatar:'https://i.pravatar.cc/100?img=27', role:'کارشناس فناوری', power:77, avgScore:770, accuracy:80, speed:8.2 },
    { name:'هستی مرادی', avatar:'https://i.pravatar.cc/100?img=44', role:'دانش عمومی', power:75, avgScore:760, accuracy:79, speed:8.4 },
    { name:'یاشا طاهری', avatar:'https://i.pravatar.cc/100?img=57', role:'حل مسئله منطقی', power:74, avgScore:748, accuracy:78, speed:8.6 }
  ],
  g4: [
    { name:'مریم احمدی', avatar:'https://i.pravatar.cc/100?img=18', role:'رهبر تکنیکی', power:89, avgScore:850, accuracy:88, speed:6.8 },
    { name:'رها فاضلی', avatar:'https://i.pravatar.cc/100?img=48', role:'هوش ادبی', power:86, avgScore:832, accuracy:86, speed:7.1 },
    { name:'امیررضا حاتمی', avatar:'https://i.pravatar.cc/100?img=55', role:'ریاضی برتر', power:84, avgScore:820, accuracy:84, speed:7.3 },
    { name:'مهسا نادری', avatar:'https://i.pravatar.cc/100?img=37', role:'تاریخ پژوه', power:82, avgScore:808, accuracy:83, speed:7.5 },
    { name:'نیما رجبی', avatar:'https://i.pravatar.cc/100?img=26', role:'تحلیل‌گر سریع', power:81, avgScore:798, accuracy:82, speed:7.7 },
    { name:'الهه رحیمی', avatar:'https://i.pravatar.cc/100?img=43', role:'دانش علوم', power:80, avgScore:788, accuracy:81, speed:7.9 },
    { name:'سامیار پاکزاد', avatar:'https://i.pravatar.cc/100?img=46', role:'برنامه‌ریز تیمی', power:78, avgScore:776, accuracy:80, speed:8.1 },
    { name:'یاسمن گودرزی', avatar:'https://i.pravatar.cc/100?img=31', role:'استراتژیست', power:77, avgScore:766, accuracy:79, speed:8.3 },
    { name:'هومن جلالی', avatar:'https://i.pravatar.cc/100?img=51', role:'دانش عمومی', power:75, avgScore:756, accuracy:78, speed:8.5 },
    { name:'بهار قائمی', avatar:'https://i.pravatar.cc/100?img=35', role:'مغز خلاق', power:74, avgScore:744, accuracy:77, speed:8.6 }
  ],
  g5: [
    { name:'امیر حسینی', avatar:'https://i.pravatar.cc/100?img=20', role:'رهبر هوش مصنوعی', power:93, avgScore:880, accuracy:91, speed:6.2 },
    { name:'هانیه ناصری', avatar:'https://i.pravatar.cc/100?img=39', role:'متخصص زیست', power:90, avgScore:868, accuracy:89, speed:6.5 },
    { name:'کیارش زندی', avatar:'https://i.pravatar.cc/100?img=56', role:'تحلیل‌گر ریاضی', power:88, avgScore:856, accuracy:88, speed:6.8 },
    { name:'محدثه توکلی', avatar:'https://i.pravatar.cc/100?img=30', role:'ادبیات پژوه', power:86, avgScore:842, accuracy:87, speed:7.0 },
    { name:'رامین شکیبا', avatar:'https://i.pravatar.cc/100?img=40', role:'فیزیک‌دان', power:85, avgScore:830, accuracy:85, speed:7.2 },
    { name:'کیانا نعمتی', avatar:'https://i.pravatar.cc/100?img=60', role:'متخصص تاریخ', power:83, avgScore:818, accuracy:84, speed:7.5 },
    { name:'رامسین اویسی', avatar:'https://i.pravatar.cc/100?img=15', role:'کارشناس منطق', power:82, avgScore:806, accuracy:83, speed:7.7 },
    { name:'پریسا آذر', avatar:'https://i.pravatar.cc/100?img=50', role:'دانش عمومی', power:80, avgScore:794, accuracy:82, speed:7.9 },
    { name:'نوید برومند', avatar:'https://i.pravatar.cc/100?img=16', role:'تحلیل‌گر داده', power:78, avgScore:782, accuracy:81, speed:8.1 },
    { name:'ترانه شفیعی', avatar:'https://i.pravatar.cc/100?img=61', role:'هوش ترکیبی', power:77, avgScore:770, accuracy:80, speed:8.3 }
  ]
};

const DEFAULT_GROUP_RECORDS = {
  g1: { wins: 58, losses: 14 },
  g2: { wins: 46, losses: 21 },
  g3: { wins: 50, losses: 18 },
  g4: { wins: 33, losses: 27 },
  g5: { wins: 55, losses: 16 },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DUEL_INVITE_TIMEOUT_MS = DAY_MS;

const DEFAULT_DUEL_INVITES = (() => {
  const base = Date.now();
  const buildInvite = (id, opponent, avatar, hoursAgo = 2) => {
    const requestedAt = base - Math.max(0, hoursAgo) * 60 * 60 * 1000;
    return {
      id,
      opponent,
      avatar,
      requestedAt,
      deadline: requestedAt + DUEL_INVITE_TIMEOUT_MS,
      message: 'در انتظار پاسخ',
      source: 'friend',
    };
  };

  return [
    buildInvite('invite-ali-rezaei', 'علی رضایی', 'https://i.pravatar.cc/100?img=3', 2),
  ];
})();

const DEFAULT_DUEL_FRIENDS = [
  { id: 1, name: 'علی رضایی', score: 12450, avatar: 'https://i.pravatar.cc/60?img=3' },
  { id: 2, name: 'سارا محمدی', score: 9800, avatar: 'https://i.pravatar.cc/60?img=5' },
  { id: 3, name: 'رضا قاسمی', score: 15200, avatar: 'https://i.pravatar.cc/60?img=8' },
  { id: 4, name: 'مریم احمدی', score: 7650, avatar: 'https://i.pravatar.cc/60?img=11' },
];

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

function cloneDefaultRoster(groupId){
  return (DEFAULT_GROUP_ROSTERS[groupId] || []).map(player => ({ ...player }));
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
  user:{ id:'guest', name:'کاربر مهمان', avatar:'https://i.pravatar.cc/120?img=12', province:'', group:'' },
  score:0, coins:120, lives:3, vip:false,
  streak:0, lastClaim:0, boostUntil:0,
  theme:'ocean',
  duelOpponent:null,
  duelWins:0,
  duelLosses:0,
  pendingDuels:[],
  duelInvites: DEFAULT_DUEL_INVITES.map(invite => ({ ...invite })),
  duelFriends: DEFAULT_DUEL_FRIENDS.map(friend => ({ ...friend })),
  duelHistory:[],
  achievements:{ firstWin:false, tenCorrect:false, streak3:false, vipBought:false },
  settings:{ sound:true, haptics:true, blockDuels:false },
  leaderboard:[
    { id:'u1', name:'آرتین', score:18200, province:'تهران', group:'قهرمانان دانش' },
    { id:'u2', name:'سمانه', score:16500, province:'اصفهان', group:'متفکران جوان' },
    { id:'u3', name:'مانی', score:14950, province:'خراسان رضوی', group:'چالش‌برانگیزان' },
    { id:'u4', name:'نیکا', score:13200, province:'فارس', group:'دانش‌آموزان نخبه' },
  ],
  provinces: [],
  groups: [
    { id: 'g1', name: 'قهرمانان دانش', score: 22100, members: 23, admin: 'علی رضایی', created: '۱۴۰۲/۰۲/۱۵', wins: 58, losses: 14, memberList: ['علی رضایی','سارا اکبری','رضا کریمی','ندا فرهمند','پیام سالاری'], matches:[{opponent:'متفکران جوان', time:'۱۴۰۳/۰۵/۲۵ ۱۸:۰۰'}], requests: [], roster: cloneDefaultRoster('g1') },
    { id: 'g2', name: 'متفکران جوان', score: 19800, members: 18, admin: 'سارا محمدی', created: '۱۴۰۲/۰۳/۲۰', wins: 46, losses: 21, memberList: ['سارا محمدی','مهدی احمدی','الهام برزگر','حسین فلاح'], matches:[{opponent:'پیشروان علم', time:'۱۴۰۳/۰۵/۳۰ ۱۹:۰۰'}], requests: [], roster: cloneDefaultRoster('g2') },
    { id: 'g3', name: 'چالش‌برانگیزان', score: 20500, members: 21, admin: 'رضا قاسمی', created: '۱۴۰۲/۰۱/۱۰', wins: 50, losses: 18, memberList: ['رضا قاسمی','نازنین فراهانی','کیاوش نادری'], matches:[], requests: [], roster: cloneDefaultRoster('g3') },
    { id: 'g4', name: 'دانش‌آموزان نخبه', score: 18700, members: 15, admin: 'مریم احمدی', created: '۱۴۰۲/۰۴/۰۵', wins: 33, losses: 27, memberList: ['مریم احمدی','رها فاضلی','امیررضا حاتمی'], matches:[], requests: [], roster: cloneDefaultRoster('g4') },
    { id: 'g5', name: 'پیشروان علم', score: 21300, members: 27, admin: 'امیر حسینی', created: '۱۴۰۲/۰۲/۲۸', wins: 55, losses: 16, memberList: ['امیر حسینی','هانیه ناصری','کیارش زندی'], matches:[{opponent:'قهرمانان دانش', time:'۱۴۰۳/۰۶/۰۲ ۲۰:۰۰'}], requests: [], roster: cloneDefaultRoster('g5') },
  ],
  ads: { banner: [], native: [], interstitial: [], rewarded: [] },
  quiz:{
    inProgress:false, answered:false, correctIndex:-1,
    duration:DEFAULT_QUESTION_TIME, remain:DEFAULT_QUESTION_TIME, timer:null,
    list:[], idx:0, cat:'عمومی', diff:'آسان', diffValue:'easy',
    sessionEarned:0, results:[],
    baseDuration: DEFAULT_QUESTION_TIME,
    maxQuestions: DEFAULT_MAX_QUESTIONS,
    correctStreak: 0,
    recentQuestions: []
  },
  notifications:[
    { id:'n1', text:'جام هفتگی از ساعت ۲۰:۰۰ شروع می‌شود. آماده‌ای؟', time:'امروز' },
    { id:'n2', text:'بستهٔ سوالات «ادبیات فارسی» اضافه شد!', time:'دیروز' },
    { id:'n3', text:'با دعوت هر دوست ۵💰 هدیه بگیر! تنها بعد از اولین کوییز فعال می‌شود.', time:'۲ روز پیش' }
  ],
  groupBattle: { selectedHostId: '', selectedOpponentId: '', lastResult: null },
  referral: {
    code: 'QUIZ5F8A2B',
    rewardPerFriend: 5,
    referred: [
      {
        id: 'u1',
        name: 'سارا اکبری',
        avatar: 'https://i.pravatar.cc/120?img=47',
        invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        firstQuizAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        quizzesPlayed: 3,
        status: 'completed'
      },
      {
        id: 'u2',
        name: 'رضا کریمی',
        avatar: 'https://i.pravatar.cc/120?img=15',
        invitedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        quizzesPlayed: 0,
        status: 'awaiting_quiz'
      },
      {
        id: 'u3',
        name: 'نیلوفر احمدی',
        avatar: 'https://i.pravatar.cc/120?img=20',
        invitedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        status: 'awaiting_start'
      }
    ]
  }
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
    const defaultRoster = cloneDefaultRoster(group.id);
    if (!Array.isArray(group.roster) || group.roster.length === 0) {
      group.roster = defaultRoster.length ? defaultRoster.map(player => ({ ...player })) : generateRosterFromMembers(group);
    } else {
      group.roster = group.roster.map((player, idx) => normalizeRosterMember(player, defaultRoster[idx], idx, group));
    }
    group.members = Math.max(group.members || 0, group.roster.length);
    if (!Array.isArray(group.memberList) || group.memberList.length === 0) {
      group.memberList = group.roster.slice(0, Math.min(5, group.roster.length)).map(p => p.name);
    }
    const defaultRecord = DEFAULT_GROUP_RECORDS[group.id];
    if (!Number.isFinite(group.wins) || group.wins < 0) {
      group.wins = defaultRecord?.wins ?? Math.max(0, Math.round((group.score || 0) / 650));
    }
    if (!Number.isFinite(group.losses) || group.losses < 0) {
      group.losses = defaultRecord?.losses ?? Math.max(0, Math.round((group.wins || 0) * 0.35));
    }
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
