const crypto = require('crypto');

function canonicalizeQuestion(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u200c\u200f\u202a-\u202e]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function createQuestionUid(question) {
  const canonical = canonicalizeQuestion(question);
  if (!canonical) {
    return '';
  }
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function createQuestionPublicId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  if (typeof crypto.randomUUID === 'function') {
    const uuid = crypto.randomUUID().replace(/-/g, '').toUpperCase();
    return `Q${timestamp.slice(-4)}${uuid.slice(0, 12)}`;
  }
  const randomBytes = crypto.randomBytes(9).toString('hex').toUpperCase();
  return `Q${timestamp.slice(-4)}${randomBytes.slice(0, 12)}`;
}

module.exports = {
  canonicalizeQuestion,
  createQuestionUid,
  createQuestionPublicId,
};
