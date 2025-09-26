const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    role: { type: String, default: '' },
    power: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
  },
  { _id: false }
);

const participantSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    total: { type: Number, default: 0 },
    players: { type: [playerSchema], default: [] },
  },
  { _id: false }
);

const roundSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    hostPlayer: { type: playerSchema, default: null },
    opponentPlayer: { type: playerSchema, default: null },
    hostScore: { type: Number, default: 0 },
    opponentScore: { type: Number, default: 0 },
    winner: { type: String, enum: ['host', 'opponent', 'none'], default: 'none' },
  },
  { _id: false }
);

const rewardSchema = new mongoose.Schema(
  {
    winnerGroupId: { type: String, default: '' },
    winnerName: { type: String, default: '' },
    loserName: { type: String, default: '' },
    config: { type: mongoose.Schema.Types.Mixed },
    userReward: {
      coins: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
      applied: { type: Boolean, default: false },
      type: { type: String, default: 'none' },
    },
  },
  { _id: false }
);

const groupBattleSchema = new mongoose.Schema(
  {
    battleId: { type: String, required: true, unique: true },
    playedAt: { type: Date, default: Date.now },
    hostGroupId: { type: String, required: true },
    opponentGroupId: { type: String, required: true },
    host: { type: participantSchema, required: true },
    opponent: { type: participantSchema, required: true },
    rounds: { type: [roundSchema], default: [] },
    winnerGroupId: { type: String, required: true },
    diff: { type: Number, default: 0 },
    rewards: { type: rewardSchema },
  },
  { timestamps: true }
);

groupBattleSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret.battleId;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

groupBattleSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret.battleId;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('GroupBattle', groupBattleSchema);
