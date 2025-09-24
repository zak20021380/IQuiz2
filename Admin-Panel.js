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
  active:    { label: 'فعال', class: 'meta-chip status-active', dot: 'active' },
  pending:   { label: 'در انتظار بررسی', class: 'meta-chip status-pending', dot: 'pending' },
  approved:  { label: 'تایید شده', class: 'meta-chip status-approved', dot: 'active' },
  rejected:  { label: 'رد شده', class: 'meta-chip status-rejected', dot: 'inactive' },
  review:    { label: 'در حال بررسی', class: 'meta-chip status-pending', dot: 'pending' },
  draft:     { label: 'پیش‌نویس', class: 'meta-chip status-pending', dot: 'pending' },
  inactive:  { label: 'غیرفعال', class: 'meta-chip status-inactive', dot: 'inactive' },
  disabled:  { label: 'غیرفعال', class: 'meta-chip status-inactive', dot: 'inactive' },
  archived:  { label: 'آرشیو شده', class: 'meta-chip status-archived', dot: 'archived' }
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
const shopMetricElements = {
  activeSections: shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-metric="activeSections"]') : null,
  packages: shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-metric="packages"]') : null,
  vipPlans: shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-metric="vipPlans"]') : null
};
const shopLockableSections = shopSettingsPage ? Array.from(shopSettingsPage.querySelectorAll('[data-shop-lockable]')) : [];
const shopSectionToggles = shopSettingsPage ? Array.from(shopSettingsPage.querySelectorAll('[data-shop-section-toggle]')) : [];
const shopPackageToggles = shopSettingsPage ? Array.from(shopSettingsPage.querySelectorAll('[data-shop-package-active]')) : [];
const shopVipToggles = shopSettingsPage ? Array.from(shopSettingsPage.querySelectorAll('[data-shop-vip-active]')) : [];
const shopHeroPreview = shopSettingsPage ? shopSettingsPage.querySelector('[data-shop-hero-preview]') : null;
const shopHeroThemeSelect = $('#shop-hero-theme');
const shopHeroLinkInput = $('#shop-hero-cta-link');
const shopPreviewCta = $('#shop-preview-cta');
const shopBoundInputs = shopSettingsPage ? Array.from(shopSettingsPage.querySelectorAll('[data-bind-target]')) : [];
const shopHeroToggle = $('#shop-hero-toggle');
const shopKeysToggle = $('#shop-keys-toggle');
const shopWalletToggle = $('#shop-wallet-toggle');
const shopVipToggle = $('#shop-vip-toggle');
const shopPromotionsToggle = $('#shop-promotions-toggle');
const settingsSaveButton = $('#settings-save-button');
const generalAppNameInput = $('#settings-app-name');
const generalLanguageSelect = $('#settings-language');
const generalQuestionTimeInput = $('#settings-question-time');
const generalMaxQuestionsInput = $('#settings-max-questions');
const rewardPointsCorrectInput = $('#settings-points-correct');
const rewardCoinsCorrectInput = $('#settings-coins-correct');
const rewardPointsStreakInput = $('#settings-points-streak');
const rewardCoinsStreakInput = $('#settings-coins-streak');
const shopPricingCurrencySelect = $('#shop-pricing-currency');
const shopLowBalanceThresholdInput = $('#shop-low-balance-threshold');
const shopQuickTopupToggle = $('#shop-quick-topup');
const shopQuickPurchaseToggle = $('#shop-quick-purchase');
const shopDynamicPricingToggle = $('#shop-dynamic-pricing');
const shopHeroTitleInput = $('#shop-hero-title');
const shopHeroSubtitleInput = $('#shop-hero-subtitle');
const shopHeroCtaInput = $('#shop-hero-cta');
const shopHeroNoteInput = $('#shop-hero-note');
const shopShowBalancesToggle = $('#shop-show-balances');
const shopShowTagsToggle = $('#shop-show-tags');
const shopAutoHighlightToggle = $('#shop-auto-highlight');
const shopShowTutorialToggle = $('#shop-show-tutorial');

