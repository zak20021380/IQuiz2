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

const DEFAULT_SETTINGS = Object.freeze({
  general: {},
  rewards: Object.freeze({
    pointsCorrect: 100,
    coinsCorrect: 5,
    pointsStreak: 50,
    coinsStreak: 10,
    groupBattleRewards: DEFAULT_GROUP_BATTLE_REWARDS,
  }),
  shop: {},
  updatedAt: 0,
});

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

function normalizeRewards(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const normalized = { ...source };
  normalized.pointsCorrect = Math.max(0, toNumber(source.pointsCorrect, DEFAULT_SETTINGS.rewards.pointsCorrect));
  normalized.coinsCorrect = Math.max(0, toNumber(source.coinsCorrect, DEFAULT_SETTINGS.rewards.coinsCorrect));
  normalized.pointsStreak = Math.max(0, toNumber(source.pointsStreak, DEFAULT_SETTINGS.rewards.pointsStreak));
  normalized.coinsStreak = Math.max(0, toNumber(source.coinsStreak, DEFAULT_SETTINGS.rewards.coinsStreak));
  normalized.groupBattleRewards = normalizeGroupBattleRewards(source.groupBattleRewards || source.groupBattle);
  delete normalized.groupBattle;
  return normalized;
}

function normalizeSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const general = source.general && typeof source.general === 'object' ? { ...source.general } : {};
  const shop = source.shop && typeof source.shop === 'object' ? { ...source.shop } : {};
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
  getAdminSettingsSnapshot,
  getGroupBattleRewardConfig,
  loadAdminSettings,
  saveAdminSettings,
  __resetAdminSettingsCache,
  SETTINGS_FILE,
};
