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
  opentdb: { label: 'OpenTDB', class: 'meta-chip source-opentdb', icon: 'fa-database' }
};

const htmlDecoder = document.createElement('textarea');
const decodeHtmlEntities = (value = '') => {
  htmlDecoder.innerHTML = value;
  return htmlDecoder.value;
};

const STATUS_META = {
  active:    { label: 'فعال', class: 'meta-chip status-active', dot: 'active' },
  pending:   { label: 'در انتظار بررسی', class: 'meta-chip status-pending', dot: 'pending' },
  review:    { label: 'در حال بررسی', class: 'meta-chip status-pending', dot: 'pending' },
  draft:     { label: 'پیش‌نویس', class: 'meta-chip status-pending', dot: 'pending' },
  inactive:  { label: 'غیرفعال', class: 'meta-chip status-inactive', dot: 'inactive' },
  disabled:  { label: 'غیرفعال', class: 'meta-chip status-inactive', dot: 'inactive' },
  archived:  { label: 'آرشیو شده', class: 'meta-chip status-archived', dot: 'archived' }
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
const filterSearchInput = $('#filter-search');
const filterSortSelect = $('#filter-sort');
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

const questionFilters = {
  category: '',
  difficulty: '',
  search: '',
  sort: 'newest'
};

const TRIVIA_DIFFICULTY_LABELS = {
  easy: 'آسون',
  medium: 'متوسط',
  hard: 'سخت'
};

const triviaControlState = {
  amount: 20,
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

function clampTriviaAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return triviaControlState.amount;
  if (num <= 1) return 1;
  if (num >= 200) return 200;
  return Math.floor(num);
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

  if (triviaImportBtn) {
    const shouldDisable = !hasToken || triviaControlState.importing;
    triviaImportBtn.disabled = shouldDisable;
    triviaImportBtn.classList.toggle('opacity-60', shouldDisable);
    triviaImportBtn.classList.toggle('cursor-not-allowed', shouldDisable);
  }

  if (triviaRefreshBtn) {
    const shouldDisable = !hasToken || triviaControlState.loadingCategories;
    triviaRefreshBtn.disabled = shouldDisable;
    triviaRefreshBtn.classList.toggle('opacity-60', shouldDisable);
    triviaRefreshBtn.classList.toggle('cursor-not-allowed', shouldDisable);
    triviaRefreshBtn.dataset.busy = triviaControlState.loadingCategories ? 'true' : 'false';
  }
}

function setTriviaImportLoading(isLoading) {
  triviaControlState.importing = isLoading;
  if (triviaImportBtn) {
    if (isLoading) {
      triviaImportBtn.innerHTML = '<span class="loader-inline"></span> در حال دریافت...';
    } else {
      triviaImportBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down ml-2"></i> دریافت سوالات انتخابی';
    }
  }
  if (isLoading) {
    setTriviaStatusBadge('loading', 'در حال دریافت');
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
  if (breakdown.length === 0) {
    triviaImportResultEl.innerHTML = '<p>اطلاعاتی از ترکیب‌های دریافتی موجود نیست.</p>';
  } else {
    triviaImportResultEl.innerHTML = breakdown.map((item) => {
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
        </div>
      `;
    }).join('');
  }

  if (result.ok) {
    if (result.partial) {
      setTriviaStatusBadge('warning', `موفق با هشدار (${formatNumberFa(result.count || 0)} سوال)`);
    } else {
      setTriviaStatusBadge('success', `موفق (${formatNumberFa(result.count || 0)} سوال)`);
    }
  } else {
    setTriviaStatusBadge('warning', result?.message ? result.message : 'بدون نتیجه');
  }
}

function renderTriviaCategories() {
  if (!triviaCategoryListEl) return;

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
        <p>دسته‌بندی‌ای از OpenTDB دریافت نشده است. لطفاً بروزرسانی را اجرا کنید.</p>
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

async function loadTriviaCategories(force = false) {
  if (!triviaCategoryListEl) return;
  if (!getToken()) {
    triviaControlState.availableCategories = [];
    triviaControlState.selectedCategories.clear();
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
    const response = await api('/trivia/providers/opentdb/categories');
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
    showToast('دریافت دسته‌های OpenTDB با خطا مواجه شد', 'error');
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

  const amount = clampTriviaAmount(triviaControlState.amount);
  triviaControlState.amount = amount;
  if (triviaAmountInput && Number(triviaAmountInput.value) !== amount) {
    triviaAmountInput.value = String(amount);
  }
  if (triviaAmountRange && Number(triviaAmountRange.value) !== amount) {
    triviaAmountRange.value = String(Math.min(Math.max(amount, Number(triviaAmountRange.min) || 1), Number(triviaAmountRange.max) || amount));
  }

  const categories = Array.from(triviaControlState.selectedCategories);
  const difficulties = Array.from(triviaControlState.selectedDifficulties);
  const totalCombos = Math.max(1, (categories.length || 1) * (difficulties.length || 1));
  const basePerCombo = Math.floor(amount / totalCombos);
  const remainder = amount % totalCombos;

  const difficultiesText = difficulties.length === 0
    ? 'بدون محدودیت'
    : difficulties.map((key) => escapeHtml(TRIVIA_DIFFICULTY_LABELS[key] || key)).join('، ');

  const categoryNames = categories.map((id) => {
    const match = triviaControlState.availableCategories.find((item) => item.id === id);
    return match ? escapeHtml(match.name) : escapeHtml(`شناسه ${id}`);
  });

  let categoriesText = 'بدون محدودیت (عمومی)';
  if (categoryNames.length > 0) {
    categoriesText = categoryNames.length <= 3
      ? categoryNames.join('، ')
      : `${categoryNames.slice(0, 3).join('، ')} و ${formatNumberFa(categoryNames.length - 3)} مورد دیگر`;
  }

  let distributionText = `میانگین هر ترکیب: ${formatNumberFa(basePerCombo)} سوال`;
  if (remainder) {
    distributionText += ` و ${formatNumberFa(remainder)} سوال اضافه در ترکیب‌های ابتدایی`;
  }
  if (amount < totalCombos) {
    distributionText = `تعداد سوال کمتر از ترکیب‌هاست؛ فقط برای ${formatNumberFa(amount)} ترکیب نخست سوال دریافت می‌شود.`;
  }

  triviaSelectionSummaryEl.innerHTML = `
    <div class="space-y-1">
      <p>مجموع درخواست: <span class="font-semibold text-white">${formatNumberFa(amount)} سوال</span></p>
      <p>ترکیب دشواری: <span class="text-white">${difficultiesText}</span></p>
      <p>دسته‌بندی‌ها: <span class="text-white">${escapeHtml(categoriesText)}</span></p>
      <p class="text-xs text-white/60">${distributionText}</p>
    </div>
  `;
}

// --------------- AUTH (JWT) ---------------
function getToken() { return localStorage.getItem('iq_admin_token'); }
function setToken(t) { localStorage.setItem('iq_admin_token', t); }
function logout() { localStorage.removeItem('iq_admin_token'); location.reload(); }

async function api(path, options = {}) {
  const headers = options.headers || {};
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
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
}
$$('.modal').forEach(modal => modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(`#${modal.id}`); }));
$$('.close-modal').forEach(button => button.addEventListener('click', () => { const modal = button.closest('.modal'); closeModal(`#${modal.id}`); }));

$('#btn-add-question').addEventListener('click', () => openModal('#add-question-modal'));
$('#btn-add-category').addEventListener('click', () => openModal('#add-category-modal'));
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
  return {
    ...raw,
    text: decodedText,
    options: decodedOptions,
    correctIdx,
    categoryName: decodeHtmlEntities(categoryNameRaw),
    categoryId,
    source: SOURCE_META[sourceKey] ? sourceKey : 'manual'
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

function populateQuestionDetail(question) {
  if (!questionDetailModal) return;
  const normalized = normalizeQuestion(question);
  const idKey = normalized?._id ? String(normalized._id) : '';
  if (questionIdEl) questionIdEl.textContent = idKey ? `شناسه: #${idKey.slice(-6)}` : 'شناسه: ---';
  if (questionTitleEl) questionTitleEl.textContent = normalized.text || 'بدون متن';
  if (questionDetailForm) {
    const textarea = questionDetailForm.querySelector('[name="question-text"]');
    if (textarea) textarea.value = normalized.text || '';
  }
  if (questionMetaEl) {
    const categoryNameSafe = escapeHtml(normalized.categoryName || 'بدون دسته‌بندی');
    const difficultyMeta = DIFFICULTY_META[normalized.difficulty] || DIFFICULTY_META.medium;
    const statusKey = normalized.status || (normalized.active === false ? 'inactive' : 'active');
    const statusMeta = STATUS_META[statusKey] || STATUS_META.active;
    const sourceMeta = SOURCE_META[normalized.source] || SOURCE_META.manual;
    questionMetaEl.innerHTML = `
      <span class="meta-chip category" title="دسته‌بندی"><i class="fas fa-layer-group"></i>${categoryNameSafe}</span>
      <span class="${difficultyMeta.class}" title="سطح دشواری"><i class="fas ${difficultyMeta.icon}"></i>${difficultyMeta.label}</span>
      <span class="${sourceMeta.class}" title="منبع"><i class="fas ${sourceMeta.icon}"></i>${sourceMeta.label}</span>
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

if (updateQuestionBtn) {
  updateQuestionBtn.addEventListener('click', async () => {
    if (!questionDetailModal) return;
    const id = questionDetailModal.dataset?.qId;
    if (!id) {
      showToast('ابتدا یک سوال را انتخاب کنید', 'warning');
      return;
    }
    const textarea = questionDetailForm?.querySelector('[name="question-text"]');
    const text = textarea ? textarea.value.trim() : '';
    const optionInputs = questionOptionsWrapper
      ? Array.from(questionOptionsWrapper.querySelectorAll('[data-option-input]'))
      : [];
    const options = optionInputs.map(input => input.value.trim());
    const selectedRadio = questionOptionsWrapper?.querySelector('input[name="question-correct"]:checked');
    const correctIdx = selectedRadio ? Number(selectedRadio.value) : -1;

    if (!text) {
      showToast('متن سوال را وارد کنید', 'warning');
      return;
    }
    if (options.some(o => !o)) {
      showToast('تمام گزینه‌ها باید تکمیل شوند', 'warning');
      return;
    }
    if (correctIdx < 0) {
      showToast('گزینه صحیح را انتخاب کنید', 'warning');
      return;
    }

    const payload = { text, options, correctIdx };
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
      loadQuestions();
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
  if (!filterCategorySelect) return;
  const previousValue = questionFilters.category || filterCategorySelect.value || '';
  filterCategorySelect.innerHTML = '<option value="">همه دسته‌بندی‌ها</option>';
  let shouldReload = false;
  try {
    const response = await api('/categories?limit=100');
    if (Array.isArray(response.data)) {
      let hasPrevious = false;
      const fragment = document.createDocumentFragment();
      response.data.forEach(cat => {
        if (!cat?._id || !cat.name) return;
        const option = document.createElement('option');
        option.value = cat._id;
        option.textContent = cat.name;
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
  }
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
      if (Object.prototype.hasOwnProperty.call(overrides, 'search')) {
        questionFilters.search = (overrides.search || '').trim();
      }
      if (Object.prototype.hasOwnProperty.call(overrides, 'sort')) {
        const candidate = typeof overrides.sort === 'string' ? overrides.sort : 'newest';
        questionFilters.sort = ['oldest', 'newest'].includes(candidate) ? candidate : 'newest';
      }
    }

    if (filterSortSelect && questionFilters.sort && filterSortSelect.value !== questionFilters.sort) {
      filterSortSelect.value = questionFilters.sort;
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
    if (questionFilters.search) params.append('q', questionFilters.search);
    if (questionFilters.sort) params.append('sort', questionFilters.sort);

    const response = await api(`/questions?${params.toString()}`);
    questionsCache.clear();

    if (!tbody) return;

    if (!Array.isArray(response.data) || response.data.length === 0) {
      const hasFilters = Boolean(questionFilters.category || questionFilters.difficulty || questionFilters.search);
      const emptyMessage = hasFilters
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
        if (id) openQuestionDetailById(id);
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
    showToast('مشکل در دریافت سوالات','error');
  }
}

async function loadUsers() {
  try {
    const u = await api('/users?limit=50');
    const tbody = $('#users-tbody');
    tbody.innerHTML = u.data.map(item => `
      <tr>
        <td>
          <div class="flex items-center gap-2">
            <img src="https://i.pravatar.cc/40?u=${item._id}" class="w-8 h-8 rounded-full" alt="user">
            <span>${item.username}</span>
          </div>
        </td>
        <td>${item.email}</td>
        <td>${(item.score || 0).toLocaleString('fa-IR')}</td>
        <td>${(item.coins || 0).toLocaleString('fa-IR')}</td>
        <td><span class="badge ${item.role==='vip'?'badge-warning':item.role==='admin'?'badge-danger':'badge-info'}">${item.role==='vip'?'VIP':item.role==='admin'?'ادمین':'عادی'}</span></td>
        <td><span class="badge ${item.status==='active'?'badge-success':item.status==='pending'?'badge-warning':'badge-danger'}">${item.status==='active'?'فعال':item.status==='pending'?'در حال بررسی':'مسدود'}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center" data-edit-u="${item._id}">
              <i class="fas fa-edit text-blue-400"></i>
            </button>
            <button class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center" data-del-u="${item._id}">
              <i class="fas fa-ban text-red-400"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    tbody.addEventListener('click', async (e) => {
      const id = e.target.closest('button')?.dataset?.delU;
      if (!id) return;
      if (!confirm('حذف کاربر؟')) return;
      try { await api(`/users/${id}`, { method:'DELETE' }); showToast('حذف شد','success'); loadUsers(); } catch (err){ showToast(err.message,'error'); }
    });
  } catch (e) { showToast('مشکل در دریافت کاربران','error'); }
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
    const key = String(target.dataset.difficulty || '').toLowerCase();
    if (!key) return;
    if (triviaControlState.selectedDifficulties.has(key)) {
      triviaControlState.selectedDifficulties.delete(key);
      target.classList.remove('active');
    } else {
      triviaControlState.selectedDifficulties.add(key);
      target.classList.add('active');
    }
    updateTriviaSummary();
  });
}

if (triviaCategoryListEl) {
  triviaCategoryListEl.addEventListener('click', (event) => {
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
      const payload = {
        amount: triviaControlState.amount,
        categories: Array.from(triviaControlState.selectedCategories),
        difficulties: Array.from(triviaControlState.selectedDifficulties)
      };
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
$('#save-question-btn').addEventListener('click', async () => {
  const m = $('#add-question-modal');
  const text = m.querySelector('textarea').value.trim();
  const selects = m.querySelectorAll('select');
  const categoryName = selects[0].value; // نام دسته از UI؛ برای سادگی در این نسخه، categoryId را خودت از UI تامین کن
  const difficultyFa = selects[1].value;
  const difficulty = difficultyFa === 'آسون' ? 'easy' : difficultyFa === 'متوسط' ? 'medium' : 'hard';
  const opts = Array.from(m.querySelectorAll('input.form-input[type="text"]')).map(x => x.value.trim());
  const correctIdx = Array.from(m.querySelectorAll('input[type="radio"][name="correct-answer"]')).findIndex(r => r.checked);

  if (!text || opts.some(o => !o) || correctIdx < 0) return showToast('ورودی‌ها کامل نیست','warning');

  try {
    // توجه: برای انتخاب دسته‌بندی واقعی باید از لیست دسته‌ها (از API) یک select واقعی با id=categoryId بسازی.
    // اگر الان categoryId را می‌دانی، جایگزین کن:
    const categories = await api('/categories?limit=100');
    const cat = categories.data.find(c => c.name === categoryName) || categories.data[0];
    if (!cat) return showToast('ابتدا یک دسته‌بندی بسازید','warning');

    await api('/questions', {
      method:'POST',
      body: JSON.stringify({ text, options:opts, correctIdx, difficulty, categoryId: cat._id })
    });
    showToast('سوال ذخیره شد','success');
    closeModal('#add-question-modal');
    loadQuestions();
  } catch (e) { showToast(e.message, 'error'); }
});

$('#save-category-btn').addEventListener('click', async () => {
  const m = $('#add-category-modal');
  const name = m.querySelector('input[type="text"]').value.trim();
  const desc = m.querySelector('textarea').value.trim();
  const icon = m.querySelectorAll('select')[0].value;
  const color = m.querySelectorAll('select')[1].value;
  if (!name) return showToast('نام دسته ضروری است','warning');
  try {
    await api('/categories', { method:'POST', body: JSON.stringify({ name, description:desc, icon, color }) });
    showToast('دسته‌بندی ذخیره شد','success');
    closeModal('#add-category-modal');
    await loadCategoryFilterOptions(true);
  } catch (e) { showToast(e.message,'error'); }
});

$('#save-user-btn').addEventListener('click', async () => {
  const m = $('#add-user-modal');
  const username = m.querySelector('input[type="text"]').value.trim();
  const email = m.querySelector('input[type="email"]').value.trim();
  const password = m.querySelector('input[type="password"]').value.trim();
  const roleFa = m.querySelector('select').value;
  const role = roleFa === 'VIP' ? 'vip' : roleFa === 'مدیر' ? 'admin' : 'user';
  if (!username || !email || !password) return showToast('ورودی‌ها کامل نیست','warning');
  try {
    await api('/users', { method:'POST', body: JSON.stringify({ username, email, password, role }) });
    showToast('کاربر ذخیره شد','success');
    closeModal('#add-user-modal');
    loadUsers();
  } catch (e) { showToast(e.message,'error'); }
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

// --------------- INIT ---------------
async function loadAllData() {
  await Promise.all([
    loadDashboardStats(),
    loadCategoryFilterOptions(),
    loadQuestions(),
    loadUsers(),
    loadTriviaCategories()
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

renderTriviaImportResult(triviaControlState.lastResult);
updateTriviaSummary();
updateTriviaControlsAvailability();

// صفحه پیش‌فرض
navigateTo('dashboard');

// اگر توکن داریم، داده‌ها را بگیر
if (getToken()) loadAllData();

