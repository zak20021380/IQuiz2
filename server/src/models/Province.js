const mongoose = require('mongoose');

const ProvinceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
    unique: true
  },
  code: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 60,
    unique: true,
    sparse: true
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: 0,
    max: 1000
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

ProvinceSchema.index({ name: 1 });
ProvinceSchema.index({ code: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Province', ProvinceSchema);
