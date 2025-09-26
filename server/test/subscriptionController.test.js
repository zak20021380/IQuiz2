const test = require('node:test');
const assert = require('assert');

const subscriptionController = require('../src/controllers/subscription.controller');
const User = require('../src/models/User');

function createMockRes() {
  return {
    statusCode: 200,
    body: undefined,
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

function mockFindById(result) {
  const original = User.findById;
  let capturedId = null;

  User.findById = (id) => {
    capturedId = id;
    return {
      select() { return this; },
      lean() { return Promise.resolve(typeof result === 'function' ? result(id) : result); }
    };
  };

  return {
    getCapturedId() {
      return capturedId;
    },
    restore() {
      User.findById = original;
    }
  };
}

test('getSubscriptionStatus returns stored subscription details', async () => {
  const expiry = new Date('2030-01-01T00:00:00.000Z');
  const stub = mockFindById({
    _id: 'user-2',
    subscription: {
      active: true,
      plan: 'vip-monthly',
      tier: 'gold',
      expiry,
      autoRenew: true
    }
  });

  const req = { user: { _id: 'user-2' } };
  const res = createMockRes();

  try {
    await subscriptionController.getSubscriptionStatus(req, res, (err) => { throw err || new Error('next should not be called'); });

    assert.strictEqual(stub.getCapturedId(), 'user-2');
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, {
      ok: true,
      data: {
        active: true,
        plan: 'vip-monthly',
        tier: 'gold',
        expiry: expiry.toISOString(),
        autoRenew: true
      }
    });
  } finally {
    stub.restore();
  }
});

test('getSubscriptionStatus returns defaults when subscription is inactive', async () => {
  const stub = mockFindById({
    _id: 'user-3',
    subscription: {
      active: false
    }
  });

  const req = { user: { _id: 'user-3' } };
  const res = createMockRes();

  try {
    await subscriptionController.getSubscriptionStatus(req, res, (err) => { throw err || new Error('next should not be called'); });

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, {
      ok: true,
      data: {
        active: false,
        plan: null,
        tier: null,
        expiry: null,
        autoRenew: false
      }
    });
  } finally {
    stub.restore();
  }
});

test('getSubscriptionStatus returns 404 for unknown user', async () => {
  const stub = mockFindById(null);

  const req = { user: { _id: 'missing-user' } };
  const res = createMockRes();

  try {
    await subscriptionController.getSubscriptionStatus(req, res, (err) => { throw err || new Error('next should not be called'); });

    assert.strictEqual(res.statusCode, 404);
    assert.deepStrictEqual(res.body, { ok: false, message: 'User not found' });
  } finally {
    stub.restore();
  }
});

test('getSubscriptionStatus returns 401 when request has no user context', async () => {
  const res = createMockRes();

  await subscriptionController.getSubscriptionStatus({}, res, (err) => { throw err || new Error('next should not be called'); });

  assert.strictEqual(res.statusCode, 401);
  assert.deepStrictEqual(res.body, { ok: false, message: 'Unauthorized' });
});
