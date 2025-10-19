const test = require('node:test');
const assert = require('assert');

const mongoose = require('mongoose');

const UserQuestionEvent = require('../src/models/UserQuestionEvent');
const { recordAnswerEvent } = require('../src/controllers/answers');

test('recordAnswerEvent stores events and ignores duplicates', async () => {
  const originalUpdateOne = UserQuestionEvent.updateOne;
  const updates = [];

  UserQuestionEvent.updateOne = async (filter, update, options) => {
    updates.push({ filter, update, options });
    if (updates.length === 1) {
      return { acknowledged: true, upsertedCount: 1, matchedCount: 0, modifiedCount: 0 };
    }
    const error = new Error('duplicate');
    error.code = 11000;
    throw error;
  };

  try {
    const questionId = new mongoose.Types.ObjectId();
    const firstUser = new mongoose.Types.ObjectId();
    const first = await recordAnswerEvent({ userId: firstUser, questionId });
    const second = await recordAnswerEvent({ userId: new mongoose.Types.ObjectId(), questionId });

    assert.strictEqual(first, true);
    assert.strictEqual(second, false);
    assert.strictEqual(updates.length, 2);
    assert.ok(updates[0].update.$set.answeredAt instanceof Date);
    assert.strictEqual(typeof updates[0].update.$setOnInsert.userId, 'string');
    assert.deepStrictEqual(updates[0].options, { upsert: true, setDefaultsOnInsert: true });
    assert.ok(updates[0].filter.questionId instanceof mongoose.Types.ObjectId);
  } finally {
    UserQuestionEvent.updateOne = originalUpdateOne;
  }
});
