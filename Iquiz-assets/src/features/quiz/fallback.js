const BASE_FALLBACK_QUESTIONS = Object.freeze([
  {
    id: 'general-1',
    q: 'کدام گزینه به معنی «دانش جمعی انسان‌ها درباره جهان» نزدیک‌تر است؟',
    c: ['علم', 'فرهنگ', 'تجربه', 'هنر'],
    a: 0,
    cat: 'عمومی',
    catSlug: 'general',
    diff: 'آسان',
    diffValue: 'easy',
  },
  {
    id: 'general-2',
    q: 'کدام یک از موارد زیر نمادی برای المپیک است؟',
    c: ['پنج حلقه رنگی', 'یک مشعل آتشین', 'دو شمشیر ضربدری', 'یک ستاره پنج پر'],
    a: 0,
    cat: 'عمومی',
    catSlug: 'general',
    diff: 'متوسط',
    diffValue: 'medium',
  },
  {
    id: 'general-3',
    q: 'تقویم میلادی بر اساس حرکت کدام جرم سماوی تنظیم شده است؟',
    c: ['ماه', 'زمین', 'خورشید', 'زهره'],
    a: 1,
    cat: 'عمومی',
    catSlug: 'general',
    diff: 'متوسط',
    diffValue: 'medium',
  },
  {
    id: 'general-4',
    q: 'اصطلاح «جهان‌بینی» بیشتر به چه حوزه‌ای مربوط می‌شود؟',
    c: ['فلسفه', 'جغرافیا', 'ورزش', 'ریاضیات'],
    a: 0,
    cat: 'عمومی',
    catSlug: 'general',
    diff: 'سخت',
    diffValue: 'hard',
  },
  {
    id: 'history-1',
    q: 'کوروش بزرگ بنیان‌گذار کدام امپراتوری بود؟',
    c: ['امپراتوری هخامنشی', 'امپراتوری ساسانی', 'امپراتوری عثمانی', 'امپراتوری روم'],
    a: 0,
    cat: 'تاریخ و تمدن',
    catSlug: 'history-civilization',
    diff: 'آسان',
    diffValue: 'easy',
  },
  {
    id: 'history-2',
    q: 'دیوار چین برای مقابله با حملات کدام اقوام ساخته شد؟',
    c: ['مغول‌ها', 'رومی‌ها', 'اسکندر مقدونی', 'تاتارها'],
    a: 0,
    cat: 'تاریخ و تمدن',
    catSlug: 'history-civilization',
    diff: 'متوسط',
    diffValue: 'medium',
  },
  {
    id: 'history-3',
    q: 'تمدن مصر باستان در کنار کدام رود شکل گرفت؟',
    c: ['نیل', 'دجله', 'راین', 'آمازون'],
    a: 0,
    cat: 'تاریخ و تمدن',
    catSlug: 'history-civilization',
    diff: 'متوسط',
    diffValue: 'medium',
  },
  {
    id: 'history-4',
    q: '«انقلاب مشروطه ایران» در چه سالی به تصویب قانون اساسی انجامید؟',
    c: ['۱۲۸۵ خورشیدی', '۱۲۹۹ خورشیدی', '۱۳۰۴ خورشیدی', '۱۳۱۳ خورشیدی'],
    a: 0,
    cat: 'تاریخ و تمدن',
    catSlug: 'history-civilization',
    diff: 'سخت',
    diffValue: 'hard',
  },
  {
    id: 'geography-1',
    q: 'پایتخت کشور ژاپن کدام شهر است؟',
    c: ['توکیو', 'اوساکا', 'هیروشیما', 'کیوتو'],
    a: 0,
    cat: 'جغرافیا و طبیعت',
    catSlug: 'geography-nature',
    diff: 'آسان',
    diffValue: 'easy',
  },
  {
    id: 'geography-2',
    q: 'کدام کوه بلندترین قله جهان به شمار می‌رود؟',
    c: ['قله کلیمانجارو', 'قله اورست', 'قله دماوند', 'قله مون بلان'],
    a: 1,
    cat: 'جغرافیا و طبیعت',
    catSlug: 'geography-nature',
    diff: 'متوسط',
    diffValue: 'medium',
  },
  {
    id: 'geography-3',
    q: 'جنگل‌های آمازون عمدتاً در کدام قاره قرار دارند؟',
    c: ['آسیا', 'آفریقا', 'آمریکای جنوبی', 'اروپا'],
    a: 2,
    cat: 'جغرافیا و طبیعت',
    catSlug: 'geography-nature',
    diff: 'متوسط',
    diffValue: 'medium',
  },
  {
    id: 'geography-4',
    q: 'دریای خزر از طریق کدام رودخانه به ولگا متصل می‌شود؟',
    c: ['رود اترک', 'رود سفیدرود', 'کانال ولگا-دن', 'رود کورا'],
    a: 2,
    cat: 'جغرافیا و طبیعت',
    catSlug: 'geography-nature',
    diff: 'سخت',
    diffValue: 'hard',
  },
  {
    id: 'science-1',
    q: 'عنصر اکسیژن با کدام حرف در جدول تناوبی نشان داده می‌شود؟',
    c: ['O', 'Ox', 'X', 'Og'],
    a: 0,
    cat: 'علوم و فناوری',
    catSlug: 'science-technology',
    diff: 'آسان',
    diffValue: 'easy',
  },
  {
    id: 'science-2',
    q: 'واحد اندازه‌گیری توان الکتریکی چیست؟',
    c: ['ولت', 'وات', 'اهم', 'آمپر'],
    a: 1,
    cat: 'علوم و فناوری',
    catSlug: 'science-technology',
    diff: 'متوسط',
    diffValue: 'medium',
  },
  {
    id: 'science-3',
    q: 'کدام یک از موارد زیر واکنشی شیمیایی است؟',
    c: ['ذوب شدن یخ', 'تبخیر آب', 'سوختن چوب', 'چکیدن باران'],
    a: 2,
    cat: 'علوم و فناوری',
    catSlug: 'science-technology',
    diff: 'متوسط',
    diffValue: 'medium',
  },
  {
    id: 'science-4',
    q: 'چه کسی نظریه نسبیت عمومی را مطرح کرد؟',
    c: ['ایزاک نیوتن', 'آلبرت اینشتین', 'ماکس پلانک', 'نیکولا تسلا'],
    a: 1,
    cat: 'علوم و فناوری',
    catSlug: 'science-technology',
    diff: 'سخت',
    diffValue: 'hard',
  },
]);

