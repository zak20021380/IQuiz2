const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { isEmail } = require('validator');

const limitStateSchema = new mongoose.Schema({
  used: { type: Number, default: 0 },
  lastReset: { type: Date, default: () => new Date(0) },
  lastRecovery: { type: Date, default: () => new Date(0) }
}, { _id: false });

const defaultLimitState = () => ({
  used: 0,
  lastReset: new Date(0),
  lastRecovery: new Date(0)
});

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    name:     { type: String, trim: true, default: function () { return this.username; } },
    email:    {
      type: String,
      required: function requiredEmail() {
        return !this.telegramId;
      },
      unique: true,
      sparse: true,
      lowercase: true,
      validate: [isEmail, 'Invalid email']
    },
    password: {
      type: String,
      required: function requiredPassword() {
        return !this.telegramId;
      },
      minlength: 6,
      select: false
    },
    role:     { type: String, enum: ['user', 'vip', 'admin'], default: 'user' },
    coins:    { type: Number, default: 0 },
    score:    { type: Number, default: 0 },
    status:   { type: String, enum: ['active', 'blocked', 'pending'], default: 'active' },
    province: { type: String, trim: true, default: '' },
    groupId: { type: String, trim: true, default: '' },
    groupName: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    telegramId: { type: String, unique: true, sparse: true, index: true },
    telegramUsername: { type: String, trim: true, default: '' },
    avatar: { type: String, trim: true, default: '' },
    lastTelegramAuthAt: { type: Date },
    subscription: {
      active: { type: Boolean, default: false },
      tier: { type: String, default: null },
      plan: { type: String, default: null },
      expiry: { type: Date, default: null },
      autoRenew: { type: Boolean, default: false },
      lastTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null }
    },
    limits: {
      matches: { type: limitStateSchema, default: defaultLimitState },
      duels: { type: limitStateSchema, default: defaultLimitState },
      lives: { type: limitStateSchema, default: defaultLimitState },
      groupBattles: { type: limitStateSchema, default: defaultLimitState },
      energy: { type: limitStateSchema, default: defaultLimitState }
    }
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.password) return next();
  if (!this.isModified('password')) return next();

  try {
    bcrypt.getRounds(this.password);
    return next();
  } catch (err) {
    // Password is not hashed yet; continue to hash below.
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
