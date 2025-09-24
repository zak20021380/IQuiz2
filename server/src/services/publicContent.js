const { CATEGORIES, resolveCategory } = require('../config/categories');

const DEFAULT_DIFFICULTIES = [
  { value: 'easy', label: 'آسان' },
  { value: 'medium', label: 'متوسط' },
  { value: 'hard', label: 'سخت' }
];

const CATEGORY_COLOR_HEX = {
  blue: '#60a5fa',
  orange: '#f97316',
  teal: '#14b8a6',
  indigo: '#6366f1',
  purple: '#a855f7',
  yellow: '#facc15',
  red: '#f87171',
  pink: '#f472b6'
};

const FALLBACK_CATEGORY_DATA = Array.from(CATEGORIES)
  .sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '', 'fa');
  })
  .map((category) => {
    const colorKey = category.color || 'blue';
    return {
      id: category.slug,
      slug: category.slug,
      title: category.displayName || category.name,
      displayName: category.displayName || category.name,
      name: category.name || category.displayName || 'Category',
      description: category.description || '',
      icon: category.icon || 'fa-layer-group',
      colorKey,
      color: CATEGORY_COLOR_HEX[colorKey] || CATEGORY_COLOR_HEX.blue,
      provider: category.provider || 'ai-gen',
      providerCategoryId: category.providerCategoryId || category.slug,
      order: category.order,
      aliases: Array.isArray(category.aliases) ? category.aliases : []
    };
  });

const FALLBACK_PROVINCES = [
  'آذربایجان شرقی',
  'آذربایجان غربی',
  'اردبیل',
  'اصفهان',
  'البرز',
  'ایلام',
  'بوشهر',
  'تهران',
  'چهارمحال و بختیاری',
  'خراسان جنوبی',
  'خراسان رضوی',
  'خراسان شمالی',
  'خوزستان',
  'زنجان',
  'سمنان',
  'سیستان و بلوچستان',
  'فارس',
  'قزوین',
  'قم',
  'کردستان',
  'کرمان',
  'کرمانشاه',
  'کهگیلویه و بویراحمد',
  'گلستان',
  'گیلان',
  'لرستان',
  'مازندران',
  'مرکزی',
  'هرمزگان',
  'همدان',
  'یزد'
].map(name => ({ name, score: 0, members: 0 }));

const FALLBACK_QUESTION_DATA = Object.freeze([]);

