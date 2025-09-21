const API_ENDPOINT = '/api/jservice/random';
const CLIENT_CACHE_LIMIT = 200;
const DEFAULT_COUNT = 5;
const GENERIC_DISTRACTORS = [
  'Mount Everest',
  'Photosynthesis',
  'Alexander Hamilton',
  'The Pacific Ocean',
  'Isaac Newton',
  'Saturn',
  'The Amazon River',
  'The Mona Lisa',
  'Pythagoras',
  'Silicon Valley',
  'Mercury',
  'Neil Armstrong',
];

const PUNCTUATION_REGEX = /[^\p{L}\p{N}\s]/gu;

/** @typedef {{id:number, category:{id:(number|null), title:string, clues_count?:number}|string, question:string, answer:string, airdate:(string|null|undefined), value:(number|null|undefined)}} JServiceClue */
/** @typedef {{id:number, category:string, question:string, options:string[], correctIndex:number}} MultipleChoiceQuestion */

const clueStore = {
  order: [],
  byId: new Map(),
  byCategory: new Map(),
};

function clampCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_COUNT;
  return Math.min(Math.max(parsed, 1), 20);
}

function stripPunctuation(value) {
  return value.replace(PUNCTUATION_REGEX, ' ');
}

function sanitizeOption(value) {
  if (typeof value !== 'string') return '';
  const stripped = stripPunctuation(value);
  const normalized = stripped.replace(/\s+/g, ' ').trim();
  if (normalized) return normalized;
  return value.replace(/\s+/g, ' ').trim();
}

function getCategoryTitle(category) {
  if (typeof category === 'string') {
    return category.trim();
  }
  if (category && typeof category === 'object' && typeof category.title === 'string') {
    return category.title.trim();
  }
  return '';
}

function getCategoryKey(category) {
  const title = getCategoryTitle(category);
  if (!title) return '';
  return title.toLowerCase();
}

function addToStore(clue) {
  const idKey = String(clue.id);
  if (clueStore.byId.has(idKey)) {
    const index = clueStore.order.indexOf(idKey);
    if (index !== -1) {
      clueStore.order.splice(index, 1);
    }
  }
  clueStore.byId.set(idKey, clue);
  clueStore.order.push(idKey);

  const categoryKey = getCategoryKey(clue.category);
  if (categoryKey) {
    let set = clueStore.byCategory.get(categoryKey);
    if (!set) {
      set = new Set();
      clueStore.byCategory.set(categoryKey, set);
    }
    set.add(idKey);
  }

  while (clueStore.order.length > CLIENT_CACHE_LIMIT) {
    const oldestKey = clueStore.order.shift();
    if (!oldestKey) break;
    const existing = clueStore.byId.get(oldestKey);
    clueStore.byId.delete(oldestKey);
    if (existing) {
      const existingCategory = getCategoryKey(existing.category);
      if (existingCategory) {
        const set = clueStore.byCategory.get(existingCategory);
        if (set) {
          set.delete(oldestKey);
          if (set.size === 0) {
            clueStore.byCategory.delete(existingCategory);
          }
        }
      }
    }
  }
}

function updateCache(clues) {
  clues.forEach((clue) => {
    if (clue && typeof clue.id === 'number') {
      addToStore(clue);
    }
  });
}

