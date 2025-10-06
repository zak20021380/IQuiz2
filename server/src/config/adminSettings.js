const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const SETTINGS_FILE = process.env.ADMIN_SETTINGS_FILE
  ? path.resolve(process.env.ADMIN_SETTINGS_FILE)
  : path.join(__dirname, '..', '..', 'data', 'admin-settings.json');

const DEFAULT_GROUP_BATTLE_REWARDS = Object.freeze({
  winner: Object.freeze({ coins: 70, score: 220 }),
  loser: Object.freeze({ coins: 30, score: 90 }),
  groupScore: 420,
});

const DEFAULT_DUEL_REWARDS = Object.freeze({
  winner: Object.freeze({ coins: 60, score: 180 }),
  loser: Object.freeze({ coins: 20, score: 60 }),
  draw: Object.freeze({ coins: 35, score: 120 }),
});

const DEFAULT_SETTINGS = Object.freeze({
  general: {},
  rewards: Object.freeze({
    pointsCorrect: 100,
    coinsCorrect: 5,
    pointsStreak: 50,
    coinsStreak: 10,
    groupBattleRewards: DEFAULT_GROUP_BATTLE_REWARDS,
    duelRewards: DEFAULT_DUEL_REWARDS,
  }),
  shop: {
    enabled: true,
    currency: 'coin',
    lowBalanceThreshold: 0,
    quickTopup: true,
    quickPurchase: true,
    packages: { wallet: [], keys: [] },
    hero: { title: '', subtitle: '', ctaText: '', ctaLink: '' },
    support: { message: '', link: '' },
    vip: {
      enabled: true,
      autoRenew: true,
      autoApprove: true,
      billingCycle: 'monthly',
      price: 0,
      trialDays: 0,
      slots: 0,
      perks: [],
      customNote: '',
    },
    vipPlans: [],
  },
  updatedAt: 0,
});

function toStringSafe(value, fallback = '') {
  if (value == null) return fallback;
  const stringValue = String(value).trim();
  return stringValue || fallback;
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeGroupBattleRewards(raw, fallback = DEFAULT_GROUP_BATTLE_REWARDS) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const base = fallback || DEFAULT_GROUP_BATTLE_REWARDS;
  const winnerSource = source.winner && typeof source.winner === 'object' ? source.winner : {};
  const loserSource = source.loser && typeof source.loser === 'object' ? source.loser : {};
  const sanitize = (value, fallbackValue) => Math.max(0, toNumber(value, fallbackValue));
  return {
    winner: {
      coins: sanitize(winnerSource.coins, base.winner.coins),
      score: sanitize(winnerSource.score, base.winner.score),
    },
    loser: {
      coins: sanitize(loserSource.coins, base.loser.coins),
      score: sanitize(loserSource.score, base.loser.score),
    },
    groupScore: sanitize(source.groupScore, base.groupScore),
  };
}

function normalizeDuelRewards(raw, fallback = DEFAULT_DUEL_REWARDS) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const base = fallback || DEFAULT_DUEL_REWARDS;
  const sanitize = (value, fallbackValue) => Math.max(0, toNumber(value, fallbackValue));
  const buildOutcome = (key) => {
    const outcomeSource = source[key] && typeof source[key] === 'object' ? source[key] : {};
    const baseOutcome = base[key] || { coins: 0, score: 0 };
    return {
      coins: sanitize(outcomeSource.coins, baseOutcome.coins),
      score: sanitize(outcomeSource.score, baseOutcome.score),
    };
  };
  return {
    winner: buildOutcome('winner'),
    loser: buildOutcome('loser'),
    draw: buildOutcome('draw'),
  };
}

