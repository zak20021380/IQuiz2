import Api from '../../services/api.js';
import { RemoteConfig, patchPricingKeys } from '../../config/remote-config.js';
import { enforceStaticCategoryList, STATIC_CATEGORY_DEFINITIONS } from '../../config/categories.js';
import {
  Admin,
  DEFAULT_DIFFS,
  getAdminCategories,
  getActiveCategories,
  getFirstCategory,
  getEffectiveDiffs,
  getCategoryDifficultyPool
} from '../../state/admin.js';
import { State } from '../../state/state.js';
import { $$ } from '../../utils/dom.js';
import { faNum } from '../../utils/format.js';

function normalizeDifficultyLabel(raw) {
  if (raw == null) return null;
  let txt = '';
  if (typeof raw === 'string' || typeof raw === 'number') {
    txt = String(raw);
  } else if (typeof raw === 'object') {
    if (Array.isArray(raw)) {
      txt = raw.join(',');
    } else if ('label' in raw && raw.label) {
      txt = raw.label;
    } else if ('title' in raw && raw.title) {
      txt = raw.title;
    } else if ('name' in raw && raw.name) {
      txt = raw.name;
    } else if ('value' in raw && raw.value) {
      txt = raw.value;
    } else {
      const truthyKeys = Object.keys(raw).filter(k => raw[k] === true);
      if (truthyKeys.length) txt = truthyKeys.join(',');
    }
  }

  txt = (txt || '').trim();
  if (!txt) return null;

  const map = {
    easy: 'آسان',
    medium: 'متوسط',
    normal: 'متوسط',
    hard: 'سخت',
    difficult: 'سخت',
    harder: 'سخت',
    hardest: 'سخت',
    beginner: 'مبتدی',
    advanced: 'پیشرفته'
  };
  const key = txt.toLowerCase();
  return map[key] || txt;
}

function extractDifficultyList(src) {
  const seen = new Set();
  const result = [];

  const add = (valueRaw, labelRaw) => {
    let value = (valueRaw == null ? '' : String(valueRaw)).trim();
    let label = normalizeDifficultyLabel(labelRaw != null ? labelRaw : valueRaw);
    if (!label && value) label = normalizeDifficultyLabel(value) || value;
    if (!value && label) value = String(label).trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ value, label: label || value });
  };

  const handle = (item) => {
    if (item == null) return;
    if (Array.isArray(item)) {
      item.forEach(handle);
      return;
    }
    if (typeof item === 'string' || typeof item === 'number') {
      const parts = String(item).split(/[،,|/\\]+/);
      parts.forEach((part) => {
        const trimmed = part.trim();
        if (trimmed) add(trimmed, trimmed);
      });
      return;
    }
    if (typeof item === 'object') {
      if ('value' in item || 'label' in item) {
        add(item.value, item.label);
      } else {
        Object.keys(item).forEach((key) => {
          if (item[key]) add(key, key);
        });
      }
    }
  };

  handle(src);
  return result;
}

function deepApply(target, src) {
  if (!src || typeof src !== 'object') return target;
  for (const k of Object.keys(src)) {
    const v = src[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      target[k] = target[k] || {};
      deepApply(target[k], v);
    } else target[k] = v;
  }
  return target;
}

function updateCommunityCorrectPreview() {
  const preview = document.getElementById('community-correct-preview');
  const wrapper = document.getElementById('community-options');
  if (!preview || !wrapper) return;
  const selected = wrapper.querySelector('input[name="community-correct"]:checked');
  if (!selected) {
    preview.textContent = '---';
    return;
  }
  const idx = Number(selected.value);
  const input = wrapper.querySelector(`[data-option-index="${idx}"]`);
  const value = input ? input.value.trim() : '';
  preview.textContent = value || '---';
}

