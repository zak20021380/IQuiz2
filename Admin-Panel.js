// --------------- CONFIG ---------------
const API_BASE = 'http://localhost:4000/api'; // در پروDUCTION دامنه‌ات را بده
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatNumberFa = (value, options = {}) => {
  const number = Number(value);
  const safeNumber = Number.isFinite(number) ? number : 0;
  const formatter = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0, ...options });
  return formatter.format(safeNumber);
};

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

const truncateText = (value = '', limit = 120) => {
  const raw = typeof value === 'string' ? value : String(value ?? '');
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, Math.max(0, limit - 1))}…`;
};

const formatPercentFa = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '۰';
  return new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(number);
};

const DIFFICULTY_META = {
  easy:   { label: 'آسون', class: 'meta-chip difficulty-easy', icon: 'fa-feather' },
  medium: { label: 'متوسط', class: 'meta-chip difficulty-medium', icon: 'fa-wave-square' },
  hard:   { label: 'سخت', class: 'meta-chip difficulty-hard', icon: 'fa-fire' }
};

const SOURCE_META = {
  manual: { label: 'ایجاد دستی', class: 'meta-chip source-manual', icon: 'fa-pen-nib' },
  community: { label: 'سازنده‌ها', class: 'meta-chip source-community', icon: 'fa-users-gear' }
};

function normalizeProviderId(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

function resolveProviderId(value) {
  return normalizeProviderId(value);
}

const htmlDecoder = document.createElement('textarea');
const decodeHtmlEntities = (value = '') => {
  htmlDecoder.innerHTML = value;
  return htmlDecoder.value;
};

const STATUS_META = {
  active:          { label: 'فعال', class: 'meta-chip status-active', dot: 'active' },
  pending:         { label: 'در انتظار بررسی', class: 'meta-chip status-pending', dot: 'pending' },
  pending_review:  { label: 'در انتظار بررسی', class: 'meta-chip status-pending', dot: 'pending' },
  approved:        { label: 'تایید شده', class: 'meta-chip status-approved', dot: 'active' },
  rejected:        { label: 'رد شده', class: 'meta-chip status-rejected', dot: 'inactive' },
  review:          { label: 'در حال بررسی', class: 'meta-chip status-pending', dot: 'pending' },
  draft:           { label: 'پیش‌نویس', class: 'meta-chip status-pending', dot: 'pending' },
  inactive:        { label: 'غیرفعال', class: 'meta-chip status-inactive', dot: 'inactive' },
  disabled:        { label: 'غیرفعال', class: 'meta-chip status-inactive', dot: 'inactive' },
  archived:        { label: 'آرشیو شده', class: 'meta-chip status-archived', dot: 'archived' }
};

const ACTIVE_STATE_META = {
  on:  { label: 'فعال', class: 'meta-chip moderation-active', icon: 'fa-toggle-on' },
  off: { label: 'غیرفعال', class: 'meta-chip moderation-inactive', icon: 'fa-toggle-off' }
};

const CATEGORY_STATUS_SUFFIX = {
  pending: ' (در انتظار تایید)',
  disabled: ' (غیرفعال)'
};

const ADMIN_SETTINGS_STORAGE_KEY = 'iquiz_admin_settings_v1';

const STATIC_CATEGORY_DEFINITIONS = Object.freeze([
  {
    order: 1,
    slug: 'general',
    name: 'General Knowledge',
    displayName: 'عمومی',
    description: 'سوالاتی متنوع از دانستنی‌های روزمره و موضوعات عمومی.',
    icon: 'fa-earth-asia',
    color: 'blue',
    provider: 'manual',
    providerCategoryId: 'general',
    aliases: ['عمومی', 'دانش عمومی', 'General', 'General Knowledge']
  },
  {
    order: 2,
    slug: 'history-civilization',
    name: 'History & Civilization',
    displayName: 'تاریخ و تمدن',
    description: 'رویدادها، امپراتوری‌ها و میراث فرهنگی ملت‌ها.',
    icon: 'fa-landmark-dome',
    color: 'orange',
    provider: 'manual',
    providerCategoryId: 'history-civilization',
    aliases: ['تاریخ', 'تمدن', 'History', 'History & Civilization']
  },
  {
    order: 3,
    slug: 'geography-nature',
    name: 'Geography & Nature',
    displayName: 'جغرافیا و طبیعت',
    description: 'سرزمین‌ها، اقلیم‌ها و شگفتی‌های طبیعی جهان.',
    icon: 'fa-mountain-sun',
    color: 'teal',
    provider: 'manual',
    providerCategoryId: 'geography-nature',
    aliases: ['جغرافیا', 'طبیعت', 'Geography', 'Geography & Nature']
  },
  {
    order: 4,
    slug: 'science-technology',
    name: 'Science & Technology',
    displayName: 'علوم و فناوری',
    description: 'کشفیات علمی، نوآوری‌های فنی و پیشرفت‌های روز.',
    icon: 'fa-atom',
    color: 'indigo',
    provider: 'manual',
    providerCategoryId: 'science-technology',
    aliases: ['علم', 'فناوری', 'Science', 'Science & Technology']
  },
  {
    order: 5,
    slug: 'literature-language',
    name: 'Literature & Language',
    displayName: 'ادبیات و زبان',
    description: 'نویسندگان، آثار ادبی و دنیای زبان‌ها و واژگان.',
    icon: 'fa-feather-pointed',
    color: 'purple',
    provider: 'manual',
    providerCategoryId: 'literature-language',
    aliases: ['ادبیات', 'زبان', 'Literature', 'Literature & Language']
  },
  {
    order: 6,
    slug: 'movies-series',
    name: 'Movies & Series',
    displayName: 'فیلم و سریال',
    description: 'سینما، تلویزیون و داستان‌های ماندگار پرده نقره‌ای.',
    icon: 'fa-clapperboard',
    color: 'yellow',
    provider: 'manual',
    providerCategoryId: 'movies-series',
    aliases: ['فیلم', 'سریال', 'Movies', 'Movies & Series']
  },
  {
    order: 7,
    slug: 'sports',
    name: 'Sports',
    displayName: 'ورزش',
    description: 'رشته‌ها، قهرمانان و رویدادهای مهم ورزشی.',
    icon: 'fa-medal',
    color: 'red',
    provider: 'manual',
    providerCategoryId: 'sports',
    aliases: ['ورزش', 'Sport', 'Sports']
  },
  {
    order: 8,
    slug: 'entertainment',
    name: 'Entertainment',
    displayName: 'سرگرمی',
    description: 'بازی‌ها، پازل‌ها و موضوعات سرگرم‌کننده برای اوقات فراغت.',
    icon: 'fa-gamepad',
    color: 'pink',
    provider: 'manual',
    providerCategoryId: 'entertainment',
    aliases: ['سرگرمی', 'تفریح', 'Entertainment']
  }
]);

const STATIC_CATEGORY_NAMES = Object.freeze(
  STATIC_CATEGORY_DEFINITIONS
    .map((category) => {
      if (!category) return '';
      const label = category.displayName || category.name || '';
      return typeof label === 'string' ? label.trim() : '';
    })
    .filter((label) => label.length > 0)
);

const STATIC_CATEGORY_LIST_LABEL = STATIC_CATEGORY_NAMES.join('، ');

const STATIC_CATEGORY_ALIAS_LOOKUP = (() => {
  const map = new Map();
  const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

  STATIC_CATEGORY_DEFINITIONS.forEach((category) => {
    const aliasSet = new Set([
      category.slug,
      category.name,
      category.displayName,
      category.providerCategoryId,
      ...(Array.isArray(category.aliases) ? category.aliases : [])
    ]);

    aliasSet.forEach((alias) => {
      const key = normalize(alias);
      if (!key) return;
      if (!map.has(key)) map.set(key, category);
    });
  });

  return map;
})();

function normalizeStaticCategoryKey(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

function resolveStaticCategoryDefinition(candidate) {
  if (!candidate) return null;

  if (typeof candidate === 'string') {
    const key = normalizeStaticCategoryKey(candidate);
    if (!key) return null;
    return STATIC_CATEGORY_ALIAS_LOOKUP.get(key) || null;
  }

  if (typeof candidate === 'object') {
    const candidates = [];
    if (Object.prototype.hasOwnProperty.call(candidate, 'slug')) candidates.push(candidate.slug);
    if (Object.prototype.hasOwnProperty.call(candidate, 'providerCategoryId')) candidates.push(candidate.providerCategoryId);
    if (Object.prototype.hasOwnProperty.call(candidate, 'id')) candidates.push(candidate.id);
    if (Object.prototype.hasOwnProperty.call(candidate, 'name')) candidates.push(candidate.name);
    if (Object.prototype.hasOwnProperty.call(candidate, 'displayName')) candidates.push(candidate.displayName);
    if (Object.prototype.hasOwnProperty.call(candidate, 'title')) candidates.push(candidate.title);
    if (Array.isArray(candidate.aliases)) candidates.push(...candidate.aliases);

    for (const entry of candidates) {
      const match = resolveStaticCategoryDefinition(entry);
      if (match) return match;
    }
  }

  return null;
}

function mergeCategoryWithStaticDefinition(category) {
  if (!category) return null;
  const canonical = resolveStaticCategoryDefinition(category);
  if (!canonical) return null;

  const aliasSet = new Set();
  if (Array.isArray(category.aliases)) {
    category.aliases.forEach((alias) => {
      const normalized = typeof alias === 'string' ? alias.trim() : '';
      if (normalized) aliasSet.add(normalized);
    });
  }
  if (Array.isArray(canonical.aliases)) {
    canonical.aliases.forEach((alias) => {
      const normalized = typeof alias === 'string' ? alias.trim() : '';
      if (normalized) aliasSet.add(normalized);
    });
  }
  aliasSet.add(canonical.name);
  aliasSet.add(canonical.displayName);

  const description = category.description && String(category.description).trim()
    ? String(category.description).trim()
    : (canonical.description || '');

  return {
    ...category,
    name: canonical.name,
    displayName: canonical.displayName,
    title: canonical.displayName,
    slug: canonical.slug,
    provider: canonical.provider || category.provider || 'manual',
    providerCategoryId: canonical.providerCategoryId || canonical.slug,
    icon: canonical.icon,
    color: canonical.color,
    description,
    order: canonical.order,
    aliases: Array.from(aliasSet)
  };
}

const CATEGORY_MANAGEMENT_LOCKED = true;
const CATEGORY_LOCKED_MESSAGE = `دسته‌بندی‌های پیش‌فرض (${STATIC_CATEGORY_LIST_LABEL}) قابل افزودن یا حذف نیستند.`;
const CATEGORY_LOCKED_DESCRIPTION = `دسته‌بندی‌های پیش‌فرض شامل ${STATIC_CATEGORY_LIST_LABEL} هستند و به صورت خودکار مدیریت می‌شوند. در صورت نیاز به بروزرسانی با تیم فنی هماهنگ کنید.`;

const questionsCache = new Map();

const questionDetailModal = $('#question-detail-modal');
const questionDetailForm = $('#question-detail-form');
const questionOptionsWrapper = $('#question-options-wrapper');
const questionTitleEl = questionDetailModal ? questionDetailModal.querySelector('[data-question-title]') : null;
const questionIdEl = questionDetailModal ? questionDetailModal.querySelector('[data-question-id]') : null;
const questionMetaEl = questionDetailModal ? questionDetailModal.querySelector('[data-question-meta]') : null;
const questionCreatedEl = questionDetailModal ? questionDetailModal.querySelector('[data-question-created]') : null;
const questionUpdatedEl = questionDetailModal ? questionDetailModal.querySelector('[data-question-updated]') : null;
const questionCorrectPreviewEl = $('#question-correct-preview');
const updateQuestionBtn = $('#update-question-btn');
const updateQuestionBtnDefault = updateQuestionBtn ? updateQuestionBtn.innerHTML : '';
const importQuestionsBtn = $('#btn-import-questions');
const importQuestionsModal = $('#import-questions-modal');
const importQuestionsTextarea = $('#import-questions-json');
const importQuestionsFileInput = $('#import-questions-file');
const importQuestionsFileButton = $('#import-questions-file-btn');
const importQuestionsFileNameEl = $('#import-questions-file-name');
const importQuestionsPreviewEl = $('#import-questions-preview');
const importQuestionsErrorsEl = $('#import-questions-errors');
const importQuestionsSummaryEl = $('#import-questions-summary');
const importQuestionsSubmitBtn = $('#import-questions-submit');
const importQuestionsSubmitDefault = importQuestionsSubmitBtn ? importQuestionsSubmitBtn.innerHTML : '';
const filterCategorySelect = $('#filter-category');
const filterDifficultySelect = $('#filter-difficulty');
const filterSearchInput = $('#filter-search');
const filterSortSelect = $('#filter-sort');
const filterStatusSelect = $('#filter-status');
const filterTypeToggle = $('#filter-type-toggle');
const filterTypeHelper = $('#filter-type-helper');
const filterApprovedOnlyToggle = $('#filter-approved-only');
const filterApprovedHelper = $('#filter-approved-helper');
const questionStatsCard = document.querySelector('[data-dashboard-card="questions"]');
const questionTotalEl = $('#dashboard-question-total');
const questionTrendEl = $('#dashboard-question-trend');
const questionTodayEl = $('#dashboard-question-today');
const questionYesterdayEl = $('#dashboard-question-yesterday');
const questionStatsTotalEl = $('#question-stats-total');
const questionStatsTodayEl = $('#question-stats-today');
const questionStatsYesterdayEl = $('#question-stats-yesterday');
const questionStatsPercentEl = $('#question-stats-percent');
const questionStatsDeltaEl = $('#question-stats-delta');
const questionStatsSummaryEl = $('#question-stats-summary');
const questionStatsDescriptionEl = $('#question-stats-description');
const dashboardUsersActiveEl = $('#dashboard-users-active');
const dashboardUsersDeltaEl = $('#dashboard-users-delta');
const dashboardUsersTotalLabelEl = $('#dashboard-users-total');
const dashboardCategoriesTotalEl = $('#dashboard-categories-total');
const dashboardCategoriesPendingEl = $('#dashboard-categories-pending');
const dashboardCategoriesActiveEl = $('#dashboard-categories-active');
const dashboardCategoriesWithQuestionsEl = $('#dashboard-categories-with-questions');
const dashboardAdsActiveEl = $('#dashboard-ads-active');
const dashboardAdsStatusEl = $('#dashboard-ads-status');
const dashboardAdsTotalEl = $('#dashboard-ads-total');
const dashboardAdsPausedEl = $('#dashboard-ads-paused');
const dashboardUsersChartEl = $('#dashboard-users-chart');
const dashboardUsersChartEmptyEl = $('#dashboard-users-chart-empty');
const dashboardUsersAverageEl = $('#dashboard-users-average');
const dashboardTopCategoriesEl = $('#dashboard-top-categories');
const dashboardTopCategoriesEmptyEl = $('#dashboard-top-categories-empty');
const dashboardTopCategoriesTotalEl = $('#dashboard-top-categories-total');
const dashboardActivityListEl = $('#dashboard-activity-list');
const dashboardActivityEmptyEl = $('#dashboard-activity-empty');
const dashboardOverviewState = {
  loading: false,
  loaded: false,
  data: null,
  promise: null
};

const CATEGORY_COLOR_GRADIENTS = {
  blue: 'from-blue-500 to-blue-400',
  green: 'from-green-500 to-green-400',
  orange: 'from-orange-500 to-orange-400',
  purple: 'from-purple-500 to-purple-400',
  yellow: 'from-yellow-500 to-amber-400',
  pink: 'from-pink-500 to-pink-400',
  red: 'from-red-500 to-red-400',
  teal: 'from-teal-500 to-teal-400',
  indigo: 'from-indigo-500 to-indigo-400'
};

const CATEGORY_COLOR_VARIANTS = new Set(['blue', 'green', 'orange', 'purple', 'yellow', 'pink', 'red', 'teal', 'indigo']);

const ACTIVITY_ACCENTS = {
  emerald: { iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-300' },
  sky: { iconBg: 'bg-sky-500/20', iconColor: 'text-sky-300' },
  amber: { iconBg: 'bg-amber-500/20', iconColor: 'text-amber-300' },
  violet: { iconBg: 'bg-violet-500/20', iconColor: 'text-violet-300' },
  rose: { iconBg: 'bg-rose-500/20', iconColor: 'text-rose-300' },
  slate: { iconBg: 'bg-slate-500/20', iconColor: 'text-slate-200' }
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' });
const persianWeekdayFormatter = new Intl.DateTimeFormat('fa-IR', { weekday: 'short' });
const persianDateFormatter = new Intl.DateTimeFormat('fa-IR', { month: '2-digit', day: '2-digit' });
const addQuestionModal = $('#add-question-modal');
const addQuestionTextInput = $('#add-question-text');
const addQuestionCategorySelect = $('#add-question-category');
const addQuestionDifficultySelect = $('#add-question-difficulty');
const addQuestionActiveInput = $('#add-question-active');
const addQuestionOptionsWrapper = addQuestionModal ? addQuestionModal.querySelector('.options-wrapper') : null;
const saveQuestionBtn = $('#save-question-btn');
const saveQuestionBtnDefault = saveQuestionBtn ? saveQuestionBtn.innerHTML : '';
const questionDetailCategorySelect = $('#question-detail-category');
const questionDetailDifficultySelect = $('#question-detail-difficulty');
const questionDetailActiveToggle = $('#question-detail-active');
const questionDetailAuthorInput = $('#question-detail-author');
const questionDetailStatusSelect = $('#question-detail-status');
const questionDetailNotesInput = $('#question-detail-notes');
const addQuestionAuthorInput = $('#add-question-author');
const pendingCommunityCountEl = $('#pending-community-count');
const viewPendingQuestionsBtn = $('#btn-view-pending-questions');
const questionCategoryStatsCard = $('#question-category-stats-card');
const questionCategoryStatsGrid = $('#question-category-stats-grid');
const questionCategoryStatsEmptyEl = $('#question-category-stats-empty');
const questionCategoryStatsTotalEl = $('#question-category-stats-total');
const questionCategoryStatsCategoriesEl = $('#question-category-stats-categories');
const questionCategoryStatsManageBtn = $('#question-category-stats-manage');
const questionCategoryStatsScrollEl = $('#question-category-stats-scroll');
const categoriesGridEl = $('#categories-grid');
const categoriesLoadingEl = $('#categories-loading-state');
const categoriesEmptyEl = $('#categories-empty-state');
const categoriesEmptyActionBtn = categoriesEmptyEl ? categoriesEmptyEl.querySelector('[data-action="open-create-category"]') : null;
const categoriesEmptyTitleEl = categoriesEmptyEl ? categoriesEmptyEl.querySelector('[data-categories-empty-title]') : null;
const categoriesEmptyDescriptionEl = categoriesEmptyEl ? categoriesEmptyEl.querySelector('[data-categories-empty-description]') : null;
const addCategoryBtn = $('#btn-add-category');
const categoryModal = $('#add-category-modal');
const categoryModalTitleEl = categoryModal ? categoryModal.querySelector('[data-category-modal-title]') : null;
const categoryNameInput = categoryModal ? categoryModal.querySelector('[data-category-field="name"]') : null;
const categoryDescriptionInput = categoryModal ? categoryModal.querySelector('[data-category-field="description"]') : null;
const categoryIconSelect = categoryModal ? categoryModal.querySelector('[data-category-field="icon"]') : null;
const categoryColorSelect = categoryModal ? categoryModal.querySelector('[data-category-field="color"]') : null;
const saveCategoryBtn = $('#save-category-btn');
const categoryModalDefaultTitle = categoryModalTitleEl ? categoryModalTitleEl.textContent.trim() : 'افزودن دسته‌بندی جدید';
const categoryModalEditTitle = 'ویرایش دسته‌بندی';
const CATEGORY_MODAL_LABELS = {
  create: saveCategoryBtn ? saveCategoryBtn.textContent.trim() : 'ذخیره دسته‌بندی',
  edit: 'ذخیره تغییرات'
};
const categoryIconDefaultValue = categoryIconSelect ? categoryIconSelect.value : 'fa-globe';
const categoryColorDefaultValue = categoryColorSelect ? categoryColorSelect.value : 'blue';

function updateCategoryCreationControls(isAuthenticated) {
  const effectiveAuth = typeof isAuthenticated === 'boolean' ? isAuthenticated : Boolean(getToken && getToken());
  const creationDisabled = CATEGORY_MANAGEMENT_LOCKED || !effectiveAuth;

  if (addCategoryBtn) {
    addCategoryBtn.disabled = creationDisabled;
    addCategoryBtn.classList.toggle('opacity-60', creationDisabled);
    addCategoryBtn.classList.toggle('cursor-not-allowed', creationDisabled);
    if (creationDisabled) {
      addCategoryBtn.title = CATEGORY_LOCKED_MESSAGE;
    } else {
      addCategoryBtn.removeAttribute('title');
    }
  }

  if (categoriesEmptyActionBtn) {
    categoriesEmptyActionBtn.disabled = creationDisabled;
    categoriesEmptyActionBtn.classList.toggle('opacity-50', creationDisabled);
    categoriesEmptyActionBtn.classList.toggle('cursor-not-allowed', creationDisabled);
    if (creationDisabled) {
      categoriesEmptyActionBtn.title = CATEGORY_LOCKED_MESSAGE;
    } else {
      categoriesEmptyActionBtn.removeAttribute('title');
    }
  }
}

function notifyCategoryManagementLocked(type = 'info') {
  if (!CATEGORY_MANAGEMENT_LOCKED) return false;
  showToast(CATEGORY_LOCKED_MESSAGE, type);
  return true;
}

updateCategoryCreationControls();

function setCategoryFormLockState(isLocked) {
  if (categoryNameInput) {
    categoryNameInput.readOnly = isLocked;
    categoryNameInput.setAttribute('aria-readonly', isLocked ? 'true' : 'false');
    categoryNameInput.classList.toggle('cursor-not-allowed', isLocked);
    categoryNameInput.classList.toggle('opacity-60', isLocked);
  }
  if (categoryIconSelect) {
    categoryIconSelect.disabled = isLocked;
    categoryIconSelect.classList.toggle('opacity-60', isLocked);
    categoryIconSelect.classList.toggle('cursor-not-allowed', isLocked);
  }
  if (categoryColorSelect) {
    categoryColorSelect.disabled = isLocked;
    categoryColorSelect.classList.toggle('opacity-60', isLocked);
    categoryColorSelect.classList.toggle('cursor-not-allowed', isLocked);
  }
}

setCategoryFormLockState(CATEGORY_MANAGEMENT_LOCKED);

const adsGridEl = $('#ads-grid');
const adsEmptyStateEl = $('#ads-empty-state');
const adsLoadingEl = $('#ads-loading-state');
const adsPlacementFilterButtons = $$('#ads-placement-filters [data-ads-filter-placement]');
const adsStatusFilterButtons = $$('#ads-status-filters [data-ads-filter-status]');
const adsSearchInput = $('#ads-search');
const adsEmptyTitleEl = adsEmptyStateEl ? adsEmptyStateEl.querySelector('h3') : null;
const adsEmptyDescriptionEl = adsEmptyStateEl ? adsEmptyStateEl.querySelector('p') : null;
const adsStatsElements = {
  total: document.querySelector('[data-ads-stat="total"]'),
  active: document.querySelector('[data-ads-stat="active"]'),
  scheduled: document.querySelector('[data-ads-stat="scheduled"]'),
  inactive: document.querySelector('[data-ads-stat="inactive"]')
};
const addAdButton = $('#btn-add-ad');
const adsEmptyCreateButton = adsEmptyStateEl ? adsEmptyStateEl.querySelector('[data-action="open-ad-modal"]') : null;
const adModal = $('#ad-modal');
const adModalTitle = adModal ? adModal.querySelector('[data-ad-modal-title]') : null;
const adModalDescription = adModal ? adModal.querySelector('[data-ad-modal-description]') : null;
const adForm = $('#ad-form');
const adNameInput = $('#ad-name');
const adPlacementSelect = $('#ad-placement-select');
const adStatusSelect = $('#ad-status');
const adPriorityInput = $('#ad-priority');
const adStartInput = $('#ad-start-date');
const adEndInput = $('#ad-end-date');
const adCreativeInput = $('#ad-creative-url');
const adLandingInput = $('#ad-landing-url');
const adHeadlineInput = $('#ad-headline');
const adDescriptionInput = $('#ad-description');
const adCtaInput = $('#ad-cta');
const adRewardTypeSelect = $('#ad-reward-type');
const adRewardAmountInput = $('#ad-reward-amount');
const adProvinceOptionsEl = $('#ad-province-options');
const adSubmitBtn = $('#ad-submit-btn');
const adSubmitBtnDefault = adSubmitBtn ? adSubmitBtn.innerHTML : '';
const adModalScroll = adForm ? adForm.querySelector('.ad-modal-scroll') : null;
const adModalHelperCreative = adModal ? adModal.querySelector('[data-ad-helper="creative"]') : null;
const adModalSections = adModal ? Array.from(adModal.querySelectorAll('[data-show-placements]')) : [];

const shopSettingsPage = $('#page-shop-settings') || $('#shop-settings-card');
const shopGlobalToggle = $('#shop-enable-toggle');
const shopStatusChip = shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-status-chip]') : null;
const shopStatusLabel = shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-status-label]') : null;
const shopLastUpdateEl = shopSettingsPage ? shopSettingsPage.querySelector('#shop-last-update') : null;
const shopSummaryElements = {
  status: shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-summary="status"]') : null,
  packages: shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-summary="packages"]') : null,
  shortcuts: shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-summary="shortcuts"]') : null,
  vip: shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-summary="vip"]') : null
};
const shopGlobalStatusLabel = shopSettingsPage ? shopSettingsPage.querySelector('#shop-global-status') : null;
const shopHeroPreview = shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-hero-preview]') : null;
const shopHeroPreviewTitle = shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-preview-title]') : null;
const shopHeroPreviewSubtitle = shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-preview-subtitle]') : null;
const shopPreviewCta = $('#shop-preview-cta');
const shopPreviewCtaLabel = shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-preview-cta-label]') : null;
const shopPreviewHelper = shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-preview-helper]') : null;
const shopHeroTitleInput = $('#shop-hero-title');
const shopHeroSubtitleInput = $('#shop-hero-subtitle');
const shopHeroCtaInput = $('#shop-hero-cta');
const shopHeroLinkInput = $('#shop-hero-cta-link');
const shopPricingCurrencySelect = $('#shop-pricing-currency');
const shopLowBalanceThresholdInput = $('#shop-low-balance-threshold');
const shopQuickTopupToggle = $('#shop-quick-topup');
const shopQuickPurchaseToggle = $('#shop-quick-purchase');
const shopSupportMessageInput = $('#shop-support-message');
const shopSupportLinkInput = $('#shop-support-link');
const shopPackageCards = shopSettingsPage ? Array.from(shopSettingsPage.querySelectorAll('[data-shop-package]')) : [];
const shopVipSection = shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-vip-section]') : null;
const shopVipToggle = $('#shop-vip-enable');
const shopVipAutoRenewToggle = $('#shop-vip-auto-renew');
const shopVipAutoApproveToggle = $('#shop-vip-auto-approve');
const shopVipBillingSelect = $('#shop-vip-billing');
const shopVipPriceInput = $('#shop-vip-price');
const shopVipTrialDaysInput = $('#shop-vip-trial-days');
const shopVipSlotsInput = $('#shop-vip-slots');
const shopVipBenefitsInput = $('#shop-vip-benefits');
const shopVipStatusLabel = shopVipSection ? shopVipSection.querySelector('[data-vip-status-label]') : null;
const shopVipPreviewCard = shopVipSection ? shopVipSection.querySelector('[data-vip-preview]') : null;
const shopVipPreviewPrice = shopVipSection ? shopVipSection.querySelector('[data-vip-preview-price]') : null;
const shopVipPreviewCycle = shopVipSection ? shopVipSection.querySelector('[data-vip-preview-cycle]') : null;
const shopVipPreviewState = shopVipSection ? shopVipSection.querySelector('[data-vip-preview-state]') : null;
const shopVipPreviewPerks = shopVipSection ? shopVipSection.querySelector('[data-vip-preview-perks]') : null;
const shopVipPreviewNote = shopVipSection ? shopVipSection.querySelector('[data-vip-preview-note]') : null;
const shopVipMetricElements = shopVipSection ? Array.from(shopVipSection.querySelectorAll('[data-vip-metric]')) : [];
const shopVipPerkCheckboxes = shopVipSection ? Array.from(shopVipSection.querySelectorAll('input[data-vip-perk]')) : [];
const shopState = {
  initialized: false,
  lastUpdated: null
};
const SHOP_CURRENCY_LABELS = {
  coin: 'سکه بازی',
  wallet: 'سکه کیف پول',
  rial: 'تومان'
};
const settingsSaveButton = $('#settings-save-button');
const generalAppNameInput = $('#settings-app-name');
const generalLanguageSelect = $('#settings-language');
const generalQuestionTimeInput = $('#settings-question-time');
const generalMaxQuestionsInput = $('#settings-max-questions');
const rewardPointsCorrectInput = $('#settings-points-correct');
const rewardCoinsCorrectInput = $('#settings-coins-correct');
const rewardPointsStreakInput = $('#settings-points-streak');
const rewardCoinsStreakInput = $('#settings-coins-streak');

const questionFilters = {
  category: '',
  difficulty: '',
  provider: '',
  status: '',
  search: '',
  sort: 'newest',
  type: undefined,
  approvedOnly: undefined,
  duplicates: 'all',
  reviewMode: 'default'
};

const questionsState = {
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1
  },
  loading: false,
  meta: {}
};

const questionsPaginationContainer = $('#questions-pagination');

let questionsRequestToken = 0;

function getQuestionsTotalPages(pagination = questionsState.pagination) {
  if (!pagination) return 1;
  const total = Math.max(0, Number(pagination.total) || 0);
  const limit = Math.max(1, Number(pagination.limit) || 50);
  const fallback = Math.ceil(total / limit) || 1;
  const candidate = Number.isFinite(Number(pagination.totalPages))
    ? Number(pagination.totalPages)
    : fallback;
  return Math.max(1, Math.round(candidate) || fallback || 1);
}

function computeQuestionsPaginationSequence(totalPages, currentPage, maxLength = 7) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeCurrent = Math.min(Math.max(1, Number(currentPage) || 1), safeTotalPages);
  if (safeTotalPages <= maxLength) {
    return Array.from({ length: safeTotalPages }, (_, index) => index + 1);
  }

  const siblings = Math.max(1, Math.floor((maxLength - 3) / 2));
  let left = Math.max(2, safeCurrent - siblings);
  let right = Math.min(safeTotalPages - 1, safeCurrent + siblings);

  if (safeCurrent - 1 <= siblings) {
    right = Math.min(safeTotalPages - 1, 1 + siblings * 2);
  } else if (safeTotalPages - safeCurrent <= siblings) {
    left = Math.max(2, safeTotalPages - siblings * 2);
  }

  const sequence = [1];
  if (left > 2) {
    sequence.push('ellipsis');
  }

  for (let page = left; page <= right; page += 1) {
    sequence.push(page);
  }

  if (right < safeTotalPages - 1) {
    sequence.push('ellipsis');
  }

  sequence.push(safeTotalPages);
  return sequence;
}

function renderQuestionsPagination() {
  if (!questionsPaginationContainer) return;

  const pagination = questionsState.pagination || {};
  const total = Math.max(0, Number(pagination.total) || 0);
  const limit = Math.max(1, Number(pagination.limit) || 50);
  const totalPages = getQuestionsTotalPages(pagination) || Math.ceil(total / limit) || 1;
  const currentPage = Math.min(Math.max(1, Number(pagination.page) || 1), totalPages);
  const isLoading = Boolean(questionsState.loading);

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;
  const sequence = computeQuestionsPaginationSequence(totalPages, currentPage);

  const parts = [];
  parts.push(`
    <button type="button" class="${prevDisabled ? 'disabled ' : ''}pagination-prev" data-direction="prev" aria-label="صفحه قبل" ${prevDisabled ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `.trim());

  sequence.forEach((item) => {
    if (item === 'ellipsis') {
      parts.push('<span class="ellipsis">…</span>');
      return;
    }
    const pageNumber = Number(item);
    if (!Number.isFinite(pageNumber) || pageNumber < 1) return;
    const isActive = pageNumber === currentPage;
    const shouldDisable = isActive;
    const classes = isActive ? ' class="active"' : '';
    const disabledAttr = shouldDisable ? ' disabled' : '';
    const label = formatNumberFa(pageNumber);
    parts.push(`<button type="button" data-page="${pageNumber}"${classes}${disabledAttr} aria-label="صفحه ${label}">${label}</button>`);
  });

  parts.push(`
    <button type="button" class="${nextDisabled ? 'disabled ' : ''}pagination-next" data-direction="next" aria-label="صفحه بعد" ${nextDisabled ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-left"></i>
    </button>
  `.trim());

  questionsPaginationContainer.innerHTML = parts.join('');
  questionsPaginationContainer.setAttribute('aria-busy', isLoading ? 'true' : 'false');
}

renderQuestionsPagination();

const duplicatesViewTabs = $$('#questions-view-tabs [data-questions-view]');
const duplicatesViewCard = $('#duplicates-view-card');
const duplicatesGroupsContainer = $('#duplicates-groups-container');
const duplicatesEmptyState = $('#duplicates-empty-state');
const duplicatesTotalEl = $('#duplicates-total');
const duplicatesBulkDeleteBtn = $('#duplicates-bulk-delete');
const filterDuplicatesSelect = $('#filter-duplicates');
const duplicatesSelectedCountEl = $('#duplicates-selected-count');
const questionsTableCard = $('#questions-table-card');

const duplicatesState = {
  groups: [],
  loading: false,
  selected: new Set(),
  view: 'list',
  lastLoadedAt: 0
};

const importQuestionsState = {
  raw: '',
  fileName: '',
  questions: [],
  errors: [],
  total: 0,
  importing: false,
  parsing: false,
  parseProgress: null
};

let importQuestionsDebounce = null;
let importQuestionsProcessingToken = 0;

let filterSearchDebounce;
let latestQuestionStats = null;
let questionStatsLoaded = false;
let cachedCategories = [];
let categoriesLoading = false;

const adsState = {
  items: [],
  loading: false,
  filters: {
    placement: 'all',
    status: 'all',
    search: ''
  },
  provinces: [],
  modalMode: 'create',
  editingId: null
};

let adsSearchDebounce;

const userFilterRoleSelect = $('#user-filter-role');
const userFilterStatusSelect = $('#user-filter-status');
const userFilterSearchInput = $('#user-filter-search');
const userFilterSortSelect = $('#user-filter-sort');
const userFilterProvinceSelect = $('#user-filter-province');
const usersTableBody = $('#users-tbody');
const addUserUsernameInput = $('#add-user-username');
const addUserEmailInput = $('#add-user-email');
const addUserPasswordInput = $('#add-user-password');
const addUserRoleSelect = $('#add-user-role');
const addUserProvinceSelect = $('#add-user-province');

const usersState = {
  filters: {
    role: userFilterRoleSelect ? userFilterRoleSelect.value : '',
    status: userFilterStatusSelect ? userFilterStatusSelect.value : '',
    province: userFilterProvinceSelect ? userFilterProvinceSelect.value : '',
    sort: userFilterSortSelect ? userFilterSortSelect.value || 'newest' : 'newest',
    search: userFilterSearchInput ? userFilterSearchInput.value.trim() : ''
  },
  pagination: {
    page: 1,
    limit: 50
  },
  provinces: [],
  provincesPromise: null
};

let userSearchDebounce;

function updateDuplicateBulkDeleteState() {
  if (!duplicatesBulkDeleteBtn) return;
  const count = duplicatesState.selected.size;
  if (duplicatesSelectedCountEl) {
    duplicatesSelectedCountEl.textContent = formatNumberFa(count);
  }
  duplicatesBulkDeleteBtn.disabled = count === 0;
  if (duplicatesState.view === 'duplicates') {
    duplicatesBulkDeleteBtn.classList.remove('hidden');
  } else {
    duplicatesBulkDeleteBtn.classList.add('hidden');
  }
}

function setQuestionsView(view) {
  const normalized = view === 'duplicates' ? 'duplicates' : 'list';
  duplicatesState.view = normalized;
  duplicatesViewTabs.forEach((button) => {
    if (!button) return;
    const buttonView = button.dataset.questionsView === 'duplicates' ? 'duplicates' : 'list';
    const isActive = buttonView === normalized;
    button.classList.toggle('btn-primary', isActive);
    button.classList.toggle('btn-secondary', !isActive);
  });

  if (questionsTableCard) {
    questionsTableCard.classList.toggle('hidden', normalized === 'duplicates');
  }
  if (duplicatesViewCard) {
    duplicatesViewCard.classList.toggle('hidden', normalized !== 'duplicates');
  }

  updateDuplicateBulkDeleteState();

  if (normalized === 'duplicates') {
    loadDuplicateGroups();
  }
}

function renderDuplicateGroups() {
  if (!duplicatesGroupsContainer) return;

  if (duplicatesState.loading) {
    duplicatesGroupsContainer.innerHTML = `
      <div class="loading-state">
        <span class="loading-spinner"></span>
        <p>در حال دریافت لیست سوالات تکراری...</p>
      </div>
    `;
    if (duplicatesEmptyState) duplicatesEmptyState.classList.add('hidden');
    if (duplicatesTotalEl) duplicatesTotalEl.textContent = '—';
    return;
  }

  const groups = Array.isArray(duplicatesState.groups) ? duplicatesState.groups : [];
  if (!groups.length) {
    duplicatesGroupsContainer.innerHTML = '';
    if (duplicatesEmptyState) duplicatesEmptyState.classList.remove('hidden');
    if (duplicatesTotalEl) duplicatesTotalEl.textContent = '۰';
    updateDuplicateBulkDeleteState();
    return;
  }

  if (duplicatesEmptyState) duplicatesEmptyState.classList.add('hidden');
  if (duplicatesTotalEl) duplicatesTotalEl.textContent = formatNumberFa(groups.length);

  const fragment = document.createDocumentFragment();

  groups.forEach((group) => {
    const questions = Array.isArray(group?.questions) ? group.questions : [];
    if (!questions.length) return;

    const wrapper = document.createElement('article');
    wrapper.className = 'duplicate-group-card glass rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-black/10 flex flex-col gap-6';

    const newestQuestion = questions[0] || {};
    const title = newestQuestion.text || newestQuestion.question || 'سوال تکراری';
    const latestCreatedAt = formatDateTime(newestQuestion.createdAt);
    const groupUid = typeof group?.uid === 'string' ? group.uid : '';
    const totalCount = Number.isFinite(Number(group?.count)) ? Number(group.count) : questions.length;
    const countLabel = formatNumberFa(totalCount);
    const referenceId = newestQuestion.displayId || newestQuestion.publicId || newestQuestion.uid || newestQuestion.legacyId || newestQuestion._id || '';

    const itemsHtml = questions.map((question, index) => {
      const id = typeof question?.legacyId === 'string' && question.legacyId
        ? question.legacyId
        : (typeof question?._id === 'string' ? question._id : '');
      if (!id) return '';

      const isSelected = duplicatesState.selected.has(id);
      const checkedAttr = isSelected ? 'checked' : '';
      const questionText = escapeHtml(question.text || question.question || 'سوال بدون متن');
      const displayIdRaw = question.displayId || question.publicId || question.uid || id;
      const displayId = escapeHtml(displayIdRaw.length > 14 ? `${displayIdRaw.slice(0, 6)}…${displayIdRaw.slice(-4)}` : displayIdRaw);
      const difficultyMeta = DIFFICULTY_META[question.difficulty] || DIFFICULTY_META.medium;
      const sourceKey = typeof question.source === 'string' ? question.source.toLowerCase() : 'manual';
      const sourceMeta = SOURCE_META[sourceKey] || SOURCE_META.manual;
      const statusKey = question.status || (question.active === false ? 'inactive' : 'active');
      const statusMeta = STATUS_META[statusKey] || STATUS_META.active;
      const createdLabel = formatDateTime(question.createdAt);
      const categoryLabel = question.categoryName ? escapeHtml(question.categoryName) : '';
      const langLabel = question.lang ? escapeHtml(String(question.lang).toUpperCase()) : '';
      const authorLabel = question.authorName ? escapeHtml(question.authorName) : '';
      const inactiveChip = question.active === false
        ? '<span class="px-2 py-1 rounded-xl bg-rose-500/20 text-rose-100 text-xs font-semibold flex items-center gap-1"><i class="fas fa-ban"></i>غیرفعال</span>'
        : '';
      const approvalChip = question.isApproved === false
        ? '<span class="px-2 py-1 rounded-xl bg-amber-500/20 text-amber-100 text-xs font-semibold flex items-center gap-1"><i class="fas fa-clock"></i>در انتظار تایید</span>'
        : '';
      const isPrimary = index === 0;
      const primaryChip = isPrimary
        ? '<span class="px-2 py-1 rounded-xl bg-emerald-500/20 text-emerald-100 text-xs font-semibold flex items-center gap-1"><i class="fas fa-star"></i>نسخه پیشنهادی برای نگه‌داری</span>'
        : '';
      const answerIndex = Number.isInteger(question.correctIdx)
        ? question.correctIdx
        : Number.isInteger(question.correctIndex)
          ? question.correctIndex
          : Number.isInteger(question.answerIndex)
            ? question.answerIndex
            : Number.parseInt(question.correctIdx ?? question.correctIndex ?? question.answerIndex ?? 0, 10) || 0;
      const options = Array.isArray(question.options) ? question.options : Array.isArray(question.choices) ? question.choices : [];
      const normalizedAnswerIndex = Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < options.length
        ? answerIndex
        : 0;

      const optionsHtml = options.map((option, optionIdx) => {
        const value = escapeHtml(option || `گزینه ${optionIdx + 1}`);
        const isCorrect = optionIdx === normalizedAnswerIndex;
        const correctBadge = isCorrect
          ? '<span class="ml-auto text-xs font-bold text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><i class="fas fa-check"></i>پاسخ صحیح</span>'
          : '';
        return `
          <li class="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/5 bg-white/5 text-sm text-slate-100 ${isCorrect ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100 font-semibold' : ''}">
            <span class="text-xs font-mono text-white/60">${formatNumberFa(optionIdx + 1)}.</span>
            <span class="flex-1 leading-relaxed">${value}</span>
            ${correctBadge}
          </li>
        `;
      }).join('');

      const itemClasses = [
        'duplicate-entry flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4 shadow-lg shadow-black/10 transition hover:border-emerald-400/40 hover:shadow-emerald-500/10',
        isPrimary ? 'ring-1 ring-emerald-400/40 bg-emerald-500/5' : ''
      ].filter(Boolean).join(' ');

      return `
        <li class="${itemClasses}" data-duplicate-question-id="${escapeHtml(id)}">
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div class="flex items-start gap-3">
              <label class="flex items-center gap-2 text-sm font-medium text-white/70">
                <input type="checkbox" data-duplicate-id="${escapeHtml(id)}" ${checkedAttr}>
                <span class="hidden sm:inline">انتخاب</span>
              </label>
              <div class="flex flex-col gap-2">
                <h4 class="text-base font-bold text-white leading-snug">${questionText}</h4>
                <div class="flex flex-wrap items-center gap-2 text-xs">
                  ${categoryLabel ? `<span class="px-2 py-1 rounded-xl bg-white/10 text-white flex items-center gap-1"><i class="fas fa-layer-group"></i>${categoryLabel}</span>` : ''}
                  <span class="${difficultyMeta.class} flex items-center gap-1"><i class="fas ${difficultyMeta.icon}"></i>${escapeHtml(difficultyMeta.label)}</span>
                  <span class="${sourceMeta.class} flex items-center gap-1"><i class="fas ${sourceMeta.icon}"></i>${escapeHtml(sourceMeta.label)}</span>
                  <span class="${statusMeta.class} flex items-center gap-1"><span class="status-dot ${statusMeta.dot}"></span>${escapeHtml(statusMeta.label)}</span>
                  ${inactiveChip}
                  ${approvalChip}
                  ${primaryChip}
                  ${langLabel ? `<span class="px-2 py-1 rounded-xl bg-white/10 text-white flex items-center gap-1"><i class="fas fa-language"></i>${langLabel}</span>` : ''}
                  ${authorLabel ? `<span class="px-2 py-1 rounded-xl bg-white/10 text-white flex items-center gap-1"><i class="fas fa-user-pen"></i>${authorLabel}</span>` : ''}
                </div>
                <div class="flex flex-wrap items-center gap-2 text-xs text-white/60">
                  <span class="px-2 py-1 rounded-xl bg-white/5 border border-white/10 font-mono">#${displayId}</span>
                  ${createdLabel ? `<span class="px-2 py-1 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1"><i class="fas fa-clock"></i>${escapeHtml(createdLabel)}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 self-end md:self-start">
              <button type="button" class="duplicate-item-action flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20 transition" data-duplicate-open-id="${escapeHtml(id)}">
                <i class="fas fa-eye"></i>
                <span>جزئیات</span>
              </button>
              <button type="button" class="duplicate-item-action flex items-center gap-2 rounded-xl bg-rose-500/20 px-3 py-1.5 text-sm font-semibold text-rose-100 hover:bg-rose-500/30 transition" data-duplicate-delete-id="${escapeHtml(id)}">
                <i class="fas fa-trash"></i>
                <span>حذف</span>
              </button>
            </div>
          </div>
          <ul class="duplicate-options grid grid-cols-1 gap-2 sm:grid-cols-2">
            ${optionsHtml}
          </ul>
        </li>
      `;
    }).filter(Boolean).join('');

    if (!itemsHtml) return;

    wrapper.innerHTML = `
      <header class="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-col gap-1">
          <h3 class="duplicate-group-title text-lg font-extrabold text-white leading-snug">${escapeHtml(title)}</h3>
          <p class="duplicate-group-subtitle text-sm text-white/70">
            ${formatNumberFa(questions.length)} نسخه مشابه · آخرین بروزرسانی ${escapeHtml(latestCreatedAt || '--')}
            ${referenceId ? ` · مرجع: ${escapeHtml(referenceId)}` : ''}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="duplicate-count-badge">${countLabel}</span>
          <button type="button" class="duplicate-group-action rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition" data-duplicate-group-select="all" data-duplicate-group-id="${escapeHtml(groupUid)}">انتخاب همه</button>
          <button type="button" class="duplicate-group-action rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-100 hover:bg-emerald-500/30 transition" data-duplicate-group-select="others" data-duplicate-group-id="${escapeHtml(groupUid)}">انتخاب بجز جدیدترین</button>
          <button type="button" class="duplicate-group-action rounded-xl bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/10 transition" data-duplicate-group-select="none" data-duplicate-group-id="${escapeHtml(groupUid)}">لغو انتخاب</button>
        </div>
      </header>
      <ul class="flex flex-col gap-4">
        ${itemsHtml}
      </ul>
    `;

    fragment.appendChild(wrapper);
  });

  duplicatesGroupsContainer.innerHTML = '';
  duplicatesGroupsContainer.appendChild(fragment);
  updateDuplicateBulkDeleteState();
}

