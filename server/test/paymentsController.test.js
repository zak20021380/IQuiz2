const test = require('node:test');
const assert = require('assert');

const paymentsController = require('../src/controllers/payments.controller');
const Payment = require('../src/models/Payment');
const { findCoinPackage, findVipTier } = require('../src/services/shopConfig');

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

test('createInternalPayment awards coins and records payment', async () => {
  const originalFindOne = Payment.findOne;
  const originalCreate = Payment.create;

  let capturedQuery = null;
  let createdRecord = null;

  Payment.findOne = async (query) => {
    capturedQuery = query;
    return null;
  };

  Payment.create = async (data) => {
    createdRecord = data;
    return { ...data, _id: 'txn_coins_success' };
  };

  const pkg = findCoinPackage('c100');
  assert.ok(pkg, 'expected fallback package to exist');
  const expectedCoins = pkg.amount + Math.floor((pkg.amount * (pkg.bonus || 0)) / 100);

  const user = {
    _id: 'user1',
    coins: 10,
    saveCalled: false,
    async save() {
      this.saveCalled = true;
    }
  };

  const req = {
    body: { idempotencyKey: 'idem-1', type: 'coins', packageId: pkg.id },
    user,
  };
  const res = createMockRes();

  try {
    await paymentsController.createInternalPayment(req, res, () => {
      throw new Error('next should not be called');
    });
  } finally {
    Payment.findOne = originalFindOne;
    Payment.create = originalCreate;
  }

  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body?.ok);
  assert.strictEqual(res.body.data?.txnId, 'txn_coins_success');
  assert.strictEqual(res.body.data?.wallet?.coins, 10 + expectedCoins);
  assert.strictEqual(user.coins, 10 + expectedCoins);
  assert.ok(user.saveCalled, 'user.save should be called');
  assert.deepStrictEqual(capturedQuery, { idempotencyKey: 'idem-1' });
  assert.ok(createdRecord);
  assert.strictEqual(createdRecord.type, 'coins');
  assert.strictEqual(createdRecord.walletBalanceAfter, 10 + expectedCoins);
  assert.strictEqual(createdRecord.totalCoins, expectedCoins);
  assert.strictEqual(createdRecord.status, 'paid');
});

test('createInternalPayment returns existing txn id when already paid', async () => {
  const originalFindOne = Payment.findOne;
  const originalCreate = Payment.create;

  Payment.findOne = async () => ({ _id: 'existing-txn', status: 'paid' });
  Payment.create = async () => {
    throw new Error('create should not be called when idempotent payment exists');
  };

  const user = {
    _id: 'user2',
    coins: 0,
    async save() {
      throw new Error('save should not be called');
    }
  };

  const req = {
    body: { idempotencyKey: 'idem-2', type: 'coins', packageId: 'c100' },
    user,
  };
  const res = createMockRes();

  try {
    await paymentsController.createInternalPayment(req, res, () => {
      throw new Error('next should not be called');
    });
  } finally {
    Payment.findOne = originalFindOne;
    Payment.create = originalCreate;
  }

  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body?.ok);
  assert.strictEqual(res.body.data?.txnId, 'existing-txn');
});

test('createInternalPayment blocks in-progress payment when status is not paid', async () => {
  const originalFindOne = Payment.findOne;
  const originalCreate = Payment.create;

  Payment.findOne = async () => ({ _id: 'existing-txn', status: 'pending' });
  Payment.create = async () => {
    throw new Error('create should not run');
  };

  const req = {
    body: { idempotencyKey: 'idem-3', type: 'coins', packageId: 'c100' },
    user: { _id: 'user3', coins: 0 },
  };
  const res = createMockRes();

  try {
    await paymentsController.createInternalPayment(req, res, () => {
      throw new Error('next should not be called');
    });
  } finally {
    Payment.findOne = originalFindOne;
    Payment.create = originalCreate;
  }

  assert.strictEqual(res.statusCode, 409);
  assert.deepStrictEqual(res.body, { ok: false, error: 'payment_in_progress', status: 'pending' });
});

test('createInternalPayment validates type input', async () => {
  const req = {
    body: { idempotencyKey: 'idem-4', type: 'gems' },
    user: { _id: 'user4', coins: 0 },
  };
  const res = createMockRes();

  await paymentsController.createInternalPayment(req, res, () => {
    throw new Error('next should not be called');
  });

  assert.strictEqual(res.statusCode, 400);
  assert.deepStrictEqual(res.body, { ok: false, error: 'invalid_payment_type' });
});

