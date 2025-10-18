const mongoose = require('mongoose');

const duelStatsSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

duelStatsSchema.index({ userId: 1 });

module.exports = mongoose.model('DuelStats', duelStatsSchema);