function normalizeCount(count) {
  const num = Number(count);
  if (!Number.isFinite(num)) return 5;
  return Math.max(1, Math.min(20, Math.trunc(num)));
}

function matchDifficulty(question, difficulty) {
  if (!difficulty) return true;
  const norm = String(difficulty).toLowerCase();
  return (
    (question.diffValue && question.diffValue.toLowerCase() === norm) ||
    (question.diff && String(question.diff).toLowerCase().includes(norm))
  );
}

function resolveCategorySlug(categoryIdOrSlug) {
  if (!categoryIdOrSlug) return '';
  return String(categoryIdOrSlug).trim().toLowerCase();
}

function cloneQuestion(question, offset = 0) {
  if (!question || typeof question !== 'object') return null;
  const idBase = question.id || question.q || `fallback-${offset}`;
  return {
    ...question,
    id: `${idBase}-${offset}`,
  };
}

export function getFallbackQuestionPool({ categoryId, categorySlug, difficulty, count } = {}) {
  const normalizedCount = normalizeCount(count);
  const slug = resolveCategorySlug(categorySlug || categoryId);

  let pool = BASE_FALLBACK_QUESTIONS;
  if (slug) {
    const filtered = pool.filter((question) => {
      const questionSlug = question.catSlug ? String(question.catSlug).toLowerCase() : '';
      const questionId = question.id ? String(question.id).toLowerCase() : '';
      return questionSlug === slug || questionId === slug;
    });
    if (filtered.length) {
      pool = filtered;
    }
  }

  let working = pool.filter((question) => matchDifficulty(question, difficulty));
  if (difficulty && working.length < normalizedCount) {
    working = [...working, ...pool.filter((question) => !matchDifficulty(question, difficulty))];
  }

  if (!working.length) {
    working = pool;
  }

  const unique = [];
  const seen = new Set();
  for (let idx = 0; idx < working.length && unique.length < normalizedCount; idx += 1) {
    const question = working[idx];
    const key = question.id || question.q;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(cloneQuestion(question, idx));
  }

  let offset = unique.length;
  while (unique.length < normalizedCount && working.length) {
    const question = working[offset % working.length];
    unique.push(cloneQuestion(question, offset));
    offset += 1;
  }

  return unique;
}

export function topUpWithFallbackQuestions(list, options = {}) {
  const target = Array.isArray(list) ? list.slice() : [];
  const desired = normalizeCount(options.count || target.length);
  if (target.length >= desired) {
    return target.slice(0, desired);
  }

  const existingKeys = new Set();
  target.forEach((question, index) => {
    const key = (question?.id || question?.q || `client-${index}`).toString().toLowerCase();
    existingKeys.add(key);
  });

  const fallbackPool = getFallbackQuestionPool(options);
  for (let idx = 0; idx < fallbackPool.length && target.length < desired; idx += 1) {
    const question = fallbackPool[idx];
    const key = (question?.id || question?.q || `fallback-${idx}`).toString().toLowerCase();
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    target.push({ ...question });
  }

  let recycleIndex = 0;
  while (target.length < desired && fallbackPool.length) {
    const base = fallbackPool[recycleIndex % fallbackPool.length];
    const clone = cloneQuestion(base, target.length + recycleIndex);
    const key = (clone?.id || clone?.q || `fallback-${recycleIndex}`).toString().toLowerCase();
    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      target.push(clone);
    }
    recycleIndex += 1;
  }

  return target.slice(0, desired);
}

export { BASE_FALLBACK_QUESTIONS };
