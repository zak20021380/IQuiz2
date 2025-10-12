const mongoose = require('mongoose');

const DEFAULT_DATA = Object.freeze({
  appName: '',
  defaultLang: 'fa',
  questionTimeSec: 30,
  maxQuestionsPerMatch: 10,
  minimumSettlement: 0,
  roundingStep: 1,
  settlementAmounts: [],
  monthlyBudget: 0
});

const adminSettingSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'global'
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ ...DEFAULT_DATA })
    },
    updatedBy: {
      type: String,
      default: null
    },
    updatedAt: {
      type: Date,
      default: null
    },
    version: {
      type: Number,
      default: 0
    }
  },
  {
    minimize: false,
    versionKey: false
  }
);

adminSettingSchema.statics.defaultData = () => ({ ...DEFAULT_DATA });

module.exports = mongoose.model('AdminSetting', adminSettingSchema);
