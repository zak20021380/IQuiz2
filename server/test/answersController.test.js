const test = require('node:test');
const assert = require('assert');

const mongoose = require('mongoose');

const UserQuestionEvent = require('../src/models/UserQuestionEvent');
const { recordAnswerEvent } = require('../src/controllers/answers');

test('recordAnswerEvent stores events and ignores duplicates', async () => {
  const originalCreate = UserQuestionEvent.create;
  const created = [];

  UserQuestionEvent.create = async (payload) => {
    created.push(payload);
    if (created.length === 1) {
      return payload;
    }
    const error = new Error('duplicate');
    error.code = 11000;
    throw error;
  };

  try {
    const questionId = new mongoose.Types.ObjectId();
    const first = await recordAnswerEvent({ userId: new mongoose.Types.ObjectId(), questionId });
    const second = await recordAnswerEvent({ userId: new mongoose.Types.ObjectId(), questionId });

    assert.strictEqual(first, true);
    assert.strictEqual(second, false);
    assert.strictEqual(created.length, 2);
    assert.ok(created[0].answeredAt instanceof Date);
    assert.ok(typeof created[0].userId === 'string');
  } finally {
    UserQuestionEvent.create = originalCreate;
  }
});
