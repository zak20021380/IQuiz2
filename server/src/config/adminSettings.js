const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const AdminSetting = require('../models/AdminSetting');
const logger = require('../config/logger');

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

const DEFAULT_SHOP_PRICING = Object.freeze({
  currency: 'IRR',
  coins: Object.freeze([]),
  vip: Object.freeze([]),
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
  shop: Object.freeze({
    pricing: DEFAULT_SHOP_PRICING,
  }),
  updatedAt: 0,
  updatedBy: null,
});

class AdminSettingsValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'AdminSettingsValidationError';
    this.status = 400;
    this.details = Array.isArray(details) ? details : [];
  }
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toInteger(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const int = Math.trunc(num);
  return Number.isFinite(int) ? int : null;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return Boolean(value);
}

function ensureCurrency(value, fallback = DEFAULT_SHOP_PRICING.currency) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim().toUpperCase();
  }
  if (typeof fallback === 'string' && fallback.trim()) {
    return fallback.trim().toUpperCase();
  }
  return DEFAULT_SHOP_PRICING.currency;
}

function resolveMonthsFromPeriod(period) {
  if (!period || typeof period !== 'string') return 1;
  const value = period.trim().toLowerCase();
  if (!value) return 1;
  if (value.includes('سال')) return 12;
  if (value.includes('سه')) return 3;
  if (value.includes('فصل')) return 3;
  if (value.includes('week')) return 1;
  if (value.includes('ماه')) return 1;
  if (value.includes('quarter')) return 3;
  if (value.includes('year')) return 12;
  return 1;
}

function derivePricingFromLegacyShop(shop) {
  if (!shop || typeof shop !== 'object') return null;
  const result = { currency: ensureCurrency(shop.currency), coins: [], vip: [] };
  const packages = shop.packages && typeof shop.packages === 'object' ? shop.packages : {};
  const wallet = Array.isArray(packages.wallet)
    ? packages.wallet
    : Array.isArray(packages.coins)
      ? packages.coins
      : [];
  wallet.forEach((pkg) => {
    if (!pkg || typeof pkg !== 'object') return;
    const id = typeof pkg.id === 'string' ? pkg.id.trim() : '';
    if (!id) return;
    const title = typeof pkg.displayName === 'string' && pkg.displayName.trim()
      ? pkg.displayName.trim()
      : id;
    const coins = toInteger(pkg.amount);
    const price = toInteger(pkg.priceIrr ?? pkg.priceToman ?? pkg.price);
    if (!Number.isInteger(coins) || coins < 1) return;
    if (!Number.isInteger(price) || price < 0) return;
    result.coins.push({
      id,
      title,
      coins,
      priceIrr: price,
      featured: toBoolean(pkg.featured, false),
      active: pkg.active !== false,
    });
  });

  const vipPlans = Array.isArray(shop.vipPlans) ? shop.vipPlans : [];
  vipPlans.forEach((plan) => {
    if (!plan || typeof plan !== 'object') return;
    const id = typeof plan.id === 'string' ? plan.id.trim() : '';
    if (!id) return;
    const title = typeof plan.displayName === 'string' && plan.displayName.trim()
      ? plan.displayName.trim()
      : id;
    const months = toInteger(plan.months) || resolveMonthsFromPeriod(plan.period || plan.cycle);
    const price = toInteger(plan.priceIrr ?? plan.priceToman ?? plan.price);
    if (!Number.isInteger(months) || months < 1) return;
    if (!Number.isInteger(price) || price < 0) return;
    result.vip.push({
      id,
      title,
      months,
      priceIrr: price,
      active: plan.active !== false,
    });
  });

  return result;
}

function coerceShopPricing(raw, { fallback, strict = false } = {}) {
  const base = fallback && typeof fallback === 'object' ? fallback : DEFAULT_SHOP_PRICING;
  const source = raw && typeof raw === 'object' ? raw : {};
  const errors = [];
  const normalized = {
    currency: ensureCurrency(source.currency ?? base.currency),
    coins: [],
    vip: [],
  };

  const hasSourceCoins = Array.isArray(source.coins);
  const coinsInput = hasSourceCoins
    ? source.coins
    : Array.isArray(base.coins)
      ? base.coins
      : [];
  coinsInput.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      if (strict && hasSourceCoins) {
        errors.push(`coins[${index}] must be an object`);
      }
      return;
    }
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const coinsValue = toInteger(item.coins ?? item.amount);
    const priceValue = toInteger(item.priceIrr ?? item.priceIRR ?? item.priceToman ?? item.price);
    if (!id) {
      if (strict) errors.push(`coins[${index}].id is required`);
      return;
    }
    if (!title) {
      if (strict) errors.push(`coins[${index}].title is required`);
    }
    if (!Number.isInteger(coinsValue) || coinsValue < 1) {
      if (strict) errors.push(`coins[${index}].coins must be an integer ≥ 1`);
      return;
    }
    if (!Number.isInteger(priceValue) || priceValue < 0) {
      if (strict) errors.push(`coins[${index}].priceIrr must be an integer ≥ 0`);
      return;
    }
    const entry = {
      id,
      title: title || id,
      coins: coinsValue,
      priceIrr: priceValue,
      featured: toBoolean(item.featured, false),
      active: toBoolean(item.active, true),
    };
    normalized.coins.push(entry);
  });

  const hasSourceVip = Array.isArray(source.vip);
  const vipInput = hasSourceVip
    ? source.vip
    : Array.isArray(base.vip)
      ? base.vip
      : [];
  vipInput.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      if (strict && hasSourceVip) {
        errors.push(`vip[${index}] must be an object`);
      }
      return;
    }
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const monthsValue = toInteger(item.months ?? item.durationMonths ?? item.periodMonths);
    const priceValue = toInteger(item.priceIrr ?? item.priceIRR ?? item.priceToman ?? item.price);
    if (!id) {
      if (strict) errors.push(`vip[${index}].id is required`);
      return;
    }
    if (!title) {
      if (strict) errors.push(`vip[${index}].title is required`);
    }
    if (!Number.isInteger(monthsValue) || monthsValue < 1) {
      if (strict) errors.push(`vip[${index}].months must be an integer ≥ 1`);
      return;
    }
    if (!Number.isInteger(priceValue) || priceValue < 0) {
      if (strict) errors.push(`vip[${index}].priceIrr must be an integer ≥ 0`);
      return;
    }
    const entry = {
      id,
      title: title || id,
      months: monthsValue,
      priceIrr: priceValue,
      active: toBoolean(item.active, true),
    };
    normalized.vip.push(entry);
  });

  return { pricing: normalized, errors };
}