function refreshDuplicateSelectionsUI() {
  if (!duplicatesGroupsContainer) return;
  duplicatesGroupsContainer.querySelectorAll('input[type="checkbox"][data-duplicate-id]').forEach((checkbox) => {
    const checkboxId = checkbox?.dataset?.duplicateId || '';
    checkbox.checked = duplicatesState.selected.has(checkboxId);
  });
}

function findDuplicateQuestionById(id) {
  const safeId = typeof id === 'string' ? id : '';
  if (!safeId) return null;
  for (const group of duplicatesState.groups || []) {
    if (!group?.questions) continue;
    for (const question of group.questions) {
      const questionId = typeof question?.legacyId === 'string' && question.legacyId
        ? question.legacyId
        : (typeof question?._id === 'string' ? question._id : '');
      if (questionId && questionId === safeId) {
        return question;
      }
    }
  }
  return null;
}

function handleDuplicateGroupSelection(groupId, mode) {
  const normalizedGroupId = typeof groupId === 'string' ? groupId : '';
  if (!normalizedGroupId) return;
  const normalizedMode = typeof mode === 'string' ? mode : 'all';

  const group = (duplicatesState.groups || []).find((entry) => {
    const uid = typeof entry?.uid === 'string' ? entry.uid : '';
    return uid === normalizedGroupId;
  });
  if (!group || !Array.isArray(group.questions) || !group.questions.length) return;

  const ids = group.questions
    .map((question) => (typeof question?.legacyId === 'string' && question.legacyId
      ? question.legacyId
      : (typeof question?._id === 'string' ? question._id : '')))
    .filter(Boolean);
  if (!ids.length) return;

  if (normalizedMode === 'none') {
    ids.forEach((identifier) => duplicatesState.selected.delete(identifier));
  } else if (normalizedMode === 'others') {
    ids.forEach((identifier, index) => {
      if (index === 0) duplicatesState.selected.delete(identifier);
      else duplicatesState.selected.add(identifier);
    });
  } else {
    ids.forEach((identifier) => duplicatesState.selected.add(identifier));
  }

  refreshDuplicateSelectionsUI();
  updateDuplicateBulkDeleteState();
}

async function loadDuplicateGroups(force = false) {
  if (!getToken()) {
    duplicatesState.groups = [];
    renderDuplicateGroups();
    return [];
  }

  const now = Date.now();
  if (!force && duplicatesState.groups.length && now - duplicatesState.lastLoadedAt < 60000) {
    renderDuplicateGroups();
    return duplicatesState.groups;
  }

  duplicatesState.loading = true;
  renderDuplicateGroups();

  try {
    const response = await api('/questions/duplicates');
    const rawGroups = Array.isArray(response?.data) ? response.data : [];
    duplicatesState.groups = rawGroups.map((group) => {
      const questions = Array.isArray(group?.questions)
        ? group.questions.map((item) => normalizeQuestion(item))
        : [];
      return {
        ...group,
        uid: typeof group?.uid === 'string' ? group.uid : '',
        count: Number.isFinite(Number(group?.count)) ? Number(group.count) : questions.length,
        questions
      };
    });
    duplicatesState.selected.clear();
    duplicatesState.lastLoadedAt = Date.now();
    duplicatesState.groups.forEach((group) => {
      if (!Array.isArray(group?.questions)) return;
      group.questions.forEach((question) => {
        const identifier = typeof question?.legacyId === 'string' && question.legacyId
          ? question.legacyId
          : (typeof question?._id === 'string' ? question._id : '');
        if (identifier) {
          questionsCache.set(identifier, question);
        }
      });
    });
    renderDuplicateGroups();
    return duplicatesState.groups;
  } catch (error) {
    duplicatesState.groups = [];
    renderDuplicateGroups();
    showToast(error.message || 'امکان دریافت لیست سوالات تکراری نبود', 'error');
    return [];
  } finally {
    duplicatesState.loading = false;
    updateDuplicateBulkDeleteState();
  }
}

async function handleDuplicatesBulkDelete() {
  if (!duplicatesState.selected.size) return;
  if (!getToken()) {
    showToast('برای مدیریت سوالات ابتدا وارد شوید', 'warning');
    return;
  }

  if (!confirm('آیا از حذف سوالات انتخاب شده اطمینان دارید؟')) return;

  const ids = Array.from(duplicatesState.selected);
  try {
    const response = await api('/questions/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
    const deleted = Number.isFinite(Number(response?.deleted)) ? Number(response.deleted) : ids.length;
    showToast(`${formatNumberFa(deleted)} سوال حذف شد`, 'success');
    duplicatesState.selected.clear();
    await Promise.all([
      loadDuplicateGroups(true),
      loadQuestions(),
      loadDashboardStats(true)
    ]);
  } catch (error) {
    console.error('Failed to bulk delete duplicates', error);
    showToast(error.message || 'حذف سوالات تکراری ناموفق بود', 'error');
  } finally {
    updateDuplicateBulkDeleteState();
  }
}

async function handleDuplicateSingleDelete(id) {
  const safeId = typeof id === 'string' ? id.trim() : '';
  if (!safeId) return;
  if (!getToken()) {
    showToast('برای مدیریت سوالات ابتدا وارد شوید', 'warning');
    return;
  }

  if (!confirm('آیا از حذف این سوال تکراری اطمینان دارید؟')) return;

  try {
    await api(`/questions/${safeId}`, { method: 'DELETE' });
    showToast('سوال انتخاب شده حذف شد', 'success');
    duplicatesState.selected.delete(safeId);
    await Promise.all([
      loadDuplicateGroups(true),
      loadQuestions(),
      loadDashboardStats(true)
    ]);
  } catch (error) {
    console.error('Failed to delete duplicate question', error);
    showToast(error.message || 'حذف سوال تکراری ناموفق بود', 'error');
  } finally {
    updateDuplicateBulkDeleteState();
  }
}

// --------------- IMPORT QUESTIONS HELPERS ---------------
function normalizeBooleanCandidate(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return fallback;
    return value > 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (['1', 'true', 'yes', 'y', 'on', 'active', 'فعال'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off', 'inactive', 'غیرفعال'].includes(normalized)) return false;
  }
  return fallback;
}

function generateClientQuestionId(index = 0) {
  const idx = Number.isFinite(index) && index >= 0 ? index + 1 : Math.floor(Math.random() * 1000);
  const idxPart = idx.toString(36).toUpperCase();
  let randomPart = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    randomPart = buffer[0].toString(36).toUpperCase();
  } else {
    randomPart = Math.random().toString(36).slice(2).toUpperCase();
  }
  const timePart = Date.now().toString(36).toUpperCase().slice(-4);
  return `TMP-${idxPart}-${timePart}${randomPart.slice(0, 6)}`;
}

function normalizeImportDifficulty(value) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return 'easy';
    if (['easy', 'ساده', 'آسون', 'آسان', 'light', 'beginner'].includes(normalized)) return 'easy';
    if (['medium', 'متوسط', 'normal', 'standard'].includes(normalized)) return 'medium';
    if (['hard', 'سخت', 'difficult', 'challenging', 'advanced'].includes(normalized)) return 'hard';
    if (['2', 'mid'].includes(normalized)) return 'medium';
    if (['3', '4', 'expert'].includes(normalized)) return 'hard';
    if (['0'].includes(normalized)) return 'easy';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'easy';
    if (value <= 1) return 'easy';
    if (value >= 3) return 'hard';
    return 'medium';
  }
  return 'easy';
}

function normalizeImportStatus(value, activeCandidate) {
  const fallback = normalizeBooleanCandidate(activeCandidate, true) ? 'approved' : 'draft';
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (['approved', 'active', 'accept', 'confirmed', 'تایید', 'تایید شده'].includes(normalized)) return 'approved';
  if (['pending', 'review', 'waiting', 'در انتظار', 'درحال بررسی', 'در حال بررسی'].includes(normalized)) return 'pending';
  if (['draft', 'inactive', 'disabled', 'غیرفعال', 'پیش نویس'].includes(normalized)) return 'draft';
  if (['rejected', 'declined', 'رد', 'cancelled'].includes(normalized)) return 'rejected';
  return fallback;
}

function normalizeImportSource(value) {
  if (typeof value !== 'string') return 'manual';
  const normalized = value.trim().toLowerCase();
  if (!normalized) return 'manual';
  if (['community', 'user', 'users', 'creator', 'external', 'community-generated', 'player'].includes(normalized)) {
    return 'community';
  }
  if (['ai', 'ai-gen', 'gpt', 'chatgpt', 'assistant', 'machine', 'openai'].includes(normalized)) {
    return 'AI';
  }
  return 'manual';
}

function gatherCategoryCandidates(candidate) {
  if (candidate == null) return [];
  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return [String(candidate)];
  }
  if (Array.isArray(candidate)) {
    return candidate.flatMap((item) => gatherCategoryCandidates(item));
  }
  if (typeof candidate !== 'object') return [];
  const values = [];
  const keys = [
    '_id', 'id', 'categoryId', 'category_id', 'category', 'slug', 'providerCategoryId',
    'name', 'displayName', 'title', 'label', 'value', 'code'
  ];
  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(candidate, key) && candidate[key] != null) {
      values.push(candidate[key]);
    }
  });
  if (Array.isArray(candidate.aliases)) values.push(...candidate.aliases);
  return values.flatMap((value) => gatherCategoryCandidates(value));
}

function resolveImportCategory(value) {
  const candidates = Array.isArray(value) ? value : [value];
  for (const candidate of candidates) {
    const values = gatherCategoryCandidates(candidate);
    for (const entry of values) {
      const raw = typeof entry === 'string' ? entry : String(entry ?? '');
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const direct = cachedCategories.find((category) => {
        if (!category) return false;
        if (category._id === trimmed) return true;
        const normalized = trimmed.toLowerCase();
        if (category.slug && category.slug.toLowerCase() === normalized) return true;
        if (category.providerCategoryId && category.providerCategoryId.toLowerCase() === normalized) return true;
        if (category.name && category.name.toLowerCase() === normalized) return true;
        if (category.displayName && category.displayName.toLowerCase() === normalized) return true;
        if (Array.isArray(category.aliases) && category.aliases.some((alias) => alias.toLowerCase() === normalized)) return true;
        return false;
      });
      if (direct) return direct;

      const staticMatch = resolveStaticCategoryDefinition(trimmed);
      if (staticMatch) {
        const expected = [];
        if (staticMatch.slug) expected.push(staticMatch.slug.toLowerCase());
        if (staticMatch.providerCategoryId) expected.push(staticMatch.providerCategoryId.toLowerCase());
        if (staticMatch.name) expected.push(staticMatch.name.toLowerCase());
        if (staticMatch.displayName) expected.push(staticMatch.displayName.toLowerCase());
        const resolved = cachedCategories.find((category) => {
          if (!category) return false;
          const candidates = [
            category.slug,
            category.providerCategoryId,
            category.name,
            category.displayName
          ]
            .filter(Boolean)
            .map((item) => String(item).toLowerCase());
          return expected.some((expectedKey) => candidates.includes(expectedKey));
        });
        if (resolved) return resolved;
      }
    }
  }
  return null;
}

function extractOptionList(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const arrayCandidates = [raw.options, raw.choices, raw.answers, raw.variants, raw.alternatives];
  for (const candidate of arrayCandidates) {
    if (Array.isArray(candidate) && candidate.length) {
      const normalized = candidate.map((option) => safeString(option)).filter(Boolean);
      if (normalized.length) return normalized;
    }
  }

  const optionKeys = [
    'option1', 'option2', 'option3', 'option4', 'optionA', 'optionB', 'optionC', 'optionD',
    'a', 'b', 'c', 'd', 'first', 'second', 'third', 'fourth'
  ];
  const collected = [];
  optionKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      collected.push(raw[key]);
    }
  });
  return collected.map((option) => safeString(option)).filter(Boolean);
}

function resolveCorrectIndex(raw, options) {
  if (!Array.isArray(options) || !options.length) return -1;
  const numericCandidates = [
    raw.correctIdx,
    raw.correctIndex,
    raw['correct-index'],
    raw.correct_option_index,
    raw.correctOptionIndex,
    raw.answerIndex,
    raw.answer_idx,
    raw.correct
  ];
  for (const candidate of numericCandidates) {
    const number = Number(candidate);
    if (Number.isInteger(number) && number >= 0 && number < options.length) {
      return number;
    }
  }

  const stringCandidates = [
    raw.correctAnswer,
    raw.correct_option,
    raw.correctOption,
    raw.correctChoice,
    raw.answer,
    raw.solution,
    raw.correct_value,
    raw.correctText
  ];
  for (const candidate of stringCandidates) {
    if (candidate == null) continue;
    const value = safeString(candidate);
    if (!value) continue;
    if (value.length === 1 && /[A-D]/i.test(value)) {
      const idx = value.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) return idx;
    }
    const normalized = value.toLowerCase();
    const directIdx = options.findIndex((option) => option.toLowerCase() === normalized);
    if (directIdx !== -1) return directIdx;
  }

  return -1;
}

function normalizeImportedQuestion(raw, index) {
  if (!raw || typeof raw !== 'object') {
    return { error: { index: index + 1, message: 'ساختار سوال باید یک شیء JSON باشد.' } };
  }

  const text = safeString(raw.text ?? raw.question ?? raw.prompt ?? raw.title ?? '');
  if (!text) {
    return { error: { index: index + 1, message: 'متن سوال خالی است.' } };
  }

  const options = extractOptionList(raw);
  if (options.length !== 4) {
    return { error: { index: index + 1, message: 'تعداد گزینه‌ها باید دقیقاً ۴ مورد باشد.' } };
  }

  const correctIdx = resolveCorrectIndex(raw, options);
  if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx >= options.length) {
    return { error: { index: index + 1, message: 'گزینه صحیح قابل شناسایی نیست.' } };
  }

  const categoryCandidate = [
    raw.category,
    raw.categoryId,
    raw.category_id,
    raw.categorySlug,
    raw.categoryName,
    raw.categoryTitle,
    raw.categoryLabel,
    raw.topic,
    raw.subject,
    raw.group
  ];
  const category = resolveImportCategory(categoryCandidate);
  if (!category) {
    return { error: { index: index + 1, message: 'دسته‌بندی معتبر برای سوال یافت نشد.' } };
  }

  const sourceRaw = raw.source ?? raw.origin ?? raw.provider;
  const status = normalizeImportStatus(raw.status ?? raw.state ?? raw.approvalStatus, raw.active ?? raw.enabled ?? raw.isActive);
  let active = normalizeBooleanCandidate(raw.active ?? raw.enabled ?? raw.isActive, status === 'approved');
  const difficultyCandidate = raw.difficulty ?? raw.level ?? raw.difficultyLevel ?? raw.hardness ?? raw.rank;
  const hasDifficulty = difficultyCandidate !== undefined
    && difficultyCandidate !== null
    && !(typeof difficultyCandidate === 'string' && !String(difficultyCandidate).trim());
  const normalizedDifficulty = hasDifficulty
    ? normalizeImportDifficulty(difficultyCandidate)
    : 'easy';
  const source = normalizeImportSource(sourceRaw);
  if (status !== 'approved') active = false;
  const lang = safeString(raw.lang ?? raw.language ?? 'fa') || 'fa';
  const authorCandidate = raw.authorName ?? raw.author ?? raw.creator ?? raw.writer;
  const authorName = safeString(authorCandidate ?? '');
  const hasAuthor = Boolean(authorName);
  const reviewNotes = safeString(raw.reviewNotes ?? raw.notes ?? raw.comment ?? '');
  const previewAuthor = hasAuthor
    ? authorName
    : (source === 'community' ? 'کاربر آیکوئیز' : 'IQuiz Team');

  const warnings = [];
  if (status !== 'approved' && normalizeBooleanCandidate(raw.active ?? raw.enabled ?? raw.isActive, false)) {
    warnings.push('با توجه به وضعیت انتخاب شده، سوال به صورت غیرفعال ذخیره خواهد شد.');
  }

  const payload = {
    text,
    options,
    correctIdx,
    categoryId: category._id,
    categoryName: category.displayName || category.name,
    active,
    status,
    source,
    lang
  };

  if (hasDifficulty) payload.difficulty = normalizedDifficulty;
  if (hasAuthor) payload.authorName = authorName;

  if (reviewNotes) payload.reviewNotes = reviewNotes;

  const clientId = generateClientQuestionId(index);

  return {
    question: {
      index: index + 1,
      payload,
      previewText: text,
      categoryLabel: category.displayName || category.name || '---',
      warnings,
      status: 'idle',
      errorMessage: '',
      clientId,
      previewDifficulty: normalizedDifficulty,
      previewAuthor,
      previewId: clientId
    }
  };
}

function parseImportPayload(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) {
    return { list: [], errors: [], total: 0, aborted: true };
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    const message = error && error.message ? error.message : 'JSON معتبر نیست.';
    return {
      list: [],
      errors: [{ index: null, message: `فرمت JSON معتبر نیست: ${message}` }],
      total: 0,
      aborted: true
    };
  }

  const list = Array.isArray(data) ? data : [data];
  if (!list.length) {
    return {
      list: [],
      errors: [{ index: null, message: 'آرایه سوالات خالی است.' }],
      total: 0,
      aborted: true
    };
  }

  return {
    list,
    errors: [],
    total: list.length,
    aborted: false
  };
}

