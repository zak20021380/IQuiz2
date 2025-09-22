const mongoose = require('mongoose');

const ALLOWED_COLORS = new Set(['blue', 'green', 'orange', 'purple', 'yellow', 'pink', 'red', 'teal', 'indigo']);

function slugify(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'category';
}

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
    slug:        { type: String, required: true, unique: true, trim: true },
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
    },
    order: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

categorySchema.index({ provider: 1, providerCategoryId: 1 }, { unique: true, sparse: true });
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ order: 1, createdAt: -1 });

categorySchema.pre('validate', async function ensureSlug(next) {
  try {
    const sourceValue = this.slug || this.displayName || this.name;
    let base = slugify(sourceValue);
    if (!base) base = `category-${Date.now()}`;

    if (!this.slug || this.isModified('slug') || this.isModified('name') || this.isModified('displayName')) {
      let candidate = base;
      let suffix = 2;
      // eslint-disable-next-line no-await-in-loop
      while (await this.constructor.exists({ slug: candidate, _id: { $ne: this._id } })) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
      }
      this.slug = candidate;
    }
  } catch (error) {
    next(error);
    return;
  }

  next();
});

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
