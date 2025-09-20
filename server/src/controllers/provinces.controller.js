const Province = require('../models/Province');

const truthy = new Set(['true', '1', 'yes', 'on']);
const falsy = new Set(['false', '0', 'no', 'off']);

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const sanitizeCode = (value) => {
  const code = sanitizeString(value).toLowerCase();
  return code || null;
};
const sanitizeSortOrder = (value, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const rounded = Math.round(num);
  return Math.min(Math.max(rounded, 0), 1000);
};
const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (truthy.has(normalized)) return true;
  if (falsy.has(normalized)) return false;
  return defaultValue;
};

function mapProvinceDocument(doc) {
  if (!doc) return null;
  const raw = doc.toObject ? doc.toObject() : doc;
  const id = raw._id ? String(raw._id) : raw.id ? String(raw.id) : '';
  return {
    id,
    name: raw.name || '',
    code: raw.code || '',
    sortOrder: Number.isFinite(raw.sortOrder) ? Number(raw.sortOrder) : 0,
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null
  };
}

exports.list = async (req, res, next) => {
  try {
    const query = {};
    if (Object.prototype.hasOwnProperty.call(req.query, 'active')) {
      const active = parseBoolean(req.query.active, null);
      if (active === true) query.isActive = true;
      else if (active === false) query.isActive = false;
    }
    if (req.query.q) {
      const q = sanitizeString(req.query.q);
      if (q) {
        query.name = { $regex: q, $options: 'i' };
      }
    }
    const provinces = await Province.find(query).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ ok: true, data: provinces.map(mapProvinceDocument) });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const name = sanitizeString(req.body.name);
    if (!name) {
      return res.status(400).json({ ok: false, message: 'نام استان الزامی است' });
    }
    const code = sanitizeCode(req.body.code);
    const sortOrder = sanitizeSortOrder(req.body.sortOrder, 0);
    const isActive = parseBoolean(req.body.isActive, true);

    const province = await Province.create({ name, code, sortOrder, isActive });
    res.status(201).json({ ok: true, data: mapProvinceDocument(province) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ ok: false, message: 'استانی با این نام یا کد از قبل وجود دارد' });
    }
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const province = await Province.findById(req.params.id);
    if (!province) {
      return res.status(404).json({ ok: false, message: 'استان یافت نشد' });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const name = sanitizeString(req.body.name);
      if (!name) {
        return res.status(400).json({ ok: false, message: 'نام استان نمی‌تواند خالی باشد' });
      }
      province.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'code')) {
      province.code = sanitizeCode(req.body.code);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'sortOrder')) {
      province.sortOrder = sanitizeSortOrder(req.body.sortOrder, province.sortOrder);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'isActive')) {
      province.isActive = parseBoolean(req.body.isActive, province.isActive);
    }

    await province.save();
    res.json({ ok: true, data: mapProvinceDocument(province) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ ok: false, message: 'استانی با این نام یا کد از قبل وجود دارد' });
    }
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await Province.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ ok: false, message: 'استان یافت نشد' });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

exports.mapProvinceDocument = mapProvinceDocument;