function waitForImportIdle() {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 120 });
    } else {
      setTimeout(resolve, 16);
    }
  });
}

function computeImportChunkSize(total) {
  const safeTotal = Number.isFinite(Number(total)) ? Number(total) : 0;
  if (safeTotal <= 20) return 5;
  if (safeTotal <= 80) return 12;
  if (safeTotal <= 160) return 18;
  return 24;
}

async function scheduleImportPayloadProcessing(raw, token) {
  const parsed = parseImportPayload(raw);
  if (parsed.aborted) {
    return { questions: [], errors: parsed.errors || [], total: parsed.total || 0 };
  }

  const { list, errors: initialErrors, total } = parsed;
  const errors = Array.isArray(initialErrors) ? [...initialErrors] : [];
  const questions = [];

  const progress = importQuestionsState.parseProgress || { processed: 0, total: total || list.length, message: '' };
  progress.total = Number.isFinite(Number(total)) ? Number(total) : list.length;
  progress.message = progress.total > 1
    ? 'در حال پردازش گروهی سوالات...'
    : 'در حال پردازش سوال...';
  importQuestionsState.parseProgress = progress;
  renderImportQuestionsState();

  const chunkSize = computeImportChunkSize(progress.total);

  for (let idx = 0; idx < list.length; idx += 1) {
    if (token !== importQuestionsProcessingToken) {
      return null;
    }

    const result = normalizeImportedQuestion(list[idx], idx);
    if (result?.question) {
      const question = {
        ...result.question,
        status: 'idle',
        errorMessage: '',
        warnings: Array.isArray(result.question.warnings) ? result.question.warnings : []
      };
      questions.push(question);
    } else if (result?.error) {
      errors.push(result.error);
    }

    if ((idx + 1) % chunkSize === 0 || idx === list.length - 1) {
      progress.processed = idx + 1;
      importQuestionsState.parseProgress = progress;
      renderImportQuestionsState();
      await waitForImportIdle();
    }
  }

  return { questions, errors, total: progress.total };
}

function renderImportQuestionsState() {
  if (importQuestionsTextarea && importQuestionsTextarea.value !== importQuestionsState.raw) {
    importQuestionsTextarea.value = importQuestionsState.raw;
  }
  if (importQuestionsFileNameEl) {
    importQuestionsFileNameEl.textContent = importQuestionsState.fileName
      ? `فایل انتخابی: ${importQuestionsState.fileName}`
      : 'هیچ فایلی انتخاب نشده است';
  }

  const summaryContainer = importQuestionsSummaryEl;
  if (summaryContainer) {
    if (importQuestionsState.parsing) {
      const progress = importQuestionsState.parseProgress || { processed: 0, total: 0, message: '' };
      const processed = Number.isFinite(Number(progress.processed)) ? Number(progress.processed) : 0;
      const total = Number.isFinite(Number(progress.total)) ? Number(progress.total) : 0;
      const ratio = total > 0 ? Math.min(100, Math.max(0, Math.round((processed / total) * 100))) : 5;
      const message = progress.message ? escapeHtml(progress.message) : 'در حال پردازش ورودی‌ها...';
      const counter = total > 0
        ? `${formatNumberFa(Math.min(processed, total))} / ${formatNumberFa(total)}`
        : '';

      summaryContainer.innerHTML = `
        <div class="import-progress-card">
          <div class="import-progress-header">
            <div class="import-progress-message">
              <span class="import-progress-spinner"></span>
              <span>${message}</span>
            </div>
            <div class="import-progress-counter">${counter}</div>
          </div>
          <div class="import-progress-bar">
            <span style="width: ${ratio}%;"></span>
          </div>
        </div>
      `;
    } else {
      const readyCount = importQuestionsState.questions.filter((question) => question.status === 'idle').length;
      const successCount = importQuestionsState.questions.filter((question) => question.status === 'success').length;
      const failedCount = importQuestionsState.questions.filter((question) => question.status === 'error').length + importQuestionsState.errors.length;
      const total = importQuestionsState.total || (importQuestionsState.questions.length + importQuestionsState.errors.length);

      if (!total) {
        summaryContainer.innerHTML = `
          <div class="text-sm text-white/70">
            برای شروع، محتوای JSON سوالات را وارد یا فایل مربوطه را آپلود کنید.
          </div>
        `;
      } else {
        summaryContainer.innerHTML = `
          <div class="import-summary-cards">
            <div class="import-summary-card">
              <span>${formatNumberFa(readyCount)}</span>
              <p class="text-xs text-white/60">سوالات آماده ثبت</p>
            </div>
            <div class="import-summary-card">
              <span class="text-emerald-200">${formatNumberFa(successCount)}</span>
              <p class="text-xs text-white/60">ثبت موفق</p>
            </div>
            <div class="import-summary-card">
              <span class="text-rose-200">${formatNumberFa(failedCount)}</span>
              <p class="text-xs text-white/60">موارد دارای خطا</p>
            </div>
          </div>
          <p class="text-[11px] text-white/50 mt-3">
            مجموع ورودی‌ها: ${formatNumberFa(total)} مورد
          </p>
        `;
      }
    }
  }

  if (importQuestionsErrorsEl) {
    if (importQuestionsState.parsing || !importQuestionsState.errors.length) {
      importQuestionsErrorsEl.classList.add('hidden');
      importQuestionsErrorsEl.innerHTML = '';
    } else {
      importQuestionsErrorsEl.classList.remove('hidden');
      importQuestionsErrorsEl.innerHTML = importQuestionsState.errors
        .map((error) => {
          const prefix = Number.isInteger(error.index)
            ? `ردیف ${formatNumberFa(error.index)}: `
            : '';
          return `<div class="import-error-item">${prefix}${escapeHtml(error.message || '')}</div>`;
        })
        .join('');
    }
  }

  if (importQuestionsPreviewEl) {
    if (importQuestionsState.parsing) {
      importQuestionsPreviewEl.innerHTML = `
        <div class="import-preview-loading">
          <span class="import-progress-spinner"></span>
          <span>در حال آماده‌سازی پیش‌نمایش سوالات...</span>
        </div>
      `;
    } else if (!importQuestionsState.questions.length) {
      importQuestionsPreviewEl.innerHTML = `
        <div class="empty-preview">
          هنوز سوال معتبری شناسایی نشده است. پس از وارد کردن JSON صحیح، پیش‌نمایش اینجا نمایش داده می‌شود.
        </div>
      `;
    } else {
      importQuestionsPreviewEl.innerHTML = importQuestionsState.questions
        .map((question) => renderImportPreviewCard(question))
        .join('');
    }
  }

  if (importQuestionsSubmitBtn) {
    const hasValid = importQuestionsState.questions.some((question) => question.status === 'idle' || question.status === 'error');
    const disabled = importQuestionsState.parsing || !hasValid || importQuestionsState.importing;
    importQuestionsSubmitBtn.disabled = disabled;
    importQuestionsSubmitBtn.classList.toggle('opacity-70', disabled);
    importQuestionsSubmitBtn.classList.toggle('cursor-not-allowed', disabled);
    if (importQuestionsState.importing) {
      importQuestionsSubmitBtn.innerHTML = `
        <span class="flex items-center gap-2">
          <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span>در حال ثبت...</span>
        </span>
      `;
    } else {
      importQuestionsSubmitBtn.innerHTML = importQuestionsSubmitDefault;
    }
  }
}

function renderImportPreviewCard(question) {
  if (!question || !question.payload) return '';
  const difficultyKey = question.previewDifficulty || question.payload.difficulty || 'easy';
  const difficultyMeta = DIFFICULTY_META[difficultyKey] || DIFFICULTY_META.easy;
  const sourceMeta = SOURCE_META[question.payload.source] || SOURCE_META.manual;
  const statusMeta = STATUS_META[question.payload.status] || STATUS_META.approved;
  const authorLabel = question.previewAuthor || question.payload.authorName || (question.payload.source === 'community' ? 'کاربر آیکوئیز' : 'IQuiz Team');
  const displayId = question.clientId || question.previewId || '';
  const statusBadgeMap = {
    idle: { label: 'آماده ثبت', icon: 'fa-hourglass-half', className: 'idle' },
    uploading: { label: 'در حال ارسال', icon: 'fa-circle-notch fa-spin', className: 'uploading' },
    success: { label: 'ذخیره شد', icon: 'fa-check-circle', className: 'success' },
    error: { label: 'ناموفق', icon: 'fa-triangle-exclamation', className: 'error' }
  };
  const badge = statusBadgeMap[question.status || 'idle'];
  const badgeHtml = badge
    ? `<span class="import-status-badge ${badge.className}"><i class="fa-solid ${badge.icon}"></i>${badge.label}</span>`
    : '';
  const optionsHtml = question.payload.options
    .map((option, idx) => {
      const isCorrect = idx === question.payload.correctIdx;
      const label = String.fromCharCode(65 + idx);
      return `
        <div class="import-option${isCorrect ? ' correct' : ''}">
          <span class="font-mono text-xs text-white/50">${label}</span>
          <span>${escapeHtml(option)}</span>
        </div>
      `;
    })
    .join('');
  const warningsHtml = Array.isArray(question.warnings) && question.warnings.length
    ? `<div class="import-warning mt-3">${question.warnings.map((warning) => escapeHtml(warning)).join('<br>')}</div>`
    : '';
  const errorHtml = question.status === 'error' && question.errorMessage
    ? `<div class="import-error-item mt-3">${escapeHtml(question.errorMessage)}</div>`
    : '';
  const indexLabel = formatNumberFa(question.index || 0);
  const excerpt = truncateText(question.previewText || '', 160);
  return `
    <div class="import-preview-card ${question.status || 'idle'}">
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-2">
          <div class="import-preview-meta">
            <span class="font-mono text-white/60">#${indexLabel}</span>
            <span>${escapeHtml(question.categoryLabel || '---')}</span>
          </div>
          <div class="import-preview-title">${escapeHtml(excerpt)}</div>
          <div class="import-preview-meta">
            ${displayId ? `<span class="meta-chip id" title="شناسه موقت"><i class="fa-solid fa-hashtag"></i>${escapeHtml(displayId)}</span>` : ''}
            <span class="meta-chip category"><i class="fa-solid fa-layer-group"></i>${escapeHtml(question.categoryLabel || '---')}</span>
            <span class="${difficultyMeta.class}"><i class="fa-solid ${difficultyMeta.icon}"></i>${difficultyMeta.label}</span>
            <span class="meta-chip author"><i class="fa-solid fa-user-pen"></i>${escapeHtml(authorLabel)}</span>
            <span class="${sourceMeta.class}"><i class="fa-solid ${sourceMeta.icon}"></i>${sourceMeta.label}</span>
            <span class="${statusMeta.class}"><span class="status-dot ${statusMeta.dot}"></span>${statusMeta.label}</span>
          </div>
        </div>
        ${badgeHtml}
      </div>
      <div class="import-preview-options mt-4">
        ${optionsHtml}
      </div>
      ${warningsHtml}
      ${errorHtml}
    </div>
  `;
}

function resolveImportConcurrency(total = 1) {
  const safeTotal = Number.isFinite(Number(total)) ? Number(total) : 1;
  let suggested = 4;
  if (typeof navigator !== 'undefined' && navigator?.hardwareConcurrency) {
    const hardware = Number(navigator.hardwareConcurrency);
    if (Number.isFinite(hardware)) {
      suggested = Math.max(2, Math.floor(hardware * 0.75));
    }
  } else if (safeTotal > 20) {
    suggested = 6;
  } else if (safeTotal > 8) {
    suggested = 4;
  } else if (safeTotal > 3) {
    suggested = 3;
  }

  const upperBound = 8;
  const limit = Math.max(1, Math.min(upperBound, suggested));
  return Math.max(1, Math.min(limit, safeTotal));
}

function resetImportQuestionsModal() {
  importQuestionsProcessingToken += 1;
  importQuestionsState.raw = '';
  importQuestionsState.questions = [];
  importQuestionsState.errors = [];
  importQuestionsState.fileName = '';
  importQuestionsState.total = 0;
  importQuestionsState.importing = false;
  importQuestionsState.parsing = false;
  importQuestionsState.parseProgress = null;
  if (importQuestionsTextarea) importQuestionsTextarea.value = '';
  if (importQuestionsFileInput) importQuestionsFileInput.value = '';
  renderImportQuestionsState();
}

function applyImportPayload(raw) {
  const token = ++importQuestionsProcessingToken;
  const text = typeof raw === 'string' ? raw : '';
  importQuestionsState.raw = text;
  importQuestionsState.questions = [];
  importQuestionsState.errors = [];
  importQuestionsState.total = 0;
  importQuestionsState.importing = false;
  importQuestionsState.parsing = Boolean(text.trim());
  importQuestionsState.parseProgress = text.trim()
    ? { processed: 0, total: 0, message: 'در حال آماده‌سازی داده‌ها...' }
    : null;
  renderImportQuestionsState();

  if (!text.trim()) {
    importQuestionsState.parsing = false;
    importQuestionsState.parseProgress = null;
    renderImportQuestionsState();
    return;
  }

  scheduleImportPayloadProcessing(text, token)
    .then((result) => {
      if (!result || token !== importQuestionsProcessingToken) return;
      importQuestionsState.questions = result.questions;
      importQuestionsState.errors = result.errors;
      importQuestionsState.total = result.total || 0;
    })
    .catch((error) => {
      if (token !== importQuestionsProcessingToken) return;
      const message = error?.message ? String(error.message) : 'پردازش JSON با خطا مواجه شد.';
      importQuestionsState.errors = [{ index: null, message }];
      importQuestionsState.questions = [];
      importQuestionsState.total = 0;
    })
    .finally(() => {
      if (token !== importQuestionsProcessingToken) return;
      importQuestionsState.parsing = false;
      importQuestionsState.parseProgress = null;
      renderImportQuestionsState();
    });
}

async function handleImportQuestionsSubmit() {
  if (!getToken()) {
    showToast('برای مدیریت سوالات ابتدا وارد شوید', 'warning');
    return;
  }
  const pendingQuestions = importQuestionsState.questions.filter((question) => question.status === 'idle' || question.status === 'error');
  if (!pendingQuestions.length) {
    showToast('ابتدا سوالات معتبر را بررسی کنید', 'warning');
    return;
  }

  importQuestionsState.importing = true;
  pendingQuestions.forEach((question) => {
    question.status = 'uploading';
    question.errorMessage = '';
  });
  renderImportQuestionsState();

  let successCount = 0;
  let failureCount = 0;

  const concurrency = resolveImportConcurrency(pendingQuestions.length);
  let cursor = 0;

  async function runWorker() {
    while (cursor < pendingQuestions.length) {
      const currentIndex = cursor;
      cursor += 1;
      const question = pendingQuestions[currentIndex];
      if (!question) {
        continue;
      }

      try {
        await api('/questions', {
          method: 'POST',
          body: JSON.stringify(question.payload)
        });
        question.status = 'success';
        successCount += 1;
      } catch (error) {
        question.status = 'error';
        question.errorMessage = error?.message || 'ثبت سوال ناموفق بود';
        failureCount += 1;
      }
      renderImportQuestionsState();
    }
  }

  const workers = Array.from({ length: concurrency }, () => runWorker());
  await Promise.all(workers);

  importQuestionsState.importing = false;
  renderImportQuestionsState();

  if (successCount > 0) {
    showToast(`${formatNumberFa(successCount)} سوال با موفقیت ثبت شد`, 'success');
    await Promise.all([
      loadQuestions(),
      loadDashboardStats(true)
    ]);
  }
  if (failureCount > 0) {
    showToast(`${formatNumberFa(failureCount)} سوال ثبت نشد. لطفاً خطاها را بررسی کنید.`, 'error');
  } else if (successCount > 0) {
    setTimeout(() => { closeModal('#import-questions-modal'); }, 600);
  }
}

function deriveCategoryIdentityKey(category) {
  if (!category || typeof category !== 'object') return '';
  const candidates = [
    category.slug,
    category.providerCategoryId,
    category._id,
    category.id,
    category.name,
    category.displayName,
    category.title
  ];

  for (const candidate of candidates) {
    if (candidate == null) continue;
    const normalized = String(candidate).trim().toLowerCase();
    if (normalized) return normalized;
  }

  return '';
}

function sanitizeCategoryList(list) {
  if (!Array.isArray(list)) return [];

  const seenKeys = new Set();
  const normalized = [];

  list
    .map((category) => {
      if (!category?._id || !category?.name) return null;
      const aliases = Array.isArray(category.aliases)
        ? category.aliases.map((alias) => String(alias ?? '').trim()).filter(Boolean)
        : [];
      const totalQuestions = Number.isFinite(Number(category.questionCount))
        ? Number(category.questionCount)
        : 0;
      const activeQuestions = Number.isFinite(Number(category.activeQuestionCount))
        ? Number(category.activeQuestionCount)
        : 0;
      const inactiveQuestionsRaw = Number.isFinite(Number(category.inactiveQuestionCount))
        ? Number(category.inactiveQuestionCount)
        : Math.max(totalQuestions - activeQuestions, 0);
      const inactiveQuestions = Math.max(inactiveQuestionsRaw, 0);
      const order = Number.isFinite(Number(category.order))
        ? Number(category.order)
        : 0;
      return {
        ...category,
        _id: String(category._id),
        name: String(category.name),
        displayName: category.displayName ? String(category.displayName) : '',
        slug: category.slug ? String(category.slug) : '',
        provider: category.provider ? String(category.provider) : 'manual',
        providerCategoryId: category.providerCategoryId ? String(category.providerCategoryId) : '',
        aliases,
        status: category.status || 'active',
        questionCount: totalQuestions,
        activeQuestionCount: activeQuestions,
        inactiveQuestionCount: inactiveQuestions,
        order
      };
    })
    .map(mergeCategoryWithStaticDefinition)
    .forEach((category) => {
      if (!category) return;
      const key = deriveCategoryIdentityKey(category) || `idx:${normalized.length}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      normalized.push(category);
    });

  normalized.sort((a, b) => {
    const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : 0;
    const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : 0;
    if (orderA !== orderB) return orderA - orderB;
    const aLabel = a.displayName || a.name || '';
    const bLabel = b.displayName || b.name || '';
    return aLabel.localeCompare(bLabel, 'fa');
  });

  const limit = STATIC_CATEGORY_DEFINITIONS.length;
  return limit > 0 ? normalized.slice(0, limit) : normalized;
}

function categoryOptionLabel(category) {
  if (!category) return '';
  const label = category.displayName || category.name;
  const suffix = category.status && category.status !== 'active'
    ? (CATEGORY_STATUS_SUFFIX[category.status] || '')
    : '';
  return suffix ? `${label}${suffix}` : label;
}

function refreshCategorySelectOptions(selectEl, { placeholder = 'یک گزینه را انتخاب کنید', selected = undefined } = {}) {
  if (!selectEl) return;
  const currentValue = selected !== undefined ? selected : selectEl.value;
  selectEl.innerHTML = '';

  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = placeholder;
  selectEl.appendChild(placeholderOption);

  cachedCategories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category._id;
    option.textContent = categoryOptionLabel(category);
    option.dataset.status = category.status || 'active';
    selectEl.appendChild(option);
  });

  if (currentValue && !cachedCategories.some((category) => category._id === currentValue)) {
    const fallbackOption = document.createElement('option');
    fallbackOption.value = currentValue;
    fallbackOption.textContent = 'دسته‌بندی نامعتبر';
    fallbackOption.dataset.status = 'disabled';
    selectEl.appendChild(fallbackOption);
  }

  if (currentValue) {
    selectEl.value = currentValue;
  } else {
    selectEl.value = '';
  }

  if (!cachedCategories.length) {
    placeholderOption.textContent = 'ابتدا یک دسته‌بندی فعال بسازید';
    selectEl.disabled = true;
  } else {
    selectEl.disabled = false;
  }
}

function refreshCategorySelects({ addSelected, detailSelected } = {}) {
  if (addQuestionCategorySelect) {
    refreshCategorySelectOptions(addQuestionCategorySelect, {
      placeholder: 'دسته‌بندی مورد نظر را انتخاب کنید',
      selected: addSelected !== undefined ? addSelected : addQuestionCategorySelect.value
    });
  }
  if (questionDetailCategorySelect) {
    refreshCategorySelectOptions(questionDetailCategorySelect, {
      placeholder: 'یک دسته‌بندی را انتخاب کنید',
      selected: detailSelected !== undefined ? detailSelected : questionDetailCategorySelect.value
    });
  }
}

function findCategoryById(id) {
  if (!id) return null;
  return cachedCategories.find((category) => category._id === id) || null;
}

function getCategoryColorStyles(color) {
  const palette = {
    blue:   { iconBg: 'bg-blue-500/20', iconColor: 'text-blue-400' },
    green:  { iconBg: 'bg-green-500/20', iconColor: 'text-green-400' },
    orange: { iconBg: 'bg-orange-500/20', iconColor: 'text-orange-400' },
    purple: { iconBg: 'bg-purple-500/20', iconColor: 'text-purple-400' },
    yellow: { iconBg: 'bg-yellow-500/20', iconColor: 'text-yellow-400' },
    pink:   { iconBg: 'bg-pink-500/20', iconColor: 'text-pink-400' },
    red:    { iconBg: 'bg-red-500/20', iconColor: 'text-red-400' },
    teal:   { iconBg: 'bg-teal-500/20', iconColor: 'text-teal-400' },
    indigo: { iconBg: 'bg-indigo-500/20', iconColor: 'text-indigo-400' }
  };
  const normalized = typeof color === 'string' ? color.toLowerCase() : '';
  return palette[normalized] || { iconBg: 'bg-slate-500/20', iconColor: 'text-slate-300' };
}

function normalizeCategoryColorKey(category) {
  if (!category) return 'slate';
  const raw = typeof category.color === 'string' ? category.color.trim().toLowerCase() : '';
  if (CATEGORY_COLOR_VARIANTS.has(raw)) return raw;
  return 'slate';
}

function renderCategoryStatusChip(status) {
  const normalized = typeof status === 'string' ? status.toLowerCase() : 'active';
  const meta = STATUS_META[normalized] || STATUS_META.active;
  const dotClass = meta.dot || 'active';
  const className = meta.class || 'meta-chip status-active';
  const label = meta.label || 'فعال';
  return `
    <div class="${className}">
      <span class="status-dot ${dotClass}"></span>
      ${escapeHtml(label)}
    </div>
  `;
}

function renderCategoryProviderChip(provider) {
  const normalized = typeof provider === 'string' ? provider.toLowerCase() : 'manual';
  const meta = SOURCE_META[normalized] || SOURCE_META.manual;
  if (!meta) return '';
  return `
    <div class="${meta.class}">
      <i class="fa-solid ${escapeHtml(meta.icon)}"></i>
      ${escapeHtml(meta.label)}
    </div>
  `;
}

function createCategoryCard(category) {
  const styles = getCategoryColorStyles(category?.color);
  const icon = typeof category?.icon === 'string' && category.icon.trim()
    ? category.icon.trim()
    : 'fa-layer-group';
  const name = category?.name ? String(category.name) : 'دسته‌بندی بدون نام';
  const displayName = category?.displayName ? String(category.displayName) : '';
  const title = displayName || name;
  const questionCount = Number.isFinite(Number(category?.questionCount))
    ? Number(category.questionCount)
    : 0;
  const activeQuestionCount = Number.isFinite(Number(category?.activeQuestionCount))
    ? Number(category.activeQuestionCount)
    : questionCount;
  const inactiveQuestionCount = Math.max(questionCount - activeQuestionCount, 0);
  const createdAtLabel = formatDateTime(category?.createdAt);
  const updatedAtLabel = formatDateTime(category?.updatedAt);
  const description = category?.description ? String(category.description).trim() : '';
  const safeDescription = description || 'برای این دسته‌بندی توضیحی ثبت نشده است.';
  const providerChip = renderCategoryProviderChip(category?.provider);
  const deleteDisabled = CATEGORY_MANAGEMENT_LOCKED;
  const deleteDisabledClass = deleteDisabled ? ' opacity-40 cursor-not-allowed' : '';
  const deleteDisabledAttr = deleteDisabled
    ? `disabled title="${escapeHtml(CATEGORY_LOCKED_MESSAGE)}" data-locked="true"`
    : '';

  const card = document.createElement('div');
  card.className = 'glass rounded-2xl p-6 card-hover flex flex-col';
  card.dataset.categoryId = category?._id ? String(category._id) : '';
  card.dataset.questionCount = String(questionCount);
  card.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center">
        <i class="fa-solid ${escapeHtml(icon)} ${styles.iconColor} text-2xl"></i>
      </div>
      <div class="flex items-center gap-2">
        ${renderCategoryStatusChip(category?.status)}
        ${providerChip}
      </div>
    </div>
    <div class="space-y-4 flex-1">
      <div>
        <h3 class="text-xl font-bold mb-1">${escapeHtml(title)}</h3>
        <p class="text-sm text-white/70 leading-6">${escapeHtml(safeDescription)}</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="glass-dark rounded-xl px-4 py-3 border border-white/5">
          <div class="flex items-center justify-between text-xs text-white/60">
            <span>سوالات ثبت‌شده</span>
            <i class="fa-solid fa-circle-question text-white/40"></i>
          </div>
          <p class="text-lg font-bold text-white mt-2">${formatNumberFa(questionCount)}</p>
          <p class="text-xs text-white/50 mt-1">${formatNumberFa(activeQuestionCount)} فعال${inactiveQuestionCount > 0 ? ` / ${formatNumberFa(inactiveQuestionCount)} غیرفعال` : ''}</p>
        </div>
        <div class="glass-dark rounded-xl px-4 py-3 border border-white/5">
          <div class="flex items-center justify-between text-xs text-white/60">
            <span>آخرین بروزرسانی</span>
            <i class="fa-solid fa-clock-rotate-left text-white/40"></i>
          </div>
          <p class="text-sm font-bold text-white mt-2">${escapeHtml(updatedAtLabel)}</p>
          <p class="text-xs text-white/50 mt-1">ایجاد: ${escapeHtml(createdAtLabel)}</p>
        </div>
      </div>
    </div>
    <div class="flex gap-2 mt-6">
      <button type="button" class="flex-1 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all duration-300" data-action="edit-category" data-category-id="${category?._id || ''}">
        <i class="fa-solid fa-edit ml-2"></i> ویرایش
      </button>
      <button type="button" class="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all duration-300${deleteDisabledClass}" ${deleteDisabledAttr} data-action="delete-category" data-category-id="${category?._id || ''}">
        <i class="fa-solid fa-trash ml-2"></i> حذف
      </button>
    </div>
  `;
  return card;
}

function setSelectValue(selectEl, value, fallbackValue = '') {
  if (!selectEl) return;
  const normalized = typeof value === 'string' ? value : '';
  if (!normalized) {
    if (fallbackValue) {
      selectEl.value = fallbackValue;
      return;
    }
    if (selectEl.options.length > 0) {
      selectEl.selectedIndex = 0;
    }
    return;
  }
  const options = Array.from(selectEl.options || []);
  if (!options.some((option) => option.value === normalized)) {
    const option = document.createElement('option');
    option.value = normalized;
    option.textContent = normalized;
    selectEl.appendChild(option);
  }
  selectEl.value = normalized;
}

function renderCategoryManagement() {
  if (!categoriesGridEl) return;

  if (categoriesLoadingEl) {
    categoriesLoadingEl.classList.toggle('hidden', !categoriesLoading);
  }

  const hasCategories = Array.isArray(cachedCategories) && cachedCategories.length > 0;
  const isAuthenticated = Boolean(getToken());
  updateCategoryCreationControls(isAuthenticated);

  if (categoriesLoading) {
    if (!hasCategories) {
      categoriesGridEl.innerHTML = '';
      categoriesGridEl.classList.add('hidden');
    }
    if (categoriesEmptyEl) categoriesEmptyEl.classList.add('hidden');
    renderQuestionCategoryStats();
    return;
  }

  if (!hasCategories) {
    categoriesGridEl.innerHTML = '';
    categoriesGridEl.classList.add('hidden');
    if (categoriesEmptyEl) {
      categoriesEmptyEl.classList.remove('hidden');
      if (categoriesEmptyTitleEl) {
        categoriesEmptyTitleEl.textContent = isAuthenticated
          ? 'هیچ دسته‌بندی‌ای ثبت نشده است'
          : 'برای مشاهده دسته‌بندی‌ها وارد شوید';
      }
      if (categoriesEmptyDescriptionEl) {
        if (CATEGORY_MANAGEMENT_LOCKED) {
          categoriesEmptyDescriptionEl.textContent = CATEGORY_LOCKED_DESCRIPTION;
        } else {
          categoriesEmptyDescriptionEl.textContent = isAuthenticated
            ? 'برای شروع، نخستین دسته‌بندی واقعی خود را بسازید تا بانک سوالات ساختارمند شود.'
            : 'برای مشاهده و مدیریت دسته‌بندی‌ها باید وارد حساب مدیریتی شوید.';
        }
      }
    }
    renderQuestionCategoryStats();
    return;
  }

  categoriesGridEl.classList.remove('hidden');
  if (categoriesEmptyEl) categoriesEmptyEl.classList.add('hidden');

  const fragment = document.createDocumentFragment();
  cachedCategories.forEach((category) => {
    fragment.appendChild(createCategoryCard(category));
  });
  categoriesGridEl.innerHTML = '';
  categoriesGridEl.appendChild(fragment);
  renderQuestionCategoryStats();
}

function createCategoryStatChip(category) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'category-stat-chip';
  const id = category?._id ? String(category._id) : '';
  const colorKey = normalizeCategoryColorKey(category);
  chip.dataset.categoryId = id;
  chip.dataset.color = colorKey;

  const isActive = Boolean(id) && Boolean(questionFilters.category) && questionFilters.category === id;
  if (isActive) {
    chip.classList.add('active');
    chip.dataset.active = 'true';
  } else {
    chip.dataset.active = 'false';
  }
  chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  if (!id) {
    chip.disabled = true;
    chip.classList.add('opacity-60', 'cursor-not-allowed');
  }

  const iconClass = typeof category?.icon === 'string' && category.icon.trim().startsWith('fa-')
    ? category.icon.trim()
    : 'fa-layer-group';
  const title = category?.displayName || category?.name || 'بدون دسته‌بندی';
  const questionCount = Number.isFinite(Number(category?.questionCount)) ? Number(category.questionCount) : 0;
  const activeCount = Number.isFinite(Number(category?.activeQuestionCount)) ? Number(category.activeQuestionCount) : Math.max(questionCount - (Number.isFinite(Number(category?.inactiveQuestionCount)) ? Number(category.inactiveQuestionCount) : 0), 0);
  const inactiveCount = Number.isFinite(Number(category?.inactiveQuestionCount)) ? Number(category.inactiveQuestionCount) : Math.max(questionCount - activeCount, 0);
  const statusKey = typeof category?.status === 'string' ? category.status.trim().toLowerCase() : 'active';
  const statusMeta = STATUS_META[statusKey] || STATUS_META.active;

  const inactiveTemplate = inactiveCount > 0
    ? `<span class="category-stat-meta-item"><i class="fa-regular fa-circle"></i>${formatNumberFa(inactiveCount)} غیرفعال</span>`
    : '';
  const statusTemplate = statusKey && statusKey !== 'active'
    ? `<span class="category-stat-meta-item"><i class="fa-solid fa-circle-dot"></i>${escapeHtml(statusMeta.label || '')}</span>`
    : '';

  chip.innerHTML = `
    <div class="category-stat-header">
      <span class="category-stat-icon">
        <i class="fa-solid ${escapeHtml(iconClass)}"></i>
      </span>
      <div>
        <p class="category-stat-name">${escapeHtml(title)}</p>
        <p class="category-stat-sub">${formatNumberFa(questionCount)} سوال</p>
      </div>
    </div>
    <div class="category-stat-meta">
      <span class="category-stat-meta-item"><i class="fa-solid fa-circle-check"></i>${formatNumberFa(activeCount)} فعال</span>
      ${inactiveTemplate}
      ${statusTemplate}
    </div>
  `;

  return chip;
}

function renderQuestionCategoryStats() {
  if (!questionCategoryStatsCard) return;

  const isAuthenticated = Boolean(getToken());
  const categories = Array.isArray(cachedCategories) ? cachedCategories : [];

  if (questionCategoryStatsManageBtn) {
    const manageDisabled = !isAuthenticated || CATEGORY_MANAGEMENT_LOCKED;
    questionCategoryStatsManageBtn.disabled = manageDisabled;
    questionCategoryStatsManageBtn.classList.toggle('opacity-60', manageDisabled);
    questionCategoryStatsManageBtn.classList.toggle('cursor-not-allowed', manageDisabled);
    if (manageDisabled) {
      const title = !isAuthenticated
        ? 'برای مدیریت دسته‌بندی‌ها ابتدا وارد شوید'
        : CATEGORY_LOCKED_MESSAGE;
      questionCategoryStatsManageBtn.title = title;
    } else {
      questionCategoryStatsManageBtn.removeAttribute('title');
    }
  }

  if (!isAuthenticated) {
    if (questionCategoryStatsTotalEl) questionCategoryStatsTotalEl.textContent = '—';
    if (questionCategoryStatsCategoriesEl) questionCategoryStatsCategoriesEl.textContent = '—';
    if (questionCategoryStatsGrid) questionCategoryStatsGrid.innerHTML = '';
    if (questionCategoryStatsScrollEl) questionCategoryStatsScrollEl.classList.add('hidden');
    if (questionCategoryStatsEmptyEl) {
      questionCategoryStatsEmptyEl.textContent = 'برای مشاهده آمار دسته‌بندی‌ها ابتدا وارد شوید.';
      questionCategoryStatsEmptyEl.classList.remove('hidden');
    }
    return;
  }

  if (questionCategoryStatsEmptyEl) {
    questionCategoryStatsEmptyEl.classList.add('hidden');
  }

  const totalQuestions = categories.reduce((sum, category) => {
    const count = Number.isFinite(Number(category?.questionCount)) ? Number(category.questionCount) : 0;
    return sum + count;
  }, 0);

  if (questionCategoryStatsTotalEl) {
    questionCategoryStatsTotalEl.textContent = formatNumberFa(totalQuestions);
  }
  if (questionCategoryStatsCategoriesEl) {
    questionCategoryStatsCategoriesEl.textContent = formatNumberFa(categories.length);
  }

  if (!categories.length) {
    if (questionCategoryStatsGrid) questionCategoryStatsGrid.innerHTML = '';
    if (questionCategoryStatsScrollEl) questionCategoryStatsScrollEl.classList.add('hidden');
    if (questionCategoryStatsEmptyEl) {
      questionCategoryStatsEmptyEl.textContent = 'هنوز دسته‌بندی فعالی برای سوالات ثبت نشده است.';
      questionCategoryStatsEmptyEl.classList.remove('hidden');
    }
    return;
  }

  if (questionCategoryStatsGrid) {
    const fragment = document.createDocumentFragment();
    categories.forEach((category) => {
      fragment.appendChild(createCategoryStatChip(category));
    });
    questionCategoryStatsGrid.innerHTML = '';
    questionCategoryStatsGrid.appendChild(fragment);
  }

  if (questionCategoryStatsScrollEl) {
    questionCategoryStatsScrollEl.classList.remove('hidden');
  }
}

function resetCategoryModal() {
  if (!categoryModal) return;
  categoryModal.dataset.mode = 'create';
  categoryModal.dataset.id = '';
  categoryModal.dataset.provider = '';
  categoryModal.dataset.originalName = '';
  categoryModal.dataset.providerCategoryId = '';
  categoryModal.dataset.aliases = '[]';
  if (categoryModalTitleEl) categoryModalTitleEl.textContent = categoryModalDefaultTitle;
  if (categoryNameInput) categoryNameInput.value = '';
  if (categoryDescriptionInput) categoryDescriptionInput.value = '';
  setSelectValue(categoryIconSelect, categoryIconDefaultValue || '', categoryIconDefaultValue || '');
  setSelectValue(categoryColorSelect, categoryColorDefaultValue || '', categoryColorDefaultValue || '');
  setCategoryFormLockState(CATEGORY_MANAGEMENT_LOCKED);
  if (saveCategoryBtn) {
    saveCategoryBtn.disabled = false;
    saveCategoryBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
    saveCategoryBtn.textContent = CATEGORY_MODAL_LABELS.create;
  }
}

function openCategoryModal(mode = 'create', category = null) {
  if (!categoryModal) return;
  if (CATEGORY_MANAGEMENT_LOCKED && mode !== 'edit') {
    notifyCategoryManagementLocked();
    return;
  }
  setCategoryFormLockState(CATEGORY_MANAGEMENT_LOCKED);
  if (mode === 'edit' && category) {
    categoryModal.dataset.mode = 'edit';
    categoryModal.dataset.id = category._id ? String(category._id) : '';
    categoryModal.dataset.provider = category.provider ? String(category.provider) : '';
    categoryModal.dataset.originalName = category.name ? String(category.name) : '';
    categoryModal.dataset.providerCategoryId = category.providerCategoryId ? String(category.providerCategoryId) : '';
    categoryModal.dataset.aliases = JSON.stringify(Array.isArray(category.aliases) ? category.aliases : []);
    if (categoryModalTitleEl) categoryModalTitleEl.textContent = categoryModalEditTitle;
    if (categoryNameInput) categoryNameInput.value = category.displayName || category.name || '';
    if (categoryDescriptionInput) categoryDescriptionInput.value = category.description || '';
    setSelectValue(categoryIconSelect, category.icon || '', categoryIconDefaultValue || '');
    setSelectValue(categoryColorSelect, category.color || '', categoryColorDefaultValue || '');
    if (saveCategoryBtn) {
      saveCategoryBtn.disabled = false;
      saveCategoryBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
      saveCategoryBtn.textContent = CATEGORY_MODAL_LABELS.edit;
    }
  } else {
    resetCategoryModal();
  }
  openModal('#add-category-modal');
}

// --------------- ADS MANAGEMENT ---------------
const AD_PLACEMENT_META = {
  banner: { label: 'بنر پایین صفحه', icon: 'fa-image' },
  native: { label: 'تبلیغ همسان', icon: 'fa-rectangle-list' },
  interstitial: { label: 'میانی تمام‌صفحه', icon: 'fa-tablet-screen-button' },
  rewarded: { label: 'ویدیویی پاداش‌دار', icon: 'fa-film' }
};

const AD_STATUS_META = {
  active: { label: 'فعال', className: 'badge badge-success' },
  scheduled: { label: 'زمان‌بندی‌شده', className: 'badge badge-warning' },
  paused: { label: 'متوقف', className: 'badge badge-warning' },
  expired: { label: 'منقضی شده', className: 'badge badge-danger' },
  draft: { label: 'پیش‌نویس', className: 'badge badge-info' },
  archived: { label: 'آرشیو', className: 'badge badge-info' }
};

const sanitizeAdString = (value = '') => (typeof value === 'string' ? value.trim() : '');

function formatAdPlacementFa(placement) {
  const key = sanitizeAdString(placement).toLowerCase();
  return AD_PLACEMENT_META[key]?.label || 'جایگاه نامشخص';
}

function getAdPlacementIcon(placement) {
  const key = sanitizeAdString(placement).toLowerCase();
  return AD_PLACEMENT_META[key]?.icon || 'fa-bullhorn';
}

function computeAdRuntimeStatus(ad, nowTs = Date.now()) {
  if (!ad) return 'unknown';
  const status = sanitizeAdString(ad.status).toLowerCase() || 'draft';
  if (status === 'draft') return 'draft';
  if (status === 'archived') return 'archived';
  if (status === 'paused') return 'paused';
  const start = ad.startDate ? new Date(ad.startDate).getTime() : NaN;
  const end = ad.endDate ? new Date(ad.endDate).getTime() : NaN;
  if (Number.isFinite(end) && end < nowTs) return 'expired';
  if (Number.isFinite(start) && start > nowTs) return 'scheduled';
  if (status === 'active') return 'active';
  return status || 'unknown';
}

function getAdStatusMeta(runtimeStatus) {
  return AD_STATUS_META[runtimeStatus] || AD_STATUS_META.active;
}

function formatAdDate(value) {
  if (!value) return 'نامشخص';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'نامشخص';
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'short', day: '2-digit' }).format(date);
}

