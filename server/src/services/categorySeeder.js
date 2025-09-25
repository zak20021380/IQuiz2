const Category = require('../models/Category');
const logger = require('../config/logger');
const { CATEGORIES } = require('../config/categories');

const STATIC_CATEGORY_ENTRIES = CATEGORIES.map((category, index) => {
  const name = typeof category.name === 'string' ? category.name.trim() : '';
  const slug = typeof category.slug === 'string' ? category.slug.trim().toLowerCase() : '';
  const provider = typeof category.provider === 'string' && category.provider.trim()
    ? category.provider.trim()
    : 'ai-gen';
  const providerCategoryId = typeof category.providerCategoryId === 'string' && category.providerCategoryId.trim()
    ? category.providerCategoryId.trim()
    : slug || name;

  return {
    name: name || slug || `category-${index + 1}`,
    slug: slug || `category-${index + 1}`,
    displayName: typeof category.displayName === 'string' && category.displayName.trim()
      ? category.displayName.trim()
      : name || slug || `Category ${index + 1}`,
    description: typeof category.description === 'string' ? category.description.trim() : '',
    icon: typeof category.icon === 'string' && category.icon.trim() ? category.icon.trim() : 'fa-layer-group',
    color: typeof category.color === 'string' && category.color.trim() ? category.color.trim() : 'blue',
    status: 'active',
    provider,
    providerCategoryId,
    aliases: Array.isArray(category.aliases)
      ? Array.from(new Set(category.aliases.map((alias) => (typeof alias === 'string' ? alias.trim() : '')).filter(Boolean)))
      : [],
    order: Number.isFinite(Number(category.order)) ? Number(category.order) : index + 1
  };
});

function pickNonUnique(category) {
  const {
    name,
    slug,
    provider,
    providerCategoryId,
    ...rest
  } = category;
  return rest;
}

function buildIdentityFilter(category) {
  const or = [];
  if (category.name) {
    or.push({ name: category.name });
  }
  if (category.slug) {
    or.push({ slug: category.slug });
  }
  if (category.provider && category.providerCategoryId) {
    or.push({ provider: category.provider, providerCategoryId: category.providerCategoryId });
  }

  if (!or.length) {
    return { name: category.name }; // fallback to prevent empty filter
  }

  return { $or: or };
}

function buildInsertIdentity(category) {
  const identity = {};
  if (category.name) identity.name = category.name;
  if (category.slug) identity.slug = category.slug;
  if (category.provider) identity.provider = category.provider;
  if (category.providerCategoryId) identity.providerCategoryId = category.providerCategoryId;
  return identity;
}

async function seedCategories(CategoryModel = Category, entries = STATIC_CATEGORY_ENTRIES) {
  let inserted = 0;
  let updated = 0;

  for (const category of entries) {
    const filter = buildIdentityFilter(category);
    const update = {
      $set: pickNonUnique(category),
      $setOnInsert: buildInsertIdentity(category)
    };

    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await CategoryModel.updateOne(filter, update, {
        upsert: true,
        setDefaultsOnInsert: true
      });

      if (result?.upsertedCount) {
        inserted += result.upsertedCount;
      } else if (result?.modifiedCount) {
        updated += result.modifiedCount;
      }
    } catch (error) {
      logger.error(`[CategorySeeder] Failed to sync category '${category.slug}': ${error.message}`);
      throw error;
    }
  }

  logger.info(`[CategorySeeder] inserted=${inserted}, updated=${updated}`);

  return { inserted, updated };
}

let seededPromise = null;

async function ensureInitialCategories() {
  if (global.__CATEGORY_SEEDED__) {
    return global.__CATEGORY_SEEDED__;
  }

  if (!seededPromise) {
    seededPromise = seedCategories();
  }

  global.__CATEGORY_SEEDED__ = seededPromise;
  return seededPromise;
}

async function syncProviderCategories() {
  return ensureInitialCategories();
}

module.exports = {
  ensureInitialCategories,
  syncProviderCategories,
  seedCategories,
  pickNonUnique,
  STATIC_CATEGORY_ENTRIES
};
