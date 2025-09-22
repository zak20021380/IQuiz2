import { getAdminSettings, subscribeToAdminSettings } from './admin-settings.js';

// Remote configuration settings and helpers for IQuiz assets.

export const RemoteConfig = {
  ab: (Math.random() < 0.5) ? 'A' : 'B',

  provinceTargeting: { enabled: true, allow: ['تهران','کردستان','آذربایجان غربی','اصفهان'] },

  ads: {
    enabled: true,
    placements: { banner:true, native:true, interstitial:true, rewarded:true },
    freqCaps: { interstitialPerSession: 2, rewardedPerSession: 3 },
    interstitialCooldownMs: 60_000,
    rewardedMinWatchMs: 7_000,
    session: { interstitialShown: 0, rewardedShown: 0, lastInterstitialAt: 0 }
  },

  pricing: {
    usdToToman: 70_000,

    coins: [
      { id:'c100',  amount:100,  bonus:0,  priceToman: 59_000,   priceCents:199  },
      { id:'c500',  amount:500,  bonus:5,  priceToman: 239_000,  priceCents:799  },
      { id:'c1200', amount:1200, bonus:12, priceToman: 459_000,  priceCents:1499 },
      { id:'c3000', amount:3000, bonus:25, priceToman: 899_000,  priceCents:2999 }
    ],

    vip: {
      lite: { id:'vip_lite', priceCents:299 },
      pro:  { id:'vip_pro',  priceCents:599 }
    },

    keys: [
      { id:'k1',  amount:1,  priceGame:30,  label:'بسته کوچک',    displayName:'بسته کوچک',    priority: 1 },
      { id:'k3',  amount:3,  priceGame:80,  label:'بسته اقتصادی',  displayName:'بسته اقتصادی', priority: 2 },
      { id:'k10', amount:10, priceGame:250, label:'بسته بزرگ',     displayName:'بسته بزرگ',   priority: 3 }
    ]
  },

  abOverrides: {
    A: { ads:{ freqCaps:{ interstitialPerSession:2 } } },
    B: { ads:{ freqCaps:{ interstitialPerSession:1 } } }
  },

  gameLimits: {
    matches: { daily: 5, vipMultiplier: 2, recoveryTime: 2 * 60 * 60 * 1000 },
    duels:   { daily: 3, vipMultiplier: 2, recoveryTime: 30 * 60 * 1000 },
    lives:   { daily: 3, vipMultiplier: 2, recoveryTime: 30 * 60 * 1000 },
    groupBattles: { daily: 2, vipMultiplier: 2, recoveryTime: 60 * 60 * 1000 },
    energy:  { daily: 10, vipMultiplier: 2, recoveryTime: 15 * 60 * 1000 }
  }
};

export function patchPricingKeys(config = RemoteConfig){
  const defaults = [
    { id:'k1',  amount:1,  priceGame:30,  label:'بسته کوچک',    displayName:'بسته کوچک',    priority: 1 },
    { id:'k3',  amount:3,  priceGame:80,  label:'بسته اقتصادی',  displayName:'بسته اقتصادی', priority: 2 },
    { id:'k10', amount:10, priceGame:250, label:'بسته بزرگ',     displayName:'بسته بزرگ',   priority: 3 }
  ];

  if (!config.pricing) config.pricing = {};

  const packs = config.pricing.keys;
  const invalid = (p)=> typeof p?.amount!=='number' || typeof p?.priceGame!=='number' || p.amount<=0 || p.priceGame<=0;

  if (!Array.isArray(packs)){
    config.pricing.keys = defaults;
  } else if (packs.length === 0) {
    config.pricing.keys = [];
  } else if (packs.some(invalid)){
    config.pricing.keys = defaults;
  } else {
    config.pricing.keys = packs
      .map((p, index) => {
        const amount = +p.amount;
        const normalized = {
          ...p,
          id: String(p.id || ('k' + amount) || 'k' + (index + 1)),
          amount,
          priceGame: +p.priceGame,
        };
        const fallbackLabel = amount<=1 ? 'بسته کوچک' : amount<=3 ? 'بسته اقتصادی' : 'بسته بزرگ';
        normalized.label = p.label || p.displayName || fallbackLabel;
        normalized.displayName = p.displayName || normalized.label;
        if (p.badge != null) normalized.badge = p.badge;
        if (p.description != null) normalized.description = p.description;
        normalized.priority = Number.isFinite(p.priority) ? Number(p.priority) : (index + 1);
        return normalized;
      })
      .filter(p => p.amount>0 && p.priceGame>0)
      .sort((a,b)=> (a.priority ?? a.amount) - (b.priority ?? b.amount));
  }

  return config.pricing.keys;
}