const questionFilters = {
  category: '',
  difficulty: '',
  provider: '',
  status: '',
  search: '',
  sort: 'newest',
  type: undefined,
  approvedOnly: undefined,
  duplicates: 'all'
};

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
    const wrapper = document.createElement('div');
    wrapper.className = 'duplicate-group-card glass';
    const countLabel = formatNumberFa(group?.count || (group?.questions ? group.questions.length : 0));
    const questions = Array.isArray(group?.questions) ? group.questions : [];
    const firstQuestion = questions[0]?.question || 'گروه سوال تکراری';

    const itemsHtml = questions.map((question) => {
      const id = typeof question?._id === 'string' ? question._id : '';
      const checked = duplicatesState.selected.has(id) ? 'checked' : '';
      const questionText = escapeHtml(question?.question || 'سوال بدون متن');
      const difficultyMeta = DIFFICULTY_META[question?.difficulty] || DIFFICULTY_META.medium;
      const difficultyLabel = difficultyMeta?.label || '';
      const createdAt = formatDateTime(question?.createdAt);
      const categoryLabel = question?.category ? escapeHtml(question.category) : '';
      return `
        <li>
          <label class="duplicate-item">
            <input type="checkbox" data-duplicate-id="${escapeHtml(id)}" ${checked}>
            <div>
              <div class="duplicate-item-question">${questionText}</div>
              <div class="duplicate-item-meta">
                ${categoryLabel ? `<span class="duplicate-item-chip">${categoryLabel}</span>` : ''}
                ${difficultyLabel ? `<span class="duplicate-item-chip">${escapeHtml(difficultyLabel)}</span>` : ''}
                ${createdAt ? `<span class="duplicate-item-chip">${escapeHtml(createdAt)}</span>` : ''}
              </div>
            </div>
          </label>
        </li>
      `;
    }).join('');

    wrapper.innerHTML = `
      <div class="duplicate-group-header">
        <div>
          <h3 class="duplicate-group-title">${escapeHtml(firstQuestion)}</h3>
          <p class="duplicate-group-subtitle">${formatNumberFa(questions.length)} سوال ثبت شده با متن مشابه</p>
        </div>
        <span class="duplicate-count-badge">${countLabel}</span>
      </div>
      <ul class="duplicate-items">
        ${itemsHtml}
      </ul>
    `;

    fragment.appendChild(wrapper);
  });

  duplicatesGroupsContainer.innerHTML = '';
  duplicatesGroupsContainer.appendChild(fragment);
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
    duplicatesState.groups = Array.isArray(response?.data) ? response.data : [];
    duplicatesState.selected.clear();
    duplicatesState.lastLoadedAt = Date.now();
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
function getToken() { return localStorage.getItem('iq_admin_token'); }
function setToken(t) { localStorage.setItem('iq_admin_token', t); }
function logout() { localStorage.removeItem('iq_admin_token'); location.reload(); }

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
    const err = await res.json().catch(()=>({message:'Request failed'}));
    throw new Error(err.message || 'Request failed');
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

