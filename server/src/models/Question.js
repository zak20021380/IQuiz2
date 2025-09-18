const mongoose = require('mongoose');

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
    source: { type: String, enum: ['manual', 'opentdb'], default: 'manual' }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

module.exports = mongoose.model('Question', questionSchema);
