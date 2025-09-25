const config = require('../config/questions');

function now() {
  return Date.now();
}

function toDayKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

class InMemoryRecentStore {
  constructor(options = {}) {
    this.recentLimit = options.recentLimit || config.RECENT_KEEP;
    this.sessionTtlMs = (options.sessionTtlSeconds || config.SESSION_TTL_SECONDS) * 1000;
    this.serveLogTtlMs = (options.serveLogTtlSeconds || config.SERVE_LOG_TTL_SECONDS) * 1000;
    this.hotBucketThreshold = options.hotBucketThreshold || config.HOT_BUCKET_THRESHOLD;
    this.penaltyEnabled = options.hotBucketPenalty ?? config.features.hotBucketPenalty;

    this.recent = new Map(); // key -> [{ id, ts }]
    this.sessions = new Map(); // key -> { expiresAt, ids: Set }
    this.locks = new Map(); // key -> expiresAt
    this.bucketCounts = new Map(); // bucket -> Map(dayKey -> count)
    this.serveLogs = new Map(); // userId -> [{ ts, qid }]
  }

  keyRecent(userId, categoryId) {
    if (!userId || !categoryId) return null;
    return `recent:${userId}:${categoryId}`;
  }

  keySession(userId, sessionId) {
    if (!userId || !sessionId) return null;
    return `session:${userId}:${sessionId}`;
  }

  keyLock(userId, questionId) {
    if (!userId || !questionId) return null;
    return `lock:${userId}:${questionId}`;
  }

  pruneRecent(list) {
    if (!Array.isArray(list)) return [];
    const sorted = [...list].sort((a, b) => b.ts - a.ts);
    return sorted.slice(0, this.recentLimit);
  }

  pruneSessions() {
    const nowTs = now();
    for (const [key, value] of this.sessions.entries()) {
      if (!value || value.expiresAt <= nowTs) {
        this.sessions.delete(key);
      }
    }
  }

  pruneLocks() {
    const nowTs = now();
    for (const [key, expiresAt] of this.locks.entries()) {
      if (expiresAt <= nowTs) {
        this.locks.delete(key);
      }
    }
  }

  pruneServeLogs() {
    const nowTs = now();
    const cutoff = nowTs - this.serveLogTtlMs;
    for (const [userId, entries] of this.serveLogs.entries()) {
      const filtered = entries.filter((entry) => entry.ts >= cutoff);
      if (filtered.length) {
        this.serveLogs.set(userId, filtered);
      } else {
        this.serveLogs.delete(userId);
      }
    }
  }

  pruneBucketCounts() {
    const nowTs = now();
    const minDay = toDayKey(nowTs - 2 * 24 * 60 * 60 * 1000);
    for (const [bucket, dayMap] of this.bucketCounts.entries()) {
      const keys = Array.from(dayMap.keys());
      keys.forEach((dayKey) => {
        if (dayKey < minDay) {
          dayMap.delete(dayKey);
        }
      });
      if (dayMap.size === 0) {
        this.bucketCounts.delete(bucket);
      }
    }
  }

  async getRecentIds(userId, categoryId, limit = this.recentLimit) {
    const key = this.keyRecent(userId, categoryId);
    if (!key) return [];
    const list = this.recent.get(key) || [];
    const sorted = [...list].sort((a, b) => b.ts - a.ts);
    return sorted.slice(0, limit).map((entry) => entry.id);
  }

  async addRecent(userId, categoryId, questionId, timestamp = now()) {
    const key = this.keyRecent(userId, categoryId);
    if (!key || !questionId) return;
    const existing = this.recent.get(key) || [];
    const filtered = existing.filter((entry) => entry.id !== questionId);
    filtered.unshift({ id: questionId, ts: timestamp });
    const pruned = this.pruneRecent(filtered);
    this.recent.set(key, pruned);
  }

  async isInSession(userId, sessionId, questionId) {
    this.pruneSessions();
    const key = this.keySession(userId, sessionId);
    if (!key || !questionId) return false;
    const record = this.sessions.get(key);
    if (!record || !record.ids) return false;
    return record.ids.has(String(questionId));
  }

