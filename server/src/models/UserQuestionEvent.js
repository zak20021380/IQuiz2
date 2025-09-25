'use strict';

const mongoose = require('mongoose');

const questionConfig = require('../config/questions');

const { Schema } = mongoose;

function resolveTtlSeconds(days) {
  const numeric = Number(days);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 3 * 24 * 60 * 60;
  }
  const seconds = Math.round(numeric * 24 * 60 * 60);
  return Math.max(seconds, 60);
}

const ttlSeconds = resolveTtlSeconds(questionConfig.RECENT_QUESTION_TTL_DAYS);

const userQuestionEventSchema = new Schema({
  userId: {
    type: Schema.Types.String,
    required: true,
    trim: true,
    index: true
  },
  questionId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  answeredAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'user_question_events',
  minimize: false,
  timestamps: false
});

userQuestionEventSchema.index({ userId: 1, answeredAt: -1 });
userQuestionEventSchema.index({ answeredAt: 1 }, { expireAfterSeconds: ttlSeconds });
userQuestionEventSchema.index({ userId: 1, questionId: 1, answeredAt: 1 }, { unique: true });

module.exports = mongoose.models.UserQuestionEvent
  || mongoose.model('UserQuestionEvent', userQuestionEventSchema);
