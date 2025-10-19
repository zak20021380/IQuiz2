'use strict';

const mongoose = require('mongoose');

const UserQuestionEvent = require('../models/UserQuestionEvent');
const logger = require('../config/logger');

function normalizeCategorySlug(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.toLowerCase();
}

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

async function recordAnswerEvent({ userId, guestId, user, questionId, categorySlug, answeredAt = new Date() }) {
  const userKey = normalizeUserKey({ userId, guestId, user });
  const normalizedQuestionId = normalizeQuestionId(questionId);

  if (!userKey || !normalizedQuestionId) {
    return null;
  }

  const normalizedCategorySlug = normalizeCategorySlug(categorySlug);
  const filter = {
    userId: userKey,
    questionId: normalizedQuestionId
  };

  if (normalizedCategorySlug) {
    filter.categorySlug = normalizedCategorySlug;
  }

  const update = {
    $set: {
      answeredAt: answeredAt instanceof Date ? answeredAt : new Date(answeredAt)
    },
    $setOnInsert: {
      userId: userKey,
      questionId: normalizedQuestionId
    }
  };

  if (normalizedCategorySlug) {
    update.$set.categorySlug = normalizedCategorySlug;
    update.$setOnInsert.categorySlug = normalizedCategorySlug;
  }

  try {
    await UserQuestionEvent.updateOne(filter, update, {
      upsert: true,
      setDefaultsOnInsert: true
    });
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
