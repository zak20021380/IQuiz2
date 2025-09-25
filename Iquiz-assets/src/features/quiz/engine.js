import { $, $$ } from '../../utils/dom.js';
import { faNum } from '../../utils/format.js';
import { toast, SFX } from '../../utils/feedback.js';
import { State, spendKeys } from '../../state/state.js';
import { saveState } from '../../state/persistence.js';

const LIFELINE_COST = 3;

const defaultDeps = {
  renderTopBars: () => {},
  resetTimer: () => {},
  selectAnswer: () => {},
  nextQuestion: () => {},
  addExtraTime: () => {},
  logEvent: () => {},
};

let deps = { ...defaultDeps };

export function configureQuizEngine(config = {}) {
  deps = { ...deps, ...config };
}

function normalizeIndex(value) {
  if (typeof value !== 'number') return NaN;
  return Number.isInteger(value) ? value : Math.floor(value);
}

export function isValidQuestion(question) {
  if (!question || typeof question !== 'object') return false;
  const text = typeof question.q === 'string' ? question.q.trim() : '';
  if (!text) return false;
  const choices = Array.isArray(question.c) ? question.c : [];
  if (choices.length < 2) return false;
  if (!choices.every((choice) => typeof choice === 'string' && choice.trim().length > 0)) {
    return false;
  }
  const correctIndex = normalizeIndex(question.a);
  if (!Number.isInteger(correctIndex)) return false;
  if (correctIndex < 0 || correctIndex >= choices.length) return false;
  return true;
}

function callDependency(key, ...args) {
  const fn = deps?.[key];
  if (typeof fn === 'function') {
    return fn(...args);
  }
  return undefined;
}

function animateKeyChip() {
  const chip = $('#lives')?.closest('.chip');
  if (!chip) return;
  chip.classList.remove('attention');
  void chip.offsetWidth;
  chip.classList.add('attention');
  setTimeout(() => chip.classList.remove('attention'), 650);
}

export function updateLifelineStates() {
  const hasKeys = State.lives >= LIFELINE_COST;
  ['life-5050', 'life-skip', 'life-pause'].forEach((id) => {
    const btn = $('#' + id);
    if (!btn) return;
    if (btn.disabled) {
      btn.dataset.insufficient = 'false';
      const costEl = btn.querySelector('.lifeline-cost');
      if (costEl) costEl.classList.remove('not-enough');
      return;
    }
    btn.dataset.insufficient = hasKeys ? 'false' : 'true';
    const costEl = btn.querySelector('.lifeline-cost');
    if (costEl) costEl.classList.toggle('not-enough', !hasKeys);
  });
}

export function spendLifelineCost() {
  if (State.lives < LIFELINE_COST) {
    toast(`برای استفاده از این قابلیت به ${faNum(LIFELINE_COST)} کلید نیاز داری`);
    animateKeyChip();
    return false;
  }
  spendKeys(LIFELINE_COST);
  callDependency('renderTopBars');
  saveState();
  animateKeyChip();
  return true;
}

export function markLifelineUsed(id) {
  const btn = typeof id === 'string' ? $('#' + id) : id;
  if (!btn) return;
  btn.disabled = true;
  btn.dataset.used = 'true';
  btn.dataset.insufficient = 'false';
  const costEl = btn.querySelector('.lifeline-cost');
  if (costEl) {
    costEl.classList.remove('not-enough');
    costEl.classList.add('hidden');
  }
  const statusEl = btn.querySelector('.lifeline-status');
  if (statusEl) statusEl.classList.remove('hidden');
  updateLifelineStates();
}

export function resetLifelinesUI() {
  ['life-5050', 'life-skip', 'life-pause'].forEach((id) => {
    const btn = $('#' + id);
    if (!btn) return;
    btn.disabled = false;
    btn.dataset.used = 'false';
    btn.dataset.insufficient = 'false';
    const costEl = btn.querySelector('.lifeline-cost');
    if (costEl) {
      costEl.classList.remove('hidden', 'not-enough');
    }
    const statusEl = btn.querySelector('.lifeline-status');
    if (statusEl) {
      statusEl.classList.add('hidden');
    }
  });
  updateLifelineStates();
}

