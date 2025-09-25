#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const env = require('../src/config/env');
const logger = require('../src/config/logger');
const Question = require('../src/models/Question');
const { buildFingerprints } = require('../src/services/questionIngest');

const BATCH_SIZE = 2000;

async function migrateFingerprints() {
  const filter = {
    $or: [
      { sha1Canonical: { $exists: false } },
      { sha1Canonical: null },
      { simhash64: { $exists: false } },
      { simhash64: null },
      { lshBucket: { $exists: false } },
      { lshBucket: null }
    ]
  };

  const cursor = Question.find(filter).cursor();
  let processed = 0;
  let updated = 0;
  let batchCount = 0;
  let operations = [];

  for await (const doc of cursor) {
    processed += 1;
    batchCount += 1;
    const fingerprints = buildFingerprints(doc.text || doc.question || '');
    const updates = {};

    if (fingerprints.sha1 && doc.sha1Canonical !== fingerprints.sha1) {
      updates.sha1Canonical = fingerprints.sha1;
    }
    if (fingerprints.simhash && doc.simhash64 !== fingerprints.simhash) {
      updates.simhash64 = fingerprints.simhash;
    }
    if (fingerprints.bucket && doc.lshBucket !== fingerprints.bucket) {
      updates.lshBucket = fingerprints.bucket;
    }

    if (!doc.meta || typeof doc.meta !== 'object') {
      doc.meta = {};
    }
    if (fingerprints.normalized && doc.meta.normalizedText !== fingerprints.normalized) {
      updates.meta = {
        ...doc.meta,
        normalizedText: fingerprints.normalized
      };
    }

    if (Object.keys(updates).length > 0) {
      operations.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: updates }
        }
      });
    }

    if (operations.length >= BATCH_SIZE) {
      const result = await Question.bulkWrite(operations, { ordered: false });
      updated += result?.modifiedCount ?? result?.nModified ?? 0;
      operations = [];
      logger.info(`Processed ${processed} questions so far, updated ${updated}.`);
    }
  }

  if (operations.length > 0) {
    const result = await Question.bulkWrite(operations, { ordered: false });
    updated += result?.modifiedCount ?? result?.nModified ?? 0;
  }

  logger.info(`Migration complete. Processed ${processed} questions, updated ${updated}.`);
}

async function main() {
  const uri = env.mongo.uri;
  logger.info(`Connecting to MongoDB at ${uri}`);
  await mongoose.connect(uri, { maxPoolSize: env.mongo.maxPoolSize });

  try {
    await migrateFingerprints();
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