export async function initFromAdmin() {
  const [cfg, catList, provinces] = await Promise.all([
    Api.config().catch(() => null),
    Api.categories().catch(() => []),
    Api.provinces().catch(() => [])
  ]);

  if (cfg && typeof cfg === 'object') {
    deepApply(RemoteConfig, cfg);
    patchPricingKeys(RemoteConfig);
  }

  const rawCategories = Array.isArray(catList) ? catList.filter((c) => c?.isActive !== false) : [];
  const normalizedCategories = enforceStaticCategoryList(rawCategories);
  const sourceCategories = normalizedCategories.length
    ? normalizedCategories
    : enforceStaticCategoryList(STATIC_CATEGORY_DEFINITIONS);

  Admin.categories = sourceCategories.map((cat) => {
    const parsed = extractDifficultyList(cat?.difficulties ?? cat?.difficulty);
    const diffs = Array.isArray(parsed) && parsed.length
      ? parsed.map((d) => ({ value: d.value, label: d.label }))
      : DEFAULT_DIFFS.map((d) => ({ value: d.value, label: d.label }));
    return { ...cat, difficulties: diffs, isActive: cat?.isActive !== false };
  });

  const diffMap = new Map();
  Admin.categories.forEach((cat) => {
    if (Array.isArray(cat?.difficulties)) {
      cat.difficulties.forEach((diff) => {
        if (!diff || diff.value == null) return;
        const key = String(diff.value).toLowerCase();
        if (!diffMap.has(key)) diffMap.set(key, { value: diff.value, label: diff.label });
      });
    }
  });
  if (diffMap.size === 0) {
    DEFAULT_DIFFS.forEach((diff) => diffMap.set(diff.value.toLowerCase(), { value: diff.value, label: diff.label }));
  }
  Admin.diffs = Array.from(diffMap.values());

  if (Array.isArray(provinces) && provinces.length) {
    State.provinces = provinces.map((p) => ({
      name: p.name || p,
      score: p.score || 0,
      members: p.members || 0,
      region: p.region || p.area || ''
    }));
  }

  return {
    config: RemoteConfig,
    categories: Admin.categories,
    diffs: Admin.diffs,
    provinces: State.provinces
  };
}

export function buildSetupFromAdmin() {
  const catWrap = document.getElementById('cat-wrap');
  const diffWrap = document.getElementById('diff-wrap');
  if (!catWrap || !diffWrap) return;

  const categories = getAdminCategories();
  const fallbackDiffs = getEffectiveDiffs();

  const firstCat = getActiveCategories()[0] || getFirstCategory();
  const catExists = categories.some((c) => c && c.id === State.quiz.catId);
  if (!catExists) {
    State.quiz.catId = firstCat?.id || null;
  }
  const activeCat = categories.find((c) => c && c.id === State.quiz.catId) || firstCat || null;
  if (activeCat) {
    State.quiz.cat = activeCat.title || activeCat.name || `دسته ${categories.indexOf(activeCat) + 1}`;
  } else if (!State.quiz.cat) {
    State.quiz.cat = '—';
  }

  const diffForCat = (cat) => getCategoryDifficultyPool(cat) || fallbackDiffs;

  const selectDiffOption = (opt) => {
    if (opt) {
      State.quiz.diff = opt.label || opt.value || '—';
      State.quiz.diffValue = opt.value || opt.label || null;
    } else {
      State.quiz.diff = '—';
      State.quiz.diffValue = null;
    }
  };

  const updateCatLabel = () => {
    const catLabel = document.getElementById('quiz-cat');
    if (catLabel) {
      catLabel.innerHTML = `<i class="fas fa-folder ml-1"></i> ${State.quiz.cat || '—'}`;
    }
  };

  const updateDiffLabel = () => {
    const diffLabel = document.getElementById('quiz-diff');
    if (diffLabel) {
      diffLabel.innerHTML = `<i class="fas fa-signal ml-1"></i> ${State.quiz.diff || '—'}`;
    }
  };

  const renderDiffButtons = (diffSource) => {
    const diffs = Array.isArray(diffSource) && diffSource.length ? diffSource : fallbackDiffs;
    const hasSelected = diffs.some(
      (d) =>
        (State.quiz.diffValue != null && d.value === State.quiz.diffValue) ||
        (State.quiz.diff && d.label === State.quiz.diff)
    );
    if (!hasSelected) {
      const firstDiff = diffs[0] || fallbackDiffs[0] || null;
      selectDiffOption(firstDiff);
    }
    diffWrap.innerHTML = '';
    diffs.forEach((d, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-sm setup-diff';
      btn.textContent = d.label || d.value || `سطح ${i + 1}`;
      const isSelected =
        (State.quiz.diffValue != null && d.value === State.quiz.diffValue) ||
        (State.quiz.diff && d.label === State.quiz.diff) ||
        (!State.quiz.diff && i === 0);
      if (isSelected) btn.classList.add('selected-setup-item');
      btn.addEventListener('click', () => {
        $$('.setup-diff').forEach((b) => b.classList.remove('selected-setup-item'));
        btn.classList.add('selected-setup-item');
        selectDiffOption(d);
        updateDiffLabel();
      });
      diffWrap.appendChild(btn);
    });
    updateDiffLabel();
  };

  const initialDiffs = diffForCat(activeCat);
  const hasInitial = Array.isArray(initialDiffs) && initialDiffs.some(
    (d) =>
      (State.quiz.diffValue != null && d.value === State.quiz.diffValue) ||
      (State.quiz.diff && d.label === State.quiz.diff)
  );
  if (!hasInitial) {
    const first = initialDiffs[0] || fallbackDiffs[0] || null;
    selectDiffOption(first);
  }
  renderDiffButtons(initialDiffs);

  catWrap.innerHTML = '';
  categories.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-sm setup-cat';
    btn.dataset.id = c.id;
    btn.textContent = c.title || c.name || `دسته ${i + 1}`;
    const isSelected = (State.quiz.catId != null && c.id === State.quiz.catId) || (State.quiz.catId == null && i === 0);
    if (isSelected) btn.classList.add('selected-setup-item');
    btn.addEventListener('click', () => {
      $$('.setup-cat').forEach((b) => b.classList.remove('selected-setup-item'));
      btn.classList.add('selected-setup-item');
      State.quiz.catId = c.id;
      State.quiz.cat = c.title || c.name || '—';
      renderDiffButtons(diffForCat(c));
      updateCatLabel();
    });
    catWrap.appendChild(btn);
  });

  updateCatLabel();
}