function normalizeRewards(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const normalized = { ...source };
  normalized.pointsCorrect = Math.max(0, toNumber(source.pointsCorrect, DEFAULT_SETTINGS.rewards.pointsCorrect));
  normalized.coinsCorrect = Math.max(0, toNumber(source.coinsCorrect, DEFAULT_SETTINGS.rewards.coinsCorrect));
  normalized.pointsStreak = Math.max(0, toNumber(source.pointsStreak, DEFAULT_SETTINGS.rewards.pointsStreak));
  normalized.coinsStreak = Math.max(0, toNumber(source.coinsStreak, DEFAULT_SETTINGS.rewards.coinsStreak));
  normalized.groupBattleRewards = normalizeGroupBattleRewards(source.groupBattleRewards || source.groupBattle);
  normalized.duelRewards = normalizeDuelRewards(source.duelRewards || source.duel);
  delete normalized.groupBattle;
  delete normalized.duel;
  return normalized;
}

function normalizeVipPlan(rawPlan) {
  if (!rawPlan || typeof rawPlan !== 'object') return null;
  const plan = { ...rawPlan };
  plan.id = toStringSafe(plan.id || plan.tier || '', '');
  if (!plan.id) return null;
  plan.tier = toStringSafe(plan.tier || plan.id, plan.id);
  plan.displayName = toStringSafe(plan.displayName || plan.name || '', '');
  plan.price = Math.max(0, toNumber(plan.price, 0));
  plan.period = toStringSafe(plan.period || '', '');
  plan.buttonText = toStringSafe(plan.buttonText || '', '');
  plan.badge = toStringSafe(plan.badge || '', '');
  plan.order = Math.max(0, toNumber(plan.order, 0));
  plan.active = plan.active !== false;
  plan.featured = plan.featured === true;
  if (Array.isArray(plan.benefits)) {
    plan.benefits = plan.benefits.map((benefit) => toStringSafe(benefit, '')).filter(Boolean);
  } else if (typeof plan.benefits === 'string') {
    plan.benefits = plan.benefits
      .split(/\r?\n|•/)
      .map((benefit) => toStringSafe(benefit, ''))
      .filter(Boolean);
  } else {
    plan.benefits = [];
  }
  return plan;
}

function normalizeVipPlans(rawPlans) {
  if (!Array.isArray(rawPlans)) return [];
  return rawPlans
    .map((plan, index) => {
      const normalized = normalizeVipPlan(plan);
      if (!normalized) return null;
      if (!normalized.order) normalized.order = index + 1;
      return normalized;
    })
    .filter(Boolean);
}

function normalizeWalletPackage(rawPackage) {
  if (!rawPackage || typeof rawPackage !== 'object') return null;
  const pkg = { ...rawPackage };
  pkg.id = toStringSafe(pkg.id || pkg.packageId || '', '');
  const amount = Math.max(0, toNumber(pkg.amount, 0));
  const priceToman = Math.max(0, toNumber(pkg.priceToman != null ? pkg.priceToman : pkg.price, 0));
  if (!pkg.id || amount <= 0 || priceToman <= 0) return null;
  pkg.amount = amount;
  pkg.priceToman = priceToman;
  pkg.price = priceToman;
  pkg.bonus = Math.max(0, toNumber(pkg.bonus, 0));
  pkg.paymentMethod = toStringSafe(pkg.paymentMethod || '', '');
  pkg.displayName = toStringSafe(pkg.displayName || pkg.name || pkg.label || '', '');
  pkg.badge = toStringSafe(pkg.badge || '', '');
  pkg.description = toStringSafe(pkg.description || '', '');
  pkg.priority = Math.max(0, toNumber(pkg.priority, 0));
  pkg.active = pkg.active !== false;
  const cents = toNumber(pkg.priceCents, 0);
  if (cents > 0) {
    pkg.priceCents = cents;
  } else {
    delete pkg.priceCents;
  }
  return pkg;
}

