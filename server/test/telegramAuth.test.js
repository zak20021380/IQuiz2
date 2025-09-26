const test = require('node:test');
const assert = require('assert');
const crypto = require('crypto');

const { verifyTelegramInitData, normalizeTelegramProfile } = require('../src/services/telegramAuth');

function createInitData(botToken, payload) {
  const params = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    params.append(key, value);
  });

  const pairs = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = pairs.map(([key, value]) => `${key}=${value}`).join('\n');
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

test('verifyTelegramInitData accepts valid signatures and normalization works', () => {
  const botToken = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
  const user = {
    id: 42,
    first_name: 'Jane',
    last_name: 'Doe',
    username: 'jane_doe',
    photo_url: 'https://t.me/i/userpic/42.jpg',
    language_code: 'en'
  };
  const payload = {
    auth_date: '1700000000',
    query_id: 'AAE123456789',
    user: JSON.stringify(user)
  };
  const initData = createInitData(botToken, payload);

  const verification = verifyTelegramInitData(initData, botToken);
  assert.ok(verification.ok, 'expected signature to be valid');
  assert.strictEqual(verification.payload.user, payload.user);

  const normalized = normalizeTelegramProfile(initData);
  assert.strictEqual(normalized.profile.telegramId, '42');
  assert.strictEqual(normalized.profile.telegramUsername, 'jane_doe');
  assert.strictEqual(normalized.profile.name, 'Jane Doe');
  assert.strictEqual(normalized.profile.avatar, 'https://t.me/i/userpic/42.jpg');
  assert.strictEqual(normalized.profile.languageCode, 'en');
  assert.ok(normalized.authDate instanceof Date);
});

test('verifyTelegramInitData rejects invalid signatures', () => {
  const botToken = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
  const payload = {
    auth_date: '1700000000',
    query_id: 'AAE123456789',
    user: JSON.stringify({ id: 1, first_name: 'Jane' })
  };
  const initData = createInitData(botToken, payload);
  const tampered = initData.replace(/hash=[^&]+/, 'hash=deadbeef');

  const verification = verifyTelegramInitData(tampered, botToken);
  assert.strictEqual(verification.ok, false);
  assert.strictEqual(verification.reason, 'SIGNATURE_MISMATCH');
});
