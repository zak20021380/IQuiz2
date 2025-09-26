import Api from '../../services/api.js';
import { toast } from '../../utils/feedback.js';
import { faNum } from '../../utils/format.js';
import { State, DEFAULT_MAX_QUESTIONS } from '../../state/state.js';
import { saveState } from '../../state/persistence.js';
import {
  getActiveCategories,
  getFirstCategory,
  findCategoryById,
  getCategoryDifficultyPool,
  getEffectiveDiffs,
} from '../../state/admin.js';
import { beginQuizSession } from './engine.js';
import { topUpWithFallbackQuestions, getFallbackQuestionPool } from './fallback.js';

function toLowerKey(value) {
  if (value == null) return '';
  const str = String(value).trim();
  return str ? str.toLowerCase() : '';
}

const RECENT_HISTORY_LIMIT = 40;

function shuffleList(list) {
  if (!Array.isArray(list)) return [];
  const shuffled = list.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    if (i === j) continue;
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }
  return shuffled;
}

function randomizeQuestionChoices(question) {
  if (!question || typeof question !== 'object') return question;
  const choices = Array.isArray(question.c) ? question.c.slice() : [];
  if (choices.length < 2 || !Number.isInteger(question.a)) {
    return question;
  }

  const entries = choices.map((choice, index) => ({ choice, index }));
  const shuffledEntries = shuffleList(entries);
  const randomizedChoices = new Array(shuffledEntries.length);
  let answerIndex = -1;

  shuffledEntries.forEach((entry, newIdx) => {
    randomizedChoices[newIdx] = entry.choice;
    if (entry.index === question.a) {
      answerIndex = newIdx;
    }
  });

  if (answerIndex === -1) {
    return question;
  }

  return {
    ...question,
    c: randomizedChoices,
    a: answerIndex,
  };
}

function decorateVariant(question, variantIndex) {
  const base = question || {};
  const baseText = (base.q || base.question || '').toString().trim();
  const variantSuffix = variantIndex > 0 ? ` — نسخه ${variantIndex + 1}` : '';
  return {
    ...base,
    id: `${base.id || base.uid || base.q || 'fallback'}::${variantIndex + 1}`,
    q: baseText ? `${baseText}${variantSuffix}` : `سؤال ${variantIndex + 1}`,
  };
}

function ensureQuestionSupply(list, { count, categoryId, categorySlug, difficulty }) {
  const desired = Math.max(1, Number(count) || 1);
  const poolOptions = { categoryId, categorySlug, difficulty, count: desired };
  const primaryPool = getFallbackQuestionPool(poolOptions);
  const secondaryPool = getFallbackQuestionPool({ count: desired });
  const fallbackPool = primaryPool.length ? primaryPool : secondaryPool;
  const result = Array.isArray(list) ? list.slice() : [];
  const seenIds = new Set();
  const seenTexts = new Set();

  result.forEach((question, index) => {
    const idKey = toLowerKey(question?.id || question?.uid || `client-${index}`);
    const textKey = toLowerKey(question?.q || question?.question || '');
    if (idKey) seenIds.add(idKey);
    if (textKey) seenTexts.add(textKey);
  });

  if (result.length >= desired) {
    return result.slice(0, desired);
  }

  if (!fallbackPool.length) {
    return result;
  }

  let variantIndex = 0;
  const safetyCap = desired * 4;

  while (result.length < desired && variantIndex < safetyCap) {
    const base = fallbackPool[variantIndex % fallbackPool.length];
    if (!base) break;

    let candidate = decorateVariant(base, variantIndex);
    let candidateId = toLowerKey(candidate.id || candidate.uid);
    let candidateText = toLowerKey(candidate.q || candidate.question || '');

    if (candidateId && seenIds.has(candidateId)) {
      candidateId = `${candidateId}-v${variantIndex + 1}`;
      candidate = { ...candidate, id: candidateId };
    }

    if (candidateText && seenTexts.has(candidateText)) {
      const baseText = (candidate.q || candidate.question || '').toString().trim();
      const suffix = variantIndex + 1;
      const revised = baseText ? `${baseText} (سری ${suffix})` : `سؤال ${suffix}`;
      candidateText = revised.toLowerCase();
      candidate = { ...candidate, q: revised };
    }

    if (!candidateText && (candidate.q || candidate.question)) {
      candidateText = toLowerKey(candidate.q || candidate.question);
    }

    if (candidateId && seenIds.has(candidateId)) {
      variantIndex += 1;
      continue;
    }

    if (candidateText && seenTexts.has(candidateText)) {
      variantIndex += 1;
      continue;
    }

    result.push(candidate);
    if (candidateId) seenIds.add(candidateId);
    if (candidateText) seenTexts.add(candidateText);
    variantIndex += 1;
  }

  return result.slice(0, Math.min(result.length, desired));
}

