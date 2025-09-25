'use strict';

const mongoose = require('mongoose');

const UserQuestionEvent = require('../models/UserQuestionEvent');
const logger = require('../config/logger');

function normalizeUserKey({ userId, guestId, user }) {
  const source = userId || user?._id || user?.id;
  if (source instanceof mongoose.Types.ObjectId) {
    return source.toHexString();
  }
  if (source) {
    const asString = String(source).trim();
    if (mongoose.Types.ObjectId.isValid(asString)) {
      return new mongoose.Types.ObjectId(asString).toHexString();
    }
    if (asString) {
      return asString;
    }
  }

  const guestKey = typeof guestId === 'string' ? guestId.trim() : '';
  if (guestKey) {
    return `guest:${guestKey}`;
  }

  return '';
}

function normalizeQuestionId(questionId) {
  if (!questionId) return null;
  if (questionId instanceof mongoose.Types.ObjectId) return questionId;
  if (mongoose.Types.ObjectId.isValid(questionId)) {
    return new mongoose.Types.ObjectId(questionId);
  }
  return null;
}

async function recordAnswerEvent({ userId, guestId, user, questionId, answeredAt = new Date() }) {
  const userKey = normalizeUserKey({ userId, guestId, user });
  const normalizedQuestionId = normalizeQuestionId(questionId);

  if (!userKey || !normalizedQuestionId) {
    return null;
  }

  const payload = {
    userId: userKey,
    questionId: normalizedQuestionId,
    answeredAt: answeredAt instanceof Date ? answeredAt : new Date(answeredAt)
  };

  try {
    await UserQuestionEvent.create(payload);
    return true;
  } catch (error) {
    if (error?.code === 11000) {
      return false;
    }
    logger.warn(`[answers] failed to record answer: ${error.message}`);
    return false;
  }
}

module.exports = {
  recordAnswerEvent
};
