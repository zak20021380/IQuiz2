const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    text:       { type: String, required: true, trim: true },
    options:    { type: [String], validate: v => v.length === 4, required: true }, // 4 گزینه
    correctIdx: { type: Number, min: 0, max: 3, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    category:   { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    active:     { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', questionSchema);