function parseQuestionResponse(payload) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: {
        ok: true,
        countRequested: payload.length,
        countReturned: payload.length,
        totalMatched: payload.length,
        message: ''
      }
    };
  }

  if (payload && typeof payload === 'object') {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const meta = {
      ok: payload.ok !== false,
      countRequested: Number.isFinite(Number(payload.countRequested))
        ? Number(payload.countRequested)
        : items.length,
      countReturned: Number.isFinite(Number(payload.countReturned))
        ? Number(payload.countReturned)
        : items.length,
      totalMatched: Number.isFinite(Number(payload.totalMatched))
        ? Number(payload.totalMatched)
        : 0,
      message: typeof payload.message === 'string' ? payload.message : ''
    };

    if (meta.countRequested <= 0 && items.length) {
      meta.countRequested = items.length;
    }

    return { items, meta };
  }

  return {
    items: [],
    meta: {
      ok: false,
      countRequested: 0,
      countReturned: 0,
      totalMatched: 0,
      message: ''
    }
  };
}

function pickDifficulty(diffPool, { requested, stateValue, stateLabel }) {
  let selected = null;

  const tryMatch = (predicate) => {
    if (selected) return;
    for (let idx = 0; idx < diffPool.length; idx += 1) {
      const diffOpt = diffPool[idx];
      if (diffOpt && predicate(diffOpt)) {
        selected = diffOpt;
        break;
      }
    }
  };

  if (requested != null) {
    tryMatch((diffOpt) => diffOpt.value === requested || diffOpt.label === requested);
  }
  if (!selected && stateValue != null) {
    tryMatch((diffOpt) => diffOpt.value === stateValue);
  }
  if (!selected && stateLabel != null) {
    tryMatch((diffOpt) => diffOpt.label === stateLabel);
  }
  if (!selected) {
    tryMatch((diffOpt) => {
      const valLower = String(diffOpt.value || '').toLowerCase();
      const labelLower = String(diffOpt.label || '').toLowerCase();
      return (
        valLower === 'medium' ||
        valLower === 'normal' ||
        labelLower.includes('متوسط') ||
        labelLower.includes('medium') ||
        labelLower.includes('normal')
      );
    });
  }
  if (!selected && diffPool.length) selected = diffPool[0];
  return selected;
}

