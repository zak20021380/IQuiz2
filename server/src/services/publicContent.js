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
  pink: '#f472b6',
  green: '#22c55e'
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

// Provinces are now fetched from the database (ProvinceStat model)

function buildFallbackQuestion({
  id,
  slug,
  text,
  difficulty = 'medium',
  options = [],
  correctIdx = 0
}) {
  const category = FALLBACK_CATEGORY_DATA.find((cat) => cat.slug === slug) || {
    id: slug,
    title: '—'
  };

  const safeOptions = options.map((option) => String(option || '').trim()).filter(Boolean);

  return Object.freeze({
    id,
    publicId: id,
    categoryId: category.id,
    categorySlug: slug,
    categoryName: category.title,
    cat: category.title,
    difficulty,
    text,
    title: text,
    options: safeOptions,
    choices: safeOptions,
    correctIdx,
    answerIndex: correctIdx
  });
}

// Mock questions removed - all questions now come from the database
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
      standard: { id: 'vip_standard', priceCents: 499 }
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
    matches: { daily: 3, vipMultiplier: 2, recoveryTime: 2 * 60 * 60 * 1000 },
    duels: { daily: 1, vipMultiplier: 2, recoveryTime: 30 * 60 * 1000 },
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

function normalizeColorKey(value) {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return CATEGORY_COLOR_HEX[key] ? key : 'blue';
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
    aliases: doc.aliases,
    description: doc.description,
    icon: doc.icon,
    color: doc.color,
    provider: doc.provider,
    order: doc.order
  }) || null;

  const slug = canonical?.slug || (typeof doc.slug === 'string' ? doc.slug : id);
  const name = canonical?.name || (typeof doc.name === 'string' ? doc.name : 'Category');
  const displayName = canonical?.displayName || (typeof doc.displayName === 'string' ? doc.displayName : name);
  const description = typeof doc.description === 'string' && doc.description.trim()
    ? doc.description.trim()
    : canonical?.description || '';
  const icon = (typeof doc.icon === 'string' && doc.icon.trim())
    ? doc.icon.trim()
    : canonical?.icon || 'fa-layer-group';
  const colorKey = normalizeColorKey(canonical?.color || doc.color);
  const provider = canonical?.provider || doc.provider || 'manual';
  const providerCategoryId = canonical?.providerCategoryId || doc.providerCategoryId || slug;
  const order = Number.isFinite(Number(doc.order))
    ? Number(doc.order)
    : (Number.isFinite(Number(canonical?.order)) ? Number(canonical.order) : 0);

  return {
    id,
    slug,
    title: displayName || name,
    name,
    displayName: displayName || name,
    description,
    icon,
    color: CATEGORY_COLOR_HEX[colorKey] || CATEGORY_COLOR_HEX.blue,
    colorKey,
    provider,
    providerCategoryId,
    order,
    isActive: status !== 'disabled',
    difficulties: cloneDifficulties()
  };
}

async function getFallbackProvinces() {
  // Fetch provinces from the database instead of using hardcoded data
  const ProvinceStat = require('../models/ProvinceStat');
  try {
    const provinces = await ProvinceStat.find().lean();
    return provinces.map(p => ({
      name: p.province,
      score: p.score || 0,
      members: p.memberCount || 0
    }));
  } catch (error) {
    return [];
  }
}

function getFallbackConfig() {
  return clone(DEFAULT_REMOTE_CONFIG);
}

function sanitizeDifficulty(input) {
  if (!input || typeof input !== 'string') return null;
  const normalized = input.trim().toLowerCase();
  return DEFAULT_DIFFICULTIES.some(diff => diff.value === normalized) ? normalized : null;
}

