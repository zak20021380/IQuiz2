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
    source: { type: String, enum: ['manual', 'opentdb'], default: 'manual' },
    lang: { type: String, trim: true, default: 'en' },
    type: { type: String, trim: true, default: 'multiple' },
    checksum: { type: String, required: true, trim: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

questionSchema.index({ checksum: 1 }, { unique: true, sparse: true });

questionSchema.pre('validate', function deriveChecksum(next) {
  if (!this.checksum && this.text && Array.isArray(this.choices) && this.choices.length > 0) {
    this.checksum = this.constructor.generateChecksum(this.text, this.choices);
  }
  next();
});

questionSchema.statics.generateChecksum = generateChecksum;

module.exports = mongoose.model('Question', questionSchema);
