#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');

const env = require('../src/config/env');
const Question = require('../src/models/Question');

async function run() {
  const mongoUri = env.mongo?.uri || process.env.MONGO_URI || 'mongodb://localhost:27017/iquiz';
  const maxPoolSize = env.mongo?.maxPoolSize || 10;

  await mongoose.connect(mongoUri, {
    maxPoolSize,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000
  });

  const filter = {
    $or: [
      { provider: { $exists: false } },
      { provider: null },
      { provider: '' }
    ],
    'sourceRef.jserviceId': { $exists: true, $ne: null, $ne: '' }
  };

  const update = { $set: { provider: 'jservice' } };

  const result = await Question.updateMany(filter, update);
  const matched = result?.matchedCount ?? result?.n ?? 0;
  const modified = result?.modifiedCount ?? result?.nModified ?? 0;

  console.log(`Backfill complete. Matched ${matched} document(s), updated ${modified}.`);
}

run()
  .catch((error) => {
    console.error('Failed to backfill JService provider:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Failed to disconnect from MongoDB cleanly:', disconnectError);
    }
  });
