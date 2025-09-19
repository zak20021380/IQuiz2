const Category = require('../models/Category');
const logger = require('../config/logger');
const { fetchOpenTdbCategories } = require('./triviaProviders');
const { getFallbackCategories } = require('./publicContent');

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeKey(value) {
  return sanitizeString(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function sanitizeAliasList(values) {
  const list = Array.isArray(values) ? values : [];
  const normalized = list
    .map((value) => sanitizeString(value))
    .filter((value) => value.length > 0);
  return Array.from(new Set(normalized));
}

const RAW_CATEGORY_META = [
  {
    key: 'General Knowledge',
    displayName: 'دانش عمومی',
    description: 'پرسش‌هایی از دانستنی‌های روزمره و اطلاعات عمومی.',
    icon: 'fa-earth-americas',
    color: 'blue',
    aliases: ['General', 'General Knowledge']
  },
  {
    key: 'Entertainment: Books',
    displayName: 'کتاب و ادبیات',
    description: 'سوالاتی درباره کتاب‌های مطرح و نویسندگان مشهور.',
    icon: 'fa-book-open',
    color: 'purple',
    aliases: ['Books']
  },
  {
    key: 'Entertainment: Film',
    displayName: 'سینما و فیلم',
    description: 'پرسش‌هایی از دنیای فیلم‌ها، کارگردانان و بازیگران.',
    icon: 'fa-clapperboard',
    color: 'pink',
    aliases: ['Film', 'Movies']
  },
  {
    key: 'Entertainment: Music',
    displayName: 'موسیقی',
    description: 'سوالاتی درباره سبک‌ها، خوانندگان و قطعات موسیقی.',
    icon: 'fa-music',
    color: 'purple',
    aliases: ['Music']
  },
  {
    key: 'Entertainment: Musicals & Theatres',
    displayName: 'تئاتر و موزیکال',
    description: 'دانستنی‌هایی از نمایش‌های صحنه‌ای و موزیکال‌های مشهور.',
    icon: 'fa-masks-theater',
    color: 'orange',
    aliases: ['Musicals', 'Theatre']
  },
  {
    key: 'Entertainment: Television',
    displayName: 'تلویزیون و سریال',
    description: 'سوالاتی درباره برنامه‌ها و سریال‌های تلویزیونی محبوب.',
    icon: 'fa-tv',
    color: 'teal',
    aliases: ['Television', 'TV']
  },
  {
    key: 'Entertainment: Video Games',
    displayName: 'بازی‌های ویدیویی',
    description: 'اطلاعاتی از دنیای بازی‌های ویدیویی و استودیوهای مطرح.',
    icon: 'fa-gamepad',
    color: 'indigo',
    aliases: ['Video Games', 'Games']
  },
  {
    key: 'Entertainment: Board Games',
    displayName: 'بازی‌های رومیزی',
    description: 'پرسش‌هایی از بردگیم‌ها و بازی‌های فکری محبوب.',
    icon: 'fa-chess-board',
    color: 'orange',
    aliases: ['Board Games']
  },
  {
    key: 'Science & Nature',
    displayName: 'علوم و طبیعت',
    description: 'سوالاتی از دنیای علم، طبیعت و زیست‌شناسی.',
    icon: 'fa-leaf',
    color: 'green',
    aliases: ['Science and Nature']
  },
  {
    key: 'Science: Computers',
    displayName: 'کامپیوتر و فناوری',
    description: 'دانستنی‌هایی از علوم کامپیوتر و فناوری‌های نو.',
    icon: 'fa-laptop-code',
    color: 'indigo',
    aliases: ['Computers', 'IT']
  },
  {
    key: 'Science: Mathematics',
    displayName: 'ریاضیات',
    description: 'سوالاتی درباره مفاهیم و تاریخ ریاضی.',
    icon: 'fa-square-root-variable',
    color: 'yellow',
    aliases: ['Mathematics', 'Math']
  },
  {
    key: 'Mythology',
    displayName: 'اسطوره‌شناسی',
    description: 'پرسش‌هایی از داستان‌ها و خدایان اسطوره‌ای جهان.',
    icon: 'fa-hat-wizard',
    color: 'purple',
    aliases: ['Mythology']
  },
  {
    key: 'Sports',
    displayName: 'ورزش',
    description: 'اطلاعاتی درباره رشته‌ها و رویدادهای ورزشی.',
    icon: 'fa-medal',
    color: 'red',
    aliases: ['Sports']
  },
  {
    key: 'Geography',
    displayName: 'جغرافیا',
    description: 'سوالاتی از کشورها، شهرها و ویژگی‌های جغرافیایی.',
    icon: 'fa-globe',
    color: 'blue',
    aliases: ['Geography']
  },
  {
    key: 'History',
    displayName: 'تاریخ',
    description: 'پرسش‌هایی درباره رویدادها و شخصیت‌های تاریخی.',
    icon: 'fa-landmark',
    color: 'orange',
    aliases: ['History']
  },
  {
    key: 'Politics',
    displayName: 'سیاست',
    description: 'سوالاتی درباره نظام‌های سیاسی و سیاست‌مداران.',
    icon: 'fa-scale-balanced',
    color: 'red',
    aliases: ['Politics']
  },
  {
    key: 'Art',
    displayName: 'هنر',
    description: 'پرسش‌هایی از نقاشی، مجسمه‌سازی و هنرهای تجسمی.',
    icon: 'fa-palette',
    color: 'pink',
    aliases: ['Art']
  },
  {
    key: 'Celebrities',
    displayName: 'چهره‌های مشهور',
    description: 'دانستنی‌هایی درباره افراد مشهور و سلبریتی‌ها.',
    icon: 'fa-star',
    color: 'yellow',
    aliases: ['Celebrities']
  },
  {
    key: 'Animals',
    displayName: 'حیوانات',
    description: 'سوالاتی از دنیای جانوران و ویژگی‌های آن‌ها.',
    icon: 'fa-paw',
    color: 'green',
    aliases: ['Animals']
  },
  {
    key: 'Vehicles',
    displayName: 'وسایل نقلیه',
    description: 'پرسش‌هایی درباره خودروها، هواپیماها و ابزارهای حمل‌ونقل.',
    icon: 'fa-car-side',
    color: 'teal',
    aliases: ['Vehicles']
  },
  {
    key: 'Entertainment: Comics',
    displayName: 'کمیک و داستان مصور',
    description: 'دانستنی‌هایی از جهان کمیک و شخصیت‌های آن.',
    icon: 'fa-book-open-reader',
    color: 'purple',
    aliases: ['Comics']
  },
  {
    key: 'Science: Gadgets',
    displayName: 'گجت‌ها و ابزارها',
    description: 'پرسش‌هایی درباره ابزارهای دیجیتال و نوآوری‌های فناوری.',
    icon: 'fa-microchip',
    color: 'indigo',
    aliases: ['Gadgets']
  },
  {
    key: 'Entertainment: Japanese Anime & Manga',
    displayName: 'انیمه و مانگا',
    description: 'اطلاعاتی درباره آثار مطرح انیمه و مانگا.',
    icon: 'fa-wand-magic-sparkles',
    color: 'pink',
    aliases: ['Anime', 'Manga']
  },
  {
    key: 'Entertainment: Cartoon & Animations',
    displayName: 'کارتون و انیمیشن',
    description: 'سوالاتی درباره انیمیشن‌ها و کارتون‌های محبوب.',
    icon: 'fa-film',
    color: 'yellow',
    aliases: ['Cartoon', 'Animations']
  }
];

const CATEGORY_META_MAP = new Map(
  RAW_CATEGORY_META.map((item) => [normalizeKey(item.key), item])
);

function buildProviderCategoryDoc(remoteCategory, { existingNameSet }) {
  const remoteName = sanitizeString(remoteCategory.name);
  if (!remoteName) return null;

  const providerId = String(remoteCategory.id ?? '').trim();
  if (!providerId) return null;

  const key = normalizeKey(remoteName);
  const meta = CATEGORY_META_MAP.get(key) || null;
  const displayName = meta?.displayName || remoteName;
  let name = displayName;

  if (existingNameSet.has(name)) {
    if (!existingNameSet.has(remoteName)) {
      name = remoteName;
    } else {
      name = `${displayName} (${providerId})`;
    }
  }

  const aliasSet = new Set([
    remoteName,
    displayName,
    name
  ]);

  if (remoteName.includes(':')) {
    remoteName.split(':').map((part) => part.trim()).forEach((part) => {
      if (part) aliasSet.add(part);
    });
  }

  if (meta?.aliases) {
    meta.aliases.forEach((alias) => aliasSet.add(alias));
  }

  const aliases = sanitizeAliasList(Array.from(aliasSet));

  return {
    name,
    displayName,
    description: meta?.description || `سوالاتی دربارهٔ دسته‌بندی ${displayName}.`,
    icon: meta?.icon || 'fa-layer-group',
    color: meta?.color || 'blue',
    status: 'active',
    provider: 'opentdb',
    providerCategoryId: providerId,
    aliases
  };
}

async function seedFromOpenTdb() {
  let categories = [];
  try {
    categories = await fetchOpenTdbCategories();
  } catch (error) {
    logger.warn(`[CategorySeeder] Failed to fetch OpenTDB categories: ${error.message}`);
    return 0;
  }

  if (!Array.isArray(categories) || categories.length === 0) {
    return 0;
  }

  const existingDocs = await Category.find({}, { name: 1, provider: 1, providerCategoryId: 1 }).lean();
  const existingNameSet = new Set(existingDocs.map((item) => item.name));
  const existingProviderKey = new Set(
    existingDocs
      .filter((item) => item.provider && item.providerCategoryId)
      .map((item) => `${item.provider}:${item.providerCategoryId}`)
  );

  const docsToInsert = [];

  for (const remoteCategory of categories) {
    const providerId = String(remoteCategory.id ?? '').trim();
    if (!providerId) continue;
    const providerKey = `opentdb:${providerId}`;
    if (existingProviderKey.has(providerKey)) continue;

    const doc = buildProviderCategoryDoc(remoteCategory, { existingNameSet });
    if (!doc) continue;

    docsToInsert.push(doc);
    existingNameSet.add(doc.name);
    existingProviderKey.add(providerKey);
  }

  if (docsToInsert.length === 0) {
    return 0;
  }

  try {
    await Category.insertMany(docsToInsert, { ordered: false });
    logger.info(`[CategorySeeder] Seeded ${docsToInsert.length} OpenTDB categories`);
    return docsToInsert.length;
  } catch (error) {
    logger.warn(`[CategorySeeder] Failed to insert OpenTDB categories: ${error.message}`);
    return 0;
  }
}

async function seedFallbackCategories() {
  const fallback = getFallbackCategories();
  if (!Array.isArray(fallback) || fallback.length === 0) return 0;

  const docs = fallback.map((item) => {
    const name = sanitizeString(item.name || item.title || 'دسته‌بندی');
    const displayName = sanitizeString(item.title || item.name || name);
    const aliases = sanitizeAliasList([item.name, item.title, name, displayName]);
    return {
      name: displayName || name,
      displayName: displayName || name,
      description: sanitizeString(item.description),
      icon: sanitizeString(item.icon) || 'fa-layer-group',
      color: sanitizeString(item.color) || 'blue',
      status: 'active',
      provider: 'manual',
      providerCategoryId: null,
      aliases
    };
  });

  try {
    await Category.insertMany(docs, { ordered: false });
    logger.info(`[CategorySeeder] Seeded ${docs.length} fallback categories`);
    return docs.length;
  } catch (error) {
    logger.warn(`[CategorySeeder] Failed to insert fallback categories: ${error.message}`);
    return 0;
  }
}

async function ensureInitialCategories() {
  const total = await Category.countDocuments();
  if (total > 0) {
    return;
  }

  const inserted = await seedFromOpenTdb();
  if (inserted > 0) {
    return;
  }

  await seedFallbackCategories();
}

async function syncProviderCategories() {
  await seedFromOpenTdb();
}

module.exports = {
  ensureInitialCategories,
  syncProviderCategories
};

