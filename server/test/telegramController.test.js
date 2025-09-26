const test = require('node:test');
const assert = require('assert');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
process.env.TELEGRAM_BOT_TOKEN = 'bot-token:test';

delete require.cache[require.resolve('../src/config/env')];
const env = require('../src/config/env');
const telegramController = require('../src/controllers/telegram.controller');
const User = require('../src/models/User');

function buildInitData(userPayload = {}) {
  const user = {
    id: 555,
    first_name: 'Alice',
    last_name: 'Example',
    username: 'alice_example',
    photo_url: 'https://t.me/i/userpic/555.jpg',
    ...userPayload
  };

  const params = new URLSearchParams();
  params.set('auth_date', '1700000500');
  params.set('query_id', 'AAE123456');
  params.set('user', JSON.stringify(user));

  const pairs = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = pairs.map(([key, value]) => `${key}=${value}`).join('\n');
  const secretKey = crypto.createHash('sha256').update(env.telegram.botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);

  return params.toString();
}

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

test('createSession creates a new Telegram user', async () => {
  const initData = buildInitData({ id: 1001, username: 'new_user' });
  const req = { body: { initData } };
  const res = createMockRes();

  const originalFindOne = User.findOne;
  const originalSave = User.prototype.save;
  const created = [];

  User.findOne = async () => null;
  User.prototype.save = async function saveStub() {
    created.push(this);
    return this;
  };

  try {
    await telegramController.createSession(req, res, (err) => { throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.ok);
    assert.strictEqual(res.body.isNew, true);
    assert.strictEqual(created.length, 1);
    assert.strictEqual(created[0].telegramId, '1001');
    assert.strictEqual(created[0].telegramUsername, 'new_user');

    const decoded = jwt.verify(res.body.token, env.jwt.secret);
    assert.strictEqual(String(decoded.id), String(created[0]._id));
    assert.strictEqual(res.body.user.telegramId, '1001');
    assert.strictEqual(res.body.user.telegramUsername, 'new_user');
  } finally {
    User.findOne = originalFindOne;
    User.prototype.save = originalSave;
  }
});

test('createSession updates existing Telegram user', async () => {
  const existing = new User({
    username: 'existing_user',
    name: 'Existing User',
    telegramId: '2002',
    telegramUsername: 'old_username',
    avatar: 'https://old.example/avatar.png'
  });
  existing.isNew = false;

  const initData = buildInitData({
    id: 2002,
    username: 'new_username',
    first_name: 'Updated',
    last_name: 'Name',
    photo_url: 'https://t.me/i/userpic/updated.jpg'
  });

  const req = { body: { initData } };
  const res = createMockRes();

  const originalFindOne = User.findOne;
  User.findOne = async () => existing;

  const saved = [];
  existing.save = async function saveStub() {
    saved.push({
      name: this.name,
      telegramUsername: this.telegramUsername,
      avatar: this.avatar
    });
    return this;
  };

  try {
    await telegramController.createSession(req, res, (err) => { throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.ok);
    assert.strictEqual(res.body.isNew, false);
    assert.strictEqual(saved.length, 1);
    assert.strictEqual(existing.name, 'Updated Name');
    assert.strictEqual(existing.telegramUsername, 'new_username');
    assert.strictEqual(existing.avatar, 'https://t.me/i/userpic/updated.jpg');
  } finally {
    User.findOne = originalFindOne;
  }
});

test('createSession rejects invalid signature', async () => {
  const initData = 'query_id=AAE123&user=%7B%22id%22%3A1%7D&hash=deadbeef';
  const req = { body: { initData } };
  const res = createMockRes();

  await telegramController.createSession(req, res, (err) => { throw err; });

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.ok, false);
});
