const { getFallbackConfig } = require('./publicContent');
const { loadAdminSettings } = require('../config/adminSettings');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeCoinPackage(pkg, index, usdToToman) {
  if (!pkg || typeof pkg !== 'object') return null;
  const amount = Math.max(0, Number(pkg.amount) || 0);
  const bonus = Math.max(0, Number(pkg.bonus) || 0);
  const priceToman = Math.max(0, Number(pkg.priceToman ?? pkg.price) || 0);
  const id = String(pkg.id || `c${index + 1}`).trim();
  if (!id) return null;
  const totalCoins = Math.round(amount + (amount * bonus) / 100);
  const normalized = {
    id,
    amount,
    bonus,
    priceToman,
    displayName: typeof pkg.displayName === 'string' ? pkg.displayName.trim() : '',
    paymentMethod: typeof pkg.paymentMethod === 'string' ? pkg.paymentMethod.trim() : '',
    badge: typeof pkg.badge === 'string' ? pkg.badge.trim() : '',
    description: typeof pkg.description === 'string' ? pkg.description.trim() : '',
    priority: Number.isFinite(pkg.priority) ? Number(pkg.priority) : index + 1,
    active: pkg.active !== false,
    totalCoins,
  };
  if (usdToToman && Number.isFinite(usdToToman) && usdToToman > 0) {
    normalized.priceCents = Math.round((priceToman / usdToToman) * 100);
  }
  return normalized;
}

function applyAdminOverrides(config) {
  const settings = loadAdminSettings();
  const shopSettings = settings.shop && typeof settings.shop === 'object' ? settings.shop : {};
  const packages = shopSettings.packages && typeof shopSettings.packages === 'object' ? shopSettings.packages : {};
  const walletSource = Array.isArray(packages.wallet) ? packages.wallet : [];

  if (!config.pricing) config.pricing = {};
  const usdToToman = Number.isFinite(config.pricing.usdToToman) ? Number(config.pricing.usdToToman) : null;

  if (walletSource.length) {
    const normalized = walletSource
      .map((pkg, index) => normalizeCoinPackage(pkg, index, usdToToman))
      .filter((pkg) => pkg && pkg.amount > 0 && pkg.priceToman > 0 && pkg.active !== false)
      .sort((a, b) => (a.priority ?? a.amount) - (b.priority ?? b.amount));

    if (normalized.length) {
      config.pricing.coins = normalized.map((pkg) => ({ ...pkg }));
      config.shop = config.shop && typeof config.shop === 'object' ? config.shop : {};
      config.shop.packages = config.shop.packages && typeof config.shop.packages === 'object'
        ? config.shop.packages
        : {};
      config.shop.packages.wallet = normalized.map((pkg) => ({ ...pkg }));
    }
  }

  return config;
}

function getShopConfig() {
  const config = getFallbackConfig();
  const merged = applyAdminOverrides(config ? clone(config) : {});
  return merged || {};
}

function getCoinPackages() {
  const config = getShopConfig();
  const list = Array.isArray(config?.pricing?.coins) ? config.pricing.coins : [];
  return list.map((pkg) => ({
    id: String(pkg.id || ''),
    amount: Number(pkg.amount) || 0,
    bonus: Number(pkg.bonus) || 0,
    priceToman: Number(pkg.priceToman || pkg.price || 0),
    displayName: pkg.displayName || pkg.label || '',
    paymentMethod: pkg.paymentMethod || '',
    badge: pkg.badge || '',
    description: pkg.description || '',
    priority: Number(pkg.priority) || 0,
    totalCoins: Number.isFinite(pkg.totalCoins) ? Number(pkg.totalCoins) : Math.round((Number(pkg.amount) || 0) + (((Number(pkg.amount) || 0) * (Number(pkg.bonus) || 0)) / 100)),
    active: pkg.active !== false,
  })).filter((pkg) => pkg.id && pkg.amount > 0 && pkg.priceToman > 0 && pkg.totalCoins > 0 && pkg.active !== false);
}

function findCoinPackage(packageId) {
  if (!packageId) return null;
  const normalized = String(packageId).trim();
  if (!normalized) return null;
  const packages = getCoinPackages();
  return packages.find((pkg) => pkg.id === normalized) || null;
}

function getVipTiers() {
  const config = getShopConfig();
  const raw = config?.pricing?.vip || {};
  return Object.entries(raw).map(([key, value]) => {
    const tier = String(key || '').trim();
    const durationDaysDefault = tier === 'pro' ? 90 : 30;
    return {
      key: tier,
      id: String(value?.id || tier || ''),
      tier,
      priceCents: Number(value?.priceCents) || 0,
      priceToman: Number(value?.priceToman || value?.price || 0),
      durationDays: Number(value?.durationDays) || durationDaysDefault,
    };
  }).filter((item) => item.id);
}

function findVipTier(tier) {
  if (!tier) return null;
  const normalized = String(tier).trim().toLowerCase();
  if (!normalized) return null;
  const tiers = getVipTiers();
  return tiers.find((item) => item.tier === normalized || item.id === normalized) || null;
}

module.exports = {
  getShopConfig,
  getCoinPackages,
  findCoinPackage,
  getVipTiers,
  findVipTier,
};
