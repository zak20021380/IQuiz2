const STATIC_CATEGORY_DEFINITIONS = Object.freeze([
  {
    order: 1,
    slug: 'general',
    id: 'general',
    name: 'General Knowledge',
    displayName: 'عمومی',
    description: 'سوالاتی متنوع از دانستنی‌های روزمره و موضوعات عمومی.',
    icon: 'fa-earth-asia',
    color: 'blue',
    provider: 'ai-gen',
    providerCategoryId: 'general',
    aliases: ['عمومی', 'دانش عمومی', 'General', 'General Knowledge']
  },
  {
    order: 2,
    slug: 'history-civilization',
    id: 'history-civilization',
    name: 'History & Civilization',
    displayName: 'تاریخ و تمدن',
    description: 'رویدادها، امپراتوری‌ها و میراث فرهنگی ملت‌ها.',
    icon: 'fa-landmark-dome',
    color: 'orange',
    provider: 'ai-gen',
    providerCategoryId: 'history-civilization',
    aliases: ['تاریخ', 'تمدن', 'History', 'History & Civilization']
  },
  {
    order: 3,
    slug: 'geography-nature',
    id: 'geography-nature',
    name: 'Geography & Nature',
    displayName: 'جغرافیا و طبیعت',
    description: 'سرزمین‌ها، اقلیم‌ها و شگفتی‌های طبیعی جهان.',
    icon: 'fa-mountain-sun',
    color: 'teal',
    provider: 'ai-gen',
    providerCategoryId: 'geography-nature',
    aliases: ['جغرافیا', 'طبیعت', 'Geography', 'Geography & Nature']
  },
  {
    order: 4,
    slug: 'science-technology',
    id: 'science-technology',
    name: 'Science & Technology',
    displayName: 'علوم و فناوری',
    description: 'کشفیات علمی، نوآوری‌های فنی و پیشرفت‌های روز.',
    icon: 'fa-atom',
    color: 'indigo',
    provider: 'ai-gen',
    providerCategoryId: 'science-technology',
    aliases: ['علم', 'فناوری', 'Science', 'Science & Technology']
  },
  {
    order: 5,
    slug: 'literature-language',
    id: 'literature-language',
    name: 'Literature & Language',
    displayName: 'ادبیات و زبان',
    description: 'نویسندگان، آثار ادبی و دنیای زبان‌ها و واژگان.',
    icon: 'fa-feather-pointed',
    color: 'purple',
    provider: 'ai-gen',
    providerCategoryId: 'literature-language',
    aliases: ['ادبیات', 'زبان', 'Literature', 'Literature & Language']
  },
  {
    order: 6,
    slug: 'movies-series',
    id: 'movies-series',
    name: 'Movies & Series',
    displayName: 'فیلم و سریال',
    description: 'سینما، تلویزیون و داستان‌های ماندگار پرده نقره‌ای.',
    icon: 'fa-clapperboard',
    color: 'yellow',
    provider: 'ai-gen',
    providerCategoryId: 'movies-series',
    aliases: ['فیلم', 'سریال', 'Movies', 'Movies & Series']
  },
  {
    order: 7,
    slug: 'sports',
    id: 'sports',
    name: 'Sports',
    displayName: 'ورزش',
    description: 'رشته‌ها، قهرمانان و رویدادهای مهم ورزشی.',
    icon: 'fa-medal',
    color: 'red',
    provider: 'ai-gen',
    providerCategoryId: 'sports',
    aliases: ['ورزش', 'Sport', 'Sports']
  },
  {
    order: 8,
    slug: 'entertainment',
    id: 'entertainment',
    name: 'Entertainment',
    displayName: 'سرگرمی',
    description: 'بازی‌ها، پازل‌ها و موضوعات سرگرم‌کننده برای اوقات فراغت.',
    icon: 'fa-gamepad',
    color: 'pink',
    provider: 'ai-gen',
    providerCategoryId: 'entertainment',
    aliases: ['سرگرمی', 'تفریح', 'Entertainment']
  }
]);