  async addToSession(userId, sessionId, questionIds, timestamp = now()) {
    if (!sessionId || !userId) return;
    this.pruneSessions();
    const key = this.keySession(userId, sessionId);
    if (!key) return;
    const record = this.sessions.get(key) || { ids: new Set(), expiresAt: 0 };
    const expiresAt = timestamp + this.sessionTtlMs;
    const items = Array.isArray(questionIds) ? questionIds : [questionIds];
    items.filter(Boolean).forEach((id) => record.ids.add(String(id)));
    record.expiresAt = expiresAt;
    this.sessions.set(key, record);
  }

  async acquireServeLock(userId, questionId, ttlSeconds = 5) {
    this.pruneLocks();
    const key = this.keyLock(userId, questionId);
    if (!key) return true;
    const nowTs = now();
    const expiresAt = nowTs + ttlSeconds * 1000;
    const current = this.locks.get(key) || 0;
    if (current > nowTs) {
      return false;
    }
    this.locks.set(key, expiresAt);
    return true;
  }

  async recordServe({ userId, categoryId, questionId, bucket, sessionId, timestamp = now() }) {
    await this.addRecent(userId, categoryId, questionId, timestamp);
    if (sessionId) {
      await this.addToSession(userId, sessionId, questionId, timestamp);
    }
    if (bucket) {
      this.incrementBucket(bucket, timestamp);
    }
    if (userId && questionId) {
      this.logServe(userId, questionId, timestamp);
    }
  }

  incrementBucket(bucket, timestamp) {
    const bucketKey = String(bucket || '').trim();
    if (!bucketKey) return;
    this.pruneBucketCounts();
    const dayKey = toDayKey(timestamp);
    const map = this.bucketCounts.get(bucketKey) || new Map();
    const current = map.get(dayKey) || 0;
    map.set(dayKey, current + 1);
    this.bucketCounts.set(bucketKey, map);
  }

  logServe(userId, questionId, timestamp) {
    this.pruneServeLogs();
    const key = String(userId);
    const list = this.serveLogs.get(key) || [];
    list.push({ ts: timestamp, qid: String(questionId) });
    const cutoff = now() - this.serveLogTtlMs;
    const filtered = list.filter((entry) => entry.ts >= cutoff);
    this.serveLogs.set(key, filtered);
  }

  async isHotBucket(bucket) {
    if (!this.penaltyEnabled) return false;
    const bucketKey = String(bucket || '').trim();
    if (!bucketKey) return false;
    this.pruneBucketCounts();
    const map = this.bucketCounts.get(bucketKey);
    if (!map) return false;
    const todayKey = toDayKey(now());
    const count = map.get(todayKey) || 0;
    return count >= this.hotBucketThreshold;
  }

  async getBucketsHotness(buckets) {
    const result = new Map();
    const unique = Array.from(new Set((Array.isArray(buckets) ? buckets : []).filter(Boolean)));
    await Promise.all(unique.map(async (bucket) => {
      const hot = await this.isHotBucket(bucket);
      result.set(bucket, hot);
    }));
    return result;
  }

  async getRepeatRates(days = 30) {
    this.pruneServeLogs();
    const windowMs = Math.max(1, Number(days)) * 24 * 60 * 60 * 1000;
    const cutoff = now() - windowMs;
    const perUser = [];
    for (const [userId, entries] of this.serveLogs.entries()) {
      const withinWindow = entries.filter((entry) => entry.ts >= cutoff);
      if (withinWindow.length === 0) continue;
      const total = withinWindow.length;
      const unique = new Set(withinWindow.map((entry) => entry.qid)).size;
      const repeatRate = total === 0 ? 0 : 1 - unique / total;
      perUser.push({ userId, total, unique, repeatRate });
    }
    perUser.sort((a, b) => b.repeatRate - a.repeatRate);
    return perUser;
  }

  async getHotBuckets(limit = 20) {
    this.pruneBucketCounts();
    const todayKey = toDayKey(now());
    const items = [];
    for (const [bucket, map] of this.bucketCounts.entries()) {
      const count = map.get(todayKey) || 0;
      if (count > 0) {
        items.push({ bucket, count });
      }
    }
    items.sort((a, b) => b.count - a.count);
    return items.slice(0, limit);
  }
}

module.exports = {
  RecentQuestionStore: InMemoryRecentStore,
  createRecentQuestionStore(options) {
    return new InMemoryRecentStore(options);
  }
};
