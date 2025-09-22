const CATEGORY_DEFINITIONS = Object.freeze([
  {
    order: 1,
    slug: 'general',
    name: 'General Knowledge',
    displayName: 'عمومی',
    description: 'سوالاتی متنوع از دانستنی‌های روزمره و موضوعات عمومی.',
    icon: 'fa-earth-asia',
    color: 'blue',
    aliases: ['عمومی', 'دانش عمومی', 'General']
  },
  {
    order: 2,
    slug: 'history-civilization',
    name: 'History & Civilization',
    displayName: 'تاریخ و تمدن',
    description: 'رویدادها، امپراتوری‌ها و میراث فرهنگی ملت‌ها.',
    icon: 'fa-landmark-dome',
    color: 'orange',
    aliases: ['تاریخ', 'تمدن', 'History']
  },
  {
    order: 3,
    slug: 'geography-nature',
    name: 'Geography & Nature',
    displayName: 'جغرافیا و طبیعت',
    description: 'سرزمین‌ها، اقلیم‌ها و شگفتی‌های طبیعی جهان.',
    icon: 'fa-mountain-sun',
    color: 'teal',
    aliases: ['جغرافیا', 'طبیعت', 'Geography']
  },
  {
    order: 4,
    slug: 'science-technology',
    name: 'Science & Technology',
    displayName: 'علوم و فناوری',
    description: 'کشفیات علمی، نوآوری‌های فنی و پیشرفت‌های روز.',
    icon: 'fa-atom',
    color: 'indigo',
    aliases: ['علم', 'فناوری', 'Science']
  },
  {
    order: 5,
    slug: 'literature-language',
    name: 'Literature & Language',
    displayName: 'ادبیات و زبان',
    description: 'نویسندگان، آثار ادبی و دنیای زبان‌ها و واژگان.',
    icon: 'fa-feather-pointed',
    color: 'purple',
    aliases: ['ادبیات', 'زبان', 'Literature']
  },
  {
    order: 6,
    slug: 'movies-series',
    name: 'Movies & Series',
    displayName: 'فیلم و سریال',
    description: 'سینما، تلویزیون و داستان‌های ماندگار پرده نقره‌ای.',
    icon: 'fa-clapperboard',
    color: 'yellow',
    aliases: ['فیلم', 'سریال', 'Movies']
  },
  {
    order: 7,
    slug: 'sports',
    name: 'Sports',
    displayName: 'ورزش',
    description: 'رشته‌ها، قهرمانان و رویدادهای مهم ورزشی.',
    icon: 'fa-medal',
    color: 'red',
    aliases: ['ورزش', 'Sport', 'Sports']
  },
  {
    order: 8,
    slug: 'entertainment',
    name: 'Entertainment',
    displayName: 'سرگرمی',
    description: 'بازی‌ها، پازل‌ها و موضوعات سرگرم‌کننده برای اوقات فراغت.',
    icon: 'fa-gamepad',
    color: 'pink',
    aliases: ['سرگرمی', 'تفریح', 'Entertainment']
  }
]);

const CATEGORIES = Object.freeze(
  CATEGORY_DEFINITIONS.map((category) => {
    const order = Number.isFinite(Number(category.order)) ? Number(category.order) : 0;
    const slug = String(category.slug || '').trim();
    const name = category.name || category.displayName || slug || 'Category';
    const displayName = category.displayName || name;
    const description = category.description || '';
    const icon = category.icon || 'fa-layer-group';
    const color = category.color || 'blue';
    const provider = category.provider || 'ai-gen';
    const providerCategoryId = category.providerCategoryId || slug;
    const aliases = Array.isArray(category.aliases)
      ? category.aliases
      : [];

    const normalizedAliases = Array.from(
      new Set(
        [...aliases, displayName, name]
          .map((alias) => String(alias ?? '').trim())
          .filter((alias) => alias.length > 0)
      )
    );

    return Object.freeze({
      order,
      slug,
      name,
      displayName,
      description,
      icon,
      color,
      aliases: normalizedAliases,
      provider,
      providerCategoryId
    });
  })
);

const CATEGORY_LOOKUP_BY_SLUG = Object.freeze(
  CATEGORIES.reduce((acc, category) => {
    acc[category.slug] = category;
    return acc;
  }, {})
);

const CATEGORY_LOOKUP_BY_ALIAS = Object.freeze(
  CATEGORIES.reduce((acc, category) => {
    const aliasSet = new Set([
      category.slug,
      category.name,
      category.displayName,
      category.providerCategoryId,
      ...(Array.isArray(category.aliases) ? category.aliases : [])
    ]);

    aliasSet.forEach((alias) => {
      if (!alias) return;
      const normalized = String(alias).trim().toLowerCase();
      if (!normalized) return;
      if (!acc[normalized]) acc[normalized] = category;
    });

    return acc;
  }, {})
);

function normalizeCategoryKey(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

function resolveCategory(input) {
  if (!input) return null;

  if (typeof input === 'string') {
    const key = normalizeCategoryKey(input);
    if (!key) return null;
    return CATEGORY_LOOKUP_BY_ALIAS[key] || null;
  }

  if (typeof input === 'object') {
    const candidates = [];
    if (Object.prototype.hasOwnProperty.call(input, 'slug')) {
      candidates.push(input.slug);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'providerCategoryId')) {
      candidates.push(input.providerCategoryId);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'id')) {
      candidates.push(input.id);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'name')) {
      candidates.push(input.name);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'displayName')) {
      candidates.push(input.displayName);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'title')) {
      candidates.push(input.title);
    }
    if (Array.isArray(input.aliases)) {
      candidates.push(...input.aliases);
    }

    for (const candidate of candidates) {
      const match = resolveCategory(candidate);
      if (match) return match;
    }
  }

  return null;
}

module.exports = { CATEGORIES, CATEGORY_LOOKUP_BY_SLUG, CATEGORY_LOOKUP_BY_ALIAS, resolveCategory };
