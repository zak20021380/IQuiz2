const Category = require('../models/Category');
const logger = require('../config/logger');
const { CATEGORIES } = require('../config/categories');

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildCategoryDoc(seed) {
  const name = sanitizeString(seed.displayName || seed.name || seed.slug || 'دسته‌بندی');
  const displayName = name || 'دسته‌بندی';
  const description = sanitizeString(seed.description);
  const icon = sanitizeString(seed.icon) || 'fa-layer-group';
  const color = sanitizeString(seed.color) || 'blue';
  const provider = sanitizeString(seed.provider) || 'ai-gen';
  const aliases = Array.isArray(seed.aliases)
    ? Array.from(new Set(seed.aliases.map((alias) => sanitizeString(alias)).filter(Boolean)))
    : [];

  aliases.push(name, displayName);

  return {
    name,
    displayName,
    description,
    icon,
    color,
    status: 'active',
    provider,
    providerCategoryId: null,
    aliases: Array.from(new Set(aliases)),
    slug: sanitizeString(seed.slug || seed.id || name).toLowerCase()
  };
}

async function seedStaticCategories() {
  const docs = CATEGORIES.map(buildCategoryDoc);
  if (!docs.length) return 0;

  try {
    await Category.insertMany(docs, { ordered: false });
    logger.info(`[CategorySeeder] Seeded ${docs.length} static categories`);
    return docs.length;
  } catch (error) {
    logger.warn(`[CategorySeeder] Static category seed encountered issues: ${error.message}`);
    return 0;
  }
}

async function ensureInitialCategories() {
  const total = await Category.countDocuments();
  if (total > 0) return;
  await seedStaticCategories();
}

async function syncProviderCategories() {
  await seedStaticCategories();
}

module.exports = {
  ensureInitialCategories,
  syncProviderCategories
};