export function applyAB(config = RemoteConfig){
  const overrides = config?.abOverrides?.[config?.ab];
  if(!overrides) return config;

  const deepMerge = (target, source) => {
    for (const key in source){
      const value = source[key];
      if (typeof value === 'object' && value){
        target[key] = target[key] || {};
        deepMerge(target[key], value);
      } else {
        target[key] = value;
      }
    }
  };

  deepMerge(config, overrides);
  return config;
}

function applyAdminOverrides(config, settings){
  if (!settings || typeof settings !== 'object') return config;
  if (!config.pricing) config.pricing = {};

  const shop = settings.shop || {};
  const keyPackages = Array.isArray(shop.packages?.keys) ? shop.packages.keys : [];
  const walletPackages = Array.isArray(shop.packages?.wallet) ? shop.packages.wallet : [];
  const vipPlans = Array.isArray(shop.vip) ? shop.vip : [];

  if (keyPackages.length){
    config.pricing.keys = keyPackages.map((pkg, index) => ({
      ...pkg,
      id: String(pkg.id || ('k' + (pkg.amount || index + 1))),
      amount: Number(pkg.amount) || 0,
      priceGame: Number(pkg.priceGame ?? pkg.price) || 0,
      label: pkg.displayName || pkg.badge || (pkg.amount <= 1 ? 'بسته کوچک' : pkg.amount <= 3 ? 'بسته اقتصادی' : 'بسته بزرگ'),
    }));
  }

  if (walletPackages.length){
    config.pricing.coins = walletPackages
      .map((pkg, index) => ({
        id: String(pkg.id || ('w' + (pkg.amount || index + 1))),
        amount: Number(pkg.amount) || 0,
        bonus: Number(pkg.bonus) || 0,
        priceToman: Number(pkg.priceToman ?? pkg.price) || 0,
        priceCents: config.pricing.usdToToman ? Math.round(((Number(pkg.priceToman ?? pkg.price) || 0) / config.pricing.usdToToman) * 100) : undefined,
        displayName: pkg.displayName || '',
        paymentMethod: pkg.paymentMethod || '',
        priority: Number(pkg.priority) || (index + 1),
      }))
      .filter(pkg => pkg.amount > 0 && pkg.priceToman > 0)
      .sort((a,b)=> (a.priority ?? a.amount) - (b.priority ?? b.amount));
  }

  if (!config.pricing.vip) config.pricing.vip = {};
  const seenTiers = new Set();
  vipPlans.forEach((plan, index) => {
    const tier = plan.tier || plan.id || `vip_${index + 1}`;
    seenTiers.add(tier);
    const base = config.pricing.vip[tier] || {};
    config.pricing.vip[tier] = {
      ...base,
      id: plan.id || base.id || tier,
      priceCents: base.priceCents,
      displayName: plan.displayName || base.displayName || tier,
      priceToman: Number(plan.price) || base.priceToman || 0,
      period: plan.period || base.period || '',
      buttonText: plan.buttonText || base.buttonText || '',
      benefits: Array.isArray(plan.benefits) ? plan.benefits.slice() : (base.benefits || []),
      active: plan.active !== false,
    };
  });
  Object.keys(config.pricing.vip).forEach((tier) => {
    if (!seenTiers.has(tier)) {
      config.pricing.vip[tier] = { ...config.pricing.vip[tier], active: false };
    }
  });

  config.shop = {
    ...config.shop,
    enabled: shop.enabled !== false,
    currency: shop.currency || config.shop?.currency || 'coin',
    lowBalanceThreshold: typeof shop.lowBalanceThreshold === 'number' ? shop.lowBalanceThreshold : (config.shop?.lowBalanceThreshold ?? 0),
    quickTopup: shop.quickTopup !== false,
    quickPurchase: shop.quickPurchase !== false,
    dynamicPricing: !!shop.dynamicPricing,
    hero: { ...(shop.hero || {}) },
    sections: { ...(shop.sections || {}) },
    promotions: { ...(shop.promotions || {}) },
    messaging: { ...(shop.messaging || {}) },
    packages: { ...(shop.packages || {}) },
    vipPlans: vipPlans,
  };

  return config;
}

const initialAdminSettings = getAdminSettings();
applyAdminOverrides(RemoteConfig, initialAdminSettings);
patchPricingKeys(RemoteConfig);
applyAB(RemoteConfig);

subscribeToAdminSettings((settings) => {
  applyAdminOverrides(RemoteConfig, settings);
  patchPricingKeys(RemoteConfig);
});
