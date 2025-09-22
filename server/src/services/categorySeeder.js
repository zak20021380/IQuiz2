const Category = require('../models/Category');
const logger = require('../config/logger');
const { CATEGORIES } = require('../config/categories');

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildCategoryDoc(seed) {
  const name = sanitizeString(seed.name || seed.slug || seed.displayName || 'دسته‌بندی');
  const displayName = sanitizeString(seed.displayName) || name || 'دسته‌بندی';
  const description = sanitizeString(seed.description);
  const icon = sanitizeString(seed.icon) || 'fa-layer-group';
  const color = sanitizeString(seed.color) || 'blue';
  const provider = sanitizeString(seed.provider) || 'ai-gen';
  const slug = sanitizeString(seed.slug || seed.id || name).toLowerCase();
  const providerCategoryIdCandidate = sanitizeString(
    seed.providerCategoryId || seed.id || seed.slug || ''
  );
  const providerCategoryId = providerCategoryIdCandidate || slug;
  const order = Number.isFinite(Number(seed.order)) ? Number(seed.order) : 0;
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
    providerCategoryId,
    aliases: Array.from(new Set(aliases)),
    slug,
    order
  };
}

async function seedStaticCategories() {
  const docs = CATEGORIES.map(buildCategoryDoc);
  if (!docs.length) {
    logger.warn('[CategorySeeder] No static categories configured to seed');
    return { inserted: 0, updated: 0, removed: 0 };
  }

  const allowedSlugs = new Set();
  let inserted = 0;
  let updated = 0;

  for (const doc of docs) {
    allowedSlugs.add(doc.slug);

    try {
      const query = {
        provider: doc.provider,
        $or: [{ slug: doc.slug }, { name: doc.name }]
      };

      if (doc.providerCategoryId) {
        query.$or.push({ providerCategoryId: doc.providerCategoryId });
      }

      // eslint-disable-next-line no-await-in-loop
      let result = await Category.updateOne(
        query,
        {
          $set: {
            name: doc.name,
            displayName: doc.displayName,
            description: doc.description,
            icon: doc.icon,
            color: doc.color,
            status: doc.status,
            provider: doc.provider,
            providerCategoryId: doc.providerCategoryId,
            aliases: doc.aliases,
            slug: doc.slug,
            order: doc.order
          }
        },
        {
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          timestamps: true
        }
      );

      if (!result?.matchedCount && !result?.upsertedCount) {
        const legacyMatch = await Category.findOneAndUpdate(
          { slug: doc.slug, provider: { $ne: doc.provider } },
          { $set: { provider: doc.provider } },
          { new: true }
        );

        if (legacyMatch) {
          result = await Category.updateOne(
            query,
            {
              $set: {
                name: doc.name,
                displayName: doc.displayName,
                description: doc.description,
                icon: doc.icon,
                color: doc.color,
                status: doc.status,
                provider: doc.provider,
                providerCategoryId: doc.providerCategoryId,
                aliases: doc.aliases,
                slug: doc.slug,
                order: doc.order
              }
            },
            {
              upsert: true,
              runValidators: true,
              setDefaultsOnInsert: true,
              timestamps: true
            }
          );
        }
      }

      if (result?.upsertedCount) {
        inserted += result.upsertedCount;
      } else if (result?.modifiedCount) {
        updated += result.modifiedCount;
      }
    } catch (error) {
      logger.warn(`[CategorySeeder] Failed to sync category '${doc.slug}': ${error.message}`);
    }
  }

  let removed = 0;
  try {
    const deleteResult = await Category.deleteMany({
      provider: 'ai-gen',
      slug: { $nin: Array.from(allowedSlugs) }
    });
    removed = deleteResult?.deletedCount || 0;
  } catch (error) {
    logger.warn(`[CategorySeeder] Failed to prune legacy provider categories: ${error.message}`);
  }

  logger.info(
    `[CategorySeeder] Synced static categories (inserted: ${inserted}, updated: ${updated}, removed: ${removed})`
  );

  return { inserted, updated, removed };
}

async function ensureInitialCategories() {
  await seedStaticCategories();
}

async function syncProviderCategories() {
  await seedStaticCategories();
}

module.exports = {
  ensureInitialCategories,
  syncProviderCategories
};