function formatAdSchedule(ad) {
  return `${formatAdDate(ad.startDate)} تا ${formatAdDate(ad.endDate)}`;
}

function formatAdTimeInfo(ad, runtimeStatus, nowTs = Date.now()) {
  const start = ad.startDate ? new Date(ad.startDate).getTime() : NaN;
  const end = ad.endDate ? new Date(ad.endDate).getTime() : NaN;
  const DAY = 24 * 60 * 60 * 1000;
  if (runtimeStatus === 'scheduled' && Number.isFinite(start)) {
    const diff = start - nowTs;
    if (diff <= 0) return 'به زودی آغاز می‌شود';
    const days = Math.ceil(diff / DAY);
    return days <= 1 ? 'کمتر از یک روز تا شروع' : `${formatNumberFa(days)} روز تا شروع`;
  }
  if (runtimeStatus === 'expired') return 'کمپین منقضی شده است';
  if (Number.isFinite(end)) {
    const diff = end - nowTs;
    if (diff <= 0) return 'کمپین منقضی شده است';
    const days = Math.ceil(diff / DAY);
    return days <= 1 ? 'کمتر از یک روز تا پایان' : `${formatNumberFa(days)} روز تا پایان`;
  }
  return 'بازه زمانی پویا';
}

function summarizeProvinces(list) {
  const provinces = Array.isArray(list) ? list.map((item) => sanitizeAdString(item)).filter(Boolean) : [];
  if (provinces.length === 0) return 'کل کشور';
  if (provinces.length <= 3) return provinces.join('، ');
  return `${provinces.slice(0, 3).join('، ')} و ${formatNumberFa(provinces.length - 3)} استان دیگر`;
}

function summarizeLanding(ad) {
  const url = sanitizeAdString(ad.landingUrl);
  if (!url) return 'بدون لینک کلیک';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch (err) {
    return url;
  }
}

function getAdActionSummary(ad) {
  const placement = sanitizeAdString(ad.placement).toLowerCase();
  const cta = sanitizeAdString(ad.ctaLabel) || 'مشاهده';
  let media = 'محتوا';
  if (placement === 'rewarded') media = 'ویدیو';
  else if (placement === 'interstitial') media = 'صفحه تعاملی';
  else if (placement === 'native') media = 'تصویر + متن';
  else media = 'تصویر';
  return `${media} • CTA: ${cta}`;
}

function normalizeAd(raw = {}) {
  const provinces = Array.isArray(raw.provinces)
    ? raw.provinces.map((value) => sanitizeAdString(value)).filter(Boolean)
    : [];
  const id = raw.id || (raw._id ? String(raw._id) : '');
  return {
    ...raw,
    id,
    name: sanitizeAdString(raw.name) || 'کمپین بدون عنوان',
    placement: sanitizeAdString(raw.placement).toLowerCase() || 'banner',
    status: sanitizeAdString(raw.status).toLowerCase() || 'draft',
    creativeUrl: sanitizeAdString(raw.creativeUrl),
    landingUrl: sanitizeAdString(raw.landingUrl),
    headline: sanitizeAdString(raw.headline),
    body: sanitizeAdString(raw.body),
    ctaLabel: sanitizeAdString(raw.ctaLabel) || 'مشاهده',
    provinces,
    startDate: raw.startDate || raw.start_date || null,
    endDate: raw.endDate || raw.end_date || null,
    rewardType: sanitizeAdString(raw.rewardType).toLowerCase() || 'coins',
    rewardAmount: Number.isFinite(Number(raw.rewardAmount)) ? Number(raw.rewardAmount) : 0,
    priority: Number.isFinite(Number(raw.priority)) ? Number(raw.priority) : 0,
    creativeType: sanitizeAdString(raw.creativeType)
  };
}

function createAdCard(ad) {
  const runtimeStatus = computeAdRuntimeStatus(ad);
  const statusMeta = getAdStatusMeta(runtimeStatus);
  const placementLabel = formatAdPlacementFa(ad.placement);
  const icon = getAdPlacementIcon(ad.placement);
  const scheduleText = formatAdSchedule(ad);
  const timingText = formatAdTimeInfo(ad, runtimeStatus);
  const targetingText = summarizeProvinces(ad.provinces);
  const landingPreview = summarizeLanding(ad);
  const actionSummary = getAdActionSummary(ad);
  const priority = Number.isFinite(Number(ad.priority)) ? Number(ad.priority) : 0;

  const card = document.createElement('div');
  card.className = 'glass rounded-2xl p-6 flex flex-col gap-5';
  card.dataset.adId = ad.id || '';
  card.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-lg text-white/80">
          <i class="fa-solid ${icon}"></i>
        </div>
        <div>
          <h3 class="text-lg font-bold">${escapeHtml(ad.name)}</h3>
          <p class="text-xs text-white/60 mt-1">${escapeHtml(placementLabel)}${priority > 1 ? ` • اولویت ${formatNumberFa(priority)}` : ''}</p>
        </div>
      </div>
      <span class="${statusMeta.className}">${escapeHtml(statusMeta.label)}</span>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      <div class="glass-dark rounded-xl px-4 py-3 border border-white/5">
        <div class="flex items-center justify-between text-xs text-white/60 mb-1">
          <span>بازه نمایش</span>
          <i class="fa-solid fa-calendar"></i>
        </div>
        <div class="font-semibold text-white/90">${escapeHtml(scheduleText)}</div>
        <div class="text-xs text-white/50 mt-1">${escapeHtml(timingText)}</div>
      </div>
      <div class="glass-dark rounded-xl px-4 py-3 border border-white/5">
        <div class="flex items-center justify-between text-xs text-white/60 mb-1">
          <span>هدف‌گیری</span>
          <i class="fa-solid fa-location-dot"></i>
        </div>
        <div class="font-semibold text-white/90">${escapeHtml(targetingText)}</div>
        <div class="text-xs text-white/50 mt-1">${escapeHtml(actionSummary)}</div>
      </div>
    </div>
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-2 text-xs text-white/60">
        <i class="fa-solid fa-link text-white/40"></i>
        <span>${escapeHtml(landingPreview)}</span>
      </div>
      <div class="flex gap-2">
        <button type="button" class="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all duration-300 text-sm" data-action="edit-ad" data-ad-id="${ad.id || ''}">
          <i class="fa-solid fa-pen ml-2"></i> ویرایش
        </button>
        <button type="button" class="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all duration-300 text-sm" data-action="delete-ad" data-ad-id="${ad.id || ''}">
          <i class="fa-solid fa-trash ml-2"></i> حذف
        </button>
      </div>
    </div>
  `;
  return card;
}

function setAdsLoading(isLoading) {
  adsState.loading = Boolean(isLoading);
  if (adsLoadingEl) {
    adsLoadingEl.classList.toggle('hidden', !adsState.loading);
  }
  if (adsGridEl) {
    adsGridEl.classList.toggle('opacity-50', adsState.loading);
  }
}

function updateAdsStats() {
  const elements = adsStatsElements || {};
  if (!getToken()) {
    if (elements.total) elements.total.textContent = '۰';
    if (elements.active) elements.active.textContent = '۰';
    if (elements.scheduled) elements.scheduled.textContent = '۰';
    if (elements.inactive) elements.inactive.textContent = '۰';
    return;
  }
  const nowTs = Date.now();
  let active = 0;
  let scheduled = 0;
  let inactive = 0;
  adsState.items.forEach((ad) => {
    const status = computeAdRuntimeStatus(ad, nowTs);
    if (status === 'active') active += 1;
    else if (status === 'scheduled') scheduled += 1;
    else if (['paused', 'expired', 'archived', 'draft'].includes(status)) inactive += 1;
  });
  if (elements.total) elements.total.textContent = formatNumberFa(adsState.items.length);
  if (elements.active) elements.active.textContent = formatNumberFa(active);
  if (elements.scheduled) elements.scheduled.textContent = formatNumberFa(scheduled);
  if (elements.inactive) elements.inactive.textContent = formatNumberFa(inactive);
}

function getFilteredAds() {
  const nowTs = Date.now();
  const placementFilter = sanitizeAdString(adsState.filters.placement).toLowerCase() || 'all';
  const statusFilter = sanitizeAdString(adsState.filters.status).toLowerCase() || 'all';
  const searchTerm = sanitizeAdString(adsState.filters.search).toLowerCase();
  return adsState.items
    .map((ad) => ({ ...ad, runtimeStatus: computeAdRuntimeStatus(ad, nowTs) }))
    .filter((ad) => {
      if (placementFilter !== 'all' && ad.placement !== placementFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'inactive') {
          if (!['paused', 'expired', 'archived', 'draft'].includes(ad.runtimeStatus)) return false;
        } else if (ad.runtimeStatus !== statusFilter) {
          return false;
        }
      }
      if (!searchTerm) return true;
      const haystack = [
        ad.name,
        ad.headline,
        ad.body,
        ad.landingUrl,
        ad.creativeUrl,
        formatAdPlacementFa(ad.placement)
      ]
        .map((value) => sanitizeAdString(value).toLowerCase())
        .join(' ');
      return haystack.includes(searchTerm);
    });
}

function renderAds() {
  if (!adsGridEl) return;
  const isAuthenticated = Boolean(getToken());
  if (!isAuthenticated) {
    adsGridEl.innerHTML = '';
    if (adsEmptyStateEl) {
      adsEmptyStateEl.classList.remove('hidden');
      if (adsEmptyTitleEl) adsEmptyTitleEl.textContent = 'برای مدیریت تبلیغات وارد شوید';
      if (adsEmptyDescriptionEl) adsEmptyDescriptionEl.textContent = 'برای ساخت یا ویرایش کمپین‌ها ابتدا وارد حساب ادمین شوید.';
      if (adsEmptyCreateButton) {
        adsEmptyCreateButton.disabled = true;
        adsEmptyCreateButton.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }
    return;
  }
  if (adsEmptyCreateButton) {
    adsEmptyCreateButton.disabled = false;
    adsEmptyCreateButton.classList.remove('opacity-50', 'cursor-not-allowed');
  }
  const filtered = getFilteredAds();
  if (!filtered.length) {
    adsGridEl.innerHTML = '';
    if (adsEmptyStateEl) {
      adsEmptyStateEl.classList.remove('hidden');
      if (adsEmptyTitleEl) {
        adsEmptyTitleEl.textContent = adsState.filters.search
          ? 'نتیجه‌ای برای جستجو پیدا نشد'
          : 'هیچ تبلیغی مطابق فیلتر فعلی نیست';
      }
      if (adsEmptyDescriptionEl) {
        if (adsState.filters.search) {
          adsEmptyDescriptionEl.textContent = 'عبارت دیگری را امتحان کنید یا فیلترها را تغییر دهید.';
        } else {
          adsEmptyDescriptionEl.textContent = 'فیلترهای فعال را بازنشانی کنید یا کمپین جدیدی بسازید.';
        }
      }
    }
    return;
  }
  if (adsEmptyStateEl) adsEmptyStateEl.classList.add('hidden');
  const fragment = document.createDocumentFragment();
  filtered.forEach((ad) => {
    fragment.appendChild(createAdCard(ad));
  });
  adsGridEl.innerHTML = '';
  adsGridEl.appendChild(fragment);
}

function renderAdProvinceOptions(selected = []) {
  if (!adProvinceOptionsEl) return;
  const selectedSet = new Set((Array.isArray(selected) ? selected : []).map((item) => sanitizeAdString(item)));
  const provinces = Array.isArray(adsState.provinces) ? adsState.provinces : [];
  adProvinceOptionsEl.innerHTML = '';
  if (!provinces.length) {
    const placeholder = document.createElement('div');
    placeholder.className = 'text-xs text-white/60';
    placeholder.textContent = 'در حال بارگذاری استان‌ها...';
    adProvinceOptionsEl.appendChild(placeholder);
    return;
  }
  provinces.forEach((province) => {
    const name = typeof province === 'string' ? province : province?.name;
    const normalized = sanitizeAdString(name);
    if (!normalized) return;
    const label = document.createElement('label');
    label.className = `chip-toggle province-chip${selectedSet.has(normalized) ? ' active' : ''}`;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'hidden';
    input.value = normalized;
    input.checked = selectedSet.has(normalized);
    input.addEventListener('change', () => {
      label.classList.toggle('active', input.checked);
    });
    label.addEventListener('click', (event) => {
      if (event.target !== input) {
        event.preventDefault();
        input.checked = !input.checked;
        input.dispatchEvent(new Event('change'));
      }
    });
    const span = document.createElement('span');
    span.textContent = normalized;
    label.appendChild(input);
    label.appendChild(span);
    adProvinceOptionsEl.appendChild(label);
  });
}

async function loadAdProvinces() {
  try {
    const res = await fetch('/api/public/provinces', { cache: 'no-store' });
    const data = await res.json();
    const names = Array.isArray(data)
      ? data
          .map((item) => (typeof item === 'string' ? item : item?.name))
          .map((name) => sanitizeAdString(name))
          .filter(Boolean)
      : [];
    adsState.provinces = names.sort((a, b) => a.localeCompare(b, 'fa'));
    let selected = [];
    if (adModal && adModal.dataset.selectedProvinces) {
      try {
        selected = JSON.parse(adModal.dataset.selectedProvinces) || [];
      } catch (err) {
        selected = [];
      }
    }
    renderAdProvinceOptions(selected);
  } catch (error) {
    console.warn('Failed to load provinces', error);
    adsState.provinces = [];
    if (adProvinceOptionsEl) {
      adProvinceOptionsEl.innerHTML = '<span class="text-xs text-red-200">دریافت لیست استان‌ها ناموفق بود</span>';
    }
  }
}

async function loadAds(showToastOnError = true) {
  if (!getToken()) {
    adsState.items = [];
    updateAdsStats();
    renderAds();
    return;
  }
  setAdsLoading(true);
  try {
    const res = await api('/ads?limit=100');
    const list = Array.isArray(res?.data) ? res.data : [];
    adsState.items = list.map(normalizeAd);
    updateAdsStats();
    renderAds();
  } catch (error) {
    console.error('Failed to load ads', error);
    adsState.items = [];
    updateAdsStats();
    renderAds();
    if (showToastOnError) {
      showToast(error.message || 'دریافت تبلیغات ناموفق بود', 'error');
    }
  } finally {
    setAdsLoading(false);
  }
}

function resetAdForm() {
  if (!adForm) return;
  adForm.reset();
  adsState.modalMode = 'create';
  adsState.editingId = null;
  if (adPriorityInput) adPriorityInput.value = '1';
  if (adRewardAmountInput) adRewardAmountInput.value = '20';
  if (adRewardTypeSelect) adRewardTypeSelect.value = 'coins';
  if (adCtaInput) adCtaInput.value = 'مشاهده';
  if (adStatusSelect) adStatusSelect.value = 'active';
  if (adPlacementSelect) adPlacementSelect.value = 'banner';
  if (adModalTitle) adModalTitle.textContent = 'ایجاد تبلیغ جدید';
  if (adModalDescription) adModalDescription.textContent = 'فرم زیر را تکمیل کنید تا تبلیغ در جایگاه‌های انتخابی نمایش داده شود.';
  if (adModal) adModal.dataset.selectedProvinces = '[]';
  renderAdProvinceOptions([]);
  updateAdPlacementFields(adPlacementSelect ? adPlacementSelect.value : 'banner');
  if (adModalScroll) adModalScroll.scrollTop = 0;
}

function updateAdPlacementFields(placement) {
  const normalized = sanitizeAdString(placement).toLowerCase();
  adModalSections.forEach((section) => {
    const attr = section.getAttribute('data-show-placements') || '';
    if (!attr) return;
    const allowed = attr.split(',').map((item) => item.trim().toLowerCase());
    if (allowed.includes(normalized)) {
      section.classList.remove('hidden');
    } else {
      section.classList.add('hidden');
    }
  });
  if (!adModalHelperCreative) return;
  if (normalized === 'interstitial') {
    adModalHelperCreative.textContent = 'برای تبلیغ میانی، لینک یک صفحه امن (HTTPS) را وارد کنید که در iframe نمایش داده می‌شود.';
  } else if (normalized === 'rewarded') {
    adModalHelperCreative.textContent = 'برای ویدیوی پاداش‌دار، لینک مستقیم فایل MP4 یا HLS را وارد کنید.';
  } else if (normalized === 'native') {
    adModalHelperCreative.textContent = 'برای تبلیغ همسان، تصویر مربعی با حداقل ضلع ۳۰۰ پیکسل انتخاب کنید و عنوان جذاب وارد کنید.';
  } else {
    adModalHelperCreative.textContent = 'برای بنر، تصویر JPG/PNG با نسبت ۳۲:۱۰ یا ۳۲۰×۱۰۰ پیکسل پیشنهاد می‌شود.';
  }
}

function buildAdPayloadFromForm() {
  if (!adForm) return null;
  const placement = adPlacementSelect ? adPlacementSelect.value : 'banner';
  const name = sanitizeAdString(adNameInput?.value);
  const status = adStatusSelect ? adStatusSelect.value : 'active';
  const priorityValue = Math.max(0, Math.min(100, Math.round(Number(adPriorityInput?.value || 0)) || 0));
  const startDate = adStartInput ? adStartInput.value : '';
  const endDate = adEndInput ? adEndInput.value : '';
  const creativeUrl = sanitizeAdString(adCreativeInput?.value);
  const landingUrl = sanitizeAdString(adLandingInput?.value);
  const headline = sanitizeAdString(adHeadlineInput?.value);
  const body = sanitizeAdString(adDescriptionInput?.value);
  const ctaLabel = sanitizeAdString(adCtaInput?.value) || 'مشاهده';
  const rewardType = adRewardTypeSelect ? adRewardTypeSelect.value : 'coins';
  const rewardAmount = Math.max(0, Math.round(Number(adRewardAmountInput?.value || 0)));
  const provinces = adProvinceOptionsEl
    ? Array.from(adProvinceOptionsEl.querySelectorAll('input[type="checkbox"]'))
        .filter((input) => input.checked)
        .map((input) => sanitizeAdString(input.value))
        .filter(Boolean)
    : [];

  if (!name) {
    showToast('نام کمپین را وارد کنید', 'warning');
    return null;
  }
  if (!placement) {
    showToast('جایگاه تبلیغ را انتخاب کنید', 'warning');
    return null;
  }
  if (!startDate || !endDate) {
    showToast('بازه زمانی کمپین را مشخص کنید', 'warning');
    return null;
  }
  if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
    showToast('تاریخ پایان باید بعد از تاریخ شروع باشد', 'warning');
    return null;
  }
  if (!creativeUrl) {
    showToast('آدرس رسانه تبلیغ الزامی است', 'warning');
    return null;
  }
  if (['banner', 'native', 'rewarded'].includes(placement) && !landingUrl) {
    showToast('لینک مقصد برای این جایگاه الزامی است', 'warning');
    return null;
  }
  if (placement === 'native' && !headline) {
    showToast('عنوان تبلیغ همسان را وارد کنید', 'warning');
    return null;
  }
  if (placement === 'rewarded' && rewardAmount <= 0) {
    showToast('مقدار پاداش باید بزرگ‌تر از صفر باشد', 'warning');
    return null;
  }

  return {
    name,
    placement,
    status,
    priority: priorityValue,
    startDate,
    endDate,
    creativeUrl,
    landingUrl,
    headline,
    body,
    ctaLabel,
    rewardType,
    rewardAmount,
    provinces
  };
}

function openAdModal(mode = 'create', ad = null) {
  if (!adModal) return;
  const normalizedMode = mode === 'edit' && ad ? 'edit' : 'create';
  adsState.modalMode = normalizedMode;
  adsState.editingId = normalizedMode === 'edit' && ad?.id ? ad.id : null;
  const selectedProvinces = normalizedMode === 'edit' && ad ? ad.provinces || [] : [];
  if (adModal) adModal.dataset.selectedProvinces = JSON.stringify(selectedProvinces);
  if (normalizedMode === 'edit' && ad) {
    if (adModalTitle) adModalTitle.textContent = 'ویرایش تبلیغ';
    if (adModalDescription) adModalDescription.textContent = 'تغییرات مورد نظر را اعمال کرده و ذخیره کنید تا کمپین به‌روزرسانی شود.';
    if (adNameInput) adNameInput.value = ad.name || '';
    if (adPlacementSelect) adPlacementSelect.value = ad.placement || 'banner';
    if (adStatusSelect) adStatusSelect.value = ad.status || 'active';
    if (adPriorityInput) adPriorityInput.value = String(Math.max(0, Math.round(Number(ad.priority) || 0)));
    if (adStartInput) adStartInput.value = ad.startDate ? new Date(ad.startDate).toISOString().slice(0, 10) : '';
    if (adEndInput) adEndInput.value = ad.endDate ? new Date(ad.endDate).toISOString().slice(0, 10) : '';
    if (adCreativeInput) adCreativeInput.value = ad.creativeUrl || '';
    if (adLandingInput) adLandingInput.value = ad.landingUrl || '';
    if (adHeadlineInput) adHeadlineInput.value = ad.headline || '';
    if (adDescriptionInput) adDescriptionInput.value = ad.body || '';
    if (adCtaInput) adCtaInput.value = ad.ctaLabel || 'مشاهده';
    if (adRewardTypeSelect) adRewardTypeSelect.value = ad.rewardType || 'coins';
    if (adRewardAmountInput) adRewardAmountInput.value = String(Math.max(0, Math.round(Number(ad.rewardAmount) || 0)) || 0);
    renderAdProvinceOptions(selectedProvinces);
  } else {
    resetAdForm();
  }
  updateAdPlacementFields(adPlacementSelect ? adPlacementSelect.value : 'banner');
  openModal('#ad-modal');
  if (adModalScroll) adModalScroll.scrollTop = 0;
}

function handleAdEdit(adId) {
  if (!adId) return;
  const ad = adsState.items.find((item) => item.id === adId);
  if (!ad) {
    showToast('تبلیغ مورد نظر یافت نشد', 'error');
    return;
  }
  openAdModal('edit', ad);
}

async function handleAdDelete(adId, triggerButton) {
  if (!adId) return;
  if (!getToken()) {
    showToast('برای حذف تبلیغات ابتدا وارد شوید', 'warning');
    return;
  }
  const ad = adsState.items.find((item) => item.id === adId);
  const adName = ad?.name || 'این کمپین';
  const confirmed = window.confirm(`آیا از حذف «${adName}» مطمئن هستید؟`);
  if (!confirmed) return;
  const originalHtml = triggerButton ? triggerButton.innerHTML : '';
  if (triggerButton) {
    triggerButton.disabled = true;
    triggerButton.classList.add('opacity-70', 'cursor-not-allowed');
    triggerButton.innerHTML = '<span class="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin"></span>';
  }
  try {
    await api(`/ads/${adId}`, { method: 'DELETE' });
    showToast('تبلیغ حذف شد', 'success');
    await loadAds(false);
    await loadDashboardOverview(true);
  } catch (error) {
    showToast(error.message || 'حذف تبلیغ ناموفق بود', 'error');
  } finally {
    if (triggerButton) {
      triggerButton.disabled = false;
      triggerButton.classList.remove('opacity-70', 'cursor-not-allowed');
      triggerButton.innerHTML = originalHtml || '<i class="fa-solid fa-trash ml-2"></i> حذف';
    }
  }
}

async function handleAdSubmit(event) {
  event.preventDefault();
  if (!getToken()) {
    showToast('برای ذخیره تبلیغ ابتدا وارد شوید', 'warning');
    return;
  }
  const payload = buildAdPayloadFromForm();
  if (!payload) return;
  const isEdit = adsState.modalMode === 'edit' && adsState.editingId;
  if (adSubmitBtn) {
    adSubmitBtn.disabled = true;
    adSubmitBtn.classList.add('opacity-70', 'cursor-not-allowed');
    adSubmitBtn.innerHTML = `
      <span class="flex items-center gap-2">
        <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        <span>در حال ذخیره...</span>
      </span>
    `;
  }
  try {
    if (isEdit) {
      await api(`/ads/${adsState.editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('تغییرات تبلیغ ذخیره شد', 'success');
    } else {
      await api('/ads', { method: 'POST', body: JSON.stringify(payload) });
      showToast('تبلیغ با موفقیت ایجاد شد', 'success');
    }
    closeModal('#ad-modal');
    await loadAds(false);
    await loadDashboardOverview(true);
  } catch (error) {
    showToast(error.message || 'ذخیره تبلیغ ناموفق بود', 'error');
  } finally {
    if (adSubmitBtn) {
      adSubmitBtn.disabled = false;
      adSubmitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
      adSubmitBtn.innerHTML = adSubmitBtnDefault;
    }
  }
}

