const test = require('node:test');
const assert = require('assert');

const {
  normalizeFaText,
  simhash64,
  simhashHamming,
  lshBucket
} = require('../src/utils/textFingerprint');

test('normalizeFaText trims, collapses and normalizes Persian characters', () => {
  const raw = '  <b>سلام</b>   دوست\u200cها\u00A0😊 123٤٥ ';
  const normalized = normalizeFaText(raw);
  assert.strictEqual(normalized, 'سلام دوست‌ها 12345');
});

test('simhash64 is stable across equivalent strings', () => {
  const base = 'این یک سوال نمونه است';
  const variant = 'اين يك سوال نمونه است';
  const normalizedBase = normalizeFaText(base);
  const normalizedVariant = normalizeFaText(variant);
  const hashA = simhash64(normalizedBase);
  const hashB = simhash64(normalizedVariant);
  assert.strictEqual(hashA.length, 16);
  assert.strictEqual(hashA, hashA.toLowerCase());
  const distance = simhashHamming(hashA, hashB);
  assert.ok(distance <= 3, `expected distance <= 3 but got ${distance}`);
});

test('lshBucket returns hex prefix of expected length', () => {
  const hash = simhash64('متن تستی برای سطل');
  const bucket12 = lshBucket(hash, 12);
  const bucket20 = lshBucket(hash, 20);
  assert.strictEqual(bucket12.length, 3);
  assert.ok(bucket20.length >= 5);
  assert.ok(bucket20.startsWith(bucket12));
});
