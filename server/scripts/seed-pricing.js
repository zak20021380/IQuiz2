#!/usr/bin/env node

const { loadAdminSettings, saveAdminSettings } = require('../src/config/adminSettings');
const { getFallbackConfig } = require('../src/services/publicContent');

function buildCoinPricingFromFallback(fallbackCoins = []) {
  return fallbackCoins
    .map((coin, index) => {
      if (!coin || typeof coin !== 'object') return null;
      const id = String(coin.id || `coin-${index + 1}`).trim();
      if (!id) return null;
      const amount = Number.isFinite(Number(coin.amount)) ? Math.max(1, Math.trunc(Number(coin.amount))) : null;
      const price = Number.isFinite(Number(coin.priceToman ?? coin.price))
        ? Math.max(0, Math.trunc(Number(coin.priceToman ?? coin.price)))
        : null;
      if (!amount || price === null) return null;
      return {
        id,
        title: coin.label || `${amount} coins`,
        coins: amount,
        priceIrr: price,
        featured: coin.featured === true,
        active: coin.active !== false,
      };
    })
    .filter(Boolean);
}

function buildVipPricingFromFallback(fallbackVip = {}) {
  const result = [];
  if (!fallbackVip || typeof fallbackVip !== 'object') return result;
  Object.entries(fallbackVip).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') return;
    const id = String(value.id || key || '').trim();
    if (!id) return;
    const title = String(value.title || key || id).trim();
    const price = Number.isFinite(Number(value.priceToman ?? value.price ?? 0))
      ? Math.max(0, Math.trunc(Number(value.priceToman ?? value.price ?? 0)))
      : 0;
    const durationDays = Number.isFinite(Number(value.durationDays)) ? Number(value.durationDays) : 0;
    const durationMonths = Number.isFinite(Number(value.durationMonths)) ? Number(value.durationMonths) : 0;
    const months = durationMonths > 0
      ? Math.max(1, Math.trunc(durationMonths))
      : durationDays > 0
        ? Math.max(1, Math.trunc(durationDays / 30))
        : 1;
    result.push({
      id,
      title: title || id,
      months,
      priceIrr: price,
      active: value.active !== false,
    });
  });
  return result;
}

async function main() {
  try {
    const current = loadAdminSettings();
    const existingPricing = current?.shop?.pricing;
    const hasExisting = Array.isArray(existingPricing?.coins) && existingPricing.coins.length > 0
      || Array.isArray(existingPricing?.vip) && existingPricing.vip.length > 0;
    if (hasExisting) {
      console.log('Shop pricing already configured. Skipping seed.');
      return;
    }

    const fallbackConfig = getFallbackConfig();
    const fallbackPricing = fallbackConfig?.pricing || {};
    const coins = buildCoinPricingFromFallback(fallbackPricing.coins);
    const vip = buildVipPricingFromFallback(fallbackPricing.vip);

    const payload = {
      shop: {
        pricing: {
          currency: 'IRR',
          coins,
          vip,
        },
      },
    };

    await saveAdminSettings(payload, { actorId: 'seed-pricing' });
    console.log('Seeded shop pricing into admin settings.');
  } catch (error) {
    console.error('Failed to seed pricing', error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
