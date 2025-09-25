const crypto = require('crypto');

const FNV_OFFSET_BASIS_64 = BigInt('0xcbf29ce484222325');
const FNV_PRIME_64 = BigInt('0x100000001b3');
const TOTAL_SIMHASH_BITS = 64;

const ARABIC_CHAR_MAP = new Map([
  ['ي', 'ی'],
  ['ى', 'ی'],
  ['ئ', 'ی'],
  ['ك', 'ک'],
  ['ؤ', 'و'],
  ['ۀ', 'ه']
]);

const DIGIT_MAP = new Map([
  ['۰', '0'], ['۱', '1'], ['۲', '2'], ['۳', '3'], ['۴', '4'],
  ['۵', '5'], ['۶', '6'], ['۷', '7'], ['۸', '8'], ['۹', '9'],
  ['٠', '0'], ['١', '1'], ['٢', '2'], ['٣', '3'], ['٤', '4'],
  ['٥', '5'], ['٦', '6'], ['٧', '7'], ['٨', '8'], ['٩', '9']
]);

const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu;
const HTML_TAG_REGEX = /<[^>]+>/g;

function normalizeFaText(input) {
  if (input === undefined || input === null) return '';
  let value = String(input);
  value = value.replace(HTML_TAG_REGEX, ' ');
  value = value.normalize('NFKC');

  let normalized = '';
  for (const char of value) {
    EMOJI_REGEX.lastIndex = 0;
    if (EMOJI_REGEX.test(char)) {
      continue;
    }
    const mapped = ARABIC_CHAR_MAP.get(char) || DIGIT_MAP.get(char) || char;
    normalized += mapped;
  }

  normalized = normalized
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[A-Z]/g, (c) => c.toLowerCase());

  return normalized;
}

function sha1Canonical(textNormalized) {
  const payload = typeof textNormalized === 'string' ? textNormalized : normalizeFaText(textNormalized);
  return crypto.createHash('sha1').update(payload).digest('hex');
}

function fnv1a64(str) {
  let hash = FNV_OFFSET_BASIS_64;
  for (const char of str) {
    const codePoint = char.codePointAt(0);
    hash ^= BigInt(codePoint);
    hash = (hash * FNV_PRIME_64) & BigInt('0xFFFFFFFFFFFFFFFF');
  }
  return hash;
}

function build3Grams(text) {
  const grams = [];
  if (!text) return grams;
  const padded = ` ${text} `;
  for (let i = 0; i <= padded.length - 3; i += 1) {
    grams.push(padded.slice(i, i + 3));
  }
  return grams;
}

function simhash64(textNormalized) {
  const normalized = typeof textNormalized === 'string' ? textNormalized : normalizeFaText(textNormalized);
  const grams = build3Grams(normalized);
  if (!grams.length) {
    return '0'.repeat(16);
  }

  const vector = new Array(TOTAL_SIMHASH_BITS).fill(0);
  grams.forEach((gram) => {
    const hash = fnv1a64(gram);
    for (let bit = 0; bit < TOTAL_SIMHASH_BITS; bit += 1) {
      const mask = 1n << BigInt(bit);
      if ((hash & mask) !== 0n) {
        vector[bit] += 1;
      } else {
        vector[bit] -= 1;
      }
    }
  });

  let result = 0n;
  for (let bit = 0; bit < TOTAL_SIMHASH_BITS; bit += 1) {
    if (vector[bit] >= 0) {
      result |= 1n << BigInt(bit);
    }
  }

  const hex = result.toString(16).padStart(TOTAL_SIMHASH_BITS / 4, '0');
  return hex;
}

function parseSimhash(value) {
  if (value === undefined || value === null) return 0n;
  const normalized = String(value).trim();
  if (!normalized) return 0n;
  if (/^[0-9a-fA-F]+$/.test(normalized)) {
    return BigInt(`0x${normalized}`);
  }
  try {
    const buffer = Buffer.from(normalized, 'base64');
    if (buffer.length >= 8) {
      let hash = 0n;
      for (const byte of buffer.subarray(0, 8)) {
        hash = (hash << 8n) | BigInt(byte);
      }
      return hash;
    }
  } catch (error) {
    // ignore decode errors
  }
  return 0n;
}

function simhashHamming(a, b) {
  const aValue = parseSimhash(a);
  const bValue = parseSimhash(b);
  let diff = aValue ^ bValue;
  let count = 0;
  while (diff) {
    diff &= diff - 1n;
    count += 1;
  }
  return count;
}

function lshBucket(simhash, prefixBits = 12) {
  const hashValue = parseSimhash(simhash);
  const bits = Math.min(Math.max(prefixBits, 1), TOTAL_SIMHASH_BITS);
  const shift = TOTAL_SIMHASH_BITS - bits;
  const masked = hashValue >> BigInt(shift);
  const digits = Math.ceil(bits / 4);
  return masked.toString(16).padStart(digits, '0');
}

module.exports = {
  normalizeFaText,
  sha1Canonical,
  simhash64,
  simhashHamming,
  lshBucket,
  // exported for tests
  __private: {
    fnv1a64,
    build3Grams,
    parseSimhash
  }
};