function cloneQuestion(question, suffix = '') {
  if (!question) return null;
  const baseId = question.id || question.publicId || `fallback-${Math.random().toString(36).slice(2)}`;
  const id = typeof suffix === 'number' && suffix > 0
    ? `${baseId}-${suffix}`
    : baseId;
  const basePublicId = question.publicId || baseId;
  const publicId = typeof suffix === 'number' && suffix > 0 ? `${basePublicId}-${suffix}` : basePublicId;
  const options = Array.isArray(question.options) ? [...question.options] : [];
  const choices = Array.isArray(question.choices) ? [...question.choices] : [...options];
  return {
    ...question,
    id,
    publicId,
    options,
    choices,
    answerIndex: typeof question.answerIndex === 'number' ? question.answerIndex : question.correctIdx || 0,
    correctIdx: typeof question.correctIdx === 'number' ? question.correctIdx : question.answerIndex || 0
  };
}

function mergeUniqueQuestions(...lists) {
  const seen = new Set();
  const merged = [];

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const question of list) {
      if (!question) continue;
      const parts = [question.id, question.publicId, question.uid, question.text, question.title]
        .map((part) => (part == null ? '' : String(part).trim().toLowerCase()))
        .filter(Boolean);
      const key = parts.join('::');
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      merged.push(question);
    }
  }

  return merged;
}

function shuffleInPlace(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function normalizeCount(count) {
  const num = Number(count);
  if (!Number.isFinite(num)) return 5;
  return Math.max(1, Math.min(20, Math.trunc(num)));
}

function resolveFallbackCategorySlug(categoryId) {
  if (!categoryId) return null;
  const canonical = resolveCategory(categoryId);
  if (canonical?.slug) return canonical.slug;
  if (typeof categoryId === 'string') {
    const normalized = categoryId.trim().toLowerCase();
    if (!normalized) return null;
    const direct = FALLBACK_CATEGORY_DATA.find((cat) => cat.slug === normalized || cat.id === normalized);
    if (direct) return direct.slug;
  }
  return null;
}

function getFallbackQuestions({ categoryId = null, difficulty = null, count = 5 } = {}) {
  const normalizedCount = normalizeCount(count);
  const normalizedDifficulty = sanitizeDifficulty(difficulty);
  const slug = resolveFallbackCategorySlug(categoryId);

  const allQuestions = Array.isArray(FALLBACK_QUESTION_DATA) ? [...FALLBACK_QUESTION_DATA] : [];

  let categoryPool = allQuestions;
  if (slug) {
    const matchedCategory = allQuestions.filter(
      (question) => question.categorySlug === slug || question.categoryId === slug
    );
    if (matchedCategory.length) {
      categoryPool = matchedCategory;
    }
  }

  let workingPool = mergeUniqueQuestions(categoryPool);

  if (normalizedDifficulty) {
    const difficultyMatches = workingPool.filter((question) => question.difficulty === normalizedDifficulty);
    if (difficultyMatches.length) {
      workingPool = mergeUniqueQuestions(difficultyMatches);
      if (workingPool.length < normalizedCount) {
        const alternativePool = categoryPool.filter((question) => question.difficulty !== normalizedDifficulty);
        workingPool = mergeUniqueQuestions(workingPool, alternativePool);
      }
    }
  }

  if (workingPool.length < normalizedCount) {
    workingPool = mergeUniqueQuestions(workingPool, allQuestions);
  }

  if (!workingPool.length) {
    workingPool = mergeUniqueQuestions(allQuestions);
  }

  const shuffled = shuffleInPlace([...workingPool]);
  if (!shuffled.length) return [];

  const result = [];
  const uniqueLength = Math.min(shuffled.length, normalizedCount);

  for (let i = 0; i < uniqueLength; i += 1) {
    const cloned = cloneQuestion(shuffled[i], 0);
    if (cloned) result.push(cloned);
  }

  if (result.length < normalizedCount) {
    let index = 0;
    while (result.length < normalizedCount) {
      const question = shuffled[index % shuffled.length];
      const cloned = cloneQuestion(question, result.length);
      if (cloned) result.push(cloned);
      index += 1;
    }
  }

  return result;
}

function mapQuestionDocument(doc, categoryMap) {
  if (!doc) return null;
  const id = doc._id ? String(doc._id) : doc.id;
  const publicId = doc.publicId ? String(doc.publicId) : '';
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
    publicId,
    uid: doc.uid || '',
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
