const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: '' },
    role: { type: String, default: '' },
    power: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    opponentId: { type: String, default: '' },
    opponent: { type: String, default: '' },
    result: { type: String, enum: ['win', 'loss', 'draw'], default: 'draw' },
    score: {
      self: { type: Number, default: 0 },
      opponent: { type: Number, default: 0 },
    },
    playedAt: { type: Date },
    time: { type: String, default: '' },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    groupId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    score: { type: Number, default: 0 },
    members: { type: Number, default: 0 },
    admin: { type: String, default: '' },
    created: { type: String, default: '' },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    memberList: { type: [String], default: [] },
    matches: { type: [matchSchema], default: [] },
    requests: { type: [String], default: [] },
    roster: { type: [playerSchema], default: [] },
  },
  { timestamps: true }
);

groupSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret.groupId;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

groupSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret.groupId;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Group', groupSchema);
