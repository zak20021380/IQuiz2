// --------------- CONFIG ---------------
const API_BASE = 'http://localhost:4000/api'; // در پروDUCTION دامنه‌ات را بده
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

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
function closeModal(modalId) { $(modalId).classList.remove('active'); document.body.style.overflow = 'auto'; }
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

// --------------- LOADERS ---------------
async function loadQuestions() {
  try {
    const q = await api('/questions?limit=50');
    const tbody = $('#questions-tbody');
    tbody.innerHTML = q.data.map(item => `
      <tr>
        <td>${item._id.slice(-6)}</td>
        <td>${item.text}</td>
        <td>${item.category?.name || '-'}</td>
        <td>${item.difficulty === 'easy' ? 'آسون' : item.difficulty === 'medium' ? 'متوسط' : 'سخت'}</td>
        <td><span class="badge ${item.active ? 'badge-success' : 'badge-danger'}">${item.active ? 'فعال' : 'غیرفعال'}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center" data-edit-q="${item._id}">
              <i class="fas fa-edit text-blue-400"></i>
            </button>
            <button class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center" data-del-q="${item._id}">
              <i class="fas fa-trash text-red-400"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    // حذف
    tbody.addEventListener('click', async (e) => {
      const id = e.target.closest('button')?.dataset?.delQ;
      if (!id) return;
      if (!confirm('حذف سوال؟')) return;
      try { await api(`/questions/${id}`, { method:'DELETE' }); showToast('حذف شد','success'); loadQuestions(); } catch (err){ showToast(err.message,'error'); }
    });
  } catch (e) { showToast('مشکل در دریافت سوالات','error'); }
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
  await Promise.all([loadQuestions(), loadUsers()]);
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

