const crypto = require('crypto');
const mongoose = require('mongoose');

function normalizeChoice(value) {
  return String(value ?? '').trim();
}

function normalizeQuestionText(value) {
  return String(value ?? '').trim();
}

function generateChecksum(text, choices) {
  const normalizedText = normalizeQuestionText(text);
  const normalizedChoices = Array.isArray(choices)
    ? choices.map(normalizeChoice).filter(Boolean)
    : [];

  const canonicalChoices = [...normalizedChoices].sort((a, b) => a.localeCompare(b));
  const payload = JSON.stringify({ text: normalizedText, choices: canonicalChoices });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
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
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    categoryName: { type: String, trim: true },
    active: { type: Boolean, default: true },
    provider: { type: String, trim: true, default: '' },
    providerId: { type: String, trim: true },
    source: { type: String, enum: ['manual', 'opentdb', 'the-trivia-api', 'cluebase', 'jservice', 'community'], default: 'manual' },
    lang: { type: String, trim: true, default: 'en' },
    type: { type: String, trim: true, default: 'multiple' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'draft', 'archived'],
      default: 'approved'
    },
    isApproved: { type: Boolean, default: true },
    authorName: { type: String, trim: true, default: 'IQuiz Team' },
    submittedBy: { type: String, trim: true },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String, trim: true },
    checksum: { type: String, required: true, trim: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

questionSchema.index({ checksum: 1 }, { unique: true, sparse: true });
questionSchema.index({ provider: 1, providerId: 1 }, { unique: true, sparse: true });

questionSchema.pre('validate', function deriveChecksum(next) {
  if (!this.checksum && this.text && Array.isArray(this.choices) && this.choices.length > 0) {
    this.checksum = this.constructor.generateChecksum(this.text, this.choices);
  }
  next();
});

questionSchema.statics.generateChecksum = generateChecksum;

module.exports = mongoose.model('Question', questionSchema);
