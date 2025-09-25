const mongoose = require('mongoose');
const Question = require('../models/Question');
const questionConfig = require('../config/questions');
const { createRecentQuestionStore } = require('./recentQuestionStore');

function normalizeCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 10;
  return Math.min(Math.max(parsed, 1), 50);
}

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
}

class QuestionPicker {
  constructor({ QuestionModel = Question, store } = {}) {
    this.QuestionModel = QuestionModel;
    this.store = store || createRecentQuestionStore();
  }

  getStore() {
    return this.store;
  }

  async getRecentIds(userId, categoryId) {
    if (!userId || !categoryId) return [];
    try {
      return await this.store.getRecentIds(userId, categoryId, questionConfig.RECENT_KEEP);
    } catch (error) {
      return [];
    }
  }

  async maybeLockQuestion({ userId, sessionId, questionId }) {
    if (!questionId) return false;
    if (sessionId && userId) {
      const inSession = await this.store.isInSession(userId, sessionId, questionId);
      if (inSession) {
        return false;
      }
    }
    if (userId) {
      const locked = await this.store.acquireServeLock(userId, questionId, 5);
      if (!locked) return false;
    }
    return true;
  }

  computeScore(doc, { hotBuckets }) {
    const usageCount = Number(doc.usageCount || 0);
    const lastServedAt = doc.lastServedAt ? new Date(doc.lastServedAt).getTime() : null;
    const nowTs = Date.now();
    const days = lastServedAt ? Math.max((nowTs - lastServedAt) / 86400000, 0) : 999;
    const freshness = 1 - Math.exp(-days / 14);
    const noveltyPenalty = hotBuckets.get(doc.lshBucket) ? questionConfig.penalties.novelty : 0;
    const score = 0.55 * (1 / (1 + usageCount)) + 0.4 * freshness + noveltyPenalty;
    return { score, freshness, usageCount, noveltyPenalty };
  }

  async pick({ userId, categoryId, difficulty, count = 10, sessionId }) {
    const sanitizedCount = normalizeCount(count);
    const recentIds = await this.getRecentIds(userId, categoryId);
    const excludeIds = recentIds
      .map((id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id))
      .filter(Boolean);

    const matchStage = {
      active: true,
      $or: [{ status: { $exists: false } }, { status: 'approved' }]
    };

    const categoryObjectId = toObjectId(categoryId);
    if (categoryObjectId) {
      matchStage.category = categoryObjectId;
    } else if (categoryId) {
      matchStage.category = categoryId;
    }
    if (difficulty) {
      matchStage.difficulty = difficulty;
    }
    if (excludeIds.length) {
      matchStage._id = { $nin: excludeIds };
    }

    const sampleSize = sanitizedCount * questionConfig.CANDIDATE_MULTIPLIER;
    const pipeline = [
      { $match: matchStage },
      { $sample: { size: sampleSize } },
      {
        $project: {
          text: 1,
          options: '$choices',
          choices: '$choices',
          correctAnswer: 1,
          usageCount: 1,
          lastServedAt: 1,
          lshBucket: 1,
          category: 1,
          difficulty: 1,
          sha1Canonical: 1,
          simhash64: 1
        }
      }
    ];

    let candidates = [];
    try {
      candidates = await this.QuestionModel.aggregate(pipeline);
    } catch (error) {
      return [];
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return [];
    }

    const buckets = candidates.map((doc) => doc.lshBucket).filter(Boolean);
    const hotBuckets = await this.store.getBucketsHotness(buckets);
    const scored = candidates.map((doc) => {
      const { score } = this.computeScore(doc, { hotBuckets });
      return {
        doc,
        score,
        bucket: doc.lshBucket || `bucket:${String(doc._id)}`
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const primary = [];
    const fallback = [];
    const usedBuckets = new Set();

    for (const item of scored) {
      if (primary.length >= sanitizedCount) {
        fallback.push(item);
        continue;
      }
      if (!usedBuckets.has(item.bucket)) {
        primary.push(item);
        usedBuckets.add(item.bucket);
      } else {
        fallback.push(item);
      }
    }

    const selection = [];
    const seenIds = new Set();

    const attemptAdd = async (item) => {
      const docId = item.doc && item.doc._id ? String(item.doc._id) : null;
      if (!docId || seenIds.has(docId)) return false;
      const allowed = await this.maybeLockQuestion({ userId, sessionId, questionId: docId });
      if (!allowed) return false;
      selection.push(item.doc);
      seenIds.add(docId);
      return true;
    };

    for (const item of primary) {
      if (selection.length >= sanitizedCount) break;
      // eslint-disable-next-line no-await-in-loop
      await attemptAdd(item);
    }

    if (selection.length < sanitizedCount) {
      for (const item of fallback) {
        if (selection.length >= sanitizedCount) break;
        // eslint-disable-next-line no-await-in-loop
        await attemptAdd(item);
      }
    }

    if (selection.length === 0) {
      return [];
    }

    if (userId && categoryId) {
      await Promise.all(
        selection.map((doc) =>
          this.store.recordServe({
            userId,
            categoryId,
            questionId: doc._id ? String(doc._id) : doc.id,
            bucket: doc.lshBucket || null,
            sessionId,
            timestamp: Date.now()
          })
        )
      );
    }

    return selection.slice(0, sanitizedCount);
  }
}

const defaultPicker = new QuestionPicker();

module.exports = defaultPicker;
module.exports.QuestionPicker = QuestionPicker;