// --------------- AUTH (JWT) ---------------
let sessionExpiredNotified = false;

function getToken() { return localStorage.getItem('iq_admin_token'); }
function setToken(t) {
  sessionExpiredNotified = false;
  if (!t) {
    clearToken();
    return;
  }
  localStorage.setItem('iq_admin_token', t);
}
function clearToken() { localStorage.removeItem('iq_admin_token'); }
function logout() { clearToken(); location.reload(); }

function forceReauthentication(message = '') {
  clearToken();
  const normalizedMessage = message && typeof message === 'string' ? message.trim() : '';
  if (!sessionExpiredNotified) {
    sessionExpiredNotified = true;
    const fallbackMessage = normalizedMessage || 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید';
    showToast(fallbackMessage, 'warning');
  }
  const loginModal = $('#login-modal');
  if (loginModal && !loginModal.classList.contains('active')) {
    openModal('#login-modal');
  }
}

async function api(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  headers['Content-Type'] = 'application/json';

  const fetchOptions = { ...options, headers };
  if (!fetchOptions.cache) {
    fetchOptions.cache = 'no-store';
  }

  const res = await fetch(`${API_BASE}${path}`, fetchOptions);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    const errorMessage = err.message || 'Request failed';
    if (res.status === 401) {
      const normalized = errorMessage.toLowerCase();
      if (normalized.includes('token') || normalized.includes('unauthorized') || normalized.includes('expired')) {
        forceReauthentication(errorMessage);
      }
    }
    throw new Error(errorMessage);
  }
  return res.json();
}


// --------------- TOAST ---------------
function ensureToastContainer() {
  if (typeof document === 'undefined') return null;
  let container = $('#toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center';
    (document.body || document.documentElement)?.appendChild(container);
  }
  return container;
}

function showToast(message, type = 'info', duration = 3000) {
  const toastContainer = ensureToastContainer();
  if (!toastContainer) {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message);
    }
    return;
  }
  const toast = document.createElement('div');
  let icon = 'fa-info-circle', bgColor = 'bg-blue-500/80';
  if (type === 'success') { icon='fa-check-circle'; bgColor='bg-green-500/80'; }
  else if (type === 'error') { icon='fa-exclamation-circle'; bgColor='bg-red-500/80'; }
  else if (type === 'warning') { icon='fa-exclamation-triangle'; bgColor='bg-yellow-500/80'; }
  toast.className = `glass ${bgColor} px-6 py-4 rounded-2xl text-white font-bold z-50 flex items-center gap-3 mb-3 fade-in shadow-lg`;
  toast.innerHTML = `<i class="fas ${icon} text-xl"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(()=>{ toast.style.opacity='0'; toast.style.transform='translateY(-20px)'; toast.style.transition='all .3s'; setTimeout(()=>toast.remove(),300); }, duration);
}

// --------------- NAV/UI (کدهای قبلی) ---------------
function navigateTo(page) {
  $$('main > section').forEach(section => section.classList.add('hidden'));
  $(`#page-${page}`).classList.remove('hidden');
  $(`#page-${page}`).classList.add('fade-in');
  $$('.sidebar-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) item.classList.add('active');
  });
  $('#mobile-menu').classList.add('translate-x-full');
  window.scrollTo(0, 0);
}
$$('.sidebar-item').forEach(item => item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); }));

$('#mobile-menu-toggle').addEventListener('click', () => $('#mobile-menu').classList.toggle('translate-x-full'));
$('#close-mobile-menu').addEventListener('click', () => $('#mobile-menu').classList.add('translate-x-full'));

function openModal(modalId) { $(modalId).classList.add('active'); document.body.style.overflow = 'hidden'; }
function resetAddQuestionForm() {
  if (addQuestionTextInput) addQuestionTextInput.value = '';
  if (addQuestionDifficultySelect) addQuestionDifficultySelect.value = 'easy';
  if (addQuestionCategorySelect) addQuestionCategorySelect.value = '';
  if (addQuestionActiveInput) addQuestionActiveInput.checked = true;
  if (addQuestionAuthorInput) addQuestionAuthorInput.value = '';
  if (addQuestionOptionsWrapper) {
    addQuestionOptionsWrapper.querySelectorAll('input.form-input').forEach((input) => {
      input.value = '';
    });
    addQuestionOptionsWrapper
      .querySelectorAll('input[type="radio"][name="correct-answer"]')
      .forEach((radio) => { radio.checked = false; });
  }
  refreshCategorySelects({ addSelected: '' });
}

function closeModal(modalId) {
  const modal = $(modalId);
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
  if (modalId === '#question-detail-modal') {
    modal.dataset.qId = '';
    if (questionDetailForm) questionDetailForm.reset();
    if (questionOptionsWrapper) questionOptionsWrapper.innerHTML = '';
    if (questionCorrectPreviewEl) questionCorrectPreviewEl.textContent = '---';
    if (updateQuestionBtn) {
      updateQuestionBtn.disabled = false;
      updateQuestionBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
      updateQuestionBtn.innerHTML = updateQuestionBtnDefault;
    }
  }
  if (modalId === '#add-question-modal') {
    resetAddQuestionForm();
  }
  if (modalId === '#add-category-modal') {
    resetCategoryModal();
  }
  if (modalId === '#ad-modal') {
    resetAdForm();
  }
  if (modalId === '#import-questions-modal') {
    resetImportQuestionsModal();
  }
}
$$('.modal').forEach(modal => modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(`#${modal.id}`); }));
$$('.close-modal').forEach(button => button.addEventListener('click', () => { const modal = button.closest('.modal'); closeModal(`#${modal.id}`); }));

if (addAdButton) {
  addAdButton.addEventListener('click', () => {
    if (!getToken()) {
      showToast('برای ساخت کمپین ابتدا وارد شوید', 'warning');
      return;
    }
    openAdModal('create');
  });
}

if (adsEmptyCreateButton) {
  adsEmptyCreateButton.addEventListener('click', () => {
    if (!getToken()) {
      showToast('برای ساخت کمپین ابتدا وارد شوید', 'warning');
      return;
    }
    openAdModal('create');
  });
}

if (adPlacementSelect) {
  adPlacementSelect.addEventListener('change', (event) => {
    updateAdPlacementFields(event.target.value);
  });
}

adsPlacementFilterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const value = button.dataset.adsFilterPlacement || 'all';
    adsState.filters.placement = value;
    adsPlacementFilterButtons.forEach((btn) => {
      btn.classList.toggle('active', btn === button);
    });
    renderAds();
  });
});

adsStatusFilterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const value = button.dataset.adsFilterStatus || 'all';
    adsState.filters.status = value;
    adsStatusFilterButtons.forEach((btn) => {
      btn.classList.toggle('active', btn === button);
    });
    renderAds();
  });
});

if (adsSearchInput) {
  adsSearchInput.addEventListener('input', (event) => {
    const value = event.target.value || '';
    if (adsSearchDebounce) clearTimeout(adsSearchDebounce);
    adsSearchDebounce = setTimeout(() => {
      adsState.filters.search = value;
      renderAds();
    }, 250);
  });
}

if (adForm) {
  adForm.addEventListener('submit', handleAdSubmit);
}

if (adsGridEl) {
  adsGridEl.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const adId = target.dataset.adId || '';
    if (action === 'delete-ad') {
      event.preventDefault();
      handleAdDelete(adId, target);
    }
    if (action === 'edit-ad') {
      event.preventDefault();
      handleAdEdit(adId);
    }
  });
}

$('#btn-add-question').addEventListener('click', async () => {
  if (!getToken()) {
    showToast('برای مدیریت سوالات ابتدا وارد شوید', 'warning');
    return;
  }
  if (!cachedCategories.length) {
    try {
      await loadCategoryFilterOptions();
    } catch (err) {
      console.error('Failed to refresh categories for question modal', err);
    }
  }
  resetAddQuestionForm();
  refreshCategorySelects({ addSelected: '' });
  openModal('#add-question-modal');
  setTimeout(() => { addQuestionTextInput?.focus(); }, 50);
});

if (importQuestionsBtn) {
  importQuestionsBtn.addEventListener('click', async () => {
    if (!getToken()) {
      showToast('برای مدیریت سوالات ابتدا وارد شوید', 'warning');
      return;
    }
    if (!cachedCategories.length) {
      try {
        await loadCategoryFilterOptions();
      } catch (error) {
        console.error('Failed to load categories before import modal', error);
      }
    }
    resetImportQuestionsModal();
    openModal('#import-questions-modal');
    setTimeout(() => { importQuestionsTextarea?.focus(); }, 120);
  });
}

if (importQuestionsFileButton && importQuestionsFileInput) {
  importQuestionsFileButton.addEventListener('click', () => {
    importQuestionsFileInput.click();
  });
}

if (importQuestionsFileInput) {
  importQuestionsFileInput.addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      importQuestionsState.fileName = '';
      renderImportQuestionsState();
      return;
    }
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('حجم فایل نباید از ۲ مگابایت بیشتر باشد.', 'warning');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      importQuestionsState.fileName = file.name;
      applyImportPayload(text);
    };
    reader.onerror = () => {
      showToast('خواندن فایل JSON با مشکل مواجه شد.', 'error');
    };
    reader.readAsText(file, 'utf-8');
  });
}

if (importQuestionsTextarea) {
  importQuestionsTextarea.addEventListener('input', (event) => {
    const value = event.target.value || '';
    if (importQuestionsDebounce) clearTimeout(importQuestionsDebounce);
    importQuestionsDebounce = setTimeout(() => {
      importQuestionsState.fileName = '';
      applyImportPayload(value);
    }, 250);
  });
}

if (importQuestionsSubmitBtn) {
  importQuestionsSubmitBtn.addEventListener('click', handleImportQuestionsSubmit);
}
if (addCategoryBtn) {
  addCategoryBtn.addEventListener('click', () => {
    if (CATEGORY_MANAGEMENT_LOCKED) {
      notifyCategoryManagementLocked();
      return;
    }
    openCategoryModal('create');
  });
}
if (categoriesEmptyActionBtn) {
  categoriesEmptyActionBtn.addEventListener('click', () => {
    if (categoriesEmptyActionBtn.disabled) {
      if (!getToken()) {
        showToast('برای مدیریت دسته‌بندی‌ها ابتدا وارد شوید', 'warning');
      } else if (CATEGORY_MANAGEMENT_LOCKED) {
        notifyCategoryManagementLocked();
      }
      return;
    }
    if (CATEGORY_MANAGEMENT_LOCKED) {
      notifyCategoryManagementLocked();
      return;
    }
    openCategoryModal('create');
  });
}
if (categoriesGridEl) {
  categoriesGridEl.addEventListener('click', async (event) => {
    const target = event.target;
    if (!target) return;

    const editButton = target.closest('[data-action="edit-category"]');
    if (editButton) {
      event.preventDefault();
      const categoryId = editButton.dataset.categoryId || '';
      const category = findCategoryById(categoryId);
      if (!category) {
        showToast('دسته‌بندی مورد نظر یافت نشد', 'error');
        return;
      }
      openCategoryModal('edit', category);
      return;
    }

    const deleteButton = target.closest('[data-action="delete-category"]');
    if (deleteButton) {
      event.preventDefault();
      if (CATEGORY_MANAGEMENT_LOCKED) {
        notifyCategoryManagementLocked();
        return;
      }
      if (!getToken()) {
        showToast('برای حذف دسته‌بندی ابتدا وارد شوید', 'warning');
        return;
      }
      const categoryId = deleteButton.dataset.categoryId || '';
      const category = findCategoryById(categoryId);
      if (!categoryId || !category) {
        showToast('دسته‌بندی مورد نظر یافت نشد', 'error');
        return;
      }
      const categoryLabel = category.displayName || category.name;
      const confirmed = window.confirm(`آیا از حذف دسته‌بندی «${categoryLabel}» مطمئن هستید؟`);
      if (!confirmed) return;

      const originalHtml = deleteButton.innerHTML;
      deleteButton.disabled = true;
      deleteButton.classList.add('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
      deleteButton.innerHTML = `
        <span class="flex items-center gap-2 justify-center">
          <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span>در حال حذف...</span>
        </span>
      `;
      try {
        await api(`/categories/${categoryId}`, { method: 'DELETE' });
        showToast('دسته‌بندی حذف شد', 'success');
        await loadCategoryFilterOptions(true);
        await loadDashboardOverview(true);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        deleteButton.disabled = false;
        deleteButton.classList.remove('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
        deleteButton.innerHTML = originalHtml;
      }
    }
  });
}
$('#btn-add-user').addEventListener('click', () => openModal('#add-user-modal'));
$('#btn-add-achievement').addEventListener('click', () => openModal('#add-achievement-modal'));

if (questionStatsCard) {
  const handleOpenQuestionStats = async () => {
    if (!getToken()) {
      showToast('برای مشاهده آمار ابتدا وارد شوید', 'warning');
      return;
    }
    const stats = await loadDashboardStats(true);
    if (stats) openModal('#question-stats-modal');
  };

  questionStatsCard.addEventListener('click', handleOpenQuestionStats);
  questionStatsCard.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      await handleOpenQuestionStats();
    }
  });
}

// تاریخ شمسی
const date = new Date();
const persianDate = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
$('#current-date').textContent = persianDate;

// --------------- AUTH: Login Modal ---------------
async function login() {
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value.trim();
  if (!email || !password) return showToast('ایمیل و رمز را وارد کنید', 'warning');
  try {
    const res = await api('/auth/login', { method:'POST', body: JSON.stringify({ email, password }) });
    setToken(res.token);
    closeModal('#login-modal');
    showToast('ورود موفق', 'success');
    await loadAllData();
  } catch (e) {
    showToast(e.message, 'error');
  }
}
$('#login-submit').addEventListener('click', login);

// اگر توکن نداریم، مودال ورود باز بماند
if (getToken()) closeModal('#login-modal');

function resolveDashboardMessage(state, message, fallback = {}) {
  if (message) return message;
  if (state === 'auth') return fallback.auth || 'برای مشاهده آمار وارد شوید';
  if (state === 'loading') return fallback.loading || 'در حال بارگذاری داده‌ها...';
  if (state === 'error') return fallback.error || 'آمار در دسترس نیست';
  return fallback.empty || 'داده‌ای برای نمایش وجود ندارد';
}

const RELATIVE_DIVISIONS = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' }
];

