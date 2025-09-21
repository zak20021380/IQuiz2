const DEFAULT_DIFFS = [
  { value: 'easy', label: 'آسان' },
  { value: 'medium', label: 'متوسط' },
  { value: 'hard', label: 'سخت' }
];

const Admin = {
  categories: [],
  diffs: []
};

function getAdminCategories(){
  return Array.isArray(Admin.categories) ? Admin.categories : [];
}

function getActiveCategories(){
  return getAdminCategories().filter(cat => cat && cat.id != null);
}

function getFirstCategory(){
  const categories = getAdminCategories();
  return categories.length ? categories[0] : null;
}

function findCategoryById(categoryId){
  if (categoryId == null) return null;
  return getAdminCategories().find(cat => cat && cat.id === categoryId) || null;
}

function getAdminDiffs(){
  return Array.isArray(Admin.diffs) ? Admin.diffs : [];
}

function getEffectiveDiffs(){
  const diffs = getAdminDiffs();
  return diffs.length ? diffs : DEFAULT_DIFFS;
}

function getCategoryDifficultyPool(categoryOrId){
  const category = categoryOrId && typeof categoryOrId === 'object'
    ? categoryOrId
    : findCategoryById(categoryOrId);
  if (category && Array.isArray(category.difficulties) && category.difficulties.length){
    return category.difficulties;
  }
  return getEffectiveDiffs();
}

export {
  Admin,
  DEFAULT_DIFFS,
  getAdminCategories,
  getActiveCategories,
  getFirstCategory,
  findCategoryById,
  getAdminDiffs,
  getEffectiveDiffs,
  getCategoryDifficultyPool
};
