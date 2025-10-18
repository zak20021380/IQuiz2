const mongoose = require('mongoose');

const duelResultSchema = new mongoose.Schema(
  {
    duelId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    opponentId: { type: String, default: '' },
    opponentName: { type: String, default: '' },
    opponentAvatar: { type: String, default: '' },
    outcome: { type: String, enum: ['win', 'loss', 'draw'], required: true },
    reason: { type: String, default: 'score' },
    yourScore: { type: Number, default: 0 },
    opponentScore: { type: Number, default: 0 },
    startedAt: { type: Date },
    deadline: { type: Date },
    resolvedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

duelResultSchema.index({ userId: 1, resolvedAt: -1 });
duelResultSchema.index({ duelId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('DuelResult', duelResultSchema);
