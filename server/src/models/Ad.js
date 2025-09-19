const mongoose = require('mongoose');

const AD_PLACEMENTS = ['banner', 'native', 'interstitial', 'rewarded'];
const AD_STATUSES = ['draft', 'active', 'paused', 'archived'];
const AD_CREATIVE_TYPES = ['image', 'video', 'html', 'iframe'];
const AD_REWARD_TYPES = ['coins', 'life', 'custom'];

const AdSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  placement: {
    type: String,
    required: true,
    enum: AD_PLACEMENTS
  },
  status: {
    type: String,
    enum: AD_STATUSES,
    default: 'active'
  },
  priority: {
    type: Number,
    min: 0,
    max: 100,
    default: 1
  },
  creativeUrl: {
    type: String,
    required: true,
    trim: true
  },
  creativeType: {
    type: String,
    enum: AD_CREATIVE_TYPES,
    default: 'image'
  },
  landingUrl: {
    type: String,
    trim: true
  },
  headline: {
    type: String,
    trim: true,
    maxlength: 120
  },
  body: {
    type: String,
    trim: true,
    maxlength: 500
  },
  ctaLabel: {
    type: String,
    trim: true,
    maxlength: 40
  },
  rewardType: {
    type: String,
    enum: AD_REWARD_TYPES,
    default: 'coins'
  },
  rewardAmount: {
    type: Number,
    min: 0,
    max: 1000,
    default: 20
  },
  provinces: {
    type: [String],
    default: []
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

AdSchema.index({ placement: 1, status: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Ad', AdSchema);
module.exports.AD_PLACEMENTS = AD_PLACEMENTS;
module.exports.AD_STATUSES = AD_STATUSES;
module.exports.AD_CREATIVE_TYPES = AD_CREATIVE_TYPES;
module.exports.AD_REWARD_TYPES = AD_REWARD_TYPES;
