const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { isEmail } = require('validator');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, validate: [isEmail, 'Invalid email'] },
    password: { type: String, required: true, minlength: 6, select: false },
    role:     { type: String, enum: ['user', 'vip', 'admin'], default: 'user' },
    coins:    { type: Number, default: 0 },
    score:    { type: Number, default: 0 },
    status:   { type: String, enum: ['active', 'blocked', 'pending'], default: 'active' }
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
