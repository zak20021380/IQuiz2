#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const env = require('../config/env');
const logger = require('../config/logger');
const Question = require('../models/Question');
const Category = require('../models/Category');

const PROVIDERS_TO_REMOVE = ['opentdb', 'thetrivia', 'the-trivia', 'trivia', 'jservice', 'cluebase', 'unknown'];

function deriveCorrectAnswer(choices, correctIndex) {
  if (!Array.isArray(choices) || choices.length === 0) {
    return '';
  }

  const index = Number(correctIndex);
  if (!Number.isInteger(index) || index < 0 || index >= choices.length) {
    return '';
  }

  const raw = choices[index];
  return typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
}

function buildProviderRemovalFilter() {
  return {
    $or: [
      {
        $expr: {
          $in: [
            {
              $toLower: {
                $trim: { input: { $ifNull: ['$provider', ''] } }
              }
            },
            PROVIDERS_TO_REMOVE
          ]
        }
      },
      { provider: { $exists: false } },
      { provider: null },
      {
        $expr: {
          $eq: [
            {
              $trim: { input: { $ifNull: ['$provider', ''] } }
            },
            ''
          ]
        }
      }
    ]
  };
}

function buildMissingIntegrityFilter() {
  return {
    $or: [
      { hash: { $exists: false } },
      { hash: null },
      {
        $expr: {
          $eq: [
            {
              $trim: { input: { $ifNull: ['$hash', ''] } }
            },
            ''
          ]
        }
      },
      { correctAnswer: { $exists: false } },
      {
        $expr: {
          $eq: [
            {
              $trim: { input: { $ifNull: ['$correctAnswer', ''] } }
            },
            ''
          ]
        }
      }
    ]
  };
}

async function deleteLegacyQuestions() {
  const filter = buildProviderRemovalFilter();
  const result = await Question.deleteMany(filter);
  return result?.deletedCount ?? result?.n ?? 0;
}

async function backfillQuestionIntegrity() {
  const cursor = Question.find(buildMissingIntegrityFilter())
    .select({ text: 1, choices: 1, correctIndex: 1, correctIdx: 1, hash: 1, checksum: 1, correctAnswer: 1, provider: 1 })
    .cursor();

  const bulkOps = [];
  let updated = 0;
  let examined = 0;

  for await (const doc of cursor) {
    examined += 1;
    const updates = {};

    const normalizedHash = typeof doc.hash === 'string' ? doc.hash.trim() : '';
    let targetHash = normalizedHash;
    if (!targetHash) {
      try {
        targetHash = Question.generateHash(doc.text, doc.choices);
      } catch (error) {
        logger.warn(`[cleanupQuestions] Failed to generate hash for question ${doc?._id}: ${error.message}`);
      }
    }

    if (targetHash && targetHash !== normalizedHash) {
      updates.hash = targetHash;
      updates.checksum = targetHash;
    }

    const answer = deriveCorrectAnswer(doc.choices, doc.correctIndex ?? doc.correctIdx);
    const normalizedAnswer = typeof doc.correctAnswer === 'string' ? doc.correctAnswer.trim() : '';
    if (answer !== normalizedAnswer) {
      updates.correctAnswer = answer;
    }

    if (Object.keys(updates).length > 0) {
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: updates }
        }
      });
    }

    if (bulkOps.length >= 500) {
      const result = await Question.bulkWrite(bulkOps);
      updated += result?.modifiedCount ?? result?.nModified ?? 0;
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    const result = await Question.bulkWrite(bulkOps);
    updated += result?.modifiedCount ?? result?.nModified ?? 0;
  }

  return { updated, examined };
}

async function dropAndRecreateIndexes() {
  try {
    await Question.collection.dropIndexes();
  } catch (error) {
    if (error?.codeName !== 'IndexNotFound' && error?.code !== 27 && error?.code !== 28 && error?.code !== 26) {
      throw error;
    }
  }

  await Question.collection.createIndex(
    { provider: 1, hash: 1 },
    { unique: true, sparse: true, name: 'uniq_provider_hash' }
  );

  await Question.collection.createIndex(
    { categoryName: 1, difficulty: 1, correctAnswer: 1, createdAt: -1 },
    { name: 'idx_category_difficulty_correctAnswer_createdAt' }
  );
}

async function resetCategoryQuestionStats() {
  try {
    const result = await Category.updateMany(
      {},
      {
        $set: {
          questionCount: 0,
          activeQuestionCount: 0,
          inactiveQuestionCount: 0,
          totalQuestions: 0,
          activeQuestions: 0,
          inactiveQuestions: 0
        }
      }
    );

    return result?.modifiedCount ?? result?.nModified ?? 0;
  } catch (error) {
    logger.warn(`[cleanupQuestions] Failed to reset category stats: ${error.message}`);
    return 0;
  }
}

async function resetStatsCollection(connection) {
  try {
    const collections = await connection.db.listCollections({ name: 'stats' }).toArray();
    if (!Array.isArray(collections) || collections.length === 0) {
      return 0;
    }

    const statsCollection = connection.db.collection('stats');
    const result = await statsCollection.updateMany(
      {},
      {
        $set: {
          totalQuestions: 0,
          'questions.total': 0,
          'questions.today': 0,
          'questions.yesterday': 0,
          'questions.count': 0,
          'questionStats.total': 0,
          'questionStats.today': 0,
          'questionStats.yesterday': 0,
          'stats.questions.total': 0,
          'stats.questions.today': 0,
          'stats.questions.yesterday': 0
        }
      }
    );

    return result?.modifiedCount ?? result?.nModified ?? 0;
  } catch (error) {
    logger.warn(`[cleanupQuestions] Failed to reset stats collection: ${error.message}`);
    return 0;
  }
}

async function logSummary() {
  const total = await Question.countDocuments();
  const providers = await Question.aggregate([
    {
      $group: {
        _id: {
          $toLower: {
            $trim: { input: { $ifNull: ['$provider', 'unknown'] } }
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  if (providers.length > 0) {
    logger.info('[cleanupQuestions] Remaining questions grouped by provider:', providers);
  }

  return total;
}

async function run() {
  const mongoUri = env.mongo?.uri || process.env.MONGO_URI || 'mongodb://localhost:27017/iquiz';
  const maxPoolSize = env.mongo?.maxPoolSize || 10;

  await mongoose.connect(mongoUri, {
    maxPoolSize,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000
  });

  logger.info('[cleanupQuestions] Connected to MongoDB');

  const deleted = await deleteLegacyQuestions();
  const { updated: integrityUpdates } = await backfillQuestionIntegrity();
  await dropAndRecreateIndexes();
  const categoryResets = await resetCategoryQuestionStats();
  const statsResets = await resetStatsCollection(mongoose.connection);
  const remaining = await logSummary();

  console.log('Cleanup complete', { deleted, remaining });
  logger.info('[cleanupQuestions] Cleanup summary', {
    deleted,
    remaining,
    integrityUpdates,
    categoryResets,
    statsResets
  });
}

run()
  .catch((error) => {
    logger.error(`[cleanupQuestions] Failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
      logger.info('[cleanupQuestions] MongoDB connection closed');
    } catch (error) {
      logger.warn(`[cleanupQuestions] Failed to close MongoDB connection cleanly: ${error.message}`);
    }
  });
