const mongoose = require('mongoose');

const ALLOWED_COLORS = new Set(['blue', 'green', 'orange', 'purple', 'yellow', 'pink', 'red', 'teal', 'indigo']);

function sanitizeColor(value) {
  if (!value) return 'blue';
  const normalized = String(value).trim().toLowerCase();
  return ALLOWED_COLORS.has(normalized) ? normalized : 'blue';
}

function sanitizeAliases(values) {
  const list = Array.isArray(values) ? values : [];
  const normalized = list
    .map((value) => String(value ?? '').trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(normalized));
}

const categorySchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, trim: true, default: '' },
    description: { type: String, default: '' },
    icon:        { type: String, default: 'fa-globe' },
    color:       {
      type: String,
      default: 'blue',
      set: sanitizeColor
    },
    status:      { type: String, enum: ['active', 'pending', 'disabled'], default: 'active' },
    provider:    { type: String, trim: true, default: 'manual' },
    providerCategoryId: { type: String, trim: true, default: null },
    aliases: {
      type: [String],
      default: [],
      set: sanitizeAliases
    }
  },
  { timestamps: true }
);

categorySchema.index({ provider: 1, providerCategoryId: 1 }, { unique: true, sparse: true });

categorySchema.pre('save', function deriveDisplayName(next) {
  if (!this.displayName) {
    this.displayName = this.name;
  }

  const aliasSet = new Set(Array.isArray(this.aliases) ? this.aliases : []);
  aliasSet.add(this.name);
  aliasSet.add(this.displayName);
  this.aliases = Array.from(aliasSet)
    .map((alias) => String(alias ?? '').trim())
    .filter((alias) => alias.length > 0);

  next();
});

module.exports = mongoose.model('Category', categorySchema);
