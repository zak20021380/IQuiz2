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
      lite: {
        id:'vip_lite',
        displayName:'وی‌آی‌پی لایت',
        priceToman: 99_000,
        priceCents:299,
        period:'ماهانه',
        buttonText:'شروع اشتراک',
        benefits:[
          'حذف تبلیغات بنری',
          'دو برابر محدودیت روزانه مسابقه/کلید'
        ],
        order:1,
        badge:'شروع هوشمند'
      },
      pro:  {
        id:'vip_pro',
        displayName:'وی‌آی‌پی پرو',
        priceToman: 199_000,
        priceCents:599,
        period:'ماهانه',
        buttonText:'ارتقا به پرو',
        benefits:[
          'حذف تمام تبلیغات',
          'سه برابر محدودیت روزانه مسابقه/کلید',
          'جوایز و ماموریت‌های اختصاصی'
        ],
        order:2,
        badge:'حرفه‌ای‌ها'
      }
    },

    keys: [
      { id:'k1',  amount:1,  priceGame:30,  label:'بسته کوچک',    displayName:'بسته کوچک',    priority: 1 },
      { id:'k3',  amount:3,  priceGame:80,  label:'بسته اقتصادی',  displayName:'بسته اقتصادی', priority: 2 },
      { id:'k10', amount:10, priceGame:250, label:'بسته بزرگ',     displayName:'بسته بزرگ',   priority: 3 }
    ]
  },

  shop: {
    enabled: true,
    sections: { hero: true, keys: true, wallet: true, vip: true },
    vipPlans: [
      {
        id: 'vip_lite',
        tier: 'lite',
        displayName: 'وی‌آی‌پی لایت',
        price: 99_000,
        period: 'ماهانه',
        buttonText: 'شروع اشتراک',
        benefits: ['حذف تبلیغات بنری', 'دو برابر محدودیت روزانه مسابقه/کلید'],
        badge: 'شروع هوشمند',
        featured: false,
        order: 1,
        active: true
      },
      {
        id: 'vip_pro',
        tier: 'pro',
        displayName: 'وی‌آی‌پی پرو',
        price: 199_000,
        period: 'ماهانه',
        buttonText: 'ارتقا به پرو',
        benefits: ['حذف تمام تبلیغات', 'سه برابر محدودیت روزانه', 'جوایز و ماموریت‌های اختصاصی'],
        badge: 'حرفه‌ای‌ها',
        featured: true,
        order: 2,
        active: true
      }
    ],
    vipSummary: {
      enabled: true,
      customNote: 'با فعال‌سازی VIP تبلیغات حذف می‌شود و محدودیت‌های روزانه افزایش می‌یابد.',
      perks: [],
      trialDays: 3,
      slots: 150,
      autoRenew: true,
      autoApprove: true,
      billingCycle: 'monthly'
    }
  },

  abOverrides: {
    A: { ads:{ freqCaps:{ interstitialPerSession:2 } } },
    B: { ads:{ freqCaps:{ interstitialPerSession:1 } } }
  },

  gameLimits: {
    matches: { daily: 3, vipMultiplier: 2, recoveryTime: 2 * 60 * 60 * 1000 },
    duels:   { daily: 1, vipMultiplier: 2, recoveryTime: 30 * 60 * 1000 },
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
  const vipPlans = Array.isArray(shop.vipPlans)
    ? shop.vipPlans
    : Array.isArray(shop.vip?.plans)
      ? shop.vip.plans
      : Array.isArray(shop.vip)
        ? shop.vip
        : [];

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
  const sanitizedVipPlans = [];
  vipPlans.forEach((plan, index) => {
    if (!plan || typeof plan !== 'object') return;
    const fallbackTier = `vip_${index + 1}`;
    const tierRaw = plan.tier || plan.id || fallbackTier;
    const tier = typeof tierRaw === 'string' && tierRaw.trim() ? tierRaw.trim() : fallbackTier;
    const base = config.pricing.vip[tier] || {};
    const toNumber = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : NaN;
    };
    const toText = (value, fallback = '') => {
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof fallback === 'string' && fallback.trim()) return fallback.trim();
      return '';
    };
    const toBool = (value) => value === true || value === 'true';

    const providedPrice = toNumber(plan.price ?? plan.priceToman);
    const resolvedPriceToman = Number.isFinite(providedPrice) && providedPrice > 0
      ? providedPrice
      : (Number.isFinite(base.priceToman) ? Number(base.priceToman) : 0);
    const resolvedPriceCents = Number.isFinite(plan.priceCents)
      ? Number(plan.priceCents)
      : (resolvedPriceToman > 0 && Number.isFinite(config.pricing.usdToToman)
          ? Math.round((resolvedPriceToman / config.pricing.usdToToman) * 100)
          : (Number.isFinite(base.priceCents) ? Number(base.priceCents) : undefined));

    const benefits = Array.isArray(plan.benefits)
      ? plan.benefits.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
      : Array.isArray(base.benefits)
        ? base.benefits.slice()
        : [];
    const order = Number.isFinite(plan.order) ? Number(plan.order) : (Number.isFinite(base.order) ? Number(base.order) : index + 1);
    const badge = toText(plan.badge, base.badge || '');
    const featured = toBool(plan.featured) || (!!base.featured && plan.featured !== false);
    const buttonText = toText(plan.buttonText, base.buttonText || 'خرید اشتراک') || 'خرید اشتراک';
    const period = toText(plan.period, base.period || '');
    const displayName = toText(plan.displayName, base.displayName || tier) || tier;
    const id = toText(plan.id, base.id || tier) || tier;
    const isActive = plan.active !== false;

    config.pricing.vip[tier] = {
      ...base,
      id,
      displayName,
      priceToman: resolvedPriceToman,
      priceCents: resolvedPriceCents,
      period,
      buttonText,
      benefits,
      badge,
      featured,
      order,
      active: isActive,
    };

    sanitizedVipPlans.push({
      id,
      tier,
      displayName,
      price: resolvedPriceToman,
      period,
      buttonText,
      benefits,
      badge,
      featured,
      order,
      active: isActive,
    });

    seenTiers.add(tier);
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
    vipPlans: sanitizedVipPlans.length ? sanitizedVipPlans : vipPlans,
    vipSummary: {
      enabled: shop.vip?.enabled !== false,
      customNote: typeof shop.vip?.customNote === 'string' ? shop.vip.customNote : '',
      perks: Array.isArray(shop.vip?.perks) ? shop.vip.perks.slice() : [],
      trialDays: Number.isFinite(shop.vip?.trialDays) ? Number(shop.vip.trialDays) : 0,
      slots: Number.isFinite(shop.vip?.slots) ? Number(shop.vip.slots) : 0,
      autoRenew: shop.vip?.autoRenew !== false,
      autoApprove: shop.vip?.autoApprove !== false,
      billingCycle: typeof shop.vip?.billingCycle === 'string' ? shop.vip.billingCycle : '',
    }
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
