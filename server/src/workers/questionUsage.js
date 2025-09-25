const Question = require('../models/Question');
const logger = require('../config/logger');

const FLUSH_INTERVAL_MS = 2000;

const buffer = new Map();
let flushTimer = null;
let running = true;

function minuteBucket(timestamp) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}`;
}

function scheduleFlush() {
  if (!running) return;
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush().catch((error) => {
      logger.warn(`questionUsage flush failed: ${error.message}`);
    });
  }, FLUSH_INTERVAL_MS);
}

async function flush() {
  if (buffer.size === 0) {
    return;
  }

  const aggregated = new Map();
  for (const { qid, ts } of buffer.values()) {
    const key = String(qid);
    const entry = aggregated.get(key) || { count: 0, ts: 0 };
    entry.count += 1;
    entry.ts = Math.max(entry.ts, ts instanceof Date ? ts.getTime() : Number(ts) || Date.now());
    aggregated.set(key, entry);
  }
  buffer.clear();

  const updates = [];
  for (const [qid, payload] of aggregated.entries()) {
    updates.push(
      Question.updateOne(
        { _id: qid },
        {
          $inc: { usageCount: payload.count },
          $set: { lastServedAt: new Date(payload.ts) }
        }
      ).catch((error) => {
        logger.warn(`Failed to update usage for question ${qid}: ${error.message}`);
      })
    );
  }

  await Promise.all(updates);
}

function enqueueUsage(event) {
  if (!event || !event.qid) return;
  const ts = event.ts ? Number(event.ts) : Date.now();
  const bucket = minuteBucket(ts);
  const key = `${event.qid}:${bucket}`;
  if (buffer.has(key)) {
    return;
  }
  buffer.set(key, { qid: String(event.qid), ts: new Date(ts) });
  scheduleFlush();
}

function start() {
  running = true;
  scheduleFlush();
}

function stop() {
  running = false;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

module.exports = {
  enqueueUsage,
  flush,
  start,
  stop
};