function normalizeKeyPackage(rawPackage) {
  if (!rawPackage || typeof rawPackage !== 'object') return null;
  const pkg = { ...rawPackage };
  pkg.id = toStringSafe(pkg.id || pkg.packageId || '', '');
  const amount = Math.max(0, toNumber(pkg.amount, 0));
  if (!pkg.id || amount <= 0) return null;
  pkg.amount = amount;
  const priceValue = toNumber(pkg.price != null ? pkg.price : pkg.priceGame, 0);
  pkg.price = Math.max(0, priceValue);
  pkg.priceGame = pkg.price;
  pkg.displayName = toStringSafe(pkg.displayName || pkg.name || pkg.label || '', '');
  pkg.badge = toStringSafe(pkg.badge || '', '');
  pkg.description = toStringSafe(pkg.description || '', '');
  pkg.priority = Math.max(0, toNumber(pkg.priority, 0));
  pkg.active = pkg.active !== false;
  return pkg;
}

function normalizeShopPackages(rawPackages) {
  const source = rawPackages && typeof rawPackages === 'object' ? rawPackages : {};
  const normalized = {};

  if (Array.isArray(source.wallet)) {
    normalized.wallet = source.wallet
      .map(normalizeWalletPackage)
      .filter(Boolean);
  } else {
    normalized.wallet = [];
  }

  if (Array.isArray(source.keys)) {
    normalized.keys = source.keys
      .map(normalizeKeyPackage)
      .filter(Boolean);
  } else {
    normalized.keys = [];
  }

  Object.entries(source).forEach(([key, value]) => {
    if (normalized[key]) return;
    if (!Array.isArray(value)) return;
    normalized[key] = value.filter((item) => item && typeof item === 'object');
  });

  return normalized;
}

function normalizeShop(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const normalized = { ...DEFAULT_SETTINGS.shop, ...source };
  normalized.enabled = source.enabled !== false && !!source.enabled;
  normalized.currency = toStringSafe(source.currency || DEFAULT_SETTINGS.shop.currency, DEFAULT_SETTINGS.shop.currency);
  normalized.lowBalanceThreshold = Math.max(0, toNumber(source.lowBalanceThreshold, DEFAULT_SETTINGS.shop.lowBalanceThreshold));
  normalized.quickTopup = source.quickTopup !== false && !!source.quickTopup;
  normalized.quickPurchase = source.quickPurchase !== false && !!source.quickPurchase;

  if (source.hero && typeof source.hero === 'object') {
    normalized.hero = {
      title: toStringSafe(source.hero.title || DEFAULT_SETTINGS.shop.hero.title, ''),
      subtitle: toStringSafe(source.hero.subtitle || DEFAULT_SETTINGS.shop.hero.subtitle, ''),
      ctaText: toStringSafe(source.hero.ctaText || DEFAULT_SETTINGS.shop.hero.ctaText, ''),
      ctaLink: toStringSafe(source.hero.ctaLink || DEFAULT_SETTINGS.shop.hero.ctaLink, ''),
    };
  }

  normalized.packages = normalizeShopPackages(source.packages);

  if (source.support && typeof source.support === 'object') {
    normalized.support = {
      message: toStringSafe(source.support.message || DEFAULT_SETTINGS.shop.support.message, ''),
      link: toStringSafe(source.support.link || DEFAULT_SETTINGS.shop.support.link, ''),
    };
  }

  if (source.vip && typeof source.vip === 'object') {
    normalized.vip = {
      ...DEFAULT_SETTINGS.shop.vip,
      ...source.vip,
      enabled: source.vip.enabled !== false && !!source.vip.enabled,
      autoRenew: source.vip.autoRenew !== false && !!source.vip.autoRenew,
      autoApprove: source.vip.autoApprove !== false && !!source.vip.autoApprove,
      billingCycle: toStringSafe(source.vip.billingCycle || DEFAULT_SETTINGS.shop.vip.billingCycle, DEFAULT_SETTINGS.shop.vip.billingCycle),
      price: Math.max(0, toNumber(source.vip.price, DEFAULT_SETTINGS.shop.vip.price)),
      trialDays: Math.max(0, toNumber(source.vip.trialDays, DEFAULT_SETTINGS.shop.vip.trialDays)),
      slots: Math.max(0, toNumber(source.vip.slots, DEFAULT_SETTINGS.shop.vip.slots)),
      perks: Array.isArray(source.vip.perks)
        ? source.vip.perks.map((perk) => toStringSafe(perk, '')).filter(Boolean)
        : DEFAULT_SETTINGS.shop.vip.perks,
      customNote: toStringSafe(source.vip.customNote || DEFAULT_SETTINGS.shop.vip.customNote, ''),
    };
  }

  normalized.vipPlans = normalizeVipPlans(source.vipPlans || DEFAULT_SETTINGS.shop.vipPlans);

  return normalized;
}

