const mongoose = require('mongoose');

const provinceStatSchema = new mongoose.Schema(
  {
    province: { type: String, required: true, unique: true, trim: true },
    score: { type: Number, default: 0 },
    memberCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

provinceStatSchema.pre('save', function clampValues(next) {
  if (!Number.isFinite(this.score)) this.score = 0;
  if (!Number.isFinite(this.memberCount)) this.memberCount = 0;
  this.score = Math.max(0, Math.round(this.score));
  this.memberCount = Math.max(0, Math.round(this.memberCount));
  next();
});

module.exports = mongoose.model('ProvinceStat', provinceStatSchema);