const DEFAULT_REMOTE_CONFIG = {
  ab: 'A',
  provinceTargeting: { enabled: true, allow: ['تهران', 'کردستان', 'آذربایجان غربی', 'اصفهان'] },
  ads: {
    enabled: true,
    placements: { banner: true, native: true, interstitial: true, rewarded: true },
    freqCaps: { interstitialPerSession: 2, rewardedPerSession: 3 },
    interstitialCooldownMs: 60_000,
    rewardedMinWatchMs: 7_000,
    session: { interstitialShown: 0, rewardedShown: 0, lastInterstitialAt: 0 }
  },
  pricing: {
    usdToToman: 70_000,
    coins: [
      { id: 'c100', amount: 100, bonus: 0, priceToman: 59_000, priceCents: 199 },
      { id: 'c500', amount: 500, bonus: 5, priceToman: 239_000, priceCents: 799 },
      { id: 'c1200', amount: 1200, bonus: 12, priceToman: 459_000, priceCents: 1499 },
      { id: 'c3000', amount: 3000, bonus: 25, priceToman: 899_000, priceCents: 2999 }
    ],
    vip: {
      lite: { id: 'vip_lite', priceCents: 299 },
      pro: { id: 'vip_pro', priceCents: 599 }
    },
    keys: [
      { id: 'k1', amount: 1, priceGame: 30, label: 'بسته کوچک' },
      { id: 'k3', amount: 3, priceGame: 80, label: 'بسته اقتصادی' },
      { id: 'k10', amount: 10, priceGame: 250, label: 'بسته بزرگ' }
    ]
  },
  abOverrides: {
    A: { ads: { freqCaps: { interstitialPerSession: 2 } } },
    B: { ads: { freqCaps: { interstitialPerSession: 1 } } }
  },
  gameLimits: {
    matches: { daily: 5, vipMultiplier: 2, recoveryTime: 2 * 60 * 60 * 1000 },
    duels: { daily: 3, vipMultiplier: 2, recoveryTime: 30 * 60 * 1000 },
    lives: { daily: 3, vipMultiplier: 2, recoveryTime: 30 * 60 * 1000 },
    groupBattles: { daily: 2, vipMultiplier: 2, recoveryTime: 60 * 60 * 1000 },
    energy: { daily: 10, vipMultiplier: 2, recoveryTime: 15 * 60 * 1000 }
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cloneDifficulties() {
  return DEFAULT_DIFFICULTIES.map(diff => ({ ...diff }));
}

function getFallbackCategories() {
  return FALLBACK_CATEGORY_DATA.map(cat => ({
    id: cat.id,
    slug: cat.slug,
    title: cat.title,
    name: cat.name,
    displayName: cat.displayName,
    description: cat.description || '',
    icon: cat.icon || 'fa-layer-group',
    color: cat.color || '#60a5fa',
    colorKey: cat.colorKey,
    provider: cat.provider,
    providerCategoryId: cat.providerCategoryId,
    order: cat.order,
    isActive: true,
    difficulties: cloneDifficulties()
  }));
}

function mapCategoryDocument(doc) {
  if (!doc) return null;
  const id = doc._id ? String(doc._id) : doc.id;
  if (!id) return null;
  const status = doc.status || 'active';
  const canonical = resolveCategory({
    slug: doc.slug,
    id: doc.providerCategoryId || doc.slug,
    name: doc.name,
    displayName: doc.displayName,
    title: doc.title,
    aliases: doc.aliases
  });
  if (!canonical) return null;
  const colorKey = canonical.color || 'blue';
  return {
    id,
    slug: canonical.slug,
    title: canonical.displayName || canonical.name,
    name: canonical.name,
    displayName: canonical.displayName || canonical.name,
    description: doc.description || canonical.description || '',
    icon: canonical.icon || 'fa-layer-group',
    color: CATEGORY_COLOR_HEX[colorKey] || CATEGORY_COLOR_HEX.blue,
    colorKey,
    provider: canonical.provider || 'ai-gen',
    providerCategoryId: canonical.providerCategoryId || canonical.slug,
    order: canonical.order,
    isActive: status !== 'disabled',
    difficulties: cloneDifficulties()
  };
}

function getFallbackProvinces() {
  return clone(FALLBACK_PROVINCES);
}

function getFallbackConfig() {
  return clone(DEFAULT_REMOTE_CONFIG);
}

function sanitizeDifficulty(input) {
  if (!input || typeof input !== 'string') return null;
  const normalized = input.trim().toLowerCase();
  return DEFAULT_DIFFICULTIES.some(diff => diff.value === normalized) ? normalized : null;
}

function getFallbackQuestions() {
  return [];
}

function mapQuestionDocument(doc, categoryMap) {
  if (!doc) return null;
  const id = doc._id ? String(doc._id) : doc.id;
  const categoryId = doc.category ? String(doc.category) : (doc.categoryId ? String(doc.categoryId) : null);
  const rawChoices = Array.isArray(doc.options) ? doc.options : Array.isArray(doc.choices) ? doc.choices : [];
  const options = rawChoices.map(opt => String(opt || '').trim()).filter(Boolean);
  const correctIdx = typeof doc.correctIdx === 'number'
    ? doc.correctIdx
    : typeof doc.correctIndex === 'number'
      ? doc.correctIndex
      : typeof doc.answerIndex === 'number'
        ? doc.answerIndex
        : 0;
  const category = categoryMap && categoryId ? categoryMap.get(categoryId) : null;
  const categoryName = doc.categoryName || (category ? (category.title || category.name) : '');
  return {
    id,
    text: doc.text || doc.question || doc.title || '',
    title: doc.text || doc.title || '',
    options,
    choices: options,
    correctIdx,
    answerIndex: correctIdx,
    difficulty: doc.difficulty || null,
    categoryId,
    categoryName,
    cat: categoryName,
    authorName: doc.authorName || doc.createdBy || doc.createdByName || '',
    status: doc.status,
    submittedAt: doc.submittedAt,
    reviewedAt: doc.reviewedAt
  };
}

module.exports = {
  DEFAULT_DIFFICULTIES,
  getFallbackCategories,
  mapCategoryDocument,
  getFallbackProvinces,
  getFallbackConfig,
  sanitizeDifficulty,
  getFallbackQuestions,
  mapQuestionDocument
};
