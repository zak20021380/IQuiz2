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
  opentdb: { label: 'OpenTDB', class: 'meta-chip source-opentdb', icon: 'fa-database' },
  'the-trivia-api': { label: 'The Trivia API', class: 'meta-chip source-triviaapi', icon: 'fa-globe' },
  cluebase: { label: 'Cluebase (Jeopardy)', class: 'meta-chip source-cluebase', icon: 'fa-layer-group' },
  jservice: { label: 'JService (قدیمی)', class: 'meta-chip source-jservice', icon: 'fa-layer-group' },
  community: { label: 'سازنده‌ها', class: 'meta-chip source-community', icon: 'fa-users-gear' }
};

const TRIVIA_PROVIDER_ICONS = {
  opentdb: 'fa-database',
  'the-trivia-api': 'fa-globe',
  cluebase: 'fa-layer-group',
  jservice: 'fa-layer-group'
};

const TRIVIA_PROVIDER_ID_ALIASES = {
  opentdb: 'opentdb',
  'open-trivia-db': 'opentdb',
  'open_trivia_db': 'opentdb',
  'open trivia db': 'opentdb',
  'open trivia database': 'opentdb',
  'the-trivia-api': 'the-trivia-api',
  triviaapi: 'the-trivia-api',
  'thetriviaapi': 'the-trivia-api',
  'the trivia api': 'the-trivia-api',
  'the-triviaapi': 'the-trivia-api',
  'the trivia-api': 'the-trivia-api'
};

