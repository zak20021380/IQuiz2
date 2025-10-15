const ADMIN_SETTINGS_STORAGE_KEY = 'iquiz_admin_settings_v1';

const DEFAULT_GENERAL = Object.freeze({
  appName: 'Quiz WebApp Pro',
  language: 'fa',
  questionTime: 30,
  maxQuestions: 10,
});

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

const DEFAULT_REWARDS = Object.freeze({
  pointsCorrect: 100,
  coinsCorrect: 5,
  pointsStreak: 50,
  coinsStreak: 10,
  groupBattleRewards: DEFAULT_GROUP_BATTLE_REWARDS,
  duelRewards: DEFAULT_DUEL_REWARDS,
});

const DEFAULT_SHOP = Object.freeze({
  enabled: true,
  currency: 'coin',
  lowBalanceThreshold: 200,
  quickTopup: true,
  quickPurchase: true,
  dynamicPricing: false,
  hero: {
    title: 'به فروشگاه ایکویز خوش آمدید',
    subtitle: 'هر روز پیشنهادهای تازه و کلیدهای بیشتر دریافت کنید.',
    ctaText: 'مشاهده پیشنهادها',
    ctaLink: '#wallet',
    theme: 'sky',
    note: '',
    showBalances: true,
    showTags: true,
  },
  sections: {
    hero: true,
    keys: true,
    wallet: true,
    vip: true,
    promotions: true,
  },
  packages: {
    keys: [],
    wallet: [],
  },
  vip: [],
  promotions: {
    defaultDiscount: 0,
    dailyLimit: 0,
    startDate: '',
    endDate: '',
    bannerMessage: '',
    autoHighlight: true,
  },
  messaging: {
    lowBalance: '',
    success: '',
    supportCta: '',
    supportLink: '',
    showTutorial: true,
  },
});

const DEFAULT_SETTINGS = Object.freeze({
  general: DEFAULT_GENERAL,
  rewards: DEFAULT_REWARDS,
  shop: DEFAULT_SHOP,
  updatedAt: 0,
});

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toPositive(value, fallback = 0) {
  const num = toNumber(value, fallback);
  return num > 0 ? num : fallback;
}

function safeString(value, fallback = '') {
  if (value == null) return fallback;
  const str = String(value).trim();
  return str.length ? str : fallback;
}

function cloneArray(input) {
  return Array.isArray(input) ? input.slice() : [];
}

function normalizeGeneral(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const questionTime = toPositive(source.questionTime, DEFAULT_GENERAL.questionTime);
  const maxQuestions = toPositive(source.maxQuestions, DEFAULT_GENERAL.maxQuestions);
  return {
    appName: safeString(source.appName, DEFAULT_GENERAL.appName),
    language: safeString(source.language, DEFAULT_GENERAL.language) || DEFAULT_GENERAL.language,
    questionTime,
    maxQuestions,
  };
}

function normalizeRewards(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const groupBattle = source.groupBattleRewards || source.groupBattle;
  return {
    pointsCorrect: Math.max(0, toNumber(source.pointsCorrect, DEFAULT_REWARDS.pointsCorrect)),
    coinsCorrect: Math.max(0, toNumber(source.coinsCorrect, DEFAULT_REWARDS.coinsCorrect)),
    pointsStreak: Math.max(0, toNumber(source.pointsStreak, DEFAULT_REWARDS.pointsStreak)),
    coinsStreak: Math.max(0, toNumber(source.coinsStreak, DEFAULT_REWARDS.coinsStreak)),
    groupBattleRewards: normalizeGroupBattleRewards(groupBattle),
    duelRewards: normalizeDuelRewards(source.duelRewards || source.duel),
  };
}

function normalizeGroupBattleRewards(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const winnerSource = source.winner && typeof source.winner === 'object' ? source.winner : {};
  const loserSource = source.loser && typeof source.loser === 'object' ? source.loser : {};
  const fallback = DEFAULT_GROUP_BATTLE_REWARDS;
  const sanitize = (value, fallbackValue) => Math.max(0, toNumber(value, fallbackValue));
  return {
    winner: {
      coins: sanitize(winnerSource.coins, fallback.winner.coins),
      score: sanitize(winnerSource.score, fallback.winner.score),
    },
    loser: {
      coins: sanitize(loserSource.coins, fallback.loser.coins),
      score: sanitize(loserSource.score, fallback.loser.score),
    },
    groupScore: sanitize(source.groupScore, fallback.groupScore),
  };
}