let used5050 = false;
let usedSkip = false;
let usedTimeBoost = false;

function resetLifelineUsage() {
  used5050 = false;
  usedSkip = false;
  usedTimeBoost = false;
}

export function life5050() {
  if (used5050) {
    toast('۵۰–۵۰ را قبلاً استفاده کردی 😅');
    return;
  }
  const current = State.quiz.list[State.quiz.idx];
  if (!isValidQuestion(current)) {
    toast('این سؤال برای ۵۰–۵۰ معتبر نیست. به سؤال بعدی می‌رویم.');
    callDependency('nextQuestion');
    return;
  }
  if (!spendLifelineCost()) return;
  used5050 = true;
  markLifelineUsed('life-5050');
  const correct = current.a;
  const idxs = [0, 1, 2, 3]
    .filter((i) => i !== correct)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);
  idxs.forEach((i) => {
    const el = $$('#choices .choice')[i];
    if (el) {
      el.style.opacity = 0.35;
      el.style.pointerEvents = 'none';
    }
  });
  toast('<i class="fas fa-percent ml-1"></i> دو گزینه حذف شد');
  SFX.coin();
}

export function lifeSkip() {
  if (usedSkip) {
    toast('پرش فقط یک‌بار مجازه');
    return;
  }
  const cur = State.quiz.list[State.quiz.idx];
  if (!isValidQuestion(cur)) {
    toast('سؤال فعلی معتبر نبود و رد شد.');
    callDependency('nextQuestion');
    return;
  }
  if (!spendLifelineCost()) return;
  usedSkip = true;
  markLifelineUsed('life-skip');
  clearInterval(State.quiz.timer);
  State.quiz.results.push({ q: cur.q, ok: false, correct: cur.c[cur.a], you: '— (پرش)' });
  saveState();
  toast('<i class="fas fa-forward ml-1"></i> به سؤال بعدی رفتی');
  callDependency('nextQuestion');
  SFX.coin();
}

export function lifePause() {
  if (usedTimeBoost) {
    toast('فقط یک‌بار می‌توانی زمان اضافه کنی');
    return;
  }
  if (!spendLifelineCost()) return;
  usedTimeBoost = true;
  markLifelineUsed('life-pause');
  callDependency('addExtraTime', 10);
  saveState();
  toast(`<i class="fas fa-stopwatch ml-1"></i> ${faNum(10)} ثانیه به زمانت اضافه شد`);
  SFX.coin();
}