function renderDashboardTopCategories(list = [], { state = 'success', message = '', totalQuestions = 0 } = {}) {
  if (!dashboardTopCategoriesEl) return;
  dashboardTopCategoriesEl.innerHTML = '';
  if (dashboardTopCategoriesTotalEl) {
    dashboardTopCategoriesTotalEl.textContent = totalQuestions > 0
      ? `مجموع سوالات: ${formatNumberFa(totalQuestions)}`
      : 'مجموع سوالات: —';
  }

  if (!Array.isArray(list) || state !== 'success' || list.length === 0) {
    if (dashboardTopCategoriesEmptyEl) {
      dashboardTopCategoriesEmptyEl.textContent = resolveDashboardMessage(state, message, {
        loading: 'در حال دریافت محبوب‌ترین دسته‌ها...',
        empty: 'داده‌ای برای نمایش وجود ندارد'
      });
      dashboardTopCategoriesEmptyEl.classList.remove('hidden');
    }
    return;
  }

  if (dashboardTopCategoriesEmptyEl) {
    dashboardTopCategoriesEmptyEl.classList.add('hidden');
  }

  const fallbackBase = list.reduce((sum, item) => sum + (Number(item?.questionCount) || 0), 0);
  const divisor = totalQuestions > 0 ? totalQuestions : (fallbackBase > 0 ? fallbackBase : 1);

  const fragment = document.createDocumentFragment();
  list.forEach((item) => {
    const name = escapeHtml(item?.name || 'نامشخص');
    const count = Number.isFinite(Number(item?.questionCount)) ? Number(item.questionCount) : 0;
    const percentValue = Math.min(100, Math.max(0, (count / divisor) * 100));
    const percentLabel = `${formatPercentFa(Math.round(percentValue * 10) / 10)}٪`;
    const gradient = CATEGORY_COLOR_GRADIENTS[item?.color] || 'from-slate-500 to-slate-400';

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="flex justify-between mb-1">
        <span>${name}</span>
        <span>${percentLabel}</span>
      </div>
      <div class="w-full h-3 bg-white/10 rounded-full overflow-hidden">
        <div class="h-3 bg-gradient-to-r ${gradient} rounded-full" style="width: ${percentValue.toFixed(1)}%"></div>
      </div>
    `;
    const bar = wrapper.querySelector('.bg-gradient-to-r');
    if (bar) bar.setAttribute('title', `${formatNumberFa(count)} سوال`);
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
  const activity = Array.isArray(data.activity) ? data.activity : [];

  renderDashboardUsersCard(users, 'success');
  renderDashboardCategoriesCard(categories, 'success');
  renderDashboardAdsCard(ads, 'success');
  renderDashboardUsersChart(Array.isArray(users.daily) ? users.daily : [], 'success');
  renderDashboardTopCategories(topCategories, { state: 'success', totalQuestions: Number(data?.questions?.total) || 0 });
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
  const statusRaw = typeof raw.status === 'string' ? raw.status.trim().toLowerCase() : '';
  let normalizedStatus = statusRaw;
  if (!normalizedStatus) {
    normalizedStatus = raw.active === false ? 'inactive' : 'active';
  } else if (!Object.prototype.hasOwnProperty.call(STATUS_META, normalizedStatus)) {
    normalizedStatus = raw.active === false ? 'inactive' : 'active';
  }
  const reviewNotes = typeof raw.reviewNotes === 'string' ? raw.reviewNotes.trim() : '';
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
    duplicateCount: Number.isFinite(Number(raw?.duplicateCount)) ? Number(raw.duplicateCount) : 0,
    reviewNotes
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
  const idKey = normalized?._id ? String(normalized._id) : '';
  if (questionIdEl) questionIdEl.textContent = idKey ? `شناسه: #${idKey.slice(-6)}` : 'شناسه: ---';
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
    questionMetaEl.innerHTML = `
      <span class="meta-chip category" title="دسته‌بندی"><i class="fas fa-layer-group"></i>${categoryNameSafe}</span>
      <span class="${difficultyMeta.class}" title="سطح دشواری"><i class="fas ${difficultyMeta.icon}"></i>${difficultyMeta.label}</span>
      <span class="${sourceMeta.class}" title="منبع"><i class="fas ${sourceMeta.icon}"></i>${sourceMeta.label}</span>
      <span class="meta-chip author" title="سازنده"><i class="fas fa-user-pen"></i>${authorSafe}</span>
      <span class="${statusMeta.class}" title="وضعیت"><span class="status-dot ${statusMeta.dot}"></span>${statusMeta.label}</span>
    `;
  }
  if (questionCreatedEl) questionCreatedEl.textContent = formatDateTime(normalized.createdAt);
  if (questionUpdatedEl) questionUpdatedEl.textContent = formatDateTime(normalized.updatedAt);
  renderQuestionOptions(normalized.options, normalized.correctIdx);
  questionDetailModal.dataset.qId = idKey;
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
  try {
    if (overrides && typeof overrides === 'object') {
      if (Object.prototype.hasOwnProperty.call(overrides, 'category')) {
        questionFilters.category = overrides.category || '';
      }
      if (Object.prototype.hasOwnProperty.call(overrides, 'difficulty')) {
        questionFilters.difficulty = overrides.difficulty || '';
      }
      if (Object.prototype.hasOwnProperty.call(overrides, 'status')) {
        questionFilters.status = overrides.status || '';
      }
      if (Object.prototype.hasOwnProperty.call(overrides, 'search')) {
        questionFilters.search = (overrides.search || '').trim();
      }
      if (Object.prototype.hasOwnProperty.call(overrides, 'sort')) {
        const candidate = typeof overrides.sort === 'string' ? overrides.sort : 'newest';
        questionFilters.sort = ['oldest', 'newest'].includes(candidate) ? candidate : 'newest';
      }
      if (Object.prototype.hasOwnProperty.call(overrides, 'type')) {
        const value = overrides.type;
        if (value === undefined) {
          questionFilters.type = undefined;
        } else if (value === null || value === '') {
          questionFilters.type = null;
        } else {
          questionFilters.type = value;
        }
      }
      if (Object.prototype.hasOwnProperty.call(overrides, 'approvedOnly')) {
        const value = overrides.approvedOnly;
        if (value === undefined) {
          questionFilters.approvedOnly = undefined;
        } else if (value === null) {
          questionFilters.approvedOnly = null;
        } else {
          questionFilters.approvedOnly = Boolean(value);
        }
      }
      if (Object.prototype.hasOwnProperty.call(overrides, 'duplicates')) {
        const value = overrides.duplicates;
        questionFilters.duplicates = value === 'duplicates' ? 'duplicates' : 'all';
      }
    }

    if (questionFilters.status && questionFilters.status !== 'approved') {
      questionFilters.approvedOnly = false;
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
      const shouldCheck = questionFilters.approvedOnly === true;
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
      filterApprovedHelper.textContent = questionFilters.approvedOnly === false
        ? 'سوالات تایید نشده نیز در نتایج نمایش داده می‌شوند.'
        : 'در صورت فعال بودن، فقط سوالات تایید شده نمایش داده خواهند شد.';
    }

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

    const params = new URLSearchParams({ limit: '50' });
    if (questionFilters.category) params.append('category', questionFilters.category);
    if (questionFilters.difficulty) params.append('difficulty', questionFilters.difficulty);
    if (questionFilters.provider) params.append('provider', questionFilters.provider);
    if (questionFilters.status) params.append('status', questionFilters.status);
    if (questionFilters.search) params.append('q', questionFilters.search);
    if (questionFilters.sort) params.append('sort', questionFilters.sort);
    if (questionFilters.type) params.append('type', questionFilters.type);
    if (questionFilters.approvedOnly === false) params.append('includeUnapproved', '1');
    if (questionFilters.duplicates === 'duplicates') params.append('duplicatesOnly', '1');

    const response = await api(`/questions?${params.toString()}`);
    const pendingTotal = Number(response?.meta?.pendingTotal);
    if (pendingCommunityCountEl) {
      const safePending = Number.isFinite(pendingTotal) ? pendingTotal : 0;
      pendingCommunityCountEl.textContent = formatNumberFa(safePending);
    }
    if (viewPendingQuestionsBtn) {
      const safePending = Number.isFinite(pendingTotal) ? pendingTotal : 0;
      const highlight = questionFilters.status === 'pending';
      const shouldDisable = safePending === 0 && !highlight;
      viewPendingQuestionsBtn.disabled = shouldDisable;
      viewPendingQuestionsBtn.classList.toggle('opacity-60', shouldDisable);
      viewPendingQuestionsBtn.classList.toggle('cursor-not-allowed', shouldDisable);
      viewPendingQuestionsBtn.dataset.active = highlight ? 'true' : 'false';
    }
    questionsCache.clear();

    if (!tbody) return;

    if (!Array.isArray(response.data) || response.data.length === 0) {
      const hasFilters = Boolean(
        questionFilters.category
        || questionFilters.difficulty
        || questionFilters.provider
        || questionFilters.status
        || questionFilters.search
        || questionFilters.type
        || questionFilters.approvedOnly === false
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
      return;
    }

    tbody.innerHTML = response.data.map(raw => {
      const item = normalizeQuestion(raw);
      const idKey = item?._id ? String(item._id) : '';
      if (idKey) questionsCache.set(idKey, item);
      const idFragment = escapeHtml(idKey.slice(-6) || '---');
      const idAttr = escapeHtml(idKey);
      const questionText = escapeHtml(item.text || 'بدون متن');
      const categoryName = escapeHtml(item.categoryName || 'بدون دسته‌بندی');
      const difficulty = DIFFICULTY_META[item.difficulty] || DIFFICULTY_META.medium;
      const authorSafe = escapeHtml(item.authorName || 'IQuiz Team');
      const statusKey = item.status || (item.active === false ? 'inactive' : 'active');
      const status = STATUS_META[statusKey] || STATUS_META.active;
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
        <tr class="${rowClasses.join(' ')}" data-question-id="${idAttr}">
          <td data-label="شناسه" class="font-mono text-xs md:text-sm text-white/70">#${idFragment}</td>
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
              <span class="${status.class}" title="وضعیت سوال">
                <span class="status-dot ${status.dot}"></span>${status.label}
              </span>
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
        loadQuestions();
      } catch (err) {
        showToast(err.message,'error');
      }
    };
  } catch (e) {
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
    showToast('مشکل در دریافت سوالات','error');
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
    loadQuestions({ approvedOnly: nextValue });
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

function applyPackageSettings(type, packages) {
  if (!shopSettingsPage || !Array.isArray(packages)) return;
  packages.forEach((pkg) => {
    if (!pkg || !pkg.id) return;
    const row = shopSettingsPage.querySelector(`[data-shop-package="${type}"][data-package-id="${pkg.id}"]`);
    if (!row) return;
    row.querySelectorAll('[data-package-field]').forEach((input) => {
      const field = input.dataset.packageField;
      if (!field) return;
      if (input.type === 'checkbox') {
        input.checked = pkg[field] !== false && !!pkg[field];
      } else if (input.type === 'number') {
        if (pkg[field] != null) input.value = pkg[field];
      } else if (input.tagName === 'SELECT') {
        if (pkg[field] != null) {
          setSelectValue(input, pkg[field]);
        }
      } else if (pkg[field] != null) {
        input.value = pkg[field];
      }
    });
  });
}

function applyVipSettings(plans) {
  if (!shopSettingsPage || !Array.isArray(plans)) return;
  plans.forEach((plan) => {
    if (!plan) return;
    const selector = plan.id
      ? `[data-shop-vip-plan][data-plan-id="${plan.id}"]`
      : plan.tier
        ? `[data-shop-vip-plan][data-plan-tier="${plan.tier}"]`
        : '';
    if (!selector) return;
    const container = shopSettingsPage.querySelector(selector);
    if (!container) return;
    const activeToggle = container.querySelector('[data-shop-vip-active]');
    if (activeToggle) activeToggle.checked = plan.active !== false && !!plan.active;
    const displayEl = container.querySelector('[data-vip-field="displayName"]');
    if (displayEl && plan.displayName != null) displayEl.textContent = plan.displayName;
    const priceInput = container.querySelector('[data-vip-field="price"]');
    if (priceInput && plan.price != null) priceInput.value = plan.price;
    const periodSelect = container.querySelector('[data-vip-field="period"]');
    if (periodSelect && plan.period != null) setSelectValue(periodSelect, plan.period);
    const buttonInput = container.querySelector('[data-vip-field="buttonText"]');
    if (buttonInput && plan.buttonText != null) buttonInput.value = plan.buttonText;
    const benefitsTextarea = container.querySelector('[data-vip-field="benefits"]');
    if (benefitsTextarea) {
      if (Array.isArray(plan.benefits)) {
        benefitsTextarea.value = plan.benefits.join('\n');
      } else if (plan.benefits != null) {
        benefitsTextarea.value = plan.benefits;
      }
    }
  });
}

function applyPromotionsSettings(promotions) {
  if (!shopSettingsPage || !promotions || typeof promotions !== 'object') return;
  const setField = (field, value) => {
    const el = shopSettingsPage.querySelector(`[data-promotions-field="${field}"]`);
    if (!el || value == null) return;
    if (el.type === 'checkbox') {
      el.checked = !!value;
    } else {
      el.value = value;
    }
  };
  setField('defaultDiscount', promotions.defaultDiscount);
  setField('dailyLimit', promotions.dailyLimit);
  setField('startDate', promotions.startDate);
  setField('endDate', promotions.endDate);
  setField('bannerMessage', promotions.bannerMessage);
  if (shopAutoHighlightToggle) shopAutoHighlightToggle.checked = promotions.autoHighlight !== false && !!promotions.autoHighlight;
}

function applyMessagingSettings(messaging) {
  if (!shopSettingsPage || !messaging || typeof messaging !== 'object') return;
  const setField = (field, value) => {
    const el = shopSettingsPage.querySelector(`[data-messaging-field="${field}"]`);
    if (!el || value == null) return;
    el.value = value;
  };
  setField('lowBalance', messaging.lowBalance);
  setField('success', messaging.success);
  setField('supportCta', messaging.supportCta);
  setField('supportLink', messaging.supportLink);
  if (shopShowTutorialToggle) shopShowTutorialToggle.checked = messaging.showTutorial !== false && !!messaging.showTutorial;
}

function applySectionsState(sections) {
  if (!sections || typeof sections !== 'object') return;
  if (shopHeroToggle && sections.hero != null) shopHeroToggle.checked = !!sections.hero;
  if (shopKeysToggle && sections.keys != null) shopKeysToggle.checked = !!sections.keys;
  if (shopWalletToggle && sections.wallet != null) shopWalletToggle.checked = !!sections.wallet;
  if (shopVipToggle && sections.vip != null) shopVipToggle.checked = !!sections.vip;
  if (shopPromotionsToggle && sections.promotions != null) shopPromotionsToggle.checked = !!sections.promotions;
}

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
  if (shopPricingCurrencySelect && shop.currency != null) setSelectValue(shopPricingCurrencySelect, shop.currency);
  if (shopLowBalanceThresholdInput && shop.lowBalanceThreshold != null) shopLowBalanceThresholdInput.value = shop.lowBalanceThreshold;
  if (shopQuickTopupToggle) shopQuickTopupToggle.checked = !!shop.quickTopup;
  if (shopQuickPurchaseToggle) shopQuickPurchaseToggle.checked = !!shop.quickPurchase;
  if (shopDynamicPricingToggle) shopDynamicPricingToggle.checked = !!shop.dynamicPricing;

  if (shop.hero && typeof shop.hero === 'object') {
    const hero = shop.hero;
    if (shopHeroTitleInput && hero.title != null) shopHeroTitleInput.value = hero.title;
    if (shopHeroSubtitleInput && hero.subtitle != null) shopHeroSubtitleInput.value = hero.subtitle;
    if (shopHeroCtaInput && hero.ctaText != null) shopHeroCtaInput.value = hero.ctaText;
    if (shopHeroLinkInput && hero.ctaLink != null) shopHeroLinkInput.value = hero.ctaLink;
    if (shopHeroThemeSelect && hero.theme != null) setSelectValue(shopHeroThemeSelect, hero.theme);
    if (shopHeroNoteInput && hero.note != null) shopHeroNoteInput.value = hero.note;
    if (shopShowBalancesToggle) shopShowBalancesToggle.checked = hero.showBalances !== false && !!hero.showBalances;
    if (shopShowTagsToggle) shopShowTagsToggle.checked = hero.showTags !== false && !!hero.showTags;
  }

  applySectionsState(shop.sections);
  applyPackageSettings('keys', (shop.packages && shop.packages.keys) || shop.keys);
  applyPackageSettings('wallet', (shop.packages && shop.packages.wallet) || shop.wallet);
  applyVipSettings(shop.vip);
  applyPromotionsSettings(shop.promotions);
  applyMessagingSettings(shop.messaging);

  if (shopBoundInputs && shopBoundInputs.length) {
    shopBoundInputs.forEach((input) => updateBoundTargets(input));
  }
  if (typeof updateHeroTheme === 'function') updateHeroTheme();
  if (typeof updateHeroLink === 'function') updateHeroLink();
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

function collectPackageRows(type) {
  if (!shopSettingsPage) return [];
  return Array.from(shopSettingsPage.querySelectorAll(`[data-shop-package="${type}"]`)).map((row) => {
    const pkg = {};
    const defaultId = safeString(row.dataset.packageId || '', '');
    row.querySelectorAll('[data-package-field]').forEach((input) => {
      const field = input.dataset.packageField;
      if (!field) return;
      if (input.type === 'checkbox') {
        pkg[field] = !!input.checked;
      } else if (input.type === 'number') {
        pkg[field] = safeNumber(input.value, 0);
      } else if (input.tagName === 'SELECT') {
        pkg[field] = safeString(input.value, '');
      } else {
        pkg[field] = safeString(input.value, '');
      }
    });
    pkg.id = safeString(pkg.id != null ? pkg.id : defaultId, defaultId);
    if (!pkg.id) return null;
    pkg.displayName = safeString(pkg.displayName != null ? pkg.displayName : '', '');
    return pkg;
  }).filter(Boolean);
}

function collectVipPlansSnapshot() {
  if (!shopSettingsPage) return [];
  return Array.from(shopSettingsPage.querySelectorAll('[data-shop-vip-plan]')).map((container) => {
    const id = safeString(container.dataset.planId || container.dataset.planTier || '', '');
    if (!id) return null;
    const tier = safeString(container.dataset.planTier || container.dataset.planId || '', '');
    const plan = {
      id,
      tier,
      active: getCheckboxValue(container.querySelector('[data-shop-vip-active]'), true),
      displayName: safeString((container.querySelector('[data-vip-field="displayName"]') || {}).textContent || '', ''),
      price: safeNumber((container.querySelector('[data-vip-field="price"]') || {}).value, 0),
      period: safeString((container.querySelector('[data-vip-field="period"]') || {}).value, ''),
      buttonText: safeString((container.querySelector('[data-vip-field="buttonText"]') || {}).value, ''),
      benefits: []
    };
    const benefitsTextarea = container.querySelector('[data-vip-field="benefits"]');
    if (benefitsTextarea) {
      plan.benefits = benefitsTextarea.value
        .split(/\r?\n/)
        .map((line) => safeString(line, ''))
        .filter((line) => line.length > 0);
    }
    return plan;
  }).filter(Boolean);
}

function collectPromotionsSnapshot() {
  const promotions = {
    defaultDiscount: safeNumber((shopSettingsPage?.querySelector('[data-promotions-field="defaultDiscount"]') || {}).value, 0),
    dailyLimit: safeNumber((shopSettingsPage?.querySelector('[data-promotions-field="dailyLimit"]') || {}).value, 0),
    startDate: safeString((shopSettingsPage?.querySelector('[data-promotions-field="startDate"]') || {}).value, ''),
    endDate: safeString((shopSettingsPage?.querySelector('[data-promotions-field="endDate"]') || {}).value, ''),
    bannerMessage: safeString((shopSettingsPage?.querySelector('[data-promotions-field="bannerMessage"]') || {}).value, ''),
    autoHighlight: getCheckboxValue(shopAutoHighlightToggle, true)
  };
  return promotions;
}

function collectMessagingSnapshot() {
  return {
    lowBalance: safeString((shopSettingsPage?.querySelector('[data-messaging-field="lowBalance"]') || {}).value, ''),
    success: safeString((shopSettingsPage?.querySelector('[data-messaging-field="success"]') || {}).value, ''),
    supportCta: safeString((shopSettingsPage?.querySelector('[data-messaging-field="supportCta"]') || {}).value, ''),
    supportLink: safeString((shopSettingsPage?.querySelector('[data-messaging-field="supportLink"]') || {}).value, ''),
    showTutorial: getCheckboxValue(shopShowTutorialToggle, true)
  };
}

function collectShopSettingsSnapshot() {
  return {
    enabled: getCheckboxValue(shopGlobalToggle, true),
    currency: safeString(shopPricingCurrencySelect ? shopPricingCurrencySelect.value : 'coin', 'coin') || 'coin',
    lowBalanceThreshold: safeNumber(shopLowBalanceThresholdInput ? shopLowBalanceThresholdInput.value : 0, 0),
    quickTopup: getCheckboxValue(shopQuickTopupToggle),
    quickPurchase: getCheckboxValue(shopQuickPurchaseToggle),
    dynamicPricing: getCheckboxValue(shopDynamicPricingToggle),
    hero: {
      title: safeString(shopHeroTitleInput ? shopHeroTitleInput.value : '', ''),
      subtitle: safeString(shopHeroSubtitleInput ? shopHeroSubtitleInput.value : '', ''),
      ctaText: safeString(shopHeroCtaInput ? shopHeroCtaInput.value : '', ''),
      ctaLink: safeString(shopHeroLinkInput ? shopHeroLinkInput.value : '', ''),
      theme: safeString(shopHeroThemeSelect ? shopHeroThemeSelect.value : 'sky', 'sky') || 'sky',
      note: safeString(shopHeroNoteInput ? shopHeroNoteInput.value : '', ''),
      showBalances: getCheckboxValue(shopShowBalancesToggle, true),
      showTags: getCheckboxValue(shopShowTagsToggle, true)
    },
    sections: {
      hero: getCheckboxValue(shopHeroToggle, true),
      keys: getCheckboxValue(shopKeysToggle, true),
      wallet: getCheckboxValue(shopWalletToggle, true),
      vip: getCheckboxValue(shopVipToggle, true),
      promotions: getCheckboxValue(shopPromotionsToggle, true)
    },
    packages: {
      keys: collectPackageRows('keys'),
      wallet: collectPackageRows('wallet')
    },
    vip: collectVipPlansSnapshot(),
    promotions: collectPromotionsSnapshot(),
    messaging: collectMessagingSnapshot()
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
    updateShopMetrics();
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
const shopToggleDisableMap = new WeakMap();
const shopToggleVisibilityMap = new WeakMap();
const shopState = {
  enabled: shopGlobalToggle ? shopGlobalToggle.checked : true,
  initialized: false,
  lastUpdated: null,
  metrics: {
    activeSections: { total: shopSectionToggles.length, active: 0 },
    packages: { total: shopPackageToggles.length, active: 0 },
    vipPlans: { total: shopVipToggles.length, active: 0 }
  }
};

function parseSelectorList(selectors) {
  if (typeof selectors !== 'string') return [];
  return selectors.split(',').map((item) => item.trim()).filter(Boolean);
}

function getToggleTargets(toggle) {
  if (!toggle || !toggle.dataset) return [];
  if (!toggle.__shopToggleTargets) {
    const selectors = parseSelectorList(toggle.dataset.toggleTarget || '');
    toggle.__shopToggleTargets = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
  }
  return toggle.__shopToggleTargets;
}

function updateDisableBehavior(target, toggle, isChecked) {
  if (!target) return;
  if (!shopToggleDisableMap.has(target)) {
    shopToggleDisableMap.set(target, new Set());
  }
  const toggles = shopToggleDisableMap.get(target);
  if (isChecked) {
    toggles.delete(toggle);
  } else {
    toggles.add(toggle);
  }

  const shouldDisable = toggles.size > 0;
  if (target.matches('input, select, textarea, button')) {
    if (!target.dataset.toggleOriginalDisabled) {
      target.dataset.toggleOriginalDisabled = target.disabled ? 'true' : 'false';
    }
    const originalDisabled = target.dataset.toggleOriginalDisabled === 'true';
    target.disabled = shouldDisable || originalDisabled;
  } else {
    const controls = target.querySelectorAll('input, select, textarea, button');
    controls.forEach((control) => {
      if (!control.dataset.toggleOriginalDisabled) {
        control.dataset.toggleOriginalDisabled = control.disabled ? 'true' : 'false';
      }
      const originalDisabled = control.dataset.toggleOriginalDisabled === 'true';
      control.disabled = shouldDisable || originalDisabled;
    });
  }

  if (!target.hasAttribute('data-shop-lockable')) {
    target.classList.toggle('settings-section-disabled', shouldDisable);
  }
  if (shouldDisable) {
    target.setAttribute('aria-disabled', 'true');
  } else if (!shopToggleDisableMap.get(target)?.size) {
    target.removeAttribute('aria-disabled');
  }
}

function updateVisibilityBehavior(target, toggle, isChecked) {
  if (!target) return;
  if (!shopToggleVisibilityMap.has(target)) {
    shopToggleVisibilityMap.set(target, new Set());
  }
  const toggles = shopToggleVisibilityMap.get(target);
  if (isChecked) {
    toggles.delete(toggle);
  } else {
    toggles.add(toggle);
  }
  const hidden = toggles.size > 0;
  target.classList.toggle('hidden', hidden);
  target.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

function applyToggleTargets(toggle, isChecked) {
  if (!toggle) return;
  const behavior = toggle.dataset.toggleBehavior || 'disable';
  const targets = getToggleTargets(toggle);
  targets.forEach((target) => {
    if (behavior === 'visibility') {
      updateVisibilityBehavior(target, toggle, isChecked);
    } else {
      updateDisableBehavior(target, toggle, isChecked);
    }
  });
}

function updateToggleTexts(toggle, isChecked) {
  if (!toggle) return;
  const label = toggle.closest('label');
  if (label) {
    const labelText = label.querySelector('[data-toggle-text]');
    if (labelText) {
      if (!labelText.dataset.toggleOnText) {
        labelText.dataset.toggleOnText = toggle.dataset.toggleOn || labelText.textContent || 'روشن';
      }
      if (!labelText.dataset.toggleOffText) {
        labelText.dataset.toggleOffText = toggle.dataset.toggleOff || labelText.textContent || 'خاموش';
      }
      labelText.textContent = isChecked ? labelText.dataset.toggleOnText : labelText.dataset.toggleOffText;
    }
  }

  const labelTargets = parseSelectorList(toggle.dataset.toggleLabelTarget || '');
  labelTargets.forEach((selector) => {
    document.querySelectorAll(selector).forEach((target) => {
      if (!target) return;
      if (!target.dataset.toggleOriginalText) {
        target.dataset.toggleOriginalText = target.textContent.trim();
      }
      if (!target.dataset.toggleOnText && toggle.dataset.toggleOn) {
        target.dataset.toggleOnText = toggle.dataset.toggleOn;
      }
      if (!target.dataset.toggleOffText && toggle.dataset.toggleOff) {
        target.dataset.toggleOffText = toggle.dataset.toggleOff;
      }
      const onText = target.dataset.toggleOnText || target.dataset.toggleOriginalText;
      const offText = target.dataset.toggleOffText || target.dataset.toggleOriginalText;
      target.textContent = isChecked ? onText : offText;
    });
  });
}

function getSectionToggleForElement(element) {
  if (!element) return null;
  const section = element.closest('[data-shop-lockable]');
  if (!section) return null;
  return section.querySelector('[data-shop-section-toggle]');
}

function isShopFeatureActive(element) {
  if (!shopState.enabled) return false;
  const sectionToggle = getSectionToggleForElement(element);
  if (sectionToggle && !sectionToggle.checked) return false;
  return true;
}

function updateSectionVisualState() {
  if (!shopLockableSections.length) return;
  shopLockableSections.forEach((section) => {
    const sectionToggle = section.querySelector('[data-shop-section-toggle]');
    const sectionActive = shopState.enabled && (!sectionToggle || sectionToggle.checked);
    section.classList.toggle('settings-section-disabled', !sectionActive);
    section.setAttribute('aria-disabled', sectionActive ? 'false' : 'true');
  });
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
    if (!shopStatusLabel.dataset.toggleOriginalText) {
      shopStatusLabel.dataset.toggleOriginalText = shopStatusLabel.textContent.trim();
    }
    shopStatusLabel.textContent = isEnabled ? 'فروشگاه فعال است' : 'فروشگاه غیرفعال است';
  }
}

function formatRatio(active, total) {
  if (!Number.isFinite(total) || total <= 0) {
    return formatNumberFa(active);
  }
  return `${formatNumberFa(active)} / ${formatNumberFa(total)}`;
}

function isSectionEnabled(toggle) {
  if (!shopState.enabled) return false;
  if (!toggle) return true;
  return toggle.checked;
}

function updateShopMetrics() {
  const sectionsTotal = shopSectionToggles.length;
  const sectionsActive = shopState.enabled
    ? shopSectionToggles.filter((toggle) => toggle.checked).length
    : 0;
  shopState.metrics.activeSections = { total: sectionsTotal, active: sectionsActive };
  if (shopMetricElements.activeSections) {
    shopMetricElements.activeSections.textContent = formatRatio(sectionsActive, sectionsTotal);
  }

  const packagesTotal = shopPackageToggles.length;
  const packagesActive = shopState.enabled
    ? shopPackageToggles.filter((toggle) => toggle.checked && isShopFeatureActive(toggle)).length
    : 0;
  shopState.metrics.packages = { total: packagesTotal, active: packagesActive };
  if (shopMetricElements.packages) {
    shopMetricElements.packages.textContent = formatRatio(packagesActive, packagesTotal);
  }

  const vipTotal = shopVipToggles.length;
  const vipActive = shopState.enabled && isSectionEnabled(shopVipToggle)
    ? shopVipToggles.filter((toggle) => toggle.checked).length
    : 0;
  shopState.metrics.vipPlans = { total: vipTotal, active: vipActive };
  if (shopMetricElements.vipPlans) {
    shopMetricElements.vipPlans.textContent = formatRatio(vipActive, vipTotal);
  }
}

function updateHeroTheme() {
  if (!shopHeroPreview || !shopHeroThemeSelect) return;
  const theme = shopHeroThemeSelect.value || 'sky';
  shopHeroPreview.dataset.theme = theme;
}

function updateHeroLink() {
  if (!shopPreviewCta) return;
  const linkValue = shopHeroLinkInput ? shopHeroLinkInput.value.trim() : '';
  shopPreviewCta.setAttribute('href', linkValue || '#');
}

function updateBoundTargets(input) {
  if (!input) return;
  const selectors = parseSelectorList(input.dataset.bindTarget || '');
  const value = typeof input.value === 'string' ? input.value : String(input.value ?? '');
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((target) => {
      if (!target) return;
      if (!target.dataset.shopBindFallback) {
        target.dataset.shopBindFallback = target.textContent;
      }
      const trimmed = value.trim();
      if (target.id === 'shop-preview-note') {
        const fallback = target.dataset.shopBindFallback || '';
        if (trimmed) {
          target.textContent = trimmed;
          target.classList.remove('hidden', 'opacity-50');
          target.setAttribute('aria-hidden', 'false');
        } else {
          target.textContent = fallback;
          target.classList.add('hidden');
          target.classList.add('opacity-50');
          target.setAttribute('aria-hidden', 'true');
        }
      } else {
        const placeholder = target.dataset.shopBindPlaceholder || '—';
        target.textContent = trimmed || placeholder;
        target.classList.toggle('opacity-50', trimmed.length === 0);
      }
    });
  });
}

function markShopUpdated() {
  if (!shopLastUpdateEl) return;
  const now = new Date();
  shopState.lastUpdated = now;
  try {
    const formatter = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const timeText = formatter.format(now);
    shopLastUpdateEl.textContent = `لحظاتی پیش (${timeText})`;
  } catch (error) {
    shopLastUpdateEl.textContent = 'لحظاتی پیش';
  }
}

function initializeShopToggle(toggle) {
  if (!toggle) return;
  const isChecked = toggle.checked;
  toggle.dataset.toggleAppliedState = isChecked ? 'on' : 'off';
  applyToggleTargets(toggle, isChecked);
  updateToggleTexts(toggle, isChecked);
}

function handleShopToggleChange(toggle) {
  if (!toggle) return;
  const isChecked = toggle.checked;
  const previousState = toggle.dataset.toggleAppliedState === 'on';
  if (previousState === isChecked && shopState.initialized) {
    updateToggleTexts(toggle, isChecked);
    return;
  }
  toggle.dataset.toggleAppliedState = isChecked ? 'on' : 'off';
  applyToggleTargets(toggle, isChecked);
  updateToggleTexts(toggle, isChecked);

  if (toggle === shopGlobalToggle) {
    shopState.enabled = isChecked;
    updateShopStatus(isChecked);
  }

  updateSectionVisualState();
  updateShopMetrics();

  if (shopState.initialized) {
    markShopUpdated();
  }
}

function handleShopInputEvent(event) {
  const target = event.target;
  if (!target || !shopState.initialized) return;
  if (target.matches('input[type="checkbox"], input[type="radio"]')) return;
  if (target.hasAttribute('data-bind-target')) return;
  markShopUpdated();
}

function setupShopControls() {
  if (!shopSettingsPage) return;

  const toggles = Array.from(shopSettingsPage.querySelectorAll('input[type="checkbox"]'));
  toggles.forEach((toggle) => {
    initializeShopToggle(toggle);
    toggle.addEventListener('change', () => handleShopToggleChange(toggle));
  });

  shopBoundInputs.forEach((input) => {
    updateBoundTargets(input);
    input.addEventListener('input', (event) => {
      updateBoundTargets(event.target);
      if (shopState.initialized) {
        markShopUpdated();
      }
    });
  });

  if (shopHeroThemeSelect) {
    updateHeroTheme();
    shopHeroThemeSelect.addEventListener('change', () => {
      updateHeroTheme();
      if (shopState.initialized) {
        markShopUpdated();
      }
    });
  }

  if (shopHeroLinkInput) {
    updateHeroLink();
    shopHeroLinkInput.addEventListener('input', () => {
      updateHeroLink();
      if (shopState.initialized) {
        markShopUpdated();
      }
    });
  }

  shopSettingsPage.addEventListener('input', handleShopInputEvent);
  shopSettingsPage.addEventListener('change', (event) => {
    const target = event.target;
    if (!target || !shopState.initialized) return;
    if (target.matches('select') && target !== shopHeroThemeSelect) {
      markShopUpdated();
    }
  });

  updateShopStatus(shopState.enabled);
  updateSectionVisualState();
  updateShopMetrics();

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

