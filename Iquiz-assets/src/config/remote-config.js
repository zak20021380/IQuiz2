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

    coins: [],

    vip: {},

    keys: [
      { id:'k1',  amount:1,  priceGame:30,  label:'بسته کوچک',    displayName:'بسته کوچک',    priority: 1 },
      { id:'k3',  amount:3,  priceGame:80,  label:'بسته اقتصادی',  displayName:'بسته اقتصادی', priority: 2 },
      { id:'k10', amount:10, priceGame:250, label:'بسته بزرگ',     displayName:'بسته بزرگ',   priority: 3 }
    ]
  },

  shop: {
    enabled: true,
    sections: { hero: true, keys: true, wallet: true, vip: true },
    vipPlans: [],
    vipSummary: {
      enabled: true,
      customNote: 'اشتراک VIP فقط یک پلن دارد؛ با فعال‌سازی، تبلیغات حذف و محدودیت‌های روزانه افزایش می‌یابد.',
      perks: ['حذف تبلیغات', 'دو برابر شدن محدودیت‌ها', 'جوایز اختصاصی'],
      trialDays: 0,
      slots: 0,
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

function normalizeServerCoinPackages(pricingCoins, existing = [], usdToToman) {
  const legacy = new Map(
    (Array.isArray(existing) ? existing : []).map((pkg) => {
      const key = typeof pkg?.id === 'string' ? pkg.id.trim() : '';
      return [key, pkg];
    })
  );

  const list = Array.isArray(pricingCoins) ? pricingCoins : [];
  return list
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const baseId = typeof entry.id === 'string' ? entry.id.trim() : '';
      const packageId = typeof entry.packageId === 'string' ? entry.packageId.trim() : '';
      let id = baseId || packageId;
      const coinsRaw = entry.coins ?? entry.amount;
      const amount = Number.isFinite(Number(coinsRaw)) ? Math.max(0, Number(coinsRaw)) : 0;
      if (!id && amount > 0) id = `c${Math.round(amount)}`;
      if (!id) id = `coin_${index + 1}`;
      const legacyPkg = legacy.get(id) || {};
      const priceRaw = entry.priceIrr ?? entry.priceIRR ?? entry.price ?? entry.priceToman ?? entry.price;
      const priceToman = Number.isFinite(Number(priceRaw)) ? Math.max(0, Number(priceRaw)) : 0;
      if (!amount || !priceToman) return null;
      const bonusRaw = entry.bonus ?? legacyPkg.bonus ?? 0;
      const bonus = Number.isFinite(Number(bonusRaw)) ? Math.max(0, Number(bonusRaw)) : 0;
      const priorityRaw = entry.priority ?? legacyPkg.priority;
      const priority = Number.isFinite(Number(priorityRaw)) ? Number(priorityRaw) : index + 1;
      const displayName = typeof entry.title === 'string' && entry.title.trim()
        ? entry.title.trim()
        : (typeof entry.displayName === 'string' && entry.displayName.trim()
            ? entry.displayName.trim()
            : (legacyPkg.displayName || (amount ? `بسته ${amount} سکه` : id)));
      const paymentMethod = typeof entry.paymentMethod === 'string' && entry.paymentMethod.trim()
        ? entry.paymentMethod.trim()
        : (legacyPkg.paymentMethod || '');
      const badge = typeof entry.badge === 'string' && entry.badge.trim()
        ? entry.badge.trim()
        : (legacyPkg.badge || '');
      const description = typeof entry.description === 'string' && entry.description.trim()
        ? entry.description.trim()
        : (legacyPkg.description || '');
      const active = entry.active !== false && legacyPkg.active !== false;
      const totalCoins = Math.round(amount + (amount * bonus) / 100);
      const normalized = {
        ...legacyPkg,
        id,
        amount,
        bonus,
        priceToman,
        price: priceToman,
        displayName,
        paymentMethod,
        badge,
        description,
        priority,
        totalCoins: totalCoins > 0 ? totalCoins : amount,
        active,
      };
      if (Number.isFinite(usdToToman) && usdToToman > 0) {
        normalized.priceCents = Math.round((priceToman / usdToToman) * 100);
      }
      return normalized;
    })
    .filter((pkg) => pkg && pkg.amount > 0 && pkg.priceToman > 0 && pkg.active !== false)
    .sort((a, b) => (a.priority ?? a.amount) - (b.priority ?? b.amount));
}