export function renderQuestionUI(q) {
  const questionValid = isValidQuestion(q);
  const catLabel = State.quiz.cat || q.cat || '—';
  const diffLabel = State.quiz.diff || q.diff || '—';
  $('#quiz-cat').innerHTML = `<i class="fas fa-folder ml-1"></i> ${catLabel}`;
  $('#quiz-diff').innerHTML = `<i class="fas fa-signal ml-1"></i> ${diffLabel}`;
  $('#qnum').textContent = faNum(Math.min(State.quiz.idx + 1, Math.max(1, State.quiz.list.length)));
  $('#qtotal').textContent = faNum(State.quiz.list.length);
  const codeChip = $('#quiz-code');
  const codeValueEl = $('#quiz-code-value');
  if (codeChip && codeValueEl) {
    const codeValue = (q.id || '').toString().trim();
    if (codeValue) {
      codeValueEl.textContent = codeValue;
      codeChip.classList.remove('hidden');
    } else {
      codeValueEl.textContent = '—';
      codeChip.classList.add('hidden');
    }
  }
  $('#question').textContent = questionValid ? q.q : 'سؤال معتبر در دسترس نیست.';
  const authorWrapper = $('#question-author');
  const authorNameEl = $('#question-author-name');
  if (authorWrapper && authorNameEl) {
    const sourceKey = (q?.source || '').toString().toLowerCase();
    let authorDisplay = (q?.authorName || '').toString().trim();
    if (!authorDisplay) {
      authorDisplay = sourceKey === 'community' ? 'قهرمان ناشناس' : 'تیم محتوایی IQuiz';
    }
    authorNameEl.textContent = authorDisplay;
    const authorLabelEl = authorWrapper.querySelector('[data-author-text]');
    if (authorLabelEl) {
      authorLabelEl.textContent = sourceKey === 'community'
        ? 'پیشنهاد جامعه آیکوئیز'
        : 'منتشر شده توسط تیم محتوا';
    }
    const authorIconEl = authorWrapper.querySelector('[data-author-icon]');
    if (authorIconEl) {
      authorIconEl.className = sourceKey === 'community'
        ? 'fas fa-user-astronaut text-lg'
        : 'fas fa-shield-heart text-lg';
    }
    const badgeEl = authorWrapper.querySelector('[data-author-badge]');
    if (badgeEl) {
      if (sourceKey === 'community') {
        badgeEl.style.background = 'linear-gradient(135deg, rgba(251,191,36,0.9), rgba(249,115,22,0.8))';
        badgeEl.style.color = '#0f172a';
      } else {
        badgeEl.style.background = 'linear-gradient(135deg, rgba(94,234,212,0.85), rgba(59,130,246,0.78))';
        badgeEl.style.color = '#0f172a';
      }
    }
    authorWrapper.classList.remove('hidden');
  }
  const box = $('#choices');
  if (box) box.innerHTML = '';
  if (!questionValid) {
    const warning = document.createElement('div');
    warning.className = 'text-sm text-white/70 bg-white/5 border border-white/10 rounded-2xl px-4 py-3';
    warning.textContent = 'سؤال معتبر یافت نشد. به سؤال بعدی می‌رویم.';
    box?.appendChild(warning);
    setTimeout(() => callDependency('nextQuestion'), 400);
    return;
  }
  q.c.forEach((txt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.setAttribute('aria-label', 'گزینه ' + faNum(idx + 1));
    btn.innerHTML = `<span class="chip">${faNum(idx + 1)}</span><span>${txt}</span>`;
    btn.addEventListener('click', () => callDependency('selectAnswer', idx));
    box?.appendChild(btn);
  });
}

export function beginQuizSession({ cat, diff, diffValue, questions, count, source }) {
  if (!Array.isArray(questions) || questions.length === 0) return false;

  const sanitized = questions.filter(isValidQuestion);
  if (sanitized.length === 0) return false;

  resetLifelineUsage();
  resetLifelinesUI();

  State.quiz.cat = cat || State.quiz.cat || '—';
  if (diff != null) {
    State.quiz.diff = diff || 'آسان';
  } else if (!State.quiz.diff) {
    State.quiz.diff = 'آسان';
  }
  if (diffValue != null) {
    State.quiz.diffValue = diffValue;
  } else if (State.quiz.diffValue == null && typeof State.quiz.diff === 'string') {
    const diffLabelLower = State.quiz.diff.toLowerCase();
    if (State.quiz.diff.indexOf('سخت') >= 0 || diffLabelLower === 'hard') {
      State.quiz.diffValue = 'hard';
    } else if (State.quiz.diff.indexOf('متوسط') >= 0 || diffLabelLower === 'medium' || diffLabelLower === 'normal') {
      State.quiz.diffValue = 'medium';
    } else {
      State.quiz.diffValue = 'easy';
    }
  }
  State.quiz.list = sanitized.map((q) => ({
    ...q,
    cat: State.quiz.cat,
    diff: State.quiz.diff,
    diffValue: State.quiz.diffValue,
  }));
  State.quiz.idx = 0;
  State.quiz.sessionEarned = 0;
  State.quiz.results = [];
  State.quiz.inProgress = true;
  State.quiz.answered = false;
  State.quiz.correctStreak = 0;

  callDependency('renderTopBars');
  renderQuestionUI(State.quiz.list[0]);

  callDependency('resetTimer');

  if (State.duelOpponent) {
    $('#duel-opponent-name').textContent = State.duelOpponent.name;
    $('#duel-banner').classList.remove('hidden');
  } else {
    $('#duel-banner').classList.add('hidden');
  }

  callDependency('logEvent', 'quiz_start', {
    category: State.quiz.cat,
    difficulty: State.quiz.diff,
    difficulty_value: State.quiz.diffValue,
    questionCount: count || State.quiz.list.length,
    source,
  });

  return true;
}

export { LIFELINE_COST };