export function normalizeQuestions(list) {
  const normalized = [];
  if (!Array.isArray(list)) return normalized;

  for (let i = 0; i < list.length; i += 1) {
    const q = list[i] || {};
    const rawChoices = q.options || q.choices || [];
    const choices = [];

    if (Array.isArray(rawChoices)) {
      for (let j = 0; j < rawChoices.length; j += 1) {
        const opt = rawChoices[j];
        let txt;
        if (typeof opt === 'string') {
          txt = opt;
        } else {
          txt = (opt && (opt.text || opt.title || opt.value)) || '';
        }
        txt = (txt == null ? '' : String(txt)).trim();
        choices.push(txt);
      }
    }

    let answerIdx;
    if (typeof q.answerIndex === 'number') {
      answerIdx = q.answerIndex;
    } else if (typeof q.answerIndex === 'string') {
      const parsed = Number.parseInt(q.answerIndex.trim(), 10);
      if (Number.isFinite(parsed)) {
        answerIdx = parsed;
      }
    }

    if (typeof answerIdx !== 'number' && typeof q.correctIdx === 'number') {
      answerIdx = q.correctIdx;
    } else if (typeof answerIdx !== 'number' && typeof q.correctIdx === 'string') {
      const parsed = Number.parseInt(q.correctIdx.trim(), 10);
      if (Number.isFinite(parsed)) {
        answerIdx = parsed;
      }
    }

    if (typeof answerIdx !== 'number' && typeof q.correctIndex === 'number') {
      answerIdx = q.correctIndex;
    } else if (typeof answerIdx !== 'number' && typeof q.correctIndex === 'string') {
      const parsed = Number.parseInt(q.correctIndex.trim(), 10);
      if (Number.isFinite(parsed)) {
        answerIdx = parsed;
      }
    }

    if (typeof answerIdx !== 'number' && Array.isArray(rawChoices)) {
      let found = -1;
      for (let k = 0; k < rawChoices.length; k += 1) {
        const ro = rawChoices[k];
        if (ro && typeof ro === 'object' && ro.correct === true) {
          found = k;
          break;
        }
      }
      answerIdx = found;
    }

    if (typeof answerIdx !== 'number') {
      answerIdx = -1;
    }

    const qq = ((q.text || q.title || '') + '').trim();
    let valid = qq && Array.isArray(choices) && choices.length >= 2;

    if (valid) {
      for (let e = 0; e < choices.length; e += 1) {
        if (!choices[e]) {
          valid = false;
          break;
        }
      }
    }

    let questionSource = '';
    if (q && typeof q.source === 'string') questionSource = q.source;
    else if (q && typeof q.provider === 'string') questionSource = q.provider;
    questionSource = questionSource ? String(questionSource).toLowerCase() : 'manual';

    let authorNameValue = '';
    if (q && typeof q.authorName === 'string') authorNameValue = q.authorName.trim();
    else if (q && typeof q.author === 'string') authorNameValue = q.author.trim();
    else if (q && typeof q.createdByName === 'string') authorNameValue = q.createdByName.trim();
    else if (q && typeof q.submittedByName === 'string') authorNameValue = q.submittedByName.trim();

    const questionId = [q?.publicId, q?.uid, q?.id]
      .map((candidate) => {
        if (candidate == null) return '';
        const value = String(candidate).trim();
        return value;
      })
      .find((value) => value.length > 0) || '';

    if (valid && typeof answerIdx === 'number' && answerIdx >= 0 && answerIdx < choices.length) {
      normalized.push({ q: qq, c: choices, a: answerIdx, authorName: authorNameValue, source: questionSource, id: questionId });
    }
  }

  return normalized;
}

function createQuestionKey(question) {
  if (!question || typeof question !== 'object') return '';
  const candidates = [
    question.id,
    question.publicId,
    question.uid,
    question.q,
    question.text,
    question.title,
  ];

  for (let i = 0; i < candidates.length; i += 1) {
    const value = candidates[i];
    if (value == null) continue;
    const str = String(value).trim();
    if (str) {
      return str.toLowerCase();
    }
  }

  return '';
}

function getHistoryKey(question) {
  return createQuestionKey(question) || toLowerKey(question?.q || question?.question || question?.text || '');
}

function prioritizeFreshQuestions(list, desiredCount) {
  const history = Array.isArray(State.quiz?.recentQuestions) ? State.quiz.recentQuestions : [];
  const historySet = new Set(history);
  const fresh = [];
  const reused = [];

  (Array.isArray(list) ? list : []).forEach((question) => {
    const key = getHistoryKey(question);
    if (key && historySet.has(key)) {
      reused.push(question);
    } else {
      fresh.push(question);
    }
  });

  const result = fresh.concat(reused);
  if (!Number.isInteger(desiredCount) || desiredCount <= 0) {
    return result;
  }
  return result.slice(0, desiredCount);
}

function updateRecentQuestionHistory(questions) {
  if (!Array.isArray(State.quiz.recentQuestions)) {
    State.quiz.recentQuestions = [];
  }

  const history = State.quiz.recentQuestions.slice();

  (Array.isArray(questions) ? questions : []).forEach((question) => {
    const key = getHistoryKey(question);
    if (!key) return;
    const idx = history.indexOf(key);
    if (idx !== -1) {
      history.splice(idx, 1);
    }
    history.push(key);
  });

  State.quiz.recentQuestions = history.slice(-RECENT_HISTORY_LIMIT);
  saveState();
}

