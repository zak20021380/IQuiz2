#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const env = require('../config/env');
const logger = require('../config/logger');
const Question = require('../models/Question');
const Category = require('../models/Category');

const PROVIDERS_TO_PURGE = new Set(['opentdb', 'thetrivia', 'the-trivia', 'trivia']);
const CATEGORY_PROVIDERS_TO_PURGE = new Set(['opentdb', 'thetrivia', 'the-trivia', 'trivia']);
const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function canonicalize(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function deriveCorrectAnswer(choices, correctIndex) {
  if (!Array.isArray(choices) || choices.length === 0) {
    return '';
  }
  const index = Number(correctIndex);
  if (!Number.isInteger(index) || index < 0 || index >= choices.length) {
    return '';
  }
  return canonicalize(choices[index]);
}

function buildProviderRemovalFilter() {
  return {
    provider: {
      $in: Array.from(PROVIDERS_TO_PURGE)
    }
  };
}

async function purgeLegacyQuestions() {
  const filter = buildProviderRemovalFilter();
  const result = await Question.deleteMany(filter);
  return result?.deletedCount ?? 0;
}

async function purgeLegacyCategories() {
  const filter = {
    provider: { $in: Array.from(CATEGORY_PROVIDERS_TO_PURGE) }
  };
  const result = await Category.deleteMany(filter);
  return result?.deletedCount ?? 0;
}

async function backfillCategorySlugs() {
  const updates = [];
  const cursor = Category.find({}).cursor();
  for await (const doc of cursor) {
    const source = doc.slug || doc.displayName || doc.name;
    const slug = canonicalize(source).replace(/\s+/g, '-').replace(/[^a-z0-9\u0600-\u06FF-]/g, '').replace(/-+/g, '-');
    const finalSlug = slug || `category-${doc._id}`;
    if (doc.slug !== finalSlug) {
      updates.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { slug: finalSlug } }
        }
      });
    }
  }

  if (updates.length) {
    const result = await Category.bulkWrite(updates, { ordered: false });
    return result?.modifiedCount ?? result?.nModified ?? 0;
  }
  return 0;
}

async function recomputeIntegrity() {
  const cursor = Question.find({}).cursor();
  const operations = [];
  let processed = 0;
  let updated = 0;

  for await (const doc of cursor) {
    processed += 1;
    const choices = Array.isArray(doc.choices) ? doc.choices : doc.options || [];
    const correctAnswer = deriveCorrectAnswer(choices, doc.correctIndex ?? doc.correctIdx);
    const categorySlug = typeof doc.categorySlug === 'string' && doc.categorySlug.trim()
      ? doc.categorySlug.trim()
      : '';

    const updates = {};
    if (correctAnswer && doc.correctAnswer !== correctAnswer) {
      updates.correctAnswer = correctAnswer;
    }

    if (!ALLOWED_DIFFICULTIES.has(doc.difficulty)) {
      updates.difficulty = 'medium';
    }

    if (!categorySlug && doc.category) {
      const category = await Category.findById(doc.category, { slug: 1 }).lean();
      if (category?.slug) {
        updates.categorySlug = category.slug;
      }
    }

    if (!correctAnswer || !doc.text) {
      continue;
    }

    const hash = Question.generateHash(doc.text, correctAnswer);
    if (hash && doc.hash !== hash) {
      updates.hash = hash;
      updates.checksum = hash;
    }

    if (Object.keys(updates).length > 0) {
      operations.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: updates }
        }
      });
    }

    if (operations.length >= 500) {
      const bulkResult = await Question.bulkWrite(operations, { ordered: false });
      updated += bulkResult?.modifiedCount ?? bulkResult?.nModified ?? 0;
      operations.length = 0;
    }
  }

  if (operations.length > 0) {
    const bulkResult = await Question.bulkWrite(operations, { ordered: false });
    updated += bulkResult?.modifiedCount ?? bulkResult?.nModified ?? 0;
  }

  return { processed, updated };
}

async function rebuildIndexes() {
  try {
    await Question.collection.dropIndexes();
  } catch (error) {
    if (!['IndexNotFound', 'NamespaceNotFound'].includes(error?.codeName) && ![26, 27, 28].includes(error?.code)) {
      throw error;
    }
  }

  await Question.collection.createIndex(
    { provider: 1, hash: 1 },
    { unique: true, sparse: true, name: 'uniq_provider_hash' }
  );

  await Question.collection.createIndex(
    { categorySlug: 1, difficulty: 1, createdAt: -1 },
    { name: 'idx_categorySlug_difficulty_createdAt' }
  );
}

async function refreshCategoryStats() {
  const stats = await Question.aggregate([
    {
      $group: {
        _id: '$category',
        total: { $sum: 1 },
        active: { $sum: { $cond: ['$active', 1, 0] } }
      }
    }
  ]);

  const updates = stats.map((stat) => ({
    updateOne: {
      filter: { _id: stat._id },
      update: {
        $set: {
          questionCount: stat.total,
          activeQuestionCount: stat.active,
          inactiveQuestionCount: Math.max(stat.total - stat.active, 0)
        }
      }
    }
  }));

  if (updates.length) {
    await Category.bulkWrite(updates, { ordered: false });
  }
}

async function main() {
  await mongoose.connect(env.mongo.uri, { maxPoolSize: env.mongo.maxPoolSize });

  logger.info('Started cleanup script');
  const [removedQuestions, removedCategories] = await Promise.all([
    purgeLegacyQuestions(),
    purgeLegacyCategories()
  ]);
  logger.info(`Removed ${removedQuestions} legacy questions`);
  logger.info(`Removed ${removedCategories} legacy categories`);

  const slugUpdates = await backfillCategorySlugs();
  if (slugUpdates) {
    logger.info(`Updated ${slugUpdates} category slugs`);
  }

  const integrity = await recomputeIntegrity();
  logger.info(`Processed ${integrity.processed} questions, updated ${integrity.updated}`);

  await rebuildIndexes();
  await refreshCategoryStats();

  await mongoose.disconnect();
  logger.info('Cleanup script completed');
}

main().catch((error) => {
  logger.error(`Cleanup script failed: ${error.message}`);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
