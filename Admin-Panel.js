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

const DIFFICULTY_META = {
  easy:   { label: 'آسون', class: 'meta-chip difficulty-easy', icon: 'fa-feather' },
  medium: { label: 'متوسط', class: 'meta-chip difficulty-medium', icon: 'fa-wave-square' },
  hard:   { label: 'سخت', class: 'meta-chip difficulty-hard', icon: 'fa-fire' }
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

const questionFilters = {
  category: '',
  difficulty: '',
  search: ''
};

let filterSearchDebounce;

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
  const categoryName = raw.category?.name
    || raw.categoryName
    || (typeof raw.category === 'string' ? raw.category : 'بدون دسته‌بندی');
  const categoryId = raw.category?._id || raw.categoryId || '';
  return {
    ...raw,
    options,
    correctIdx,
    categoryName,
    categoryId
  };
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
    questionMetaEl.innerHTML = `
      <span class="meta-chip category" title="دسته‌بندی"><i class="fas fa-layer-group"></i>${categoryNameSafe}</span>
      <span class="${difficultyMeta.class}" title="سطح دشواری"><i class="fas ${difficultyMeta.icon}"></i>${difficultyMeta.label}</span>
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

async function loadQuestions(overrides = {}) {
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
    }

    const params = new URLSearchParams({ limit: '50' });
    if (questionFilters.category) params.append('category', questionFilters.category);
    if (questionFilters.difficulty) params.append('difficulty', questionFilters.difficulty);
    if (questionFilters.search) params.append('q', questionFilters.search);

    const response = await api(`/questions?${params.toString()}`);
    const tbody = $('#questions-tbody');
    questionsCache.clear();
    if (!response.data?.length) {
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="4">
            <div class="empty-state">
              <i class="fas fa-inbox"></i>
              <p>هنوز سوالی ثبت نشده است. از دکمه «افزودن سوال» برای ایجاد سوال جدید استفاده کنید.</p>
            </div>
          </td>
        </tr>
      `;
      tbody.onclick = null;
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
      const derivedAnswer = item.correctAnswer || item.options[item.correctIdx] || '---';
      const answerText = escapeHtml(derivedAnswer);
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
    loadCategoryFilterOptions(),
    loadQuestions(),
    loadUsers()
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

// صفحه پیش‌فرض
navigateTo('dashboard');

// اگر توکن داریم، داده‌ها را بگیر
if (getToken()) loadAllData();

