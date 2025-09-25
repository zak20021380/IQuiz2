import Api from '../../services/api.js';
import { toast } from '../../utils/feedback.js';
import { faNum } from '../../utils/format.js';
import { State, DEFAULT_MAX_QUESTIONS } from '../../state/state.js';
import {
  getActiveCategories,
  getFirstCategory,
  findCategoryById,
  getCategoryDifficultyPool,
  getEffectiveDiffs,
} from '../../state/admin.js';
import { beginQuizSession } from './engine.js';

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
    let list = [];
    if (typeof Api !== 'undefined' && Api && typeof Api.questions === 'function') {
      list = (await Api.questions({
        categoryId,
        categorySlug: catSlug || undefined,
        count,
        difficulty: difficultyValue,
      })) || [];
    }

    if (!Array.isArray(list) || list.length === 0) {
      toast('برای این دسته هنوز سوالی ثبت نشده 😕');
      return false;
    }

    const initialSeenKeys = new Set();
    const uniqueQuestions = mergeUniqueQuestions([], normalizeQuestions(list), initialSeenKeys);

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
          const extraList =
            (await Api.questions({ ...requestParams, count: requestSize })) || [];
          const normalizedExtra = normalizeQuestions(extraList);
          mergeUniqueQuestions(working, normalizedExtra, seen);
        } catch (error) {
          console.warn('Failed to fetch additional questions', error);
          break;
        }
        requestSize = Math.min(requestSize + count, DEFAULT_MAX_QUESTIONS * 3);
      }

      uniqueQuestions.splice(0, uniqueQuestions.length, ...working);
    }

    const finalList = uniqueQuestions.slice(0, Math.min(uniqueQuestions.length, count));

    if (finalList.length === 0) {
      toast('سوال معتبر برای این تنظیمات موجود نیست.');
      return false;
    }

    if (finalList.length < count) {
      toast(`تنها ${faNum(finalList.length)} سوال معتبر برای این تنظیمات یافت شد.`);
    }

    const stateQuizCat = State.quiz?.cat;
    const catTitle = opts.cat != null ? opts.cat : catMeta.title || catMeta.name || stateQuizCat || '—';

    if (State.quiz) {
      State.quiz.catId = categoryId;
      State.quiz.cat = catTitle;
    }

    const started = beginQuizSession({
      cat: catTitle,
      diff: difficultyLabel,
      diffValue: difficultyValue,
      questions: finalList,
      count: finalList.length,
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
