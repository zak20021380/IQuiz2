const {
  getFallbackCategories: buildFallbackCategories,
  getFallbackProvinces: buildFallbackProvinces,
  getFallbackConfig: buildFallbackConfig
} = require('../services/publicContent');

function normalizeCategory(category, index) {
  const fallbackName = `دسته ${index + 1}`;
  const base = category && typeof category === 'object' ? category : {};
  const id = base.id ?? base.slug ?? base.providerCategoryId ?? `category-${index + 1}`;
  const name = base.name || base.displayName || base.title || fallbackName;
  const displayName = base.displayName || base.name || base.title || fallbackName;

  return {
    ...base,
    id: String(id),
    name,
    displayName
  };
}

function normalizeProvince(province, index) {
  if (!province || typeof province !== 'object') {
    const fallbackName = `استان ${index + 1}`;
    return {
      id: `province-${index + 1}`,
      name: fallbackName,
      displayName: fallbackName,
      score: 0,
      members: 0
    };
  }

  const fallbackName = `استان ${index + 1}`;
  const name = province.name || province.title || fallbackName;
  const id = province.id ?? province.code ?? province.slug ?? name ?? `province-${index + 1}`;

  return {
    ...province,
    id: typeof id === 'string' ? id : String(id),
    name,
    displayName: province.displayName || name,
    score: Number.isFinite(Number(province.score)) ? Number(province.score) : 0,
    members: Number.isFinite(Number(province.members)) ? Number(province.members) : 0
  };
}

module.exports = {
  getFallbackCategories: () => buildFallbackCategories().map(normalizeCategory),
  getFallbackProvinces: () => buildFallbackProvinces().map(normalizeProvince),
  getFallbackConfig: () => buildFallbackConfig()
};