function mergeUniqueQuestions(target, incoming, seenKeys) {
  if (!Array.isArray(incoming)) return target;

  for (let idx = 0; idx < incoming.length; idx += 1) {
    const question = incoming[idx];
    if (!question || typeof question !== 'object') continue;
    const key = createQuestionKey(question) || `anon-${target.length}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    target.push(question);
  }

  return target;
}

function getConsecutiveCheckKey(question) {
  if (!question || typeof question !== 'object') return '';
  const primary = createQuestionKey(question);
  if (primary) return primary;
  const fallbackText = question.q || question.question || question.text || question.title || '';
  return toLowerKey(fallbackText);
}

function preventConsecutiveRepeats(list) {
  if (!Array.isArray(list)) return [];
  if (list.length < 2) return list.slice();

  const working = list.slice();
  let prevKey = getConsecutiveCheckKey(working[0]);

  for (let idx = 1; idx < working.length; idx += 1) {
    let currentKey = getConsecutiveCheckKey(working[idx]);

    if (prevKey && currentKey && currentKey === prevKey) {
      let swapIndex = -1;
      for (let j = idx + 1; j < working.length; j += 1) {
        const candidateKey = getConsecutiveCheckKey(working[j]);
        if (!prevKey || candidateKey !== prevKey) {
          swapIndex = j;
          break;
        }
      }

      if (swapIndex !== -1) {
        const temp = working[idx];
        working[idx] = working[swapIndex];
        working[swapIndex] = temp;
        currentKey = getConsecutiveCheckKey(working[idx]);
        if (prevKey && currentKey && currentKey === prevKey) {
          working.splice(idx, 1);
          idx -= 1;
          continue;
        }
      } else {
        working.splice(idx, 1);
        idx -= 1;
        continue;
      }
    }

    prevKey = currentKey || '';
  }

  return working;
}

export async function startQuizFromAdmin(arg) {
  if (typeof Event !== 'undefined' && arg instanceof Event) {
    try {
      arg.preventDefault();
    } catch (_) {}
    arg = null;
  }

  const opts = arg && typeof arg === 'object' ? arg : {};
  const rangeEl = typeof document !== 'undefined' ? document.getElementById('range-count') : null;
  const rangeVal = rangeEl ? rangeEl.value || rangeEl.getAttribute('value') : null;
  const requestedRaw = (opts.count != null ? Number(opts.count) : Number(rangeVal || 5)) || 5;
  const minCount = 3;
  const maxAllowed = Math.max(minCount, Number(State.quiz?.maxQuestions) || DEFAULT_MAX_QUESTIONS);
  const count = Math.max(minCount, Math.min(maxAllowed, requestedRaw));
  if (rangeEl) {
    rangeEl.value = String(count);
    try {
      rangeEl.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (_) {
      /* ignore */
    }
  }

  const firstCategory = getActiveCategories()[0] || getFirstCategory();
  const categoryId =
    opts.categoryId != null ? opts.categoryId : State.quiz?.catId != null ? State.quiz.catId : firstCategory?.id;

  if (!categoryId) {
    toast('دسته‌ای یافت نشد.');
    return false;
  }

  const catObj = findCategoryById(categoryId) || null;
  const diffPoolRaw = getCategoryDifficultyPool(catObj);
  const diffPool = Array.isArray(diffPoolRaw) && diffPoolRaw.length ? diffPoolRaw : getEffectiveDiffs();
  const fallbackCat = firstCategory || null;
  const catMeta = catObj || fallbackCat || {};
  const catSlug = (catObj?.slug || catMeta?.slug || fallbackCat?.slug || firstCategory?.slug || '') || null;

  const selectedDiff = pickDifficulty(diffPool, {
    requested: opts.difficulty,
    stateValue: State.quiz?.diffValue,
    stateLabel: State.quiz?.diff,
  });

  const difficultyValue = selectedDiff ? selectedDiff.value : undefined;
  const difficultyLabel = selectedDiff ? selectedDiff.label || selectedDiff.value : undefined;

  if (selectedDiff) {
    State.quiz.diffValue = difficultyValue;
    State.quiz.diff = difficultyLabel || State.quiz.diff || '—';
  }

  const startBtn = typeof document !== 'undefined' ? document.getElementById('setup-start') : null;
  const prevDisabled = startBtn ? !!startBtn.disabled : null;
  if (startBtn) startBtn.disabled = true;

  try {
    let initialResponse = null;
    if (typeof Api !== 'undefined' && Api && typeof Api.questions === 'function') {
      initialResponse = await Api.questions({
        categoryId,
        categorySlug: catSlug || undefined,
        count,
        difficulty: difficultyValue,
      });
    }

    const { items: initialItems, meta: initialMeta } = parseQuestionResponse(initialResponse);
    const fallbackMessage = initialMeta.message || 'سؤال تازه‌ای برای این دسته پیدا نشد؛ از مجموعهٔ پیش‌فرض استفاده می‌کنیم.';
    console.log('[quiz] requested=', count, 'received=', initialItems.length, initialMeta);

    const initialSeenKeys = new Set();
    const normalizedInitial = normalizeQuestions(initialItems);
    const uniqueQuestions = mergeUniqueQuestions([], normalizedInitial, initialSeenKeys);

    const requestParams = {
      categoryId,
      categorySlug: catSlug || undefined,
      difficulty: difficultyValue,
    };

    if (uniqueQuestions.length < count) {
      const seen = new Set(initialSeenKeys);
      const working = [...uniqueQuestions];
      const maxAttempts = 3;
      let attempt = 0;
      let requestSize = Math.max(count + 2, Math.min(DEFAULT_MAX_QUESTIONS * 2, count * 2));

      while (working.length < count && attempt < maxAttempts) {
        attempt += 1;
        try {
          const extraResponse = await Api.questions({ ...requestParams, count: requestSize });
          const { items: extraItems, meta: extraMeta } = parseQuestionResponse(extraResponse);
          console.log('[quiz] refill requested=', requestSize, 'received=', extraItems.length, extraMeta);
          if (!extraItems.length) {
            if (extraMeta && extraMeta.ok === false) {
              break;
            }
            if (!extraMeta || extraMeta.countReturned === 0) {
              break;
            }
          }
          const normalizedExtra = normalizeQuestions(extraItems);
          mergeUniqueQuestions(working, normalizedExtra, seen);
        } catch (error) {
          console.warn('Failed to fetch additional questions', error);
          break;
        }
        requestSize = Math.min(requestSize + count, DEFAULT_MAX_QUESTIONS * 3);
      }

      uniqueQuestions.splice(0, uniqueQuestions.length, ...working);
    }

    const supplemented = topUpWithFallbackQuestions(uniqueQuestions, {
      count,
      categoryId,
      categorySlug: catSlug || undefined,
      difficulty: difficultyValue,
    });

    uniqueQuestions.splice(0, uniqueQuestions.length, ...supplemented);

    const filledList = ensureQuestionSupply(uniqueQuestions, {
      count,
      categoryId,
      categorySlug: catSlug || undefined,
      difficulty: difficultyValue,
    });

    let finalList = filledList.slice(0, Math.min(filledList.length, count));
    finalList = prioritizeFreshQuestions(finalList, count);
    finalList = shuffleList(finalList);
    finalList = preventConsecutiveRepeats(finalList);
    finalList = finalList.slice(0, Math.min(finalList.length, count));
    const preparedQuestions = finalList.map((question) => randomizeQuestionChoices(question));
    console.log('[quiz] finalQuestions=', preparedQuestions.length);

    if (preparedQuestions.length === 0) {
      toast(fallbackMessage);
      return false;
    }

    if (preparedQuestions.length < count) {
      toast(`تنها ${faNum(preparedQuestions.length)} سوال معتبر برای این تنظیمات یافت شد.`);
    }

    const stateQuizCat = State.quiz?.cat;
    const catTitle = opts.cat != null ? opts.cat : catMeta.title || catMeta.name || stateQuizCat || '—';

    if (State.quiz) {
      State.quiz.catId = categoryId;
      State.quiz.cat = catTitle;
    }

    updateRecentQuestionHistory(preparedQuestions);

    const started = beginQuizSession({
      cat: catTitle,
      diff: difficultyLabel,
      diffValue: difficultyValue,
      questions: preparedQuestions,
      count: preparedQuestions.length,
      source: opts.source != null ? opts.source : 'setup',
    });

    return !!started;
  } catch (err) {
    if (typeof console !== 'undefined' && console && console.warn) {
      console.warn('Failed to fetch questions', err);
    }
    toast('دریافت سوالات با خطا مواجه شد');
    return false;
  } finally {
    if (startBtn) startBtn.disabled = prevDisabled != null ? prevDisabled : false;
  }
}
