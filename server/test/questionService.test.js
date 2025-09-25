const test = require('node:test');
const assert = require('assert');

const Question = require('../src/models/Question');
const QuestionService = require('../src/services/questionService');

function stubQuestionModel({ docs = [], total = docs.length }) {
  const originalFind = Question.find;
  const originalCount = Question.countDocuments;
  let capturedLimit = null;

  Question.countDocuments = async () => total;
  Question.find = () => ({
    sort() { return this; },
    limit(value) { capturedLimit = value; return this; },
    lean: async () => docs
  });

  return {
    getLimit() {
      return capturedLimit;
    },
    restore() {
      Question.find = originalFind;
      Question.countDocuments = originalCount;
    }
  };
}

test('getQuestions enforces maximum per request', async () => {
  const docs = new Array(40).fill(null).map((_, index) => ({
    _id: `q-${index}`,
    text: `Question ${index}`,
    options: ['a', 'b', 'c', 'd'],
    correctIndex: index % 4,
    categorySlug: 'general'
  }));
  const stub = stubQuestionModel({ docs, total: 400 });

  try {
    const result = await QuestionService.getQuestions({ count: 100 });
    assert.strictEqual(result.countRequested, QuestionService.MAX_PER_REQUEST);
    assert.ok(result.ok);
    assert.ok(result.countReturned <= QuestionService.MAX_PER_REQUEST);
    assert.ok(stub.getLimit() <= QuestionService.MAX_PER_REQUEST * 3);
  } finally {
    stub.restore();
  }
});

test('getQuestions normalises and filters invalid documents', async () => {
  const docs = [
    {
      _id: 'valid',
      text: '   Capital of Iran?   ',
      choices: [' تهران ', 'اصفهان', 'شیراز', 'تبریز'],
      correctIdx: 0,
      categoryName: 'عمومی'
    },
    {
      _id: 'invalid',
      text: 'Too few options',
      options: ['one'],
      correctIndex: 0,
      categorySlug: 'general'
    },
    {
      _id: 'duplicate',
      text: 'Duplicate question',
      choices: ['a', 'b', 'c', 'd'],
      correctIndex: 1,
      categorySlug: 'general'
    },
    {
      _id: 'duplicate',
      text: 'Duplicate question copy',
      choices: ['a', 'b', 'c', 'd'],
      correctIndex: 1,
      categorySlug: 'general'
    }
  ];

  const stub = stubQuestionModel({ docs, total: docs.length });

  try {
    const result = await QuestionService.getQuestions({ count: 5 });
    assert.ok(result.ok);
    assert.strictEqual(result.countReturned, 2);
    const [first] = result.items;
    assert.deepStrictEqual(first.options, ['تهران', 'اصفهان', 'شیراز', 'تبریز']);
    assert.strictEqual(first.correctIndex, 0);
    assert.strictEqual(first.text, 'Capital of Iran?');
    assert.strictEqual(first.category, 'عمومی');
  } finally {
    stub.restore();
  }
});

test('getQuestions fails when no valid questions are available', async () => {
  const docs = [
    {
      _id: 'missing-options',
      text: 'Invalid question',
      options: ['only-one'],
      correctIndex: 0,
      categorySlug: 'general'
    }
  ];

  const stub = stubQuestionModel({ docs, total: 0 });

  try {
    const result = await QuestionService.getQuestions({ count: 3 });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.countReturned, 0);
    assert.ok(typeof result.message === 'string' && result.message.length > 0);
  } finally {
    stub.restore();
  }
});