export function buildCommunityQuestionForm() {
  const categorySelect = document.getElementById('community-category');
  const difficultySelect = document.getElementById('community-difficulty');
  if (!categorySelect) return;

  const categories = getActiveCategories();
  const previousCategory = categorySelect.value;
  categorySelect.innerHTML = '';

  if (categories.length === 0) {
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'هنوز دسته‌بندی فعالی ثبت نشده است';
    emptyOption.disabled = true;
    emptyOption.selected = true;
    categorySelect.appendChild(emptyOption);
    categorySelect.disabled = true;
  } else {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'انتخاب دسته‌بندی';
    placeholder.disabled = true;
    categorySelect.appendChild(placeholder);

    categories.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.title || cat.name || 'دسته‌بندی';
      categorySelect.appendChild(option);
    });

    categorySelect.disabled = false;
    if (previousCategory && categorySelect.querySelector(`option[value="${previousCategory}"]`)) {
      categorySelect.value = previousCategory;
    } else {
      categorySelect.selectedIndex = categories.length ? 1 : 0;
    }
  }

  if (difficultySelect) {
    const diffs = getEffectiveDiffs();
    const previousDiff = difficultySelect.value;
    difficultySelect.innerHTML = diffs.map((diff) => `<option value="${diff.value}">${diff.label}</option>`).join('');
    if (previousDiff && diffs.some((diff) => diff.value === previousDiff)) {
      difficultySelect.value = previousDiff;
    } else if (diffs.length) {
      difficultySelect.value = diffs[0].value;
    }
  }

  prefillCommunityAuthor();
  syncCommunityOptionStates();
}

export function prefillCommunityAuthor(force) {
  const input = document.getElementById('community-author');
  if (!input) return;
  if (force || !input.value.trim()) {
    const candidate = (State?.user?.name || '').trim();
    if (candidate) input.value = candidate;
  }
}

export function syncCommunityOptionStates() {
  const wrapper = document.getElementById('community-options');
  if (!wrapper) return;
  wrapper.querySelectorAll('[data-community-option]').forEach((row) => {
    const radio = row.querySelector('input[type="radio"]');
    if (radio && radio.checked) row.classList.add('selected');
    else row.classList.remove('selected');
  });
  updateCommunityCorrectPreview();
}

export function applyConfigToUI({ checkDailyReset } = {}) {
  const ads = RemoteConfig?.ads || {};
  const showBanner = !!(ads.enabled && ads.placements && ads.placements.banner);
  const showNative = !!(ads.enabled && ads.placements && ads.placements.native);
  const banner = document.getElementById('ad-banner');
  const nativeDash = document.getElementById('ad-native-dashboard');
  if (banner) banner.style.display = showBanner ? '' : 'none';
  if (nativeDash) nativeDash.style.display = showNative ? '' : 'none';

  if (typeof checkDailyReset === 'function') {
    checkDailyReset();
  }

  try {
    const packs = RemoteConfig?.pricing?.keys || [];
    packs.forEach((p) => {
      const card = document.querySelector(`[data-buy-key="${p.id}"]`);
      if (!card) return;
      const amountEl = card.querySelector('[data-amount]');
      if (amountEl) amountEl.textContent = faNum(p.amount);
      const priceEl = card.querySelector('[data-price]');
      if (priceEl) priceEl.textContent = faNum(p.priceGame);
      card.disabled = false;
    });
    $$('.product-card[data-buy-key]').forEach((card) => {
      const id = card.getAttribute('data-buy-key');
      if (!packs.some((p) => p.id === id)) card.setAttribute('disabled', 'true');
    });
  } catch {}
}
