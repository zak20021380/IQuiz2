const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  idempotencyKey: { type: String, trim: true, unique: true, sparse: true },
  type: {
    type: String,
    enum: ['external', 'coins', 'vip'],
    default: 'external'
  },
  sessionId: { type: String, trim: true, default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  packageId: { type: String, required: true, trim: true },
  packageSnapshot: { type: Object, default: {} },
  amountToman: { type: Number, required: true },
  amountRial: { type: Number, required: true },
  coins: { type: Number, required: true },
  bonusPercent: { type: Number, default: 0 },
  totalCoins: { type: Number, required: true },
  authority: { type: String, trim: true, default: null },
  refId: { type: String, trim: true, default: null },
  cardPan: { type: String, trim: true, default: null },
  status: {
    type: String,
    enum: ['pending', 'verifying', 'paid', 'failed', 'canceled'],
    default: 'pending'
  },
  description: { type: String, trim: true, default: '' },
  returnUrl: { type: String, trim: true, default: null },
  callbackToken: { type: String, trim: true, default: null },
  failReason: { type: String, trim: true, default: null },
  awardedCoins: { type: Number, default: 0 },
  walletBalanceAfter: { type: Number, default: null },
  verifiedAt: { type: Date, default: null },
  metadata: { type: Object, default: {} }
}, { timestamps: true });

paymentSchema.index({ authority: 1 });
paymentSchema.index({ sessionId: 1, createdAt: -1 });
paymentSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Payment', paymentSchema);
