const mongoose = require('mongoose');

const DEFAULT_GROUP_BATTLE_REWARDS = Object.freeze({
  winner: Object.freeze({ coins: 70, score: 220 }),
  loser: Object.freeze({ coins: 30, score: 90 }),
  groupScore: 420,
});

const DEFAULT_DUEL_REWARDS = Object.freeze({
  winner: Object.freeze({ coins: 60, score: 180 }),
  loser: Object.freeze({ coins: 20, score: 60 }),
  draw: Object.freeze({ coins: 35, score: 120 }),
});

const DEFAULT_SHOP_PRICING = Object.freeze({
  currency: 'IRR',
  coins: Object.freeze([]),
  vip: Object.freeze([]),
});

const DEFAULT_DATA = Object.freeze({
  general: Object.freeze({
    appName: 'Quiz WebApp Pro',
    language: 'fa',
    questionTime: 30,
    maxQuestions: 10,
  }),
  rewards: Object.freeze({
    pointsCorrect: 100,
    coinsCorrect: 5,
    pointsStreak: 50,
    coinsStreak: 10,
    groupBattleRewards: DEFAULT_GROUP_BATTLE_REWARDS,
    duelRewards: DEFAULT_DUEL_REWARDS,
  }),
  shop: Object.freeze({
    enabled: true,
    currency: 'IRR',
    lowBalanceThreshold: 0,
    quickTopup: true,
    quickPurchase: true,
    dynamicPricing: false,
    hero: Object.freeze({
      title: 'به فروشگاه ایکویز خوش آمدید',
      subtitle: 'هر روز پیشنهادهای تازه و کلیدهای بیشتر دریافت کنید.',
      ctaText: 'مشاهده پیشنهادها',
      ctaLink: '#wallet',
      theme: 'sky',
      note: '',
      showBalances: true,
      showTags: true,
    }),
    sections: Object.freeze({
      hero: true,
      keys: true,
      wallet: true,
      vip: true,
      promotions: true,
    }),
    packages: Object.freeze({
      keys: Object.freeze([]),
      wallet: Object.freeze([]),
    }),
    vip: Object.freeze({
      enabled: true,
      autoRenew: true,
      autoApprove: true,
      billingCycle: 'monthly',
      price: 0,
      trialDays: 0,
      slots: 0,
      customNote: '',
      perks: Object.freeze([]),
    }),
    vipPlans: Object.freeze([]),
    support: Object.freeze({
      message: '',
      link: '',
    }),
    promotions: Object.freeze({
      defaultDiscount: 0,
      dailyLimit: 0,
      startDate: '',
      endDate: '',
      bannerMessage: '',
      autoHighlight: true,
    }),
    messaging: Object.freeze({
      lowBalance: '',
      success: '',
      supportCta: '',
      supportLink: '',
      showTutorial: true,
    }),
    pricing: DEFAULT_SHOP_PRICING,
  }),
  updatedAt: 0,
});

const adminSettingSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'global'
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: () => JSON.parse(JSON.stringify(DEFAULT_DATA))
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

adminSettingSchema.statics.defaultData = () => JSON.parse(JSON.stringify(DEFAULT_DATA));

module.exports = mongoose.model('AdminSetting', adminSettingSchema);
