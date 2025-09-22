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

module.exports = {
  canonicalizeQuestion,
  createQuestionUid,
};
