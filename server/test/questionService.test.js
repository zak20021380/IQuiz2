const test = require('node:test');
const assert = require('assert');

const mongoose = require('mongoose');

const Question = require('../src/models/Question');
const UserQuestionEvent = require('../src/models/UserQuestionEvent');
const QuestionService = require('../src/services/questionService');

function stubQuestionModel({ responses = [], total = 0 }) {
  const originalFind = Question.find;
  const originalCount = Question.countDocuments;
  const capturedLimits = [];
  const capturedQueries = [];
  let callIndex = 0;

  Question.countDocuments = async (query) => {
    return typeof total === 'function' ? total(query) : total;
  };

  function applyFilters(docs, query) {
    let result = Array.isArray(docs) ? [...docs] : [];
    if (query && query._id && query._id.$nin) {
      const blacklist = new Set(query._id.$nin.map((id) => String(id)));
      result = result.filter((doc) => !blacklist.has(String(doc._id)));
    }
    return result;
  }

  Question.find = (query) => {
    capturedQueries.push(query);
    const currentCall = callIndex;
    callIndex += 1;
    const docs = Array.isArray(responses[currentCall])
      ? responses[currentCall]
      : Array.isArray(responses[responses.length - 1])
        ? responses[responses.length - 1]
        : [];

    return {
      sort() { return this; },
      limit(value) { capturedLimits[currentCall] = value; return this; },
      select() { return this; },
      async lean() { return applyFilters(docs, query); }
    };
  };

  return {
    getLimit(call = 0) {
      return capturedLimits[call];
    },
    getLimits() {
      return capturedLimits;
    },
    getQueries() {
      return capturedQueries;
    },
    restore() {
      Question.find = originalFind;
      Question.countDocuments = originalCount;
    }
  };
}

function stubUserQuestionEvents({ docs = [] }) {
  const originalFind = UserQuestionEvent.find;
  const originalDistinct = UserQuestionEvent.distinct;

  UserQuestionEvent.find = () => ({
    sort() { return this; },
    limit() { return this; },
    select() { return this; },
    async lean() { return docs; }
  });

  UserQuestionEvent.distinct = async (field) => {
    if (field !== 'questionId') {
      return [];
    }
    return docs
      .map((doc) => doc?.questionId)
      .filter((value) => value);
  };

  return {
    restore() {
      UserQuestionEvent.find = originalFind;
      UserQuestionEvent.distinct = originalDistinct;
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
  const questionStub = stubQuestionModel({ responses: [docs], total: 400 });
  const historyStub = stubUserQuestionEvents({ docs: [] });

  try {
    const result = await QuestionService.getQuestions({ count: 100 });
    assert.strictEqual(result.countRequested, QuestionService.MAX_PER_REQUEST);
    assert.ok(result.ok);
    assert.ok(result.countReturned <= QuestionService.MAX_PER_REQUEST);
    assert.ok(questionStub.getLimit(0) <= QuestionService.MAX_PER_REQUEST * 3);
    assert.strictEqual(result.avoided, 0);
  } finally {
    questionStub.restore();
    historyStub.restore();
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

  const questionStub = stubQuestionModel({ responses: [docs], total: docs.length });
  const historyStub = stubUserQuestionEvents({ docs: [] });

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
    questionStub.restore();
    historyStub.restore();
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

  const questionStub = stubQuestionModel({ responses: [docs], total: 0 });
  const historyStub = stubUserQuestionEvents({ docs: [] });

  try {
    const result = await QuestionService.getQuestions({ count: 3 });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.countReturned, 0);
    assert.ok(typeof result.message === 'string' && result.message.length > 0);
  } finally {
    questionStub.restore();
    historyStub.restore();
  }
});

test('getQuestions avoids recently answered ids when available', async () => {
  const recentId = new mongoose.Types.ObjectId();
  const freshId = new mongoose.Types.ObjectId();

  const questionStub = stubQuestionModel({
    responses: [[
      { _id: recentId, text: 'Recent', options: ['a', 'b', 'c', 'd'], correctIndex: 0, categorySlug: 'general' },
      { _id: freshId, text: 'Fresh', options: ['a', 'b', 'c', 'd'], correctIndex: 1, categorySlug: 'general' }
    ]],
    total: 2
  });

  const historyStub = stubUserQuestionEvents({
    docs: [{ questionId: recentId }]
  });

  try {
    const result = await QuestionService.getQuestions({ count: 1, userId: 'user-1' });
    assert.ok(result.ok);
    assert.strictEqual(result.countReturned, 1);
    assert.strictEqual(result.items[0].id, String(freshId));
    assert.strictEqual(result.avoided, 1);
  } finally {
    questionStub.restore();
    historyStub.restore();
  }
});

test('previously seen ids can reappear after history expires', async () => {
  const reusedId = new mongoose.Types.ObjectId();

  const questionStub = stubQuestionModel({
    responses: [[
      { _id: reusedId, text: 'Repeatable', options: ['a', 'b', 'c', 'd'], correctIndex: 0, categorySlug: 'general' }
    ]],
    total: 1
  });

  const activeHistory = stubUserQuestionEvents({ docs: [{ questionId: reusedId }] });

  try {
    const first = await QuestionService.getQuestions({ count: 1, userId: 'user-2' });
    assert.ok(first.ok);
    assert.strictEqual(first.countReturned, 0);
    assert.deepStrictEqual(first.items, []);
    assert.strictEqual(first.avoided, 1);
    activeHistory.restore();

    const expiredHistory = stubUserQuestionEvents({ docs: [] });
    try {
      const second = await QuestionService.getQuestions({ count: 1, userId: 'user-2' });
      assert.ok(second.ok);
      assert.strictEqual(second.items[0].id, String(reusedId));
      assert.strictEqual(second.avoided, 0);
    } finally {
      expiredHistory.restore();
    }
  } finally {
    questionStub.restore();
  }
});