function formatRelativeTimeFa(value) {
  if (!value) return 'لحظاتی پیش';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'زمان نامشخص';
  let duration = (date.getTime() - Date.now()) / 1000;
  for (const division of RELATIVE_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relativeTimeFormatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return 'لحظاتی پیش';
}

function parseSeriesDate(item) {
  if (!item) return null;
  if (item.date instanceof Date) return item.date;
  if (item.timestamp instanceof Date) return item.timestamp;
  const source = typeof item.date === 'string' ? item.date : typeof item.timestamp === 'string' ? item.timestamp : '';
  if (!source) return null;
  const iso = source.length <= 10 ? `${source}T00:00:00` : source;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatPersianWeekday(value) {
  const date = parseSeriesDate({ date: value });
  if (!date) return '—';
  return persianWeekdayFormatter.format(date);
}

function formatPersianDateShort(value) {
  const date = parseSeriesDate({ date: value });
  if (!date) return '—';
  return persianDateFormatter.format(date);
}

function setDeltaTone(element, tone) {
  if (!element) return;
  element.classList.remove('text-emerald-300', 'bg-emerald-500/10', 'text-rose-300', 'bg-rose-500/10', 'text-white/80', 'bg-white/10');
  if (tone === 'positive') {
    element.classList.add('text-emerald-300', 'bg-emerald-500/10');
  } else if (tone === 'negative') {
    element.classList.add('text-rose-300', 'bg-rose-500/10');
  } else {
    element.classList.add('text-white/80', 'bg-white/10');
  }
}

function renderDashboardUsersCard(data, state = 'success', message = '') {
  if (!dashboardUsersActiveEl && !dashboardUsersTotalLabelEl && !dashboardUsersDeltaEl) return;
  if (state !== 'success' || !data) {
    const fallback = resolveDashboardMessage(state, message, {
      loading: 'در حال بارگذاری آمار کاربران...',
      empty: 'آماری برای نمایش وجود ندارد'
    });
    if (dashboardUsersActiveEl) dashboardUsersActiveEl.textContent = state === 'loading' ? '…' : '—';
    if (dashboardUsersTotalLabelEl) dashboardUsersTotalLabelEl.textContent = fallback;
    if (dashboardUsersDeltaEl) {
      setDeltaTone(dashboardUsersDeltaEl, 'neutral');
      dashboardUsersDeltaEl.textContent = state === 'loading' ? '...' : '—';
    }
    return;
  }

  const active = Number.isFinite(Number(data.active)) ? Number(data.active) : 0;
  const total = Number.isFinite(Number(data.total)) ? Number(data.total) : active;
  const today = Number.isFinite(Number(data.today)) ? Number(data.today) : 0;
  const yesterday = Number.isFinite(Number(data.yesterday)) ? Number(data.yesterday) : 0;

  if (dashboardUsersActiveEl) dashboardUsersActiveEl.textContent = formatNumberFa(active);
  if (dashboardUsersTotalLabelEl) dashboardUsersTotalLabelEl.textContent = `کل کاربران: ${formatNumberFa(total)}`;

  if (dashboardUsersDeltaEl) {
    const delta = today - yesterday;
    const percent = yesterday > 0 ? (delta / yesterday) * 100 : (today > 0 ? 100 : 0);
    const roundedPercent = Math.round(percent * 10) / 10;
    let label = 'بدون تغییر';
    let tone = 'neutral';
    if (roundedPercent > 0) {
      label = `+${formatPercentFa(Math.abs(roundedPercent))}٪ نسبت به دیروز`;
      tone = 'positive';
    } else if (roundedPercent < 0) {
      label = `−${formatPercentFa(Math.abs(roundedPercent))}٪ نسبت به دیروز`;
      tone = 'negative';
    }
    setDeltaTone(dashboardUsersDeltaEl, tone);
    dashboardUsersDeltaEl.textContent = label;
  }
}

function renderDashboardCategoriesCard(data, state = 'success', message = '') {
  if (!dashboardCategoriesTotalEl) return;
  if (state !== 'success' || !data) {
    const fallback = resolveDashboardMessage(state, message, {
      loading: 'در حال بارگذاری آمار دسته‌بندی‌ها...',
      empty: 'داده‌ای برای نمایش وجود ندارد'
    });
    dashboardCategoriesTotalEl.textContent = '—';
    if (dashboardCategoriesActiveEl) dashboardCategoriesActiveEl.textContent = fallback;
    if (dashboardCategoriesWithQuestionsEl) dashboardCategoriesWithQuestionsEl.textContent = '';
    if (dashboardCategoriesPendingEl) {
      dashboardCategoriesPendingEl.textContent = '—';
      dashboardCategoriesPendingEl.classList.add('opacity-60');
    }
    return;
  }

  const total = Number.isFinite(Number(data.total)) ? Number(data.total) : 0;
  const active = Number.isFinite(Number(data.active)) ? Number(data.active) : 0;
  const pending = Number.isFinite(Number(data.pending)) ? Number(data.pending) : 0;
  const withQuestions = Number.isFinite(Number(data.withQuestions)) ? Number(data.withQuestions) : 0;

  dashboardCategoriesTotalEl.textContent = formatNumberFa(total);
  if (dashboardCategoriesActiveEl) {
    dashboardCategoriesActiveEl.textContent = `فعال: ${formatNumberFa(active)}`;
  }
  if (dashboardCategoriesWithQuestionsEl) {
    dashboardCategoriesWithQuestionsEl.textContent = `دارای سوال: ${formatNumberFa(withQuestions)}`;
  }
  if (dashboardCategoriesPendingEl) {
    dashboardCategoriesPendingEl.textContent = `در انتظار: ${formatNumberFa(pending)}`;
    dashboardCategoriesPendingEl.classList.toggle('opacity-60', pending === 0);
  }
}

function renderDashboardAdsCard(data, state = 'success', message = '') {
  if (!dashboardAdsActiveEl) return;
  if (state !== 'success' || !data) {
    const fallback = resolveDashboardMessage(state, message, {
      loading: 'در حال دریافت وضعیت کمپین‌ها...',
      empty: 'داده‌ای برای نمایش وجود ندارد'
    });
    dashboardAdsActiveEl.textContent = '—';
    if (dashboardAdsTotalEl) dashboardAdsTotalEl.textContent = fallback;
    if (dashboardAdsPausedEl) dashboardAdsPausedEl.textContent = 'متوقف شده: —';
    if (dashboardAdsStatusEl) {
      dashboardAdsStatusEl.textContent = '—';
      dashboardAdsStatusEl.classList.add('opacity-60');
    }
    return;
  }

  const active = Number.isFinite(Number(data.active)) ? Number(data.active) : 0;
  const total = Number.isFinite(Number(data.total)) ? Number(data.total) : active;
  const paused = Number.isFinite(Number(data.paused)) ? Number(data.paused) : 0;
  const draft = Number.isFinite(Number(data.draft)) ? Number(data.draft) : 0;
  const archived = Number.isFinite(Number(data.archived)) ? Number(data.archived) : 0;

  dashboardAdsActiveEl.textContent = formatNumberFa(active);
  if (dashboardAdsTotalEl) dashboardAdsTotalEl.textContent = `کل کمپین‌ها: ${formatNumberFa(total)}`;
  if (dashboardAdsPausedEl) dashboardAdsPausedEl.textContent = `متوقف شده: ${formatNumberFa(paused)}`;
  if (dashboardAdsStatusEl) {
    let badgeText = '';
    if (draft > 0) badgeText = `پیش‌نویس: ${formatNumberFa(draft)}`;
    else if (archived > 0) badgeText = `آرشیو: ${formatNumberFa(archived)}`;
    else if (paused > 0) badgeText = `متوقف شده: ${formatNumberFa(paused)}`;
    else badgeText = 'بدون مورد خاص';
    dashboardAdsStatusEl.textContent = badgeText;
    dashboardAdsStatusEl.classList.toggle('opacity-60', badgeText === 'بدون مورد خاص');
  }
}

function renderDashboardUsersChart(series = [], state = 'success', message = '') {
  if (!dashboardUsersChartEl) return;
  dashboardUsersChartEl.innerHTML = '';
  const fallback = resolveDashboardMessage(state, message, {
    loading: 'در حال آماده‌سازی نمودار کاربران...',
    empty: 'داده‌ای برای نمایش وجود ندارد'
  });

  if (!Array.isArray(series) || state !== 'success') {
    if (dashboardUsersChartEmptyEl) {
      dashboardUsersChartEmptyEl.textContent = fallback;
      dashboardUsersChartEmptyEl.classList.remove('hidden');
    }
    if (dashboardUsersAverageEl) dashboardUsersAverageEl.textContent = 'میانگین روزانه: —';
    return;
  }

  const counts = series.map((item) => Number(item?.count) || 0);
  const max = Math.max(...counts, 0);
  const fragment = document.createDocumentFragment();
  let total = 0;
  series.forEach((item, index) => {
    const count = counts[index];
    total += count;
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center flex-1';

    const bar = document.createElement('div');
    const isPeak = max > 0 && count === max;
    const gradient = isPeak ? 'from-amber-500 to-amber-400' : 'from-blue-500 to-blue-400';
    bar.className = `w-full bg-gradient-to-t ${gradient} rounded-t-lg transition-all duration-300`;
    let height = max > 0 ? (count / max) * 100 : 0;
    if (max > 0 && height < 8 && count > 0) height = 8;
    if (max === 0 && count === 0) height = 4;
    bar.style.height = `${Math.max(2, Math.min(100, height))}%`;
    const date = parseSeriesDate(item);
    const fullLabel = item && typeof item.fullLabel === 'string' ? item.fullLabel : formatPersianDateShort(date);
    bar.title = `${fullLabel} · ${formatNumberFa(count)} کاربر`;
    container.appendChild(bar);

    const labelEl = document.createElement('div');
    labelEl.className = 'text-xs mt-2';
    const weekday = item && typeof item.label === 'string' ? item.label : formatPersianWeekday(date);
    labelEl.textContent = weekday;
    container.appendChild(labelEl);

    fragment.appendChild(container);
  });

  dashboardUsersChartEl.appendChild(fragment);
  if (dashboardUsersChartEmptyEl) {
    const hasPositive = counts.some((value) => value > 0);
    dashboardUsersChartEmptyEl.textContent = hasPositive ? '' : 'داده‌ای ثبت نشده است';
    dashboardUsersChartEmptyEl.classList.toggle('hidden', hasPositive);
  }
  if (dashboardUsersAverageEl) {
    const average = series.length ? total / series.length : 0;
    dashboardUsersAverageEl.textContent = `میانگین روزانه: ${formatNumberFa(Math.round(average))}`;
  }
}

function renderDashboardTopCategories(list = [], options = {}) {
  if (!dashboardTopCategoriesEl) return;
  const {
    state = 'success',
    message = '',
    totalQuestions = 0,
    totalSelections = 0,
    totalConsumption = 0
  } = options;

  dashboardTopCategoriesEl.innerHTML = '';

  if (!Array.isArray(list) || state !== 'success' || list.length === 0) {
    if (dashboardTopCategoriesEmptyEl) {
      dashboardTopCategoriesEmptyEl.textContent = resolveDashboardMessage(state, message, {
        loading: 'در حال بارگذاری محبوب‌ترین دسته‌بندی‌ها...',
        empty: 'هنوز داده‌ای برای تحلیل انتخاب کاربران ثبت نشده است'
      });
      dashboardTopCategoriesEmptyEl.classList.remove('hidden');
    }
    if (dashboardTopCategoriesTotalEl) {
      dashboardTopCategoriesTotalEl.textContent = 'داده‌ای برای دسته‌بندی‌های محبوب در دسترس نیست';
    }
    return;
  }

  if (dashboardTopCategoriesEmptyEl) {
    dashboardTopCategoriesEmptyEl.classList.add('hidden');
  }

  const computedTotals = list.reduce((acc, item) => {
    acc.questions += Number(item?.questionCount) || 0;
    acc.selections += Number(item?.selectionCount) || 0;
    acc.consumption += Number(item?.consumptionCount) || 0;
    return acc;
  }, { questions: 0, selections: 0, consumption: 0 });

  const selectionTotal = totalSelections || computedTotals.selections;
  const consumptionTotal = totalConsumption || computedTotals.consumption;
  const questionTotal = totalQuestions || computedTotals.questions;

  if (dashboardTopCategoriesTotalEl) {
    const summaryParts = [];
    if (questionTotal > 0) summaryParts.push(`سوالات تایید شده: ${formatNumberFa(questionTotal)}`);
    if (selectionTotal > 0) summaryParts.push(`انتخاب کاربران: ${formatNumberFa(selectionTotal)}`);
    if (consumptionTotal > 0) summaryParts.push(`مصرف سوال: ${formatNumberFa(consumptionTotal)}`);
    dashboardTopCategoriesTotalEl.textContent = summaryParts.length
      ? summaryParts.join(' • ')
      : 'هنوز داده‌ای برای دسته‌بندی‌های محبوب در دسترس نیست';
  }

  const createMetricRow = (label, count, share, gradient, icon) => {
    const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
    const safeShare = Number.isFinite(Number(share)) ? Number(share) : 0;
    const percentLabel = `${formatPercentFa(Math.round(safeShare * 10) / 10)}٪`;
    const barWidth = Math.min(100, safeShare > 0 ? Math.max(safeShare, 6) : 0);
    return `
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-3 text-white/70">
          <span class="inline-flex items-center gap-2">
            <i class="fa-solid ${icon} text-white/50"></i>
            <span>${label}</span>
          </span>
          <span class="inline-flex items-center gap-2 font-bold text-white/80">
            <span>${formatNumberFa(safeCount)}</span>
            <span class="text-white/50">•</span>
            <span>${percentLabel}</span>
          </span>
        </div>
        <div class="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r ${gradient} rounded-full" style="width: ${barWidth.toFixed(1)}%"></div>
        </div>
      </div>
    `;
  };

  const fragment = document.createDocumentFragment();

  list.forEach((item, index) => {
    const name = escapeHtml(item?.name || 'نامشخص');
    const gradient = CATEGORY_COLOR_GRADIENTS[item?.color] || 'from-slate-500 to-slate-400';
    const questionCount = Number.isFinite(Number(item?.questionCount)) ? Number(item.questionCount) : 0;
    const selectionCount = Number.isFinite(Number(item?.selectionCount)) ? Number(item.selectionCount) : 0;
    const consumptionCount = Number.isFinite(Number(item?.consumptionCount)) ? Number(item.consumptionCount) : 0;

    const questionShare = Number.isFinite(Number(item?.percentage))
      ? Number(item.percentage)
      : (questionTotal > 0 ? (questionCount / questionTotal) * 100 : 0);
    const selectionShare = Number.isFinite(Number(item?.selectionShare))
      ? Number(item.selectionShare)
      : (selectionTotal > 0 ? (selectionCount / selectionTotal) * 100 : 0);
    const consumptionShare = Number.isFinite(Number(item?.consumptionShare))
      ? Number(item.consumptionShare)
      : (consumptionTotal > 0 ? (consumptionCount / consumptionTotal) * 100 : 0);

    const metricsForHighlight = [
      { label: 'انتخاب کاربران', value: selectionShare },
      { label: 'مصرف سوال', value: consumptionShare },
      { label: 'سهم از بانک سوال', value: questionShare }
    ];
    const highlight = metricsForHighlight.reduce((best, current) => (
      current.value > best.value ? current : best
    ), metricsForHighlight[0]);
    const highlightLabel = `${highlight.label} • ${formatPercentFa(Math.round(highlight.value * 10) / 10)}٪`;

    const wrapper = document.createElement('div');
    wrapper.className = 'glass-dark rounded-2xl p-5 space-y-4 border border-white/10 shadow-lg/30';
    wrapper.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-slate-900/80 shadow-lg">${formatNumberFa(index + 1)}</span>
          <div>
            <div class="text-base md:text-lg font-extrabold text-white">${name}</div>
            <div class="text-xs text-white/60 mt-1">سوالات فعال: ${formatNumberFa(questionCount)}</div>
          </div>
        </div>
        <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-[11px] font-bold text-white/80">
          <i class="fa-solid fa-arrow-trend-up"></i>
          <span>${escapeHtml(highlightLabel)}</span>
        </span>
      </div>
      <div class="space-y-3 text-xs">
        ${createMetricRow('انتخاب کاربران', selectionCount, selectionShare, gradient, 'fa-hand-pointer')}
        ${createMetricRow('مصرف سوال', consumptionCount, consumptionShare, gradient, 'fa-fire-flame-simple')}
        ${createMetricRow('سهم از بانک سوال', questionCount, questionShare, gradient, 'fa-layer-group')}
      </div>
    `;

    fragment.appendChild(wrapper);
  });

  dashboardTopCategoriesEl.appendChild(fragment);
}

function renderDashboardActivity(list = [], state = 'success', message = '') {
  if (!dashboardActivityListEl) return;
  dashboardActivityListEl.innerHTML = '';
  if (!Array.isArray(list) || state !== 'success' || list.length === 0) {
    if (dashboardActivityEmptyEl) {
      dashboardActivityEmptyEl.textContent = resolveDashboardMessage(state, message, {
        loading: 'در حال گردآوری فعالیت‌ها...',
        empty: 'فعالی برای نمایش وجود ندارد'
      });
      dashboardActivityEmptyEl.classList.remove('hidden');
    }
    return;
  }

  if (dashboardActivityEmptyEl) {
    dashboardActivityEmptyEl.classList.add('hidden');
  }

  const fragment = document.createDocumentFragment();
  list.forEach((item) => {
    const icon = typeof item?.icon === 'string' ? item.icon : 'fa-circle-info';
    const title = escapeHtml(item?.title || 'رویداد');
    const description = item?.description ? escapeHtml(item.description) : '';
    const accentKey = typeof item?.accent === 'string' ? item.accent : 'slate';
    const accent = ACTIVITY_ACCENTS[accentKey] || ACTIVITY_ACCENTS.slate;
    const timeLabel = formatRelativeTimeFa(item?.createdAt);

    const container = document.createElement('div');
    container.className = 'flex items-center gap-3 p-3 rounded-xl bg-white/5';
    container.innerHTML = `
      <div class="w-10 h-10 rounded-full ${accent.iconBg} flex items-center justify-center flex-shrink-0">
        <i class="fa-solid ${icon} ${accent.iconColor}"></i>
      </div>
      <div class="flex-1">
        <div class="font-bold">${title}</div>
        ${description ? `<div class="text-sm opacity-80">${description}</div>` : ''}
      </div>
      <div class="text-xs opacity-60">${escapeHtml(timeLabel)}</div>
    `;
    fragment.appendChild(container);
  });

  dashboardActivityListEl.appendChild(fragment);
}

function renderDashboardOverview(data, options = {}) {
  const { state = data ? 'success' : 'auth', message = '' } = options;
  if (state !== 'success' || !data) {
    const fallbackState = state === 'success' ? 'auth' : state;
    renderDashboardUsersCard(null, fallbackState, message);
    renderDashboardCategoriesCard(null, fallbackState, message);
    renderDashboardAdsCard(null, fallbackState, message);
    renderDashboardUsersChart([], fallbackState, message);
    renderDashboardTopCategories([], { state: fallbackState, message, totalQuestions: 0 });
    renderDashboardActivity([], fallbackState, message);
    return;
  }

  const users = data.users || {};
  const categories = data.categories || {};
  const ads = data.ads || {};
  const topCategories = Array.isArray(data.topCategories) ? data.topCategories : [];
  const topCategoryTotals = topCategories.reduce((acc, item) => {
    acc.questions += Number(item?.questionCount) || 0;
    acc.selections += Number(item?.selectionCount) || 0;
    acc.consumption += Number(item?.consumptionCount) || 0;
    return acc;
  }, { questions: 0, selections: 0, consumption: 0 });
  const activity = Array.isArray(data.activity) ? data.activity : [];

  renderDashboardUsersCard(users, 'success');
  renderDashboardCategoriesCard(categories, 'success');
  renderDashboardAdsCard(ads, 'success');
  renderDashboardUsersChart(Array.isArray(users.daily) ? users.daily : [], 'success');
  renderDashboardTopCategories(topCategories, {
    state: 'success',
    totalQuestions: Number(data?.questions?.total) || topCategoryTotals.questions,
    totalSelections: topCategoryTotals.selections,
    totalConsumption: topCategoryTotals.consumption
  });
  renderDashboardActivity(activity, 'success');
}

function normalizeQuestion(raw = {}) {
  const sourceOptions = Array.isArray(raw.options)
    ? raw.options
    : Array.isArray(raw.choices)
      ? raw.choices
      : [];
  const options = sourceOptions.slice(0, 4).map(opt => {
    if (typeof opt === 'string') return opt;
    if (opt == null) return '';
    return String(opt);
  });
  while (options.length < 4) options.push('');
  const idxCandidate = raw.correctIdx ?? raw.correctIndex ?? 0;
  let correctIdx = Number(idxCandidate);
  if (!Number.isFinite(correctIdx)) correctIdx = 0;
  correctIdx = Math.round(correctIdx);
  if (correctIdx < 0 || correctIdx >= options.length) correctIdx = 0;
  const categoryNameRaw = raw.category?.name
    || raw.categoryName
    || (typeof raw.category === 'string' ? raw.category : 'بدون دسته‌بندی');
  const categoryId = raw.category?._id || raw.categoryId || '';
  const decodedOptions = options.map(opt => decodeHtmlEntities(opt));
  const decodedText = decodeHtmlEntities(raw.text ?? raw.question ?? '');
  const sourceKey = typeof raw.source === 'string' ? raw.source.toLowerCase() : 'manual';
  const normalizedSource = SOURCE_META[sourceKey] ? sourceKey : 'manual';
  const providerKey = typeof raw.provider === 'string' ? resolveProviderId(raw.provider) : '';
  const normalizedProvider = providerKey || normalizedSource;
  const authorRaw = typeof raw.authorName === 'string' ? raw.authorName.trim() : '';
  const normalizedAuthor = authorRaw || (normalizedSource === 'community' ? 'کاربر آیکوئیز' : 'تیم آیکوئیز');
  const moderationSource = raw && typeof raw.moderation === 'object' && raw.moderation
    ? raw.moderation
    : {};
  const statusSource = typeof moderationSource.status === 'string'
    ? moderationSource.status
    : typeof raw.status === 'string'
      ? raw.status
      : '';
  const statusRaw = statusSource.trim().toLowerCase();
  let normalizedStatus = statusRaw;
  if (!normalizedStatus) {
    normalizedStatus = raw.active === false ? 'inactive' : 'active';
  } else if (!Object.prototype.hasOwnProperty.call(STATUS_META, normalizedStatus)) {
    normalizedStatus = raw.active === false ? 'inactive' : 'active';
  }
  let normalizedActive;
  if (typeof moderationSource.active === 'boolean') {
    normalizedActive = moderationSource.active;
  } else if (typeof raw.active === 'boolean') {
    normalizedActive = raw.active;
  } else {
    normalizedActive = normalizedStatus === 'approved' || normalizedStatus === 'active';
  }
  const reviewNotes = typeof raw.reviewNotes === 'string' ? raw.reviewNotes.trim() : '';
  const publicIdRaw = typeof raw.publicId === 'string' ? raw.publicId.trim() : '';
  const uidRaw = typeof raw.uid === 'string' ? raw.uid.trim() : '';
  const legacyId = raw._id ? String(raw._id) : '';
  const displayId = publicIdRaw || uidRaw || legacyId;
  return {
    ...raw,
    text: decodedText,
    options: decodedOptions,
    correctIdx,
    categoryName: decodeHtmlEntities(categoryNameRaw),
    categoryId,
    source: normalizedSource,
    provider: normalizedProvider,
    authorName: normalizedAuthor,
    status: normalizedStatus,
    active: normalizedActive,
    duplicateCount: Number.isFinite(Number(raw?.duplicateCount)) ? Number(raw.duplicateCount) : 0,
    reviewNotes,
    publicId: publicIdRaw,
    uid: uidRaw,
    legacyId,
    displayId,
    moderation: {
      status: normalizedStatus,
      active: normalizedActive
    }
  };
}

function updateQuestionStatsUI(stats = {}) {
  const normalized = {
    total: Number.isFinite(Number(stats.total)) ? Number(stats.total) : 0,
    today: Number.isFinite(Number(stats.today)) ? Number(stats.today) : 0,
    yesterday: Number.isFinite(Number(stats.yesterday)) ? Number(stats.yesterday) : 0
  };
  const delta = normalized.today - normalized.yesterday;
  const percentBase = normalized.yesterday > 0
    ? (delta / normalized.yesterday) * 100
    : normalized.today > 0 ? 100 : 0;
  const percentRounded = Math.round(percentBase * 10) / 10;
  const isPositive = percentRounded >= 0;
  const percentLabel = percentRounded === 0
    ? '۰٪'
    : `${isPositive ? '+' : '−'}${formatPercentFa(Math.abs(percentRounded))}٪`;
  const deltaLabel = delta === 0
    ? '۰'
    : `${delta > 0 ? '+' : '−'}${formatNumberFa(Math.abs(delta))}`;

  if (questionTotalEl) questionTotalEl.textContent = formatNumberFa(normalized.total);
  if (questionTrendEl) {
    questionTrendEl.textContent = percentLabel;
    questionTrendEl.className = `text-xs font-bold ${isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'} rounded-xl px-2 py-1`;
  }
  if (questionTodayEl) questionTodayEl.textContent = formatNumberFa(normalized.today);
  if (questionYesterdayEl) questionYesterdayEl.textContent = formatNumberFa(normalized.yesterday);
  if (questionStatsTotalEl) questionStatsTotalEl.textContent = formatNumberFa(normalized.total);
  if (questionStatsTodayEl) questionStatsTodayEl.textContent = formatNumberFa(normalized.today);
  if (questionStatsYesterdayEl) questionStatsYesterdayEl.textContent = formatNumberFa(normalized.yesterday);
  if (questionStatsPercentEl) {
    questionStatsPercentEl.textContent = percentLabel;
    questionStatsPercentEl.className = `text-sm font-bold ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`;
  }
  if (questionStatsDeltaEl) {
    let deltaClass = 'text-base font-bold text-white';
    if (delta > 0) deltaClass = 'text-base font-bold text-emerald-200';
    else if (delta < 0) deltaClass = 'text-base font-bold text-rose-200';
    questionStatsDeltaEl.className = deltaClass;
    questionStatsDeltaEl.textContent = deltaLabel;
  }
  if (questionStatsSummaryEl) {
    const todayLabel = formatNumberFa(normalized.today);
    const yesterdayLabel = formatNumberFa(normalized.yesterday);
    questionStatsSummaryEl.textContent = `امروز ${todayLabel} سوال جدید ثبت شده است و دیروز ${yesterdayLabel} سوال جدید داشتیم.`;
  }
  if (questionStatsDescriptionEl) {
    let description;
    if (delta > 0) description = `${formatNumberFa(Math.abs(delta))} سوال بیشتر از دیروز به بانک سوالات افزوده شده است.`;
    else if (delta < 0) description = `${formatNumberFa(Math.abs(delta))} سوال کمتر از دیروز به بانک سوالات افزوده شده است.`;
    else description = 'تعداد سوالات جدید امروز دقیقا برابر با دیروز است.';
    questionStatsDescriptionEl.textContent = description;
  }

  latestQuestionStats = { ...normalized, delta, percent: percentRounded };
  questionStatsLoaded = true;
  return latestQuestionStats;
}

function formatDateTime(value) {
  if (!value) return '--';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  } catch (err) {
    return '--';
  }
}

function updateCorrectPreview() {
  if (!questionOptionsWrapper || !questionCorrectPreviewEl) return;
  const selected = questionOptionsWrapper.querySelector('input[name="question-correct"]:checked');
  if (!selected) {
    questionCorrectPreviewEl.textContent = '---';
    return;
  }
  const idx = Number(selected.value);
  const input = questionOptionsWrapper.querySelector(`[data-option-input="${idx}"]`);
  const value = input ? input.value.trim() : '';
  questionCorrectPreviewEl.textContent = value || '---';
}

function setOptionRowStates() {
  if (!questionOptionsWrapper) return;
  questionOptionsWrapper.querySelectorAll('[data-option-row]').forEach(row => {
    const radio = row.querySelector('input[type="radio"]');
    if (radio && radio.checked) row.classList.add('selected');
    else row.classList.remove('selected');
  });
  updateCorrectPreview();
}

function renderQuestionOptions(options = [], correctIdx = 0) {
  if (!questionOptionsWrapper) return;
  const opts = Array.isArray(options) ? options.slice(0, 4) : [];
  while (opts.length < 4) opts.push('');
  let safeIdx = Number(correctIdx);
  if (!Number.isFinite(safeIdx)) safeIdx = 0;
  safeIdx = Math.round(safeIdx);
  if (safeIdx < 0 || safeIdx >= opts.length) safeIdx = 0;
  questionOptionsWrapper.innerHTML = opts.map((opt, index) => {
    const label = (index + 1).toLocaleString('fa-IR');
    const isSelected = index === safeIdx;
    const valueSafe = escapeHtml(opt || '');
    return `
      <div class="option-row${isSelected ? ' selected' : ''}" data-option-row>
        <div class="flex items-start gap-3 w-full">
          <input type="radio" name="question-correct" value="${index}" class="mt-1.5 shrink-0"${isSelected ? ' checked' : ''}>
          <div class="flex-1 space-y-2">
            <div class="flex items-center justify-between text-xs text-white/60">
              <span>گزینه ${label}</span>
              <span class="selected-indicator gap-1 text-amber-300 font-semibold">
                <i class="fas fa-star"></i>
                <span>پاسخ صحیح</span>
              </span>
            </div>
            <input type="text" class="form-input text-sm" data-option-input="${index}" placeholder="گزینه ${label}" value="${valueSafe}">
          </div>
        </div>
      </div>
    `;
  }).join('');
  setOptionRowStates();
}

function syncQuestionDetailStatusUi(statusValue) {
  if (!questionDetailActiveToggle) return;
  const normalized = typeof statusValue === 'string' ? statusValue.trim().toLowerCase() : '';
  const shouldDisable = normalized !== 'approved';
  const toggleLabel = questionDetailActiveToggle.closest('label');
  if (shouldDisable) {
    questionDetailActiveToggle.checked = false;
    questionDetailActiveToggle.disabled = true;
    if (toggleLabel) toggleLabel.classList.add('opacity-60');
  } else {
    questionDetailActiveToggle.disabled = false;
    if (toggleLabel) toggleLabel.classList.remove('opacity-60');
  }
}

function populateQuestionDetail(question) {
  if (!questionDetailModal) return;
  const normalized = normalizeQuestion(question);
  const legacyId = normalized?.legacyId ? String(normalized.legacyId) : (normalized?._id ? String(normalized._id) : '');
  const displayId = normalized?.displayId ? String(normalized.displayId) : '';
  const idLabel = displayId || legacyId;
  if (questionIdEl) {
    questionIdEl.textContent = idLabel ? `شناسه یکتا: #${idLabel}` : 'شناسه یکتا: ---';
    questionIdEl.title = idLabel || '';
  }
  if (questionTitleEl) questionTitleEl.textContent = normalized.text || 'بدون متن';
  refreshCategorySelects({ detailSelected: normalized.categoryId || '' });
  if (questionDetailDifficultySelect) {
    const difficultyValue = typeof normalized.difficulty === 'string'
      ? normalized.difficulty.toLowerCase()
      : 'medium';
    questionDetailDifficultySelect.value = ['easy', 'medium', 'hard'].includes(difficultyValue)
      ? difficultyValue
      : 'medium';
  }
  if (questionDetailActiveToggle) {
    questionDetailActiveToggle.checked = normalized.active !== false;
  }
  if (questionDetailAuthorInput) {
    questionDetailAuthorInput.value = normalized.authorName || '';
  }
  if (questionDetailStatusSelect) {
    const candidate = normalized.status || 'approved';
    const hasOption = Boolean(questionDetailStatusSelect.querySelector(`option[value="${candidate}"]`));
    const resolvedStatus = hasOption ? candidate : 'approved';
    questionDetailStatusSelect.value = resolvedStatus;
    syncQuestionDetailStatusUi(resolvedStatus);
  } else {
    syncQuestionDetailStatusUi(normalized.status);
  }
  if (questionDetailNotesInput) {
    questionDetailNotesInput.value = normalized.reviewNotes || '';
  }
  if (questionDetailForm) {
    const textarea = questionDetailForm.querySelector('[name="question-text"]');
    if (textarea) textarea.value = normalized.text || '';
  }
  if (questionMetaEl) {
    const categoryNameSafe = escapeHtml(normalized.categoryName || 'بدون دسته‌بندی');
    const difficultyMeta = DIFFICULTY_META[normalized.difficulty] || DIFFICULTY_META.medium;
    const statusKey = normalized.status || (normalized.active === false ? 'inactive' : 'active');
    const statusMeta = STATUS_META[statusKey] || STATUS_META.active;
    const authorSafe = escapeHtml(normalized.authorName || 'نامشخص');
    const sourceMeta = SOURCE_META[normalized.source] || SOURCE_META.manual;
    const uniqueChip = displayId
      ? `<span class="meta-chip id" title="شناسه یکتا"><i class="fas fa-hashtag"></i>${escapeHtml(displayId)}</span>`
      : '';
    questionMetaEl.innerHTML = `
      <span class="meta-chip category" title="دسته‌بندی"><i class="fas fa-layer-group"></i>${categoryNameSafe}</span>
      ${uniqueChip}
      <span class="${difficultyMeta.class}" title="سطح دشواری"><i class="fas ${difficultyMeta.icon}"></i>${difficultyMeta.label}</span>
      <span class="${sourceMeta.class}" title="منبع"><i class="fas ${sourceMeta.icon}"></i>${sourceMeta.label}</span>
      <span class="meta-chip author" title="سازنده"><i class="fas fa-user-pen"></i>${authorSafe}</span>
      <span class="${statusMeta.class}" title="وضعیت"><span class="status-dot ${statusMeta.dot}"></span>${statusMeta.label}</span>
    `;
  }
  if (questionCreatedEl) questionCreatedEl.textContent = formatDateTime(normalized.createdAt);
  if (questionUpdatedEl) questionUpdatedEl.textContent = formatDateTime(normalized.updatedAt);
  renderQuestionOptions(normalized.options, normalized.correctIdx);
  questionDetailModal.dataset.qId = legacyId;
  questionDetailModal.dataset.qUid = displayId || '';
  if (updateQuestionBtn) {
    updateQuestionBtn.disabled = false;
    updateQuestionBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
    updateQuestionBtn.innerHTML = updateQuestionBtnDefault;
  }
  openModal('#question-detail-modal');
}

function openQuestionDetailById(id) {
  if (!id) return;
  const question = questionsCache.get(id);
  if (!question) {
    showToast('اطلاعات این سوال در دسترس نیست', 'error');
    return;
  }
  populateQuestionDetail(question);
}

if (questionDetailForm) questionDetailForm.addEventListener('submit', e => e.preventDefault());

if (questionOptionsWrapper) {
  questionOptionsWrapper.addEventListener('change', (e) => {
    if (e.target.matches('input[type="radio"][name="question-correct"]')) {
      setOptionRowStates();
    }
  });
  questionOptionsWrapper.addEventListener('input', (e) => {
    if (e.target.matches('[data-option-input]')) {
      const row = e.target.closest('[data-option-row]');
      if (row?.querySelector('input[type="radio"]').checked) {
        updateCorrectPreview();
      }
    }
  });
  questionOptionsWrapper.addEventListener('click', (e) => {
    const row = e.target.closest('[data-option-row]');
    if (!row) return;
    if (e.target.matches('input[type="text"]')) return;
    if (e.target.matches('input[type="radio"]')) return;
    const radio = row.querySelector('input[type="radio"]');
    if (radio && !radio.checked) {
      radio.checked = true;
      setOptionRowStates();
    }
  });
}

if (questionDetailStatusSelect) {
  questionDetailStatusSelect.addEventListener('change', () => {
    syncQuestionDetailStatusUi(questionDetailStatusSelect.value || '');
  });
}

if (updateQuestionBtn) {
  updateQuestionBtn.addEventListener('click', async () => {
    if (!questionDetailModal) return;
    const id = questionDetailModal.dataset?.qId;
    if (!id) {
      showToast('ابتدا یک سوال را انتخاب کنید', 'warning');
      return;
    }
    if (!cachedCategories.length) {
      try {
        await loadCategoryFilterOptions();
      } catch (err) {
        console.error('Failed to refresh categories before updating question', err);
      }
    }
    const textarea = questionDetailForm?.querySelector('[name="question-text"]');
    const text = textarea ? textarea.value.trim() : '';
    const optionInputs = questionOptionsWrapper
      ? Array.from(questionOptionsWrapper.querySelectorAll('[data-option-input]'))
      : [];
    const options = optionInputs.map(input => input.value.trim());
    const selectedRadio = questionOptionsWrapper?.querySelector('input[name="question-correct"]:checked');
    const correctIdx = selectedRadio ? Number(selectedRadio.value) : -1;
    const categoryId = questionDetailCategorySelect ? questionDetailCategorySelect.value : '';
    const category = findCategoryById(categoryId);
    const difficultyRaw = questionDetailDifficultySelect ? questionDetailDifficultySelect.value : 'medium';
    const difficulty = ['easy', 'medium', 'hard'].includes(difficultyRaw) ? difficultyRaw : 'medium';
    const active = questionDetailActiveToggle ? Boolean(questionDetailActiveToggle.checked) : true;
    const authorName = questionDetailAuthorInput ? questionDetailAuthorInput.value.trim() : '';
    const statusCandidate = questionDetailStatusSelect ? (questionDetailStatusSelect.value || 'approved') : 'approved';
    const allowedStatuses = ['approved', 'pending', 'rejected', 'draft', 'archived'];
    const statusValue = allowedStatuses.includes(statusCandidate) ? statusCandidate : 'approved';
    const reviewNotes = questionDetailNotesInput ? questionDetailNotesInput.value.trim() : '';

    if (!text) {
      showToast('متن سوال را وارد کنید', 'warning');
      return;
    }
    if (options.some(o => !o)) {
      showToast('تمام گزینه‌ها باید تکمیل شوند', 'warning');
      return;
    }
    if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx >= options.length) {
      showToast('گزینه صحیح را انتخاب کنید', 'warning');
      return;
    }
    if (!categoryId) {
      showToast('یک دسته‌بندی معتبر انتخاب کنید', 'warning');
      return;
    }
    if (!category) {
      showToast('دسته‌بندی انتخاب‌شده معتبر نیست. لطفاً دسته‌ای فعال انتخاب کنید.', 'warning');
      return;
    }

    const payload = {
      text,
      options,
      correctIdx,
      difficulty,
      active,
      categoryId,
      categoryName: category.displayName || category.name,
      authorName,
      status: statusValue,
      reviewNotes
    };
    updateQuestionBtn.disabled = true;
    updateQuestionBtn.classList.add('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
    updateQuestionBtn.innerHTML = `
      <span class="flex items-center gap-2">
        <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        <span>در حال ذخیره...</span>
      </span>
    `;

    try {
      await api(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('سوال با موفقیت به‌روزرسانی شد', 'success');
      closeModal('#question-detail-modal');
      await Promise.allSettled([
        loadQuestions(),
        loadCategoryFilterOptions(),
        loadDashboardStats(true),
        loadDashboardOverview(true)
      ]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      updateQuestionBtn.disabled = false;
      updateQuestionBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
      updateQuestionBtn.innerHTML = updateQuestionBtnDefault;
    }
  });
}

// --------------- LOADERS ---------------
async function loadCategoryFilterOptions(triggerReloadOnMissing = false) {
  const hasFilterSelect = Boolean(filterCategorySelect);
  const previousValue = hasFilterSelect
    ? (questionFilters.category || filterCategorySelect.value || '')
    : (questionFilters.category || '');
  if (hasFilterSelect) {
    filterCategorySelect.innerHTML = '<option value="">همه دسته‌بندی‌ها</option>';
  }
  let shouldReload = false;
  let nextCategories = null;

  if (categoriesGridEl) {
    categoriesLoading = true;
    renderCategoryManagement();
  }

  try {
    const response = await api('/categories?limit=100');
    const rawList = Array.isArray(response.data) ? response.data : [];
    nextCategories = sanitizeCategoryList(rawList);

    if (hasFilterSelect) {
      let hasPrevious = false;
      const fragment = document.createDocumentFragment();
      nextCategories.forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat._id;
        option.textContent = categoryOptionLabel(cat);
        option.dataset.status = cat.status || 'active';
        if (cat._id === previousValue) hasPrevious = true;
        fragment.appendChild(option);
      });
      filterCategorySelect.appendChild(fragment);
      if (hasPrevious) {
        filterCategorySelect.value = previousValue;
        questionFilters.category = previousValue;
      } else {
        filterCategorySelect.value = '';
        shouldReload = triggerReloadOnMissing && previousValue !== '';
        questionFilters.category = '';
      }
    }
  } catch (err) {
    console.error('Failed to load categories', err);
    showToast('دریافت دسته‌بندی‌ها با مشکل مواجه شد', 'error');
  } finally {
    categoriesLoading = false;
  }

  if (nextCategories !== null) {
    cachedCategories = nextCategories;
  }

  renderCategoryManagement();
  refreshCategorySelects();
  if (shouldReload) {
    await loadQuestions();
  }
}

async function loadDashboardOverview(force = false) {
  if (!dashboardUsersActiveEl && !dashboardUsersChartEl && !dashboardTopCategoriesEl && !dashboardActivityListEl) {
    return null;
  }
  if (!getToken()) {
    dashboardOverviewState.loading = false;
    dashboardOverviewState.loaded = false;
    dashboardOverviewState.data = null;
    renderDashboardOverview(null, { state: 'auth' });
    return null;
  }

  if (dashboardOverviewState.promise && !force) {
    return dashboardOverviewState.promise;
  }

  if (dashboardOverviewState.loaded && !force) {
    renderDashboardOverview(dashboardOverviewState.data, { state: 'success' });
    return dashboardOverviewState.data;
  }

  renderDashboardOverview(null, { state: 'loading' });

  const fetchPromise = (async () => {
    try {
      dashboardOverviewState.loading = true;
      const response = await api('/analytics/dashboard');
      const data = response?.data || null;
      dashboardOverviewState.data = data;
      dashboardOverviewState.loaded = true;
      renderDashboardOverview(data, { state: 'success' });
      return data;
    } catch (error) {
      console.error('Failed to load dashboard overview', error);
      dashboardOverviewState.loaded = false;
      dashboardOverviewState.data = null;
      renderDashboardOverview(null, { state: 'error', message: error.message || 'دریافت آمار داشبورد ناموفق بود' });
      if (force) showToast('امکان دریافت آمار داشبورد نبود', 'error');
      return null;
    } finally {
      dashboardOverviewState.loading = false;
      dashboardOverviewState.promise = null;
    }
  })();

  dashboardOverviewState.promise = fetchPromise;
  return fetchPromise;
}

async function loadDashboardStats(force = false) {
  if (!questionTotalEl || !questionTrendEl) return null;
  if (!getToken()) return null;
  if (questionStatsLoaded && !force) return latestQuestionStats;

  if (questionStatsSummaryEl) {
    questionStatsSummaryEl.textContent = 'در حال بروزرسانی آمار سوالات...';
  }

  try {
    const response = await api('/questions/stats/summary');
    const { total = 0, today = 0, yesterday = 0 } = response?.data ?? {};
    return updateQuestionStatsUI({ total, today, yesterday });
  } catch (err) {
    console.error('Failed to load question stats', err);
    if (force) showToast('امکان دریافت آمار سوالات نبود', 'error');
    if (questionTrendEl) {
      questionTrendEl.textContent = '—';
      questionTrendEl.className = 'text-xs font-bold text-white/70 bg-white/10 rounded-xl px-2 py-1';
    }
    if (questionTotalEl) questionTotalEl.textContent = '—';
    if (questionStatsSummaryEl) questionStatsSummaryEl.textContent = 'دریافت آمار سوالات با خطا مواجه شد.';
    if (questionStatsDescriptionEl) questionStatsDescriptionEl.textContent = 'لطفاً بعداً دوباره تلاش کنید.';
    questionStatsLoaded = false;
    latestQuestionStats = null;
    return null;
  }
}

async function loadQuestions(overrides = {}) {
  const tbody = $('#questions-tbody');
  const requestId = ++questionsRequestToken;
  const hasOwn = Object.prototype.hasOwnProperty;
  let shouldResetPage = false;
  let explicitPage = null;
  let explicitLimit = null;

  try {
    if (overrides && typeof overrides === 'object') {
      if (hasOwn.call(overrides, 'page')) {
        const nextPage = Math.max(1, Number(overrides.page) || 1);
        explicitPage = nextPage;
      }
      if (hasOwn.call(overrides, 'limit')) {
        const nextLimit = Math.max(1, Number(overrides.limit) || 50);
        if (questionsState.pagination.limit !== nextLimit) {
          shouldResetPage = true;
        }
        questionsState.pagination.limit = nextLimit;
        explicitLimit = nextLimit;
      }
      if (hasOwn.call(overrides, 'category')) {
        const nextCategory = overrides.category || '';
        if (questionFilters.category !== nextCategory) shouldResetPage = true;
        questionFilters.category = nextCategory;
      }
      if (hasOwn.call(overrides, 'difficulty')) {
        const nextDifficulty = overrides.difficulty || '';
        if (questionFilters.difficulty !== nextDifficulty) shouldResetPage = true;
        questionFilters.difficulty = nextDifficulty;
      }
      if (hasOwn.call(overrides, 'provider')) {
        const nextProvider = overrides.provider || '';
        if (questionFilters.provider !== nextProvider) shouldResetPage = true;
        questionFilters.provider = nextProvider;
      }
      if (hasOwn.call(overrides, 'status')) {
        const nextStatus = overrides.status || '';
        if (questionFilters.status !== nextStatus) shouldResetPage = true;
        questionFilters.status = nextStatus;
      }
      if (hasOwn.call(overrides, 'search')) {
        const nextSearch = (overrides.search || '').trim();
        if (questionFilters.search !== nextSearch) shouldResetPage = true;
        questionFilters.search = nextSearch;
      }
      if (hasOwn.call(overrides, 'sort')) {
        const candidate = typeof overrides.sort === 'string' ? overrides.sort : 'newest';
        const nextSort = ['oldest', 'newest'].includes(candidate) ? candidate : 'newest';
        if (questionFilters.sort !== nextSort) shouldResetPage = true;
        questionFilters.sort = nextSort;
      }
      if (hasOwn.call(overrides, 'type')) {
        const value = overrides.type;
        const previousType = questionFilters.type;
        if (value === undefined) {
          questionFilters.type = undefined;
        } else if (value === null || value === '') {
          questionFilters.type = null;
        } else {
          questionFilters.type = value;
        }
        if (previousType !== questionFilters.type) shouldResetPage = true;
      }
      if (hasOwn.call(overrides, 'approvedOnly')) {
        const value = overrides.approvedOnly;
        const previous = questionFilters.approvedOnly;
        if (value === undefined) {
          questionFilters.approvedOnly = undefined;
        } else if (value === null) {
          questionFilters.approvedOnly = null;
        } else {
          questionFilters.approvedOnly = Boolean(value);
        }
        if (previous !== questionFilters.approvedOnly) shouldResetPage = true;
      }
      if (hasOwn.call(overrides, 'reviewMode')) {
        const nextMode = overrides.reviewMode === 'all' ? 'all' : 'default';
        if (questionFilters.reviewMode !== nextMode) {
          shouldResetPage = true;
        }
        questionFilters.reviewMode = nextMode;
        if (nextMode === 'all') {
          questionFilters.approvedOnly = false;
        } else if (questionFilters.approvedOnly === false && !hasOwn.call(overrides, 'approvedOnly')) {
          questionFilters.approvedOnly = undefined;
        }
      }
      if (hasOwn.call(overrides, 'duplicates')) {
        const nextDuplicates = overrides.duplicates === 'duplicates' ? 'duplicates' : 'all';
        if (questionFilters.duplicates !== nextDuplicates) shouldResetPage = true;
        questionFilters.duplicates = nextDuplicates;
      }
    }

    renderQuestionCategoryStats();

    if (questionFilters.status && questionFilters.status !== 'approved') {
      if (questionFilters.reviewMode !== 'all') {
        questionFilters.reviewMode = 'all';
        shouldResetPage = true;
      }
      if (questionFilters.approvedOnly !== false) {
        questionFilters.approvedOnly = false;
        shouldResetPage = true;
      }
    }

    if (filterSortSelect && questionFilters.sort && filterSortSelect.value !== questionFilters.sort) {
      filterSortSelect.value = questionFilters.sort;
    }
    if (filterStatusSelect) {
      const nextStatus = questionFilters.status || '';
      if (filterStatusSelect.value !== nextStatus) {
        filterStatusSelect.value = nextStatus;
      }
    }
    if (filterTypeToggle) {
      const shouldCheck = questionFilters.type === 'multiple';
      if (filterTypeToggle.checked !== shouldCheck) {
        filterTypeToggle.checked = shouldCheck;
      }
    }
    if (filterApprovedOnlyToggle) {
      const shouldCheck = questionFilters.reviewMode === 'all';
      if (filterApprovedOnlyToggle.checked !== shouldCheck) {
        filterApprovedOnlyToggle.checked = shouldCheck;
      }
    }
    if (filterDuplicatesSelect) {
      const nextDuplicates = questionFilters.duplicates === 'duplicates' ? 'duplicates' : 'all';
      if (filterDuplicatesSelect.value !== nextDuplicates) {
        filterDuplicatesSelect.value = nextDuplicates;
      }
    }
    if (filterTypeHelper) {
      filterTypeHelper.textContent = 'با فعال کردن این گزینه تنها سوالات چهارگزینه‌ای نمایش داده می‌شوند.';
    }
    if (filterApprovedHelper) {
      filterApprovedHelper.textContent = questionFilters.reviewMode === 'all'
        ? 'در حالت بازبینی، همه سوالات حتی موارد تایید نشده یا غیرفعال نمایش داده می‌شوند.'
        : 'در حالت عادی فقط سوالات تایید شده و فعال نمایش داده می‌شوند.';
    }

    if (explicitLimit != null) {
      questionsState.pagination.limit = Math.max(1, Number(explicitLimit) || 50);
    }
    const hasExplicitPage = explicitPage != null;
    if (shouldResetPage && !hasExplicitPage) {
      questionsState.pagination.page = 1;
    } else if (hasExplicitPage) {
      questionsState.pagination.page = explicitPage;
    }

    questionsState.pagination.page = Math.max(1, Number(questionsState.pagination.page) || 1);
    questionsState.pagination.limit = Math.max(1, Number(questionsState.pagination.limit) || 50);

    if (tbody) {
      tbody.innerHTML = `
        <tr class="loading-row">
          <td colspan="4">
            <div class="loading-state">
              <span class="loading-spinner"></span>
              <p>در حال دریافت سوالات...</p>
            </div>
          </td>
        </tr>
      `;
      tbody.onclick = null;
    }

    questionsState.loading = true;
    renderQuestionsPagination();

    const params = new URLSearchParams();
    params.set('limit', String(questionsState.pagination.limit));
    params.set('page', String(questionsState.pagination.page));
    if (questionFilters.category) params.append('category', questionFilters.category);
    if (questionFilters.difficulty) params.append('difficulty', questionFilters.difficulty);
    if (questionFilters.provider) params.append('provider', questionFilters.provider);
    if (questionFilters.status) params.append('status', questionFilters.status);
    if (questionFilters.search) params.append('q', questionFilters.search);
    if (questionFilters.sort) params.append('sort', questionFilters.sort);
    if (questionFilters.type) params.append('type', questionFilters.type);
    if (questionFilters.approvedOnly === false) params.append('includeUnapproved', '1');
    if (questionFilters.reviewMode === 'all') params.append('reviewMode', 'all');
    if (questionFilters.duplicates === 'duplicates') params.append('duplicatesOnly', '1');

    const response = await api(`/questions?${params.toString()}`);
    if (requestId !== questionsRequestToken) {
      return null;
    }

    const meta = response?.meta || {};
    questionsState.meta = meta;

    const pendingTotal = Number(meta.pendingTotal);
    if (pendingCommunityCountEl) {
      const safePending = Number.isFinite(pendingTotal) ? pendingTotal : 0;
      pendingCommunityCountEl.textContent = formatNumberFa(safePending);
    }
    if (viewPendingQuestionsBtn) {
      const safePending = Number.isFinite(pendingTotal) ? pendingTotal : 0;
      const highlight = questionFilters.status === 'pending';
      const shouldDisablePending = safePending === 0 && !highlight;
      viewPendingQuestionsBtn.disabled = shouldDisablePending;
      viewPendingQuestionsBtn.classList.toggle('opacity-60', shouldDisablePending);
      viewPendingQuestionsBtn.classList.toggle('cursor-not-allowed', shouldDisablePending);
      viewPendingQuestionsBtn.dataset.active = highlight ? 'true' : 'false';
    }

    const safeTotal = Number.isFinite(Number(meta.total)) ? Number(meta.total) : (Array.isArray(response?.data) ? response.data.length : 0);
    const safeLimit = Math.max(1, Number(meta.limit) || questionsState.pagination.limit);
    const safePage = Math.max(1, Number(meta.page) || questionsState.pagination.page);
    const computedTotalPages = Math.max(1, Math.ceil(safeTotal / safeLimit) || 1);

    questionsState.pagination.total = safeTotal;
    questionsState.pagination.limit = safeLimit;
    questionsState.pagination.totalPages = computedTotalPages;
    questionsState.pagination.page = Math.min(safePage, computedTotalPages);

    if (safePage > computedTotalPages && computedTotalPages >= 1) {
      if (safePage !== computedTotalPages) {
        renderQuestionsPagination();
        return loadQuestions({ page: computedTotalPages });
      }
    }

    renderQuestionsPagination();

    questionsCache.clear();

    if (!tbody) {
      return null;
    }

    if (!Array.isArray(response.data) || response.data.length === 0) {
      const hasFilters = Boolean(
        questionFilters.category
        || questionFilters.difficulty
        || questionFilters.provider
        || questionFilters.status
        || questionFilters.search
        || questionFilters.type
        || questionFilters.approvedOnly === false
        || questionFilters.reviewMode === 'all'
        || questionFilters.duplicates === 'duplicates'
      );
      let emptyMessage;
      if (questionFilters.category) {
        emptyMessage = 'برای این دسته هنوز سوالی ثبت نشده است.';
      } else if (questionFilters.duplicates === 'duplicates') {
        emptyMessage = 'هیچ سوال تکراری با تنظیمات فعلی یافت نشد.';
      } else if (hasFilters) {
        emptyMessage = 'هیچ سوالی با فیلترهای انتخاب شده یافت نشد.';
      } else {
        emptyMessage = 'هنوز سوالی ثبت نشده است. از دکمه «افزودن سوال» یا ابزار تولید سوال خودکار استفاده کنید.';
      }
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="4">
            <div class="empty-state">
              <i class="fas fa-inbox"></i>
              <p>${emptyMessage}</p>
            </div>
          </td>
        </tr>
      `;
      return null;
    }

    tbody.innerHTML = response.data.map((raw) => {
      const item = normalizeQuestion(raw);
      const legacyId = item?.legacyId ? String(item.legacyId) : (item?._id ? String(item._id) : '');
      if (legacyId) questionsCache.set(legacyId, item);
      const displayIdRaw = item?.displayId ? String(item.displayId) : '';
      const displayLabelRaw = displayIdRaw
        ? (displayIdRaw.length > 14 ? `${displayIdRaw.slice(0, 6)}…${displayIdRaw.slice(-4)}` : displayIdRaw)
        : ((legacyId || '').slice(-6) || '---');
      const displayLabel = escapeHtml(displayLabelRaw);
      const displayTitle = escapeHtml(displayIdRaw || legacyId || '---');
      const idAttr = escapeHtml(legacyId);
      const questionText = escapeHtml(item.text || 'بدون متن');
      const categoryName = escapeHtml(item.categoryName || 'بدون دسته‌بندی');
      const difficulty = DIFFICULTY_META[item.difficulty] || DIFFICULTY_META.medium;
      const authorSafe = escapeHtml(item.authorName || 'IQuiz Team');
      const rawStatusKey = typeof item.status === 'string' ? item.status.trim().toLowerCase() : '';
      const moderationStatusKey = typeof item?.moderation?.status === 'string'
        ? item.moderation.status.trim().toLowerCase()
        : rawStatusKey;
      const fallbackStatusKey = item.active === false ? 'inactive' : 'active';
      const resolvedStatusKey = moderationStatusKey || rawStatusKey || fallbackStatusKey;
      const status = STATUS_META[resolvedStatusKey] || STATUS_META[fallbackStatusKey] || STATUS_META.active;
      const moderationActiveValue = typeof item?.moderation?.active === 'boolean'
        ? item.moderation.active
        : typeof item.active === 'boolean'
          ? item.active
          : null;
      const activeMeta = moderationActiveValue === true
        ? ACTIVE_STATE_META.on
        : moderationActiveValue === false
          ? ACTIVE_STATE_META.off
          : null;
      const statusChip = status
        ? `<span class="${status.class}" title="وضعیت تایید"><span class="status-dot ${status.dot || 'active'}"></span>${status.label}</span>`
        : '';
      const activeChip = activeMeta
        ? `<span class="${activeMeta.class}" title="وضعیت فعال بودن"><i class="fas ${activeMeta.icon}"></i>${activeMeta.label}</span>`
        : '';
      const sourceMeta = SOURCE_META[item.source] || SOURCE_META.manual;
      const derivedAnswerRaw = item.options[item.correctIdx] || item.correctAnswer || '---';
      const answerText = escapeHtml(decodeHtmlEntities(derivedAnswerRaw));
      const duplicateCount = Number.isFinite(Number(item.duplicateCount)) ? Number(item.duplicateCount) : 0;
      const duplicateBadge = duplicateCount > 1
        ? `<span class="meta-chip duplicate" title="تعداد موارد مشابه"><i class="fas fa-clone"></i>${formatNumberFa(duplicateCount)}</span>`
        : '';
      const rowClasses = ['question-row'];
      if (duplicateCount > 1) rowClasses.push('question-row-duplicate');
      return `
        <tr class="${rowClasses.join(' ')}" data-question-id="${idAttr}" data-question-uid="${escapeHtml(displayIdRaw)}">
          <td data-label="شناسه" class="font-mono text-xs md:text-sm text-white/70" title="${displayTitle}">#${displayLabel}</td>
          <td data-label="سوال و جزئیات">
            <div class="question-text line-clamp-2" title="${questionText}">${questionText}</div>
            <div class="question-meta">
              <span class="meta-chip category" title="دسته‌بندی">
                <i class="fas fa-layer-group"></i>${categoryName}
              </span>
              <span class="${difficulty.class}" title="سطح دشواری">
                <i class="fas ${difficulty.icon}"></i>${difficulty.label}
              </span>
              <span class="meta-chip author" title="سازنده سوال">
                <i class="fas fa-user-pen"></i>${authorSafe}
              </span>
              <span class="${sourceMeta.class}" title="منبع سوال">
                <i class="fas ${sourceMeta.icon}"></i>${sourceMeta.label}
              </span>
              ${statusChip}
              ${activeChip}
              ${duplicateBadge}
            </div>
          </td>
          <td data-label="پاسخ صحیح">
            <div class="answer-pill" title="${answerText}"><i class="fas fa-lightbulb"></i><span>${answerText}</span></div>
          </td>
          <td data-label="عملیات" class="actions">
            <button class="action-btn view" data-view-q="${idAttr}" title="مشاهده و ویرایش سوال"><i class="fas fa-eye"></i></button>
            <button class="action-btn delete" data-del-q="${idAttr}" title="حذف سوال"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.onclick = async (e) => {
      const viewBtn = e.target.closest('[data-view-q]');
      if (viewBtn) {
        const id = viewBtn.dataset.viewQ;
        if (!id) return;
        if (!cachedCategories.length) {
          try {
            await loadCategoryFilterOptions();
          } catch (err) {
            console.error('Failed to refresh categories before opening detail modal', err);
          }
        } else {
          refreshCategorySelects();
        }
        openQuestionDetailById(id);
        return;
      }
      const deleteBtn = e.target.closest('[data-del-q]');
      if (!deleteBtn) return;
      const id = deleteBtn.dataset.delQ;
      if (!id) return;
      if (!confirm('حذف سوال؟')) return;
      try {
        await api(`/questions/${id}`, { method: 'DELETE' });
        showToast('حذف شد','success');
        await Promise.allSettled([
          loadQuestions(),
          loadCategoryFilterOptions(),
          loadDashboardStats(true),
          loadDashboardOverview(true)
        ]);
      } catch (err) {
        showToast(err.message,'error');
      }
    };

    return response.data;
  } catch (error) {
    if (requestId !== questionsRequestToken) {
      return null;
    }

    if (tbody) {
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="4">
            <div class="empty-state">
              <i class="fas fa-exclamation-triangle"></i>
              <p>مشکل در دریافت سوالات. لطفاً دوباره تلاش کنید.</p>
            </div>
          </td>
        </tr>
      `;
    }
    if (pendingCommunityCountEl) {
      pendingCommunityCountEl.textContent = '—';
    }
    if (viewPendingQuestionsBtn) {
      viewPendingQuestionsBtn.disabled = true;
      viewPendingQuestionsBtn.classList.add('opacity-60', 'cursor-not-allowed');
      viewPendingQuestionsBtn.dataset.active = 'false';
    }
    questionsState.pagination.total = 0;
    questionsState.pagination.totalPages = 1;
    renderQuestionsPagination();
    showToast('مشکل در دریافت سوالات','error');
    return null;
  } finally {
    if (requestId === questionsRequestToken) {
      questionsState.loading = false;
      renderQuestionsPagination();
    }
  }
}

const USER_ROLE_META = {
  user:  { label: 'عادی', badge: 'badge-info' },
  vip:   { label: 'VIP', badge: 'badge-warning' },
  admin: { label: 'ادمین', badge: 'badge-danger' }
};

const USER_STATUS_META = {
  active:  { label: 'فعال', badge: 'badge-success' },
  pending: { label: 'در حال بررسی', badge: 'badge-warning' },
  blocked: { label: 'مسدود شده', badge: 'badge-danger' }
};

function normalizeProvinceName(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.name === 'string') return value.name.trim();
  return '';
}

async function fetchProvinceListForUsers() {
  if (Array.isArray(usersState.provinces) && usersState.provinces.length) {
    return usersState.provinces;
  }

  if (usersState.provincesPromise) {
    return usersState.provincesPromise;
  }

  if (Array.isArray(adsState?.provinces) && adsState.provinces.length) {
    usersState.provinces = [...adsState.provinces];
    return usersState.provinces;
  }

  usersState.provincesPromise = fetch('/api/public/provinces', { cache: 'no-store' })
    .then((res) => res.json())
    .then((data) => {
      const names = Array.isArray(data)
        ? data.map((item) => normalizeProvinceName(item)).filter(Boolean)
        : [];
      const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'fa'));
      usersState.provinces = unique;
      if (Array.isArray(adsState?.provinces) && !adsState.provinces.length) {
        adsState.provinces = unique.slice();
      }
      return unique;
    })
    .catch((error) => {
      console.warn('Failed to load provinces for user management', error);
      usersState.provinces = [];
      throw error;
    })
    .finally(() => {
      usersState.provincesPromise = null;
    });

  return usersState.provincesPromise;
}

function populateUserProvinceSelect(select, provinces, placeholder) {
  if (!select) return;
  const previousValue = select.value;
  select.innerHTML = '';

  if (typeof placeholder === 'string') {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = placeholder;
    select.appendChild(option);
  }

  provinces.forEach((province) => {
    const option = document.createElement('option');
    option.value = province;
    option.textContent = province;
    select.appendChild(option);
  });

  if (previousValue && provinces.includes(previousValue)) {
    select.value = previousValue;
  } else {
    select.value = '';
  }
}

async function initializeUserProvinceOptions() {
  const selects = [];
  if (userFilterProvinceSelect) {
    selects.push({ element: userFilterProvinceSelect, placeholder: 'همه استان‌ها' });
  }
  if (addUserProvinceSelect) {
    selects.push({ element: addUserProvinceSelect, placeholder: 'انتخاب استان (اختیاری)' });
  }
  if (!selects.length) return;

  const resetToPlaceholder = () => {
    selects.forEach(({ element, placeholder }) => {
      if (!element) return;
      populateUserProvinceSelect(element, [], placeholder);
      element.disabled = false;
    });
  };

  selects.forEach(({ element, placeholder }) => {
    if (!element) return;
    populateUserProvinceSelect(element, [], placeholder);
    element.disabled = true;
  });

  try {
    const provinces = await fetchProvinceListForUsers();
    selects.forEach(({ element, placeholder }) => {
      if (!element) return;
      populateUserProvinceSelect(element, provinces, placeholder);
      element.disabled = false;
    });
  } catch (error) {
    resetToPlaceholder();
  }
}

async function loadUsers(showLoading = true) {
  if (!usersTableBody) return;

  if (!getToken()) {
    usersTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">
          <div class="empty-state">
            <i class="fas fa-lock"></i>
            <p>برای مشاهده کاربران ابتدا وارد شوید</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  if (showLoading) {
    usersTableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="8">
          <div class="loading-state">
            <span class="loading-spinner"></span>
            <p>در حال بارگذاری کاربران...</p>
          </div>
        </td>
      </tr>
    `;
  }

  const params = new URLSearchParams();
  const limit = Math.max(1, Number(usersState.pagination.limit) || 50);
  const page = Math.max(1, Number(usersState.pagination.page) || 1);
  params.set('limit', String(limit));
  params.set('page', String(page));

  const role = (usersState.filters.role || '').trim();
  if (role) params.set('role', role);

  const status = (usersState.filters.status || '').trim();
  if (status) params.set('status', status);

  const province = (usersState.filters.province || '').trim();
  if (province) params.set('province', province);

  const sort = (usersState.filters.sort || 'newest').trim();
  params.set('sort', sort === 'oldest' ? 'oldest' : 'newest');

  const search = (usersState.filters.search || '').trim();
  if (search) params.set('q', search);

  try {
    const response = await api(`/users?${params.toString()}`);
    const list = Array.isArray(response?.data) ? response.data : [];

    if (!list.length) {
      usersTableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="8">
            <div class="empty-state">
              <i class="fas fa-users-slash"></i>
              <p>کاربری با فیلتر فعلی یافت نشد</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    usersTableBody.innerHTML = list
      .map((item = {}) => {
        const idRaw = typeof item._id === 'string' ? item._id : '';
        const usernameRaw = typeof item.username === 'string' ? item.username : '';
        const emailRaw = typeof item.email === 'string' ? item.email : '';
        const provinceRaw = typeof item.province === 'string' ? item.province.trim() : '';
        const username = usernameRaw ? escapeHtml(usernameRaw) : '—';
        const email = emailRaw ? escapeHtml(emailRaw) : '—';
        const provinceLabel = provinceRaw ? escapeHtml(provinceRaw) : '—';
        const score = formatNumberFa(item.score || 0);
        const coins = formatNumberFa(item.coins || 0);
        const roleMeta = USER_ROLE_META[item.role] || USER_ROLE_META.user;
        const statusMeta = USER_STATUS_META[item.status] || { label: 'نامشخص', badge: 'badge-info' };
        const avatarSeed = idRaw || emailRaw || usernameRaw || 'user';
        const avatarUrl = `https://i.pravatar.cc/40?u=${encodeURIComponent(avatarSeed)}`;
        const avatarSrc = escapeHtml(avatarUrl);
        const idAttr = escapeHtml(idRaw);

        return `
          <tr>
            <td>
              <div class="flex items-center gap-2">
                <img src="${avatarSrc}" class="w-8 h-8 rounded-full" alt="user">
                <span>${username}</span>
              </div>
            </td>
            <td>${email}</td>
            <td>${provinceLabel}</td>
            <td>${score}</td>
            <td>${coins}</td>
            <td><span class="badge ${roleMeta.badge}">${roleMeta.label}</span></td>
            <td><span class="badge ${statusMeta.badge}">${statusMeta.label}</span></td>
            <td>
              <div class="flex gap-2">
                <button class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center" data-edit-u="${idAttr}">
                  <i class="fas fa-edit text-blue-400"></i>
                </button>
                <button class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center" data-del-u="${idAttr}">
                  <i class="fas fa-ban text-red-400"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Failed to load users', error);
    usersTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">
          <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${escapeHtml(error.message || 'مشکل در دریافت کاربران')}</p>
          </div>
        </td>
      </tr>
    `;
    showToast(error.message || 'مشکل در دریافت کاربران', 'error');
  }
}

function setupUserManagement() {
  if (userFilterRoleSelect) {
    userFilterRoleSelect.value = usersState.filters.role || '';
  }

  if (userFilterRoleSelect) {
    userFilterRoleSelect.addEventListener('change', () => {
      usersState.filters.role = userFilterRoleSelect.value || '';
      usersState.pagination.page = 1;
      if (!getToken()) return;
      loadUsers();
    });
  }

  if (userFilterStatusSelect) {
    userFilterStatusSelect.value = usersState.filters.status || '';
  }

  if (userFilterStatusSelect) {
    userFilterStatusSelect.addEventListener('change', () => {
      usersState.filters.status = userFilterStatusSelect.value || '';
      usersState.pagination.page = 1;
      if (!getToken()) return;
      loadUsers();
    });
  }

  if (userFilterProvinceSelect) {
    userFilterProvinceSelect.value = usersState.filters.province || '';
  }

  if (userFilterProvinceSelect) {
    userFilterProvinceSelect.addEventListener('change', () => {
      usersState.filters.province = userFilterProvinceSelect.value || '';
      usersState.pagination.page = 1;
      if (!getToken()) return;
      loadUsers();
    });
  }

  if (userFilterSortSelect) {
    userFilterSortSelect.value = usersState.filters.sort || 'newest';
  }

  if (userFilterSortSelect) {
    userFilterSortSelect.addEventListener('change', () => {
      const value = userFilterSortSelect.value || 'newest';
      usersState.filters.sort = value;
      usersState.pagination.page = 1;
      if (!getToken()) return;
      loadUsers();
    });
  }

  if (userFilterSearchInput) {
    userFilterSearchInput.value = usersState.filters.search || '';
  }

  if (userFilterSearchInput) {
    userFilterSearchInput.addEventListener('input', () => {
      const value = userFilterSearchInput.value || '';
      clearTimeout(userSearchDebounce);
      userSearchDebounce = setTimeout(() => {
        usersState.filters.search = value.trim();
        usersState.pagination.page = 1;
        if (!getToken()) return;
        loadUsers(false);
      }, 300);
    });
  }

  if (usersTableBody) {
    usersTableBody.addEventListener('click', async (event) => {
      const deleteBtn = event.target.closest('[data-del-u]');
      if (!deleteBtn) return;
      const id = deleteBtn.dataset.delU;
      if (!id) return;
      if (!getToken()) {
        showToast('برای مدیریت کاربران ابتدا وارد شوید', 'warning');
        return;
      }
      if (!confirm('حذف کاربر؟')) return;
      try {
        await api(`/users/${id}`, { method: 'DELETE' });
        showToast('کاربر حذف شد', 'success');
        await loadUsers();
        await loadDashboardOverview(true);
      } catch (error) {
        showToast(error.message || 'حذف کاربر ناموفق بود', 'error');
      }
    });
  }

  initializeUserProvinceOptions();
}

if (filterCategorySelect) {
  filterCategorySelect.addEventListener('change', () => {
    if (!getToken()) return;
    loadQuestions({ category: filterCategorySelect.value || '' });
  });
}

if (questionCategoryStatsGrid) {
  questionCategoryStatsGrid.addEventListener('click', (event) => {
    const chip = event.target.closest('.category-stat-chip[data-category-id]');
    if (!chip) return;
    if (!getToken()) {
      showToast('برای مشاهده سوالات این دسته‌بندی ابتدا وارد شوید', 'warning');
      return;
    }
    const id = chip.dataset.categoryId || '';
    const nextCategory = questionFilters.category === id ? '' : id;
    if (filterCategorySelect) {
      filterCategorySelect.value = nextCategory;
    }
    loadQuestions({ category: nextCategory });
  });
}

if (questionCategoryStatsManageBtn) {
  questionCategoryStatsManageBtn.addEventListener('click', () => {
    if (!getToken()) {
      showToast('برای مدیریت دسته‌بندی‌ها ابتدا وارد شوید', 'warning');
      return;
    }
    if (CATEGORY_MANAGEMENT_LOCKED) {
      notifyCategoryManagementLocked('warning');
      return;
    }
    navigateTo('categories');
  });
}

if (filterDifficultySelect) {
  filterDifficultySelect.addEventListener('change', () => {
    if (!getToken()) return;
    loadQuestions({ difficulty: filterDifficultySelect.value || '' });
  });
}


if (filterStatusSelect) {
  filterStatusSelect.addEventListener('change', () => {
    if (!getToken()) return;
    loadQuestions({ status: filterStatusSelect.value || '' });
  });
}

if (filterTypeToggle) {
  filterTypeToggle.addEventListener('change', () => {
    if (!getToken()) return;
    const nextType = filterTypeToggle.checked ? 'multiple' : null;
    loadQuestions({ type: nextType });
  });
}

if (filterApprovedOnlyToggle) {
  filterApprovedOnlyToggle.addEventListener('change', () => {
    if (!getToken()) return;
    const nextValue = filterApprovedOnlyToggle.checked;
    loadQuestions({
      approvedOnly: nextValue ? false : undefined,
      reviewMode: nextValue ? 'all' : 'default'
    });
  });
}

if (filterDuplicatesSelect) {
  filterDuplicatesSelect.addEventListener('change', () => {
    if (!getToken()) return;
    const value = filterDuplicatesSelect.value === 'duplicates' ? 'duplicates' : 'all';
    loadQuestions({ duplicates: value });
  });
}

if (filterSearchInput) {
  filterSearchInput.addEventListener('input', () => {
    if (!getToken()) return;
    const value = filterSearchInput.value || '';
    clearTimeout(filterSearchDebounce);
    filterSearchDebounce = setTimeout(() => {
      loadQuestions({ search: value });
    }, 300);
  });
}

if (filterSortSelect) {
  filterSortSelect.addEventListener('change', () => {
    if (!getToken()) return;
    const value = filterSortSelect.value || 'newest';
    loadQuestions({ sort: value });
  });
}

if (questionsPaginationContainer) {
  questionsPaginationContainer.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-page], button[data-direction]');
    if (!button || button.disabled) return;
    event.preventDefault();

    if (!getToken()) {
      showToast('برای مدیریت سوالات ابتدا وارد شوید', 'warning');
      return;
    }

    const totalPages = getQuestionsTotalPages();
    const currentPage = Math.max(1, Number(questionsState.pagination.page) || 1);

    if (button.dataset.direction === 'prev') {
      const prevPage = Math.max(1, currentPage - 1);
      if (prevPage !== currentPage) {
        loadQuestions({ page: prevPage });
      }
      return;
    }

    if (button.dataset.direction === 'next') {
      const nextPage = Math.min(totalPages, currentPage + 1);
      if (nextPage !== currentPage) {
        loadQuestions({ page: nextPage });
      }
      return;
    }

    if (button.dataset.page) {
      const targetPage = Math.max(1, Number(button.dataset.page) || 1);
      if (targetPage !== currentPage) {
        loadQuestions({ page: targetPage });
      }
    }
  });
}

if (viewPendingQuestionsBtn) {
  viewPendingQuestionsBtn.addEventListener('click', () => {
    if (!getToken()) {
      showToast('برای مدیریت سوالات ابتدا وارد شوید', 'warning');
      return;
    }
    if (filterStatusSelect && filterStatusSelect.value !== 'pending') {
      filterStatusSelect.value = 'pending';
    }
    loadQuestions({ status: 'pending' });
    viewPendingQuestionsBtn.blur();
  });
}

// --------------- CREATE handlers ---------------
if (saveQuestionBtn) {
  saveQuestionBtn.addEventListener('click', async () => {
    if (!addQuestionModal) return;
    if (!getToken()) {
      showToast('برای مدیریت سوالات ابتدا وارد شوید', 'warning');
      return;
    }
    if (!cachedCategories.length) {
      try {
        await loadCategoryFilterOptions();
      } catch (err) {
        console.error('Failed to refresh categories before creating question', err);
      }
    }
    const text = addQuestionTextInput ? addQuestionTextInput.value.trim() : '';
    const categoryId = addQuestionCategorySelect ? addQuestionCategorySelect.value : '';
    const category = findCategoryById(categoryId);
    const difficultyRaw = addQuestionDifficultySelect ? addQuestionDifficultySelect.value : 'easy';
    const difficulty = ['easy', 'medium', 'hard'].includes(difficultyRaw) ? difficultyRaw : 'easy';
    const active = addQuestionActiveInput ? Boolean(addQuestionActiveInput.checked) : true;
    const authorName = addQuestionAuthorInput ? addQuestionAuthorInput.value.trim() : '';
    const statusValue = active ? 'approved' : 'draft';
    const optionInputs = addQuestionOptionsWrapper
      ? Array.from(addQuestionOptionsWrapper.querySelectorAll('input.form-input'))
      : [];
    const options = optionInputs.map((input) => input.value.trim());
    const radios = addQuestionOptionsWrapper
      ? Array.from(addQuestionOptionsWrapper.querySelectorAll('input[type="radio"][name="correct-answer"]'))
      : [];
    const checkedRadio = radios.find((radio) => radio.checked);
    const correctIdx = checkedRadio ? Number(checkedRadio.value) : -1;

    if (!text) {
      showToast('متن سوال را وارد کنید', 'warning');
      return;
    }
    if (!categoryId) {
      showToast('لطفاً یک دسته‌بندی انتخاب کنید', 'warning');
      return;
    }
    if (!category) {
      showToast('دسته‌بندی انتخاب‌شده معتبر نیست. ابتدا یک دسته فعال بسازید.', 'warning');
      return;
    }
    if (options.length !== 4 || options.some((opt) => !opt)) {
      showToast('چهار گزینه معتبر وارد کنید', 'warning');
      return;
    }
    if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx >= options.length) {
      showToast('گزینه صحیح را مشخص کنید', 'warning');
      return;
    }

    saveQuestionBtn.disabled = true;
    saveQuestionBtn.classList.add('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
    saveQuestionBtn.innerHTML = `
      <span class="flex items-center gap-2">
        <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        <span>در حال ذخیره...</span>
      </span>
    `;

    try {
      await api('/questions', {
        method: 'POST',
        body: JSON.stringify({
          text,
          options,
          correctIdx,
          difficulty,
          categoryId,
          categoryName: category.displayName || category.name,
          active,
          authorName,
          status: statusValue,
          reviewNotes: ''
        })
      });
      showToast('سوال ذخیره شد', 'success');
      closeModal('#add-question-modal');
      await Promise.allSettled([
        loadQuestions(),
        loadCategoryFilterOptions(),
        loadDashboardStats(true),
        loadDashboardOverview(true)
      ]);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      saveQuestionBtn.disabled = false;
      saveQuestionBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
      saveQuestionBtn.innerHTML = saveQuestionBtnDefault;
    }
  });
}

if (saveCategoryBtn) {
  saveCategoryBtn.addEventListener('click', async () => {
    if (!categoryModal) return;
    if (!getToken()) {
      showToast('برای مدیریت دسته‌بندی‌ها ابتدا وارد شوید', 'warning');
      return;
    }

    const mode = categoryModal.dataset.mode === 'edit' ? 'edit' : 'create';
    const categoryId = categoryModal.dataset.id || '';
    const provider = categoryModal.dataset.provider || '';
    const originalName = categoryModal.dataset.originalName || '';
    const providerCategoryId = categoryModal.dataset.providerCategoryId || '';
    if (CATEGORY_MANAGEMENT_LOCKED && mode !== 'edit') {
      notifyCategoryManagementLocked();
      return;
    }
    let aliasSnapshot = [];
    try {
      aliasSnapshot = JSON.parse(categoryModal.dataset.aliases || '[]');
    } catch (err) {
      aliasSnapshot = [];
    }

    const name = categoryNameInput ? categoryNameInput.value.trim() : '';
    const desc = categoryDescriptionInput ? categoryDescriptionInput.value.trim() : '';
    const iconValue = categoryIconSelect ? categoryIconSelect.value : categoryIconDefaultValue;
    const colorValue = categoryColorSelect ? categoryColorSelect.value : categoryColorDefaultValue;

    if (!name) {
      showToast('نام دسته ضروری است', 'warning');
      return;
    }

    saveCategoryBtn.disabled = true;
    saveCategoryBtn.classList.add('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
    saveCategoryBtn.innerHTML = `
      <span class="flex items-center gap-2">
        <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        <span>در حال ذخیره...</span>
      </span>
    `;

    try {
      const existingAliases = Array.isArray(aliasSnapshot)
        ? aliasSnapshot.map((alias) => String(alias ?? '').trim()).filter(Boolean)
        : [];
      const aliasSet = new Set(existingAliases);

      const resolvedProvider = provider || 'manual';
      let systemName = name;

      if (mode === 'edit' && categoryId && resolvedProvider !== 'manual' && originalName) {
        systemName = originalName;
      }

      if (!systemName) {
        systemName = name;
      }

      aliasSet.add(systemName);
      aliasSet.add(name);
      if (originalName) aliasSet.add(originalName);

      const payload = {
        name: systemName,
        displayName: name,
        description: desc,
        icon: iconValue,
        color: colorValue,
        provider: resolvedProvider,
        aliases: Array.from(aliasSet).map((alias) => alias.trim()).filter(Boolean)
      };

      if (resolvedProvider !== 'manual' && providerCategoryId) {
        payload.providerCategoryId = providerCategoryId;
      }

      if (mode === 'edit' && categoryId) {
        await api(`/categories/${categoryId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('دسته‌بندی به‌روزرسانی شد', 'success');
      } else {
        await api('/categories', { method: 'POST', body: JSON.stringify(payload) });
        showToast('دسته‌بندی ذخیره شد', 'success');
      }
      closeModal('#add-category-modal');
      await loadCategoryFilterOptions(true);
      await loadDashboardOverview(true);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      saveCategoryBtn.disabled = false;
      saveCategoryBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
      const defaultLabel = mode === 'edit' ? CATEGORY_MODAL_LABELS.edit : CATEGORY_MODAL_LABELS.create;
      saveCategoryBtn.textContent = defaultLabel;
    }
  });
}

$('#save-user-btn').addEventListener('click', async () => {
  const username = addUserUsernameInput ? addUserUsernameInput.value.trim() : '';
  const email = addUserEmailInput ? addUserEmailInput.value.trim() : '';
  const password = addUserPasswordInput ? addUserPasswordInput.value.trim() : '';
  const role = addUserRoleSelect ? (addUserRoleSelect.value || 'user') : 'user';
  const province = addUserProvinceSelect ? addUserProvinceSelect.value.trim() : '';

  if (!username || !email || !password) {
    showToast('ورودی‌ها کامل نیست', 'warning');
    return;
  }

  const payload = { username, email, password, role };
  if (province) payload.province = province;

  try {
    await api('/users', { method: 'POST', body: JSON.stringify(payload) });
    showToast('کاربر ذخیره شد', 'success');
    closeModal('#add-user-modal');
    if (addUserUsernameInput) addUserUsernameInput.value = '';
    if (addUserEmailInput) addUserEmailInput.value = '';
    if (addUserPasswordInput) addUserPasswordInput.value = '';
    if (addUserRoleSelect) addUserRoleSelect.value = 'user';
    if (addUserProvinceSelect) addUserProvinceSelect.value = '';
    await loadUsers();
    await loadDashboardOverview(true);
  } catch (e) {
    showToast(e.message, 'error');
  }
});

$('#save-achievement-btn').addEventListener('click', async () => {
  const m = $('#add-achievement-modal');
  const name = m.querySelector('input[type="text"]').value.trim();
  const description = m.querySelector('textarea').value.trim();
  const icon = m.querySelectorAll('select')[0].value;
  const color = m.querySelectorAll('select')[1].value;
  if (!name) return showToast('نام دستاورد ضروری است','warning');
  try {
    await api('/achievements', { method:'POST', body: JSON.stringify({ name, description, icon, color }) });
    showToast('دستاورد ذخیره شد','success');
    closeModal('#add-achievement-modal');
  } catch (e) { showToast(e.message,'error'); }
});

const settingsSaveButtonDefault = settingsSaveButton ? settingsSaveButton.innerHTML : '';

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeString(value, fallback = '') {
  if (value == null) return fallback;
  return String(value).trim();
}

function getCheckboxValue(input, fallback = false) {
  if (!input) return fallback;
  return !!input.checked;
}

function readStoredSettings() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ADMIN_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (_) {
    // ignore
  }
  return null;
}

function setSelectValue(select, value) {
  if (!select || value == null) return;
  const stringValue = String(value);
  const options = Array.from(select.options || []);
  if (!options.some((option) => option.value === stringValue) && stringValue) {
    const opt = document.createElement('option');
    opt.value = stringValue;
    opt.textContent = stringValue;
    select.appendChild(opt);
  }
  select.value = stringValue;
}

function setInputValue(input, value) {
  if (!input || value == null) return;
  input.value = value;
}

function setCheckboxValue(input, value) {
  if (!input) return;
  input.checked = !!value;
}

// legacy helpers removed in simplified shop settings

function applySettingsSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  const general = snapshot.general || {};
  if (generalAppNameInput && general.appName != null) generalAppNameInput.value = general.appName;
  if (generalLanguageSelect && general.language != null) setSelectValue(generalLanguageSelect, general.language);
  if (generalQuestionTimeInput && general.questionTime != null) generalQuestionTimeInput.value = general.questionTime;
  if (generalMaxQuestionsInput && general.maxQuestions != null) generalMaxQuestionsInput.value = general.maxQuestions;

  const rewards = snapshot.rewards || {};
  if (rewardPointsCorrectInput && rewards.pointsCorrect != null) rewardPointsCorrectInput.value = rewards.pointsCorrect;
  if (rewardCoinsCorrectInput && rewards.coinsCorrect != null) rewardCoinsCorrectInput.value = rewards.coinsCorrect;
  if (rewardPointsStreakInput && rewards.pointsStreak != null) rewardPointsStreakInput.value = rewards.pointsStreak;
  if (rewardCoinsStreakInput && rewards.coinsStreak != null) rewardCoinsStreakInput.value = rewards.coinsStreak;

  const shop = snapshot.shop || {};
  if (shopGlobalToggle && shop.enabled != null) shopGlobalToggle.checked = !!shop.enabled;
  updateShopStatus(getCheckboxValue(shopGlobalToggle, true));

  if (shopPricingCurrencySelect && shop.currency != null) setSelectValue(shopPricingCurrencySelect, shop.currency);
  if (shopLowBalanceThresholdInput && shop.lowBalanceThreshold != null) shopLowBalanceThresholdInput.value = shop.lowBalanceThreshold;
  if (shopQuickTopupToggle) shopQuickTopupToggle.checked = shop.quickTopup !== false && !!shop.quickTopup;
  if (shopQuickPurchaseToggle) shopQuickPurchaseToggle.checked = shop.quickPurchase !== false && !!shop.quickPurchase;

  const hero = shop.hero || {};
  if (shopHeroTitleInput && hero.title != null) shopHeroTitleInput.value = hero.title;
  if (shopHeroSubtitleInput && hero.subtitle != null) shopHeroSubtitleInput.value = hero.subtitle;
  if (shopHeroCtaInput && hero.ctaText != null) shopHeroCtaInput.value = hero.ctaText;
  if (shopHeroLinkInput && hero.ctaLink != null) shopHeroLinkInput.value = hero.ctaLink;

  const packagesData = shop.packages != null ? shop.packages : snapshot.packages;
  applyPackageSnapshots(packagesData);

  const vip = shop.vip || {};
  if (shopVipToggle && vip.enabled != null) shopVipToggle.checked = !!vip.enabled;
  if (shopVipAutoRenewToggle && vip.autoRenew != null) shopVipAutoRenewToggle.checked = !!vip.autoRenew;
  if (shopVipAutoApproveToggle && vip.autoApprove != null) shopVipAutoApproveToggle.checked = !!vip.autoApprove;
  if (shopVipBillingSelect && vip.billingCycle != null) setSelectValue(shopVipBillingSelect, vip.billingCycle);
  if (shopVipPriceInput && vip.price != null) shopVipPriceInput.value = vip.price;
  if (shopVipTrialDaysInput && vip.trialDays != null) shopVipTrialDaysInput.value = vip.trialDays;
  if (shopVipSlotsInput && vip.slots != null) shopVipSlotsInput.value = vip.slots;
  if (shopVipBenefitsInput && vip.customNote != null) shopVipBenefitsInput.value = vip.customNote;
  if (Array.isArray(vip.perks)) {
    const perks = vip.perks.map((perk) => safeString(perk, ''));
    shopVipPerkCheckboxes.forEach((checkbox) => {
      const value = safeString(checkbox.value || checkbox.dataset.vipPerk || '', '');
      checkbox.checked = perks.includes(value);
    });
  }

  const support = shop.support || {};
  if (shopSupportMessageInput && support.message != null) shopSupportMessageInput.value = support.message;
  if (shopSupportLinkInput && support.link != null) shopSupportLinkInput.value = support.link;

  shopPackageCards.forEach((card) => {
    const nameInput = card.querySelector('[data-package-field="displayName"]');
    const nameEl = card.querySelector('[data-package-name]');
    if (nameInput && nameEl) {
      const value = safeString(nameInput.value, '');
      nameEl.textContent = value || '—';
    }
    const toggle = card.querySelector('[data-shop-package-active]');
    syncToggleLabel(toggle);
  });

  syncToggleLabel(shopGlobalToggle);
  syncToggleLabel(shopQuickTopupToggle);
  syncToggleLabel(shopQuickPurchaseToggle);
  syncToggleLabel(shopVipToggle);
  syncToggleLabel(shopVipAutoRenewToggle);
  syncToggleLabel(shopVipAutoApproveToggle);

  updateHeroPreview();
  updateVipPreview();
  updateShopSummary();
}

function collectGeneralSettings() {
  return {
    appName: safeString(generalAppNameInput ? generalAppNameInput.value : 'Quiz WebApp Pro', 'Quiz WebApp Pro'),
    language: safeString(generalLanguageSelect ? generalLanguageSelect.value : 'fa', 'fa') || 'fa',
    questionTime: safeNumber(generalQuestionTimeInput ? generalQuestionTimeInput.value : 30, 30),
    maxQuestions: safeNumber(generalMaxQuestionsInput ? generalMaxQuestionsInput.value : 10, 10)
  };
}

function collectRewardSettings() {
  return {
    pointsCorrect: safeNumber(rewardPointsCorrectInput ? rewardPointsCorrectInput.value : 100, 100),
    coinsCorrect: safeNumber(rewardCoinsCorrectInput ? rewardCoinsCorrectInput.value : 5, 5),
    pointsStreak: safeNumber(rewardPointsStreakInput ? rewardPointsStreakInput.value : 50, 50),
    coinsStreak: safeNumber(rewardCoinsStreakInput ? rewardCoinsStreakInput.value : 10, 10)
  };
}

function readPackageCard(card) {
  if (!card) return null;
  const pkg = {};
  const defaultId = safeString(card.dataset.packageId || '', '');
  card.querySelectorAll('[data-package-field]').forEach((input) => {
    const field = input.dataset.packageField;
    if (!field) return;
    if (input.type === 'checkbox') {
      pkg[field] = !!input.checked;
    } else if (input.type === 'number') {
      pkg[field] = safeNumber(input.value, 0);
    } else {
      pkg[field] = safeString(input.value, '');
    }
  });
  pkg.id = safeString(pkg.id || defaultId, defaultId);
  pkg.type = safeString(card.dataset.shopPackage || 'general', 'general');
  if (!pkg.id) return null;
  return pkg;
}

function applyPackageSnapshots(packages) {
  if (!shopSettingsPage) return;
  const normalized = [];
  if (Array.isArray(packages)) {
    packages.forEach((pkg) => {
      if (pkg) normalized.push(pkg);
    });
  } else if (packages && typeof packages === 'object') {
    Object.entries(packages).forEach(([type, items]) => {
      if (!Array.isArray(items)) return;
      items.forEach((item) => {
        if (!item) return;
        normalized.push({ ...item, type });
      });
    });
  }

  if (!normalized.length) {
    shopPackageCards.forEach((card) => {
      const nameInput = card.querySelector('[data-package-field="displayName"]');
      const nameEl = card.querySelector('[data-package-name]');
      if (nameInput && nameEl) {
        const value = safeString(nameInput.value, '');
        nameEl.textContent = value || '—';
      }
    });
    return;
  }

  normalized.forEach((pkg) => {
    if (!pkg || !pkg.id) return;
    const selector = `[data-shop-package][data-package-id="${pkg.id}"]`;
    const card = shopSettingsPage.querySelector(selector);
    if (!card) return;
    card.querySelectorAll('[data-package-field]').forEach((input) => {
      const field = input.dataset.packageField;
      if (!field) return;
      const value = pkg[field];
      if (value == null) return;
      if (input.type === 'checkbox') {
        input.checked = value !== false && !!value;
      } else if (input.type === 'number') {
        input.value = value;
      } else {
        input.value = value;
      }
    });
    const nameEl = card.querySelector('[data-package-name]');
    if (nameEl && pkg.displayName != null) {
      nameEl.textContent = safeString(pkg.displayName, '') || '—';
    }
  });
}

function collectShopPackagesByType() {
  const result = {};
  if (!shopPackageCards.length) return result;
  shopPackageCards.forEach((card) => {
    const pkg = readPackageCard(card);
    if (!pkg || !pkg.id) return;
    const type = pkg.type || safeString(card.dataset.shopPackage || 'general', 'general');
    if (!result[type]) result[type] = [];
    const pkgCopy = { ...pkg };
    delete pkgCopy.type;
    result[type].push(pkgCopy);
  });
  return result;
}

function collectVipSettings() {
  const state = computeVipState();
  if (!state) return {};
  return {
    enabled: state.enabled,
    autoRenew: state.autoRenew,
    autoApprove: state.autoApprove,
    billingCycle: state.billingValue,
    price: state.price,
    trialDays: state.trialDays,
    slots: state.slots,
    perks: state.perksValues,
    customNote: state.note
  };
}

function collectShopSettingsSnapshot() {
  return {
    enabled: getCheckboxValue(shopGlobalToggle, true),
    currency: safeString(shopPricingCurrencySelect ? shopPricingCurrencySelect.value : 'coin', 'coin') || 'coin',
    lowBalanceThreshold: safeNumber(shopLowBalanceThresholdInput ? shopLowBalanceThresholdInput.value : 0, 0),
    quickTopup: getCheckboxValue(shopQuickTopupToggle),
    quickPurchase: getCheckboxValue(shopQuickPurchaseToggle),
    hero: {
      title: safeString(shopHeroTitleInput ? shopHeroTitleInput.value : '', ''),
      subtitle: safeString(shopHeroSubtitleInput ? shopHeroSubtitleInput.value : '', ''),
      ctaText: safeString(shopHeroCtaInput ? shopHeroCtaInput.value : '', ''),
      ctaLink: safeString(shopHeroLinkInput ? shopHeroLinkInput.value : '', '')
    },
    packages: collectShopPackagesByType(),
    vip: collectVipSettings(),
    support: {
      message: safeString(shopSupportMessageInput ? shopSupportMessageInput.value : '', ''),
      link: safeString(shopSupportLinkInput ? shopSupportLinkInput.value : '', '')
    }
  };
}

function collectSettingsSnapshot() {
  return {
    general: collectGeneralSettings(),
    rewards: collectRewardSettings(),
    shop: collectShopSettingsSnapshot(),
    updatedAt: Date.now()
  };
}

function persistSettings(snapshot) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_SETTINGS_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (_) {
    // ignore storage quota errors
  }
}

function initializeSettingsFromStorage() {
  const saved = readStoredSettings();
  if (saved) applySettingsSnapshot(saved);
}

function handleSettingsSave() {
  if (!settingsSaveButton) return;

  const general = collectGeneralSettings();
  if (!general.appName) {
    showToast('نام برنامه را وارد کنید', 'warning');
    if (generalAppNameInput) generalAppNameInput.focus();
    return;
  }
  if (!Number.isFinite(general.questionTime) || general.questionTime <= 0) {
    showToast('زمان سوال باید بیشتر از صفر باشد', 'warning');
    if (generalQuestionTimeInput) generalQuestionTimeInput.focus();
    return;
  }
  if (!Number.isFinite(general.maxQuestions) || general.maxQuestions <= 0) {
    showToast('حداکثر سوالات باید بیشتر از صفر باشد', 'warning');
    if (generalMaxQuestionsInput) generalMaxQuestionsInput.focus();
    return;
  }

  const rewards = collectRewardSettings();
  if (rewards.pointsCorrect < 0 || rewards.coinsCorrect < 0 || rewards.pointsStreak < 0 || rewards.coinsStreak < 0) {
    showToast('مقادیر پاداش نمی‌تواند منفی باشد', 'warning');
    return;
  }

  const snapshot = {
    general,
    rewards,
    shop: collectShopSettingsSnapshot(),
    updatedAt: Date.now()
  };

  settingsSaveButton.disabled = true;
  settingsSaveButton.innerHTML = `
    <span class="flex items-center gap-2">
      <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
      <span>در حال ذخیره...</span>
    </span>
  `;

  try {
    persistSettings(snapshot);
    applySettingsSnapshot(snapshot);
    showToast('تنظیمات ذخیره شد و اعمال شد', 'success');
    markShopUpdated();
    updateShopSummary();
    try {
      window.dispatchEvent(new CustomEvent('iquiz-admin-settings-updated', { detail: snapshot }));
    } catch (_) {}
  } catch (error) {
    showToast('ذخیره تنظیمات با خطا مواجه شد', 'error');
  } finally {
    settingsSaveButton.disabled = false;
    settingsSaveButton.innerHTML = settingsSaveButtonDefault;
  }
}

if (settingsSaveButton) {
  settingsSaveButton.addEventListener('click', handleSettingsSave);
}

initializeSettingsFromStorage();

// --------------- SHOP SETTINGS ---------------
function syncToggleLabel(toggle) {
  if (!toggle) return;
  const label = toggle.closest('label');
  if (!label) return;
  const labelText = label.querySelector('[data-toggle-text]');
  if (!labelText) return;
  if (!labelText.dataset.toggleOnText) {
    labelText.dataset.toggleOnText = toggle.dataset.toggleOn || labelText.textContent || 'فعال';
  }
  if (!labelText.dataset.toggleOffText) {
    labelText.dataset.toggleOffText = toggle.dataset.toggleOff || labelText.textContent || 'غیرفعال';
  }
  labelText.textContent = toggle.checked ? labelText.dataset.toggleOnText : labelText.dataset.toggleOffText;
}

function updateShopStatus(isEnabled) {
  if (shopStatusChip) {
    shopStatusChip.classList.remove('status-active', 'status-inactive');
    shopStatusChip.classList.add(isEnabled ? 'status-active' : 'status-inactive');
    const icon = shopStatusChip.querySelector('i');
    if (icon) {
      icon.className = isEnabled ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-minus';
    }
  }
  if (shopStatusLabel) {
    shopStatusLabel.textContent = isEnabled ? 'فروشگاه فعال است' : 'فروشگاه غیرفعال است';
  }
  if (shopGlobalStatusLabel) {
    shopGlobalStatusLabel.textContent = isEnabled ? 'فعال' : 'غیرفعال';
    shopGlobalStatusLabel.classList.toggle('text-emerald-300', isEnabled);
    shopGlobalStatusLabel.classList.toggle('text-rose-300', !isEnabled);
  }
  if (shopSummaryElements.status) {
    shopSummaryElements.status.textContent = isEnabled ? 'فعال' : 'غیرفعال';
  }
}

function updateHeroPreview() {
  const title = safeString(shopHeroTitleInput ? shopHeroTitleInput.value : '', '');
  const subtitle = safeString(shopHeroSubtitleInput ? shopHeroSubtitleInput.value : '', '');
  const ctaText = safeString(shopHeroCtaInput ? shopHeroCtaInput.value : '', '');
  const ctaLink = safeString(shopHeroLinkInput ? shopHeroLinkInput.value : '', '');
  const ctaEnabled = getCheckboxValue(shopQuickTopupToggle, true);

  if (shopHeroPreviewTitle) {
    shopHeroPreviewTitle.textContent = title || 'عنوان فروشگاه شما';
    shopHeroPreviewTitle.classList.toggle('opacity-70', !title);
  }
  if (shopHeroPreviewSubtitle) {
    shopHeroPreviewSubtitle.textContent = subtitle || 'توضیح کوتاه را اینجا بنویسید.';
    shopHeroPreviewSubtitle.classList.toggle('opacity-70', !subtitle);
  }
  if (shopPreviewCtaLabel) {
    shopPreviewCtaLabel.textContent = ctaText || 'ورود به فروشگاه';
  }
  if (shopPreviewCta) {
    shopPreviewCta.href = ctaLink || '#';
    shopPreviewCta.classList.toggle('opacity-60', !ctaEnabled);
    shopPreviewCta.classList.toggle('pointer-events-none', !ctaEnabled);
  }
  if (shopPreviewHelper) {
    shopPreviewHelper.textContent = ctaEnabled ? 'CTA برای هدایت سریع کاربران' : 'دکمه CTA غیرفعال شده است';
  }
}

function getShopCurrencyLabel(value) {
  const key = safeString(value, '');
  return SHOP_CURRENCY_LABELS[key] || 'واحد';
}

function computeVipState() {
  if (!shopVipSection) return null;

  const billingValue = safeString(shopVipBillingSelect ? shopVipBillingSelect.value : 'monthly', 'monthly') || 'monthly';
  let billingLabel = '';
  if (shopVipBillingSelect) {
    const option = shopVipBillingSelect.options[shopVipBillingSelect.selectedIndex];
    if (option) {
      billingLabel = safeString(option.textContent, '');
    }
  }

  const currencyValue = safeString(shopPricingCurrencySelect ? shopPricingCurrencySelect.value : 'coin', 'coin') || 'coin';
  const currencyLabel = getShopCurrencyLabel(currencyValue);

  const perks = shopVipPerkCheckboxes.map((checkbox) => {
    const value = safeString(checkbox.value || checkbox.dataset.vipPerk || '', '');
    const label = safeString(checkbox.dataset.perkLabel || checkbox.nextElementSibling?.textContent, '');
    return {
      value,
      label,
      checked: getCheckboxValue(checkbox)
    };
  });

  const perksSelected = perks.filter((perk) => perk.checked);

  return {
    enabled: getCheckboxValue(shopVipToggle),
    autoRenew: getCheckboxValue(shopVipAutoRenewToggle),
    autoApprove: getCheckboxValue(shopVipAutoApproveToggle),
    billingValue,
    billingLabel,
    price: safeNumber(shopVipPriceInput ? shopVipPriceInput.value : 0, 0),
    trialDays: safeNumber(shopVipTrialDaysInput ? shopVipTrialDaysInput.value : 0, 0),
    slots: safeNumber(shopVipSlotsInput ? shopVipSlotsInput.value : 0, 0),
    perks,
    perksSelected,
    perksLabels: perksSelected.map((perk) => perk.label).filter(Boolean),
    perksValues: perksSelected.map((perk) => perk.value).filter(Boolean),
    perksCount: perksSelected.length,
    note: safeString(shopVipBenefitsInput ? shopVipBenefitsInput.value : '', ''),
    currencyValue,
    currencyLabel
  };
}

function updateVipPreview() {
  if (!shopVipSection) return;
  const state = computeVipState();
  if (!state) return;

  if (shopVipStatusLabel) {
    shopVipStatusLabel.textContent = state.enabled ? 'فعال' : 'غیرفعال';
    shopVipStatusLabel.classList.toggle('text-emerald-300', state.enabled);
    shopVipStatusLabel.classList.toggle('text-rose-300', !state.enabled);
  }

  if (shopVipPreviewCard) {
    shopVipPreviewCard.classList.toggle('opacity-60', !state.enabled);
  }

  if (shopVipPreviewState) {
    shopVipPreviewState.textContent = state.enabled ? 'فعال' : 'غیرفعال';
  }

  if (shopVipPreviewPrice) {
    shopVipPreviewPrice.textContent = state.price > 0
      ? `${formatNumberFa(state.price)} ${state.currencyLabel}`
      : `قیمت ${state.currencyLabel}`;
  }

  if (shopVipPreviewCycle) {
    shopVipPreviewCycle.textContent = state.billingLabel || 'دوره نامشخص';
  }

  if (shopVipPreviewPerks) {
    shopVipPreviewPerks.textContent = state.perksLabels.length
      ? state.perksLabels.join(' • ')
      : 'مزیتی انتخاب نشده است';
  }

  if (shopVipPreviewNote) {
    shopVipPreviewNote.textContent = state.note || 'توضیحات VIP را برای کاربران بنویسید.';
    shopVipPreviewNote.classList.toggle('opacity-70', !state.note);
  }

  if (shopVipMetricElements.length) {
    shopVipMetricElements.forEach((metric) => {
      if (!metric || !metric.dataset) return;
      const key = metric.dataset.vipMetric;
      switch (key) {
        case 'perks':
          metric.textContent = state.perksCount ? formatNumberFa(state.perksCount) : '۰';
          break;
        case 'trial':
          metric.textContent = state.trialDays > 0 ? `${formatNumberFa(state.trialDays)} روز` : 'بدون دوره';
          break;
        case 'slots':
          metric.textContent = state.slots > 0 ? `${formatNumberFa(state.slots)} نفر` : 'نامحدود';
          break;
        case 'automation': {
          const parts = [];
          parts.push(state.autoRenew ? 'تمدید خودکار' : 'تمدید دستی');
          parts.push(state.autoApprove ? 'تایید فوری' : 'نیاز به تایید');
          metric.textContent = parts.join(' + ');
          break;
        }
        default:
          break;
      }
    });
  }
}

function updateShopSummary() {
  const totalPackages = shopPackageCards.length;
  const activePackages = shopPackageCards.filter((card) => {
    const toggle = card.querySelector('[data-shop-package-active]');
    return getCheckboxValue(toggle, true);
  }).length;

  if (shopSummaryElements.packages) {
    shopSummaryElements.packages.textContent = totalPackages
      ? `${formatNumberFa(activePackages)} از ${formatNumberFa(totalPackages)} فعال`
      : 'بدون پکیج';
  }

  const shortcutToggles = [shopQuickTopupToggle, shopQuickPurchaseToggle].filter(Boolean);
  const shortcutsActive = shortcutToggles.filter((toggle) => getCheckboxValue(toggle, true)).length;
  if (shopSummaryElements.shortcuts) {
    shopSummaryElements.shortcuts.textContent = shortcutToggles.length
      ? `${formatNumberFa(shortcutsActive)} / ${formatNumberFa(shortcutToggles.length)} فعال`
      : '—';
  }

  if (shopSummaryElements.vip) {
    const vipState = computeVipState();
    if (!vipState) {
      shopSummaryElements.vip.textContent = '—';
    } else if (!vipState.enabled) {
      shopSummaryElements.vip.textContent = 'غیرفعال';
    } else {
      const perksLabel = vipState.perksCount
        ? `${formatNumberFa(vipState.perksCount)} مزیت`
        : 'بدون مزیت';
      const cycleLabel = vipState.billingLabel || 'دوره نامشخص';
      shopSummaryElements.vip.textContent = `${perksLabel} • ${cycleLabel}`;
    }
  }
}

function markShopUpdated() {
  if (!shopLastUpdateEl) return;
  const now = new Date();
  shopState.lastUpdated = now;
  try {
    const formatter = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' });
    shopLastUpdateEl.textContent = `لحظاتی پیش (${formatter.format(now)})`;
  } catch (_) {
    shopLastUpdateEl.textContent = 'لحظاتی پیش';
  }
}

function setupShopControls() {
  if (!shopSettingsPage) return;

  const registerToggle = (toggle, options) => {
    if (!toggle) return;
    const extra = options && typeof options === 'object' ? options : {};
    const { onChange } = extra;
    syncToggleLabel(toggle);
    toggle.addEventListener('change', () => {
      if (toggle === shopGlobalToggle) {
        updateShopStatus(toggle.checked);
      }
      if (toggle === shopQuickTopupToggle) {
        updateHeroPreview();
      }
      if (typeof onChange === 'function') {
        onChange(toggle);
      }
      updateShopSummary();
      if (shopState.initialized) {
        markShopUpdated();
      }
    });
  };

  [shopGlobalToggle, shopQuickTopupToggle, shopQuickPurchaseToggle].forEach((toggle) => registerToggle(toggle));
  [shopVipToggle, shopVipAutoRenewToggle, shopVipAutoApproveToggle].forEach((toggle) => {
    registerToggle(toggle, { onChange: updateVipPreview });
  });

  const heroInputs = [shopHeroTitleInput, shopHeroSubtitleInput, shopHeroCtaInput, shopHeroLinkInput];
  heroInputs.forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      updateHeroPreview();
      if (shopState.initialized) {
        markShopUpdated();
      }
    });
  });

  const supportInputs = [shopSupportMessageInput, shopSupportLinkInput, shopPricingCurrencySelect, shopLowBalanceThresholdInput];
  supportInputs.forEach((input) => {
    if (!input) return;
    const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(eventName, () => {
      if (input === shopPricingCurrencySelect || input === shopLowBalanceThresholdInput) {
        updateShopSummary();
      }
      if (input === shopPricingCurrencySelect) {
        updateVipPreview();
      }
      if (shopState.initialized) {
        markShopUpdated();
      }
    });
  });

  const vipValueInputs = [shopVipPriceInput, shopVipTrialDaysInput, shopVipSlotsInput, shopVipBenefitsInput];
  vipValueInputs.forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      updateVipPreview();
      updateShopSummary();
      if (shopState.initialized) {
        markShopUpdated();
      }
    });
  });

  if (shopVipBillingSelect) {
    shopVipBillingSelect.addEventListener('change', () => {
      updateVipPreview();
      updateShopSummary();
      if (shopState.initialized) {
        markShopUpdated();
      }
    });
  }

  shopVipPerkCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      updateVipPreview();
      updateShopSummary();
      if (shopState.initialized) {
        markShopUpdated();
      }
    });
  });

  shopPackageCards.forEach((card) => {
    const toggle = card.querySelector('[data-shop-package-active]');
    syncToggleLabel(toggle);
    const nameInput = card.querySelector('[data-package-field="displayName"]');
    const inputs = card.querySelectorAll('input, textarea');
    inputs.forEach((input) => {
      const eventName = input.type === 'checkbox' ? 'change' : 'input';
      input.addEventListener(eventName, () => {
        if (input === toggle) {
          syncToggleLabel(toggle);
          updateShopSummary();
        }
        if (input === nameInput) {
          const nameEl = card.querySelector('[data-package-name]');
          if (nameEl) {
            nameEl.textContent = safeString(nameInput.value, '') || '—';
          }
        }
        if (shopState.initialized) {
          markShopUpdated();
        }
      });
    });
  });

  updateShopStatus(getCheckboxValue(shopGlobalToggle, true));
  updateHeroPreview();
  updateVipPreview();
  updateShopSummary();

  shopState.initialized = true;
}

// --------------- INIT ---------------
async function loadAllData() {
  await Promise.all([
    loadDashboardOverview(),
    loadDashboardStats(),
    loadCategoryFilterOptions(),
    loadQuestions(),
    loadUsers(),
    loadAds()
  ]);
}

function handleResize() { if (window.innerWidth >= 768) $('#mobile-menu').classList.add('translate-x-full'); }
window.addEventListener('resize', handleResize);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    $$('.modal').forEach(m => { if (m.classList.contains('active')) closeModal(`#${m.id}`); });
    $('#mobile-menu').classList.add('translate-x-full');
  }
});

if (duplicatesBulkDeleteBtn) {
  duplicatesBulkDeleteBtn.addEventListener('click', handleDuplicatesBulkDelete);
}

if (duplicatesGroupsContainer) {
  duplicatesGroupsContainer.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[type="checkbox"][data-duplicate-id]');
    if (!checkbox) return;
    const id = checkbox.dataset.duplicateId || '';
    if (!id) return;
    if (checkbox.checked) duplicatesState.selected.add(id);
    else duplicatesState.selected.delete(id);
    updateDuplicateBulkDeleteState();
  });

  duplicatesGroupsContainer.addEventListener('click', (event) => {
    const selectButton = event.target.closest('[data-duplicate-group-select]');
    if (selectButton) {
      event.preventDefault();
      const mode = selectButton.dataset.duplicateGroupSelect || 'all';
      const groupId = selectButton.dataset.duplicateGroupId || '';
      handleDuplicateGroupSelection(groupId, mode);
      return;
    }

    const deleteButton = event.target.closest('[data-duplicate-delete-id]');
    if (deleteButton) {
      event.preventDefault();
      const targetId = deleteButton.dataset.duplicateDeleteId || '';
      handleDuplicateSingleDelete(targetId);
      return;
    }

    const detailButton = event.target.closest('[data-duplicate-open-id]');
    if (detailButton) {
      event.preventDefault();
      const targetId = detailButton.dataset.duplicateOpenId || '';
      if (!targetId) return;
      if (!questionsCache.has(targetId)) {
        const duplicateQuestion = findDuplicateQuestionById(targetId);
        if (duplicateQuestion) {
          questionsCache.set(targetId, duplicateQuestion);
        }
      }
      openQuestionDetailById(targetId);
    }
  });
}

if (duplicatesViewTabs.length) {
  duplicatesViewTabs.forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.questionsView || 'list';
      setQuestionsView(view);
    });
  });
}

setQuestionsView('list');
updateDuplicateBulkDeleteState();

setupUserManagement();
setupShopControls();
renderCategoryManagement();
resetAdForm();
updateAdsStats();
renderAds();
loadAdProvinces();

// صفحه پیش‌فرض
navigateTo('dashboard');

// اگر توکن داریم، داده‌ها را بگیر
if (getToken()) loadAllData();

