const test = require('node:test');
const assert = require('assert');
const mongoose = require('mongoose');

const { QuestionPicker } = require('../src/services/QuestionPicker');

function createObjectId(id) {
  if (id) return new mongoose.Types.ObjectId(id);
  return new mongoose.Types.ObjectId();
}

function createAggregateStub(docs) {
  return async (pipeline) => {
    let results = docs;
    const matchStage = pipeline.find((stage) => stage.$match);
    if (matchStage && matchStage.$match._id && Array.isArray(matchStage.$match._id.$nin)) {
      const exclude = matchStage.$match._id.$nin.map((id) => id.toString());
      results = results.filter((doc) => !exclude.includes(doc._id.toString()));
    }
    return results;
  };
}

class StoreStub {
  constructor(options = {}) {
    this.recentIds = options.recentIds || [];
    this.sessionMembers = new Set(options.sessionMembers || []);
    this.hotMap = options.hotMap || new Map();
    this.lockFailures = new Set(options.lockFailures || []);
    this.recorded = [];
  }

  async getRecentIds() {
    return this.recentIds;
  }

  async isInSession(userId, sessionId, questionId) {
    return this.sessionMembers.has(questionId);
  }

  async acquireServeLock(userId, questionId) {
    if (this.lockFailures.has(questionId)) {
      return false;
    }
    return true;
  }

  async getBucketsHotness(buckets) {
    const map = new Map();
    (buckets || []).forEach((bucket) => {
      map.set(bucket, this.hotMap.get(bucket) || false);
    });
    return map;
  }

  async recordServe(payload) {
    this.recorded.push(payload);
  }
}

test('QuestionPicker excludes recently served questions', async () => {
  const recentId = createObjectId('64b5fa2c8f8f0f0011111111');
  const otherId = createObjectId('64b5fa2c8f8f0f0022222222');
  const docs = [
    { _id: recentId, lshBucket: 'aaa', usageCount: 5, lastServedAt: null, choices: ['1', '2', '3', '4'], correctAnswer: '1' },
    { _id: otherId, lshBucket: 'bbb', usageCount: 0, lastServedAt: null, choices: ['a', 'b', 'c', 'd'], correctAnswer: 'a' }
  ];
  const store = new StoreStub({ recentIds: [recentId.toString()] });
  const picker = new QuestionPicker({
    QuestionModel: { aggregate: createAggregateStub(docs) },
    store
  });

  const result = await picker.pick({
    userId: 'user-1',
    categoryId: '64b5fa2c8f8f0f0033333333',
    difficulty: 'easy',
    count: 1,
    sessionId: 'sess-1'
  });

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0]._id.toString(), otherId.toString());
  assert.strictEqual(store.recorded.length, 1);
  assert.strictEqual(store.recorded[0].questionId, otherId.toString());
});

test('QuestionPicker keeps diversity across buckets when possible', async () => {
  const docA = { _id: createObjectId('64b5fa2c8f8f0f0044444444'), lshBucket: 'bucket-a', usageCount: 0, lastServedAt: null, choices: ['a1'], correctAnswer: 'a1' };
  const docB = { _id: createObjectId('64b5fa2c8f8f0f0055555555'), lshBucket: 'bucket-b', usageCount: 1, lastServedAt: null, choices: ['b1'], correctAnswer: 'b1' };
  const docC = { _id: createObjectId('64b5fa2c8f8f0f0066666666'), lshBucket: 'bucket-b', usageCount: 2, lastServedAt: null, choices: ['b2'], correctAnswer: 'b2' };
  const docs = [docA, docB, docC];
  const store = new StoreStub();
  const picker = new QuestionPicker({ QuestionModel: { aggregate: createAggregateStub(docs) }, store });

  const result = await picker.pick({ userId: 'user-2', categoryId: '64b5fa2c8f8f0f0077777777', difficulty: 'medium', count: 2, sessionId: 'sess-2' });
  const ids = result.map((doc) => doc._id.toString());
  assert.ok(ids.includes(docA._id.toString()));
  assert.ok(ids.includes(docB._id.toString()));
  assert.ok(!ids.includes(docC._id.toString()));
});

test('QuestionPicker prioritises low usage and freshness', async () => {
  const now = Date.now();
  const oldDate = new Date(now - 45 * 24 * 60 * 60 * 1000);
  const recentDate = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const docFresh = { _id: createObjectId('64b5fa2c8f8f0f0088888888'), lshBucket: 'bucket-c', usageCount: 0, lastServedAt: oldDate, choices: ['f1'], correctAnswer: 'f1' };
  const docStale = { _id: createObjectId('64b5fa2c8f8f0f0099999999'), lshBucket: 'bucket-d', usageCount: 10, lastServedAt: recentDate, choices: ['s1'], correctAnswer: 's1' };
  const docs = [docStale, docFresh];
  const store = new StoreStub();
  const picker = new QuestionPicker({ QuestionModel: { aggregate: createAggregateStub(docs) }, store });

  const result = await picker.pick({ userId: 'user-3', categoryId: '64b5fa2c8f8f0f0010101010', difficulty: 'hard', count: 1, sessionId: 'sess-3' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0]._id.toString(), docFresh._id.toString());
});
