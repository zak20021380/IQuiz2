require('dotenv').config();
const mongoose = require('mongoose');
const Province = require('../models/Province');
const { getFallbackProvinces } = require('../services/publicContent');

(async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/iquiz';
    await mongoose.connect(mongoUri, {});

    const existing = await Province.countDocuments();
    if (existing > 0) {
      console.log('✅ Provinces already exist, skipping seeding.');
      process.exit(0);
    }

    const fallback = getFallbackProvinces();
    if (!Array.isArray(fallback) || fallback.length === 0) {
      console.log('⚠️  No fallback provinces available. Nothing to seed.');
      process.exit(0);
    }

    const documents = fallback
      .map((item, index) => {
        const name = typeof item?.name === 'string' ? item.name.trim() : '';
        if (!name) return null;
        return {
          name,
          code: `province-${index + 1}`,
          sortOrder: index,
          isActive: true
        };
      })
      .filter(Boolean);

    if (!documents.length) {
      console.log('⚠️  No valid fallback provinces to seed.');
      process.exit(0);
    }

    await Province.insertMany(documents, { ordered: false });
    console.log(`✅ Seeded ${documents.length} provinces.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed provinces:', error.message);
    process.exit(1);
  }
})();
