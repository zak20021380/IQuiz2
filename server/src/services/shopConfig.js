const { getFallbackConfig } = require('./publicContent');

function getShopConfig() {
  const config = getFallbackConfig();
  return config || {};
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
  })).filter((pkg) => pkg.id && pkg.amount > 0 && pkg.priceToman > 0);
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
