const mongoose = require('mongoose');

const { Schema } = mongoose;

const analyticsEventSchema = new Schema({
  name: { type: String, required: true, trim: true },
  occurredAt: { type: Date, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  guestId: { type: String, trim: true, default: null },
  metadata: { type: Schema.Types.Mixed, default: null },
  userAgent: { type: String, default: null },
  clientIp: { type: String, default: null },
  receivedAt: { type: Date, default: Date.now }
}, {
  minimize: false
});

module.exports = mongoose.models.AnalyticsEvent
  || mongoose.model('AnalyticsEvent', analyticsEventSchema);