function normalizeGeneral(rawGeneral) {
  if (!rawGeneral || typeof rawGeneral !== 'object') return {};
  const general = { ...rawGeneral };
  if (general.appName != null) general.appName = toStringSafe(general.appName, '');
  if (general.language != null) general.language = toStringSafe(general.language, '');
  if (general.questionTime != null) general.questionTime = Math.max(0, toNumber(general.questionTime, 0));
  if (general.maxQuestions != null) general.maxQuestions = Math.max(0, toNumber(general.maxQuestions, 0));
  return general;
}

function normalizeSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const general = normalizeGeneral(source.general);
  const shop = normalizeShop(source.shop);
  const rewards = normalizeRewards(source.rewards && typeof source.rewards === 'object' ? source.rewards : {});
  return {
    general,
    rewards,
    shop,
    updatedAt: Number.isFinite(source.updatedAt) ? source.updatedAt : Date.now(),
  };
}

function cloneSettings(settings) {
  return JSON.parse(JSON.stringify(normalizeSettings(settings)));
}

function readSettingsFromDisk() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return {};
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (error) {
    console.warn('[admin-settings] failed to read settings file', error);
  }
  return {};
}

async function ensureSettingsDir() {
  const dir = path.dirname(SETTINGS_FILE);
  await fsp.mkdir(dir, { recursive: true });
}

let cachedSettings = null;

function loadAdminSettings() {
  if (!cachedSettings) {
    const disk = readSettingsFromDisk();
    cachedSettings = normalizeSettings(Object.keys(disk).length ? disk : {});
  }
  return cachedSettings;
}

function getAdminSettingsSnapshot() {
  return cloneSettings(loadAdminSettings());
}

function getGroupBattleRewardConfig() {
  const settings = loadAdminSettings();
  return normalizeGroupBattleRewards(settings.rewards?.groupBattleRewards);
}

function getDuelRewardConfig() {
  const settings = loadAdminSettings();
  return normalizeDuelRewards(settings.rewards?.duelRewards);
}

async function saveAdminSettings(next) {
  const current = loadAdminSettings();
  const incoming = next && typeof next === 'object' ? next : {};
  const generalUpdate = incoming.general && typeof incoming.general === 'object' ? incoming.general : {};
  const shopUpdate = incoming.shop && typeof incoming.shop === 'object' ? incoming.shop : {};
  const rewardsUpdate = incoming.rewards && typeof incoming.rewards === 'object' ? incoming.rewards : {};

  const merged = {
    general: { ...current.general, ...generalUpdate },
    rewards: normalizeRewards({ ...current.rewards, ...rewardsUpdate }),
    shop: { ...current.shop, ...shopUpdate },
    updatedAt: Number.isFinite(incoming.updatedAt) ? incoming.updatedAt : Date.now(),
  };

  const normalized = normalizeSettings(merged);
  await ensureSettingsDir();
  await fsp.writeFile(SETTINGS_FILE, JSON.stringify(normalized, null, 2), 'utf8');
  cachedSettings = normalized;
  return cloneSettings(normalized);
}

function __resetAdminSettingsCache(next) {
  if (next && typeof next === 'object') {
    cachedSettings = normalizeSettings(next);
  } else {
    cachedSettings = null;
  }
}

module.exports = {
  DEFAULT_GROUP_BATTLE_REWARDS,
  DEFAULT_DUEL_REWARDS,
  getAdminSettingsSnapshot,
  getGroupBattleRewardConfig,
  getDuelRewardConfig,
  loadAdminSettings,
  saveAdminSettings,
  __resetAdminSettingsCache,
  SETTINGS_FILE,
};