function normalizeProviderId(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

function resolveProviderId(value) {
  const normalized = normalizeProviderId(value);
  if (!normalized) return '';
  return TRIVIA_PROVIDER_ID_ALIASES[normalized] || normalized;
}

const DEFAULT_TRIVIA_PROVIDERS = [
  {
    id: 'opentdb',
    name: 'Open Trivia Database',
    shortName: 'OpenTDB',
    description: 'بانک سوالات عمومی با دسته‌بندی‌های متنوع و امکان تفکیک سطح دشواری.',
    capabilities: {
      amount: { min: 1, max: 200, default: 20 },
      categories: { selectable: true, remote: true },
      difficulties: { selectable: true, multiple: true }
    }
  },
  {
    id: 'the-trivia-api',
    name: 'The Trivia API',
    shortName: 'The Trivia API',
    description: 'مجموعه‌ای از سوالات انگلیسی با به‌روزرسانی سریع و تنوع گسترده.',
    capabilities: {
      amount: { min: 1, max: 50, default: 20 },
      categories: { selectable: false, remote: false },
      difficulties: { selectable: true, multiple: true }
    }
  }
];

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
const filterProviderSelect = $('#filter-provider');
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
const triviaAmountRange = $('#trivia-amount-range');
const triviaAmountInput = $('#trivia-amount-input');
const triviaDifficultyOptions = $('#trivia-difficulty-options');
const triviaCategoryListEl = $('#trivia-category-list');
const triviaCategorySearchInput = $('#trivia-category-search');
const triviaImportBtn = $('#trivia-import-btn');
const triviaRefreshBtn = $('#trivia-refresh-categories');
const triviaSelectionSummaryEl = $('#trivia-selection-summary');
const triviaImportStatusEl = $('#trivia-import-status');
const triviaImportResultEl = $('#trivia-import-result');
const triviaProviderOptionsEl = $('#trivia-provider-options');
const triviaProviderInfoEl = $('#trivia-provider-info');
const triviaCategoryCard = $('#trivia-category-card');
const triviaCategoryTitleEl = $('#trivia-category-title');
const triviaCategoryDescriptionEl = $('#trivia-category-description');
const triviaAmountHelperEl = $('#trivia-amount-helper');
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

const shopSettingsPage = $('#page-shop-settings');
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

const questionFilters = {
  category: '',
  difficulty: '',
  provider: '',
  status: '',
  search: '',
  sort: 'newest',
  type: undefined,
  approvedOnly: undefined
};

function initializeProviderFilterOptions() {
  if (!filterProviderSelect) return;

  const getProviderLabel = (id, fallback) => {
    const normalized = resolveProviderId(id) || id;
    const providers = Array.isArray(triviaControlState.providers) ? triviaControlState.providers : [];
    const dynamic = providers.find((provider) => {
      const providerId = resolveProviderId(provider?.id ?? provider?.provider ?? provider?.providerId);
      return providerId === normalized;
    });
    const defaults = DEFAULT_TRIVIA_PROVIDERS.find((provider) => provider.id === normalized);
    return dynamic?.shortName || dynamic?.name || defaults?.shortName || defaults?.name || fallback || normalized;
  };

  const options = [
    { value: '', label: 'همه منابع' },
    { value: 'opentdb', label: getProviderLabel('opentdb', 'OpenTDB') },
    { value: 'the-trivia-api', label: getProviderLabel('the-trivia-api', 'The Trivia API') },
    { value: 'manual', label: SOURCE_META.manual?.label || 'ایجاد دستی' },
    { value: 'community', label: SOURCE_META.community?.label || 'سازنده‌ها' }
  ];

  const seen = new Set();
  filterProviderSelect.innerHTML = options
    .filter((option) => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    })
    .map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`)
    .join('');

  const initial = questionFilters.provider || '';
  if (filterProviderSelect.value !== initial) {
    filterProviderSelect.value = initial;
  }
}

const TRIVIA_DIFFICULTY_LABELS = {
  easy: 'آسون',
  medium: 'متوسط',
  hard: 'سخت'
};

const triviaControlState = {
  provider: DEFAULT_TRIVIA_PROVIDERS[0].id,
  providerRaw: DEFAULT_TRIVIA_PROVIDERS[0].id,
  providers: DEFAULT_TRIVIA_PROVIDERS.map((item) => ({
    ...item,
    capabilities: { ...(item.capabilities || {}) }
  })),
  amount: DEFAULT_TRIVIA_PROVIDERS[0].capabilities.amount.default,
  loadingCategories: false,
  importing: false,
  search: '',
  availableCategories: [],
  selectedCategories: new Set(),
  selectedDifficulties: new Set(['easy', 'medium']),
  lastResult: null
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

function sanitizeProviderList(list) {
  const fallbackMap = new Map(DEFAULT_TRIVIA_PROVIDERS.map((provider) => [provider.id, provider]));
  const normalizedMap = new Map();

  if (Array.isArray(list)) {
    list.forEach((provider) => {
      const rawId = provider?.id ?? provider?.provider ?? provider?.providerId;
      const id = resolveProviderId(rawId);
      if (!id) return;
      const fallback = fallbackMap.get(id);
      if (!fallback) return;
      const baseName = provider?.name || fallback?.name || id;
      const shortName = provider?.shortName || fallback?.shortName || baseName;
      const description = provider?.description || fallback?.description || '';
      const capabilities = {
        ...(fallback?.capabilities || {}),
        ...(provider?.capabilities || {})
      };
      normalizedMap.set(id, { id, name: baseName, shortName, description, capabilities });
    });
  }

  DEFAULT_TRIVIA_PROVIDERS.forEach((provider) => {
    const existing = normalizedMap.get(provider.id);
    if (existing) {
      normalizedMap.set(provider.id, {
        id: provider.id,
        name: existing.name || provider.name,
        shortName: existing.shortName || provider.shortName,
        description: existing.description || provider.description,
        capabilities: {
          ...(provider.capabilities || {}),
          ...(existing.capabilities || {})
        }
      });
      return;
    }

    normalizedMap.set(provider.id, {
      id: provider.id,
      name: provider.name,
      shortName: provider.shortName,
      description: provider.description,
      capabilities: { ...(provider.capabilities || {}) }
    });
  });

  if (normalizedMap.size === 0) {
    return DEFAULT_TRIVIA_PROVIDERS.map((provider) => ({
      ...provider,
      capabilities: { ...(provider.capabilities || {}) }
    }));
  }

  const ordered = [];
  DEFAULT_TRIVIA_PROVIDERS.forEach((provider) => {
    const entry = normalizedMap.get(provider.id);
    if (entry) {
      ordered.push({
        ...entry,
        capabilities: { ...(entry.capabilities || {}) }
      });
      normalizedMap.delete(provider.id);
    }
  });

  normalizedMap.forEach((provider) => {
    ordered.push({
      ...provider,
      capabilities: { ...(provider.capabilities || {}) }
    });
  });

  return ordered;
}

function sanitizeCategoryList(list) {
  if (!Array.isArray(list)) return [];
  return list
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
      return {
        ...category,
        _id: String(category._id),
        name: String(category.name),
        displayName: category.displayName ? String(category.displayName) : '',
        provider: category.provider ? String(category.provider) : 'manual',
        providerCategoryId: category.providerCategoryId ? String(category.providerCategoryId) : '',
        aliases,
        status: category.status || 'active',
        questionCount: totalQuestions,
        activeQuestionCount: activeQuestions,
        inactiveQuestionCount: inactiveQuestions
      };
    })
    .filter(Boolean);
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
      <button type="button" class="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all duration-300" data-action="delete-category" data-category-id="${category?._id || ''}">
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

  if (categoriesLoading) {
    if (!hasCategories) {
      categoriesGridEl.innerHTML = '';
      categoriesGridEl.classList.add('hidden');
    }
    if (categoriesEmptyEl) categoriesEmptyEl.classList.add('hidden');
    if (categoriesEmptyActionBtn) {
      categoriesEmptyActionBtn.disabled = !isAuthenticated;
      categoriesEmptyActionBtn.classList.toggle('opacity-50', !isAuthenticated);
      categoriesEmptyActionBtn.classList.toggle('cursor-not-allowed', !isAuthenticated);
    }
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
        categoriesEmptyDescriptionEl.textContent = isAuthenticated
          ? 'برای شروع، نخستین دسته‌بندی واقعی خود را بسازید تا بانک سوالات ساختارمند شود.'
          : 'برای مشاهده و مدیریت دسته‌بندی‌ها باید وارد حساب مدیریتی شوید.';
      }
    }
    if (categoriesEmptyActionBtn) {
      categoriesEmptyActionBtn.disabled = !isAuthenticated;
      categoriesEmptyActionBtn.classList.toggle('opacity-50', !isAuthenticated);
      categoriesEmptyActionBtn.classList.toggle('cursor-not-allowed', !isAuthenticated);
    }
    return;
  }

  categoriesGridEl.classList.remove('hidden');
  if (categoriesEmptyEl) categoriesEmptyEl.classList.add('hidden');
  if (categoriesEmptyActionBtn) {
    categoriesEmptyActionBtn.disabled = false;
    categoriesEmptyActionBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }

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
  if (saveCategoryBtn) {
    saveCategoryBtn.disabled = false;
    saveCategoryBtn.classList.remove('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
    saveCategoryBtn.textContent = CATEGORY_MODAL_LABELS.create;
  }
}

function openCategoryModal(mode = 'create', category = null) {
  if (!categoryModal) return;
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

function getProvidersList() {
  const providers = Array.isArray(triviaControlState.providers)
    ? triviaControlState.providers
    : [];
  if (providers.length === 0) {
    triviaControlState.providers = sanitizeProviderList([]);
    return triviaControlState.providers;
  }
  return providers;
}

function findProviderById(id) {
  const normalized = resolveProviderId(id);
  if (!normalized) return null;
  return getProvidersList().find((provider) => provider.id === normalized) || null;
}

function getActiveProvider() {
  return findProviderById(triviaControlState.provider) || getProvidersList()[0];
}

function getActiveProviderCapabilities() {
  const provider = getActiveProvider();
  return provider?.capabilities || {};
}

function providerSupportsCategorySelection() {
  const capabilities = getActiveProviderCapabilities();
  return Boolean(capabilities?.categories?.selectable);
}

function providerSupportsCategoryFetch() {
  const capabilities = getActiveProviderCapabilities();
  return Boolean(capabilities?.categories?.remote);
}

function providerSupportsDifficultySelection() {
  const capabilities = getActiveProviderCapabilities();
  if (!capabilities?.difficulties) return true;
  return capabilities.difficulties.selectable !== false;
}

function providerAllowsMultipleDifficulties() {
  const capabilities = getActiveProviderCapabilities();
  if (!capabilities?.difficulties) return true;
  return capabilities.difficulties.multiple !== false;
}

function getProviderAmountConfig() {
  const capabilities = getActiveProviderCapabilities();
  const config = capabilities?.amount || {};
  const min = Number.isFinite(config.min) ? config.min : 1;
  const max = Number.isFinite(config.max) ? config.max : 200;
  const fallbackDefault = Number.isFinite(config.default) ? config.default : Math.min(20, max);
  const normalizedDefault = Math.min(Math.max(fallbackDefault, min), max);
  return { min, max, default: normalizedDefault };
}

function getProviderIcon(providerId) {
  const normalized = resolveProviderId(providerId);
  return TRIVIA_PROVIDER_ICONS[normalized] || 'fa-database';
}

function formatProviderLabel(provider) {
  if (!provider) return 'منبع انتخابی';
  return provider.shortName || provider.name || provider.id;
}

function updateProviderInfoDisplay(provider = getActiveProvider()) {
  if (!triviaProviderInfoEl) return;
  const label = formatProviderLabel(provider);
  const description = provider?.description ? escapeHtml(provider.description) : '---';
  const baseContent = `<span class="font-semibold text-white">${escapeHtml(label)}</span> – ${description}`;
  triviaProviderInfoEl.innerHTML = baseContent;
}

function updateCategoryCardContent(provider = getActiveProvider()) {
  if (!triviaCategoryTitleEl || !triviaCategoryDescriptionEl) return;
  const label = formatProviderLabel(provider);
  if (!providerSupportsCategorySelection()) {
    triviaCategoryTitleEl.textContent = `دسته‌بندی در ${label}`;
    triviaCategoryDescriptionEl.textContent = 'این منبع از محدودسازی بر اساس دسته‌بندی پشتیبانی نمی‌کند و تمام سوالات به صورت عمومی دریافت می‌شوند.';
  } else if (!providerSupportsCategoryFetch()) {
    triviaCategoryTitleEl.textContent = `دسته‌بندی‌های ${label}`;
    triviaCategoryDescriptionEl.textContent = 'این منبع دسته‌بندی‌ها را از طریق API ارائه نمی‌دهد؛ سوالات به صورت عمومی یا بر اساس دشواری انتخاب می‌شوند.';
  } else {
    triviaCategoryTitleEl.textContent = `انتخاب دسته‌بندی‌های ${label}`;
    triviaCategoryDescriptionEl.textContent = 'حداکثر دسته‌های مورد نیاز خود را انتخاب کنید؛ در صورت عدم انتخاب، سوالات عمومی دریافت می‌شود.';
  }

  if (triviaCategorySearchInput) {
    if (providerSupportsCategorySelection() && providerSupportsCategoryFetch()) {
      triviaCategorySearchInput.placeholder = `جستجوی دسته‌بندی ${label}...`;
    } else {
      triviaCategorySearchInput.placeholder = 'جستجوی دسته‌بندی در این منبع فعال نیست';
    }
    if (!providerSupportsCategorySelection() || !providerSupportsCategoryFetch()) {
      triviaControlState.search = '';
      triviaCategorySearchInput.value = '';
    } else if (triviaCategorySearchInput.value !== triviaControlState.search) {
      triviaCategorySearchInput.value = triviaControlState.search || '';
    }
  }

  if (triviaCategoryCard) {
    triviaCategoryCard.classList.toggle('opacity-60', !providerSupportsCategorySelection());
  }
}

function applyAmountConstraints() {
  const { min, max, default: defaultAmount } = getProviderAmountConfig();
  if (triviaAmountRange) {
    triviaAmountRange.min = String(min);
    triviaAmountRange.max = String(max);
  }
  if (triviaAmountInput) {
    triviaAmountInput.min = String(min);
    triviaAmountInput.max = String(max);
  }

  if (triviaControlState.amount < min || triviaControlState.amount > max) {
    triviaControlState.amount = defaultAmount;
  }

  const clamped = clampTriviaAmount(triviaControlState.amount);
  triviaControlState.amount = clamped;
  if (triviaAmountInput && Number(triviaAmountInput.value) !== clamped) {
    triviaAmountInput.value = String(clamped);
  }
  if (triviaAmountRange && Number(triviaAmountRange.value) !== clamped) {
    triviaAmountRange.value = String(clamped);
  }

  if (triviaAmountHelperEl) {
    const providerLabel = formatProviderLabel(getActiveProvider());
    triviaAmountHelperEl.textContent = `دامنه قابل پشتیبانی ${providerLabel}: از ${formatNumberFa(min)} تا ${formatNumberFa(max)} سوال در هر درخواست.`;
  }
}

function renderTriviaProviders() {
  if (!triviaProviderOptionsEl) return;
  const providers = getProvidersList();
  triviaProviderOptionsEl.innerHTML = '';

  providers.forEach((provider) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.providerId = provider.id;
    const providerLabel = formatProviderLabel(provider);
    const isActive = provider.id === triviaControlState.provider;
    button.className = `chip-toggle${isActive ? ' active' : ''}`;
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    button.setAttribute('aria-label', `انتخاب منبع سوال ${providerLabel}`);
    const iconClass = getProviderIcon(provider.id);
    button.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${escapeHtml(providerLabel)}</span>`;
    button.title = provider.description || providerLabel;
    button.addEventListener('click', () => {
      if (triviaControlState.importing) return;
      setActiveTriviaProvider(provider.id);
    });
    triviaProviderOptionsEl.appendChild(button);
  });
}

