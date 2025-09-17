const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    icon:        { type: String, default: 'fa-globe' },
    color:       { type: String, default: 'blue' },
    status:      { type: String, enum: ['active', 'pending', 'disabled'], default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
