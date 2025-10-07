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

function mergeCoinPricing(pricingCoins, legacyWallet = []) {
  if (!Array.isArray(pricingCoins)) return [];
  const legacyMap = new Map(
    (Array.isArray(legacyWallet) ? legacyWallet : []).map((pkg) => {
      const id = typeof pkg?.id === 'string' ? pkg.id.trim() : '';
      return [id, pkg];
    })
  );
  return pricingCoins
    .map((coin, index) => {
      if (!coin || typeof coin !== 'object') return null;
      const id = typeof coin.id === 'string' ? coin.id.trim() : '';
      if (!id) return null;
      const legacy = legacyMap.get(id) || {};
      const coins = Number.isFinite(Number(coin.coins)) ? Number(coin.coins) : Number(legacy.amount) || 0;
      const price = Number.isFinite(Number(coin.priceIrr ?? coin.priceIRR ?? coin.price))
        ? Number(coin.priceIrr ?? coin.priceIRR ?? coin.price)
        : Number(legacy.priceToman ?? legacy.price) || 0;
      if (!Number.isFinite(coins) || coins <= 0) return null;
      const base = {
        ...legacy,
        id,
        displayName: legacy.displayName || coin.title || id,
        amount: coins,
        priceToman: price,
        price,
        bonus: Number.isFinite(Number(legacy.bonus)) ? Number(legacy.bonus) : 0,
        active: coin.active !== false && legacy.active !== false,
        featured: coin.featured === true || legacy.featured === true,
        priority: Number.isFinite(Number(legacy.priority)) ? Number(legacy.priority) : index + 1,
      };
      return base;
    })
    .filter(Boolean);
}

function monthsToDays(months) {
  const value = Number.isFinite(Number(months)) ? Math.max(1, Math.trunc(Number(months))) : 1;
  return value * 30;
}

function mergeVipPricing(pricingVip, legacyVip = {}) {
  if (!Array.isArray(pricingVip)) return null;
  const normalized = {};
  pricingVip.forEach((vip) => {
    if (!vip || typeof vip !== 'object') return;
    const id = typeof vip.id === 'string' ? vip.id.trim() : '';
    if (!id) return;
    const title = typeof vip.title === 'string' && vip.title.trim() ? vip.title.trim() : id;
    const price = Number.isFinite(Number(vip.priceIrr ?? vip.priceIRR ?? vip.price))
      ? Number(vip.priceIrr ?? vip.priceIRR ?? vip.price)
      : 0;
    const months = Number.isFinite(Number(vip.months)) ? Math.max(1, Math.trunc(Number(vip.months))) : 1;
    const legacy = legacyVip && typeof legacyVip === 'object' ? legacyVip[id] || {} : {};
    normalized[id] = {
      ...legacy,
      id,
      title,
      priceToman: price,
      price,
      durationDays: monthsToDays(months),
      active: vip.active !== false,
    };
  });
  return normalized;
}

function applyAdminOverrides(config) {
  const settings = loadAdminSettings();
  const shopSettings = settings.shop && typeof settings.shop === 'object' ? settings.shop : {};
  const packages = shopSettings.packages && typeof shopSettings.packages === 'object' ? shopSettings.packages : {};
  const legacyWalletSource = Array.isArray(packages.wallet)
    ? packages.wallet
    : Array.isArray(packages.coins)
      ? packages.coins
      : [];
  const pricingSettings = shopSettings.pricing && typeof shopSettings.pricing === 'object' ? shopSettings.pricing : null;
  let walletSource = legacyWalletSource;

  if (pricingSettings && Array.isArray(pricingSettings.coins)) {
    const mapped = mergeCoinPricing(pricingSettings.coins, legacyWalletSource);
    if (mapped.length) {
      walletSource = mapped;
    }
  }

  if (!config.pricing) config.pricing = {};
  if (pricingSettings && pricingSettings.currency) {
    config.pricing.currency = pricingSettings.currency;
  }
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

  if (pricingSettings && Array.isArray(pricingSettings.vip)) {
    const legacyVip = config.pricing && typeof config.pricing === 'object' ? config.pricing.vip || {} : {};
    const vipOverrides = mergeVipPricing(pricingSettings.vip, legacyVip);
    if (vipOverrides && Object.keys(vipOverrides).length) {
      config.pricing.vip = { ...legacyVip, ...vipOverrides };
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