function normalizeShop(raw, fallbackShop = {}) {
  const source = raw && typeof raw === 'object' ? { ...raw } : {};
  const legacy = derivePricingFromLegacyShop({ ...fallbackShop, ...source }) || DEFAULT_SHOP_PRICING;
  const { pricing } = coerceShopPricing(source.pricing, { fallback: legacy, strict: false });
  return { ...source, pricing };
}

function deepMerge(target = {}, source = {}) {
  const output = target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {};
  if (!source || typeof source !== 'object') return output;
  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (value === undefined) return;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = deepMerge(output[key], value);
    } else if (Array.isArray(value)) {
      output[key] = value.slice();
    } else {
      output[key] = value;
    }
  });
  return output;
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

function normalizeSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const general = source.general && typeof source.general === 'object' ? { ...source.general } : {};
  const shopSource = source.shop && typeof source.shop === 'object' ? source.shop : {};
  const shop = normalizeShop(shopSource, DEFAULT_SETTINGS.shop);
  const rewards = normalizeRewards(source.rewards && typeof source.rewards === 'object' ? source.rewards : {});
  return {
    general,
    rewards,
    shop,
    updatedAt: Number.isFinite(source.updatedAt) ? source.updatedAt : Date.now(),
    updatedBy: source.updatedBy || null,
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

async function persistSettingsToDatabase(settings, actorId) {
  if (!settings || typeof settings !== 'object') return;
  try {
    const update = {
      data: settings,
      updatedAt: new Date(settings.updatedAt || Date.now()),
    };
    if (actorId) {
      update.updatedBy = actorId;
    }
    await AdminSetting.findOneAndUpdate(
      { _id: 'global' },
      {
        $set: update,
        $setOnInsert: { version: 0 },
        $inc: { version: 1 },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();
  } catch (error) {
    logger.warn(`[admin-settings] failed to persist settings in database: ${error.message}`);
  }
}

async function saveAdminSettings(next, options = {}) {
  const current = loadAdminSettings();
  const incoming = next && typeof next === 'object' ? next : {};
  const actorId = options && typeof options === 'object' ? options.actorId || options.updatedBy || null : null;

  const generalUpdate = incoming.general && typeof incoming.general === 'object' ? incoming.general : {};
  const rewardsUpdate = incoming.rewards && typeof incoming.rewards === 'object' ? incoming.rewards : {};
  const shopUpdate = incoming.shop && typeof incoming.shop === 'object' ? incoming.shop : {};

  const mergedGeneral = deepMerge(current.general, generalUpdate);
  const mergedRewards = normalizeRewards(deepMerge(current.rewards, rewardsUpdate));
  const mergedShop = deepMerge(current.shop, shopUpdate);

  const pricingSource = Object.prototype.hasOwnProperty.call(shopUpdate, 'pricing')
    ? shopUpdate.pricing
    : mergedShop.pricing;
  const { pricing, errors } = coerceShopPricing(pricingSource, {
    fallback: current.shop?.pricing || DEFAULT_SHOP_PRICING,
    strict: Object.prototype.hasOwnProperty.call(shopUpdate, 'pricing'),
  });
  if (errors.length) {
    throw new AdminSettingsValidationError('Invalid shop pricing configuration', errors);
  }
  mergedShop.pricing = pricing;

  const merged = {
    general: mergedGeneral,
    rewards: mergedRewards,
    shop: normalizeShop(mergedShop, current.shop),
    updatedAt: Date.now(),
    updatedBy: actorId || current.updatedBy || null,
  };

  const normalized = normalizeSettings(merged);
  await ensureSettingsDir();
  await fsp.writeFile(SETTINGS_FILE, JSON.stringify(normalized, null, 2), 'utf8');
  cachedSettings = normalized;

  await persistSettingsToDatabase(normalized, actorId);
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
  DEFAULT_SHOP_PRICING,
  AdminSettingsValidationError,
  getAdminSettingsSnapshot,
  getGroupBattleRewardConfig,
  getDuelRewardConfig,
  loadAdminSettings,
  saveAdminSettings,
  __resetAdminSettingsCache,
  SETTINGS_FILE,
};