function ensureActiveProvider() {
  const providers = getProvidersList();
  if (providers.length === 0) {
    triviaControlState.provider = DEFAULT_TRIVIA_PROVIDERS[0].id;
    triviaControlState.providerRaw = DEFAULT_TRIVIA_PROVIDERS[0].id;
    return;
  }

  const normalized = resolveProviderId(triviaControlState.provider);
  if (!normalized) {
    triviaControlState.provider = providers[0].id;
    triviaControlState.providerRaw = providers[0].id;
    return;
  }

  if (!providers.some((provider) => provider.id === normalized)) {
    triviaControlState.provider = providers[0].id;
    triviaControlState.providerRaw = providers[0].id;
    return;
  }

  triviaControlState.provider = normalized;
}

function setActiveTriviaProvider(providerId, options = {}) {
  const { autoLoadCategories = true } = options;
  const providers = getProvidersList();
  const normalized = resolveProviderId(providerId);
  const provider = providers.find((item) => item.id === normalized) || providers[0];
  if (!provider) return;

  const previousProvider = resolveProviderId(triviaControlState.provider) || providers[0]?.id || provider.id;
  triviaControlState.providerRaw = normalizeProviderId(providerId) || provider.id;
  triviaControlState.provider = provider.id;

  if (!providerSupportsCategorySelection()) {
    triviaControlState.selectedCategories.clear();
  }

  if (!providerSupportsCategoryFetch()) {
    triviaControlState.availableCategories = [];
    triviaControlState.search = '';
  }

  if (!providerSupportsDifficultySelection()) {
    triviaControlState.selectedDifficulties.clear();
  } else if (!providerAllowsMultipleDifficulties()) {
    const iterator = triviaControlState.selectedDifficulties.values();
    const firstSelected = iterator.next().value || 'medium';
    triviaControlState.selectedDifficulties.clear();
    if (firstSelected) {
      triviaControlState.selectedDifficulties.add(firstSelected);
    }
  }

  renderTriviaProviders();
  updateProviderInfoDisplay(provider);
  updateCategoryCardContent(provider);
  applyAmountConstraints();
  updateTriviaSummary();
  renderTriviaCategories();
  updateTriviaControlsAvailability();

  if (triviaDifficultyOptions) {
    triviaDifficultyOptions.querySelectorAll('[data-difficulty]').forEach((button) => {
      const key = String(button.dataset.difficulty || '').toLowerCase();
      if (key && triviaControlState.selectedDifficulties.has(key)) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  if (providerSupportsCategoryFetch()) {
    if (
      autoLoadCategories
      && getToken()
      && (provider.id !== previousProvider || triviaControlState.availableCategories.length === 0)
    ) {
      loadTriviaCategories(true);
    }
  }
}

function clampTriviaAmount(value) {
  const { min, max } = getProviderAmountConfig();
  const num = Number(value);
  if (!Number.isFinite(num)) return Math.min(Math.max(triviaControlState.amount, min), max);
  if (num <= min) return min;
  if (num >= max) return max;
  return Math.max(min, Math.floor(num));
}

function setTriviaStatusBadge(tone = 'idle', text = 'غیرفعال') {
  if (!triviaImportStatusEl) return;
  const base = 'text-xs px-3 py-1 rounded-full font-semibold inline-flex items-center gap-1';
  let toneClass = 'bg-white/10 text-white/70 border border-white/10';
  if (tone === 'success') toneClass = 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/60';
  else if (tone === 'error') toneClass = 'bg-rose-500/20 text-rose-100 border border-rose-400/60';
  else if (tone === 'warning') toneClass = 'bg-amber-500/20 text-amber-100 border border-amber-400/60';
  else if (tone === 'loading') toneClass = 'bg-sky-500/20 text-sky-100 border border-sky-400/60';
  triviaImportStatusEl.className = `${base} ${toneClass}`;
  triviaImportStatusEl.textContent = text;
}

function updateTriviaControlsAvailability() {
  const hasToken = Boolean(getToken());
  const supportsCategories = providerSupportsCategorySelection();
  const supportsCategoryFetch = providerSupportsCategoryFetch();
  const supportsDifficulties = providerSupportsDifficultySelection();

  if (triviaImportBtn) {
    const providerLabel = formatProviderLabel(getActiveProvider());
    triviaImportBtn.title = `دریافت سوالات از ${providerLabel}`;
    const shouldDisable = !hasToken || triviaControlState.importing;
    triviaImportBtn.disabled = shouldDisable;
    triviaImportBtn.classList.toggle('opacity-60', shouldDisable);
    triviaImportBtn.classList.toggle('cursor-not-allowed', shouldDisable);
  }

  if (triviaRefreshBtn) {
    const shouldDisable = !hasToken || triviaControlState.loadingCategories || !supportsCategoryFetch;
    triviaRefreshBtn.disabled = shouldDisable;
    triviaRefreshBtn.classList.toggle('opacity-60', shouldDisable);
    triviaRefreshBtn.classList.toggle('cursor-not-allowed', shouldDisable);
    triviaRefreshBtn.dataset.busy = triviaControlState.loadingCategories ? 'true' : 'false';
    triviaRefreshBtn.classList.toggle('hidden', !supportsCategoryFetch);
  }

  if (triviaCategorySearchInput) {
    const shouldDisableSearch = !hasToken || !supportsCategories || !supportsCategoryFetch;
    triviaCategorySearchInput.disabled = shouldDisableSearch;
    triviaCategorySearchInput.classList.toggle('opacity-60', shouldDisableSearch);
  }

  if (triviaCategoryListEl) {
    const blockInteraction = !supportsCategories || !supportsCategoryFetch;
    triviaCategoryListEl.classList.toggle('pointer-events-none', blockInteraction);
    triviaCategoryListEl.classList.toggle('opacity-80', blockInteraction);
  }

  if (triviaDifficultyOptions) {
    const shouldDisable = !hasToken || !supportsDifficulties;
    triviaDifficultyOptions.classList.toggle('opacity-60', shouldDisable);
    triviaDifficultyOptions.classList.toggle('pointer-events-none', shouldDisable);
    triviaDifficultyOptions.querySelectorAll('button[data-difficulty]').forEach((button) => {
      button.disabled = shouldDisable;
      button.classList.toggle('cursor-not-allowed', shouldDisable);
      button.setAttribute('aria-disabled', shouldDisable ? 'true' : 'false');
    });
  }
}

function setTriviaImportLoading(isLoading) {
  const providerLabel = formatProviderLabel(getActiveProvider());
  triviaControlState.importing = isLoading;
  if (triviaImportBtn) {
    if (isLoading) {
      triviaImportBtn.innerHTML = `<span class="loader-inline"></span> دریافت از ${escapeHtml(providerLabel)}...`;
    } else {
      triviaImportBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-down ml-2"></i> دریافت از ${escapeHtml(providerLabel)}`;
    }
  }
  if (isLoading) {
    setTriviaStatusBadge('loading', `در حال دریافت از ${providerLabel}`);
  } else if (!triviaControlState.lastResult) {
    setTriviaStatusBadge('idle', 'غیرفعال');
  }
  updateTriviaControlsAvailability();
}

function renderTriviaImportResult(result) {
  if (!triviaImportResultEl) return;

  if (!result) {
    triviaImportResultEl.innerHTML = '<p>هنوز درخواستی ثبت نشده است. پس از اجرای درون‌ریزی، جزئیات هر دسته و سطح دشواری در اینجا نمایش داده می‌شود.</p>';
    setTriviaStatusBadge('idle', 'غیرفعال');
    return;
  }

  const breakdown = Array.isArray(result.breakdown) ? result.breakdown : [];
  const providerLabel = result?.providerName || result?.providerShortName || formatProviderLabel(getActiveProvider());
  const providerIcon = getProviderIcon(result?.provider || triviaControlState.provider);
  const inserted = Number.isFinite(result?.count) ? Number(result.count) : Number(result?.inserted) || 0;
  const duplicates = Number.isFinite(result?.duplicates) ? Number(result.duplicates) : 0;
  const totalRequested = Number.isFinite(result?.totalRequested) ? Number(result.totalRequested) : Number(result?.total) || 0;
  const totalReceived = Number.isFinite(result?.totalReceived) ? Number(result.totalReceived) : breakdown.reduce((sum, item) => sum + (Number.isFinite(item?.received) ? Number(item.received) : 0), 0);
  const totalStored = Number.isFinite(result?.totalStored) ? Number(result.totalStored) : 0;
  const fetchDurationMs = Number.isFinite(result?.fetchDurationMs) ? Number(result.fetchDurationMs) : 0;
  const invalidEntriesRaw = Array.isArray(result?.counts?.invalid)
    ? result.counts.invalid
    : Array.isArray(result?.invalid)
      ? result.invalid
      : [];
  const invalidEntries = invalidEntriesRaw
    .map((entry) => ({
      id: entry?.id != null ? String(entry.id) : null,
      category: typeof entry?.category === 'string' ? entry.category : '',
      reason: typeof entry?.reason === 'string' ? entry.reason : ''
    }))
    .filter((entry) => entry.reason);

  const metrics = [
    { label: 'سوالات ثبت‌شده جدید', value: inserted ? formatNumberFa(inserted) : null },
    { label: 'تعداد کل دریافتی', value: totalReceived ? formatNumberFa(totalReceived) : null },
    { label: 'تعداد درخواستی', value: totalRequested ? formatNumberFa(totalRequested) : null },
    { label: 'موارد تکراری', value: formatNumberFa(duplicates) },
    { label: 'پس از حذف تکراری', value: totalStored ? formatNumberFa(totalStored) : null },
    { label: 'زمان دریافت', value: fetchDurationMs ? `${formatNumberFa(fetchDurationMs)} میلی‌ثانیه` : null },
    invalidEntries.length ? { label: 'موارد نامعتبر', value: formatNumberFa(invalidEntries.length) } : null
  ].filter((item) => item && item.value && item.value !== '۰');

  const metricsHtml = metrics.length
    ? `<ul class="space-y-1 text-xs text-white/70">${metrics.map((item) => `<li><span class="text-white/60">${item.label}:</span> <span class="text-white">${item.value}</span></li>`).join('')}</ul>`
    : '';

  const invalidHtml = invalidEntries.length
    ? (() => {
        const limit = Math.min(invalidEntries.length, 6);
        const items = invalidEntries.slice(0, limit).map((entry) => {
          const idLabel = entry.id ? `#${escapeHtml(entry.id)}` : 'بدون شناسه';
          const categoryLabel = entry.category ? ` – ${escapeHtml(entry.category)}` : '';
          return `<li class="leading-5">${idLabel}${categoryLabel}<span class="text-white/50">: ${escapeHtml(entry.reason)}</span></li>`;
        }).join('');
        const moreCount = invalidEntries.length - limit;
        const moreHtml = moreCount > 0 ? `<li class="text-white/50">${formatNumberFa(moreCount)} مورد دیگر...</li>` : '';
        return `
          <div class="glass-dark rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
            <p class="text-xs font-semibold text-rose-200">سوالات نامعتبر (${formatNumberFa(invalidEntries.length)})</p>
            <ul class="text-[11px] text-white/70 space-y-1">${items}${moreHtml}</ul>
          </div>
        `;
      })()
    : '';

  const breakdownHtml = breakdown.length
    ? breakdown.map((item) => {
      const difficultyKey = typeof item?.providerDifficulty === 'string' ? item.providerDifficulty.toLowerCase() : '';
      const difficultyLabel = difficultyKey && difficultyKey !== 'mixed'
        ? (TRIVIA_DIFFICULTY_LABELS[difficultyKey] || difficultyKey)
        : 'ترکیبی';
      const requested = Number.isFinite(item?.requested) ? item.requested : 0;
      const received = Number.isFinite(item?.received) ? item.received : 0;
      const statusMeta = item?.error
        ? { label: 'خطا', class: 'text-rose-300', detail: escapeHtml(item.error) }
        : (received < requested
          ? { label: 'ناقص', class: 'text-amber-300', detail: `دریافت ${formatNumberFa(received)} از ${formatNumberFa(requested)} سوال` }
          : { label: 'کامل', class: 'text-emerald-300', detail: `دریافت ${formatNumberFa(received)} از ${formatNumberFa(requested)} سوال` });
      const categoryName = item?.categoryName ? escapeHtml(item.categoryName) : (item?.providerCategoryId ? `دسته ${escapeHtml(String(item.providerCategoryId))}` : 'عمومی');
      const providerIdLabel = item?.providerCategoryId ? `شناسه ${escapeHtml(String(item.providerCategoryId))}` : 'بدون شناسه';
      const noteHtml = item?.note ? `<span class="block text-xs text-amber-200 mt-2">${escapeHtml(item.note)}</span>` : '';

      return `
        <div class="glass-dark rounded-2xl border border-white/10 p-4 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-semibold text-white">${categoryName}</div>
            <span class="text-xs px-3 py-1 rounded-full bg-white/10 text-white/60">${providerIdLabel}</span>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-xs text-white/60">
            <span class="px-3 py-1 rounded-full bg-white/10 text-white/70">سطح: ${escapeHtml(difficultyLabel)}</span>
            <span class="${statusMeta.class} font-semibold">${statusMeta.label}</span>
            <span class="text-white/50">|</span>
            <span class="text-white/80">${statusMeta.detail}</span>
          </div>
          ${noteHtml}
        </div>
      `;
    }).join('')
    : '<div class="glass-dark rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/70">اطلاعاتی از ترکیب‌های دریافتی موجود نیست.</div>';

  triviaImportResultEl.innerHTML = `
    <div class="glass-dark rounded-2xl border border-white/10 p-4 space-y-3">
      <div class="flex items-center gap-3 text-white">
        <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10"><i class="fa-solid ${providerIcon}"></i></span>
        <div>
          <p class="text-sm font-semibold">${escapeHtml(providerLabel)}</p>
          <p class="text-xs text-white/60">${result.partial ? 'اجرای موفق با هشدار' : 'گزارش آخرین دریافت'}</p>
        </div>
      </div>
      ${metricsHtml || '<p class="text-xs text-white/60">گزارشی برای نمایش وجود ندارد.</p>'}
    </div>
    <div class="space-y-3 mt-4">${[invalidHtml, breakdownHtml].filter(Boolean).join('')}</div>
  `;

  if (result.ok === false) {
    setTriviaStatusBadge('warning', result?.message ? result.message : 'بدون نتیجه');
    return;
  }

  const tone = result.partial ? 'warning' : 'success';
  const badgeText = `${escapeHtml(providerLabel)} · ${formatNumberFa(inserted)} سوال${result.partial ? ' (با هشدار)' : ''}`;
  setTriviaStatusBadge(tone, badgeText);
}

function renderTriviaCategories() {
  if (!triviaCategoryListEl) return;

  const providerLabel = formatProviderLabel(getActiveProvider());
  const supportsCategories = providerSupportsCategorySelection();
  const supportsCategoryFetch = providerSupportsCategoryFetch();

  if (triviaCategorySearchInput && triviaCategorySearchInput.value !== triviaControlState.search) {
    triviaCategorySearchInput.value = triviaControlState.search || '';
  }

  if (!supportsCategories) {
    triviaCategoryListEl.innerHTML = `
      <div class="glass-dark rounded-2xl border border-dashed border-white/10 p-4 text-center">
        <p>منبع ${escapeHtml(providerLabel)} از محدودسازی بر اساس دسته‌بندی پشتیبانی نمی‌کند.</p>
      </div>
    `;
    return;
  }

  if (!supportsCategoryFetch) {
    triviaCategoryListEl.innerHTML = `
      <div class="glass-dark rounded-2xl border border-dashed border-white/10 p-4 text-center">
        <p>این منبع دسته‌بندی قابل دریافت از API ارائه نمی‌دهد؛ سوالات به صورت عمومی دریافت می‌شوند.</p>
      </div>
    `;
    return;
  }

  if (triviaControlState.loadingCategories) {
    triviaCategoryListEl.innerHTML = `
      <div class="glass-dark rounded-2xl border border-dashed border-white/10 p-4 text-center animate-pulse">
        <p>در حال بروزرسانی لیست دسته‌بندی‌ها...</p>
      </div>
    `;
    return;
  }

  const categories = triviaControlState.availableCategories;
  const searchTerm = (triviaControlState.search || '').toLowerCase();
  const filtered = !searchTerm
    ? categories
    : categories.filter((item) => String(item?.name || '').toLowerCase().includes(searchTerm));

  if (!Array.isArray(categories) || categories.length === 0) {
    triviaCategoryListEl.innerHTML = `
      <div class="glass-dark rounded-2xl border border-dashed border-white/10 p-4 text-center">
        <p>هنوز دسته‌بندی‌ای از ${escapeHtml(providerLabel)} دریافت نشده است. لطفاً بروزرسانی را اجرا کنید.</p>
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    triviaCategoryListEl.innerHTML = `
      <div class="glass-dark rounded-2xl border border-dashed border-white/10 p-4 text-center">
        <p>نتیجه‌ای برای جستجوی «${escapeHtml(triviaControlState.search)}» یافت نشد.</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach((item) => {
    const id = String(item.id);
    const isSelected = triviaControlState.selectedCategories.has(id);
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.categoryId = id;
    button.className = `w-full text-right px-4 py-3 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${isSelected
      ? 'bg-gradient-to-l from-sky-500/20 to-sky-400/10 border-sky-400/60 text-white shadow-lg shadow-sky-900/30'
      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`;
    button.innerHTML = `
      <div>
        <p class="font-semibold">${escapeHtml(item.name || `دسته ${id}`)}</p>
        <p class="text-xs text-white/60 mt-1">${isSelected ? 'انتخاب شده - برای حذف کلیک کنید' : 'برای افزودن به درخواست کلیک کنید'}</p>
      </div>
      <span class="text-xs px-3 py-1 rounded-full ${isSelected ? 'bg-sky-500/30 text-white' : 'bg-white/10 text-white/60'}">${isSelected ? 'فعال' : 'غیرفعال'}</span>
    `;
    fragment.appendChild(button);
  });

  triviaCategoryListEl.innerHTML = '';
  triviaCategoryListEl.appendChild(fragment);
}

async function loadTriviaProviders() {
  let providers = sanitizeProviderList([]);

  if (getToken()) {
    try {
      const response = await api('/trivia/providers');
      const fetched = sanitizeProviderList(response?.data);
      if (Array.isArray(fetched) && fetched.length > 0) {
        providers = fetched;
      }
    } catch (err) {
      console.error('Failed to load trivia providers', err);
      showToast('دریافت لیست منابع سوالات با خطا مواجه شد', 'error');
    }
  }

  triviaControlState.providers = providers;
  initializeProviderFilterOptions();
  ensureActiveProvider();
  setActiveTriviaProvider(triviaControlState.provider, { autoLoadCategories: false });

  if (getToken() && providerSupportsCategoryFetch()) {
    await loadTriviaCategories(true);
  }

  return providers;
}

async function loadTriviaCategories(force = false) {
  if (!triviaCategoryListEl) return;
  const provider = getActiveProvider();
  const providerLabel = formatProviderLabel(provider);
  const supportsCategories = providerSupportsCategorySelection();
  const supportsCategoryFetch = providerSupportsCategoryFetch();

  if (!getToken()) {
    triviaControlState.availableCategories = [];
    triviaControlState.selectedCategories.clear();
    renderTriviaCategories();
    updateTriviaSummary();
    updateTriviaControlsAvailability();
    return;
  }

  if (!supportsCategories || !supportsCategoryFetch) {
    if (!supportsCategories) {
      triviaControlState.selectedCategories.clear();
    }
    triviaControlState.availableCategories = [];
    renderTriviaCategories();
    updateTriviaSummary();
    updateTriviaControlsAvailability();
    return;
  }

  if (triviaControlState.loadingCategories && !force) return;

  triviaControlState.loadingCategories = true;
  renderTriviaCategories();
  updateTriviaControlsAvailability();

  try {
    const providerId = provider?.id ? resolveProviderId(provider.id) : DEFAULT_TRIVIA_PROVIDERS[0].id;
    const safeProviderId = providerId || DEFAULT_TRIVIA_PROVIDERS[0].id;
    const response = await api(`/trivia/providers/${safeProviderId}/categories`);
    const categories = Array.isArray(response?.data) ? response.data : [];
    triviaControlState.availableCategories = categories.map((item) => ({
      id: String(item.id),
      name: item.name || `Category ${item.id}`
    }));
    const validIds = new Set(triviaControlState.availableCategories.map((item) => item.id));
    triviaControlState.selectedCategories.forEach((id) => {
      if (!validIds.has(id)) triviaControlState.selectedCategories.delete(id);
    });
  } catch (err) {
    console.error('Failed to load trivia categories', err);
    showToast(`دریافت دسته‌های ${providerLabel} با خطا مواجه شد`, 'error');
  } finally {
    triviaControlState.loadingCategories = false;
    renderTriviaCategories();
    updateTriviaControlsAvailability();
    updateTriviaSummary();
  }
}

function updateTriviaSummary() {
  if (!triviaSelectionSummaryEl) return;
  if (!getToken()) {
    triviaSelectionSummaryEl.textContent = 'برای فعال‌سازی دریافت سوالات، ابتدا وارد حساب مدیریتی شوید.';
    return;
  }

  const provider = getActiveProvider();
  const providerLabel = formatProviderLabel(provider);
  const supportsCategories = providerSupportsCategorySelection();
  const supportsCategoryFetch = providerSupportsCategoryFetch();
  const supportsDifficulties = providerSupportsDifficultySelection();
  const canSelectCategories = supportsCategories && supportsCategoryFetch;

  const amount = clampTriviaAmount(triviaControlState.amount);
  triviaControlState.amount = amount;
  if (triviaAmountInput && Number(triviaAmountInput.value) !== amount) {
    triviaAmountInput.value = String(amount);
  }
  if (triviaAmountRange && Number(triviaAmountRange.value) !== amount) {
    triviaAmountRange.value = String(Math.min(Math.max(amount, Number(triviaAmountRange.min) || 1), Number(triviaAmountRange.max) || amount));
  }

  const categories = canSelectCategories
    ? Array.from(triviaControlState.selectedCategories)
    : [];
  const difficulties = supportsDifficulties
    ? Array.from(triviaControlState.selectedDifficulties)
    : [];
  const categoryCount = categories.length || 1;
  const difficultyCount = supportsDifficulties ? (difficulties.length || 1) : 1;
  const totalCombos = Math.max(1, categoryCount * difficultyCount);
  const basePerCombo = Math.floor(amount / totalCombos);
  const remainder = amount % totalCombos;

  const difficultiesText = supportsDifficulties
    ? (difficulties.length === 0
      ? 'بدون محدودیت'
      : difficulties.map((key) => escapeHtml(TRIVIA_DIFFICULTY_LABELS[key] || key)).join('، '))
    : 'توسط منبع تعیین می‌شود';

  const categoryNames = categories.map((id) => {
    const match = triviaControlState.availableCategories.find((item) => item.id === id);
    return match ? escapeHtml(match.name) : escapeHtml(`شناسه ${id}`);
  });

  let categoriesText;
  if (!supportsCategories) {
    categoriesText = 'پشتیبانی نمی‌شود';
  } else if (!supportsCategoryFetch) {
    categoriesText = 'به‌صورت عمومی دریافت می‌شود';
  } else if (categoryNames.length > 0) {
    categoriesText = categoryNames.length <= 3
      ? categoryNames.join('، ')
      : `${categoryNames.slice(0, 3).join('، ')} و ${formatNumberFa(categoryNames.length - 3)} مورد دیگر`;
  } else {
    categoriesText = 'بدون محدودیت (عمومی)';
  }

  let distributionText = `میانگین هر ترکیب: ${formatNumberFa(basePerCombo)} سوال`;
  if (remainder) {
    distributionText += ` و ${formatNumberFa(remainder)} سوال اضافه در ترکیب‌های ابتدایی`;
  }
  if (amount < totalCombos) {
    distributionText = `تعداد سوال کمتر از ترکیب‌هاست؛ فقط برای ${formatNumberFa(amount)} ترکیب نخست سوال دریافت می‌شود.`;
  }

  const summaryNotes = [];
  if (supportsCategories && !supportsCategoryFetch) {
    summaryNotes.push({ text: 'دسته‌بندی‌ها به صورت دستی قابل دریافت نیستند.', className: 'text-xs text-amber-200' });
  }
  if (!supportsDifficulties) {
    summaryNotes.push({ text: 'سطح دشواری این منبع به صورت خودکار مدیریت می‌شود.', className: 'text-xs text-sky-200' });
  }
  const notesHtml = summaryNotes.length
    ? summaryNotes.map((note) => `<p class="${note.className}">${escapeHtml(note.text)}</p>`).join('')
    : '';

  triviaSelectionSummaryEl.innerHTML = `
    <div class="space-y-1">
      <p>منبع انتخابی: <span class="font-semibold text-white">${escapeHtml(providerLabel)}</span></p>
      <p>مجموع درخواست: <span class="font-semibold text-white">${formatNumberFa(amount)} سوال</span></p>
      <p>ترکیب دشواری: <span class="text-white">${difficultiesText}</span></p>
      <p>دسته‌بندی‌ها: <span class="text-white">${escapeHtml(categoriesText)}</span></p>
      ${notesHtml}
      <p class="text-xs text-white/60">${distributionText}</p>
    </div>
  `;
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
function showToast(message, type = 'info', duration = 3000) {
  const toastContainer = $('#toast-container');
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
$('#btn-add-category').addEventListener('click', () => openCategoryModal('create'));
if (categoriesEmptyActionBtn) {
  categoriesEmptyActionBtn.addEventListener('click', () => {
    if (categoriesEmptyActionBtn.disabled) {
      showToast('برای مدیریت دسته‌بندی‌ها ابتدا وارد شوید', 'warning');
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
    updateTriviaControlsAvailability();
    updateTriviaSummary();
    await loadAllData();
  } catch (e) {
    showToast(e.message, 'error');
  }
}
$('#login-submit').addEventListener('click', login);

// اگر توکن نداریم، مودال ورود باز بماند
if (getToken()) closeModal('#login-modal');

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
        loadDashboardStats(true)
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
      if (Object.prototype.hasOwnProperty.call(overrides, 'provider')) {
        const providerValue = overrides.provider || '';
        questionFilters.provider = providerValue ? resolveProviderId(providerValue) : '';
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
    }

    if (questionFilters.status && questionFilters.status !== 'approved') {
      questionFilters.approvedOnly = false;
    }

    if (filterSortSelect && questionFilters.sort && filterSortSelect.value !== questionFilters.sort) {
      filterSortSelect.value = questionFilters.sort;
    }
    if (filterProviderSelect) {
      const nextProvider = questionFilters.provider || '';
      if (filterProviderSelect.value !== nextProvider) {
        filterProviderSelect.value = nextProvider;
      }
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
      );
      let emptyMessage = hasFilters
        ? 'هیچ سوالی با فیلترهای انتخاب شده یافت نشد.'
        : 'هنوز سوالی ثبت نشده است. از دکمه «افزودن سوال» یا ابزار دریافت سوالات خودکار استفاده کنید.';
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
      const derivedAnswerRaw = item.correctAnswer || item.options[item.correctIdx] || '---';
      const answerText = escapeHtml(decodeHtmlEntities(derivedAnswerRaw));
      return `
        <tr class="question-row" data-question-id="${idAttr}">
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
        loadUsers();
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

if (filterProviderSelect) {
  filterProviderSelect.addEventListener('change', () => {
    if (!getToken()) return;
    const value = filterProviderSelect.value || '';
    loadQuestions({ provider: value });
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

if (triviaAmountRange) {
  triviaAmountRange.addEventListener('input', () => {
    const amount = clampTriviaAmount(triviaAmountRange.value);
    triviaControlState.amount = amount;
    if (triviaAmountInput && Number(triviaAmountInput.value) !== amount) {
      triviaAmountInput.value = String(amount);
    }
    updateTriviaSummary();
  });
}

if (triviaAmountInput) {
  triviaAmountInput.addEventListener('input', () => {
    const amount = clampTriviaAmount(triviaAmountInput.value);
    triviaControlState.amount = amount;
    if (triviaAmountRange && Number(triviaAmountRange.value) !== amount) {
      triviaAmountRange.value = String(Math.min(Math.max(amount, Number(triviaAmountRange.min) || 1), Number(triviaAmountRange.max) || 50));
    }
    updateTriviaSummary();
  });
}

if (triviaDifficultyOptions) {
  triviaDifficultyOptions.addEventListener('click', (event) => {
    const target = event.target.closest('[data-difficulty]');
    if (!target) return;
    if (!providerSupportsDifficultySelection()) return;
    const key = String(target.dataset.difficulty || '').toLowerCase();
    if (!key) return;
    const allowsMultiple = providerAllowsMultipleDifficulties();
    if (!allowsMultiple) {
      triviaControlState.selectedDifficulties.clear();
      triviaControlState.selectedDifficulties.add(key);
      triviaDifficultyOptions.querySelectorAll('[data-difficulty]').forEach((btn) => {
        if (String(btn.dataset.difficulty || '').toLowerCase() === key) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    } else {
      if (triviaControlState.selectedDifficulties.has(key)) {
        triviaControlState.selectedDifficulties.delete(key);
        target.classList.remove('active');
      } else {
        triviaControlState.selectedDifficulties.add(key);
        target.classList.add('active');
      }
    }
    updateTriviaSummary();
  });
}

if (triviaCategoryListEl) {
  triviaCategoryListEl.addEventListener('click', (event) => {
    if (!providerSupportsCategorySelection() || !providerSupportsCategoryFetch()) return;
    const button = event.target.closest('[data-category-id]');
    if (!button) return;
    const id = String(button.dataset.categoryId || '').trim();
    if (!id) return;
    if (triviaControlState.selectedCategories.has(id)) {
      triviaControlState.selectedCategories.delete(id);
    } else {
      triviaControlState.selectedCategories.add(id);
    }
    renderTriviaCategories();
    updateTriviaSummary();
  });
}

if (triviaCategorySearchInput) {
  triviaCategorySearchInput.addEventListener('input', () => {
    if (!providerSupportsCategorySelection() || !providerSupportsCategoryFetch()) {
      triviaControlState.search = '';
      triviaCategorySearchInput.value = '';
      return;
    }
    triviaControlState.search = triviaCategorySearchInput.value || '';
    renderTriviaCategories();
  });
}

if (triviaRefreshBtn) {
  triviaRefreshBtn.addEventListener('click', async () => {
    if (!getToken()) {
      showToast('برای دریافت لیست دسته‌ها ابتدا وارد شوید', 'warning');
      return;
    }
    if (!providerSupportsCategoryFetch()) {
      showToast('این منبع امکان بروزرسانی خودکار دسته‌بندی‌ها را ندارد', 'warning');
      return;
    }
    await loadTriviaCategories(true);
  });
}

if (triviaImportBtn) {
  triviaImportBtn.addEventListener('click', async () => {
    if (!getToken()) {
      showToast('برای دریافت سوالات ابتدا وارد شوید', 'warning');
      return;
    }
    if (triviaControlState.importing) return;
    setTriviaImportLoading(true);
    try {
      const supportsCategories = providerSupportsCategorySelection() && providerSupportsCategoryFetch();
      const supportsDifficulties = providerSupportsDifficultySelection();
      const amount = clampTriviaAmount(triviaControlState.amount);
      triviaControlState.amount = amount;
      const activeProvider = getActiveProvider();
      const providerId = activeProvider?.id
        ? resolveProviderId(activeProvider.id)
        : resolveProviderId(triviaControlState.provider);
      if (!providerId) {
        showToast('منبع سوال انتخاب‌شده معتبر نیست', 'error');
        setTriviaStatusBadge('error', 'خطا در انتخاب منبع');
        return;
      }
      triviaControlState.provider = providerId;
      const payload = {
        provider: providerId,
        amount,
      };
      const normalizedProvider = resolveProviderId(payload.provider);
      if (!normalizedProvider) {
        showToast('منبع سوال انتخاب‌شده معتبر نیست', 'error');
        setTriviaStatusBadge('error', 'خطا در انتخاب منبع');
        return;
      }
      payload.provider = normalizedProvider;
      if (supportsCategories) {
        payload.categories = Array.from(triviaControlState.selectedCategories);
      }
      if (supportsDifficulties) {
        payload.difficulties = Array.from(triviaControlState.selectedDifficulties);
      }
      const result = await api('/trivia/import', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      triviaControlState.lastResult = result;
      renderTriviaImportResult(result);
      showToast(result.ok ? 'دریافت سوالات با موفقیت انجام شد' : (result.message || 'دریافت سوالات ناموفق بود'), result.ok ? 'success' : 'warning');
      await Promise.allSettled([
        loadQuestions(),
        loadDashboardStats(true)
      ]);
    } catch (err) {
      console.error('Failed to import trivia questions', err);
      showToast(err.message || 'درون‌ریزی سوالات با خطا مواجه شد', 'error');
      setTriviaStatusBadge('error', 'خطا در دریافت');
    } finally {
      setTriviaImportLoading(false);
    }
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
        loadDashboardStats(true)
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
    loadUsers();
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
  await loadTriviaProviders();
  await Promise.all([
    loadDashboardStats(),
    loadCategoryFilterOptions(),
    loadQuestions(),
    loadUsers(),
    loadAds()
  ]);
}

// شبیه‌سازی کارت‌های داشبورد قبلی (آپدیت زمان‌دار)
setInterval(() => {
  const activeUsers = Math.floor(Math.random() * 100) + 2400;
  const gamesToday = Math.floor(Math.random() * 500) + 5200;
  const activeUsersEl = document.querySelector('#page-dashboard .stat-card:nth-child(1) .text-2xl');
  const gamesTodayEl = document.querySelector('#page-dashboard .stat-card:nth-child(3) .text-2xl');
  if (activeUsersEl) activeUsersEl.textContent = activeUsers.toLocaleString('fa-IR');
  if (gamesTodayEl)  gamesTodayEl.textContent  = gamesToday.toLocaleString('fa-IR');
}, 5000);

function handleResize() { if (window.innerWidth >= 768) $('#mobile-menu').classList.add('translate-x-full'); }
window.addEventListener('resize', handleResize);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    $$('.modal').forEach(m => { if (m.classList.contains('active')) closeModal(`#${m.id}`); });
    $('#mobile-menu').classList.add('translate-x-full');
  }
});

setupUserManagement();
setupShopControls();
renderTriviaProviders();
initializeProviderFilterOptions();
updateProviderInfoDisplay();
updateCategoryCardContent();
applyAmountConstraints();
renderTriviaCategories();
renderTriviaImportResult(triviaControlState.lastResult);
updateTriviaSummary();
updateTriviaControlsAvailability();
renderCategoryManagement();
resetAdForm();
updateAdsStats();
renderAds();
loadAdProvinces();

// صفحه پیش‌فرض
navigateTo('dashboard');

// اگر توکن داریم، داده‌ها را بگیر
if (getToken()) loadAllData();

