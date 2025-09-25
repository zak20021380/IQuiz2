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

const FALLBACK_QUESTION_DATA = Object.freeze([
  buildFallbackQuestion({
    id: 'general-1',
    slug: 'general',
    difficulty: 'easy',
    text: 'کدام گزینه به معنی «دانش جمعی انسان‌ها درباره جهان» نزدیک‌تر است؟',
    options: ['علم', 'فرهنگ', 'تجربه', 'هنر'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'general-2',
    slug: 'general',
    difficulty: 'medium',
    text: 'کدام یک از موارد زیر نمادی برای المپیک است؟',
    options: ['پنج حلقه رنگی', 'یک مشعل آتشین', 'دو شمشیر ضربدری', 'یک ستاره پنج پر'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'general-3',
    slug: 'general',
    difficulty: 'medium',
    text: 'تقویم میلادی بر اساس حرکت کدام جرم سماوی تنظیم شده است؟',
    options: ['ماه', 'زمین', 'خورشید', 'زهره'],
    correctIdx: 1
  }),
  buildFallbackQuestion({
    id: 'general-4',
    slug: 'general',
    difficulty: 'hard',
    text: 'اصطلاح «جهان‌بینی» بیشتر به چه حوزه‌ای مربوط می‌شود؟',
    options: ['فلسفه', 'جغرافیا', 'ورزش', 'ریاضیات'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'history-1',
    slug: 'history-civilization',
    difficulty: 'easy',
    text: 'کوروش بزرگ بنیان‌گذار کدام امپراتوری بود؟',
    options: ['امپراتوری هخامنشی', 'امپراتوری ساسانی', 'امپراتوری عثمانی', 'امپراتوری روم'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'history-2',
    slug: 'history-civilization',
    difficulty: 'medium',
    text: 'دیوار چین برای مقابله با حملات کدام اقوام ساخته شد؟',
    options: ['مغول‌ها', 'رومی‌ها', 'اسکندر مقدونی', 'تاتارها'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'history-3',
    slug: 'history-civilization',
    difficulty: 'medium',
    text: 'تمدن مصر باستان در کنار کدام رود شکل گرفت؟',
    options: ['نیل', 'دجله', 'راین', 'آمازون'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'history-4',
    slug: 'history-civilization',
    difficulty: 'hard',
    text: '«انقلاب مشروطه ایران» در چه سالی به تصویب قانون اساسی انجامید؟',
    options: ['۱۲۸۵ خورشیدی', '۱۲۹۹ خورشیدی', '۱۳۰۴ خورشیدی', '۱۳۱۳ خورشیدی'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'geography-1',
    slug: 'geography-nature',
    difficulty: 'easy',
    text: 'پایتخت کشور ژاپن کدام شهر است؟',
    options: ['توکیو', 'اوساکا', 'هیروشیما', 'کیوتو'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'geography-2',
    slug: 'geography-nature',
    difficulty: 'medium',
    text: 'کدام کوه بلندترین قله جهان به شمار می‌رود؟',
    options: ['قله کلیمانجارو', 'قله اورست', 'قله دماوند', 'قله مون بلان'],
    correctIdx: 1
  }),
  buildFallbackQuestion({
    id: 'geography-3',
    slug: 'geography-nature',
    difficulty: 'medium',
    text: 'جنگل‌های آمازون عمدتاً در کدام قاره قرار دارند؟',
    options: ['آسیا', 'آفریقا', 'آمریکای جنوبی', 'اروپا'],
    correctIdx: 2
  }),
  buildFallbackQuestion({
    id: 'geography-4',
    slug: 'geography-nature',
    difficulty: 'hard',
    text: 'دریای خزر از طریق کدام رودخانه به ولگا متصل می‌شود؟',
    options: ['رود اترک', 'رود سفیدرود', 'کانال ولگا-دن', 'رود کورا'],
    correctIdx: 2
  }),
  buildFallbackQuestion({
    id: 'science-1',
    slug: 'science-technology',
    difficulty: 'easy',
    text: 'عنصر اکسیژن با کدام حرف در جدول تناوبی نشان داده می‌شود؟',
    options: ['O', 'Ox', 'X', 'Og'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'science-2',
    slug: 'science-technology',
    difficulty: 'medium',
    text: 'واحد اندازه‌گیری توان الکتریکی چیست؟',
    options: ['ولت', 'وات', 'اهم', 'آمپر'],
    correctIdx: 1
  }),
  buildFallbackQuestion({
    id: 'science-3',
    slug: 'science-technology',
    difficulty: 'medium',
    text: 'اولین کشوری که انسان را به ماه فرستاد کدام بود؟',
    options: ['روسیه', 'چین', 'ایالات متحده آمریکا', 'فرانسه'],
    correctIdx: 2
  }),
  buildFallbackQuestion({
    id: 'science-4',
    slug: 'science-technology',
    difficulty: 'hard',
    text: 'قانون دوم ترمودینامیک درباره افزایش کدام کمیت صحبت می‌کند؟',
    options: ['آنتروپی', 'انرژی جنبشی', 'جرم', 'دما'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'literature-1',
    slug: 'literature-language',
    difficulty: 'easy',
    text: 'نویسنده مثنوی معنوی کیست؟',
    options: ['سعدی', 'حافظ', 'مولوی', 'نظامی'],
    correctIdx: 2
  }),
  buildFallbackQuestion({
    id: 'literature-2',
    slug: 'literature-language',
    difficulty: 'medium',
    text: 'کدام اثر زیر نوشته صادق هدایت است؟',
    options: ['بوف کور', 'کلیدر', 'سمفونی مردگان', 'سووشون'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'literature-3',
    slug: 'literature-language',
    difficulty: 'medium',
    text: 'در دستور زبان فارسی، «اسم» به چه معناست؟',
    options: ['کلمه‌ای برای انجام کار', 'کلمه‌ای برای نامیدن اشیا و افراد', 'کلمه‌ای برای توصیف', 'کلمه‌ای برای اتصال جملات'],
    correctIdx: 1
  }),
  buildFallbackQuestion({
    id: 'literature-4',
    slug: 'literature-language',
    difficulty: 'hard',
    text: 'رمان «جنگ و صلح» اثر کدام نویسنده روس است؟',
    options: ['فیودور داستایوفسکی', 'آنتون چخوف', 'لئو تولستوی', 'نیکلای گوگول'],
    correctIdx: 2
  }),
  buildFallbackQuestion({
    id: 'movies-1',
    slug: 'movies-series',
    difficulty: 'easy',
    text: 'فیلم «جدایی نادر از سیمین» ساخته کدام کارگردان است؟',
    options: ['مجید مجیدی', 'اصغر فرهادی', 'بهمن قبادی', 'رضا میرکریمی'],
    correctIdx: 1
  }),
  buildFallbackQuestion({
    id: 'movies-2',
    slug: 'movies-series',
    difficulty: 'medium',
    text: 'کدام سریال ایرانی با محوریت یک قصاب به نام «حاج یونس» ساخته شده است؟',
    options: ['پدرسالار', 'وضعیت سفید', 'در پناه تو', 'مختارنامه'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'movies-3',
    slug: 'movies-series',
    difficulty: 'medium',
    text: 'اسکار بهترین فیلم در سال ۱۹۹۸ به کدام فیلم تعلق گرفت؟',
    options: ['تایتانیک', 'شکسپیر عاشق', 'نجات سرباز رایان', 'ماتریکس'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'movies-4',
    slug: 'movies-series',
    difficulty: 'hard',
    text: 'موسیقی متن فیلم «پدرخوانده» اثر چه آهنگسازی است؟',
    options: ['جان ویلیامز', 'انیو موریکونه', 'نینو روتا', 'هانس زیمر'],
    correctIdx: 2
  }),
  buildFallbackQuestion({
    id: 'sports-1',
    slug: 'sports',
    difficulty: 'easy',
    text: 'فوتبال با چند بازیکن در هر تیم انجام می‌شود؟',
    options: ['۹', '۱۰', '۱۱', '۱۲'],
    correctIdx: 2
  }),
  buildFallbackQuestion({
    id: 'sports-2',
    slug: 'sports',
    difficulty: 'medium',
    text: 'کدام ورزشکار ایرانی به «اسطوره وزنه‌برداری» معروف است؟',
    options: ['حسین رضازاده', 'بهداد سلیمی', 'نواب نصیر شلال', 'کیانوش رستمی'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'sports-3',
    slug: 'sports',
    difficulty: 'medium',
    text: 'مسابقات «ویمبلدون» در کدام رشته برگزار می‌شود؟',
    options: ['دو و میدانی', 'تنیس', 'گلف', 'بسکتبال'],
    correctIdx: 1
  }),
  buildFallbackQuestion({
    id: 'sports-4',
    slug: 'sports',
    difficulty: 'hard',
    text: 'اصطلاح «سه‌گانه» در فوتبال به چه معناست؟',
    options: ['برد در سه جام در یک فصل', 'زدن سه گل در یک بازی', 'سه پاس گل در یک نیمه', 'سه پنالتی مهار شده'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'entertainment-1',
    slug: 'entertainment',
    difficulty: 'easy',
    text: 'بازی «مار و پله» با چه ابزاری انجام می‌شود؟',
    options: ['کارت', 'صفحه و تاس', 'توپ', 'مهره‌های شطرنج'],
    correctIdx: 1
  }),
  buildFallbackQuestion({
    id: 'entertainment-2',
    slug: 'entertainment',
    difficulty: 'medium',
    text: 'کدام یک از موارد زیر عنوان یک بازی ویدئویی مشهور است؟',
    options: ['فاینال فانتزی', 'شوالیه‌های شب', 'آسمان بی‌پایان', 'جهان‌های متصل'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'entertainment-3',
    slug: 'entertainment',
    difficulty: 'medium',
    text: 'در جدول کلمات متقاطع، خانه‌های سیاه چه نقشی دارند؟',
    options: ['شروع سطر جدید را مشخص می‌کنند', 'حرف صدادار هستند', 'پاسخ درست را نشان می‌دهند', 'خانه‌های بدون استفاده هستند'],
    correctIdx: 0
  }),
  buildFallbackQuestion({
    id: 'entertainment-4',
    slug: 'entertainment',
    difficulty: 'hard',
    text: 'اصطلاح «کازینو رویال» برای اولین بار در کدام سری فیلم استفاده شد؟',
    options: ['جیمز باند', 'هری پاتر', 'ارباب حلقه‌ها', 'سریع و خشن'],
    correctIdx: 0
  })
]);

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

  let pool = FALLBACK_QUESTION_DATA;
  if (slug) {
    pool = pool.filter((question) => question.categorySlug === slug || question.categoryId === slug);
  }
  if (normalizedDifficulty) {
    const difficultyFiltered = pool.filter((question) => question.difficulty === normalizedDifficulty);
    if (difficultyFiltered.length) {
      pool = difficultyFiltered;
    }
  }
  if (!pool.length) {
    pool = FALLBACK_QUESTION_DATA;
  }

  const shuffled = shuffleInPlace([...pool]);
  if (!shuffled.length) return [];

  const result = [];
  let index = 0;
  while (result.length < normalizedCount) {
    const question = shuffled[index % shuffled.length];
    const cloned = cloneQuestion(question, result.length);
    if (cloned) result.push(cloned);
    index += 1;
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
