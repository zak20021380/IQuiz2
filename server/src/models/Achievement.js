const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    icon:        { type: String, default: 'fa-trophy' },
    color:       { type: String, default: 'yellow' },
    status:      { type: String, enum: ['active', 'pending', 'disabled'], default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Achievement', achievementSchema);