const STATIC_CATEGORY_ALIAS_LOOKUP = (() => {
  const map = new Map();
  const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

  STATIC_CATEGORY_DEFINITIONS.forEach((category) => {
    const aliasSet = new Set([
      category.slug,
      category.id,
      category.name,
      category.displayName,
      category.providerCategoryId,
      ...(Array.isArray(category.aliases) ? category.aliases : [])
    ]);

    aliasSet.forEach((alias) => {
      const key = normalize(alias);
      if (!key) return;
      if (!map.has(key)) map.set(key, category);
    });
  });

  return map;
})();

function normalizeKey(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

function resolveStaticCategoryDefinition(candidate) {
  if (!candidate) return null;

  if (typeof candidate === 'string') {
    const key = normalizeKey(candidate);
    if (!key) return null;
    return STATIC_CATEGORY_ALIAS_LOOKUP.get(key) || null;
  }

  if (typeof candidate === 'object') {
    const candidates = [];
    if (Object.prototype.hasOwnProperty.call(candidate, 'slug')) candidates.push(candidate.slug);
    if (Object.prototype.hasOwnProperty.call(candidate, 'providerCategoryId')) candidates.push(candidate.providerCategoryId);
    if (Object.prototype.hasOwnProperty.call(candidate, 'id')) candidates.push(candidate.id);
    if (Object.prototype.hasOwnProperty.call(candidate, 'name')) candidates.push(candidate.name);
    if (Object.prototype.hasOwnProperty.call(candidate, 'displayName')) candidates.push(candidate.displayName);
    if (Object.prototype.hasOwnProperty.call(candidate, 'title')) candidates.push(candidate.title);
    if (Array.isArray(candidate.aliases)) candidates.push(...candidate.aliases);

    for (const entry of candidates) {
      const match = resolveStaticCategoryDefinition(entry);
      if (match) return match;
    }
  }

  return null;
}

function enforceStaticCategory(category) {
  if (!category) return null;
  const canonical = resolveStaticCategoryDefinition(category);
  if (!canonical) return null;

  const aliasSet = new Set();
  if (Array.isArray(category.aliases)) {
    category.aliases.forEach((alias) => {
      const normalized = typeof alias === 'string' ? alias.trim() : '';
      if (normalized) aliasSet.add(normalized);
    });
  }
  if (Array.isArray(canonical.aliases)) {
    canonical.aliases.forEach((alias) => {
      const normalized = typeof alias === 'string' ? alias.trim() : '';
      if (normalized) aliasSet.add(normalized);
    });
  }
  aliasSet.add(canonical.name);
  aliasSet.add(canonical.displayName);

  const description = category.description && String(category.description).trim()
    ? String(category.description).trim()
    : (canonical.description || '');

  const enforced = {
    ...category,
    id: category.id != null ? category.id : canonical.id,
    slug: canonical.slug,
    name: canonical.name,
    englishName: canonical.name,
    displayName: canonical.displayName,
    title: canonical.displayName,
    description,
    icon: canonical.icon,
    color: canonical.color,
    provider: canonical.provider || category.provider || 'ai-gen',
    providerCategoryId: canonical.providerCategoryId || canonical.slug,
    order: canonical.order,
    aliases: Array.from(aliasSet)
  };

  return enforced;
}

function enforceStaticCategoryList(list = []) {
  return list
    .map(enforceStaticCategory)
    .filter(Boolean)
    .sort((a, b) => {
      const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : 0;
      const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : 0;
      if (orderA !== orderB) return orderA - orderB;
      const aLabel = a.displayName || a.name || '';
      const bLabel = b.displayName || b.name || '';
      return aLabel.localeCompare(bLabel, 'fa');
    });
}

export {
  STATIC_CATEGORY_DEFINITIONS,
  resolveStaticCategoryDefinition,
  enforceStaticCategory,
  enforceStaticCategoryList
};