function gatherCandidateAnswers(clue, correctValue) {
  const correctLower = correctValue.toLowerCase();
  const targetLength = correctValue.length;
  const seen = new Set();
  const sameCategory = [];
  const others = [];
  const categoryKey = getCategoryKey(clue.category);
  const idKey = String(clue.id);
  const sameCategorySet = categoryKey ? clueStore.byCategory.get(categoryKey) : null;
  const addCandidate = (list, answer) => {
    const option = sanitizeOption(answer);
    if (!option) return;
    const normalized = option.toLowerCase();
    if (normalized === correctLower || seen.has(normalized)) return;
    seen.add(normalized);
    list.push({ value: option, weight: Math.abs(option.length - targetLength) });
  };

  if (sameCategorySet) {
    sameCategorySet.forEach((candidateId) => {
      if (candidateId === idKey) return;
      const stored = clueStore.byId.get(candidateId);
      if (!stored) {
        sameCategorySet.delete(candidateId);
        return;
      }
      addCandidate(sameCategory, stored.answer);
    });
    if (sameCategorySet.size === 0) {
      clueStore.byCategory.delete(categoryKey);
    }
  }

  clueStore.byId.forEach((stored, candidateId) => {
    if (candidateId === idKey) return;
    if (sameCategorySet && sameCategorySet.has(candidateId)) return;
    addCandidate(others, stored.answer);
  });

  sameCategory.sort((a, b) => a.weight - b.weight);
  others.sort((a, b) => a.weight - b.weight);

  return sameCategory.concat(others).map((entry) => entry.value);
}

function pickDistractors(clue, correctValue) {
  const candidates = gatherCandidateAnswers(clue, correctValue);
  const distractors = [];

  candidates.some((candidate) => {
    distractors.push(candidate);
    return distractors.length >= 3;
  });

  if (distractors.length < 3) {
    for (const fallback of GENERIC_DISTRACTORS) {
      const sanitized = sanitizeOption(fallback);
      if (!sanitized) continue;
      const normalized = sanitized.toLowerCase();
      if (normalized === correctValue.toLowerCase()) continue;
      if (distractors.some((item) => item.toLowerCase() === normalized)) continue;
      distractors.push(sanitized);
      if (distractors.length >= 3) break;
    }
  }

  while (distractors.length < 3) {
    const filler = `گزینه ${distractors.length + 1}`;
    if (!distractors.includes(filler) && filler !== correctValue) {
      distractors.push(filler);
    } else {
      distractors.push(`انتخاب ${distractors.length + 1}`);
    }
  }

  return distractors;
}

