const test = require('node:test');
const assert = require('assert');

const walletController = require('../src/controllers/wallet.controller');
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

test('getWalletBalance returns coins for the authenticated user', async () => {
  const stub = mockFindById({ _id: 'user-1', coins: 275, keys: 12 });

  const req = { user: { _id: 'user-1' } };
  const res = createMockRes();

  try {
    await walletController.getWalletBalance(req, res, (err) => { throw err || new Error('next should not be called'); });

    assert.strictEqual(stub.getCapturedId(), 'user-1');
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, { ok: true, data: { coins: 275, keys: 12 } });
  } finally {
    stub.restore();
  }
});

test('getWalletBalance returns 404 when user is missing', async () => {
  const stub = mockFindById(null);

  const req = { user: { _id: 'missing-user' } };
  const res = createMockRes();

  try {
    await walletController.getWalletBalance(req, res, (err) => { throw err || new Error('next should not be called'); });

    assert.strictEqual(res.statusCode, 404);
    assert.deepStrictEqual(res.body, { ok: false, message: 'User not found' });
  } finally {
    stub.restore();
  }
});

test('getWalletBalance returns 401 when request has no user context', async () => {
  const res = createMockRes();

  await walletController.getWalletBalance({}, res, (err) => { throw err || new Error('next should not be called'); });

  assert.strictEqual(res.statusCode, 401);
  assert.deepStrictEqual(res.body, { ok: false, message: 'Unauthorized' });
});