function normalizeDuelRewards(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const fallback = DEFAULT_DUEL_REWARDS;
  const sanitize = (value, fallbackValue) => Math.max(0, toNumber(value, fallbackValue));
  const buildOutcome = (key) => {
    const outcomeSource = source[key] && typeof source[key] === 'object' ? source[key] : {};
    const fallbackOutcome = fallback[key] || { coins: 0, score: 0 };
    return {
      coins: sanitize(outcomeSource.coins, fallbackOutcome.coins),
      score: sanitize(outcomeSource.score, fallbackOutcome.score),
    };
  };
  return {
    winner: buildOutcome('winner'),
    loser: buildOutcome('loser'),
    draw: buildOutcome('draw'),
  };
}

function normalizeKeyPackages(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((pkg, index) => {
      const source = pkg && typeof pkg === 'object' ? pkg : {};
      const id = safeString(source.id || source.packageId || '', '');
      const amount = toPositive(source.amount, 0);
      const priceGame = toPositive(source.price, 0);
      const priority = toNumber(source.priority, index + 1);
      return {
        id,
        amount,
        priceGame,
        displayName: safeString(source.displayName, ''),
        badge: safeString(source.badge, ''),
        description: safeString(source.description, ''),
        priority,
        active: source.active !== false,
      };
    })
    .filter((pkg) => pkg.id && pkg.amount > 0 && pkg.priceGame > 0 && pkg.active)
    .sort((a, b) => a.priority - b.priority);
}

function normalizeWalletPackages(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((pkg, index) => {
      const source = pkg && typeof pkg === 'object' ? pkg : {};
      const id = safeString(source.id || source.packageId || '', '');
      const amount = toPositive(source.amount, 0);
      const priceToman = toPositive(source.price, 0);
      const priority = toNumber(source.priority, index + 1);
      return {
        id,
        amount,
        priceToman,
        bonus: Math.max(0, toNumber(source.bonus, 0)),
        displayName: safeString(source.displayName, ''),
        paymentMethod: safeString(source.paymentMethod, ''),
        priority,
        active: source.active !== false,
      };
    })
    .filter((pkg) => pkg.id && pkg.amount > 0 && pkg.priceToman > 0 && pkg.active)
    .sort((a, b) => a.priority - b.priority);
}

function normalizeVipPlans(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((plan, index) => {
      const source = plan && typeof plan === 'object' ? plan : {};
      const tierFallback = `vip_${index + 1}`;
      const id = safeString(source.id || source.planId || source.tier || tierFallback, tierFallback);
      const tier = safeString(source.tier || source.planId || source.id || tierFallback, tierFallback);
      const benefitsRaw = cloneArray(source.benefits).map((item) => safeString(item, '')).filter(Boolean);
      return {
        id,
        tier,
        active: source.active !== false,
        displayName: safeString(source.displayName, ''),
        price: Math.max(0, toNumber(source.price, 0)),
        period: safeString(source.period, ''),
        buttonText: safeString(source.buttonText, ''),
        benefits: benefitsRaw,
      };
    })
    .filter((plan) => plan.id && plan.tier && plan.active);
}

function normalizePromotions(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    defaultDiscount: Math.max(0, toNumber(source.defaultDiscount, DEFAULT_SHOP.promotions.defaultDiscount)),
    dailyLimit: Math.max(0, toNumber(source.dailyLimit, DEFAULT_SHOP.promotions.dailyLimit)),
    startDate: safeString(source.startDate, DEFAULT_SHOP.promotions.startDate),
    endDate: safeString(source.endDate, DEFAULT_SHOP.promotions.endDate),
    bannerMessage: safeString(source.bannerMessage, DEFAULT_SHOP.promotions.bannerMessage),
    autoHighlight: source.autoHighlight !== false,
  };
}

function normalizeMessaging(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    lowBalance: safeString(source.lowBalance, DEFAULT_SHOP.messaging.lowBalance),
    success: safeString(source.success, DEFAULT_SHOP.messaging.success),
    supportCta: safeString(source.supportCta, DEFAULT_SHOP.messaging.supportCta),
    supportLink: safeString(source.supportLink, DEFAULT_SHOP.messaging.supportLink),
    showTutorial: source.showTutorial !== false,
  };
}

function normalizeHero(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    title: safeString(source.title, DEFAULT_SHOP.hero.title),
    subtitle: safeString(source.subtitle, DEFAULT_SHOP.hero.subtitle),
    ctaText: safeString(source.ctaText, DEFAULT_SHOP.hero.ctaText),
    ctaLink: safeString(source.ctaLink, DEFAULT_SHOP.hero.ctaLink),
    theme: safeString(source.theme, DEFAULT_SHOP.hero.theme) || DEFAULT_SHOP.hero.theme,
    note: safeString(source.note, ''),
    showBalances: source.showBalances !== false,
    showTags: source.showTags !== false,
  };
}

