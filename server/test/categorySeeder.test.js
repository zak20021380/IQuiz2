const test = require('node:test');
const assert = require('assert');

const {
  seedCategories,
  STATIC_CATEGORY_ENTRIES,
  pickNonUnique
} = require('../src/services/categorySeeder');

test('seedCategories uses identity filters and separates unique fields', async () => {
  const sampleEntries = STATIC_CATEGORY_ENTRIES.slice(0, 2);
  const calls = [];
  const stub = {
    async updateOne(filter, update) {
      calls.push({ filter, update });
      return { upsertedCount: 1, modifiedCount: 0 };
    }
  };

  const result = await seedCategories(stub, sampleEntries);
  assert.strictEqual(result.inserted, sampleEntries.length);
  assert.strictEqual(result.updated, 0);

  assert.ok(calls.length >= 1, 'updateOne should be called');
  const [{ filter, update }] = calls;
  assert.ok(filter.$or.some((condition) => condition.name === sampleEntries[0].name));
  assert.ok(filter.$or.some((condition) => condition.slug === sampleEntries[0].slug));
  assert.ok(filter.$or.some((condition) => condition.provider === sampleEntries[0].provider));
  assert.ok(update.$setOnInsert.name === sampleEntries[0].name);
  assert.ok(update.$setOnInsert.slug === sampleEntries[0].slug);
  assert.ok(!Object.prototype.hasOwnProperty.call(update.$set, 'name'));
  assert.ok(!Object.prototype.hasOwnProperty.call(update.$set, 'slug'));
});

test('seedCategories second run reports updates without inserts', async () => {
  const entry = STATIC_CATEGORY_ENTRIES[0];
  let callCount = 0;
  const stub = {
    async updateOne() {
      callCount += 1;
      if (callCount === 1) {
        return { upsertedCount: 1, modifiedCount: 0 };
      }
      return { upsertedCount: 0, modifiedCount: 1 };
    }
  };

  const first = await seedCategories(stub, [entry]);
  const second = await seedCategories(stub, [entry]);

  assert.deepStrictEqual(first, { inserted: 1, updated: 0 });
  assert.deepStrictEqual(second, { inserted: 0, updated: 1 });
});

test('pickNonUnique strips identity fields', () => {
  const entry = STATIC_CATEGORY_ENTRIES[0];
  const nonUnique = pickNonUnique(entry);
  assert.ok(!('name' in nonUnique));
  assert.ok(!('slug' in nonUnique));
  assert.ok(!('provider' in nonUnique));
  assert.ok(!('providerCategoryId' in nonUnique));
});