function normalizeServerVipPlans(pricingVip, existing = {}, usdToToman) {
  const list = Array.isArray(pricingVip)
    ? pricingVip
    : pricingVip && typeof pricingVip === 'object'
      ? Object.values(pricingVip)
      : [];

  const normalized = {};
  list.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    const tierRaw = typeof entry.tier === 'string' && entry.tier.trim() ? entry.tier.trim() : '';
    const idRaw = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : '';
    const key = tierRaw || idRaw || `vip_${index + 1}`;
    const base = existing && typeof existing === 'object' ? (existing[key] || existing[idRaw] || {}) : {};
    const priceRaw = entry.priceIrr ?? entry.priceIRR ?? entry.price ?? entry.priceToman ?? entry.price;
    const priceToman = Number.isFinite(Number(priceRaw)) ? Math.max(0, Number(priceRaw)) : 0;
    const displayName = typeof entry.title === 'string' && entry.title.trim()
      ? entry.title.trim()
      : (typeof entry.displayName === 'string' && entry.displayName.trim()
          ? entry.displayName.trim()
          : (base.displayName || key));
    const normalizedPlan = {
      ...base,
      id: idRaw || base.id || key,
      tier: key,
      displayName,
      active: entry.active !== false,
    };
    if (priceToman > 0) {
      normalizedPlan.priceToman = priceToman;
      normalizedPlan.price = priceToman;
      if (Number.isFinite(usdToToman) && usdToToman > 0) {
        normalizedPlan.priceCents = Math.round((priceToman / usdToToman) * 100);
      }
    }
    if (typeof entry.buttonText === 'string' && entry.buttonText.trim()) {
      normalizedPlan.buttonText = entry.buttonText.trim();
    }
    if (typeof entry.period === 'string' && entry.period.trim()) {
      normalizedPlan.period = entry.period.trim();
    }
    if (Array.isArray(entry.benefits) && entry.benefits.length) {
      normalizedPlan.benefits = entry.benefits
        .map((benefit) => (typeof benefit === 'string' ? benefit.trim() : ''))
        .filter(Boolean);
    }
    if (typeof entry.badge === 'string' && entry.badge.trim()) {
      normalizedPlan.badge = entry.badge.trim();
    }
    if (Number.isFinite(Number(entry.order))) {
      normalizedPlan.order = Number(entry.order);
    }
    normalized[key] = normalizedPlan;
  });

  return normalized;
}

export function applyServerPricing(config = RemoteConfig, pricing = {}) {
  if (!config || typeof config !== 'object') return {};
  if (!config.pricing) config.pricing = {};
  const target = config.pricing;

  if (pricing && typeof pricing === 'object') {
    const usd = Number(pricing.usdToToman);
    if (Number.isFinite(usd) && usd > 0) {
      target.usdToToman = usd;
    }
    const normalizedCoins = normalizeServerCoinPackages(pricing.coins, target.coins, target.usdToToman);
    target.coins = normalizedCoins;

    if (!config.shop) config.shop = {};
    if (!config.shop.packages || typeof config.shop.packages !== 'object') {
      config.shop.packages = {};
    }
    config.shop.packages.wallet = normalizedCoins.map((pkg) => ({ ...pkg }));

    const normalizedVip = normalizeServerVipPlans(pricing.vip, target.vip, target.usdToToman);
    if (Object.keys(normalizedVip).length) {
      target.vip = { ...(target.vip || {}), ...normalizedVip };
    } else if (!target.vip || typeof target.vip !== 'object') {
      target.vip = {};
    }

    const vipList = Object.values(target.vip || {}).filter((plan) => plan && plan.active !== false);
    config.shop.vipPlans = vipList
      .map((plan, index) => {
        const order = Number.isFinite(plan.order) ? Number(plan.order) : index + 1;
        return {
          id: plan.id || plan.tier || `vip_${index + 1}`,
          tier: plan.tier || plan.id || `vip_${index + 1}`,
          displayName: plan.displayName || plan.id || plan.tier || `vip_${index + 1}`,
          price: plan.priceToman || plan.price || 0,
          period: plan.period || '',
          buttonText: plan.buttonText || 'خرید اشتراک',
          benefits: Array.isArray(plan.benefits) ? plan.benefits.slice() : [],
          badge: plan.badge || '',
          featured: plan.featured || false,
          order,
          active: plan.active !== false,
        };
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } else {
    target.coins = [];
    if (!config.shop) config.shop = {};
    if (!config.shop.packages || typeof config.shop.packages !== 'object') {
      config.shop.packages = {};
    }
    config.shop.packages.wallet = [];
    if (!target.vip || typeof target.vip !== 'object') {
      target.vip = {};
    }
    config.shop.vipPlans = [];
  }

  return target;
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
        badge: typeof pkg.badge === 'string' ? pkg.badge : '',
        description: typeof pkg.description === 'string' ? pkg.description : '',
        active: pkg.active !== false,
        priority: Number(pkg.priority) || (index + 1),
        totalCoins: Math.round((Number(pkg.amount) || 0) + ((Number(pkg.amount) || 0) * (Number(pkg.bonus) || 0) / 100)),
      }))
      .filter(pkg => pkg.amount > 0 && pkg.priceToman > 0 && pkg.active !== false)
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