test('createInternalPayment activates VIP subscription and records payment', async () => {
  const originalFindOne = Payment.findOne;
  const originalCreate = Payment.create;

  let createdRecord = null;
  Payment.findOne = async () => null;
  Payment.create = async (data) => {
    createdRecord = data;
    return { ...data, _id: 'txn_vip_success' };
  };

  const vipTier = findVipTier('lite');
  assert.ok(vipTier, 'expected lite tier to be defined in fallback config');

  const currentExpiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const user = {
    _id: 'user5',
    role: 'user',
    subscription: { active: false, expiry: currentExpiry },
    saveCalled: false,
    async save() {
      this.saveCalled = true;
    }
  };

  const req = {
    body: { idempotencyKey: 'idem-5', type: 'vip', tier: 'lite' },
    user,
  };
  const res = createMockRes();

  try {
    await paymentsController.createInternalPayment(req, res, () => {
      throw new Error('next should not be called');
    });
  } finally {
    Payment.findOne = originalFindOne;
    Payment.create = originalCreate;
  }

  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body?.ok);
  assert.strictEqual(res.body.data?.txnId, 'txn_vip_success');
  assert.ok(res.body.data?.subscription?.active);
  assert.strictEqual(res.body.data.subscription.tier, vipTier.tier);
  assert.ok(res.body.data.subscription.expiry);
  assert.strictEqual(user.role, 'vip');
  assert.ok(user.subscription.active);
  assert.strictEqual(user.subscription.tier, vipTier.tier);
  assert.strictEqual(user.subscription.plan, vipTier.id);
  assert.ok(user.subscription.expiry instanceof Date);
  const expectedExpiryMs = currentExpiry.getTime() + vipTier.durationDays * 24 * 60 * 60 * 1000;
  assert.ok(Math.abs(user.subscription.expiry.getTime() - expectedExpiryMs) < 1000);
  assert.strictEqual(user.subscription.lastTransaction, 'txn_vip_success');
  assert.ok(user.saveCalled, 'user.save should be invoked for vip purchase');
  assert.ok(createdRecord);
  assert.strictEqual(createdRecord.type, 'vip');
  assert.strictEqual(createdRecord.metadata?.tier, vipTier.tier);
});

test('createInternalPayment rejects missing package for coins', async () => {
  const originalFindOne = Payment.findOne;
  Payment.findOne = async () => null;
  const req = {
    body: { idempotencyKey: 'idem-6', type: 'coins' },
    user: { _id: 'user6', coins: 0 },
  };
  const res = createMockRes();

  try {
    await paymentsController.createInternalPayment(req, res, () => {
      throw new Error('next should not be called');
    });
  } finally {
    Payment.findOne = originalFindOne;
  }

  assert.strictEqual(res.statusCode, 400);
  assert.deepStrictEqual(res.body, { ok: false, error: 'missing_package_id' });
});

test('createInternalPayment validates vip tier input', async () => {
  const originalFindOne = Payment.findOne;
  Payment.findOne = async () => null;
  try {
    const missingTierReq = {
      body: { idempotencyKey: 'idem-7', type: 'vip' },
      user: { _id: 'user7', subscription: {}, role: 'user', async save() {} },
    };
    const missingTierRes = createMockRes();
    await paymentsController.createInternalPayment(missingTierReq, missingTierRes, () => {
      throw new Error('next should not be called');
    });
    assert.strictEqual(missingTierRes.statusCode, 400);
    assert.deepStrictEqual(missingTierRes.body, { ok: false, error: 'missing_vip_tier' });

    const res = createMockRes();
    await paymentsController.createInternalPayment({
      body: { idempotencyKey: 'idem-8', type: 'vip', tier: 'unknown' },
      user: { _id: 'user8', subscription: {}, role: 'user', async save() {} },
    }, res, () => {
      throw new Error('next should not be called');
    });

    assert.strictEqual(res.statusCode, 404);
    assert.deepStrictEqual(res.body, { ok: false, error: 'vip_tier_not_found' });
  } finally {
    Payment.findOne = originalFindOne;
  }
});
