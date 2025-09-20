const DEFAULT_DIFFICULTIES = [
  { value: 'easy', label: 'آسان' },
  { value: 'medium', label: 'متوسط' },
  { value: 'hard', label: 'سخت' }
];

const FALLBACK_CATEGORY_DATA = [
  {
    id: 'general',
    title: 'دانش عمومی',
    description: 'پرسش‌های متنوع از موضوعات روزمره و دانستنی‌های عمومی.',
    icon: 'fa-globe',
    color: '#60a5fa'
  },
  {
    id: 'science',
    title: 'علم و فناوری',
    description: 'سوال‌هایی از دنیای علوم پایه، فناوری و اکتشافات نو.',
    icon: 'fa-flask',
    color: '#34d399'
  },
  {
    id: 'history',
    title: 'تاریخ و تمدن',
    description: 'سفر در تاریخ ایران و جهان و رخدادهای ماندگار.',
    icon: 'fa-landmark',
    color: '#f97316'
  },
  {
    id: 'sports',
    title: 'ورزش و رقابت',
    description: 'اطلاعات ورزشی از تیم‌ها، مسابقات و رکوردها.',
    icon: 'fa-medal',
    color: '#f87171'
  },
  {
    id: 'literature',
    title: 'فرهنگ و ادبیات',
    description: 'سوال‌هایی از شعر، هنر و میراث فرهنگی.',
    icon: 'fa-book-open',
    color: '#a855f7'
  }
];

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
    id: 'science-1',
    categoryId: 'science',
    text: 'کدام عنصر شیمیایی با نماد O شناخته می‌شود؟',
    options: ['اکسیژن', 'اوزون', 'اوسمیوم', 'اکتینیوم'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'science-2',
    categoryId: 'science',
    text: 'نخستین موجودی که به فضا فرستاده شد چه بود؟',
    options: ['گربه', 'انسان', 'سگ', 'میمون'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'science-3',
    categoryId: 'science',
    text: 'سرعت نور تقریبا برابر با چند کیلومتر در ثانیه است؟',
    options: ['۳۰۰', '۳۰۰۰', '۳۰۰۰۰', '۳۰۰۰۰۰'],
    correctIndex: 3,
    difficulty: 'hard'
  },
  {
    id: 'science-4',
    categoryId: 'science',
    text: 'کدام سیاره به عنوان سیاره سرخ شناخته می‌شود؟',
    options: ['زهره', 'مریخ', 'زحل', 'عطارد'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'science-5',
    categoryId: 'science',
    text: 'واحد اندازه‌گیری شدت جریان الکتریکی چیست؟',
    options: ['ولت', 'وات', 'آمپر', 'اهم'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'history-1',
    categoryId: 'history',
    text: 'سلسله هخامنشیان توسط چه کسی بنیان‌گذاری شد؟',
    options: ['داریوش اول', 'کوروش بزرگ', 'خشایارشاه', 'کمبوجیه'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'history-2',
    categoryId: 'history',
    text: 'نام قدیمی شهر شیراز در دوران ساسانی چه بود؟',
    options: ['اردشیرخوره', 'گور', 'گندی‌شاپور', 'استخر'],
    correctIndex: 0,
    difficulty: 'hard'
  },
  {
    id: 'history-3',
    categoryId: 'history',
    text: 'انقلاب مشروطه ایران در چه سالی آغاز شد؟',
    options: ['۱۲۸۵ خورشیدی', '۱۲۹۹ خورشیدی', '۱۳۱۲ خورشیدی', '۱۳۲۰ خورشیدی'],
    correctIndex: 0,
    difficulty: 'medium'
  },
  {
    id: 'history-4',
    categoryId: 'history',
    text: 'نخستین پادشاه سلسله صفوی چه نام داشت؟',
    options: ['شاه طهماسب', 'شاه اسماعیل', 'شاه عباس', 'شاه صفی'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'history-5',
    categoryId: 'history',
    text: 'کدام نبرد باعث سقوط دولت ساسانی شد؟',
    options: ['جنگ نهاوند', 'جنگ قادسیه', 'جنگ چالدران', 'جنگ صفین'],
    correctIndex: 0,
    difficulty: 'hard'
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
    options: ['سنگ‌نوردی', 'کوهنوردی', 'اسکی', 'هوازی'],
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
    id: 'literature-1',
    categoryId: 'literature',
    text: 'سراینده مثنوی معنوی کیست؟',
    options: ['حافظ', 'سعدی', 'مولوی', 'نظامی'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'literature-2',
    categoryId: 'literature',
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
    id: 'literature-3',
    categoryId: 'literature',
    text: 'اصطلاح «سبک هندی» به کدام دوره شعر فارسی اشاره دارد؟',
    options: ['قرن چهارم', 'قرن ششم', 'قرن یازدهم', 'قرن دوازدهم'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  {
    id: 'literature-4',
    categoryId: 'literature',
    text: 'کتاب «بوف کور» اثر کیست؟',
    options: ['صادق هدایت', 'جلال آل احمد', 'سیمین دانشور', 'محمود دولت‌آبادی'],
    correctIndex: 0,
    difficulty: 'medium'
  },
  {
    id: 'literature-5',
    categoryId: 'literature',
    text: 'کدام قالب شعری دارای چهار مصراع است؟',
    options: ['غزل', 'قصیده', 'رباعی', 'مثنوی'],
    correctIndex: 2,
    difficulty: 'easy'
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
    title: cat.title,
    name: cat.title,
    description: cat.description || '',
    icon: cat.icon || 'fa-layer-group',
    color: cat.color || '#60a5fa',
    isActive: true,
    difficulties: cloneDifficulties()
  }));
}

function mapCategoryDocument(doc) {
  if (!doc) return null;
  const id = doc._id ? String(doc._id) : doc.id;
  if (!id) return null;
  const status = doc.status || 'active';
  return {
    id,
    title: doc.title || doc.name || 'دسته‌بندی',
    name: doc.name || doc.title || 'دسته‌بندی',
    description: doc.description || '',
    icon: doc.icon || 'fa-layer-group',
    color: doc.color || '#60a5fa',
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