function normalizeShop(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const sectionsRaw = source.sections && typeof source.sections === 'object' ? source.sections : {};
  const sections = {
    hero: sectionsRaw.hero !== false,
    keys: sectionsRaw.keys !== false,
    wallet: sectionsRaw.wallet !== false,
    vip: sectionsRaw.vip !== false,
    promotions: sectionsRaw.promotions !== false,
  };
  const keys = normalizeKeyPackages(source.packages?.keys || source.keys);
  const wallet = normalizeWalletPackages(source.packages?.wallet || source.wallet);
  const vip = normalizeVipPlans(source.vip);
  return {
    enabled: source.enabled !== false,
    currency: safeString(source.currency, DEFAULT_SHOP.currency) || DEFAULT_SHOP.currency,
    lowBalanceThreshold: Math.max(0, toNumber(source.lowBalanceThreshold, DEFAULT_SHOP.lowBalanceThreshold)),
    quickTopup: source.quickTopup !== false,
    quickPurchase: source.quickPurchase !== false,
    dynamicPricing: !!source.dynamicPricing,
    hero: normalizeHero(source.hero),
    sections,
    packages: { keys, wallet },
    vip,
    promotions: normalizePromotions(source.promotions),
    messaging: normalizeMessaging(source.messaging),
  };
}

function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  return {
    general: normalizeGeneral(raw.general),
    rewards: normalizeRewards(raw.rewards),
    shop: normalizeShop(raw.shop),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

const ADMIN_SETTINGS_ENDPOINT = '/api/public/admin-settings';
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const MIN_REFRESH_INTERVAL_MS = 30 * 1000;

let cachedSettings = normalizeSettings(DEFAULT_SETTINGS);
let lastFetchedAt = 0;
let fetchPromise = null;
let listenersAttached = false;
const subscribers = new Set();

function notifySubscribers(settings) {
  subscribers.forEach((subscriber) => {
    if (typeof subscriber !== 'function') return;
    try {
      subscriber(settings);
    } catch (err) {
      console.error('[admin-settings] callback error', err);
    }
  });
}

function applyAndCache(settings) {
  cachedSettings = normalizeSettings(settings || DEFAULT_SETTINGS);
  notifySubscribers(cachedSettings);
  return cachedSettings;
}

async function fetchAdminSettingsFromServer() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return cachedSettings;
  }
  try {
    const response = await window.fetch(ADMIN_SETTINGS_ENDPOINT, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json().catch(() => ({}));
    const data = payload && typeof payload === 'object'
      ? (payload.data && typeof payload.data === 'object' ? payload.data : payload)
      : {};
    if (data && typeof data === 'object') {
      lastFetchedAt = Date.now();
      return applyAndCache(data);
    }
  } catch (error) {
    console.warn('[admin-settings] failed to fetch settings from server', error);
  }
  return cachedSettings;
}

export function refreshAdminSettings(options = {}) {
  const { force = false } = options;
  if (!force && fetchPromise) {
    return fetchPromise;
  }
  if (!force && Date.now() - lastFetchedAt < MIN_REFRESH_INTERVAL_MS) {
    return Promise.resolve(cachedSettings);
  }
  fetchPromise = fetchAdminSettingsFromServer().finally(() => {
    fetchPromise = null;
  });
  return fetchPromise;
}

function ensureEventListeners() {
  if (listenersAttached || typeof window === 'undefined') {
    return;
  }
  listenersAttached = true;

  const handleCustomUpdate = (event) => {
    if (!event || typeof event !== 'object') return;
    applyAndCache(event.detail || cachedSettings);
  };

  window.addEventListener('iquiz-admin-settings-updated', handleCustomUpdate);

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshAdminSettings({ force: true }).catch(() => {});
      }
    });
  }

  if (AUTO_REFRESH_INTERVAL_MS > 0 && typeof window.setInterval === 'function') {
    window.setInterval(() => {
      refreshAdminSettings({ force: true }).catch(() => {});
    }, AUTO_REFRESH_INTERVAL_MS);
  }
}

export function getAdminSettings() {
  return cachedSettings;
}

export function subscribeToAdminSettings(callback) {
  if (typeof callback === 'function') {
    subscribers.add(callback);
    try {
      callback(cachedSettings);
    } catch (err) {
      console.error('[admin-settings] callback error', err);
    }
  }

  ensureEventListeners();
  refreshAdminSettings().catch(() => {});

  return () => {
    subscribers.delete(callback);
  };
}

ensureEventListeners();
refreshAdminSettings().catch(() => {});

export {
  ADMIN_SETTINGS_STORAGE_KEY,
  DEFAULT_GENERAL,
  DEFAULT_REWARDS,
  DEFAULT_GROUP_BATTLE_REWARDS,
  DEFAULT_DUEL_REWARDS,
  DEFAULT_SHOP,
  DEFAULT_SETTINGS,
};
