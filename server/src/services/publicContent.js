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

const FALLBACK_QUESTION_DATA = [
  {
    id: 'general-1',
    categoryId: 'general',
    text: 'پایتخت ایران کدام شهر است؟',
    options: ['تهران', 'اصفهان', 'شیراز', 'تبریز'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'general-2',
    categoryId: 'general',
    text: 'قدیمی‌ترین ابزار ارتباطی زیر کدام است؟',
    options: ['تلگرام', 'تلگراف', 'رادیو', 'تلفن'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'general-3',
    categoryId: 'general',
    text: 'نوروز در چه روزی از سال آغاز می‌شود؟',
    options: ['اول فروردین', 'ده فروردین', 'بیست و نهم اسفند', 'پانزدهم اسفند'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'general-4',
    categoryId: 'general',
    text: 'کدام گزینه یک غذای سنتی ایرانی است؟',
    options: ['پاستا', 'سوشی', 'قرمه‌سبزی', 'سوپ میسو'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'general-5',
    categoryId: 'general',
    text: 'برای اندازه‌گیری دمای هوا از چه ابزاری استفاده می‌شود؟',
    options: ['بارومتر', 'دماسنج', 'بادسنج', 'فشارسنج'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'history-civilization-1',
    categoryId: 'history-civilization',
    text: 'سلسله هخامنشیان توسط چه کسی بنیان‌گذاری شد؟',
    options: ['داریوش اول', 'کوروش بزرگ', 'خشایارشاه', 'کمبوجیه'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'history-civilization-2',
    categoryId: 'history-civilization',
    text: 'نام قدیمی شهر شیراز در دوران ساسانی چه بود؟',
    options: ['اردشیرخوره', 'گور', 'گندی‌شاپور', 'استخر'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'history-civilization-3',
    categoryId: 'history-civilization',
    text: 'انقلاب مشروطه ایران در چه سالی آغاز شد؟',
    options: ['۱۲۸۵ خورشیدی', '۱۲۹۹ خورشیدی', '۱۳۱۲ خورشیدی', '۱۳۲۰ خورشیدی'],
    correctIndex: 0,
    difficulty: 'medium'
  },
  {
    id: 'history-civilization-4',
    categoryId: 'history-civilization',
    text: 'نخستین پادشاه سلسله صفوی چه نام داشت؟',
    options: ['شاه طهماسب', 'شاه اسماعیل', 'شاه عباس', 'شاه صفی'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'history-civilization-5',
    categoryId: 'history-civilization',
    text: 'کدام نبرد باعث سقوط دولت ساسانی شد؟',
    options: ['جنگ نهاوند', 'جنگ قادسیه', 'جنگ چالدران', 'جنگ صفین'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'geography-nature-1',
    categoryId: 'geography-nature',
    text: 'کدام رود به عنوان طولانی‌ترین رود ایران شناخته می‌شود؟',
    options: ['کارون', 'زاینده‌رود', 'سفیدرود', 'اروند رود'],
    correctIndex: 0,
    difficulty: 'medium'
  },
  {
    id: 'geography-nature-2',
    categoryId: 'geography-nature',
    text: 'قله دماوند در کدام رشته‌کوه قرار دارد؟',
    options: ['البرز', 'زاگرس', 'هیمالیا', 'پامیر'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'geography-nature-3',
    categoryId: 'geography-nature',
    text: 'دریاچه ارومیه در کدام استان‌های ایران واقع شده است؟',
    options: ['آذربایجان شرقی و غربی', 'گیلان و مازندران', 'فارس و بوشهر', 'خراسان رضوی و شمالی'],
    correctIndex: 0,
    difficulty: 'medium'
  },
  {
    id: 'geography-nature-4',
    categoryId: 'geography-nature',
    text: 'بزرگ‌ترین بیابان گرم جهان کدام است؟',
    options: ['بیابان لوت', 'صحرای بزرگ آفریقا', 'بیابان گوبی', 'صحرای عربستان'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'geography-nature-5',
    categoryId: 'geography-nature',
    text: 'کدام کشور دارای بیشترین تعداد آتشفشان فعال در جهان است؟',
    options: ['اندونزی', 'ایسلند', 'ژاپن', 'ایتالیا'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'science-technology-1',
    categoryId: 'science-technology',
    text: 'کدام عنصر شیمیایی با نماد O شناخته می‌شود؟',
    options: ['اکسیژن', 'اوزون', 'اوسمیوم', 'اکتینیوم'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'science-technology-2',
    categoryId: 'science-technology',
    text: 'نخستین موجودی که به فضا فرستاده شد چه بود؟',
    options: ['گربه', 'انسان', 'سگ', 'میمون'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'science-technology-3',
    categoryId: 'science-technology',
    text: 'سرعت نور تقریبا برابر با چند کیلومتر در ثانیه است؟',
    options: ['۳۰۰', '۳۰۰۰', '۳۰۰۰۰', '۳۰۰۰۰۰'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'science-technology-4',
    categoryId: 'science-technology',
    text: 'کدام سیاره به عنوان سیاره سرخ شناخته می‌شود؟',
    options: ['زهره', 'مریخ', 'زحل', 'عطارد'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'science-technology-5',
    categoryId: 'science-technology',
    text: 'واحد اندازه‌گیری شدت جریان الکتریکی چیست؟',
    options: ['ولت', 'وات', 'آمپر', 'اهم'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'literature-language-1',
    categoryId: 'literature-language',
    text: 'سراینده مثنوی معنوی کیست؟',
    options: ['حافظ', 'سعدی', 'مولوی', 'نظامی'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'literature-language-2',
    categoryId: 'literature-language',
    text: 'شاهنامه فردوسی با چه بیتی آغاز می‌شود؟',
    options: [
      'به نام خداوند جان و خرد',
      'الا یا ایهاالساقی ادر کاسا و ناولها',
      'بشنو از نی چون حکایت می‌کند',
      'به یاد یار و دیار آنچنان که بودیم'
    ],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'literature-language-3',
    categoryId: 'literature-language',
    text: 'اصطلاح «سبک هندی» به کدام دوره شعر فارسی اشاره دارد؟',
    options: ['قرن چهارم', 'قرن ششم', 'قرن یازدهم', 'قرن دوازدهم'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'literature-language-4',
    categoryId: 'literature-language',
    text: 'کتاب «بوف کور» اثر کیست؟',
    options: ['صادق هدایت', 'جلال آل احمد', 'سیمین دانشور', 'محمود دولت‌آبادی'],
    correctIndex: 0,
    difficulty: 'medium'
  },
  {
    id: 'literature-language-5',
    categoryId: 'literature-language',
    text: 'کدام قالب شعری دارای چهار مصراع است؟',
    options: ['غزل', 'قصیده', 'رباعی', 'مثنوی'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'movies-series-1',
    categoryId: 'movies-series',
    text: 'فیلم «جدایی نادر از سیمین» ساخته کدام کارگردان است؟',
    options: ['مجید مجیدی', 'اصغر فرهادی', 'رضا میرکریمی', 'بهرام بیضایی'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'movies-series-2',
    categoryId: 'movies-series',
    text: 'شخصیت «نقی معمولی» متعلق به کدام سریال ایرانی است؟',
    options: ['شب‌های برره', 'پایتخت', 'متهم گریخت', 'ساخت ایران'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'movies-series-3',
    categoryId: 'movies-series',
    text: 'اسکار بهترین فیلم خارجی‌زبان سال ۲۰۱۷ به کدام فیلم ایرانی رسید؟',
    options: ['درباره الی', 'فروشنده', 'ابد و یک روز', 'رگ خواب'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'movies-series-4',
    categoryId: 'movies-series',
    text: 'در مجموعه فیلم‌های «هری پاتر»، نام مدرسه جادوگری چیست؟',
    options: ['هاگوارتز', 'بئوکس‌باتون', 'درامسترنگ', 'ایلوِرمورنی'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'movies-series-5',
    categoryId: 'movies-series',
    text: 'فیلم «پدرخوانده» در چه ژانری قرار می‌گیرد؟',
    options: ['فانتزی', 'جنایی', 'علمی-تخیلی', 'وسترن'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'sports-1',
    categoryId: 'sports',
    text: 'کدام تیم بیشترین قهرمانی لیگ برتر ایران را دارد؟',
    options: ['استقلال', 'پرسپولیس', 'سپاهان', 'تراکتور'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'sports-2',
    categoryId: 'sports',
    text: 'تعداد بازیکنان هر تیم در زمین فوتبال چند نفر است؟',
    options: ['۹', '۱۰', '۱۱', '۱۲'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'sports-3',
    categoryId: 'sports',
    text: 'در کدام رشته ورزشی «یخ‌نوردی» انجام می‌شود؟',
    options: ['سنگ‌نوردی', 'کوهنوردی', 'اسکی', 'ورزش‌های هوازی'],
    correctIndex: 1,
    difficulty: 'hard'
  },
  {
    id: 'sports-4',
    categoryId: 'sports',
    text: 'قهرمان جام جهانی فوتبال ۲۰۱۸ چه تیمی بود؟',
    options: ['فرانسه', 'آلمان', 'برزیل', 'کرواسی'],
    correctIndex: 0,
    difficulty: 'medium'
  },
  {
    id: 'sports-5',
    categoryId: 'sports',
    text: 'در والیبال چند ست برای پیروزی لازم است؟',
    options: ['۲', '۳', '۴', '۵'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'entertainment-1',
    categoryId: 'entertainment',
    text: 'در بازی شطرنج، هر بازیکن با چند مهره بازی را آغاز می‌کند؟',
    options: ['۱۴', '۱۶', '۱۸', '۲۰'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'entertainment-2',
    categoryId: 'entertainment',
    text: 'کدام بازی ویدیویی شخصیت «ماریو» را به شهرت جهانی رساند؟',
    options: ['سونیک', 'سوپر ماریو برادرز', 'پک‌من', 'افسانه زلدا'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'entertainment-3',
    categoryId: 'entertainment',
    text: 'در جدول سودوکو استاندارد، چند خانه باید با اعداد پر شوند؟',
    options: ['۸۱', '۶۴', '۴۹', '۱۰۰'],
    correctIndex: 0,
    difficulty: 'medium'
  },
  {
    id: 'entertainment-4',
    categoryId: 'entertainment',
    text: 'کدام سبک موسیقی با بداهه‌نوازی و سازهایی مانند ساکسوفون شناخته می‌شود؟',
    options: ['جاز', 'راک', 'کلاسیک', 'پاپ'],
    correctIndex: 0,
    difficulty: 'medium'
  },
  {
    id: 'entertainment-5',
    categoryId: 'entertainment',
    text: 'در بازی رومیزی «راز قتل» (Cluedo)، هدف اصلی بازیکنان چیست؟',
    options: [
      'جمع‌آوری بیشترین امتیاز',
      'پیدا کردن قاتل، سلاح و مکان قتل',
      'ساختن طولانی‌ترین مسیر',
      'حدس زدن کلمات مخفی'
    ],
    correctIndex: 1,
    difficulty: 'medium'
  }
];

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

function buildFallbackCategoryMap() {
  return new Map(getFallbackCategories().map(cat => [cat.id, cat]));
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

function getFallbackQuestions({ categoryId, difficulty, count }) {
  let pool = FALLBACK_QUESTION_DATA;
  if (categoryId) {
    pool = pool.filter(item => item.categoryId === categoryId);
  }
  if (difficulty) {
    pool = pool.filter(item => item.difficulty === difficulty);
  }
  if (pool.length === 0) {
    pool = FALLBACK_QUESTION_DATA;
  }
  const categories = buildFallbackCategoryMap();
  return pool.slice(0, count).map(item => {
    const category = categories.get(item.categoryId);
    return {
      id: item.id,
      text: item.text,
      title: item.text,
      options: item.options.map(opt => String(opt || '').trim()),
      choices: item.options.map(opt => String(opt || '').trim()),
      correctIdx: item.correctIndex,
      answerIndex: item.correctIndex,
      difficulty: item.difficulty,
      categoryId: item.categoryId,
      categoryName: category ? (category.title || category.name) : '',
      cat: category ? (category.title || category.name) : '',
      authorName: 'تیم آیکوئیز'
    };
  });
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