function shuffle(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * @param {JServiceClue} clue
 * @returns {MultipleChoiceQuestion}
 */
function toMultipleChoice(clue) {
  const question = typeof clue.question === 'string' ? clue.question.trim() : '';
  const cleanedAnswer = sanitizeOption(clue.answer);
  const answer = cleanedAnswer || (typeof clue.answer === 'string' ? clue.answer.trim() : '');
  const safeAnswer = answer || 'پاسخ نامشخص';
  const distractors = pickDistractors(clue, safeAnswer);
  const options = shuffle([...distractors, safeAnswer]);
  const correctIndex = options.findIndex((item) => item === safeAnswer);
  const categoryTitle = getCategoryTitle(clue.category);
  return {
    id: clue.id,
    category: categoryTitle || 'عمومی',
    question: question || 'سوال نامشخص',
    options,
    correctIndex: correctIndex === -1 ? options.length - 1 : correctIndex,
  };
}

async function requestRandomClues(count) {
  const response = await fetch(`${API_ENDPOINT}?count=${count}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    const error = new Error(`Failed to load clues (${response.status})`);
    error.status = response.status;
    throw error;
  }
  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    const error = new Error('Failed to parse trivia response');
    error.cause = err;
    throw error;
  }
  const data = Array.isArray(payload?.data) ? payload.data : [];
  updateCache(data);
  return data;
}

/**
 * Fetch MCQ set from server.
 * @param {number} [count=5]
 * @returns {Promise<MultipleChoiceQuestion[]>}
 */
export async function getRandomMCQs(count = DEFAULT_COUNT) {
  const normalizedCount = clampCount(count);
  const clues = await requestRandomClues(normalizedCount);
  return clues.map((clue) => toMultipleChoice(clue));
}

function renderError(root, retry) {
  root.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'glass-dark rounded-3xl border border-rose-400/40 bg-rose-500/10 p-5 text-sm text-white/80 space-y-3';
  const message = document.createElement('p');
  message.textContent = 'امکان دریافت سوال از سرویس جئوپاردی وجود ندارد.';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition';
  button.textContent = 'تلاش مجدد';
  button.addEventListener('click', () => {
    if (typeof retry === 'function') {
      retry();
    }
  });
  card.append(message, button);
  root.append(card);
}

function renderMCQ(mcq, root, refresh) {
  root.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'glass-dark rounded-3xl border border-white/10 p-6 space-y-5 shadow-xl';

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between gap-3 text-xs text-white/70';
  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'px-3 py-1 rounded-full bg-white/10 border border-white/20 font-semibold text-white/90';
  categoryBadge.textContent = mcq.category || 'عمومی';
  header.appendChild(categoryBadge);

  if (typeof refresh === 'function') {
    const refreshButton = document.createElement('button');
    refreshButton.type = 'button';
    refreshButton.className = 'px-3 py-1 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition text-white/90 flex items-center gap-2';
    refreshButton.innerHTML = '<span class="hidden sm:inline">سوال جدید</span><i class="fas fa-sync-alt"></i>';
    refreshButton.addEventListener('click', () => {
      refreshButton.disabled = true;
      refreshButton.classList.add('opacity-60');
      refresh();
    });
    header.appendChild(refreshButton);
  }

  const questionEl = document.createElement('h3');
  questionEl.className = 'text-lg font-extrabold leading-8 text-white';
  questionEl.textContent = mcq.question;

  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'grid grid-cols-1 gap-3';

  const statusEl = document.createElement('p');
  statusEl.className = 'text-sm text-white/80 min-h-[1.5rem]';
  statusEl.setAttribute('role', 'status');
  statusEl.setAttribute('aria-live', 'polite');

  const buttons = [];
  let revealed = false;

  const reveal = (selectedIndex) => {
    if (revealed) return;
    revealed = true;
    buttons.forEach((button, idx) => {
      button.disabled = true;
      button.classList.remove('hover:bg-white/10');
      if (idx === mcq.correctIndex) {
        button.classList.add('border-emerald-400', 'bg-emerald-500/20', 'text-emerald-100');
      } else if (idx === selectedIndex) {
        button.classList.add('border-rose-400', 'bg-rose-500/20', 'text-rose-100');
      } else {
        button.classList.add('opacity-70');
      }
    });
    if (selectedIndex === mcq.correctIndex) {
      statusEl.textContent = 'آفرین! پاسخ درست بود.';
    } else {
      statusEl.textContent = `پاسخ درست: ${mcq.options[mcq.correctIndex]}`;
    }
  };

  mcq.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'flex items-center justify-between gap-3 w-full text-right px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-sky-400';

    const letter = document.createElement('span');
    letter.className = 'w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-semibold text-white/90';
    letter.textContent = String.fromCharCode(65 + index);

    const text = document.createElement('span');
    text.className = 'flex-1 text-sm text-white';
    text.textContent = option;

    button.append(letter, text);
    button.addEventListener('click', () => reveal(index));

    buttons.push(button);
    optionsContainer.appendChild(button);
  });

  card.append(header, questionEl, optionsContainer, statusEl);
  root.append(card);
}

async function loadAndRender(root) {
  root.innerHTML = '<div class="glass-dark rounded-3xl border border-white/10 p-5 text-sm text-white/70">در حال بارگذاری سوال...</div>';
  try {
    const mcqs = await getRandomMCQs();
    const mcq = mcqs[0];
    if (!mcq) {
      const emptyState = document.createElement('div');
      emptyState.className = 'glass-dark rounded-3xl border border-white/10 p-5 text-sm text-white/70';
      emptyState.textContent = 'سوالی یافت نشد. بعداً دوباره تلاش کنید.';
      root.innerHTML = '';
      root.append(emptyState);
      return;
    }
    renderMCQ(mcq, root, () => loadAndRender(root));
  } catch (error) {
    console.error(error);
    renderError(root, () => loadAndRender(root));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('quiz-root');
  if (!root) return;
  loadAndRender(root);
});
