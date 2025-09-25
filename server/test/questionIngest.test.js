const test = require('node:test');
const assert = require('assert');

const { evaluateDuplicate } = require('../src/services/questionIngest');
const { normalizeFaText, simhash64, lshBucket } = require('../src/utils/textFingerprint');

function createStubQuestionModel(docs) {
  return {
    findOne(filter) {
      if (!filter || !filter.sha1Canonical) {
        return { select: () => ({ lean: async () => null }) };
      }
      const found = docs.find((doc) => doc.sha1Canonical === filter.sha1Canonical);
      return {
        select() {
          return {
            lean: async () => (found ? { _id: found._id } : null)
          };
        }
      };
    },
    find(filter) {
      const bucket = filter?.lshBucket;
      const results = docs.filter((doc) => !bucket || doc.lshBucket === bucket).map((doc) => ({
        _id: doc._id,
        simhash64: doc.simhash64
      }));
      const chain = {
        select() {
          return chain;
        },
        limit() {
          return chain;
        },
        async lean() {
          return results;
        }
      };
      return chain;
    }
  };
}

test('evaluateDuplicate rejects exact duplicates', async () => {
  const text = 'این سوال تکراری است؟';
  const normalized = normalizeFaText(text);
  const sha1 = require('crypto').createHash('sha1').update(normalized).digest('hex');
  const model = createStubQuestionModel([
    { _id: 'q1', sha1Canonical: sha1, simhash64: simhash64(normalized), lshBucket: lshBucket(simhash64(normalized), 12) }
  ]);

  const result = await evaluateDuplicate({ text }, { QuestionModel: model });
  assert.strictEqual(result.action, 'reject');
  assert.strictEqual(result.code, 'DUPLICATE_EXACT');
  assert.strictEqual(result.statusCode, 409);
});

test('evaluateDuplicate flags near duplicates for review', async () => {
  const near = normalizeFaText('نمونه سوال تاریخ ایران باستان؟');
  const nearSimhash = simhash64(near);
  const model = createStubQuestionModel([
    { _id: 'qBase', sha1Canonical: 'abc', simhash64: nearSimhash, lshBucket: lshBucket(nearSimhash, 12) }
  ]);

  const result = await evaluateDuplicate({ text: near }, { QuestionModel: model });
  assert.strictEqual(result.action, 'review');
  assert.strictEqual(result.code, 'DUPLICATE_NEAR');
  assert.strictEqual(result.statusCode, 202);
  assert.ok(result.duplicateId);
});

test('evaluateDuplicate allows distinct questions', async () => {
  const model = createStubQuestionModel([]);
  const result = await evaluateDuplicate({ text: 'سوال کاملاً متفاوت درباره جغرافیا' }, { QuestionModel: model });
  assert.strictEqual(result.action, 'allow');
  assert.strictEqual(result.statusCode, 201);
  assert.ok(result.fingerprints.sha1);
});
