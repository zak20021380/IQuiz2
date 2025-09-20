const Province = require('../models/Province');
const logger = require('../config/logger');
const { getFallbackProvinces } = require('./publicContent');
const { mapProvinceDocument } = require('../controllers/provinces.controller');

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

function normalizeProvince(raw, index = 0) {
  const base = mapProvinceDocument(raw) || {};
  const name = sanitizeString(base.name);
  const code = sanitizeString(base.code).toLowerCase();
  const sortOrder = Number.isFinite(base.sortOrder) ? Number(base.sortOrder) : index;
  const score = Number.isFinite(raw?.score) ? Number(raw.score) : 0;
  const members = Number.isFinite(raw?.members) ? Number(raw.members) : 0;
  return {
    ...base,
    name,
    code,
    sortOrder,
    score,
    members,
    isActive: base.isActive !== false
  };
}

function mapFallbackProvince(item, index) {
  const name = sanitizeString(item?.name);
  if (!name) return null;
  const code = sanitizeString(item?.code).toLowerCase();
  const sortOrder = Number.isFinite(item?.sortOrder) ? Number(item.sortOrder) : index;
  const score = Number.isFinite(item?.score) ? Number(item.score) : 0;
  const members = Number.isFinite(item?.members) ? Number(item.members) : 0;
  return {
    id: null,
    name,
    code,
    sortOrder,
    score,
    members,
    isActive: true,
    createdAt: null,
    updatedAt: null
  };
}

async function getActiveProvincesFromDb() {
  try {
    const docs = await Province.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    return docs.map((doc, index) => normalizeProvince(doc, index)).filter((item) => item.name);
  } catch (error) {
    logger.warn(`Failed to load provinces from database: ${error.message}`);
    return [];
  }
}

function getFallbackProvinceList() {
  return getFallbackProvinces()
    .map((item, index) => mapFallbackProvince(item, index))
    .filter(Boolean);
}

async function getActiveProvincesWithFallback() {
  const provinces = await getActiveProvincesFromDb();
  if (provinces.length > 0) {
    return provinces;
  }
  return getFallbackProvinceList();
}

async function filterAllowedProvinceNames(names = []) {
  const list = Array.isArray(names) ? names : [];
  const sanitized = list.map((item) => sanitizeString(item)).filter(Boolean);
  if (sanitized.length === 0) return [];
  const provinces = await getActiveProvincesWithFallback();
  const allowed = new Set(provinces.map((province) => province.name));
  return sanitized.filter((name) => allowed.has(name));
}

module.exports = {
  getActiveProvincesWithFallback,
  filterAllowedProvinceNames,
  normalizeProvince
};
