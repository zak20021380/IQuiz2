import Api from '../../services/api.js';
import { RemoteConfig, patchPricingKeys, applyServerPricing } from '../../config/remote-config.js';
import {
  enforceStaticCategoryList,
  STATIC_CATEGORY_DEFINITIONS,
  getCategoryIdentityKeys
} from '../../config/categories.js';
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
  const [cfg, content, catList, provinces] = await Promise.all([
    Api.config().catch(() => null),
    Api.content().catch(() => null),
    Api.categories().catch(() => []),
    Api.provinces().catch(() => [])
  ]);

  if (cfg && typeof cfg === 'object') {
    deepApply(RemoteConfig, cfg);
  }

  const pricingSource = content?.pricing || content?.data?.pricing || null;
  applyServerPricing(RemoteConfig, pricingSource || {});
  patchPricingKeys(RemoteConfig);

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
  if (!catWrap) return;

  const categories = getAdminCategories();
  const fallbackDiffs = getEffectiveDiffs();

  const seenKeys = new Set();
  const uniqueCategories = [];
  categories.forEach((cat) => {
    if (!cat) return;
    const identityKeys = getCategoryIdentityKeys(cat);
    if (identityKeys.length) {
      const hasDuplicate = identityKeys.some((key) => seenKeys.has(key));
      if (hasDuplicate) return;
      identityKeys.forEach((key) => seenKeys.add(key));
    }
    uniqueCategories.push(cat);
  });

  const firstCat = uniqueCategories.find((c) => c && c.id != null) || getActiveCategories()[0] || getFirstCategory() || null;
  const catExists = uniqueCategories.some((c) => c && c.id === State.quiz.catId);
  if (!catExists) {
    State.quiz.catId = firstCat?.id ?? uniqueCategories[0]?.id ?? null;
  }
  const activeCat =
    uniqueCategories.find((c) => c && c.id === State.quiz.catId) ||
    firstCat ||
    uniqueCategories[0] ||
    null;
  if (activeCat) {
    const label = activeCat.title || activeCat.name || activeCat.displayName;
    State.quiz.cat = label || `دسته ${uniqueCategories.indexOf(activeCat) + 1}`;
  } else if (!State.quiz.cat) {
    State.quiz.cat = '—';
  }

  const diffForCat = (cat) => getCategoryDifficultyPool(cat) || fallbackDiffs;

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

  const ensureDiffForCat = (cat) => {
    const source = diffForCat(cat);
    const diffs = Array.isArray(source) && source.length ? source : fallbackDiffs;
    let preferred = diffs.find(
      (d) =>
        (State.quiz.diffValue != null && d.value === State.quiz.diffValue) ||
        (State.quiz.diff && d.label === State.quiz.diff)
    );
    if (!preferred) {
      preferred = diffs[0] || null;
    }
    if (preferred) {
      State.quiz.diff = preferred.label || preferred.value || '—';
      State.quiz.diffValue = preferred.value || preferred.label || null;
    } else {
      State.quiz.diff = '—';
      State.quiz.diffValue = null;
    }
    updateDiffLabel();
  };

  ensureDiffForCat(activeCat);

  catWrap.innerHTML = '';
  catWrap.setAttribute('data-count', String(uniqueCategories.length));

  uniqueCategories.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'setup-cat w-full px-3 py-3 rounded-2xl bg-white/10 border border-white/15 text-sm flex items-center transition duration-200 hover:bg-white/15';
    if (c.id != null) btn.dataset.id = c.id;

    const label = c.title || c.name || c.displayName || `دسته ${i + 1}`;
    btn.setAttribute('aria-label', label);

    const content = document.createElement('span');
    content.className = 'flex items-center justify-between gap-2 flex-row-reverse w-full';
    const labelSpan = document.createElement('span');
    labelSpan.className = 'font-medium text-right leading-tight';
    labelSpan.textContent = label;
    content.appendChild(labelSpan);

    const iconEl = document.createElement('i');
    iconEl.className = `fas ${c.icon || 'fa-layer-group'} text-base opacity-80`;
    content.appendChild(iconEl);

    btn.appendChild(content);

    const isSelected =
      (State.quiz.catId != null && c.id === State.quiz.catId) ||
      (State.quiz.catId == null && i === 0);
    btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    if (isSelected) btn.classList.add('selected-setup-item');

    btn.addEventListener('click', () => {
      $$('.setup-cat').forEach((b) => {
        b.classList.remove('selected-setup-item');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('selected-setup-item');
      btn.setAttribute('aria-pressed', 'true');
      State.quiz.catId = c.id ?? State.quiz.catId;
      State.quiz.cat = label;
      ensureDiffForCat(c);
      updateCatLabel();
    });

    catWrap.appendChild(btn);
  });

  updateCatLabel();
  updateDiffLabel();
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
