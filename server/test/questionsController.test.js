const test = require('node:test');
const assert = require('assert');

process.env.ALLOW_REVIEW_MODE_ALL = process.env.ALLOW_REVIEW_MODE_ALL ?? 'true';

const questionsController = require('../src/controllers/questions.controller');
const Question = require('../src/models/Question');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function stubQuestionModel({ docs = [], total = docs.length, pendingTotal = 0, aggregateResult = [] } = {}) {
  const originalFind = Question.find;
  const originalCountDocuments = Question.countDocuments;
  const originalAggregate = Question.aggregate;

  let capturedFindWhere = null;
  const capturedCounts = [];

  Question.find = (where = {}) => {
    capturedFindWhere = where;
    const chain = {
      populate() { return chain; },
      sort() { return chain; },
      skip() { return chain; },
      limit() { return chain; },
      lean() { return Promise.resolve(docs); }
    };
    return chain;
  };

  Question.countDocuments = (where = {}) => {
    capturedCounts.push(where);
    if (where && where.status === 'pending') {
      return Promise.resolve(pendingTotal);
    }
    return Promise.resolve(total);
  };

  Question.aggregate = () => Promise.resolve(aggregateResult);

  return {
    getFindWhere() {
      return capturedFindWhere;
    },
    getCountArgs() {
      return capturedCounts.slice();
    },
    restore() {
      Question.find = originalFind;
      Question.countDocuments = originalCountDocuments;
      Question.aggregate = originalAggregate;
    }
  };
}

test('list applies approved filter by default', async () => {
  const docs = [
    {
      _id: 'q1',
      text: 'نمونه سوال تاریخ ایران',
      options: ['گزینه ۱', 'گزینه ۲', 'گزینه ۳', 'گزینه ۴'],
      correctIdx: 1,
      status: 'approved',
      active: true
    }
  ];
  const stub = stubQuestionModel({ docs });

  const req = { query: {}, user: { role: 'admin' } };
  const res = createMockRes();

  try {
    await questionsController.list(req, res, () => { throw new Error('next should not be called'); });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body?.ok);
    const where = stub.getFindWhere();
    assert.ok(where);
    assert.deepStrictEqual(where.isApproved, { $ne: false });
    assert.ok(Array.isArray(res.body?.data));
    assert.strictEqual(res.body.data.length, 1);
    assert.deepStrictEqual(res.body.data[0].moderation, { status: 'approved', active: true });
  } finally {
    stub.restore();
  }
});

test('reviewMode=all returns mixed statuses without approval constraint', async () => {
  const docs = [
    {
      _id: 'q1',
      text: 'سوال تایید شده',
      options: ['الف', 'ب', 'پ', 'ت'],
      correctIdx: 0,
      status: 'approved',
      active: true
    },
    {
      _id: 'q2',
      text: 'سوال منتظر تایید',
      options: ['۱', '۲', '۳', '۴'],
      correctIdx: 2,
      status: 'pending',
      active: false
    }
  ];
  const stub = stubQuestionModel({ docs });

  const req = { query: { reviewMode: 'all' }, user: { role: 'admin' } };
  const res = createMockRes();

  try {
    await questionsController.list(req, res, () => { throw new Error('next should not be called'); });
    assert.strictEqual(res.statusCode, 200);
    const where = stub.getFindWhere();
    assert.ok(where);
    assert.ok(!('isApproved' in where));
    assert.strictEqual(res.body.data.length, 2);
    const statuses = res.body.data.map((item) => item?.moderation?.status).sort();
    assert.deepStrictEqual(statuses, ['approved', 'pending']);
  } finally {
    stub.restore();
  }
});

test('reviewMode=all is forbidden for non-admin users', async () => {
  const stub = stubQuestionModel({ docs: [] });

  const req = { query: { reviewMode: 'all' }, user: { role: 'editor' } };
  const res = createMockRes();

  try {
    await questionsController.list(req, res, () => { throw new Error('next should not be called'); });
    assert.strictEqual(res.statusCode, 403);
    assert.deepStrictEqual(res.body, { ok: false, message: 'Forbidden' });
    assert.strictEqual(stub.getFindWhere(), null);
  } finally {
    stub.restore();
  }
});

test('list filters out structurally invalid questions', async () => {
  const docs = [
    {
      _id: 'valid',
      text: 'پایتخت ایران چیست؟',
      options: ['تهران', 'اصفهان', 'شیراز', 'تبریز'],
      correctIdx: 0,
      status: 'approved',
      active: true
    },
    {
      _id: 'invalid-text',
      text: '   ',
      options: ['گزینه', 'دیگر'],
      correctIdx: 0,
      status: 'approved',
      active: true
    },
    {
      _id: 'invalid-options',
      text: 'سوال ناقص',
      options: ['فقط یک گزینه'],
      correctIdx: 0,
      status: 'approved',
      active: true
    },
    {
      _id: 'invalid-index',
      text: 'سوال با شاخص نادرست',
      options: ['گزینه ۱', 'گزینه ۲', 'گزینه ۳', 'گزینه ۴'],
      correctIdx: 7,
      status: 'approved',
      active: true
    }
  ];
  const stub = stubQuestionModel({ docs });

  const req = { query: { reviewMode: 'all' }, user: { role: 'admin' } };
  const res = createMockRes();

  try {
    await questionsController.list(req, res, () => { throw new Error('next should not be called'); });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0]._id, 'valid');
  } finally {
    stub.restore();
  }
});
