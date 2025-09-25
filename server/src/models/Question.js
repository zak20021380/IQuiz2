const crypto = require('crypto');
const mongoose = require('mongoose');

const { createQuestionUid, createQuestionPublicId } = require('../utils/hash');

function normalizeChoice(value) {
  return String(value ?? '').trim();
}

function canonicalize(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function generateChecksum(text, correctAnswer) {
  const canonicalText = canonicalize(text);
  const canonicalAnswer = canonicalize(correctAnswer);
  const payload = `${canonicalText}|${canonicalAnswer}`;
  return crypto.createHash('sha1').update(payload).digest('hex');
}

function deriveCorrectAnswer(choices, correctIndex) {
  if (!Array.isArray(choices) || choices.length === 0) {
    return '';
  }

  const index = Number(correctIndex);
  if (!Number.isInteger(index) || index < 0 || index >= choices.length) {
    return '';
  }

  return canonicalize(choices[index]);
}

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, alias: 'question' },
    choices: {
      type: [String],
      required: true,
      alias: 'options',
      validate: {
        validator: v => Array.isArray(v) && v.length === 4,
        message: 'choices must be an array of 4 strings'
      }
    },
    correctIndex: {
      type: Number,
      min: 0,
      max: 3,
      required: true,
      alias: 'correctIdx'
    },
    correctAnswer: { type: String, trim: true, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    categoryName: { type: String, trim: true },
    categorySlug: { type: String, trim: true },
    active: { type: Boolean, default: true },
    provider: { type: String, trim: true, default: '' },
    providerId: { type: String, trim: true },
    source: { type: String, enum: ['manual', 'ai-gen', 'community', 'AI'], default: 'manual' },
    lang: { type: String, trim: true, default: 'fa' },
    type: { type: String, trim: true, default: 'multiple' },
    status: {
      type: String,
      enum: ['pending', 'pending_review', 'approved', 'rejected', 'draft', 'archived'],
      default: 'approved'
    },
    isApproved: { type: Boolean, default: true },
    authorName: { type: String, trim: true, default: 'IQuiz Team' },
    submittedBy: { type: String, trim: true },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String, trim: true },
    publicId: {
      type: String,
      trim: true,
      unique: true,
      index: true,
      sparse: true,
      default: () => createQuestionPublicId(),
    },
    uid: { type: String, trim: true, index: true, unique: true, sparse: true },
    hash: { type: String, required: true, trim: true },
    checksum: { type: String, trim: true, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    usageCount: { type: Number, default: 0, min: 0 },
    lastServedAt: { type: Date },
    sha1Canonical: { type: String, trim: true, unique: true, sparse: true },
    simhash64: { type: String, trim: true },
    lshBucket: { type: String, trim: true, index: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

questionSchema.index({ provider: 1, hash: 1 }, { unique: true, sparse: true, name: 'uniq_provider_hash' });
questionSchema.index({ categoryName: 1, difficulty: 1, correctAnswer: 1, createdAt: -1 }, { name: 'idx_category_difficulty_correctAnswer_createdAt' });
questionSchema.index({ categorySlug: 1, difficulty: 1, createdAt: -1 }, { name: 'idx_categorySlug_difficulty_createdAt' });
questionSchema.index({ uid: 1 }, { unique: true, sparse: true, name: 'uniq_uid' });
questionSchema.index({ sha1Canonical: 1 }, { unique: true, sparse: true, name: 'uniq_sha1_canonical' });
questionSchema.index({ lshBucket: 1 }, { name: 'idx_lsh_bucket' });
questionSchema.index({ category: 1, difficulty: 1, usageCount: 1, lastServedAt: 1 }, { name: 'idx_pick_strategy' });

questionSchema.pre('validate', function deriveHashesAndAnswers(next) {
  try {
    const answer = deriveCorrectAnswer(this.choices, this.correctIndex);
    this.correctAnswer = answer;

    if (this.text && answer) {
      const computed = this.constructor.generateChecksum(this.text, answer);
      if (computed) {
        this.hash = computed;
        this.checksum = computed;
      }
    }

    const questionText = this.text || this.question || '';
    if (!this.publicId) {
      this.publicId = createQuestionPublicId();
    }
    const uid = createQuestionUid(questionText);
    if (uid) {
      this.uid = uid;
    }

    if (!this.hash) {
      this.invalidate('hash', 'hash is required');
    }
  } catch (error) {
    next(error);
    return;
  }

  next();
});

questionSchema.virtual('answerIndex')
  .get(function getAnswerIndex() {
    return this.correctIndex;
  })
  .set(function setAnswerIndex(value) {
    this.correctIndex = value;
  });

questionSchema.statics.generateChecksum = generateChecksum;
questionSchema.statics.generateHash = generateChecksum;

module.exports = mongoose.model('Question', questionSchema);
