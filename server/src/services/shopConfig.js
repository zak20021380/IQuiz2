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

module.exports = {
  getShopConfig,
  getCoinPackages,
  findCoinPackage,
};
