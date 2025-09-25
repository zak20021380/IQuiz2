const Question = require('../models/Question');
const questionConfig = require('../config/questions');
const {
  normalizeFaText,
  sha1Canonical,
  simhash64,
  simhashHamming,
  lshBucket
} = require('../utils/textFingerprint');

const MAX_NEAR_DUPLICATE_CANDIDATES = 200;

function buildFingerprints(text) {
  const normalized = normalizeFaText(text);
  const sha1 = sha1Canonical(normalized);
  const simhash = simhash64(normalized);
  const bucket = lshBucket(simhash, questionConfig.LSH_PREFIX_BITS);
  return { normalized, sha1, simhash, bucket };
}

async function evaluateDuplicate({ text }, { QuestionModel = Question } = {}) {
  if (!text) {
    return {
      action: 'reject',
      statusCode: 400,
      code: 'INVALID_TEXT',
      message: 'Question text is required'
    };
  }

  const fingerprints = buildFingerprints(text);
  const { sha1, simhash, bucket } = fingerprints;

  if (sha1) {
    const existing = await QuestionModel.findOne({ sha1Canonical: sha1 }).select({ _id: 1 }).lean();
    if (existing) {
      return {
        action: 'reject',
        statusCode: 409,
        code: 'DUPLICATE_EXACT',
        message: 'An identical question already exists',
        fingerprints,
        duplicateId: String(existing._id)
      };
    }
  }

  if (bucket) {
    const candidates = await QuestionModel.find({ lshBucket: bucket })
      .select({ _id: 1, simhash64: 1 })
      .limit(MAX_NEAR_DUPLICATE_CANDIDATES)
      .lean();

    const suspect = candidates.find((candidate) => {
      if (!candidate?.simhash64) return false;
      const distance = simhashHamming(simhash, candidate.simhash64);
      return Number.isFinite(distance) && distance <= questionConfig.SIMHASH_HAMMING_NEAR;
    });

    if (suspect) {
      return {
        action: 'review',
        statusCode: 202,
        code: 'DUPLICATE_NEAR',
        message: 'Question is similar to an existing item and requires review',
        fingerprints,
        duplicateId: String(suspect._id)
      };
    }
  }

  return {
    action: 'allow',
    statusCode: 201,
    code: 'OK',
    message: 'Question accepted',
    fingerprints
  };
}

module.exports = {
  buildFingerprints,
  evaluateDuplicate
};
