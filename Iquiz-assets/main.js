  // Anti-cheating: Detect devtools
  (function() {
    const threshold = 160;
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        alert('لطفاً ابزارهای توسعه‌دهنده را ببندید. تقلب مجاز نیست!');
        window.location.reload();
      }
    };
    setInterval(checkDevTools, 2000);
  })();
  // ===== Helpers =====
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  // Ensure all buttons default to type="button" to avoid unintended form submits
  function ensureButtonType(root=document){
    root.querySelectorAll('button:not([type])').forEach(btn=>btn.type='button');
  }
  ensureButtonType();
  new MutationObserver(m=>{
    m.forEach(mu=>{
      mu.addedNodes.forEach(node=>{
        if(node.nodeType!==Node.ELEMENT_NODE) return;
        if(node.matches && node.matches('button:not([type])')) node.type='button';
        if(node.querySelectorAll) ensureButtonType(node);
      });
    });
  }).observe(document.body,{childList:true,subtree:true});
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const faNum = n => (n===null||n===undefined||Number.isNaN(Number(n))) ? '—' : Number(n).toLocaleString('fa-IR');
  const faDecimal = (n, digits=1) => {
    const value = Number(n);
    if (!Number.isFinite(value)) return '—';
    return value.toLocaleString('fa-IR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  };
  const enNum = n => Number(n).toLocaleString('en-US');
function populateProvinceOptions(selectEl, placeholder){
    if(!selectEl) return;

    // Save the currently selected value if any
    const prevValue = selectEl.value;
    selectEl.innerHTML = '';

    if(placeholder){
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = placeholder;
      opt.disabled = true;
      opt.selected = true;
      selectEl.appendChild(opt);
    }

    // Check if provinces exist
    if(!State.provinces || State.provinces.length === 0){
      console.warn('No provinces available to populate');
      return;
    }

    State.provinces
      .slice()
      .sort((a,b)=>a.name.localeCompare(b.name, 'fa'))
      .forEach(p => {
        const option = document.createElement('option');
        option.value = p.name;
        option.textContent = p.name;
        selectEl.appendChild(option);
      });

    // Restore previous selection if it exists
    if(prevValue && Array.from(selectEl.options).some(opt => opt.value === prevValue)){
      selectEl.value = prevValue;
    }
  }





  
  const vibrate = ms => { try{ if(State.settings.haptics && navigator.vibrate) navigator.vibrate(ms) }catch{} };
  const toast = (html, ms=2200) => {
    const t=document.createElement('div');
    t.className='fixed top-20 left-1/2 -translate-x-1/2 glass px-5 py-3 rounded-2xl text-white font-bold z-50 fade-in';
    t.innerHTML=html; document.body.appendChild(t); setTimeout(()=>t.remove(), ms);
  };
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  function formatDuration(ms){
    if(!Number.isFinite(ms) || ms <= 0) return 'کمتر از یک دقیقه';
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if(hours > 0) parts.push(`${faNum(hours)} ساعت`);
    if(minutes > 0) parts.push(`${faNum(minutes)} دقیقه`);
    return parts.length ? parts.join(' و ') : 'کمتر از یک دقیقه';
  }
  function formatRelativeTime(ts){
    if(!Number.isFinite(ts)) return 'همین حالا';
    try{
      const diff = ts - Date.now();
      const abs = Math.abs(diff);
      const rtf = formatRelativeTime.rtf || (formatRelativeTime.rtf = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' }));
      const units = [
        { limit: 60 * 1000, divisor: 1000, unit: 'second' },
        { limit: 60 * 60 * 1000, divisor: 60 * 1000, unit: 'minute' },
        { limit: 24 * 60 * 60 * 1000, divisor: 60 * 60 * 1000, unit: 'hour' },
        { limit: 7 * 24 * 60 * 60 * 1000, divisor: 24 * 60 * 60 * 1000, unit: 'day' },
        { limit: 30 * 24 * 60 * 60 * 1000, divisor: 7 * 24 * 60 * 60 * 1000, unit: 'week' },
        { limit: 365 * 24 * 60 * 60 * 1000, divisor: 30 * 24 * 60 * 60 * 1000, unit: 'month' },
        { limit: Infinity, divisor: 365 * 24 * 60 * 60 * 1000, unit: 'year' }
      ];
      for(const { limit, divisor, unit } of units){
        if(abs < limit){
          const value = Math.round(diff / divisor);
          return rtf.format(value, unit);
        }
      }
    }catch{}
    try{ return new Date(ts).toLocaleString('fa-IR'); }catch{ return 'همین حالا'; }
  }
  const online = () => navigator.onLine;
  // Minimal sounds
  const SFX = (()=>{ let ctx; const mk=()=>ctx||(ctx=new (window.AudioContext||window.webkitAudioContext)());
    const beep=(f=880,d=0.12,t='sine')=>{ if(!State.settings.sound) return; const a=mk(); const o=a.createOscillator(); const g=a.createGain();
      o.type=t; o.frequency.value=f; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(0.001,a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2,a.currentTime+0.01); g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+d);
      o.start(); o.stop(a.currentTime+d+0.02);
    };
    return { correct:()=>{beep(880); setTimeout(()=>beep(1320,0.1,'triangle'),90)}, wrong:()=>beep(160,0.25,'sawtooth'), tick:()=>beep(660,0.05), coin:()=>{beep(1200,0.08); setTimeout(()=>beep(1600,0.08),70)} };
  })();
  function shootConfetti(){
    const canvas = $('#confetti'); const ctx = canvas.getContext('2d');
    const W = canvas.width = innerWidth, H = canvas.height = innerHeight;
    const pieces = Array.from({length: 120}, ()=>({
      x: Math.random()*W, y: -20-Math.random()*H, r: 4+Math.random()*6,
      c: ['#fde047','#fb923c','#a78bfa','#ec4899','#34d399'][Math.floor(Math.random()*5)],
      v: 1+Math.random()*3, a: Math.random()*Math.PI*2
    }));
    let t=0, run=true;
    (function anim(){
      if(!run) return; ctx.clearRect(0,0,W,H);
      for(const p of pieces){
        ctx.fillStyle=p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        p.y += p.v; p.x += Math.sin(p.a+t/15); if(p.y>H+10) p.y=-10;
      }
      t++; const id=requestAnimationFrame(anim); setTimeout(()=>{run=false; cancelAnimationFrame(id); ctx.clearRect(0,0,W,H)}, 2200);
    })();
  }
  
  // ===== Remote Config (in-file) =====
// === RemoteConfig (اصلاح‌شده) ===
const RemoteConfig = {
  ab: (Math.random() < 0.5) ? 'A' : 'B',

  provinceTargeting: { enabled: true, allow: ['تهران','کردستان','آذربایجان غربی','اصفهان'] },

  ads: {
    enabled: true,
    placements: { banner:true, native:true, interstitial:true, rewarded:true },
    freqCaps: { interstitialPerSession: 2, rewardedPerSession: 3 },
    interstitialCooldownMs: 60_000,
    rewardedMinWatchMs: 7_000,
    session: { interstitialShown: 0, rewardedShown: 0, lastInterstitialAt: 0 }
  },

  pricing: {
    // نرخ تبدیل دلاری برای مواقعی که priceToman نداشتیم (اختیاری)
    usdToToman: 70_000,

    // ← این بخش به تومان به‌روزرسانی شد
    coins: [
      { id:'c100',  amount:100,  bonus:0,  priceToman: 59_000,   priceCents:199  },
      { id:'c500',  amount:500,  bonus:5,  priceToman: 239_000,  priceCents:799  },
      { id:'c1200', amount:1200, bonus:12, priceToman: 459_000,  priceCents:1499 },
      { id:'c3000', amount:3000, bonus:25, priceToman: 899_000,  priceCents:2999 }
    ],

    vip: {
      lite: { id:'vip_lite', priceCents:299 },
      pro:  { id:'vip_pro',  priceCents:599 }
    },

    // بسته‌های «کلید» (پرداخت با سکهٔ بازی)
    keys: [
      { id:'k1',  amount:1,  priceGame:30  }, // بسته کوچک
      { id:'k3',  amount:3,  priceGame:80  }, // بسته اقتصادی
      { id:'k10', amount:10, priceGame:250 }  // بسته بزرگ
    ]
  },

  abOverrides: {
    A: { ads:{ freqCaps:{ interstitialPerSession:2 } } },
    B: { ads:{ freqCaps:{ interstitialPerSession:1 } } }
  },

  gameLimits: {
    matches: { daily: 5, vipMultiplier: 2, recoveryTime: 2 * 60 * 60 * 1000 }, // 2 hours
    duels:   { daily: 3, vipMultiplier: 2, recoveryTime: 30 * 60 * 1000 },     // 30 minutes
    lives:   { daily: 3, vipMultiplier: 2, recoveryTime: 30 * 60 * 1000 },     // 30 minutes
    groupBattles: { daily: 2, vipMultiplier: 2, recoveryTime: 60 * 60 * 1000 }, // 1 hour
    energy:  { daily: 10, vipMultiplier: 2, recoveryTime: 15 * 60 * 1000 }     // 15 minutes
  }
};



// === Patch ایمن برای RemoteConfig.pricing.keys ===
// اگر keys نباشه/خالی یا نامعتبر باشه، با دیفالت‌ها پر و نرمالایز می‌کنه.
// خروجی: آرایه‌ی keys نهایی (مرتب و سالم)
function patchPricingKeys(RemoteConfig){
  const defaults = [
    { id:'k1',  amount:1,  priceGame:30,  label:'بسته کوچک'     },
    { id:'k3',  amount:3,  priceGame:80,  label:'بسته اقتصادی'   },
    { id:'k10', amount:10, priceGame:250, label:'بسته بزرگ'      }
  ];

  if (!RemoteConfig.pricing) RemoteConfig.pricing = {};

  const packs = RemoteConfig.pricing.keys;
  const bad = (p)=> typeof p?.amount!=='number' || typeof p?.priceGame!=='number' || p.amount<=0 || p.priceGame<=0;

  if (!Array.isArray(packs) || packs.length===0 || packs.some(bad)){
    RemoteConfig.pricing.keys = defaults;
  } else {
    RemoteConfig.pricing.keys = packs
      .map(p => ({
        id: String(p.id || ('k' + p.amount)),
        amount: +p.amount,
        priceGame: +p.priceGame,
        label: p.label || (p.amount<=1 ? 'بسته کوچک' : p.amount<=3 ? 'بسته اقتصادی' : 'بسته بزرگ')
      }))
      .filter(p => p.amount>0 && p.priceGame>0)
      .sort((a,b)=> a.amount - b.amount);
  }

  return RemoteConfig.pricing.keys;
}

// ⚡️ بلافاصله بعد از تعریف RemoteConfig صدا بزن:
patchPricingKeys(RemoteConfig);

  const DEFAULT_DIFFS = [
    { value: 'easy', label: 'آسان' },
    { value: 'medium', label: 'متوسط' },
    { value: 'hard', label: 'سخت' }
  ];

  function normalizeDifficultyLabel(raw){
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
      'easy':'آسان',
      'medium':'متوسط',
      'normal':'متوسط',
      'hard':'سخت',
      'difficult':'سخت',
      'harder':'سخت',
      'hardest':'سخت',
      'beginner':'مبتدی',
      'advanced':'پیشرفته'
    };
    const key = txt.toLowerCase();
    return map[key] || txt;
  }

  function extractDifficultyList(src){
    const seen = new Set();
    const result = [];

    const add = (valueRaw, labelRaw)=>{
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

    const handle = (item)=>{
      if (item == null) return;
      if (Array.isArray(item)) {
        item.forEach(handle);
        return;
      }
      if (typeof item === 'string' || typeof item === 'number') {
        const parts = String(item).split(/[،,|/\\]+/);
        parts.forEach(part=>{
          const trimmed = part.trim();
          if (trimmed) add(trimmed, trimmed);
        });
        return;
      }
      if (typeof item === 'object') {
        if (Array.isArray(item.values)) {
          item.values.forEach(handle);
          return;
        }
        if (Array.isArray(item.options)) {
          item.options.forEach(handle);
          return;
        }
        if ('value' in item || 'label' in item || 'title' in item || 'name' in item || 'id' in item) {
          const valueRaw = item.value ?? item.id ?? item.name ?? item.title ?? item.label;
          const labelRaw = item.label ?? item.title ?? item.name ?? item.value ?? valueRaw;
          add(valueRaw, labelRaw);
          return;
        }
        const truthyKeys = Object.keys(item).filter(k => item[k] === true);
        if (truthyKeys.length) {
          truthyKeys.forEach(key => add(key, key));
        }
      }
    };

    handle(src);
    return result;
  }

  /* === Admin-sourced state === */
  const Admin = { categories: [], diffs: [] };

  async function initFromAdmin(){
    const [cfg, catList, provinces] = await Promise.all([
      Api.config().catch(()=>null),
      Api.categories().catch(()=>[]),
      Api.provinces().catch(()=>[])
    ]);

    if (cfg && typeof cfg === 'object'){
      deepApply(RemoteConfig, cfg);
      patchPricingKeys(RemoteConfig);
    }

    const rawCategories = Array.isArray(catList) ? catList.filter(c=>c?.isActive!==false) : [];
    Admin.categories = rawCategories.map(cat => {
      const parsed = extractDifficultyList(cat?.difficulties ?? cat?.difficulty);
      const diffs = (Array.isArray(parsed) && parsed.length)
        ? parsed.map(d => ({ value: d.value, label: d.label }))
        : DEFAULT_DIFFS.map(d => ({ value: d.value, label: d.label }));
      return { ...cat, difficulties: diffs };
    });

    const diffMap = new Map();
    Admin.categories.forEach(cat => {
      if (Array.isArray(cat?.difficulties)) {
        cat.difficulties.forEach(diff => {
          if (!diff || diff.value == null) return;
          const key = String(diff.value).toLowerCase();
          if (!diffMap.has(key)) diffMap.set(key, { value: diff.value, label: diff.label });
        });
      }
    });
    if (diffMap.size === 0) {
      DEFAULT_DIFFS.forEach(diff => diffMap.set(diff.value.toLowerCase(), { value: diff.value, label: diff.label }));
    }
    Admin.diffs = Array.from(diffMap.values());

    if (Array.isArray(provinces) && provinces.length){
      State.provinces = provinces.map(p=>({ name:p.name||p, score:p.score||0, members:p.members||0, region:p.region||p.area||'' }));
    }

    renderProvinceSelect();
    buildSetupFromAdmin();
    buildCommunityQuestionForm();
    applyConfigToUI();
  }

  function buildSetupFromAdmin(){
    const catWrap = document.getElementById('cat-wrap');
    const diffWrap = document.getElementById('diff-wrap');
    if (!catWrap || !diffWrap) return;

    const categories = Array.isArray(Admin.categories) ? Admin.categories : [];
    const fallbackDiffs = (Array.isArray(Admin.diffs) && Admin.diffs.length) ? Admin.diffs : DEFAULT_DIFFS;

    const firstCat = categories.find(c=>c && c.id!=null) || categories[0] || null;
    const catExists = categories.some(c=>c && c.id === State.quiz.catId);
    if(!catExists){
      State.quiz.catId = firstCat?.id || null;
    }
    const activeCat = categories.find(c=>c && c.id === State.quiz.catId) || firstCat || null;
    if(activeCat){
      State.quiz.cat = activeCat.title || activeCat.name || `دسته ${categories.indexOf(activeCat)+1}`;
    } else if(!State.quiz.cat){
      State.quiz.cat = '—';
    }

    const diffForCat = (cat)=>{
      if (cat && Array.isArray(cat.difficulties) && cat.difficulties.length) return cat.difficulties;
      return fallbackDiffs;
    };

    const selectDiffOption = (opt)=>{
      if (opt) {
        State.quiz.diff = opt.label || opt.value || '—';
        State.quiz.diffValue = opt.value || opt.label || null;
      } else {
        State.quiz.diff = '—';
        State.quiz.diffValue = null;
      }
    };

    const updateCatLabel = ()=>{
      const catLabel = document.getElementById('quiz-cat');
      if(catLabel){
        catLabel.innerHTML = `<i class="fas fa-folder ml-1"></i> ${State.quiz.cat || '—'}`;
      }
    };

    const updateDiffLabel = ()=>{
      const diffLabel = document.getElementById('quiz-diff');
      if(diffLabel){
        diffLabel.innerHTML = `<i class="fas fa-signal ml-1"></i> ${State.quiz.diff || '—'}`;
      }
    };

    const renderDiffButtons = (diffSource)=>{
      const diffs = (Array.isArray(diffSource) && diffSource.length) ? diffSource : fallbackDiffs;
      const hasSelected = diffs.some(d => (State.quiz.diffValue != null && d.value === State.quiz.diffValue) || (State.quiz.diff && d.label === State.quiz.diff));
      if(!hasSelected){
        const firstDiff = diffs[0] || fallbackDiffs[0] || null;
        selectDiffOption(firstDiff);
      }
      diffWrap.innerHTML = '';
      diffs.forEach((d,i)=>{
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-sm setup-diff';
        btn.textContent=d.label || d.value || `سطح ${i+1}`;
        const isSelected = (State.quiz.diffValue != null && d.value === State.quiz.diffValue) || (State.quiz.diff && d.label === State.quiz.diff) || (!State.quiz.diff && i===0);
        if(isSelected) btn.classList.add('selected-setup-item');
        btn.addEventListener('click', ()=>{
          $$('.setup-diff').forEach(b=>b.classList.remove('selected-setup-item'));
          btn.classList.add('selected-setup-item');
          selectDiffOption(d);
          updateDiffLabel();
        });
        diffWrap.appendChild(btn);
      });
      updateDiffLabel();
    };

    const initialDiffs = diffForCat(activeCat);
    const hasInitial = Array.isArray(initialDiffs) && initialDiffs.some(d => (State.quiz.diffValue != null && d.value === State.quiz.diffValue) || (State.quiz.diff && d.label === State.quiz.diff));
    if(!hasInitial){
      const first = initialDiffs[0] || fallbackDiffs[0] || null;
      selectDiffOption(first);
    }
    renderDiffButtons(initialDiffs);

    catWrap.innerHTML = '';
    categories.forEach((c,i)=>{
      const btn = document.createElement('button');
      btn.type='button';
      btn.className='w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-sm setup-cat';
      btn.dataset.id=c.id;
      btn.textContent=c.title||c.name||`دسته ${i+1}`;
      const isSelected = (State.quiz.catId!=null && c.id===State.quiz.catId) || (State.quiz.catId==null && i===0);
      if(isSelected) btn.classList.add('selected-setup-item');
      btn.addEventListener('click', ()=>{
        $$('.setup-cat').forEach(b=>b.classList.remove('selected-setup-item'));
        btn.classList.add('selected-setup-item');
        State.quiz.catId=c.id;
        State.quiz.cat=c.title||c.name||'—';
        renderDiffButtons(diffForCat(c));
        updateCatLabel();
      });
      catWrap.appendChild(btn);
    });

    updateCatLabel();
  }

  function buildCommunityQuestionForm(){
    const categorySelect = document.getElementById('community-category');
    const difficultySelect = document.getElementById('community-difficulty');
    if (!categorySelect) return;

    const categories = Array.isArray(Admin.categories) ? Admin.categories.filter(cat => cat && cat.id != null) : [];
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

      categories.forEach(cat => {
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
      const diffs = Array.isArray(Admin.diffs) && Admin.diffs.length ? Admin.diffs : DEFAULT_DIFFS;
      const previousDiff = difficultySelect.value;
      difficultySelect.innerHTML = diffs.map(diff => `<option value="${diff.value}">${diff.label}</option>`).join('');
      if (previousDiff && diffs.some(diff => diff.value === previousDiff)) {
        difficultySelect.value = previousDiff;
      } else if (diffs.length) {
        difficultySelect.value = diffs[0].value;
      }
    }

    prefillCommunityAuthor();
    syncCommunityOptionStates();
  }

  function prefillCommunityAuthor(force){
    const input = document.getElementById('community-author');
    if (!input) return;
    if (force || !input.value.trim()) {
      const candidate = (State?.user?.name || '').trim();
      if (candidate) input.value = candidate;
    }
  }

  function updateCommunityCorrectPreview(){
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

  function syncCommunityOptionStates(){
    const wrapper = document.getElementById('community-options');
    if (!wrapper) return;
    wrapper.querySelectorAll('[data-community-option]').forEach(row => {
      const radio = row.querySelector('input[type="radio"]');
      if (radio && radio.checked) row.classList.add('selected');
      else row.classList.remove('selected');
    });
    updateCommunityCorrectPreview();
  }

  function applyConfigToUI(){
    const ads = RemoteConfig?.ads || {};
    const showBanner = !!(ads.enabled && ads.placements && ads.placements.banner);
    const showNative = !!(ads.enabled && ads.placements && ads.placements.native);
    const banner = document.getElementById('ad-banner');
    const nativeDash = document.getElementById('ad-native-dashboard');
    if (banner) banner.style.display = showBanner ? '' : 'none';
    if (nativeDash) nativeDash.style.display = showNative ? '' : 'none';

    checkDailyReset();

    try{
      const packs = RemoteConfig?.pricing?.keys || [];
      packs.forEach(p=>{
        const card = document.querySelector(`[data-buy-key="${p.id}"]`);
        if (!card) return;
        const amountEl = card.querySelector('[data-amount]');
        if (amountEl) amountEl.textContent = faNum(p.amount);
        const priceEl = card.querySelector('[data-price]');
        if (priceEl) priceEl.textContent = faNum(p.priceGame);
        card.disabled = false;
      });
      $$('.product-card[data-buy-key]').forEach(card=>{
        const id = card.getAttribute('data-buy-key');
        if (!packs.some(p=>p.id===id)) card.setAttribute('disabled','true');
      });
    }catch{}
  }

  // Merge AB overrides
  (function applyAB(){
    const o = RemoteConfig.abOverrides[RemoteConfig.ab];
    if(!o) return;
    function deepMerge(t,s){ for(const k in s){ if(typeof s[k]==='object'&&s[k]){ t[k]=t[k]||{}; deepMerge(t[k],s[k]); } else { t[k]=s[k]; } } }
    deepMerge(RemoteConfig, o);
  })();
  
  // ===== Analytics =====
  async function logEvent(name, payload={}){
    try{
      await fetch('/api/analytics', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ 
          name, 
          ts: Date.now(), 
          province: Server.user.province,
          vipPlan: Server.subscription.plan,
          vipActive: Server.subscription.active,
          ...payload 
        })
      }).catch(()=>{});
    }catch{}
  }
  
  // ===== Server State (Wallet + Subscription only from server) =====
const Server = {
  wallet: { coins: null, lastTxnId: null },
  subscription: { active:false, status:'unknown', expiry:null, autoRenew:false, plan:null, tier:null },
  user: { province:'تهران' }, // can be set by your auth bootstrap
  limits: {
    matches: { used: 0, lastReset: 0, lastRecovery: 0 },
    duels: { used: 0, lastReset: 0, lastRecovery: 0 },
    lives: { used: 0, lastReset: 0, lastRecovery: 0 },
    groupBattles: { used: 0, lastReset: 0, lastRecovery: 0 },
    energy: { used: 0, lastReset: 0, lastRecovery: 0 }
  },
  pass: {
    freeXp: 0,
    premiumXp: 0,
    season: 1,
    week: 1,
    missions: {
      daily: [],
      weekly: []
    }
  }
};

  const ROSTER_ROLES = ['دانش عمومی','رهبر استراتژی','متخصص علوم','استاد ادبیات','تحلیل‌گر داده','هوش تاریخی','ریاضی‌دان','کارشناس فناوری','حل مسئله سریع','هوش مصنوعی'];
  const ROSTER_FIRST_NAMES = ['آرمان','نیلوفر','شروین','فرناز','پارسا','یاسمن','کاوه','مینا','هومن','هستی','رامتین','سولماز','آرین','بهاره','پریسا','بردیا','کیانا','مانی','ترانه','هانیه'];
  const ROSTER_LAST_NAMES = ['قاسمی','حسینی','موسوی','محمدی','کاظمی','نعمتی','شکیبا','زارع','فاضلی','رستگار','صادقی','نیک‌پور','شریفی','فرهادی','پاکزاد','نادری','گودرزی','مرادی','توکلی','شفیعی'];

  const DEFAULT_GROUP_ROSTERS = {
    g1: [
      { name:'علی رضایی', avatar:'https://i.pravatar.cc/100?img=12', role:'رهبر تیم', power:94, avgScore:890, accuracy:92, speed:6.1 },
      { name:'سارا اکبری', avatar:'https://i.pravatar.cc/100?img=32', role:'استاد ادبیات', power:91, avgScore:872, accuracy:90, speed:6.4 },
      { name:'رضا کریمی', avatar:'https://i.pravatar.cc/100?img=45', role:'تحلیل‌گر تیزبین', power:89, avgScore:860, accuracy:89, speed:6.6 },
      { name:'ندا فرهمند', avatar:'https://i.pravatar.cc/100?img=36', role:'متخصص تاریخ', power:87, avgScore:845, accuracy:88, speed:6.9 },
      { name:'پیام سالاری', avatar:'https://i.pravatar.cc/100?img=24', role:'ریاضی برتر', power:85, avgScore:832, accuracy:87, speed:7.1 },
      { name:'آرزو مرادی', avatar:'https://i.pravatar.cc/100?img=54', role:'هوش کلامی', power:83, avgScore:820, accuracy:85, speed:7.4 },
      { name:'احسان کاوه', avatar:'https://i.pravatar.cc/100?img=13', role:'مغز تکنولوژی', power:82, avgScore:808, accuracy:84, speed:7.6 },
      { name:'نگار میرزایی', avatar:'https://i.pravatar.cc/100?img=47', role:'دانش عمومی', power:80, avgScore:798, accuracy:83, speed:7.8 },
      { name:'شهاب احمدپور', avatar:'https://i.pravatar.cc/100?img=58', role:'فیزیک‌دان جوان', power:78, avgScore:785, accuracy:81, speed:8.0 },
      { name:'کیانا شریفی', avatar:'https://i.pravatar.cc/100?img=21', role:'تحلیل‌گر داده', power:76, avgScore:770, accuracy:80, speed:8.2 }
    ],
    g2: [
      { name:'سارا محمدی', avatar:'https://i.pravatar.cc/100?img=29', role:'استراتژیست ارشد', power:92, avgScore:875, accuracy:91, speed:6.3 },
      { name:'مهدی احمدی', avatar:'https://i.pravatar.cc/100?img=17', role:'تحلیل‌گر منطق', power:88, avgScore:852, accuracy:88, speed:6.7 },
      { name:'الهام برزگر', avatar:'https://i.pravatar.cc/100?img=53', role:'متخصص علوم', power:86, avgScore:838, accuracy:87, speed:7.0 },
      { name:'حسین فلاح', avatar:'https://i.pravatar.cc/100?img=25', role:'ریاضی‌دان تیم', power:84, avgScore:826, accuracy:85, speed:7.3 },
      { name:'نگین شریعتی', avatar:'https://i.pravatar.cc/100?img=41', role:'هوش تاریخی', power:83, avgScore:815, accuracy:84, speed:7.5 },
      { name:'پژمان نظری', avatar:'https://i.pravatar.cc/100?img=34', role:'کارشناس فناوری', power:81, avgScore:804, accuracy:83, speed:7.8 },
      { name:'بهاره کاظمی', avatar:'https://i.pravatar.cc/100?img=59', role:'ادبیات پژوه', power:79, avgScore:792, accuracy:82, speed:8.0 },
      { name:'شروین فرهادی', avatar:'https://i.pravatar.cc/100?img=23', role:'هوش مصنوعی', power:78, avgScore:780, accuracy:81, speed:8.2 },
      { name:'مینا رستگار', avatar:'https://i.pravatar.cc/100?img=42', role:'دانش عمومی', power:76, avgScore:768, accuracy:80, speed:8.4 },
      { name:'آرین ساعی', avatar:'https://i.pravatar.cc/100?img=14', role:'حل مسئله سریع', power:75, avgScore:756, accuracy:79, speed:8.6 }
    ],
    g3: [
      { name:'رضا قاسمی', avatar:'https://i.pravatar.cc/100?img=19', role:'رهبر خلاق', power:90, avgScore:862, accuracy:89, speed:6.5 },
      { name:'نازنین فراهانی', avatar:'https://i.pravatar.cc/100?img=38', role:'محقق علوم', power:87, avgScore:840, accuracy:87, speed:6.9 },
      { name:'کیاوش نادری', avatar:'https://i.pravatar.cc/100?img=49', role:'استاد منطق', power:85, avgScore:828, accuracy:85, speed:7.2 },
      { name:'الینا رضوی', avatar:'https://i.pravatar.cc/100?img=28', role:'تحلیل‌گر داده', power:83, avgScore:815, accuracy:84, speed:7.4 },
      { name:'پارسا بهمنی', avatar:'https://i.pravatar.cc/100?img=33', role:'هوش ریاضی', power:82, avgScore:804, accuracy:83, speed:7.6 },
      { name:'آیدا صفوی', avatar:'https://i.pravatar.cc/100?img=52', role:'تاریخ‌دان', power:80, avgScore:792, accuracy:82, speed:7.9 },
      { name:'مانی فرهودی', avatar:'https://i.pravatar.cc/100?img=22', role:'متخصص سرعت', power:79, avgScore:780, accuracy:81, speed:8.0 },
      { name:'سینا کیا', avatar:'https://i.pravatar.cc/100?img=27', role:'کارشناس فناوری', power:77, avgScore:770, accuracy:80, speed:8.2 },
      { name:'هستی مرادی', avatar:'https://i.pravatar.cc/100?img=44', role:'دانش عمومی', power:75, avgScore:760, accuracy:79, speed:8.4 },
      { name:'یاشا طاهری', avatar:'https://i.pravatar.cc/100?img=57', role:'حل مسئله منطقی', power:74, avgScore:748, accuracy:78, speed:8.6 }
    ],
    g4: [
      { name:'مریم احمدی', avatar:'https://i.pravatar.cc/100?img=18', role:'رهبر تکنیکی', power:89, avgScore:850, accuracy:88, speed:6.8 },
      { name:'رها فاضلی', avatar:'https://i.pravatar.cc/100?img=48', role:'هوش ادبی', power:86, avgScore:832, accuracy:86, speed:7.1 },
      { name:'امیررضا حاتمی', avatar:'https://i.pravatar.cc/100?img=55', role:'ریاضی برتر', power:84, avgScore:820, accuracy:84, speed:7.3 },
      { name:'مهسا نادری', avatar:'https://i.pravatar.cc/100?img=37', role:'تاریخ پژوه', power:82, avgScore:808, accuracy:83, speed:7.5 },
      { name:'نیما رجبی', avatar:'https://i.pravatar.cc/100?img=26', role:'تحلیل‌گر سریع', power:81, avgScore:798, accuracy:82, speed:7.7 },
      { name:'الهه رحیمی', avatar:'https://i.pravatar.cc/100?img=43', role:'دانش علوم', power:80, avgScore:788, accuracy:81, speed:7.9 },
      { name:'سامیار پاکزاد', avatar:'https://i.pravatar.cc/100?img=46', role:'برنامه‌ریز تیمی', power:78, avgScore:776, accuracy:80, speed:8.1 },
      { name:'یاسمن گودرزی', avatar:'https://i.pravatar.cc/100?img=31', role:'استراتژیست', power:77, avgScore:766, accuracy:79, speed:8.3 },
      { name:'هومن جلالی', avatar:'https://i.pravatar.cc/100?img=51', role:'دانش عمومی', power:75, avgScore:756, accuracy:78, speed:8.5 },
      { name:'بهار قائمی', avatar:'https://i.pravatar.cc/100?img=35', role:'مغز خلاق', power:74, avgScore:744, accuracy:77, speed:8.6 }
    ],
    g5: [
      { name:'امیر حسینی', avatar:'https://i.pravatar.cc/100?img=20', role:'رهبر هوش مصنوعی', power:93, avgScore:880, accuracy:91, speed:6.2 },
      { name:'هانیه ناصری', avatar:'https://i.pravatar.cc/100?img=39', role:'متخصص زیست', power:90, avgScore:868, accuracy:89, speed:6.5 },
      { name:'کیارش زندی', avatar:'https://i.pravatar.cc/100?img=56', role:'تحلیل‌گر ریاضی', power:88, avgScore:856, accuracy:88, speed:6.8 },
      { name:'محدثه توکلی', avatar:'https://i.pravatar.cc/100?img=30', role:'ادبیات پژوه', power:86, avgScore:842, accuracy:87, speed:7.0 },
      { name:'رامین شکیبا', avatar:'https://i.pravatar.cc/100?img=40', role:'فیزیک‌دان', power:85, avgScore:830, accuracy:85, speed:7.2 },
      { name:'کیانا نعمتی', avatar:'https://i.pravatar.cc/100?img=60', role:'متخصص تاریخ', power:83, avgScore:818, accuracy:84, speed:7.5 },
      { name:'رامسین اویسی', avatar:'https://i.pravatar.cc/100?img=15', role:'کارشناس منطق', power:82, avgScore:806, accuracy:83, speed:7.7 },
      { name:'پریسا آذر', avatar:'https://i.pravatar.cc/100?img=50', role:'دانش عمومی', power:80, avgScore:794, accuracy:82, speed:7.9 },
      { name:'نوید برومند', avatar:'https://i.pravatar.cc/100?img=16', role:'تحلیل‌گر داده', power:78, avgScore:782, accuracy:81, speed:8.1 },
      { name:'ترانه شفیعی', avatar:'https://i.pravatar.cc/100?img=61', role:'هوش ترکیبی', power:77, avgScore:770, accuracy:80, speed:8.3 }
    ]
  };

  function cloneDefaultRoster(groupId){
    return (DEFAULT_GROUP_ROSTERS[groupId] || []).map(player => ({ ...player }));
  }

  function stringToSeed(str){
    if (!str) return 1;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % 2147483647;
    }
    return hash || 1;
  }

  function seededRandom(seed){
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function seededFloat(seed, min, max){
    return min + (max - min) * seededRandom(seed);
  }

  function pickFrom(list, seed, offset = 0){
    if (!Array.isArray(list) || list.length === 0) return '';
    const idx = Math.abs(Math.floor(seed + offset)) % list.length;
    return list[idx];
  }

  function createSyntheticNameForGroup(group, index){
    const seed = stringToSeed(`${group?.id || ''}-${group?.name || ''}`);
    const first = pickFrom(ROSTER_FIRST_NAMES, seed, index * 3);
    const last = pickFrom(ROSTER_LAST_NAMES, seed, index * 7);
    return `${first} ${last}`.trim();
  }

  function buildRosterEntry(name, index, baseSeed){
    const seed = baseSeed + index * 17;
    const role = pickFrom(ROSTER_ROLES, seed, index * 5) || 'دانش عمومی';
    const power = Math.round(Math.max(68, Math.min(96, seededFloat(seed, 74, 94))));
    const accuracy = Math.round(Math.max(60, Math.min(97, seededFloat(seed + 5, 72, 95))));
    const avgScore = Math.round(Math.max(640, Math.min(940, seededFloat(seed + 9, 700, 920))));
    const speed = Math.round(Math.max(5.2, Math.min(9.0, seededFloat(seed + 13, 5.6, 8.6))) * 10) / 10;
    return {
      name,
      avatar: `https://i.pravatar.cc/100?u=${encodeURIComponent(name)}`,
      role,
      power,
      accuracy,
      avgScore,
      speed
    };
  }

  function generateRosterFromMembers(group, desiredCount = 10){
    const roster = [];
    const used = new Set();
    const baseSeed = stringToSeed(`${group?.id || ''}-${group?.name || ''}`);
    const baseMembers = Array.isArray(group?.memberList) ? group.memberList.filter(Boolean) : [];
    baseMembers.forEach((memberName, idx) => {
      if (used.has(memberName)) return;
      const entry = buildRosterEntry(memberName, idx, baseSeed);
      roster.push(entry);
      used.add(memberName);
    });
    let idx = roster.length;
    while (roster.length < desiredCount){
      const synthetic = createSyntheticNameForGroup(group, idx);
      if (used.has(synthetic)) { idx++; continue; }
      const entry = buildRosterEntry(synthetic, idx, baseSeed);
      roster.push(entry);
      used.add(synthetic);
      idx++;
    }
    return roster.slice(0, desiredCount);
  }

  function normalizeRosterMember(player, fallback, index, group){
    const source = player && typeof player === 'object' ? player : {};
    const baseSeed = stringToSeed(`${group?.id || ''}-${group?.name || ''}-${index}`);
    const fallbackSource = (fallback && typeof fallback === 'object' && Object.keys(fallback).length)
      ? fallback
      : buildRosterEntry(createSyntheticNameForGroup(group, index), index, baseSeed);
    const name = source.name || fallbackSource.name || createSyntheticNameForGroup(group, index);
    const avatar = source.avatar || fallbackSource.avatar || `https://i.pravatar.cc/100?u=${encodeURIComponent(name)}`;
    const role = source.role || fallbackSource.role || pickFrom(ROSTER_ROLES, baseSeed, index * 3) || 'دانش عمومی';
    const power = Number.isFinite(source.power) ? Math.round(source.power) : Number.isFinite(fallbackSource.power) ? Math.round(fallbackSource.power) : Math.round(Math.max(68, Math.min(96, seededFloat(baseSeed, 74, 92))));
    const accuracy = Number.isFinite(source.accuracy) ? Math.round(source.accuracy) : Number.isFinite(fallbackSource.accuracy) ? Math.round(fallbackSource.accuracy) : Math.round(Math.max(60, Math.min(97, seededFloat(baseSeed + 5, 72, 94))));
    const avgScore = Number.isFinite(source.avgScore) ? Math.round(source.avgScore) : Number.isFinite(fallbackSource.avgScore) ? Math.round(fallbackSource.avgScore) : Math.round(Math.max(640, Math.min(920, seededFloat(baseSeed + 9, 690, 900))));
    const speed = Number.isFinite(source.speed) ? Number(source.speed) : (Number.isFinite(fallbackSource.speed) ? Number(fallbackSource.speed) : Math.round(Math.max(5.4, Math.min(9, seededFloat(baseSeed + 13, 5.6, 8.7))) * 10) / 10);
    return { name, avatar, role, power, accuracy, avgScore, speed };
  }
  
  // ===== Network (timeouts + JSON helpers) =====
  const Net = {
    async jget(url, timeoutMs=8000){
      const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), timeoutMs);
      try{
        const res = await fetch(url, {cache:'no-store', signal:ctrl.signal});
        const txt = await res.text(); if(!txt) return null;
        try{ return JSON.parse(txt); }catch{ return null; }
      }catch{ return null; } finally{ clearTimeout(t); }
    },
    async jpost(url, data, timeoutMs=12000){
      const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), timeoutMs);
      try{
        const res = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data), signal:ctrl.signal});
        const txt = await res.text(); if(!txt) return null;
        try{ return JSON.parse(txt); }catch{ return null; }
      }catch{ return null; } finally{ clearTimeout(t); }
    }
  };

  /* === Admin API Adapter === */
  const API_BASE = '/api/public';

  const Api = {
    async config(){ return await Net.jget(`${API_BASE}/config`); },
    async categories(){ return await Net.jget(`${API_BASE}/categories`); },
    async questions({ categoryId, count, difficulty } = {}){
      const qs = new URLSearchParams();
      if (categoryId) qs.set('categoryId', categoryId);
      if (count) qs.set('count', count);
      if (difficulty) qs.set('difficulty', difficulty);
      const query = qs.toString();
      const url = query ? `${API_BASE}/questions?${query}` : `${API_BASE}/questions`;
      return await Net.jget(url);
    },
    async provinces(){ return await Net.jget(`${API_BASE}/provinces`); }
  };

  function deepApply(target, src){
    if (!src || typeof src !== 'object') return target;
    for (const k of Object.keys(src)){
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v)){
        target[k] = target[k] || {};
        deepApply(target[k], v);
      } else target[k] = v;
    }
    return target;
  }

  // ===== App State (legacy gameplay remains local) =====
  const STORAGE_KEY='quiz_webapp_pro_state_v2_fa';
  const State = {
    user:{ id:'guest', name:'کاربر مهمان', avatar:'https://i.pravatar.cc/120?img=12', province:'', group:'' },
    score:0, coins:120, lives:3, vip:false, // vip will be overridden by server
    streak:0, lastClaim:0, boostUntil:0,
    theme:'ocean',
    duelOpponent:null,
    duelWins:0,
    duelLosses:0,
    pendingDuels:[],
    duelHistory:[],
    achievements:{ firstWin:false, tenCorrect:false, streak3:false, vipBought:false },
    settings:{ sound:true, haptics:true, blockDuels:false },
    leaderboard:[
      { id:'u1', name:'آرتین', score:18200, province:'تهران', group:'قهرمانان دانش' },
      { id:'u2', name:'سمانه', score:16500, province:'اصفهان', group:'متفکران جوان' },
      { id:'u3', name:'مانی', score:14950, province:'خراسان رضوی', group:'چالش‌برانگیزان' },
      { id:'u4', name:'نیکا', score:13200, province:'فارس', group:'دانش‌آموزان نخبه' },
    ],
    provinces: [], // populated from data/provinces.json
    groups: [
      { id: 'g1', name: 'قهرمانان دانش', score: 22100, members: 23, admin: 'علی رضایی', created: '۱۴۰۲/۰۲/۱۵', memberList: ['علی رضایی','سارا اکبری','رضا کریمی','ندا فرهمند','پیام سالاری'], matches:[{opponent:'متفکران جوان', time:'۱۴۰۳/۰۵/۲۵ ۱۸:۰۰'}], requests: [], roster: cloneDefaultRoster('g1') },
      { id: 'g2', name: 'متفکران جوان', score: 19800, members: 18, admin: 'سارا محمدی', created: '۱۴۰۲/۰۳/۲۰', memberList: ['سارا محمدی','مهدی احمدی','الهام برزگر','حسین فلاح'], matches:[{opponent:'پیشروان علم', time:'۱۴۰۳/۰۵/۳۰ ۱۹:۰۰'}], requests: [], roster: cloneDefaultRoster('g2') },
      { id: 'g3', name: 'چالش‌برانگیزان', score: 20500, members: 21, admin: 'رضا قاسمی', created: '۱۴۰۲/۰۱/۱۰', memberList: ['رضا قاسمی','نازنین فراهانی','کیاوش نادری'], matches:[], requests: [], roster: cloneDefaultRoster('g3') },
      { id: 'g4', name: 'دانش‌آموزان نخبه', score: 18700, members: 15, admin: 'مریم احمدی', created: '۱۴۰۲/۰۴/۰۵', memberList: ['مریم احمدی','رها فاضلی','امیررضا حاتمی'], matches:[], requests: [], roster: cloneDefaultRoster('g4') },
      { id: 'g5', name: 'پیشروان علم', score: 21300, members: 27, admin: 'امیر حسینی', created: '۱۴۰۲/۰۲/۲۸', memberList: ['امیر حسینی','هانیه ناصری','کیارش زندی'], matches:[{opponent:'قهرمانان دانش', time:'۱۴۰۳/۰۶/۰۲ ۲۰:۰۰'}], requests: [], roster: cloneDefaultRoster('g5') },
    ],
    ads: { banner: [], native: [], interstitial: [], rewarded: [] },
    quiz:{
      inProgress:false, answered:false, correctIndex:-1,
      duration:30, remain:30, timer:null,
      list:[], idx:0, cat:'عمومی', diff:'آسان', diffValue:'easy',
      sessionEarned:0, results:[]
    },
    notifications:[
      { id:'n1', text:'جام هفتگی از ساعت ۲۰:۰۰ شروع می‌شود. آماده‌ای؟', time:'امروز' },
      { id:'n2', text:'بستهٔ سوالات «ادبیات فارسی» اضافه شد!', time:'دیروز' },
      { id:'n3', text:'با دعوت هر دوست ۵💰 هدیه بگیر! تنها بعد از اولین کوییز فعال می‌شود.', time:'۲ روز پیش' }
    ],
    groupBattle: { selectedHostId: '', selectedOpponentId: '', lastResult: null },
    referral: {
      code: 'QUIZ5F8A2B',
      rewardPerFriend: 5,
      referred: [
        {
          id: 'u1',
          name: 'سارا اکبری',
          avatar: 'https://i.pravatar.cc/120?img=47',
          invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
          firstQuizAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
          quizzesPlayed: 3,
          status: 'completed'
        },
        {
          id: 'u2',
          name: 'رضا کریمی',
          avatar: 'https://i.pravatar.cc/120?img=15',
          invitedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
          quizzesPlayed: 0,
          status: 'awaiting_quiz'
        },
        {
          id: 'u3',
          name: 'نیلوفر احمدی',
          avatar: 'https://i.pravatar.cc/120?img=20',
          invitedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          status: 'awaiting_start'
        }
      ]
    }
  };


  function ensureGroupRosters(){
    if (!Array.isArray(State.groups)) State.groups = [];
    State.groups.forEach(group => {
      const defaultRoster = cloneDefaultRoster(group.id);
      if (!Array.isArray(group.roster) || group.roster.length === 0) {
        group.roster = defaultRoster.length ? defaultRoster.map(player => ({ ...player })) : generateRosterFromMembers(group);
      } else {
        group.roster = group.roster.map((player, idx) => normalizeRosterMember(player, defaultRoster[idx], idx, group));
      }
      group.members = Math.max(group.members || 0, group.roster.length);
      if (!Array.isArray(group.memberList) || group.memberList.length === 0) {
        group.memberList = group.roster.slice(0, Math.min(5, group.roster.length)).map(p => p.name);
      }
    });
  }

  ensureGroupRosters();


  // Helper functions for group management
function isUserGroupAdmin() {
  return State.groups.some(g => g.admin === State.user.name);
}

function getUserGroup() {
  return State.groups.find(g => g.memberList?.includes(State.user.name));
}

function isUserInGroup() {
  return !!State.user.group || !!getUserGroup();
}
  
  const LIFELINE_COST = 3;
  const TIMER_CIRC = 2 * Math.PI * 64;
  const DUEL_ROUNDS = 2;
  const DUEL_QUESTIONS_PER_ROUND = 10;
  const DUEL_TIMEOUT_MS = 24 * 60 * 60 * 1000;
  let DuelSession = null;
  let PendingDuelFriend = null;
  
  function loadState(){
    try{
      const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(s) Object.assign(State,s);
      if (!State.groupBattle || typeof State.groupBattle !== 'object') {
        State.groupBattle = { selectedHostId: '', selectedOpponentId: '', lastResult: null };
      } else {
        State.groupBattle.selectedHostId = State.groupBattle.selectedHostId || '';
        State.groupBattle.selectedOpponentId = State.groupBattle.selectedOpponentId || '';
        if (!State.groupBattle.lastResult || typeof State.groupBattle.lastResult !== 'object') {
          State.groupBattle.lastResult = null;
        }
      }
      if (!State.quiz) State.quiz = {};
      if (State.quiz.diffValue == null) {
        const label = State.quiz.diff;
        if (typeof label === 'string') {
          const lower = label.toLowerCase();
          if (label.indexOf('سخت') >= 0 || lower === 'hard') {
            State.quiz.diffValue = 'hard';
          } else if (label.indexOf('متوسط') >= 0 || lower === 'medium' || lower === 'normal') {
            State.quiz.diffValue = 'medium';
          } else {
            State.quiz.diffValue = 'easy';
          }
        } else {
          State.quiz.diffValue = 'easy';
        }
      }

      // Load server state if available
      const serverState = JSON.parse(localStorage.getItem('server_state') || '{}');
      if (serverState.limits) Object.assign(Server.limits, serverState.limits);
      if (!Server.limits.duels) {
        Server.limits.duels = { used: 0, lastReset: 0, lastRecovery: 0 };
      }
      if (serverState.pass) Object.assign(Server.pass, serverState.pass);
    }catch{}
    if (!Array.isArray(State.pendingDuels)) {
      State.pendingDuels = [];
    } else {
      State.pendingDuels = State.pendingDuels.filter(duel => duel && duel.id && Number.isFinite(duel.deadline));
    }
    if (!Array.isArray(State.duelHistory)) State.duelHistory = [];
    State.duelHistory = State.duelHistory.slice(0, 20);
    State.duelOpponent = null;
    ensureGroupRosters();
  }
  
  function saveState(){ 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(State)); 
    localStorage.setItem('server_state', JSON.stringify({
      limits: Server.limits,
      pass: Server.pass
    }));
  }
  
  loadState();
  document.documentElement.setAttribute('data-theme', State.theme || 'ocean');

  const qs = new URLSearchParams(location.search);
  const duelInviter = qs.get('duel_invite');
  if(duelInviter && !State.settings.blockDuels){
    toast(`${duelInviter} شما را به نبرد دعوت کرده است!`);
  }

  // Telegram WebApp (optional)
  try{
    if(window.Telegram && Telegram.WebApp){
      Telegram.WebApp.ready();
      const u = Telegram.WebApp.initDataUnsafe?.user;
      if(u){
        State.user.id = String(u.id);
        State.user.name = [u.first_name,u.last_name].filter(Boolean).join(' ');
        if(u.username) State.user.name += ` (@${u.username})`;
      }
    }
    }catch{}

    (function setupProvinceSelect(){
    function openModal(sel){ document.querySelector(sel).classList.add('show'); }
    function closeModal(sel){ document.querySelector(sel).classList.remove('show'); }

    function fillAllProvinceSelects(){
      populateProvinceOptions(document.getElementById('first-province'), 'استان خود را انتخاب کنید');
      const editSel = document.getElementById('sel-province');
      populateProvinceOptions(editSel);
      if (editSel) editSel.value = State.user.province || '';
    }

    fillAllProvinceSelects();

    if (!State.user.province && Array.isArray(State.provinces) && State.provinces.length){
      openModal('#modal-province-select');
      setTimeout(()=>document.getElementById('first-province')?.focus(), 50);
    }

    document.getElementById('btn-confirm-province')?.addEventListener('click', () => {
      const sel = document.getElementById('first-province');
      const val = sel?.value || '';
      if (!val) { toast('لطفاً یک استان انتخاب کن'); return; }
      State.user.province = val;
      saveState();
      renderHeader();
      renderDashboard();
      renderProvinceSelect();
      closeModal('#modal-province-select');
      toast('استان شما ذخیره شد');
    });

    document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
      fillAllProvinceSelects();
      openModal('#modal-profile');
    });
  })();

  // ===== Game Limits Management =====
  function checkDailyReset() {
    const now = Date.now();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if we need to reset daily limits
    if (Server.limits.matches.lastReset < today.getTime()) {
      Server.limits.matches.used = 0;
      Server.limits.matches.lastReset = today.getTime();
    }

    if (Server.limits.duels.lastReset < today.getTime()) {
      Server.limits.duels.used = 0;
      Server.limits.duels.lastReset = today.getTime();
    }

    if (Server.limits.lives.lastReset < today.getTime()) {
      Server.limits.lives.used = 0;
      Server.limits.lives.lastReset = today.getTime();
    }

    if (Server.limits.groupBattles.lastReset < today.getTime()) {
      Server.limits.groupBattles.used = 0;
      Server.limits.groupBattles.lastReset = today.getTime();
    }

    if (Server.limits.energy.lastReset < today.getTime()) {
      Server.limits.energy.used = 0;
      Server.limits.energy.lastReset = today.getTime();
    }
    
    // Update UI
    updateLimitsUI();
    
    // Update daily reset timer
    updateDailyResetTimer(tomorrow.getTime() - now);
    
    // Check recovery timers
    updateRecoveryTimers();
    
    // Check if any limit is reached
    checkLimitsReached();
  }
  
  function updateLimitsUI() {
    const vipMultiplier = Server.subscription.active ? 
      (Server.subscription.tier === 'pro' ? 3 : 2) : 1;
    
    // Matches
    const matchesLimit = RemoteConfig.gameLimits.matches.daily * vipMultiplier;
    const matchesUsed = Server.limits.matches.used;
    const matchesPct = Math.min(100, (matchesUsed / matchesLimit) * 100);
    $('#matches-used').textContent = faNum(matchesUsed);
    $('#matches-limit').textContent = faNum(matchesLimit);
    $('#matches-progress').style.width = `${matchesPct}%`;
    
    // Duels
    const duelsLimit = RemoteConfig.gameLimits.duels.daily * vipMultiplier;
    const duelsUsed = Server.limits.duels.used;
    const duelsPct = Math.min(100, (duelsUsed / duelsLimit) * 100);
    $('#duels-used').textContent = faNum(duelsUsed);
    $('#duels-limit').textContent = faNum(duelsLimit);
    $('#duels-progress').style.width = `${duelsPct}%`;
    const duelRemainingEl = $('#duel-limit-remaining');
    const duelTotalEl = $('#duel-limit-total');
    if (duelRemainingEl && duelTotalEl) {
      duelRemainingEl.textContent = faNum(Math.max(duelsLimit - duelsUsed, 0));
      duelTotalEl.textContent = faNum(duelsLimit);
    }

    // Group Battles
    const groupLimit = RemoteConfig.gameLimits.groupBattles.daily * vipMultiplier;
    const groupUsed = Server.limits.groupBattles.used;
    const groupPct = Math.min(100, (groupUsed / groupLimit) * 100);
    $('#group-battles-used').textContent = faNum(groupUsed);
    $('#group-battles-limit').textContent = faNum(groupLimit);
    $('#group-battles-progress').style.width = `${groupPct}%`;

    // Energy (UI elements may be absent)
    const energyUsedEl = $('#energy-used');
    const energyLimitEl = $('#energy-limit');
    const energyProgEl = $('#energy-progress');
    if (energyUsedEl && energyLimitEl && energyProgEl) {
      const energyLimit = RemoteConfig.gameLimits.energy.daily * vipMultiplier;
      const energyUsed = Server.limits.energy.used;
      const energyPct = Math.min(100, (energyUsed / energyLimit) * 100);
      energyUsedEl.textContent = faNum(energyUsed);
      energyLimitEl.textContent = faNum(energyLimit);
      energyProgEl.style.width = `${energyPct}%`;
    }
  }
  
  function updateDailyResetTimer(msUntilReset) {
    const hours = Math.floor(msUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((msUntilReset % (1000 * 60)) / 1000);
    
    $('#daily-reset-timer').textContent = `ریست در ${faNum(hours)}:${faNum(minutes).padStart(2, '0')}:${faNum(seconds).padStart(2, '0')}`;
  }
  
  function updateRecoveryTimers() {
    const now = Date.now();

    // Energy recovery
    const energyTimer = $('#energy-recovery-timer');
    if (energyTimer) {
      if (Server.limits.energy.used > 0) {
        const energyRecoveryTime = RemoteConfig.gameLimits.energy.recoveryTime;
        const timeUntilEnergyRecovery = energyRecoveryTime - (now - Server.limits.energy.lastRecovery);

        if (timeUntilEnergyRecovery > 0) {
          const minutes = Math.floor(timeUntilEnergyRecovery / (1000 * 60));
          const seconds = Math.floor((timeUntilEnergyRecovery % (1000 * 60)) / 1000);
          energyTimer.textContent = `بازیابی بعدی: ${faNum(minutes)}:${faNum(seconds).padStart(2, '0')}`;
        } else {
          energyTimer.textContent = 'بازیابی بعدی: اکنون';
        }
      } else {
        energyTimer.textContent = 'بازیابی بعدی: --:--';
      }
    }
  }
  
  function checkLimitsReached() {
    const vipMultiplier = Server.subscription.active ? 
      (Server.subscription.tier === 'pro' ? 3 : 2) : 1;
    
    const matchesLimit = RemoteConfig.gameLimits.matches.daily * vipMultiplier;
    const duelsLimit = RemoteConfig.gameLimits.duels.daily * vipMultiplier;
    const groupLimit = RemoteConfig.gameLimits.groupBattles.daily * vipMultiplier;

    const matchesReached = Server.limits.matches.used >= matchesLimit;
    const duelsReached = Server.limits.duels.used >= duelsLimit;
    const groupReached = Server.limits.groupBattles.used >= groupLimit;
    const energyLimit = RemoteConfig.gameLimits.energy.daily * vipMultiplier;
    const energyReached = $('#energy-used') ? Server.limits.energy.used >= energyLimit : false;

    // Show/hide limit reached CTAs
    $('#limit-reached-ctas').classList.toggle('hidden', !(matchesReached || duelsReached || groupReached || energyReached));

    
    // Log analytics if limit reached
    if (matchesReached && !State.limitsLogged?.matches) {
      logEvent('limit_reached', { type: 'matches', limit: matchesLimit });
      State.limitsLogged = State.limitsLogged || {};
      State.limitsLogged.matches = true;
    }
    
    if (duelsReached && !State.limitsLogged?.duels) {
      logEvent('limit_reached', { type: 'duels', limit: duelsLimit });
      State.limitsLogged = State.limitsLogged || {};
      State.limitsLogged.duels = true;
    }

    if (groupReached && !State.limitsLogged?.groupBattles) {
      logEvent('limit_reached', { type: 'groupBattles', limit: groupLimit });
      State.limitsLogged = State.limitsLogged || {};
      State.limitsLogged.groupBattles = true;
    }
    
    if (energyReached && !State.limitsLogged?.energy) {
      logEvent('limit_reached', { type: 'energy', limit: energyLimit });
      State.limitsLogged = State.limitsLogged || {};
      State.limitsLogged.energy = true;
    }
  }

  function useGameResource(type) {
    if (type === 'energy') return true;
    const now = Date.now();

    // Check if we can use the resource
    const vipMultiplier = Server.subscription.active ?
      (Server.subscription.tier === 'pro' ? 3 : 2) : 1;

    const limit = RemoteConfig.gameLimits[type].daily * vipMultiplier;

    if (Server.limits[type].used >= limit) {
      return false;
    }

    // Use the resource
    Server.limits[type].used++;
    Server.limits[type].lastRecovery = now;

    // Update UI
    updateLimitsUI();
    checkLimitsReached();

    // Save state
    saveState();

    return true;
  }

  function recoverGameResource(type) {
    if (type === 'energy') return false;
    const now = Date.now();

    // Check if we can recover
    if (Server.limits[type].used <= 0) {
      return false;
    }

    // Check recovery time
    const recoveryTime = RemoteConfig.gameLimits[type].recoveryTime;
    const timeSinceLastRecovery = now - Server.limits[type].lastRecovery;

    if (timeSinceLastRecovery < recoveryTime) {
      return false;
    }

    // Recover the resource
    Server.limits[type].used--;
    Server.limits[type].lastRecovery = now;

    // Update UI
    updateLimitsUI();
    checkLimitsReached();

    // Save state
    saveState();

    return true;
  }
  
  // ===== Rendering (legacy + wallet/sub from server) =====
  function renderHeader(){
    $('#hdr-name').textContent = State.user.name;
    $('#hdr-score').textContent = faNum(State.score);
    $('#hdr-gcoins').textContent = faNum(State.coins);
    $('#hdr-avatar').src = State.user.avatar;
    
    // Apply province frame if user has it
    if (Server.pass.provinceFrame) {
      $('#hdr-avatar').classList.add('province-frame');
    } else {
      $('#hdr-avatar').classList.remove('province-frame');
    }
    
    // Apply VIP frame if user is VIP
    if (Server.subscription.active) {
      $('#hdr-avatar').classList.add('vip-frame');
    } else {
      $('#hdr-avatar').classList.remove('vip-frame');
    }
    
    // server numbers:
    $('#hdr-wallet').textContent = (Server.wallet.coins==null?'—':faNum(Server.wallet.coins));
    const vip = Server.subscription.active===true;
    $('#vip-badge').classList.toggle('hidden', !vip);
  }
  
  function renderDashboard(){
    $('#profile-name').textContent = State.user.name;
    $('#profile-avatar').src = State.user.avatar;
    
    // Apply frames
    if (Server.pass.provinceFrame) {
      $('#profile-avatar').classList.add('province-frame');
    } else {
      $('#profile-avatar').classList.remove('province-frame');
    }
    
    if (Server.subscription.active) {
      $('#profile-avatar').classList.add('vip-frame');
    } else {
      $('#profile-avatar').classList.remove('vip-frame');
    }
    
    $('#stat-score').textContent = faNum(State.score);
    $('#stat-coins').textContent = faNum(State.coins);
    $('#stat-lives').textContent = faNum(State.lives);
    $('#vip-chip').classList.toggle('hidden', !Server.subscription.active);
    $('#streak').textContent = faNum(State.streak);
    $('#stat-wallet').textContent = (Server.wallet.coins==null?'—':faNum(Server.wallet.coins));
    const pct = clamp((State.streak%7)/7*100,0,100);
    $('#streak-bar').style.width = pct + '%';
    
    // Top provinces and rank
    const provincesSorted = [...State.provinces].sort((a,b)=>b.score-a.score);
    const topWrap = $('#province-top');
    if(topWrap){
      topWrap.innerHTML = provincesSorted.slice(0,2).map((p,i)=>{
        let badgeClass = 'bg-white/20';
        if(i===0) badgeClass = 'bg-gradient-to-br from-yellow-200 to-yellow-400 text-gray-900';
        else if(i===1) badgeClass = 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900';
        return `
        <div class="glass rounded-xl p-3 flex flex-col items-center text-center card-hover">
          <span class="rank-badge ${badgeClass} mb-2">${faNum(i+1)}</span>
          <div class="font-bold">${p.name}</div>
          <div class="text-xs opacity-80 mt-1">${faNum(p.score)} امتیاز</div>
        </div>`;}).join('');
    }

    const myProvRankEl = $('#my-province-rank');
    const userProvince = State.user.province;
    const myProvIdx = provincesSorted.findIndex(p=>p.name===userProvince);
    if(myProvRankEl){
      if(userProvince){
        myProvRankEl.innerHTML = `<span class="chip"><i class="fas fa-flag text-green-300 ml-1"></i> رتبه استان شما: ${faNum(myProvIdx+1)}</span>`;
      }else{
        myProvRankEl.innerHTML = '<span class="chip">استان شما تعیین نشده</span>';
      }
    }

    // rank
    const me = { id: State.user.id, score: State.score, province: State.user.province };
    const arr = [...State.leaderboard.filter(x=>x.id!==me.id), {id:me.id,name:State.user.name,score:me.score,province:me.province}].sort((a,b)=>b.score-a.score);
    const countryIdx = arr.findIndex(x=>x.id===me.id);
    $('#rank-country').textContent = countryIdx>=0 ? faNum(countryIdx+1) : '—';

    const provArr = arr.filter(x=>x.province===me.province);
    const provIdx = provArr.findIndex(x=>x.id===me.id);
    $('#rank-province').textContent = provIdx>=0 ? faNum(provIdx+1) : '—';
    $('#user-province').textContent = me.province || '—';
    const userGroupObj = getUserGroup();
    const groupName = userGroupObj?.name || State.user.group || '';
    const hasGroup = !!groupName;
    $('#user-group').textContent = hasGroup ? groupName : 'بدون گروه';
    $('#user-group-empty-hint')?.classList.toggle('hidden', hasGroup);
    const groupCard = $('#btn-view-group');
    if(groupCard){
      groupCard.dataset.empty = hasGroup ? 'false' : 'true';
      const groupIcon = groupCard.querySelector('.location-icon i');
      if(groupIcon){
        groupIcon.classList.toggle('fa-users', hasGroup);
        groupIcon.classList.toggle('fa-user-plus', !hasGroup);
      }
    }
    $('#no-group-hint')?.classList.toggle('hidden', hasGroup);
    $('#duel-wins').textContent = faNum(State.duelWins);
    $('#duel-losses').textContent = faNum(State.duelLosses);

    // Update limits UI
    updateLimitsUI();
  }
  
  function renderTopBars(){
    $('#lives').textContent = faNum(State.lives);
    $('#coins').textContent = faNum(State.coins);
    updateLifelineStates();
  }

  function renderReferral(){
    const rewardPerFriend = Number(State.referral?.rewardPerFriend ?? 5);
    const code = State.referral?.code || '—';
    const codeEl = $('#referral-code-value');
    if (codeEl) codeEl.textContent = code;
    const rewardBadge = $('#referral-reward-per-friend');
    if (rewardBadge) rewardBadge.textContent = faNum(rewardPerFriend);
    const heroCoin = document.querySelector('.referral-coin-value');
    if (heroCoin) heroCoin.textContent = `+${faNum(rewardPerFriend)}`;

    const rawList = Array.isArray(State.referral?.referred) ? State.referral.referred : [];
    const parseDate = value => {
      if (!value) return null;
      if (value instanceof Date) return value;
      const parsed = new Date(value);
      return Number.isFinite(parsed.getTime()) ? parsed : null;
    };

    const normalized = rawList.map(friend => {
      const invitedAt = parseDate(friend.invitedAt ?? friend.date);
      const startedAt = parseDate(friend.startedAt);
      const firstQuizAt = parseDate(friend.firstQuizAt);
      const status = friend.status || (firstQuizAt ? 'completed' : startedAt ? 'awaiting_quiz' : 'awaiting_start');
      const avatar = friend.avatar || `https://i.pravatar.cc/120?u=${encodeURIComponent(friend.id || friend.name || Math.random())}`;
      const quizzesPlayed = friend.quizzesPlayed ?? (firstQuizAt ? Math.max(1, Number(friend.quizzesPlayed) || 1) : 0);
      Object.assign(friend, { invitedAt, startedAt, firstQuizAt, status, avatar, quizzesPlayed });
      if (status === 'completed') friend.reward = rewardPerFriend;
      return { ...friend };
    });

    const total = normalized.length;
    const active = normalized.filter(f => f.status !== 'awaiting_start').length;
    const qualified = normalized.filter(f => f.status === 'completed').length;
    const pendingQuiz = normalized.filter(f => f.status === 'awaiting_quiz').length;
    const pendingStart = normalized.filter(f => f.status === 'awaiting_start').length;
    const earned = qualified * rewardPerFriend;
    const potential = (total - qualified) * rewardPerFriend;

    const setNumber = (id, value) => {
      const el = $('#'+id);
      if (el) el.textContent = faNum(value);
    };
    setNumber('referral-stat-total', total);
    setNumber('referral-stat-active', active);
    setNumber('referral-stat-qualified', qualified);
    setNumber('referral-stat-earned', earned);

    const friendsCount = $('#referral-friends-count');
    if (friendsCount) friendsCount.textContent = total ? `${faNum(total)} دوست` : '۰ دوست';

    const pendingHint = $('#referral-pending-hint');
    if (pendingHint) {
      if (!total) {
        pendingHint.classList.add('hidden');
      } else {
        const span = pendingHint.querySelector('span');
        const parts = [];
        if (pendingQuiz) parts.push(`${faNum(pendingQuiz)} دوست منتظر اولین کوییز`);
        if (pendingStart) parts.push(`${faNum(pendingStart)} دوست هنوز ربات را استارت نکرده‌اند`);
        if (parts.length) {
          if (span) span.innerHTML = `${parts.join(' و ')} • پاداش بالقوه: <span class="text-yellow-300 font-bold">${faNum(potential)}💰</span>`;
          pendingHint.classList.remove('hidden');
        } else {
          if (span) span.innerHTML = `همه دعوت‌ها تایید شده‌اند. مجموع پاداش آزاد شده: <span class="text-yellow-300 font-bold">${faNum(earned)}💰</span>`;
          pendingHint.classList.remove('hidden');
        }
      }
    }

    const listWrap = $('#referral-friends');
    if (listWrap) {
      listWrap.innerHTML = '';
      if (!normalized.length) {
        listWrap.innerHTML = `
          <div class="referral-empty">
            <div class="referral-empty-icon"><i class="fas fa-user-plus"></i></div>
            <p class="text-sm leading-7 opacity-90">هنوز دوستی دعوت نشده است. لینک بالا را ارسال کن تا بعد از اولین کوییز، ${faNum(rewardPerFriend)} سکه هدیه بگیری.</p>
            <button class="btn btn-secondary btn-inline w-full sm:w-auto" id="referral-empty-share">
              <i class="fas fa-share-nodes ml-2"></i> شروع دعوت
            </button>
          </div>`;
        listWrap.querySelector('#referral-empty-share')?.addEventListener('click', () => $('#btn-share-referral')?.click());
      } else {
        const order = { completed: 0, awaiting_quiz: 1, awaiting_start: 2 };
        normalized.sort((a, b) => {
          const stateDiff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
          if (stateDiff !== 0) return stateDiff;
          const timeA = (a.firstQuizAt || a.startedAt || a.invitedAt)?.getTime?.() || 0;
          const timeB = (b.firstQuizAt || b.startedAt || b.invitedAt)?.getTime?.() || 0;
          return timeB - timeA;
        });

        normalized.forEach(friend => {
          const statusMeta = {
            completed: { icon: 'fa-circle-check', label: 'پاداش واریز شد', state: 'completed' },
            awaiting_quiz: { icon: 'fa-hourglass-half', label: 'در انتظار اولین کوییز', state: 'awaiting_quiz' },
            awaiting_start: { icon: 'fa-paper-plane', label: 'منتظر شروع ربات', state: 'awaiting_start' }
          };
          const meta = statusMeta[friend.status] || statusMeta.awaiting_start;
          let timeline = 'در انتظار اقدام دوست';
          if (friend.status === 'completed' && friend.firstQuizAt) {
            timeline = `پاداش تایید شد ${formatRelativeTime(friend.firstQuizAt.getTime())}`;
          } else if (friend.status === 'awaiting_quiz' && friend.startedAt) {
            timeline = `ربات استارت شده ${formatRelativeTime(friend.startedAt.getTime())}`;
          } else if (friend.invitedAt) {
            timeline = `دعوت ارسال شد ${formatRelativeTime(friend.invitedAt.getTime())}`;
          }

          const badges = [];
          if (friend.invitedAt) badges.push(`<span class="chip text-[0.7rem] bg-white/10 border-white/20"><i class="fas fa-paper-plane ml-1"></i>${formatRelativeTime(friend.invitedAt.getTime())}</span>`);
          if (friend.startedAt) badges.push(`<span class="chip text-[0.7rem] bg-sky-500/20 border-sky-300/40"><i class="fas fa-rocket ml-1"></i>${formatRelativeTime(friend.startedAt.getTime())}</span>`);
          if (friend.firstQuizAt) badges.push(`<span class="chip text-[0.7rem] bg-emerald-500/20 border-emerald-300/40"><i class="fas fa-check ml-1"></i>${faNum(friend.quizzesPlayed || 1)} کوییز</span>`);

          const card = document.createElement('div');
          card.className = 'referral-friend-card';
          card.innerHTML = `
            <div class="referral-friend-meta">
              <img src="${friend.avatar}" class="referral-friend-avatar" alt="${friend.name}">
              <div class="min-w-0 space-y-1">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <span class="font-bold text-base truncate">${friend.name}</span>
                  <span class="referral-status" data-state="${meta.state}"><i class="fas ${meta.icon} ml-1"></i>${meta.label}</span>
                </div>
                <div class="text-xs opacity-75 leading-6">${timeline}</div>
                <div class="referral-friend-badges">${badges.join('')}</div>
              </div>
            </div>
            <div class="flex flex-col items-end gap-2">
              <span class="referral-reward" data-earned="${friend.status === 'completed'}">${friend.status === 'completed' ? `+${faNum(rewardPerFriend)}💰` : `۰/${faNum(rewardPerFriend)}💰`}</span>
              ${friend.status === 'completed' && friend.quizzesPlayed ? `<span class="text-[0.7rem] opacity-75 flex items-center gap-1"><i class="fas fa-trophy text-yellow-300"></i>${faNum(friend.quizzesPlayed)} مسابقه</span>` : ''}
            </div>`;
          listWrap.appendChild(card);
        });
      }
    }
  }

  function animateKeyChip(){
    const chip = $('#lives')?.closest('.chip');
    if(!chip) return;
    chip.classList.remove('attention');
    void chip.offsetWidth;
    chip.classList.add('attention');
    setTimeout(()=>chip.classList.remove('attention'), 650);
  }

  function updateLifelineStates(){
    const hasKeys = State.lives >= LIFELINE_COST;
    ['life-5050','life-skip','life-pause'].forEach(id=>{
      const btn = $('#'+id);
      if(!btn) return;
      if(btn.disabled){
        btn.dataset.insufficient = 'false';
        const costEl = btn.querySelector('.lifeline-cost');
        if(costEl) costEl.classList.remove('not-enough');
        return;
      }
      btn.dataset.insufficient = hasKeys ? 'false' : 'true';
      const costEl = btn.querySelector('.lifeline-cost');
      if(costEl) costEl.classList.toggle('not-enough', !hasKeys);
    });
  }

  function spendLifelineCost(){
    if(State.lives < LIFELINE_COST){
      toast(`برای استفاده از این قابلیت به ${faNum(LIFELINE_COST)} کلید نیاز داری`);
      animateKeyChip();
      return false;
    }
    State.lives -= LIFELINE_COST;
    renderTopBars();
    saveState();
    animateKeyChip();
    return true;
  }

  function markLifelineUsed(id){
    const btn = typeof id === 'string' ? $('#'+id) : id;
    if(!btn) return;
    btn.disabled = true;
    btn.dataset.used = 'true';
    btn.dataset.insufficient = 'false';
    const costEl = btn.querySelector('.lifeline-cost');
    if(costEl){
      costEl.classList.remove('not-enough');
      costEl.classList.add('hidden');
    }
    const statusEl = btn.querySelector('.lifeline-status');
    if(statusEl) statusEl.classList.remove('hidden');
    updateLifelineStates();
  }

  function resetLifelinesUI(){
    ['life-5050','life-skip','life-pause'].forEach(id=>{
      const btn = $('#'+id);
      if(!btn) return;
      btn.disabled = false;
      btn.dataset.used = 'false';
      btn.dataset.insufficient = 'false';
      const costEl = btn.querySelector('.lifeline-cost');
      if(costEl){
        costEl.classList.remove('hidden','not-enough');
      }
      const statusEl = btn.querySelector('.lifeline-status');
      if(statusEl){
        statusEl.classList.add('hidden');
      }
    });
    updateLifelineStates();
  }

  updateLifelineStates();
  
  const NAV_PAGES=['dashboard','quiz','leaderboard','shop','wallet','vip','results','duel','province','group','pass-missions','referral','support','question-lab'];
  const NAV_PAGE_SET=new Set(NAV_PAGES);

  function navTo(page){
    if(!NAV_PAGE_SET.has(page)){
      console.warn(`[navTo] Unknown page target: ${page}`);
      return;
    }
    NAV_PAGES.forEach(p=>$('#page-'+p)?.classList.add('hidden'));
    $('#page-'+page)?.classList.remove('hidden'); $('#page-'+page)?.classList.add('fade-in');
    $$('nav [data-tab]').forEach(b=>{ b.classList.toggle('bg-white/10', b.dataset.tab===page); b.classList.toggle('active', b.dataset.tab===page); });
    if(page==='dashboard') { renderDashboard(); AdManager.renderNative('#ad-native-dashboard'); }
    if(page==='leaderboard'){ renderLeaderboard(); AdManager.renderNative('#ad-native-lb'); }
    if(page==='wallet'){ buildPackages(); }
    if(page==='vip'){ updateVipUI(); }
    if(page==='referral'){ renderReferral(); }
    if(page==='question-lab'){ buildCommunityQuestionForm(); prefillCommunityAuthor(); syncCommunityOptionStates(); }
  }
  
  // ===== Leaderboard / Details (unchanged + detail popups) =====
  function renderLeaderboard(){
    const me = { id: State.user.id, name: State.user.name, score: State.score };
    const arr = [...State.leaderboard.filter(x=>x.id!==me.id), me].sort((a,b)=>b.score-a.score).slice(0,50);
    const wrap = $('#lb-list'); wrap.innerHTML='';
    arr.forEach((u,i)=>{
      const row=document.createElement('div');
      row.className='flex items-center justify-between bg-white/10 border border-white/20 rounded-xl px-4 py-3 card-hover';
      const rank=i+1;
      let badgeClass='bg-white/20';
      if(rank===1) badgeClass='bg-gradient-to-br from-yellow-200 to-yellow-400 text-gray-900';
      else if(rank===2) badgeClass='bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900';
      else if(rank===3) badgeClass='bg-gradient-to-br from-amber-600 to-amber-700 text-gray-900';
      const rankBadge=`<span class="rank-badge ${badgeClass}">${faNum(rank)}</span>`;
      row.innerHTML=`<div class="flex items-center gap-3">${rankBadge}
        <div><div class="font-bold">${u.name}</div>
        <div class="text-xs opacity-80 flex items-center gap-1"><i class="fas fa-star text-yellow-300"></i><span>${faNum(u.score)}</span></div></div></div>`;
      row.addEventListener('click', () => showUserDetail({...u, nationalRank:rank}));
      wrap.appendChild(row);
    });
    
    // provinces
    const provinceList = $('#province-list'); provinceList.innerHTML='';
    const provincesSorted = [...State.provinces].sort((a,b)=>b.score-a.score);
    provincesSorted.forEach((p,i)=>{
      const row=document.createElement('div');
      row.className='location-card';
      const rank=i+1;
      let badgeClass='bg-white/20';
      if(rank===1) badgeClass='bg-gradient-to-br from-yellow-200 to-yellow-400 text-gray-900';
      else if(rank===2) badgeClass='bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900';
      else if(rank===3) badgeClass='bg-gradient-to-br from-amber-600 to-amber-700 text-gray-900';
      row.innerHTML=`<span class="rank-badge ${badgeClass}">${faNum(rank)}</span>
        <div class="location-icon province-icon"><i class="fas fa-map-marked-alt"></i></div>
        <div class="flex-1"><div class="font-bold">${p.name}</div>
        <div class="text-sm opacity-80 flex items-center gap-1"><i class="fas fa-users"></i><span>${faNum(p.members)} شرکت‌کننده</span></div></div>
        <div class="text-sm font-bold text-green-300"><i class="fas fa-trophy"></i> ${faNum(p.score)}</div>`;
      if(p.name===State.user.province){
        row.classList.add('ring-2','ring-green-300');
        setTimeout(()=>row.scrollIntoView({behavior:'smooth',block:'center'}),0);
      }
      row.addEventListener('click', () => showProvinceDetail({...p, rank}));
      provinceList.appendChild(row);
    });

    const myProvRankElLb = $('#my-province-rank-lb');
    if(myProvRankElLb){
      const myProvIdx = provincesSorted.findIndex(p=>p.name===State.user.province);
      if(State.user.province && myProvIdx !== -1){
        myProvRankElLb.innerHTML = `<span class="chip"><i class="fas fa-flag text-green-300 ml-1"></i> رتبه استان شما: ${faNum(myProvIdx+1)}</span>`;
      }else{
        myProvRankElLb.innerHTML = '<span class="chip">استان شما تعیین نشده</span>';
      }
    }
    
    // groups
    const groupList = $('#group-list'); groupList.innerHTML='';
    State.groups.sort((a,b)=>b.score-a.score).forEach((g,i)=>{
      const row=document.createElement('div');
      row.className='location-card';
      const rank=i+1;
        let badgeClass='bg-white/20';
        if(rank===1) badgeClass='bg-gradient-to-br from-yellow-200 to-yellow-400 text-gray-900';
        else if(rank===2) badgeClass='bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900';
        else if(rank===3) badgeClass='bg-gradient-to-br from-amber-600 to-amber-700 text-gray-900';
        row.innerHTML=`<span class="rank-badge ${badgeClass}">${faNum(rank)}</span>
        <div class="location-icon group-icon"><i class="fas fa-users"></i></div>
        <div class="flex-1"><div class="font-bold">${g.name}</div>
        <div class="text-sm opacity-80 flex items-center gap-1"><i class="fas fa-user"></i><span>مدیر: ${g.admin}</span></div></div>
        <div class="text-sm font-bold text-purple-300"><i class="fas fa-trophy"></i> ${faNum(g.score)}</div>`;
      row.addEventListener('click', () => showGroupDetail({...g, rank}));
      groupList.appendChild(row);
    });
  }
  
  function showDetailPopup(title, content, options = {}) {
    const popup = $('#detail-popup');
    const overlay = $('#detail-overlay');
    if (!popup || !overlay) return;
    popup.dataset.context = options.context || '';
    $('#detail-title').textContent = title;
    $('#detail-content').innerHTML = content;
    popup.classList.add('show');
    overlay.classList.add('show');
  }

  function cancelDuelSession(reason) {
    if (!DuelSession) return;
    const duelId = DuelSession?.id;
    if (duelId && Array.isArray(State.pendingDuels)) {
      const prevLength = State.pendingDuels.length;
      State.pendingDuels = State.pendingDuels.filter(duel => duel.id !== duelId);
      if (State.pendingDuels.length !== prevLength) saveState();
    }
    if (DuelSession.resolveStart) {
      try { DuelSession.resolveStart(false); } catch (_) {}
      DuelSession.resolveStart = null;
    }
    DuelSession.awaitingSelection = false;
    DuelSession.selectionResolved = true;
    DuelSession = null;
    State.duelOpponent = null;
    $('#duel-banner')?.classList.add('hidden');
    hideDuelAddFriendCTA();
    if (reason === 'selection_cancelled' || reason === 'user_cancelled') {
      toast('نبرد لغو شد');
    } else if (reason === 'no_category') {
      toast('شروع نبرد ممکن نشد');
    }
    logEvent('duel_cancelled', { reason });
  }

  function closeDetailPopup(options = {}) {
    const popup = $('#detail-popup');
    const overlay = $('#detail-overlay');
    const context = popup?.dataset?.context || '';
    popup?.classList.remove('show');
    overlay?.classList.remove('show');
    const shouldCancel = !(options.skipDuelCancel || context === 'info');
    if (shouldCancel && DuelSession?.awaitingSelection && !DuelSession?.selectionResolved) {
      cancelDuelSession('selection_cancelled');
    }
    if (popup) popup.dataset.context = '';
  }

  function getNextPendingDuel(){
    if (!Array.isArray(State.pendingDuels) || !State.pendingDuels.length) return null;
    const upcoming = State.pendingDuels
      .filter(duel => duel && Number.isFinite(duel.deadline))
      .sort((a,b) => a.deadline - b.deadline);
    return upcoming[0] || null;
  }

  function applyExpiredDuelPenalties(options = {}){
    if (!Array.isArray(State.pendingDuels) || !State.pendingDuels.length) return 0;
    const now = Date.now();
    const stillPending = [];
    const expired = [];
    for (const duel of State.pendingDuels){
      if (!duel || !Number.isFinite(duel.deadline)) continue;
      if (now > duel.deadline) expired.push(duel);
      else stillPending.push(duel);
    }
    if (!expired.length){
      State.pendingDuels = stillPending;
      return 0;
    }
    const resolvedAt = now;
    State.pendingDuels = stillPending;
    State.duelHistory = Array.isArray(State.duelHistory) ? State.duelHistory : [];
    expired.forEach(duel => {
      State.duelLosses++;
      State.duelHistory.unshift({
        id: duel.id,
        opponent: duel.opponent || 'حریف',
        outcome: 'loss',
        reason: 'timeout',
        resolvedAt,
        startedAt: duel.startedAt,
        deadline: duel.deadline
      });
    });
    State.duelHistory = State.duelHistory.slice(0, 20);
    saveState();
    if (!options.skipRender) renderDashboard();
    if (!options.silent){
      const countText = expired.length === 1 ? 'یک نبرد' : `${faNum(expired.length)} نبرد`;
      toast(`<i class="fas fa-hourglass-end ml-2"></i>${countText} به دلیل اتمام مهلت ۲۴ ساعته باخت شد.`);
    }
    logEvent('duel_timeout_penalty', { count: expired.length });
    return expired.length;
  }

  function showDuelRecordSummary(type){
    vibrate(15);
    const wins = Number(State.duelWins) || 0;
    const losses = Number(State.duelLosses) || 0;
    const history = Array.isArray(State.duelHistory) ? State.duelHistory : [];
    const draws = history.filter(entry => entry?.outcome === 'draw').length;
    const totalMatches = wins + losses + draws;
    const winRate = totalMatches ? Math.round((wins / totalMatches) * 100) : 0;
    const lossRate = totalMatches ? Math.round((losses / totalMatches) * 100) : 0;
    const accent = type === 'wins'
      ? { title:'پرونده بردهای اخیر', icon:'fa-trophy', color:'text-emerald-300', bg:'bg-emerald-500/10', border:'border-emerald-400/40', highlight:`مجموع بردها: ${faNum(wins)} • نرخ برد کلی: ${faNum(winRate)}٪` }
      : { title:'پرونده باخت‌های اخیر', icon:'fa-skull', color:'text-rose-300', bg:'bg-rose-500/10', border:'border-rose-400/40', highlight:`مجموع باخت‌ها: ${faNum(losses)}` };
    const relevantHistory = history.filter(entry => entry && entry.outcome === (type === 'wins' ? 'win' : 'loss'));
    if (type === 'losses'){
      const timeoutCount = relevantHistory.filter(entry => entry.reason === 'timeout').length;
      accent.highlight += timeoutCount ? ` • ${faNum(timeoutCount)} باخت به‌دلیل اتمام مهلت` : '';
      accent.highlight += totalMatches ? ` • نرخ باخت: ${faNum(lossRate)}٪` : '';
    }
    const itemsHtml = relevantHistory.slice(0, 4).map(entry => {
      const opponent = entry.opponent || 'حریف ناشناس';
      const timeLabel = formatRelativeTime(entry.resolvedAt);
      let resultLabel;
      if (entry.reason === 'timeout') resultLabel = 'مهلت تمام شد';
      else if (entry.reason === 'draw') resultLabel = 'نتیجه مساوی';
      else resultLabel = `امتیاز ${faNum(entry.yourScore || 0)} - ${faNum(entry.opponentScore || 0)}`;
      return `<div class="glass rounded-xl p-3 flex items-center justify-between gap-3 text-sm">
        <div class="flex flex-col">
          <span class="font-bold">${opponent}</span>
          <span class="opacity-80">${resultLabel}</span>
        </div>
        <span class="text-xs opacity-70 whitespace-nowrap">${timeLabel}</span>
      </div>`;
    }).join('');
    const drawsChip = draws ? `<span class="chip text-sky-200 bg-sky-500/20 border-sky-500/30"><i class="fas fa-scale-balanced"></i>${faNum(draws)} مساوی</span>` : '';
    const listSection = itemsHtml || '<div class="glass rounded-xl p-4 text-sm opacity-80 text-center">هنوز سابقه‌ای در این بخش ثبت نشده است.</div>';
    const activeCount = Array.isArray(State.pendingDuels) ? State.pendingDuels.length : 0;
    let activeHtml = '';
    if (activeCount){
      const next = getNextPendingDuel();
      const diff = next ? next.deadline - Date.now() : 0;
      const timeLeft = next ? (diff > 0 ? formatDuration(diff) : 'مهلت رو به پایان') : '';
      const opponentLabel = next?.opponent ? ` • حریف: ${next.opponent}` : '';
      const meta = next ? `${timeLeft}${opponentLabel}` : '';
      activeHtml = `<div class="glass rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3">
        <div class="flex items-center gap-2"><i class="fas fa-hourglass-half text-amber-300"></i><span>${faNum(activeCount)} نبرد در انتظار پاسخ</span></div>
        ${meta ? `<span class="opacity-80">${meta}</span>` : ''}
      </div>`;
    }
    const summaryHtml = `<div class="glass rounded-2xl p-4 text-sm border ${accent.border} ${accent.bg}">
        <div class="flex items-center gap-2 text-base font-bold ${accent.color}"><i class="fas ${accent.icon}"></i>${accent.highlight}</div>
        ${drawsChip ? `<div class="mt-3 flex flex-wrap gap-2">${drawsChip}</div>` : ''}
      </div>
      <div class="space-y-2 mt-4">${listSection}</div>
      ${activeHtml}`;
    showDetailPopup(accent.title, summaryHtml, { context: 'info' });
  }
  
  function showUserDetail(user) {
    const currentGroupName = getUserGroup()?.name || State.user.group || '';
    const all = [...State.leaderboard, { id: State.user.id, name: State.user.name, score: State.score, province: State.user.province, group: currentGroupName }].sort((a,b)=>b.score-a.score);
    const nationalRank = user.nationalRank || (all.findIndex(x => x.id === user.id) + 1);
    const provinceRank = all.filter(x => x.province === user.province).sort((a,b)=>b.score-a.score).findIndex(x => x.id === user.id) + 1;
    const content = `
      <div class="flex flex-col items-center mb-4">
        <img src="${user.avatar || `https://i.pravatar.cc/120?u=${encodeURIComponent(user.name)}`}" class="w-20 h-20 rounded-full border-4 border-white/30 shadow-lg mb-3" alt="avatar">
        <h4 class="text-xl font-bold">${user.name}</h4>
        <div class="text-sm opacity-80 mt-1">کاربر فعال</div>
      </div>
      <div class="space-y-3">
        <div class="flex justify-between items-center glass rounded-xl p-3"><span class="opacity-80 flex items-center gap-2"><i class="fas fa-star text-yellow-300"></i>امتیاز کل</span><span class="font-bold text-yellow-300">${faNum(user.score)}</span></div>
        <div class="flex justify-between items-center glass rounded-xl p-3"><span class="opacity-80 flex items-center gap-2"><i class="fas fa-map-marker-alt text-pink-400"></i>استان</span><span class="font-bold">${user.province || '—'}</span></div>
        <div class="flex justify-between items-center glass rounded-xl p-3"><span class="opacity-80 flex items-center gap-2"><i class="fas fa-users text-blue-300"></i>گروه</span><span class="font-bold">${user.group || '—'}</span></div>
        <div class="flex justify-between items-center glass rounded-xl p-3"><span class="opacity-80 flex items-center gap-2"><i class="fas fa-globe text-yellow-300"></i>رتبه کشوری</span><span class="font-bold text-yellow-300">${faNum(nationalRank)}</span></div>
        <div class="flex justify-between items-center glass rounded-xl p-3"><span class="opacity-80 flex items-center gap-2"><i class="fas fa-flag text-green-300"></i>رتبه استانی</span><span class="font-bold text-green-300">${faNum(provinceRank)}</span></div>
        <div class="flex justify-between items-center glass rounded-xl p-3"><span class="opacity-80 flex items-center gap-2"><i class="fas fa-calendar-alt"></i>تاریخ عضویت</span><span class="font-bold">${user.joined || '۱۴۰۲/۰۱/۱۵'}</span></div>
      </div>
      <button id="btn-user-duel" class="btn btn-duel w-full mt-4" aria-label="درخواست نبرد تن به تن"><i class="fas fa-swords ml-2"></i> درخواست نبرد</button>`;
    showDetailPopup('جزئیات کاربر', content);
    $('#btn-user-duel')?.addEventListener('click', () => {
      toast(`درخواست نبرد برای ${user.name} ارسال شد`);
      logEvent('duel_request', { from: State.user.name, to: user.name });
      closeDetailPopup();
    });
  }
  
  function showProvinceDetail(province) {
    const content = `
      <div class="flex flex-col items-center mb-4">
        <div class="w-20 h-20 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center mb-3"><i class="fas fa-map-marked-alt text-white text-2xl"></i></div>
        <h4 class="text-xl font-bold">${province.name}</h4>
        <div class="text-sm opacity-80 mt-1">${province.region}</div>
      </div>
      <div class="space-y-3">
        <div class="flex justify-between items-center glass rounded-xl p-3"><span class="opacity-80">امتیاز کل</span><span class="font-bold text-green-300">${faNum(province.score)}</span></div>
        <div class="flex justify-between items-center glass rounded-xl p-3"><span class="opacity-80">تعداد شرکت‌کنندگان</span><span class="font-bold">${faNum(province.members)}</span></div>
      </div>`;
    showDetailPopup('جزئیات استان', content);
  }
  
  function showGroupDetail(group) {
    const userGroup = getUserGroup();
    const currentGroupName = userGroup?.name || State.user.group || '';
    const isAdmin = group.admin === State.user.name;
    const isMember = (userGroup?.id === group.id) || State.user.group === group.name;
    const requested = group.requests?.includes(State.user.id);
    let content = `
      <div class="flex flex-col items-center mb-4">
        <div class="w-20 h-20 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 flex items-center justify-center mb-3"><i class="fas fa-users text-white text-2xl"></i></div>
        <h4 class="text-xl font-bold">${group.name}</h4>
        <div class="text-sm opacity-80 mt-1">گروه دانشی</div>
      </div>
      <div class="space-y-3">
        <div class="flex justify-between items-center glass rounded-xl p-3"><span class="opacity-80">امتیاز کل</span><span class="font-bold text-purple-300">${faNum(group.score)}</span></div>
        <div class="flex justify-between items-center glass rounded-xl p-3"><span class="opacity-80">تعداد اعضا</span><span class="font-bold">${faNum(group.members)}</span></div>
      </div>`;

    const membersHtml = (group.memberList || []).map(m=>`<div class="glass rounded-xl p-2 text-sm flex items-center gap-2"><i class="fas fa-user text-blue-200"></i>${m}</div>`).join('');
    content += `
      <div class="mt-4">
        ${isAdmin ? `<input id="new-member-name" class="form-input mb-2" placeholder="نام عضو جدید">
        <button id="btn-add-member" class="btn btn-group w-full"><i class="fas fa-user-plus ml-2"></i> افزودن عضو</button>` : ''}
        <h5 class="font-bold mb-2${isAdmin ? ' mt-4' : ''}">اعضای گروه</h5>
        <div id="member-list" class="space-y-2">${membersHtml || '<div class="text-sm opacity-80">عضوی ثبت نشده است</div>'}</div>
      </div>`;

    const matchesHtml = (group.matches || []).map(m=>`<div class="glass rounded-xl p-2 text-sm flex justify-between"><span>${m.opponent}</span><span>${m.time}</span></div>`).join('');
    content += `
      <div class="mt-4">
        <h5 class="font-bold mb-2">نبردهای پیش‌رو</h5>
        <div class="space-y-2">${matchesHtml || '<div class="text-sm opacity-80">نبردی برنامه‌ریزی نشده است</div>'}</div>
      </div>`;

    if (isAdmin) {
      content += `
        <div class="grid sm:grid-cols-2 gap-3 mt-4">
          <button id="btn-request-duel" class="btn btn-duel w-full"><i class="fas fa-swords ml-2"></i> درخواست نبرد</button>
          <button id="btn-delete-group-detail" class="btn btn-secondary w-full"><i class="fas fa-trash ml-2"></i> حذف گروه</button>
        </div>`;
    } else if (isMember) {
      content += `
        <div class="glass rounded-2xl p-3 mt-4 text-center text-sm opacity-80">
          <i class="fas fa-info-circle ml-1"></i> شما عضو گروه «${group.name}» هستید. در صورت خروج برای بازگشت نیاز به تایید مدیر خواهید داشت.
        </div>
        <button id="btn-leave-group-detail" class="btn btn-secondary w-full mt-3">
          <i class="fas fa-sign-out-alt ml-2"></i> خروج از گروه
        </button>`;
    } else if (!isMember && !isUserInGroup()) {
      content += `
        <button id="btn-join-group" class="btn btn-group w-full mt-4" ${requested ? 'disabled' : ''}>
          <i class="fas fa-user-plus ml-2"></i> ${requested ? 'در انتظار تایید' : 'درخواست عضویت'}
        </button>`;
    } else if (!isMember && isUserInGroup()) {
      const joinedGroupLabel = currentGroupName ? `«${currentGroupName}»` : 'گروه فعلی خود';
      content += `
        <div class="glass rounded-2xl p-3 mt-4 text-center text-sm opacity-80">
          <i class="fas fa-info-circle ml-1"></i> شما در حال حاضر عضو ${joinedGroupLabel} هستید
        </div>`;
    }

    showDetailPopup('جزئیات گروه', content);

    $('#btn-join-group')?.addEventListener('click', () => requestJoinGroup(group.id));
    $('#btn-add-member')?.addEventListener('click', () => {
      const name = $('#new-member-name').value.trim();
      if(!name){ toast('نام عضو جدید را وارد کنید'); return; }
      group.memberList = group.memberList || [];
      group.memberList.push(name);
      group.members += 1;
      $('#member-list').innerHTML += `<div class="glass rounded-xl p-2 text-sm flex items-center gap-2"><i class="fas fa-user text-blue-200"></i>${name}</div>`;
      $('#new-member-name').value='';
      toast(`عضو ${name} اضافه شد`);
      renderGroupSelect();
    });
    $('#btn-request-duel')?.addEventListener('click', () => openDuelRequest(group));
    $('#btn-delete-group-detail')?.addEventListener('click', () => {
      if (confirm('آیا از حذف گروه اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
        deleteGroup(group.id);
        closeDetailPopup();
      }
    });
    $('#btn-leave-group-detail')?.addEventListener('click', () => {
      if (confirm('آیا از خروج از این گروه اطمینان دارید؟')) {
        leaveGroup(group.id);
        closeDetailPopup();
      }
    });
  }

function requestJoinGroup(groupId){
  // Check if user is already in a group
  if (isUserInGroup()) {
    toast('شما در حال حاضر عضو یک گروه هستید. ابتدا باید از گروه فعلی خارج شوید.');
    return;
  }
  
  const group = State.groups.find(g=>g.id===groupId);
  if(!group) return;
  group.requests = group.requests || [];
  if(group.requests.includes(State.user.id)){
    toast('درخواست شما قبلا ثبت شده است');
    return;
  }
  group.requests.push(State.user.id);
  toast(`درخواست عضویت به ${group.name} ارسال شد`);
  logEvent('group_join_request', { group: group.name });
  closeDetailPopup();
}

  function openDuelRequest(group){
    const opponents = State.groups.filter(g=>g.id!==group.id);
    if(opponents.length===0){
      toast('گروه دیگری برای نبرد موجود نیست');
      return;
    }
    const cards = opponents.map(g=>`
      <div class="location-card" data-opp="${g.id}">
        <div class="location-icon group-icon"><i class="fas fa-users"></i></div>
        <div class="flex-1"><div class="font-bold">${g.name}</div>
          <div class="text-sm opacity-80 flex items-center gap-1"><i class="fas fa-user"></i><span>مدیر: ${g.admin}</span></div>
        </div>
      </div>`).join('');
    const content = `
      <div class="space-y-3">${cards}</div>
      <button id="btn-back-duel-select" class="btn btn-secondary w-full mt-4"><i class="fas fa-arrow-right ml-2"></i> بازگشت</button>`;
    showDetailPopup('انتخاب گروه رقیب', content);
    $$('[data-opp]').forEach(el=>{
      el.addEventListener('click',()=>{
        const target = State.groups.find(g=>g.id===el.dataset.opp);
        toast(`درخواست نبرد به ${target.name} ارسال شد`);
        logEvent('group_duel_request', {from: group.name, to: target.name});
        closeDetailPopup();
      });
    });
    $('#btn-back-duel-select')?.addEventListener('click',()=>showGroupDetail(group));
  }

function openCreateGroup(){
  // Check if user is already in a group
  if (isUserInGroup()) {
    toast('شما در حال حاضر عضو یک گروه هستید. ابتدا باید از گروه فعلی خارج شوید.');
    return;
  }
  
  const content = `
    <div class="space-y-4">
      <input id="new-group-name" class="form-input" placeholder="نام گروه">
      <div id="invite-container" class="hidden space-y-2">
        <label class="block text-sm opacity-90">لینک دعوت</label>
        <div class="flex">
          <input id="new-group-link" class="form-input flex-1" readonly>
          <button id="btn-copy-link" class="btn btn-secondary ml-2"><i class="fas fa-copy"></i></button>
        </div>
        <div class="text-xs opacity-80">این لینک را برای دعوت دوستان خود به اشتراک بگذارید</div>
      </div>
      <button id="btn-save-group" class="btn btn-group w-full"><i class="fas fa-check ml-2"></i> ایجاد گروه</button>
    </div>`;
  showDetailPopup('ایجاد گروه جدید', content);
  $('#btn-save-group').addEventListener('click', () => {
    const name = $('#new-group-name').value.trim();
    if(!name){ toast('نام گروه را وارد کنید'); return; }
    const newGroup = {
      id: 'g'+(State.groups.length+1),
      name,
      score: 0,
      members: 1,
      admin: State.user.name,
      created: new Date().toLocaleDateString('fa-IR'),
      memberList: [State.user.name],
      requests: [],
      matches: []
    };
    State.groups.push(newGroup);
    ensureGroupRosters();
    State.user.group = name;
    saveState();
    renderGroupSelect();
    renderDashboard();
    renderProvinceSelect();
    logEvent('group_created', { group: name });
    const link = location.origin + '/?join=' + newGroup.id;
    $('#new-group-link').value = link;
    $('#invite-container').classList.remove('hidden');
    $('#btn-copy-link').addEventListener('click', () => {
      navigator.clipboard.writeText(link);
      toast('لینک کپی شد');
    });
    $('#btn-save-group').disabled = true;
    toast('گروه با موفقیت ایجاد شد');
  });
}
  
  // ===== Quiz Flow (legacy) =====
  function updateTimerVisual(){
    const ring = $('#timer-ring');
    const text = $('#timer-text');
    if(!ring || !text) return;
    const total = Math.max(1, State.quiz.duration);
    const remain = clamp(State.quiz.remain, 0, total);
    text.textContent = faNum(remain);
    ring.style.strokeDashoffset = String(TIMER_CIRC * (1 - (remain / total)));
  }

  function resetTimer(seconds){
    const ring = $('#timer-ring');
    if(ring) ring.setAttribute('stroke-dasharray', String(TIMER_CIRC));
    State.quiz.duration = seconds;
    State.quiz.remain = seconds;
    updateTimerVisual();
    if(State.quiz.timer) clearInterval(State.quiz.timer);
    State.quiz.timer = setInterval(()=>{
      State.quiz.remain -= 1;
      if(State.quiz.remain <= 5 && State.quiz.remain > 0) SFX.tick();
      if(State.quiz.remain <= 0){
        State.quiz.remain = 0;
        updateTimerVisual();
        clearInterval(State.quiz.timer);
        lockChoices();
        const ended = registerAnswer(-1);
        if(!ended){
          setTimeout(nextQuestion, 900);
        }
        return;
      }
      updateTimerVisual();
    },1000);
  }

  function addExtraTime(extra){
    if(!Number.isFinite(extra) || extra <= 0) return;
    State.quiz.remain += extra;
    State.quiz.duration += extra;
    updateTimerVisual();
    const ring = $('#timer-ring');
    if(ring){
      ring.classList.remove('timer-boost');
      if(ring.getBBox) ring.getBBox();
      requestAnimationFrame(()=>{
        ring.classList.add('timer-boost');
        setTimeout(()=>ring.classList.remove('timer-boost'), 900);
      });
    }
    const text = $('#timer-text');
    if(text){
      text.classList.remove('timer-boost');
      void text.offsetWidth;
      text.classList.add('timer-boost');
      setTimeout(()=>text.classList.remove('timer-boost'), 900);
    }
  }
  
  function renderQuestionUI(q){
    const catLabel = State.quiz.cat || q.cat || '—';
    const diffLabel = State.quiz.diff || q.diff || '—';
    $('#quiz-cat').innerHTML = `<i class="fas fa-folder ml-1"></i> ${catLabel}`;
    $('#quiz-diff').innerHTML = `<i class="fas fa-signal ml-1"></i> ${diffLabel}`;
    $('#qnum').textContent = faNum(State.quiz.idx+1);
    $('#qtotal').textContent = faNum(State.quiz.list.length);
    $('#question').textContent = q.q;
    const authorWrapper = $('#question-author');
    const authorNameEl = $('#question-author-name');
    if (authorWrapper && authorNameEl) {
      const sourceKey = (q.source || '').toString().toLowerCase();
      let authorDisplay = (q.authorName || '').toString().trim();
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
    const box = $('#choices'); box.innerHTML='';
    q.c.forEach((txt,idx)=>{
      const btn = document.createElement('button');
      btn.className='choice'; btn.setAttribute('aria-label','گزینه '+faNum(idx+1));
      btn.innerHTML = `<span class="chip">${faNum(idx+1)}</span><span>${txt}</span>`;
      btn.addEventListener('click', ()=> selectAnswer(idx));
      box.appendChild(btn);
    });
  }
  
  function beginQuizSession({ cat, diff, diffValue, questions, count, source }){
    if(!Array.isArray(questions) || questions.length===0) return false;

    used5050=false; usedSkip=false; usedTimeBoost=false;
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
      var diffLabelLower = State.quiz.diff.toLowerCase();
      if (State.quiz.diff.indexOf('سخت') >= 0 || diffLabelLower === 'hard') {
        State.quiz.diffValue = 'hard';
      } else if (State.quiz.diff.indexOf('متوسط') >= 0 || diffLabelLower === 'medium' || diffLabelLower === 'normal') {
        State.quiz.diffValue = 'medium';
      } else {
        State.quiz.diffValue = 'easy';
      }
    }
    State.quiz.list = questions.map(q=>({
      ...q,
      cat: State.quiz.cat,
      diff: State.quiz.diff,
      diffValue: State.quiz.diffValue
    }));
    State.quiz.idx = 0;
    State.quiz.sessionEarned = 0;
    State.quiz.results = [];
    State.quiz.inProgress = true;
    State.quiz.answered = false;

    renderTopBars();
    renderQuestionUI(State.quiz.list[0]);

    const diffLabel = State.quiz.diff;
    resetTimer(diffLabel==='سخت'?20:diffLabel==='متوسط'?25:30);

    if(State.duelOpponent){
      $('#duel-opponent-name').textContent = State.duelOpponent.name;
      $('#duel-banner').classList.remove('hidden');
    } else {
      $('#duel-banner').classList.add('hidden');
    }

    logEvent('quiz_start', {
      category: State.quiz.cat,
      difficulty: State.quiz.diff,
      difficulty_value: State.quiz.diffValue,
      questionCount: count || State.quiz.list.length,
      source
    });

    return true;
  }

  document.getElementById('setup-start')?.addEventListener('click', startQuizFromAdmin);
  document.getElementById('setup-duel')?.addEventListener('click', ()=>{
    logEvent('open_duel_from_setup');
    closeSheet();
    navTo('duel');
  });
    document.getElementById('range-count')?.addEventListener('input', e=>{
      var setupCountEl = document.getElementById('setup-count');
      if (setupCountEl) setupCountEl.textContent = faNum(e.target.value);
    });

async function startQuizFromAdmin(arg) {
  // اگر از روی فرم صدا زده شده باشد
  if (typeof Event !== 'undefined' && arg instanceof Event) {
    try { arg.preventDefault(); } catch (_) {}
    arg = null;
  }

  var opts = (arg && typeof arg === 'object') ? arg : {};

  var rangeEl = (typeof document !== 'undefined') ? document.getElementById('range-count') : null;
  var rangeVal = rangeEl ? (rangeEl.value || rangeEl.getAttribute('value')) : null;

  // count
  var count = (opts.count != null ? Number(opts.count) : Number(rangeVal || 5)) || 5;

  // categoryId
  var firstCatId = (typeof Admin !== 'undefined' && Admin && Admin.categories && Admin.categories.length > 0)
    ? Admin.categories[0].id
    : undefined;
  var stateCatId = (typeof State !== 'undefined' && State && State.quiz) ? State.quiz.catId : undefined;
  var categoryId = (opts.categoryId != null ? opts.categoryId : (stateCatId != null ? stateCatId : firstCatId));

  if (!categoryId) {
    if (typeof toast === 'function') toast('دسته‌ای یافت نشد.');
    return false;
  }

  var catObj = null;
  if (typeof Admin !== 'undefined' && Admin && Array.isArray(Admin.categories)) {
    for (var ci = 0; ci < Admin.categories.length; ci++) {
      var candidate = Admin.categories[ci];
      if (candidate && candidate.id === categoryId) { catObj = candidate; break; }
    }
  }

  var diffPool;
  if (catObj && Array.isArray(catObj.difficulties) && catObj.difficulties.length) {
    diffPool = catObj.difficulties;
  } else if (typeof Admin !== 'undefined' && Admin && Array.isArray(Admin.diffs) && Admin.diffs.length) {
    diffPool = Admin.diffs;
  } else {
    diffPool = DEFAULT_DIFFS;
  }

  var selectedDiff = null;
  var requestedDiff = opts.difficulty;
  var stateDiffValue = (typeof State !== 'undefined' && State && State.quiz) ? State.quiz.diffValue : undefined;
  var stateDiffLabel = (typeof State !== 'undefined' && State && State.quiz) ? State.quiz.diff : undefined;

  if (requestedDiff != null) {
    for (var rd = 0; rd < diffPool.length; rd++) {
      var diffOpt = diffPool[rd];
      if (diffOpt && (diffOpt.value === requestedDiff || diffOpt.label === requestedDiff)) { selectedDiff = diffOpt; break; }
    }
  }

  if (!selectedDiff && stateDiffValue != null) {
    for (var sdv = 0; sdv < diffPool.length; sdv++) {
      var diffOpt2 = diffPool[sdv];
      if (diffOpt2 && diffOpt2.value === stateDiffValue) { selectedDiff = diffOpt2; break; }
    }
  }

  if (!selectedDiff && stateDiffLabel != null) {
    for (var sdl = 0; sdl < diffPool.length; sdl++) {
      var diffOpt3 = diffPool[sdl];
      if (diffOpt3 && diffOpt3.label === stateDiffLabel) { selectedDiff = diffOpt3; break; }
    }
  }

  if (!selectedDiff) {
    for (var mid = 0; mid < diffPool.length; mid++) {
      var diffOpt4 = diffPool[mid];
      if (!diffOpt4) continue;
      var valLower = (diffOpt4.value || '').toString().toLowerCase();
      var labelLower = (diffOpt4.label || '').toString().toLowerCase();
      if (valLower === 'medium' || valLower === 'normal' || labelLower.indexOf('متوسط') >= 0 || labelLower.indexOf('medium') >= 0 || labelLower.indexOf('normal') >= 0) {
        selectedDiff = diffOpt4;
        break;
      }
    }
  }

  if (!selectedDiff && diffPool.length) selectedDiff = diffPool[0];
  if (!selectedDiff && typeof Admin !== 'undefined' && Admin && Array.isArray(Admin.diffs) && Admin.diffs.length) selectedDiff = Admin.diffs[0];
  if (!selectedDiff && DEFAULT_DIFFS.length) selectedDiff = DEFAULT_DIFFS[0];

  var difficultyValue = selectedDiff ? selectedDiff.value : undefined;
  var difficultyLabel = selectedDiff ? (selectedDiff.label || selectedDiff.value) : undefined;

  if (typeof State !== 'undefined' && State && State.quiz && selectedDiff) {
    State.quiz.diffValue = difficultyValue;
    State.quiz.diff = difficultyLabel || State.quiz.diff || '—';
  }

  var startBtn = (typeof document !== 'undefined') ? document.getElementById('setup-start') : null;
  var prevDisabled = startBtn ? !!startBtn.disabled : null;
  if (startBtn) startBtn.disabled = true;

  try {
    var list = [];
    if (typeof Api !== 'undefined' && Api && typeof Api.questions === 'function') {
      list = await Api.questions({ categoryId: categoryId, count: count, difficulty: difficultyValue }) || [];
    }

    if (!Array.isArray(list) || list.length === 0) {
      if (typeof toast === 'function') toast('برای این دسته هنوز سوالی ثبت نشده 😕');
      return false;
    }

    var normalized = [];
    for (var i = 0; i < list.length; i++) {
      var q = list[i] || {};
      var rawChoices = q.options || q.choices || [];
      var choices = [];

      if (Array.isArray(rawChoices)) {
        for (var j = 0; j < rawChoices.length; j++) {
          var opt = rawChoices[j];
          var txt;
          if (typeof opt === 'string') {
            txt = opt;
          } else {
            txt = (opt && (opt.text || opt.title || opt.value)) || '';
          }
          txt = (txt == null ? '' : String(txt)).trim();
          choices.push(txt);
        }
      }

      var answerIdx;
      if (typeof q.answerIndex === 'number') {
        answerIdx = q.answerIndex;
      } else if (Array.isArray(rawChoices)) {
        // دستی پیدا می‌کنیم (به‌جای findIndex)
        var found = -1;
        for (var k = 0; k < rawChoices.length; k++) {
          var ro = rawChoices[k];
          if (ro && typeof ro === 'object' && ro.correct === true) { found = k; break; }
        }
        answerIdx = found;
      } else {
        answerIdx = -1;
      }

      var qq = ((q.text || q.title || '') + '').trim();
      var valid = qq && Array.isArray(choices) && choices.length >= 2;

      // every(Boolean) بدون فلش‌تابع
      if (valid) {
        for (var e = 0; e < choices.length; e++) {
          if (!choices[e]) { valid = false; break; }
        }
      }

      var questionSource = '';
      if (q && typeof q.source === 'string') questionSource = q.source;
      else if (q && typeof q.provider === 'string') questionSource = q.provider;
      questionSource = questionSource ? String(questionSource).toLowerCase() : 'manual';

      var authorNameValue = '';
      if (q && typeof q.authorName === 'string') authorNameValue = q.authorName.trim();
      else if (q && typeof q.author === 'string') authorNameValue = q.author.trim();
      else if (q && typeof q.createdByName === 'string') authorNameValue = q.createdByName.trim();
      else if (q && typeof q.submittedByName === 'string') authorNameValue = q.submittedByName.trim();

      if (valid && typeof answerIdx === 'number' && answerIdx >= 0 && answerIdx < choices.length) {
        normalized.push({ q: qq, c: choices, a: answerIdx, authorName: authorNameValue, source: questionSource });
      }
    }

    if (normalized.length === 0) {
      if (typeof toast === 'function') toast('سوال معتبر برای این تنظیمات موجود نیست.');
      return false;
    }

    var fallbackCat = (typeof Admin !== 'undefined' && Admin && Array.isArray(Admin.categories) && Admin.categories.length > 0)
      ? Admin.categories[0]
      : null;
    var catMeta = catObj || fallbackCat || {};
    var stateQuizCat = (typeof State !== 'undefined' && State && State.quiz) ? State.quiz.cat : undefined;
    var catTitle = (opts.cat != null ? opts.cat : (catMeta.title || catMeta.name || stateQuizCat || '—'));

    if (typeof State !== 'undefined' && State && State.quiz) {
      State.quiz.catId = categoryId;
    }

    var started = false;
    if (typeof beginQuizSession === 'function') {
      started = beginQuizSession({
        cat: catTitle,
        diff: difficultyLabel,
        diffValue: difficultyValue,
        questions: normalized,
        count: count,
        source: (opts.source != null ? opts.source : 'setup')
      });
    }

    if (started) {
      if (typeof closeSheet === 'function') closeSheet();
      if (typeof navTo === 'function') navTo('quiz');
    }
    return !!started;

  } catch (err) {
    if (typeof console !== 'undefined' && console && console.warn) {
      console.warn('Failed to fetch questions', err);
    }
    if (typeof toast === 'function') toast('دریافت سوالات با خطا مواجه شد');
    return false;

  } finally {
    if (startBtn) startBtn.disabled = (prevDisabled != null ? prevDisabled : false);
  }
}


  function lockChoices(){ $$('#choices .choice').forEach(el=> el.classList.add('pointer-events-none','opacity-70')); }
  
  function registerAnswer(idx){
    const q = State.quiz.list[State.quiz.idx] || {};
    const correct = q.a;
    const ok = (idx===correct);
    const base = ok ? 100 : 0;
    const timeBonus = ok ? Math.floor((State.quiz.remain/State.quiz.duration)*50) : 0;
    const boostActive = Date.now() < State.boostUntil;
    const vipBonus = Server.subscription.active ? 20 : 0; // VIP from server
    const earned = Math.floor((base + timeBonus + vipBonus) * (boostActive?2:1));
    let shouldEnd = false;

    if(ok){
      State.score += earned; State.coins += 5; State.quiz.sessionEarned += earned; SFX.correct(); vibrate(30);
    } else {
      State.lives -= 1;
      // Use a life from the limit
      useGameResource('lives');
      SFX.wrong(); vibrate([10,30,10]);
      if(State.lives<=0) shouldEnd = true;
    }

    State.quiz.results.push({ q:q.q, ok, correct: q.c[correct], you: idx>=0 ? q.c[idx] : '—' });
    saveState(); renderHeader(); renderTopBars();

    // Log analytics
    logEvent('question_answered', {
      correct: ok,
      timeSpent: State.quiz.duration - State.quiz.remain,
      category: State.quiz.cat || q.cat,
      difficulty: State.quiz.diff || q.diff
    });

    if(shouldEnd){
      endQuiz();
      return true;
    }

    return false;
  }
  
  function selectAnswer(idx){
    if(State.quiz.answered) return;
    State.quiz.answered = true; clearInterval(State.quiz.timer);
    const correct = State.quiz.list[State.quiz.idx].a;
    const list = $$('#choices .choice');
    list.forEach((el,i)=> el.classList.add(i===correct? 'correct':'wrong'));
    lockChoices();
    const ended = registerAnswer(idx);
    if(!ended){
      setTimeout(nextQuestion, 900);
    }
  }
  
  function nextQuestion(){
    State.quiz.answered=false;
    State.quiz.idx++;
    if(State.quiz.idx >= State.quiz.list.length){
      endQuiz();
      return;
    }
    const q = State.quiz.list[State.quiz.idx];
    renderQuestionUI(q);
    resetTimer(State.quiz.diff==='سخت'?20:State.quiz.diff==='متوسط'?25:30);
  }
  
  async function endQuiz(){
    State.quiz.inProgress=false;
    const correctCount = State.quiz.results.filter(r=>r.ok).length;
    if(correctCount>0 && !State.achievements.firstWin){ 
      State.achievements.firstWin=true; 
      toast('<i class="fas fa-award ml-2"></i>نشان «اولین برد» آزاد شد!'); 
      shootConfetti(); 
    }
    if(correctCount>=10 && !State.achievements.tenCorrect){ 
      State.achievements.tenCorrect=true; 
      toast('<i class="fas fa-medal ml-2"></i>نشان «۱۰ پاسخ درست»!'); 
    }
    const wrap = $('#res-list'); wrap.innerHTML='';
    State.quiz.results.forEach((r,i)=>{
      const row=document.createElement('div'); row.className='bg-white/10 border border-white/20 rounded-xl px-3 py-2';
      row.innerHTML=`<div class="text-sm font-bold mb-1">${faNum(i+1)}. ${r.q}</div>
        <div class="text-xs ${r.ok?'text-emerald-300':'text-rose-300'}">${r.ok?'درست':'نادرست'}</div>
        <div class="text-xs opacity-90">پاسخ صحیح: ${r.correct}</div>
        <div class="text-xs opacity-70">پاسخ شما: ${r.you}</div>`;
      wrap.appendChild(row);
    });
    const duelActive = !!(DuelSession && State.duelOpponent);
    if (duelActive) {
      const status = completeDuelRound(correctCount);
      if (status === 'next') {
        saveState();
        return;
      }
      if (status === 'finished') {
        finalizeDuelResults();
        saveState();
        navTo('results');
        AdManager.maybeShowInterstitial('post_quiz');
        return;
      }
    }

    $('#res-correct').textContent = faNum(correctCount);
    $('#res-wrong').textContent = faNum(State.quiz.results.length - correctCount);
    $('#res-earned').textContent = faNum(State.quiz.sessionEarned);
    $('#duel-result').classList.add('hidden');
    const duelSummaryEl = $('#duel-rounds-summary');
    if (duelSummaryEl) {
      duelSummaryEl.classList.add('hidden');
      duelSummaryEl.innerHTML = '';
    }
    hideDuelAddFriendCTA();
    saveState();
    navTo('results');
    AdManager.maybeShowInterstitial('post_quiz');
  }
  
  // ===== Streak / Daily (legacy) =====
  function claimStreak(){
    const nowDay = Math.floor(Date.now()/86400000);
    if(State.lastClaim === nowDay){ toast('<i class="fas fa-info-circle ml-2"></i>امروز قبلاً دریافت کردی'); return; }
    const yesterday = nowDay - 1;
    if(State.lastClaim === yesterday) State.streak += 1; else State.streak = 1;
    State.lastClaim = nowDay;
    const reward = 5 * State.streak;
    State.coins += reward; State.score += reward*10;
    saveState(); renderDashboard(); renderHeader();
    toast(`<i class="fas fa-gift ml-2"></i>پاداش امروز: ${faNum(reward)}💰 🎉`);
    if(State.streak>=3 && !State.achievements.streak3){ State.achievements.streak3=true; toast('<i class="fas fa-fire ml-2"></i>نشان «استریک ۳ روزه»!'); }
  }
  
  async function startDaily(){
    State.lives = Math.max(State.lives, 1);
    var categoryId = State.quiz.catId;
    if (categoryId == null && Array.isArray(Admin.categories) && Admin.categories.length > 0) {
      categoryId = Admin.categories[0].id;
    }

    var catObj = null;
    if (Array.isArray(Admin.categories)) {
      for (var ci = 0; ci < Admin.categories.length; ci++) {
        var catItem = Admin.categories[ci];
        if (catItem && catItem.id === categoryId) { catObj = catItem; break; }
      }
    }

    var diffPool;
    if (catObj && Array.isArray(catObj.difficulties) && catObj.difficulties.length) {
      diffPool = catObj.difficulties;
    } else if (Array.isArray(Admin.diffs) && Admin.diffs.length) {
      diffPool = Admin.diffs;
    } else {
      diffPool = DEFAULT_DIFFS;
    }

    var preferred = null;
    if (State.quiz.diffValue != null) {
      for (var pd = 0; pd < diffPool.length; pd++) {
        var diffOpt = diffPool[pd];
        if (diffOpt && diffOpt.value === State.quiz.diffValue) { preferred = diffOpt; break; }
      }
    }
    if (!preferred && State.quiz.diff) {
      for (var pdl = 0; pdl < diffPool.length; pdl++) {
        var diffOptLabel = diffPool[pdl];
        if (diffOptLabel && diffOptLabel.label === State.quiz.diff) { preferred = diffOptLabel; break; }
      }
    }
    if (!preferred) {
      for (var pm = 0; pm < diffPool.length; pm++) {
        var diffOptMid = diffPool[pm];
        if (!diffOptMid) continue;
        var valLower = (diffOptMid.value || '').toString().toLowerCase();
        var labelLower = (diffOptMid.label || '').toString().toLowerCase();
        if (valLower === 'medium' || valLower === 'normal' || labelLower.indexOf('متوسط') >= 0 || labelLower.indexOf('medium') >= 0 || labelLower.indexOf('normal') >= 0) {
          preferred = diffOptMid;
          break;
        }
      }
    }
    if (!preferred && diffPool.length) preferred = diffPool[0];
    if (!preferred && Array.isArray(Admin.diffs) && Admin.diffs.length) preferred = Admin.diffs[0];
    if (!preferred && DEFAULT_DIFFS.length) preferred = DEFAULT_DIFFS[0];

    await startQuizFromAdmin({ count:5, difficulty: preferred ? preferred.value : undefined, categoryId, source:'daily' });
  }
  
  // ===== Shop (legacy soft-currency), VIP button rerouted =====

// ===== Shop (Keys) =====
function renderShop(){
  // موجودی‌ها
  if ($('#shop-gcoins'))  $('#shop-gcoins').textContent  = faNum(State.coins);
  if ($('#shop-wallet'))  $('#shop-wallet').textContent  = (Server.wallet.coins==null?'—':faNum(Server.wallet.coins));
  if ($('#keys-count'))   $('#keys-count').textContent   = faNum(State.keys || 0);

  // بسته‌ها را از RemoteConfig بخوان و دکمه‌ها را آپدیت کن
  const packs = RemoteConfig.pricing.keys || [];
  packs.forEach(p => {
    const el = document.querySelector(`[data-buy-key="${p.id}"]`);
    if(!el) return;
    el.querySelector('[data-amount]').textContent = faNum(p.amount);
    el.querySelector('[data-price]').textContent  = faNum(p.priceGame);
    const cant = State.coins < p.priceGame;
    el.disabled = cant;
    el.title = cant ? 'سکهٔ بازی کافی نیست' : `خرید ${faNum(p.amount)} کلید`;
  });

  // نشان «به‌صرفه‌ترین» را روی بهترین نسبت قیمت/تعداد بگذار
  const best = packs.reduce((a,b)=> (a.priceGame/a.amount <= b.priceGame/b.amount) ? a : b, packs[0]);
  document.querySelectorAll('.product-card .ribbon.auto').forEach(n=>n.remove());
  if (best) {
    const bestBtn = document.querySelector(`[data-buy-key="${best.id}"]`);
    if (bestBtn && !bestBtn.querySelector('.ribbon')) {
      const badge = document.createElement('div');
      badge.className = 'ribbon auto';
      badge.textContent = 'به‌صرفه‌ترین';
      bestBtn.appendChild(badge);
    }
  }
}


function buyKeys(packId){
  const pack = RemoteConfig.pricing.keys.find(p => p.id === packId);
  if (!pack){ toast('بستهٔ کلید یافت نشد'); return; }

  if (State.coins < pack.priceGame){
    toast('<i class="fas fa-exclamation-circle ml-2"></i> سکهٔ بازی کافی نیست'); 
    return;
  }

  State.coins -= pack.priceGame;
  State.keys = (State.keys || 0) + pack.amount;

  saveState();
  renderHeader();       // برای آپدیت سکه در هدر
  renderDashboard();    // اگر داشبورد باز بود
  renderTopBars();      // اگر داخل مسابقه‌ای
  renderShop();         // آپدیت خود فروشگاه

  SFX.coin();
  toast(`<i class="fas fa-check-circle ml-2"></i> ${faNum(pack.amount)} کلید خریداری شد`);
  logEvent('purchase_item', { item:'keys', pack: pack.id, amount: pack.amount, price: pack.priceGame });
}

// لیسنر کلی برای دکمه‌های خرید کلید (event delegation)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-buy-key]');
  if (!btn) return;
  buyKeys(btn.dataset.buyKey);
});


  function buy(item){
    const price = { life:30, boost:50, hint:20, streak:40 }[item];
    if(price==null) return;
    if(State.coins < price){ toast('<i class="fas fa-exclamation-circle ml-2"></i>سکه کافی نیست'); return; }
    State.coins -= price;
    if(item==='life') State.lives += 1;
    if(item==='boost') State.boostUntil = Date.now() + 10*60*1000;
    if(item==='hint') { /* Hint logic */ }
    if(item==='streak') { /* Streak protection logic */ }
    saveState(); renderDashboard(); renderTopBars();
    SFX.coin(); toast('<i class="fas fa-check-circle ml-2"></i>خرید با موفقیت انجام شد');
    
    // Log analytics
    logEvent('purchase_item', { item, price });
  }
  
  // ===== Wallet (server) =====
function buildPackages(){
  const grid = $('#pkg-grid');
  grid.innerHTML = '';

  // نرخ تبدیل پشتیبان برای وقتی priceToman نباشه
  const usdToToman = RemoteConfig?.pricing?.usdToToman || 70_000;

  // آماده‌سازی پکیج‌ها با محاسبه‌ی قیمت تومانی و ارزش هر پکیج
  const packs = (RemoteConfig?.pricing?.coins || []).map(p => {
    const bonus = Number(p.bonus || 0);
    const priceToman = (typeof p.priceToman === 'number' && p.priceToman > 0)
      ? p.priceToman
      : Math.round(((p.priceCents || 0) / 100) * usdToToman);

    const received = p.amount + Math.floor(p.amount * bonus / 100); // مقدار دریافتی
    const valueScore = priceToman > 0 ? (received / priceToman) : 0; // سکه به ازای هر تومان

    return { ...p, bonus, priceToman, received, valueScore };
  });

  if (!packs.length){
    grid.innerHTML = `<div class="glass-dark rounded-2xl p-4 text-center opacity-80">
      در حال حاضر بسته‌ای موجود نیست
    </div>`;
    return;
  }

  // پیدا کردن به‌صرفه‌ترین بسته
  const best = packs.reduce((a,b) => (a.valueScore >= b.valueScore ? a : b), packs[0]);

  // رندر کارت‌ها
  packs.forEach(pkg => {
    const card = document.createElement('div');
    card.className = 'glass-dark rounded-2xl p-4 card-hover flex flex-col justify-between relative h-full';

    const bonusBadge = pkg.bonus
      ? `<span class="chip bg-white/20"><i class="fas fa-gift ml-1"></i> ${faNum(pkg.bonus)}%</span>`
      : '';

    const bestRibbon = (pkg.id === best.id)
      ? `<div class="ribbon">به‌صرفه‌ترین</div>`
      : '';

    card.innerHTML = `
      ${bestRibbon}
      <div class="flex items-center justify-between">
        <div class="text-lg font-bold">${faNum(pkg.amount)} سکه</div>
        ${bonusBadge}
      </div>
      <div class="text-sm opacity-80 mt-1">${faNum(pkg.received)} دریافتی</div>

      <button class="btn btn-primary mt-3 buy-pkg"
              data-id="${pkg.id}"
              aria-label="خرید بسته ${faNum(pkg.amount)} سکه">
        پرداخت ${faNum(pkg.priceToman)} <span class="text-xs">تومان</span>
      </button>
    `;

    grid.appendChild(card);
  });

  // وضعیت کیف پول و آفلاین
  $('#wallet-balance').textContent = (Server.wallet.coins == null ? '—' : faNum(Server.wallet.coins));
  $('#wallet-offline').classList.toggle('hidden', online());
}




// Enhanced Payment Modal Functions
let currentPackageData = null;

function showPaymentModal(packageId) {
  const pkg = RemoteConfig.pricing.coins.find(p => p.id === packageId);
  if (!pkg) {
    toast('بسته یافت نشد');
    return;
  }
  
  currentPackageData = pkg;
  
  // Calculate price in Toman
  const priceToman = pkg.priceToman || Math.round(((pkg.priceCents || 0) / 100) * (RemoteConfig.pricing.usdToToman || 70000));
  const totalCoins = pkg.amount + Math.floor(pkg.amount * (pkg.bonus || 0) / 100);
  const walletBalance = Server.wallet.coins || 0;
  
  // Update modal content
  $('#payment-package-name').textContent = `بسته ${faNum(pkg.amount)} سکه`;
  $('#payment-coins-amount').textContent = `${faNum(totalCoins)} سکه`;
  $('#payment-price').textContent = `${faNum(priceToman)} تومان`;
  $('#payment-wallet-balance').textContent = `${faNum(walletBalance)} تومان`;
  
  // Check if wallet balance is sufficient
  const needsPayment = walletBalance < priceToman;
  $('#payment-warning').classList.toggle('show', needsPayment);
  
  // Update button text based on balance
  const confirmBtn = $('#payment-confirm-btn');
  if (needsPayment) {
    confirmBtn.innerHTML = '<i class="fas fa-credit-card ml-2"></i> رفتن به درگاه پرداخت';
  } else {
    confirmBtn.innerHTML = '<i class="fas fa-check ml-2"></i> تایید و پرداخت';
  }
  
  // Set up click handler
  confirmBtn.onclick = () => handlePaymentConfirm(pkg.id, priceToman, needsPayment);
  
  // Show modal
  $('#modal-payment').classList.add('show');
  
  // Animate icon
  setTimeout(() => {
    $('#modal-payment .payment-icon').style.transform = 'scale(1.1)';
    setTimeout(() => {
      $('#modal-payment .payment-icon').style.transform = 'scale(1)';
    }, 200);
  }, 100);
}

function closePaymentModal() {
  $('#modal-payment').classList.remove('show');
  currentPackageData = null;
}

async function handlePaymentConfirm(packageId, priceToman, needsPayment) {
  if (needsPayment) {
    // Redirect to payment gateway
    closePaymentModal();
    
    // Show loading toast
    toast('<i class="fas fa-spinner fa-spin ml-2"></i> در حال انتقال به درگاه پرداخت...');
    
    // Log analytics
    await logEvent('payment_gateway_redirect', { 
      packageId, 
      priceToman,
      reason: 'insufficient_balance' 
    });
    
    // Simulate redirect (in real app, this would be actual payment gateway URL)
    setTimeout(() => {
      window.location.href = '/payment?package=' + packageId + '&amount=' + priceToman;
    }, 1000);
  } else {
    // Process payment with wallet balance
    closePaymentModal();
    startPurchaseCoins(packageId);
  }
}

  function showPayConfirm(btn){
    const pkgId = btn.dataset.id;
    const price = parseFloat(btn.dataset.price||'0');
    const wallet = Server.wallet.coins||0;
    $('#pay-popup-message').innerHTML = `قیمت بسته: ${faNum(price)} تومان`;
    $('#pay-popup-wallet').innerHTML = `موجودی کیف پول: ${faNum(wallet)} تومان`;
    $('#pay-popup-confirm').onclick = ()=>{
      closeModal('#modal-pay-confirm');
      if(wallet >= price){
        startPurchaseCoins(pkgId);
      }else{
        window.location.href = '/payment';
      }
    };
    openModal('#modal-pay-confirm');
  }
  
  function renderVipStatusPill(){
    const s = Server.subscription;
    const pill = $('#vip-status-pill');
    if(s.status==='unknown'){ pill.innerHTML = '<i class="fas fa-circle-notch fa-spin ml-1"></i> بررسی وضعیت...'; return; }
    if(s.active){
      pill.innerHTML = `<i class="fas fa-check ml-1"></i> ${s.tier === 'pro' ? 'پرو' : 'لایت'} تا ${s.expiry ? new Date(s.expiry).toLocaleDateString('fa-IR'):'—'}`;
    } else {
      pill.innerHTML = `<i class="fas fa-ban ml-1"></i> غیرفعال`;
    }
  }
  
  function updateVipUI(){
    renderVipStatusPill();
    const meta = $('#vip-meta');
    const s = Server.subscription;
    if(s.active){
      meta.innerHTML = `<div class="chip"><i class="fas fa-rotate ml-1"></i> تمدید خودکار: ${s.autoRenew?'بله':'خیر'}</div>`;
    } else {
      meta.innerHTML = `<div class="text-sm opacity-80">برای حذف تبلیغات و مزایا، یکی از پلن‌ها را انتخاب کن.</div>`;
    }
    // Disable ad UI if VIP
    AdManager.refreshAll();
  }
  
  // ===== Payments & Subscription =====
  async function refreshWallet(){
    const data = await Net.jget('/api/wallet');
    if(data && typeof data.coins==='number'){ 
      Server.wallet.coins = data.coins; 
      $('#hdr-wallet').textContent = faNum(Server.wallet.coins); 
      $('#stat-wallet').textContent = faNum(Server.wallet.coins); 
      $('#wallet-balance').textContent = faNum(Server.wallet.coins); 
    }
  }
  
  async function refreshSubscription(){
    const data = await Net.jget('/api/subscription/me');
    if(data && typeof data.active==='boolean'){
      Server.subscription.active = data.active;
      Server.subscription.status = data.active ? 'active':'inactive';
      Server.subscription.expiry = data.expiry||null;
      Server.subscription.autoRenew = !!data.autoRenew;
      Server.subscription.plan = data.plan||null;
      Server.subscription.tier = data.tier||null;
      // Reflect to UI; gameplay VIP bonus already uses Server.subscription.active
      renderHeader(); renderDashboard(); renderVipStatusPill(); AdManager.refreshAll();
      
      // Update limits UI when VIP status changes
      updateLimitsUI();
    }
  }
  
  function genIdemKey(){ return 'idem_'+Math.random().toString(36).slice(2)+Date.now().toString(36); }
  
async function startPurchaseCoins(pkgId){
  if(!online()){ toast('<i class="fas fa-wifi-slash ml-2"></i> آفلاین هستی'); return; }
  const pkg = (RemoteConfig.pricing.coins || []).find(p=>p.id===pkgId);
  if(!pkg){ toast('بسته یافت نشد'); return; }

  const priceTmn = coinPriceToman(pkg);             // تومان برای نمایش و رسید
  const idem = genIdemKey();
  const btn = document.querySelector(`.buy-pkg[data-id="${pkgId}"]`);
  const normalLabel = `<i class="fas fa-credit-card ml-1"></i> پرداخت ${formatToman(priceTmn)}`;

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i> در حال ایجاد تراکنش...';

  await logEvent('purchase_initiated', { kind:'coins', pkgId, priceCents:pkg.priceCents, priceToman:priceTmn, idem });

  const res = await Net.jpost('/api/payments/create', {
    idempotencyKey: idem,
    type:'coins',
    packageId: pkgId
  });

  if(!res || !res.txnId){
    btn.disabled = false;
    btn.innerHTML = normalLabel;
    toast('<i class="fas fa-triangle-exclamation ml-2"></i> ایجاد تراکنش ناموفق');
    await logEvent('purchase_failed', { kind:'coins', pkgId, reason:'create_failed' });
    return;
  }

  const txnId = res.txnId;
  // Poll wallet until updated or timeout
  const before = Server.wallet.coins;
  let ok=false;
  for(let i=0;i<20;i++){
    await wait(1000);
    await refreshWallet();
    if(Server.wallet.coins!=null && (before==null || Server.wallet.coins>before)){ ok=true; break; }
  }

  btn.disabled = false;
  btn.innerHTML = normalLabel;

  if(ok){
    Server.wallet.lastTxnId = txnId;
    openReceipt({
      title:'خرید سکه موفق بود',
      rows:[
        ['کد تراکنش', txnId],
        ['بسته', `${faNum(pkg.amount)} (+${pkg.bonus||0}%)`],
        ['مبلغ', formatToman(priceTmn)],
        ['موجودی جدید', faNum(Server.wallet.coins)]
      ]
    });
    await logEvent('purchase_succeeded', { kind:'coins', pkgId, txnId, priceToman:priceTmn });
    SFX.coin();
  } else {
    openReceipt({
      title:'در انتظار تایید',
      rows:[
        ['کد تراکنش', txnId],
        ['وضعیت', 'هنوز تایید نشده؛ چند لحظه بعد دوباره بررسی می‌شود.']
      ]
    });
    await logEvent('purchase_failed', { kind:'coins', pkgId, txnId, reason:'confirm_timeout' });
  }
}

  
  function openReceipt({title, rows}){
    $('#receipt-body').innerHTML = `<div class="font-bold mb-2">${title}</div>` + rows.map(r=>`<div class="flex items-center justify-between"><span class="opacity-80">${r[0]}</span><span class="font-bold">${r[1]}</span></div>`).join('');
    openModal('#modal-receipt');
  }
  
  async function startPurchaseVip(tier){
    if(!online()){ toast('<i class="fas fa-wifi-slash ml-2"></i> آفلاین هستی'); return; }
    const pricing = RemoteConfig.pricing.vip[tier];
    if(!pricing){ toast('پلن یافت نشد'); return; }
    const idem = genIdemKey();
    const btn = (tier==='lite')?$('#buy-vip-lite'):$('#buy-vip-pro');
    btn.disabled = true; const prevHTML = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i> ایجاد تراکنش...';
    await logEvent('purchase_initiated', { kind:'vip', tier, priceCents:pricing.priceCents, idem });
    const res = await Net.jpost('/api/payments/create', { idempotencyKey: idem, type:'vip', tier });
    if(!res || !res.txnId){
      btn.disabled=false; btn.innerHTML = prevHTML; 
      toast('<i class="fas fa-triangle-exclamation ml-2"></i> ایجاد تراکنش VIP ناموفق'); 
      await logEvent('purchase_failed', { kind:'vip', tier, reason:'create_failed' }); 
      return;
    }
    const txnId = res.txnId;
    // Poll subscription
    let ok=false;
    for(let i=0;i<20;i++){ await wait(1200); await refreshSubscription(); if(Server.subscription.active){ ok=true; break; } }
    btn.disabled=false; btn.innerHTML = prevHTML;
    if(ok){
      await logEvent('purchase_succeeded', { kind:'vip', tier, txnId });
      await logEvent('vip_activated', { tier, expiry: Server.subscription.expiry||null });
      openReceipt({ title:'اشتراک فعال شد 🎉', rows:[
        ['کد تراکنش', txnId],
        ['پلن', tier==='lite'?'لایت':'پرو'],
        ['تا تاریخ', Server.subscription.expiry ? new Date(Server.subscription.expiry).toLocaleDateString('fa-IR') : '—']
      ]});
      renderHeader(); renderDashboard(); AdManager.refreshAll(); shootConfetti();
    } else {
      await logEvent('purchase_failed', { kind:'vip', tier, txnId, reason:'confirm_timeout' });
      openReceipt({ title:'در انتظار تایید اشتراک', rows:[['کد تراکنش', txnId], ['وضعیت', 'در حال پردازش...']] });
    }
  }
  
  // ===== Ads Manager =====
  const AdManager = {
    enabled(){ return RemoteConfig.ads.enabled && !Server.subscription.active; },
    getLocalAd(placement){
      const ads = State.ads?.[placement] || [];
      const now = Date.now();
      const province = Server.user.province || State.user.province;
      return ads.find(a => {
        const start = new Date(a.startDate).getTime();
        const end = new Date(a.endDate).getTime();
        const targets = a.provinces || [];
        return now >= start && now <= end && (targets.length === 0 || targets.includes(province));
      }) || null;
    },
    // Banner
    async renderBanner(){
      const slot = $('#ad-banner .ad-banner-inner'); if(!slot) return;
      slot.innerHTML = ''; // reserved height stays via parent
      const local = this.getLocalAd('banner');
      if(local){
        const w=document.createElement('a');
        w.href=local.landing; w.target='_blank';
        w.className='w-full h-full block relative';
        w.innerHTML=`<img src="${local.creative}" alt="banner ad" class="w-full h-full object-cover">`;
        const close=document.createElement('button'); close.className='ad-close'; close.innerHTML='<i class="fas fa-times"></i>';
        close.setAttribute('aria-label','بستن بنر');
        close.onclick=()=>{ slot.innerHTML='<div class="ad-skeleton">بنر بسته شد</div>'; logEvent('ad_close',{placement:'banner', local:true}); };
        w.appendChild(close); slot.appendChild(w);
        logEvent('ad_impression',{placement:'banner', local:true});
        w.addEventListener('click',()=>logEvent('ad_click',{placement:'banner', local:true}),{once:true});
        return;
      }
      if(!this.enabled() || !RemoteConfig.ads.placements.banner){
        slot.innerHTML = `<div class="ad-skeleton">${Server.subscription.active ? 'وی‌آی‌پی: بدون تبلیغ' : 'تبلیغ غیرفعال'}</div>`;
        return;
      }
      // Try remote, else fallback card
      try{
        const res = await Net.jget('/api/public/ads?placement=banner&province='+encodeURIComponent(Server.user.province||State.user.province));
        const data = res?.data ?? res;
        if(data && data.creativeUrl){
          const link = document.createElement('a'); link.className='w-full h-full block relative'; link.href = data.landingUrl || '#'; link.target = '_blank';
          link.innerHTML = `<img src="${data.creativeUrl}" alt="sponsor banner" class="w-full h-full object-cover">`;
          const close = document.createElement('button'); close.className='ad-close'; close.innerHTML='<i class="fas fa-times"></i>'; close.setAttribute('aria-label','بستن بنر');
          close.onclick=()=>{ slot.innerHTML=`<div class="ad-skeleton">بنر بسته شد</div>`; logEvent('ad_close',{placement:'banner'}); };
          link.appendChild(close);
          slot.appendChild(link);
          logEvent('ad_impression',{placement:'banner'});
          link.addEventListener('click',()=>logEvent('ad_click',{placement:'banner'}),{once:true});
          return;
        }
      }catch{}
      // Fallback
      slot.innerHTML = `<a href="#" class="w-full h-full flex items-center justify-between px-4" aria-label="اسپانسر محلی">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400"></div>
          <div class="text-sm"><div class="font-bold">کد تخفیف همشهری</div><div class="opacity-80">SANANDAJ10</div></div>
        </div>
        <i class="fas fa-arrow-left opacity-80"></i>
      </a>`;
      logEvent('ad_impression',{placement:'banner', fallback:true});
    },
    // Native
    async renderNative(selector){
      const slot = document.querySelector(selector); if(!slot) return;
      slot.innerHTML = '<div class="ad-skeleton">تبلیغ همسان</div>';
      const local=this.getLocalAd('native');
      if(local){
        slot.innerHTML=`<div class="w-full flex items-center gap-3 p-3 relative">
            <img src="${local.creative}" class="w-16 h-16 rounded-2xl object-cover" alt="ad">
            <div class="flex-1">
              <div class="font-bold">تبلیغ اسپانسری</div>
              <div class="text-xs opacity-80">${new URL(local.landing).hostname}</div>
            </div>
            <a role="button" href="${local.landing}" class="btn btn-primary w-auto px-4 py-2 text-sm" aria-label="مشاهده">مشاهده</a>
          </div>`;
        logEvent('ad_impression',{placement:'native', local:true});
        slot.querySelector('a')?.addEventListener('click',()=>logEvent('ad_click',{placement:'native', local:true}),{once:true});
        return;
      }
      if(!this.enabled() || !RemoteConfig.ads.placements.native){ slot.innerHTML = '<div class="ad-skeleton">—</div>'; return; }
      try{
        const res = await Net.jget('/api/public/ads?placement=native&province='+encodeURIComponent(Server.user.province||State.user.province));
        const data = res?.data ?? res;
        if(data && (data.headline || data.imageUrl || data.landingUrl)){
          const headline = data.headline || 'پیشنهاد ویژه';
          const description = data.description || 'اسپانسر رسمی رقابت امروز';
          const imageUrl = data.imageUrl || 'https://picsum.photos/seed/iquiz-native/88/88';
          const landingUrl = data.landingUrl || '#';
          const ctaLabel = data.ctaLabel || 'مشاهده';
          slot.innerHTML = `<div class="w-full flex items-center gap-3 p-3 relative">
            <img src="${imageUrl}" class="w-16 h-16 rounded-2xl object-cover" alt="ad">
            <div class="flex-1">
              <div class="font-bold">${headline}</div>
              <div class="text-xs opacity-80">${description}</div>
            </div>
            <a role="button" href="${landingUrl}" target="_blank" rel="noopener" class="btn btn-primary w-auto px-4 py-2 text-sm" aria-label="${ctaLabel}">${ctaLabel}</a>
          </div>`;
          logEvent('ad_impression',{placement:'native'});
          slot.querySelector('a')?.addEventListener('click',()=>logEvent('ad_click',{placement:'native'}),{once:true});
          return;
        }
      }catch{}
      // Fallback to sponsor
      slot.innerHTML = $('#sponsor-card').outerHTML;
      logEvent('ad_impression',{placement:'native', fallback:true});
    },
    // Interstitial (frequency capping)
    async maybeShowInterstitial(trigger){
      if(!this.enabled() || !RemoteConfig.ads.placements.interstitial) return;
      const now = Date.now();
      const caps = RemoteConfig.ads.freqCaps; const sess = RemoteConfig.ads.session;
      if(sess.interstitialShown >= caps.interstitialPerSession) return;
      if(now - sess.lastInterstitialAt < RemoteConfig.ads.interstitialCooldownMs) return;
      sess.interstitialShown++; sess.lastInterstitialAt=now;
      const modal = $('#modal-interstitial'); const frame = $('#interstitial-frame');
      const local = this.getLocalAd('interstitial');
      logEvent('ad_impression',{placement:'interstitial', trigger, local:!!local});
      if(local){
        frame.removeAttribute('srcdoc');
        frame.src = local.creative;
      } else {
        let remote = null;
        try{
          const res = await Net.jget('/api/public/ads?placement=interstitial&province='+encodeURIComponent(Server.user.province||State.user.province));
          remote = res?.data ?? res;
        }catch{}
        const creativeUrl = remote?.creativeUrl ? String(remote.creativeUrl) : '';
        const creativeType = (remote?.creativeType || '').toLowerCase();
        if(creativeType === 'html' && creativeUrl){
          frame.removeAttribute('src');
          frame.srcdoc = creativeUrl;
        } else if(creativeUrl && creativeUrl.trim().startsWith('<')){
          frame.removeAttribute('src');
          frame.srcdoc = creativeUrl;
        } else if(creativeUrl){
          frame.removeAttribute('srcdoc');
          frame.src = creativeUrl;
        } else {
          frame.removeAttribute('src');
          frame.src = 'about:blank';
          frame.srcdoc = `<style>body{margin:0;display:flex;align-items:center;justify-content:center;background:#111;color:#fff;font-family:sans-serif}</style><div>تبلیغ محلی</div>`;
        }
      }
      modal.classList.add('show');
      let closed=false;
      function close(){ if(closed) return; closed=true; modal.classList.remove('show'); frame.src='about:blank'; frame.removeAttribute('srcdoc'); logEvent('ad_close',{placement:'interstitial'}); }
      $('#interstitial-close').onclick = close;
      setTimeout(()=>{ if(!closed){ close(); } }, 10_000);
    },
    // Rewarded
    async showRewarded({reward='coins', amount=20}={}){
      if(!this.enabled() || !RemoteConfig.ads.placements.rewarded){ toast('تبلیغ در دسترس نیست'); return false; }
      const sess = RemoteConfig.ads.session; if(sess.rewardedShown >= RemoteConfig.ads.freqCaps.rewardedPerSession){ toast('سقف تماشای ویدیو امروز تکمیل شده'); return false; }
      if(Server.subscription.active){ toast('در VIP تبلیغات نمایش داده نمی‌شود'); return false; }
      sess.rewardedShown++;
      const modal = $('#modal-rewarded'); const vid = $('#rewarded-video'); const claim = $('#rewarded-claim'); const cd = $('#rewarded-countdown');
      const local = this.getLocalAd('rewarded');
      let videoSrc = null; let rewardType = reward; let rewardAmount = amount; let landingUrl = '#';
      if(local){
        videoSrc = local.creative;
        if(local.reward){ rewardType = String(local.reward).toLowerCase(); }
        if(Number.isFinite(Number(local.amount))){ rewardAmount = Number(local.amount); }
        if(local.landing){ landingUrl = local.landing; }
      } else {
        try{
          const res = await Net.jget('/api/public/ads?placement=rewarded&province='+encodeURIComponent(Server.user.province||State.user.province));
          const data = res?.data ?? res;
          if(data){
            if(data.videoUrl) videoSrc = data.videoUrl;
            if(data.rewardType) rewardType = String(data.rewardType).toLowerCase();
            if(Number.isFinite(Number(data.rewardAmount))) rewardAmount = Number(data.rewardAmount);
            if(data.landingUrl) landingUrl = data.landingUrl;
          }
        }catch{}
      }
      if(!videoSrc){
        vid.removeAttribute('src'); vid.querySelector('source').src=''; vid.load();
        cd.textContent = 'اسپانسر محلی — پخش نمادین';
      } else {
        vid.querySelector('source').src = videoSrc; vid.load();
      }
      claim.disabled = true; let canClaimAt = Date.now()+RemoteConfig.ads.rewardedMinWatchMs;
      const t = setInterval(()=>{
        const left = Math.max(0, Math.ceil((canClaimAt - Date.now())/1000));
        cd.textContent = left>0 ? `پس از ${faNum(left)} ثانیه می‌توانی پاداش بگیری` : 'می‌توانی پاداش بگیری';
        if(left<=0){ claim.disabled=false; clearInterval(t); }
      }, 250);
      modal.classList.add('show');
      return new Promise(resolve=>{
        function cleanup(ok){ modal.classList.remove('show'); vid.pause(); claim.disabled=true; resolve(!!ok); }
        $('#rewarded-close').onclick=()=>{ logEvent('ad_close',{placement:'rewarded'}); cleanup(false); };
        claim.onclick=async ()=>{
          cleanup(true);
          if(rewardType==='coins'){ State.coins += rewardAmount; renderTopBars(); saveState(); }
          if(rewardType==='life'){ const livesToAdd = Math.max(1, Math.round(rewardAmount||1)); State.lives += livesToAdd; renderTopBars(); saveState(); }
          await logEvent('ad_completed',{placement:'rewarded', reward:rewardType, amount:rewardAmount});
          await logEvent('reward_granted',{reward:rewardType, amount:rewardAmount});
          const rewardName = rewardType==='coins'?'سکه':(rewardType==='life'?'کلید':'پاداش');
          toast(`<i class="fas fa-check ml-1"></i> پاداش دریافت شد: ${faNum(rewardAmount)} ${rewardName}`);
          const safeLanding = typeof landingUrl==='string' && /^https?:\/\//i.test(landingUrl);
          if(safeLanding){ setTimeout(()=>window.open(landingUrl,'_blank','noopener'),300); }
          SFX.coin();
        };
      });
    },
    async refreshAll(){
      this.renderBanner();
      this.renderNative('#ad-native-dashboard');
      this.renderNative('#ad-native-lb');
    }
  };
  
  // ===== Notifications / Modals / Theme =====
  function openModal(sel){ const m=$(sel); m.classList.add('show'); }
  function closeModal(sel){ const m=$(sel); m.classList.remove('show'); }
  $('#set-sound')?.addEventListener('change', e=>{ State.settings.sound = e.target.checked; saveState(); });
  $('#set-haptics')?.addEventListener('change', e=>{ State.settings.haptics = e.target.checked; saveState(); });
  $('#set-block-duels')?.addEventListener('change', e=>{ State.settings.blockDuels = e.target.checked; saveState(); });
  $('#set-theme')?.addEventListener('change', e=>{
    const night = e.target.checked; State.theme = night ? 'night' : 'ocean';
    document.documentElement.setAttribute('data-theme', State.theme); saveState();
  });
  
  // Lifelines
  let used5050=false, usedSkip=false, usedTimeBoost=false;
  function life5050(){
    if(used5050) return toast('۵۰–۵۰ را قبلاً استفاده کردی 😅');
    if(!spendLifelineCost()) return;
    used5050=true;
    markLifelineUsed('life-5050');
    const correct = State.quiz.list[State.quiz.idx].a;
    const idxs = [0,1,2,3].filter(i=>i!==correct).sort(()=>Math.random()-0.5).slice(0,2);
    idxs.forEach(i=>{ const el=$$('#choices .choice')[i]; if(el){ el.style.opacity=.35; el.style.pointerEvents='none'; } });
    toast('<i class="fas fa-percent ml-1"></i> دو گزینه حذف شد');
    SFX.coin();
  }
  function lifeSkip(){
    if(usedSkip) return toast('پرش فقط یک‌بار مجازه');
    if(!spendLifelineCost()) return;
    usedSkip=true;
    markLifelineUsed('life-skip');
    clearInterval(State.quiz.timer);
    const cur = State.quiz.list[State.quiz.idx];
    State.quiz.results.push({ q: cur.q, ok:false, correct: cur.c[cur.a], you:'— (پرش)' });
    saveState();
    toast('<i class="fas fa-forward ml-1"></i> به سؤال بعدی رفتی');
    nextQuestion();
  }
  function lifePause(){
    if(usedTimeBoost) return toast('فقط یک‌بار می‌توانی زمان اضافه کنی');
    if(!spendLifelineCost()) return;
    usedTimeBoost=true;
    markLifelineUsed('life-pause');
    addExtraTime(10);
    saveState();
    toast(`<i class="fas fa-stopwatch ml-1"></i> ${faNum(10)} ثانیه به زمانت اضافه شد`);
    SFX.coin();
  }
  
  // ===== Setup Sheet =====
  function openSetupSheet(){
    buildSetupFromAdmin();
    const range = $('#range-count');
    const countLabel = $('#setup-count');
    if(range && countLabel){ countLabel.textContent = faNum(range.value || range.getAttribute('value') || 5); }
    openSheet();
  }
  function openSheet(){ $('#sheet-setup').classList.add('show'); }
  function closeSheet(){ $('#sheet-setup').classList.remove('show'); }
  
  // ===== Notifications =====
  function renderNotifications(){
    const list = $('#notif-list'); list.innerHTML='';
    State.notifications.forEach(n=>{
      const row=document.createElement('div'); row.className='bg-white/10 border border-white/20 rounded-xl px-4 py-3';
      row.innerHTML=`<div class="font-bold mb-1">${n.text}</div><div class="text-xs opacity-80">${n.time}</div>`;
      list.appendChild(row);
    });
    $('#notif-dot').style.display = 'none';
  }
  
  // ===== Share =====
  function shareResult(){
    const ok = State.quiz.results.filter(r=>r.ok).length, total=State.quiz.results.length;
    const text = `من در Quiz WebApp Pro ${faNum(ok)}/${faNum(total)} پاسخ درست دادم و ${faNum(State.quiz.sessionEarned)} امتیاز گرفتم!`;
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/your_bot')}&text=${encodeURIComponent(text)}`;
    try{ 
      if (navigator.share) {
        navigator.share({
          title: 'نتیجه مسابقه',
          text: text,
          url: 'https://t.me/your_bot'
        });
      } else {
        window.open(url,'_blank'); 
      }
    }catch{ navigator.clipboard.writeText(text); toast('نتیجه کپی شد'); }
  }
  
  // ===== Support & Advertisers =====
  function renderSupportTickets() {
    const ticketsList = $('#tickets-list');
    ticketsList.innerHTML = '<div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div>';

    // Simulate loading tickets
    setTimeout(() => {
      ticketsList.innerHTML = `
        <div class="ticket-item">
          <div class="flex justify-between items-start mb-1">
            <div class="font-bold">مشکل در پرداخت</div>
            <span class="ticket-status status-pending">در حال بررسی</span>
          </div>
          <div class="text-xs opacity-70 mb-2">۱۴۰۲/۰۵/۱۰</div>
          <div class="text-sm">پرداخت انجام شد اما سکه‌ها اضافه نشدند...</div>
        </div>
        <div class="ticket-item">
          <div class="flex justify-between items-start mb-1">
            <div class="font-bold">پیشنهاد برای سوالات</div>
            <span class="ticket-status status-closed">بسته شده</span>
          </div>
          <div class="text-xs opacity-70 mb-2">۱۴۰۲/۰۴/۲۵</div>
          <div class="text-sm">پیشنهاد اضافه کردن دسته سوالات جدید...</div>
        </div>
      `;
    }, 1000);
  }

  function prepareInviteModal(){
    const reward = Number(State.referral?.rewardPerFriend ?? 5);
    const rewardLabel = faNum(reward);
    const link = `https://t.me/your_bot?start=ref_${State.user.id}`;
    const referred = Array.isArray(State.referral?.referred) ? State.referral.referred : [];
    const completed = referred.filter(friend => friend?.status === 'completed').length;

    const rewardEl = $('#invite-reward');
    if (rewardEl) rewardEl.textContent = rewardLabel;

    const totalEl = $('#invite-total');
    if (totalEl) totalEl.textContent = faNum(referred.length);

    const successEl = $('#invite-success');
    if (successEl) successEl.textContent = faNum(completed);

    const linkEl = $('#invite-link');
    if (linkEl) {
      linkEl.value = link;
      linkEl.dataset.value = link;
    }

    openModal('#modal-invite');
  }

  async function copyToClipboard(text){
    try{
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      return true;
    } catch (err) {
      console.error('copy failed', err);
      return false;
    }
  }

  // ===== Events =====
  // Delegate wallet package purchase buttons to handle re-renders
  $('#pkg-grid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.buy-pkg');
    if (!btn) return;
    e.preventDefault();
    showPaymentModal(btn.dataset.id);
  });
  $('#btn-play')?.addEventListener('click', openSetupSheet);
  $('#setup-close')?.addEventListener('click', closeSheet);
  $('#btn-daily')?.addEventListener('click', startDaily);
  $('#btn-back-lb')?.addEventListener('click', ()=> navTo('dashboard'));
  $('#btn-back-shop')?.addEventListener('click', ()=> navTo('dashboard'));
  $('#btn-quit')?.addEventListener('click', ()=>{
    State.duelOpponent = null;
    DuelSession = null;
    $('#duel-banner').classList.add('hidden');
    navTo('dashboard');
  });
  $('#btn-claim-streak')?.addEventListener('click', claimStreak);
  $('#btn-invite')?.addEventListener('click', prepareInviteModal);

  $$('[data-copy-target]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const target = btn.dataset.copyTarget;
      const map = {
        'invite-link': 'لینک دعوت'
      };
      const el = target ? document.getElementById(target) : null;
      const value = el?.value || el?.dataset?.value || '';
      if (!value) {
        toast('چیزی برای کپی وجود ندارد');
        return;
      }
      const ok = await copyToClipboard(value);
      if (ok) {
        toast(`<i class="fas fa-check-circle ml-2"></i>${map[target] || 'محتوا'} کپی شد!`);
      } else {
        toast('امکان کپی کردن وجود ندارد');
      }
    });
  });
  $('#btn-advertisers')?.addEventListener('click', ()=>{
    navTo('support');
    document.querySelector('.support-tab[data-tab="advertiser"]')?.click();
  });
  // Delegate shop item purchases to handle dynamic re-renders
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-buy]');
    if (!btn) return;
    buy(btn.dataset.buy);
  });
  document.addEventListener('click', event=>{
    const trigger=event.target.closest('[data-tab]');
    if(!trigger) return;
    if(trigger.classList.contains('leaderboard-tab') || trigger.classList.contains('support-tab')) return;
    const tab=trigger.dataset.tab;
    if(!tab || !NAV_PAGE_SET.has(tab)) return;
    event.preventDefault();
    if(tab==='quiz'){ openSetupSheet(); }
    else{ navTo(tab); }
  });
  $('#btn-settings')?.addEventListener('click', ()=>{
    $('#set-sound').checked = !!State.settings.sound;
    $('#set-haptics').checked = !!State.settings.haptics;
    $('#set-block-duels').checked = !!State.settings.blockDuels;
    $('#set-theme').checked = (State.theme==='night');
    openModal('#modal-settings');
  });
  $('#btn-theme')?.addEventListener('click', ()=>{
    const next = (State.theme==='ocean')?'night':'ocean';
    State.theme=next; document.documentElement.setAttribute('data-theme', next); saveState();
  });
  $('#btn-notify')?.addEventListener('click', ()=>{ renderNotifications(); openModal('#modal-notify'); });
  $('[data-close="#modal-settings"]')?.addEventListener('click', ()=>closeModal('#modal-settings'));
  $('[data-close="#modal-notify"]')?.addEventListener('click', ()=>closeModal('#modal-notify'));
  $('#btn-edit-profile')?.addEventListener('click', ()=>{
    $('#inp-name').value = State.user.name;
    const sel = $('#sel-province');
    populateProvinceOptions(sel, 'انتخاب استان');
    if(State.user.province){
      sel.value = State.user.province;
    }
    sel.disabled = true;
    const currentGroupName = getUserGroup()?.name || State.user.group || '—';
    $('#lbl-group').textContent = currentGroupName || '—';
    $('#inp-avatar').value = '';
    openModal('#modal-profile');
  });
  $('[data-close="#modal-profile"]')?.addEventListener('click', ()=>closeModal('#modal-profile'));
  $('#btn-save-profile')?.addEventListener('click', ()=>{
    const n = $('#inp-name').value.trim();
    if(n) State.user.name = n;

    // استان قابل تغییر نیست، بنابراین مقدار آن ذخیره نمی‌شود

    const file = $('#inp-avatar').files[0];
    if(file){
      const reader = new FileReader();
      reader.onload = () => { State.user.avatar = reader.result; finish(); };
      reader.readAsDataURL(file);
    } else {
      finish();
    }

    function finish(){
      saveState();
      renderHeader();
      renderDashboard();
      closeModal('#modal-profile');
      toast('ذخیره شد ✅');
    }
  });
  $('#btn-confirm-province')?.addEventListener('click', () => {
    const p = $('#first-province').value;
    if(!p){ toast('لطفاً استان خود را انتخاب کنید'); return; }
    State.user.province = p;
    saveState();
    renderDashboard();
    renderProvinceSelect();
    closeModal('#modal-province-select');
    toast('استان ثبت شد ✅');
  });
  $('#btn-clear')?.addEventListener('click', ()=>{ if(confirm('همهٔ داده‌ها حذف شود؟')){ localStorage.removeItem(STORAGE_KEY); location.reload(); } });
  
  // Leaderboard Tabs
  $$('.leaderboard-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      $$('.leaderboard-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.lb-content').forEach(content => content.classList.add('hidden'));
      $(`#lb-${tab.dataset.tab}`)?.classList.remove('hidden');
    });
  });
  
  // Match Types
  $$('.match-type-card').forEach(card => {
    card.addEventListener('click', () => {
      const matchType = card.dataset.match;
      if (matchType === 'duel') navTo('duel');
      else if (matchType === 'province') openModal('#modal-province-soon');
      else if (matchType === 'group') navTo('group');
    });
  });
  
  // Duel Friends list
  const duelFriends = [
    { id: 1, name: 'علی رضایی', score: 12450, avatar: 'https://i.pravatar.cc/60?img=3' },
    { id: 2, name: 'سارا محمدی', score: 9800, avatar: 'https://i.pravatar.cc/60?img=5' },
    { id: 3, name: 'رضا قاسمی', score: 15200, avatar: 'https://i.pravatar.cc/60?img=8' },
    { id: 4, name: 'مریم احمدی', score: 7650, avatar: 'https://i.pravatar.cc/60?img=11' }
  ];

  const randomPool = [
    { id: 5, name: 'حسین کریمی', score: 13200, avatar: 'https://i.pravatar.cc/60?img=12' },
    { id: 6, name: 'نگار موسوی', score: 9100, avatar: 'https://i.pravatar.cc/60?img=13' },
    { id: 7, name: 'کامران علیپور', score: 10100, avatar: 'https://i.pravatar.cc/60?img=14' }
  ];

  const duelFriendThemes = [
    { start: 'rgba(59,130,246,0.85)', end: 'rgba(236,72,153,0.85)' },
    { start: 'rgba(16,185,129,0.85)', end: 'rgba(6,182,212,0.85)' },
    { start: 'rgba(249,115,22,0.85)', end: 'rgba(234,179,8,0.85)' },
    { start: 'rgba(139,92,246,0.85)', end: 'rgba(236,72,153,0.85)' }
  ];

  const duelFriendStatuses = [
    'آخرین نبرد: همین حالا',
    'چالش بعدی آماده است',
    'در تلاش برای رکورد جدید',
    'منتظر دعوت توست'
  ];

  function getDuelCategories(){
    if (!Array.isArray(Admin.categories)) return [];
    return Admin.categories.filter(cat => cat && cat.id != null);
  }

  function pickOpponentCategory(roundIndex){
    const categories = getDuelCategories();
    if (categories.length === 0) return null;
    const usedIds = new Set((DuelSession?.rounds || []).map(r => r?.categoryId).filter(Boolean));
    const available = categories.filter(cat => !usedIds.has(cat.id));
    const pool = available.length ? available : categories;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const idx = categories.indexOf(chosen);
    return {
      id: chosen.id,
      title: chosen.title || chosen.name || `دسته ${faNum(idx + 1)}`
    };
  }

  function promptDuelRoundCategory(roundIndex){
    if (!DuelSession) return;
    const categories = getDuelCategories();
    if (categories.length === 0){
      cancelDuelSession('no_category');
      return;
    }

    const round = DuelSession.rounds?.[roundIndex];
    if (!round){
      cancelDuelSession('no_category');
      return;
    }

    DuelSession.currentRoundIndex = roundIndex;
    const roundLabel = `راند ${faNum(roundIndex + 1)}`;
    const qLabel = faNum(DUEL_QUESTIONS_PER_ROUND);

    if (round.chooser === 'you'){
      DuelSession.awaitingSelection = true;
      DuelSession.selectionResolved = false;
      const optionsHtml = categories.map((cat, idx) => {
        const title = cat.title || cat.name || `دسته ${faNum(idx+1)}`;
        const desc = cat.description ? `<span class="text-xs opacity-70">${cat.description}</span>` : '';
        return `<button class="duel-category-option" data-cat="${cat.id}" data-title="${title}">
          <div class="duel-category-icon">${faNum(idx+1)}</div>
          <div class="duel-category-meta"><span class="font-bold">${title}</span>${desc}</div>
          <i class="fas fa-chevron-left opacity-70"></i>
        </button>`;
      }).join('');
      showDetailPopup(`${roundLabel} • انتخاب دسته‌بندی`, `
        <div class="text-sm opacity-80 mb-3">${qLabel} سؤال در این راند مطرح می‌شود. دسته‌بندی مدنظرت را انتخاب کن.</div>
        <div class="space-y-2 max-h-72 overflow-y-auto pr-1">${optionsHtml}</div>
        <button id="duel-cancel" class="btn btn-secondary w-full mt-4"><i class="fas fa-times ml-2"></i> انصراف</button>
      `);
      $('#duel-cancel')?.addEventListener('click', () => {
        DuelSession.awaitingSelection = false;
        cancelDuelSession('user_cancelled');
        closeDetailPopup({ skipDuelCancel: true });
      });
      $$('#detail-content .duel-category-option').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!DuelSession) return;
          DuelSession.awaitingSelection = false;
          DuelSession.selectionResolved = true;
          round.categoryId = btn.dataset.cat;
          round.categoryTitle = btn.dataset.title;
          closeDetailPopup({ skipDuelCancel: true });
          const started = await beginDuelRound(roundIndex);
          if (!started){
            DuelSession.selectionResolved = false;
            setTimeout(() => promptDuelRoundCategory(roundIndex), 400);
          }
        });
      });
    } else {
      const selection = pickOpponentCategory(roundIndex);
      if (!selection){
        cancelDuelSession('no_category');
        return;
      }
      round.categoryId = selection.id;
      round.categoryTitle = selection.title;
      DuelSession.awaitingSelection = true;
      DuelSession.selectionResolved = false;
      showDetailPopup(`${roundLabel} • انتخاب حریف`, `
        <div class="text-sm opacity-80 mb-3">حریف شما دستهٔ «${selection.title}» را برای این راند برگزید. ${qLabel} سؤال پیش رو دارید.</div>
        <button id="duel-round-${roundIndex}-start" class="btn btn-duel w-full"><i class="fas fa-play ml-2"></i> شروع ${roundLabel}</button>
      `);
      $(`#duel-round-${roundIndex}-start`)?.addEventListener('click', async () => {
        if (!DuelSession) return;
        DuelSession.awaitingSelection = false;
        DuelSession.selectionResolved = true;
        closeDetailPopup({ skipDuelCancel: true });
        const started = await beginDuelRound(roundIndex);
        if (!started){
          DuelSession.selectionResolved = false;
          setTimeout(() => promptDuelRoundCategory(roundIndex), 400);
        }
      });
    }
  }

  async function beginDuelRound(roundIndex){
    if (!DuelSession) return false;
    const round = DuelSession.rounds?.[roundIndex];
    if (!round || !round.categoryId) return false;

    let difficultyValue = DuelSession.difficulty?.value;
    let difficultyLabel = DuelSession.difficulty?.label;
    const categoryId = round.categoryId;
    const catTitle = round.categoryTitle;
    const catObj = getDuelCategories().find(cat => cat.id === categoryId) || null;
    if (catObj && Array.isArray(catObj.difficulties) && catObj.difficulties.length){
      let diffMatch = null;
      if (difficultyValue != null){
        diffMatch = catObj.difficulties.find(d => d && d.value === difficultyValue) || null;
      }
      if (!diffMatch && difficultyLabel){
        diffMatch = catObj.difficulties.find(d => d && d.label === difficultyLabel) || null;
      }
      if (!diffMatch) diffMatch = catObj.difficulties[0];
      if (diffMatch){
        difficultyValue = diffMatch.value;
        difficultyLabel = diffMatch.label || diffMatch.value;
      }
    } else if (!difficultyValue && Array.isArray(Admin.diffs) && Admin.diffs.length){
      difficultyValue = Admin.diffs[0].value;
      difficultyLabel = Admin.diffs[0].label || Admin.diffs[0].value;
    }
    DuelSession.difficulty = { value: difficultyValue, label: difficultyLabel };

    const started = await startQuizFromAdmin({
      count: DUEL_QUESTIONS_PER_ROUND,
      difficulty: difficultyValue,
      categoryId,
      cat: catTitle,
      source: 'duel'
    });

    if (!started){
      if (!DuelSession.consumedResource && DuelSession.resolveStart){
        try { DuelSession.resolveStart(false); } catch (_) {}
        DuelSession.resolveStart = null;
      }
      toast('برای این دسته‌بندی سؤال کافی موجود نیست');
      return false;
    }

    DuelSession.started = true;
    DuelSession.currentRoundIndex = roundIndex;
    const opponentName = DuelSession.opponent?.name || '';
    if (!DuelSession.consumedResource){
      useGameResource('duels');
      DuelSession.consumedResource = true;
      logEvent('duel_start', { opponent: opponentName, round: roundIndex + 1, category: catTitle });
    } else {
      logEvent('duel_round_start', { opponent: opponentName, round: roundIndex + 1, category: catTitle });
    }

    State.duelOpponent = DuelSession.opponent;
    $('#duel-opponent-name').textContent = opponentName;
    $('#duel-banner').classList.remove('hidden');

    const toastMsg = roundIndex === 0
      ? `راند اول با دسته «${catTitle}» شروع شد`
      : `راند ${faNum(roundIndex + 1)} با دسته «${catTitle}» آغاز شد`;
    toast(toastMsg);

    if (DuelSession.resolveStart){
      try { DuelSession.resolveStart(true); } catch (_) {}
      DuelSession.resolveStart = null;
    }

    return true;
  }

  function simulateOpponentRound(round, totalQuestions, yourCorrect){
    const advantage = round.chooser === 'opponent' ? 1 : 0;
    const min = Math.max(0, Math.min(totalQuestions, yourCorrect - 2));
    const max = Math.min(totalQuestions, Math.max(min, yourCorrect + 2 + advantage));
    const correct = Math.round(min + Math.random() * (max - min));
    const boundedCorrect = Math.max(0, Math.min(totalQuestions, correct));
    const wrong = totalQuestions - boundedCorrect;
    const earned = boundedCorrect * 120;
    return { correct: boundedCorrect, wrong, earned };
  }

  function completeDuelRound(correctCount){
    if (!DuelSession || !State.duelOpponent) return 'none';
    const roundIdx = DuelSession.currentRoundIndex || 0;
    const round = DuelSession.rounds?.[roundIdx];
    if (!round) return 'none';

    const totalQuestions = State.quiz.results.length || State.quiz.list.length || DUEL_QUESTIONS_PER_ROUND;
    const yourCorrect = correctCount;
    const yourWrong = Math.max(0, totalQuestions - yourCorrect);
    const yourEarned = State.quiz.sessionEarned;

    round.player = { correct: yourCorrect, wrong: yourWrong, earned: yourEarned };
    round.totalQuestions = totalQuestions;
    const opponentStats = simulateOpponentRound(round, totalQuestions, yourCorrect);
    round.opponent = opponentStats;

    DuelSession.totalYourScore += yourEarned;
    DuelSession.totalOpponentScore += opponentStats.earned;

    logEvent('duel_round_end', {
      opponent: DuelSession.opponent?.name,
      round: roundIdx + 1,
      your_correct: yourCorrect,
      opponent_correct: opponentStats.correct
    });

    toast(`راند ${faNum(roundIdx + 1)} به پایان رسید: ${faNum(yourCorrect)} درست در برابر ${faNum(opponentStats.correct)}`);

    const hasMore = roundIdx + 1 < DuelSession.rounds.length;
    if (hasMore) {
      DuelSession.currentRoundIndex = roundIdx + 1;
      setTimeout(() => promptDuelRoundCategory(roundIdx + 1), 1200);
      return 'next';
    }
    return 'finished';
  }

  function finalizeDuelResults(){
    if (!DuelSession) return;
    const opponent = DuelSession.opponent || {};
    const youName = State.user?.name || 'شما';
    const oppName = opponent.name || 'حریف';

    const totals = DuelSession.rounds.reduce((acc, round) => {
      const questions = round.totalQuestions || (round.player?.correct || 0) + (round.player?.wrong || 0);
      acc.you.correct += round.player?.correct || 0;
      acc.you.wrong += round.player?.wrong || 0;
      acc.you.earned += round.player?.earned || 0;
      acc.you.questions += questions;
      acc.opp.correct += round.opponent?.correct || 0;
      acc.opp.wrong += round.opponent?.wrong || 0;
      acc.opp.earned += round.opponent?.earned || 0;
      acc.opp.questions += questions;
      return acc;
    }, { you: { correct: 0, wrong: 0, earned: 0, questions: 0 }, opp: { correct: 0, wrong: 0, earned: 0, questions: 0 } });

    let winnerText = 'مسابقه مساوی شد!';
    if (totals.you.earned > totals.opp.earned) {
      winnerText = `${youName} با مجموع ${faNum(totals.you.earned)} امتیاز برنده شد!`;
      State.duelWins++;
    } else if (totals.you.earned < totals.opp.earned) {
      winnerText = `${oppName} با مجموع ${faNum(totals.opp.earned)} امتیاز پیروز شد!`;
      State.duelLosses++;
    }

    const outcome = totals.you.earned > totals.opp.earned ? 'win' : totals.you.earned < totals.opp.earned ? 'loss' : 'draw';
    State.duelHistory = Array.isArray(State.duelHistory) ? State.duelHistory : [];
    State.duelHistory.unshift({
      id: DuelSession?.id || `duel-${Date.now()}`,
      opponent: oppName,
      yourScore: totals.you.earned,
      opponentScore: totals.opp.earned,
      outcome,
      reason: outcome === 'loss' ? 'score' : (outcome === 'win' ? 'score' : 'draw'),
      resolvedAt: Date.now(),
      startedAt: DuelSession?.startedAt,
      deadline: DuelSession?.deadline
    });
    State.duelHistory = State.duelHistory.slice(0, 20);
    if (Array.isArray(State.pendingDuels)) {
      State.pendingDuels = State.pendingDuels.filter(duel => duel.id !== DuelSession?.id);
    }

    $('#duel-avatar-you').src = State.user?.avatar || 'https://i.pravatar.cc/60?img=1';
    $('#duel-name-you').textContent = youName;
    $('#duel-avatar-opponent').src = opponent.avatar || 'https://i.pravatar.cc/60?img=2';
    $('#duel-name-opponent').textContent = oppName;
    $('#duel-winner').textContent = winnerText;
    $('#duel-stats').innerHTML = `${youName}: ${faNum(totals.you.correct)} درست، ${faNum(totals.you.wrong)} نادرست، ${faNum(totals.you.earned)} امتیاز<br>${oppName}: ${faNum(totals.opp.correct)} درست، ${faNum(totals.opp.wrong)} نادرست، ${faNum(totals.opp.earned)} امتیاز`;
    $('#duel-result').classList.remove('hidden');

    const summaryEl = $('#duel-rounds-summary');
    if (summaryEl) {
      const summaryHtml = DuelSession.rounds.map((round, idx) => {
        const chooserLabel = round.chooser === 'you' ? 'انتخاب شما' : 'انتخاب حریف';
        const youEarned = round.player?.earned || 0;
        const oppEarned = round.opponent?.earned || 0;
        let roundResult = 'مساوی';
        if (youEarned > oppEarned) roundResult = `${youName} برنده راند`;
        else if (youEarned < oppEarned) roundResult = `${oppName} برنده راند`;
        const categoryTitle = round.categoryTitle || '—';
        return `<div class="duel-round-card">
          <div class="duel-round-header">
            <div class="duel-round-title">راند ${faNum(idx + 1)} • ${categoryTitle}</div>
            <span class="duel-round-chooser">${chooserLabel}</span>
          </div>
          <div class="duel-round-score">
            <div><span class="font-bold">${youName}</span><span>${faNum(round.player?.correct || 0)} درست • ${faNum(youEarned)} امتیاز</span></div>
            <div><span class="font-bold">${oppName}</span><span>${faNum(round.opponent?.correct || 0)} درست • ${faNum(oppEarned)} امتیاز</span></div>
          </div>
          <div class="text-xs opacity-80">${roundResult}</div>
        </div>`;
      }).join('');
      summaryEl.innerHTML = summaryHtml;
      summaryEl.classList.remove('hidden');
    }

    setupAddFriendCTA(opponent);

    $('#res-correct').textContent = faNum(totals.you.correct);
    $('#res-wrong').textContent = faNum(Math.max(0, totals.you.questions - totals.you.correct));
    $('#res-earned').textContent = faNum(totals.you.earned);

    State.quiz.sessionEarned = totals.you.earned;
    State.duelOpponent = null;
    DuelSession = null;
    $('#duel-banner').classList.add('hidden');
    renderDashboard();
  }

  function generateAvatarFromName(name){
    const seed = encodeURIComponent(name || 'opponent');
    return `https://i.pravatar.cc/80?u=${seed}`;
  }

  function suggestScoreFromState(){
    const baseScore = Number(State?.score) || 0;
    if (baseScore <= 0) return 9500;
    const normalized = Math.max(1800, Math.round(baseScore / 5));
    return normalized;
  }

  function hideDuelAddFriendCTA(){
    const container = $('#duel-add-friend');
    const nameEl = $('#duel-add-friend-name');
    const scoreEl = $('#duel-add-friend-score');
    const btn = $('#btn-add-duel-friend');
    if (container) container.classList.add('hidden');
    if (nameEl) nameEl.textContent = '';
    if (scoreEl) scoreEl.textContent = faNum(0);
    if (btn) btn.disabled = true;
    PendingDuelFriend = null;
  }

  function setupAddFriendCTA(opponent){
    const container = $('#duel-add-friend');
    const nameEl = $('#duel-add-friend-name');
    const scoreEl = $('#duel-add-friend-score');
    const btn = $('#btn-add-duel-friend');
    hideDuelAddFriendCTA();
    if (!container || !nameEl || !scoreEl || !btn) return;
    if (!opponent || !opponent.name) return;
    const name = opponent.name.trim();
    if (!name) return;
    const already = duelFriends.some(friend => {
      if (opponent.id != null && friend.id === opponent.id) return true;
      return friend.name === name;
    });
    if (already) return;
    const score = Number(opponent.score);
    const normalizedScore = Number.isFinite(score) && score > 0 ? score : suggestScoreFromState();
    const avatar = opponent.avatar || generateAvatarFromName(name);
    PendingDuelFriend = { id: opponent.id, name, score: normalizedScore, avatar };
    nameEl.textContent = name;
    scoreEl.textContent = faNum(normalizedScore);
    btn.disabled = false;
    container.classList.remove('hidden');
  }

  function addOpponentToDuelFriends(opponent){
    if (!opponent || !opponent.name) return;
    const name = opponent.name.trim();
    if (!name) return;
    const exists = duelFriends.some(friend => friend.name === name || (opponent.id != null && friend.id === opponent.id));
    if (exists){
      toast('این حریف از قبل در لیست است');
      return;
    }
    const usedIds = duelFriends.map(friend => Number(friend.id) || 0);
    let id = Number(opponent.id);
    if (!Number.isFinite(id) || usedIds.includes(id)){
      id = (usedIds.length ? Math.max(...usedIds) : 0) + 1;
    }
    const entry = {
      id,
      name,
      score: Number(opponent.score) > 0 ? Number(opponent.score) : suggestScoreFromState(),
      avatar: opponent.avatar || generateAvatarFromName(name)
    };
    duelFriends.unshift(entry);
    renderDuelFriends();
    toast(`${entry.name} به لیست حریف‌ها اضافه شد ✅`);
  }

  function renderDuelFriends(){
    const list = $('#duel-friends-list');
    if(!list) return;
    list.innerHTML = '';
    if(duelFriends.length === 0){
      list.innerHTML = '<div class="duel-friend-empty text-sm opacity-85 text-center">هنوز حریفی ذخیره نکرده‌ای. پس از پایان نبرد، حریف دلخواهت را به این لیست اضافه کن.</div>';
      return;
    }
    duelFriends.forEach((friend, idx) => {
      const card = document.createElement('article');
      card.className = 'duel-friend-card fade-in';
      const theme = duelFriendThemes[idx % duelFriendThemes.length];
      if (theme) {
        card.style.setProperty('--duel-friend-start', theme.start);
        card.style.setProperty('--duel-friend-end', theme.end);
      }
      const avatar = friend.avatar || generateAvatarFromName(friend.name);
      const status = friend.status || duelFriendStatuses[idx % duelFriendStatuses.length];
      card.innerHTML = `
        <div class="duel-friend-profile">
          <div class="duel-friend-avatar">
            <img src="${avatar}" alt="${friend.name}">
            <span class="duel-friend-badge"><i class="fas fa-star"></i></span>
          </div>
          <div class="duel-friend-meta">
            <span class="duel-friend-name">${friend.name}</span>
            <span class="duel-friend-score"><i class="fas fa-trophy"></i>${faNum(friend.score || 0)} امتیاز</span>
            <span class="duel-friend-status">${status}</span>
          </div>
        </div>
        <div class="duel-friend-action">
          <button class="btn btn-duel btn-inline" data-id="${friend.id}" aria-label="شروع نبرد با ${friend.name}">چالش</button>
        </div>`;
      list.appendChild(card);
    });
    list.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await challengeFriend(parseInt(btn.dataset.id, 10));
      });
    });
  }

  async function challengeFriend(id){
    const friend = duelFriends.find(f => f.id === id);
    if(!friend) return;
    logEvent('duel_challenge', { opponent: friend.name });
    const started = await startDuelMatch(friend);
    if(started){
      const idx = duelFriends.findIndex(f => f.id === friend.id);
      if(idx > 0){
        const [item] = duelFriends.splice(idx,1);
        duelFriends.unshift(item);
        renderDuelFriends();
      }
    }
  }

  function ensureDuelRuleReminder(){
    const modal = $('#duel-rule-modal');
    if (!modal) return Promise.resolve(true);
    const confirmBtn = modal.querySelector('[data-duel-rule="confirm"]');
    const cancelBtns = Array.from(modal.querySelectorAll('[data-duel-rule="cancel"]'));
    return new Promise(resolve => {
      const previousActive = document.activeElement;
      function cleanup(result){
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden','true');
        confirmBtn?.removeEventListener('click', onConfirm);
        cancelBtns.forEach(btn => btn.removeEventListener('click', onCancel));
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        if (previousActive && typeof previousActive.focus === 'function') {
          setTimeout(() => previousActive.focus({ preventScroll: true }), 0);
        }
        resolve(result);
      }
      function onConfirm(){ vibrate(20); cleanup(true); }
      function onCancel(){ cleanup(false); }
      function onBackdrop(evt){ if (evt.target === modal) onCancel(); }
      function onKey(evt){ if (evt.key === 'Escape') onCancel(); }
      confirmBtn?.addEventListener('click', onConfirm);
      cancelBtns.forEach(btn => btn.addEventListener('click', onCancel));
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
      modal.classList.add('show');
      modal.setAttribute('aria-hidden','false');
      setTimeout(() => confirmBtn?.focus({ preventScroll: true }), 50);
    });
  }

  async function startDuelMatch(opponent){
    hideDuelAddFriendCTA();
    const limitCfg = RemoteConfig?.gameLimits?.duels;
    const vipMultiplier = Server.subscription.active ? (Server.subscription.tier === 'pro' ? 3 : 2) : 1;
    const dailyLimit = (limitCfg?.daily || 0) * vipMultiplier;
    if (dailyLimit && Server.limits.duels.used >= dailyLimit){
      toast('به محدودیت نبرد تن‌به‌تن امروز رسیدی');
      logEvent('duel_limit_reached', { opponent: opponent?.name });
      return false;
    }

    const expired = applyExpiredDuelPenalties({ skipRender: true });
    if (expired) renderDashboard();

    const categories = getDuelCategories();
    if (categories.length === 0){
      toast('هنوز دسته‌بندی فعالی برای نبرد موجود نیست');
      return false;
    }

    let categoryId = State.quiz.catId;
    if (categoryId == null && categories.length) categoryId = categories[0].id;
    let catObj = categories.find(cat => cat.id === categoryId) || categories[0] || null;

    let diffPool;
    if (catObj && Array.isArray(catObj.difficulties) && catObj.difficulties.length) {
      diffPool = catObj.difficulties;
    } else if (Array.isArray(Admin.diffs) && Admin.diffs.length) {
      diffPool = Admin.diffs;
    } else {
      diffPool = DEFAULT_DIFFS;
    }

    let preferred = null;
    if (State.quiz.diffValue != null) {
      for (let pd = 0; pd < diffPool.length; pd++) {
        const diffOpt = diffPool[pd];
        if (diffOpt && diffOpt.value === State.quiz.diffValue) { preferred = diffOpt; break; }
      }
    }
    if (!preferred && State.quiz.diff) {
      for (let pdl = 0; pdl < diffPool.length; pdl++) {
        const diffOptLabel = diffPool[pdl];
        if (diffOptLabel && diffOptLabel.label === State.quiz.diff) { preferred = diffOptLabel; break; }
      }
    }
    if (!preferred) {
      for (let pm = 0; pm < diffPool.length; pm++) {
        const diffOptMid = diffPool[pm];
        if (!diffOptMid) continue;
        const valLower = (diffOptMid.value || '').toString().toLowerCase();
        const labelLower = (diffOptMid.label || '').toString().toLowerCase();
        if (valLower === 'medium' || valLower === 'normal' || labelLower.indexOf('متوسط') >= 0 || labelLower.indexOf('medium') >= 0 || labelLower.indexOf('normal') >= 0) {
          preferred = diffOptMid;
          break;
        }
      }
    }
    if (!preferred && diffPool.length) preferred = diffPool[0];
    if (!preferred && Array.isArray(Admin.diffs) && Admin.diffs.length) preferred = Admin.diffs[0];
    if (!preferred && DEFAULT_DIFFS.length) preferred = DEFAULT_DIFFS[0];

    const difficultyInfo = preferred ? { value: preferred.value, label: preferred.label || preferred.value } : null;

    const acknowledged = await ensureDuelRuleReminder();
    if (!acknowledged){
      logEvent('duel_rule_declined', { opponent: opponent?.name });
      return false;
    }

    const duelId = `duel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();
    const deadline = startedAt + DUEL_TIMEOUT_MS;
    const opponentNameLabel = opponent?.name || 'حریف';
    if (!Array.isArray(State.pendingDuels)) State.pendingDuels = [];
    State.pendingDuels.push({ id: duelId, opponent: opponentNameLabel, startedAt, deadline });
    saveState();
    logEvent('duel_rule_acknowledged', { opponent: opponent?.name, deadlineHours: 24 });

    DuelSession = {
      id: duelId,
      startedAt,
      deadline,
      opponent,
      difficulty: difficultyInfo,
      rounds: Array.from({ length: DUEL_ROUNDS }, (_, idx) => ({
        index: idx,
        chooser: idx === 0 ? 'you' : 'opponent',
        categoryId: null,
        categoryTitle: '',
        player: { correct: 0, wrong: 0, earned: 0 },
        opponent: { correct: 0, wrong: 0, earned: 0 }
      })),
      currentRoundIndex: 0,
      totalYourScore: 0,
      totalOpponentScore: 0,
      consumedResource: false,
      awaitingSelection: false,
      selectionResolved: false,
      started: false,
      resolveStart: null
    };

    return await new Promise(resolve => {
      DuelSession.resolveStart = resolve;
      promptDuelRoundCategory(0);
    });
  }

  renderDuelFriends();
  hideDuelAddFriendCTA();

  $('#btn-add-duel-friend')?.addEventListener('click', () => {
    if (!PendingDuelFriend) {
      hideDuelAddFriendCTA();
      return;
    }
    vibrate(20);
    addOpponentToDuelFriends(PendingDuelFriend);
    logEvent('duel_friend_saved', { opponent: PendingDuelFriend.name });
    hideDuelAddFriendCTA();
  });

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-duel-summary]');
    if (!trigger) return;
    event.preventDefault();
    const type = trigger.getAttribute('data-duel-summary');
    if (!type) return;
    showDuelRecordSummary(type);
  });

  // Random Opponent Matching
  $('#btn-duel-random')?.addEventListener('click', async () => {
    const btn = $('#btn-duel-random');
    if(!btn) return;
    btn.disabled = true;
    vibrate(30);
    toast('در حال جستجوی حریف تصادفی...');
    await new Promise(res => setTimeout(res, 1500));
    const opponent = randomPool[Math.floor(Math.random()*randomPool.length)];
    toast(`حریف ${opponent.name} پیدا شد!`);
    logEvent('duel_random_found', { opponent: opponent.name });
    await startDuelMatch(opponent);
    btn.disabled = false;
  });

  // Invite Link Copy
  $('#btn-duel-link')?.addEventListener('click', async () => {
    const inviter = State?.user?.name || 'guest';
    const link = `${location.origin}${location.pathname}?duel_invite=${encodeURIComponent(inviter)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'دعوت به نبرد',
          text: `${inviter} شما را به نبرد دعوت کرده است!`,
          url: link
        });
        toast('دعوت ارسال شد ✅');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        toast('لینک دعوت کپی شد ✅');
      } else {
        prompt('این لینک را کپی کنید:', link);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(link);
        toast('لینک دعوت کپی شد ✅');
      } catch {
        prompt('این لینک را کپی کنید:', link);
      }
    }
    logEvent('duel_invite_link');
  });

  function handleProvinceJoin(province) {
    if (!province || !province.name) {
      toast('اطلاعات استان در دسترس نیست');
      return;
    }
    toast(`ثبت‌نام در مسابقه ${province.name} با موفقیت انجام شد!`);
    logEvent('province_match_join', {
      province: province.name,
      provinceId: province.id || province.code || province.slug || undefined
    });
  }

  function renderProvinceSelect() {
    const list = $('#province-select-list');
    if (!list) return;

    const provinces = Array.isArray(State.provinces)
      ? State.provinces.filter(p => p && (p.name || p.title))
      : [];

    if (provinces.length === 0) {
      list.innerHTML = '<div class="glass rounded-2xl p-4 text-sm opacity-80 text-center">هنوز استانی برای نمایش وجود ندارد.</div>';
      return;
    }

    const normalized = provinces.map((province, idx) => {
      const name = province?.name || province?.title || `استان ${idx + 1}`;
      const scoreRaw = province?.score ?? province?.totalScore ?? province?.points ?? province?.total_points ?? province?.totalPoints ?? 0;
      const scoreNum = Number(scoreRaw);
      const score = Number.isFinite(scoreNum) ? scoreNum : 0;
      const memberRaw = province?.members ?? province?.memberCount ?? province?.participants ?? province?.players ?? 0;
      const memberNum = Number(memberRaw);
      const members = Number.isFinite(memberNum) ? memberNum : 0;
      const region = province?.region || province?.area || province?.zone || '';
      return {
        ...province,
        id: province?.id ?? province?._id ?? province?.code ?? province?.slug ?? name,
        name,
        score,
        members,
        region
      };
    }).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.members !== a.members) return b.members - a.members;
      return (a.name || '').localeCompare(b.name || '', 'fa');
    });

    list.innerHTML = '';
    normalized.forEach((province, idx) => {
      const rank = idx + 1;
      let badgeClass = 'bg-white/20';
      if (rank === 1) badgeClass = 'bg-gradient-to-br from-yellow-200 to-yellow-400 text-gray-900';
      else if (rank === 2) badgeClass = 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900';
      else if (rank === 3) badgeClass = 'bg-gradient-to-br from-amber-600 to-amber-700 text-gray-900';

      const participantsLabel = province.members > 0
        ? `${faNum(province.members)} شرکت‌کننده`
        : 'بدون شرکت‌کننده';
      const regionLine = province.region
        ? `<div class="text-xs opacity-70 mt-1">${province.region}</div>`
        : '';
      const scoreLabel = province.score > 0 ? faNum(province.score) : '—';

      const card = document.createElement('div');
      card.className = 'location-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.dataset.provinceKey = province.id;
      card.innerHTML = `
        <span class="rank-badge ${badgeClass}">${faNum(rank)}</span>
        <div class="location-icon province-icon"><i class="fas fa-map-marked-alt"></i></div>
        <div class="flex-1">
          <div class="font-bold">${province.name}</div>
          <div class="text-sm opacity-80 flex items-center gap-1"><i class="fas fa-users"></i><span>${participantsLabel}</span></div>
          ${regionLine}
        </div>
        <div class="text-sm font-bold text-green-300"><i class="fas fa-trophy"></i> ${scoreLabel}</div>`;

      if (province.name === State.user.province) {
        card.classList.add('ring-2', 'ring-green-300');
        card.setAttribute('aria-current', 'true');
      }

      const join = () => handleProvinceJoin(province);
      card.addEventListener('click', join);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          join();
        }
      });

      list.appendChild(card);
    });
  }

  // Group Selection
function renderGroupSelect() {
  const list = $('#group-select-list');
  if (!list) return;
  list.innerHTML = '';

  // Hide create button if user already has a group
  const createBtn = $('#btn-create-group');
  if (createBtn) {
    createBtn.style.display = isUserInGroup() ? 'none' : 'block';
  }

  const userGroup = isUserInGroup() ? (getUserGroup() || State.groups.find(g => g.name === State.user.group)) : null;

  // Add user's current group info if they have one
  if (userGroup) {
    const isAdmin = userGroup.admin === State.user.name;
    const infoCard = document.createElement('div');
    infoCard.className = 'glass rounded-2xl p-4 mb-4 text-center';
    infoCard.innerHTML = `
      <div class="text-lg font-bold mb-2">گروه فعلی شما</div>
      <div class="text-xl font-bold text-purple-300 mb-2">${userGroup.name}</div>
      <div class="text-sm opacity-80 mb-3">شما ${isAdmin ? 'مدیر' : 'عضو'} این گروه هستید</div>
      <button id="btn-leave-delete-group" class="btn ${isAdmin ? 'btn-duel' : 'btn-secondary'} w-full">
        <i class="fas fa-${isAdmin ? 'trash' : 'sign-out-alt'} ml-2"></i>
        ${isAdmin ? 'حذف گروه' : 'خروج از گروه'}
      </button>
    `;
    list.appendChild(infoCard);

    $('#btn-leave-delete-group')?.addEventListener('click', () => {
      const confirmMsg = isAdmin
        ? 'آیا از حذف گروه اطمینان دارید؟ این عمل غیرقابل بازگشت است.'
        : 'آیا از خروج از گروه اطمینان دارید؟';

      if (confirm(confirmMsg)) {
        if (isAdmin) {
          deleteGroup(userGroup.id);
        } else {
          leaveGroup(userGroup.id);
        }
      }
    });
  }

  if (!userGroup) {
    State.groups.forEach(g => {
      const card = document.createElement('div');
      card.className = 'location-card';
      card.innerHTML = `
        <div class="location-icon group-icon"><i class="fas fa-users"></i></div>
        <div class="flex-1"><div class="font-bold">${g.name}</div>
          <div class="text-sm opacity-80 flex items-center gap-1"><i class="fas fa-user"></i><span>مدیر: ${g.admin}</span></div>
        </div>
        <div class="text-sm font-bold text-purple-300"><i class="fas fa-trophy"></i> ${faNum(g.score)}</div>`;
      card.addEventListener('click', () => showGroupDetail(g));
      list.appendChild(card);
    });
  }

  renderGroupBattleCard(list, userGroup);
}


function getGroupBattleLimitInfo() {
  const baseLimit = Number(RemoteConfig?.gameLimits?.groupBattles?.daily) || 0;
  const multiplier = Server.subscription?.active
    ? (Server.subscription.tier === 'pro' ? 3 : 2)
    : 1;
  const limit = Math.max(0, Math.round(baseLimit * multiplier));
  const used = Math.max(0, Number(Server.limits?.groupBattles?.used) || 0);
  const remaining = Math.max(0, limit - used);
  const reached = limit > 0 ? used >= limit : false;
  return { limit, used, remaining, reached, multiplier };
}

const GROUP_BATTLE_REWARD_CONFIG = {
  winner: { coins: 70, score: 220 },
  loser: { coins: 30, score: 90 },
  groupScore: 420
};

function getBattleParticipants(hostGroup, opponentGroup) {
  ensureGroupRosters();

  const clonePlayers = (group) => (
    Array.isArray(group?.roster)
      ? group.roster.slice(0, 10).map(player => ({ ...player }))
      : []
  );

  let hostPlayers = clonePlayers(hostGroup);
  let opponentPlayers = clonePlayers(opponentGroup);

  const userName = State.user?.name?.trim();

  const injectUser = (players, group) => {
    if (!userName || !group) return players;
    const belongsToGroup = group.memberList?.includes(userName) || group.name === State.user.group;
    if (!belongsToGroup) return players;
    if (players.some(player => player?.name === userName)) return players;
    const seed = stringToSeed(`${group.id || group.name}-${userName}`);
    const userEntry = buildRosterEntry(userName, 0, seed);
    userEntry.role = 'کاپیتان تیم';
    userEntry.power = Math.min(99, (userEntry.power || 0) + 6);
    userEntry.avgScore = Math.min(990, (userEntry.avgScore || 0) + 45);
    userEntry.accuracy = Math.min(99, (userEntry.accuracy || 0) + 4);
    players = [userEntry, ...players];
    return players.slice(0, 10);
  };

  hostPlayers = injectUser(hostPlayers, hostGroup);
  opponentPlayers = injectUser(opponentPlayers, opponentGroup);

  return {
    hostPlayers,
    opponentPlayers
  };
}

function createBattlePlaceholder({ icon = 'fa-people-group', title = '', description = '', action = '' } = {}) {
  return `
    <div class="glass rounded-2xl p-6 text-center space-y-3 bg-white/5">
      <div class="text-3xl opacity-90"><i class="fas ${icon}"></i></div>
      <div class="text-lg font-bold">${title}</div>
      ${description ? `<p class="text-sm leading-7 opacity-80">${description}</p>` : ''}
      ${action ? `<div>${action}</div>` : ''}
    </div>`;
}

function calculateBattlePerformance(hostPlayer, opponentPlayer, index, baseSeed) {
  const scoreFrom = (player, seedOffset, boostRange = [0.92, 1.12]) => {
    if (!player) return 0;
    const avgScore = Number(player.avgScore) || 0;
    const power = Number(player.power) || 0;
    const accuracy = Number(player.accuracy) || 0;
    const speed = Number(player.speed) || 0;
    const control = 1 + Math.max(0, (95 - speed * 10)) / 520;
    const baseline = (avgScore * 0.58) + (power * 7.1) + (accuracy * 5.6) + (control * 120);
    const randomFactor = seededFloat(baseSeed + seedOffset, boostRange[0], boostRange[1]);
    return Math.round(Math.max(0, baseline * randomFactor));
  };

  if (!hostPlayer && !opponentPlayer) {
    return { hostScore: 0, opponentScore: 0, winner: 'none' };
  }

  if (hostPlayer && !opponentPlayer) {
    const soloScore = scoreFrom(hostPlayer, index * 11, [1.05, 1.18]);
    return { hostScore: soloScore, opponentScore: 0, winner: 'host' };
  }

  if (!hostPlayer && opponentPlayer) {
    const soloScore = scoreFrom(opponentPlayer, index * 13, [1.05, 1.18]);
    return { hostScore: 0, opponentScore: soloScore, winner: 'opponent' };
  }

  const hostScore = scoreFrom(hostPlayer, index * 17);
  const opponentScore = scoreFrom(opponentPlayer, index * 23);
  const diff = hostScore - opponentScore;
  if (Math.abs(diff) <= 5) {
    return { hostScore, opponentScore, winner: diff >= 0 ? 'host' : 'opponent' };
  }
  return { hostScore, opponentScore, winner: diff > 0 ? 'host' : 'opponent' };
}

function simulateGroupBattle(hostGroup, opponentGroup) {
  if (!hostGroup || !opponentGroup) return null;

  const { hostPlayers, opponentPlayers } = getBattleParticipants(hostGroup, opponentGroup);
  const duelCount = 10;
  const baseSeed = Date.now();
  const rounds = [];
  let hostTotal = 0;
  let opponentTotal = 0;

  for (let i = 0; i < duelCount; i++) {
    const hostPlayer = hostPlayers[i] || null;
    const opponentPlayer = opponentPlayers[i] || null;
    const performance = calculateBattlePerformance(hostPlayer, opponentPlayer, i, baseSeed);
    hostTotal += performance.hostScore;
    opponentTotal += performance.opponentScore;
    rounds.push({
      index: i + 1,
      hostPlayer,
      opponentPlayer,
      hostScore: performance.hostScore,
      opponentScore: performance.opponentScore,
      winner: performance.winner
    });
  }

  const normalizedHostTotal = Math.round(hostTotal);
  const normalizedOpponentTotal = Math.round(opponentTotal);
  let winnerGroupId;

  if (normalizedHostTotal === normalizedOpponentTotal) {
    const hostMax = Math.max(...rounds.map(r => r.hostScore || 0));
    const opponentMax = Math.max(...rounds.map(r => r.opponentScore || 0));
    winnerGroupId = hostMax >= opponentMax ? hostGroup.id : opponentGroup.id;
  } else {
    winnerGroupId = normalizedHostTotal > normalizedOpponentTotal ? hostGroup.id : opponentGroup.id;
  }

  return {
    id: `gb-${baseSeed}`,
    playedAt: new Date().toISOString(),
    host: { id: hostGroup.id, name: hostGroup.name, total: normalizedHostTotal, players: hostPlayers.map(p => p ? { ...p } : null) },
    opponent: { id: opponentGroup.id, name: opponentGroup.name, total: normalizedOpponentTotal, players: opponentPlayers.map(p => p ? { ...p } : null) },
    rounds,
    winnerGroupId,
    diff: normalizedHostTotal - normalizedOpponentTotal
  };
}

function applyGroupBattleRewards(result) {
  if (!result) return null;

  const hostGroup = State.groups.find(g => g.id === result.host?.id);
  const opponentGroup = State.groups.find(g => g.id === result.opponent?.id);
  const winnerGroup = result.winnerGroupId === hostGroup?.id ? hostGroup : opponentGroup;
  const loserGroup = winnerGroup === hostGroup ? opponentGroup : hostGroup;

  if (winnerGroup) {
    const currentScore = Number(winnerGroup.score) || 0;
    winnerGroup.score = Math.max(0, Math.round(currentScore + GROUP_BATTLE_REWARD_CONFIG.groupScore));
  }

  const ensureMatchLog = (group) => {
    if (!group) return;
    if (!Array.isArray(group.matches)) group.matches = [];
  };

  ensureMatchLog(hostGroup);
  ensureMatchLog(opponentGroup);

  const hostRecord = {
    opponentId: opponentGroup?.id || '',
    opponent: opponentGroup?.name || '',
    result: result.winnerGroupId === hostGroup?.id ? 'win' : 'loss',
    score: { self: result.host?.total || 0, opponent: result.opponent?.total || 0 },
    playedAt: result.playedAt
  };

  const opponentRecord = {
    opponentId: hostGroup?.id || '',
    opponent: hostGroup?.name || '',
    result: result.winnerGroupId === opponentGroup?.id ? 'win' : 'loss',
    score: { self: result.opponent?.total || 0, opponent: result.host?.total || 0 },
    playedAt: result.playedAt
  };

  if (hostGroup) {
    hostGroup.matches.unshift(hostRecord);
    hostGroup.matches = hostGroup.matches.slice(0, 10);
  }

  if (opponentGroup) {
    opponentGroup.matches.unshift(opponentRecord);
    opponentGroup.matches = opponentGroup.matches.slice(0, 10);
  }

  const userGroup = getUserGroup();
  const userGroupId = userGroup?.id;
  const userSide = userGroupId === hostGroup?.id ? 'host' : (userGroupId === opponentGroup?.id ? 'opponent' : null);
  let userReward = { coins: 0, score: 0, applied: false, type: 'none' };

  if (userSide) {
    const isWinner = result.winnerGroupId === (userSide === 'host' ? hostGroup?.id : opponentGroup?.id);
    const reward = isWinner ? GROUP_BATTLE_REWARD_CONFIG.winner : GROUP_BATTLE_REWARD_CONFIG.loser;
    State.coins += reward.coins;
    State.score += reward.score;
    userReward = { coins: reward.coins, score: reward.score, applied: true, type: isWinner ? 'winner' : 'loser' };
  }

  const summary = {
    winnerGroupId: result.winnerGroupId,
    winnerName: winnerGroup?.name || '',
    loserName: loserGroup?.name || '',
    config: GROUP_BATTLE_REWARD_CONFIG,
    userReward
  };

  result.rewards = summary;
  return summary;
}

function formatBattleTimestamp(value) {
  if (!value) return '';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

function buildBattlePlayerMarkup(player, { side = 'host', roundIndex = 1, score = null, opponentScore = null, winner = null, preview = false } = {}) {
  const diffBadge = (!preview && Number.isFinite(score) && Number.isFinite(opponentScore))
    ? `<span class="text-xs font-bold ${score >= opponentScore ? 'text-green-200' : 'text-rose-200'}">${score >= opponentScore ? '+' : ''}${faNum(score - opponentScore)}</span>`
    : '';

  if (!player) {
    return `
      <div class="battle-player battle-player-empty">
        <div class="battle-player-header">
          <div class="battle-player-info">
            <div class="battle-player-avatar placeholder"><i class="fas fa-user"></i></div>
            <div>
              <div class="battle-player-name opacity-70">جایگاه خالی</div>
              <div class="battle-player-role">بازیکن رزرو</div>
            </div>
          </div>
          <div class="battle-player-score">
            <span>امتیاز</span>
            <span>—</span>
          </div>
        </div>
        <div class="battle-player-meta">
          <span><i class="fas fa-bolt"></i>—</span>
          <span><i class="fas fa-crosshairs"></i>—</span>
          <span><i class="fas fa-star"></i>—</span>
          <span><i class="fas fa-stopwatch"></i>—</span>
        </div>
        <div class="flex items-center justify-between text-xs opacity-80">
          <span class="chip px-3 py-1 bg-white/10 border-white/20 text-[0.7rem]">نفر ${faNum(roundIndex)}</span>
          ${diffBadge}
        </div>
      </div>`;
  }

  const classes = ['battle-player'];
  if (!preview && winner && winner !== 'none') {
    const isWinner = (winner === 'host' && side === 'host') || (winner === 'opponent' && side === 'opponent');
    classes.push(isWinner ? 'battle-player-winner' : 'battle-player-loser');
  }

  const avatar = player.avatar
    ? `<img src="${player.avatar}" alt="${player.name}" class="battle-player-avatar">`
    : `<div class="battle-player-avatar placeholder"><i class="fas fa-user"></i></div>`;

  const scoreLabel = preview ? 'قدرت ترکیبی' : 'امتیاز نبرد';
  const projectedScore = Number.isFinite(score)
    ? faNum(score)
    : preview
      ? faNum(Math.round((Number(player.avgScore) || 0) * 0.65 + (Number(player.power) || 0) * 5))
      : '—';

  return `
    <div class="${classes.join(' ')}">
      <div class="battle-player-header">
        <div class="battle-player-info">
          ${avatar}
          <div>
            <div class="battle-player-name">${player.name}</div>
            <div class="battle-player-role"><i class="fas fa-graduation-cap"></i>${player.role || 'بازیکن گروه'}</div>
          </div>
        </div>
        <div class="battle-player-score">
          <span>${scoreLabel}</span>
          <span>${projectedScore}</span>
        </div>
      </div>
      <div class="battle-player-meta">
        <span><i class="fas fa-star"></i>${faNum(player.avgScore || 0)}</span>
        <span><i class="fas fa-bolt"></i>${faNum(player.power || 0)}</span>
        <span><i class="fas fa-crosshairs"></i>${faNum(player.accuracy || 0)}%</span>
        <span><i class="fas fa-stopwatch"></i>${faNum(player.speed || 0)}</span>
      </div>
      <div class="flex items-center justify-between text-xs opacity-80">
        <span class="chip px-3 py-1 bg-white/10 border-white/20 text-[0.7rem]">نفر ${faNum(roundIndex)}</span>
        ${diffBadge}
      </div>
    </div>`;
}

function populateGroupBattleResults(card, result, { preview = false } = {}) {
  if (!card || !result) return;
  const hostRosterEl = card.querySelector('[data-host-roster]');
  const opponentRosterEl = card.querySelector('[data-opponent-roster]');
  const hostNameEl = card.querySelector('[data-host-name]');
  const opponentNameEl = card.querySelector('[data-opponent-name]');
  const hostTotalEl = card.querySelector('[data-host-total]');
  const opponentTotalEl = card.querySelector('[data-opponent-total]');
  const statusEl = card.querySelector('[data-vs-status]');
  const subtitleEl = card.querySelector('[data-vs-subtitle]');

  const hostPlayers = Array.isArray(result.host?.players) ? result.host.players : [];
  const opponentPlayers = Array.isArray(result.opponent?.players) ? result.opponent.players : [];

  const rounds = Array.isArray(result.rounds) && result.rounds.length
    ? result.rounds
    : Array.from({ length: 10 }, (_, idx) => ({
        index: idx + 1,
        hostPlayer: hostPlayers[idx] || null,
        opponentPlayer: opponentPlayers[idx] || null,
        hostScore: null,
        opponentScore: null,
        winner: null
      }));

  if (hostRosterEl) hostRosterEl.innerHTML = '';
  if (opponentRosterEl) opponentRosterEl.innerHTML = '';

  rounds.slice(0, 10).forEach(round => {
    hostRosterEl?.insertAdjacentHTML('beforeend', buildBattlePlayerMarkup(round.hostPlayer, {
      side: 'host',
      roundIndex: round.index,
      score: round.hostScore,
      opponentScore: round.opponentScore,
      winner: round.winner,
      preview
    }));

    opponentRosterEl?.insertAdjacentHTML('beforeend', buildBattlePlayerMarkup(round.opponentPlayer, {
      side: 'opponent',
      roundIndex: round.index,
      score: round.opponentScore,
      opponentScore: round.hostScore,
      winner: round.winner,
      preview
    }));
  });

  if (hostNameEl) hostNameEl.textContent = result.host?.name || 'گروه اول';
  if (opponentNameEl) opponentNameEl.textContent = result.opponent?.name || 'گروه دوم';

  if (hostTotalEl) hostTotalEl.textContent = preview ? '—' : faNum(result.host?.total || 0);
  if (opponentTotalEl) opponentTotalEl.textContent = preview ? '—' : faNum(result.opponent?.total || 0);

  if (statusEl) {
    if (preview) {
      statusEl.textContent = '۱۰ به ۱۰ - آماده نبرد';
    } else {
      const winnerName = result.winnerGroupId === result.host?.id ? result.host?.name : result.opponent?.name;
      statusEl.textContent = winnerName ? `پیروزی ${winnerName}` : 'نتیجه ثبت شد';
    }
  }

  if (subtitleEl) {
    if (preview) {
      subtitleEl.textContent = 'نفرات هر ردیف دقیقاً با رقیب هم‌ردیف خود مسابقه می‌دهند.';
    } else {
      const diff = Math.abs((result.host?.total || 0) - (result.opponent?.total || 0));
      subtitleEl.textContent = `اختلاف امتیاز: ${faNum(diff)}`;
    }
  }
}

function renderGroupBattleCard(list, userGroup) {
  if (!list) return;

  const groups = Array.isArray(State.groups) ? [...State.groups] : [];
  if (groups.length === 0) return;

  const card = document.createElement('section');
  card.className = 'group-battle-card';
  list.appendChild(card);

  if (groups.length < 2) {
    card.innerHTML = createBattlePlaceholder({
      icon: 'fa-people-group',
      title: 'برای شروع نبرد گروه بیشتری نیاز است',
      description: 'حداقل دو گروه فعال لازم است تا نبرد گروهی برگزار شود. دوستانتان را دعوت کنید تا تیم تازه‌ای بسازند!'
    });
    return;
  }

  card.innerHTML = `
    <div class="group-battle-header">
      <div class="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div class="space-y-3 text-center xl:text-right">
          <div class="flex items-center justify-center xl:justify-end gap-2 text-2xl font-extrabold">
            <i class="fas fa-swords text-indigo-200"></i>
            <span>نبرد گروهی</span>
          </div>
          <p class="text-sm opacity-85 leading-7">
            ده قهرمان برتر هر گروه در ده راند متوالی با رقیب هم‌ردیف خود رقابت می‌کنند؛ مجموع امتیاز تیم، برنده نهایی را مشخص می‌کند.
          </p>
        </div>
        <div class="flex flex-col items-center xl:items-end gap-2 w-full xl:w-auto">
          <div class="group-battle-limit" data-battle-limit></div>
          <button type="button" data-start-battle class="btn btn-group w-full xl:w-auto px-6 py-3">
            <i class="fas fa-swords ml-2"></i>
            شروع نبرد گروهی
          </button>
          <div class="text-xs opacity-80 text-center xl:text-right leading-6" data-limit-hint></div>
        </div>
      </div>
    </div>
    <div class="group-battle-select">
      <div class="group-battle-select-card">
        <label><i class="fas fa-shield-halved text-indigo-200"></i><span>گروه میزبان</span></label>
        <select class="form-input w-full" data-group-host></select>
        <div class="text-xs opacity-75 leading-6" data-host-meta></div>
      </div>
      <div class="group-battle-select-card">
        <label><i class="fas fa-dragon text-rose-200"></i><span>گروه مهمان</span></label>
        <select class="form-input w-full" data-group-opponent></select>
        <div class="text-xs opacity-75 leading-6" data-opponent-meta></div>
      </div>
    </div>
    <div class="space-y-4" data-battle-wrapper>
      <div data-battle-placeholder class="hidden"></div>
      <div class="grid gap-4 xl:grid-cols-[1fr_auto_1fr] items-start" data-roster-wrapper>
        <div class="glass rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-bold text-indigo-200 flex items-center gap-2"><i class="fas fa-shield-halved"></i><span data-host-name>گروه میزبان</span></div>
          </div>
          <div class="space-y-3" data-host-roster></div>
        </div>
        <div class="flex flex-col items-center gap-3 text-center">
          <span class="chip px-4 py-1.5 text-xs" data-vs-status>۱۰ به ۱۰ - آماده نبرد</span>
          <div class="flex items-center gap-3 text-2xl font-black">
            <span data-host-total>—</span>
            <span class="text-sm font-normal opacity-60">در مقابل</span>
            <span data-opponent-total>—</span>
          </div>
          <div class="text-xs opacity-80" data-vs-subtitle>نفرات هر ردیف دقیقاً با رقیب هم‌ردیف خود مسابقه می‌دهند.</div>
        </div>
        <div class="glass rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-bold text-rose-200 flex items-center gap-2"><i class="fas fa-dragon"></i><span data-opponent-name>گروه مهمان</span></div>
          </div>
          <div class="space-y-3" data-opponent-roster></div>
        </div>
      </div>
      <div class="glass rounded-2xl p-4 space-y-3 hidden" data-last-result>
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2 text-sm font-bold"><i class="fas fa-history text-indigo-200"></i><span>آخرین نبرد ثبت‌شده</span></div>
          <div class="text-xs opacity-70" data-last-time></div>
        </div>
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm font-semibold">
          <div class="flex items-center gap-2" data-last-host></div>
          <div class="text-center text-lg font-black" data-last-score></div>
          <div class="flex items-center gap-2" data-last-opponent></div>
        </div>
        <div class="text-xs opacity-80 leading-6" data-last-summary></div>
      </div>
    </div>
  `;

  const hostSelect = card.querySelector('[data-group-host]');
  const opponentSelect = card.querySelector('[data-group-opponent]');
  const startBtn = card.querySelector('[data-start-battle]');
  const limitBadge = card.querySelector('[data-battle-limit]');
  const limitHint = card.querySelector('[data-limit-hint]');
  const hostMeta = card.querySelector('[data-host-meta]');
  const opponentMeta = card.querySelector('[data-opponent-meta]');
  const placeholderEl = card.querySelector('[data-battle-placeholder]');
  const rosterWrapper = card.querySelector('[data-roster-wrapper]');
  const lastResultWrap = card.querySelector('[data-last-result]');

  const setOptions = () => {
    const options = groups.map(group => `<option value="${group.id}">${group.name}</option>`).join('');
    hostSelect.innerHTML = options;
    opponentSelect.innerHTML = options;

    const storedHost = State.groupBattle?.selectedHostId;
    const storedOpponent = State.groupBattle?.selectedOpponentId;

    let hostValue = storedHost && groups.some(g => g.id === storedHost)
      ? storedHost
      : (userGroup && groups.some(g => g.id === userGroup.id) ? userGroup.id : groups[0].id);
    hostSelect.value = hostValue;

    let opponentValue = storedOpponent && storedOpponent !== hostValue && groups.some(g => g.id === storedOpponent)
      ? storedOpponent
      : (groups.find(g => g.id !== hostValue)?.id || hostValue);
    opponentSelect.value = opponentValue;
  };

  const updateGroupMeta = (group, el) => {
    if (!el) return;
    if (!group) {
      el.innerHTML = '<span class="opacity-70">گروهی انتخاب نشده است</span>';
      return;
    }
    const members = faNum(group.members || group.memberList?.length || 0);
    const score = faNum(group.score || 0);
    el.innerHTML = `
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2"><i class="fas fa-user-tie text-indigo-200"></i><span>مدیر: ${group.admin || '—'}</span></div>
        <div class="flex items-center gap-2"><i class="fas fa-users text-indigo-200"></i><span>اعضا: ${members}</span></div>
        <div class="flex items-center gap-2"><i class="fas fa-trophy text-yellow-300"></i><span>امتیاز: ${score}</span></div>
      </div>`;
  };

  const updateLimitBadge = () => {
    const info = getGroupBattleLimitInfo();
    if (limitBadge) {
      if (info.limit === 0) {
        limitBadge.innerHTML = '<i class="fas fa-infinity"></i><span>نامحدود</span>';
      } else {
        limitBadge.innerHTML = `<i class="fas fa-gauge-high"></i><span>${faNum(info.used)}</span>/<span>${faNum(info.limit)}</span>`;
      }
    }

    if (limitHint) {
      if (!userGroup) {
        limitHint.textContent = 'برای شروع نبرد باید ابتدا عضو یک گروه شوید.';
      } else if (info.reached) {
        limitHint.textContent = 'به سقف نبردهای امروز رسیدید؛ فردا دوباره تلاش کنید یا با خرید VIP محدودیت را افزایش دهید.';
      } else {
        limitHint.innerHTML = `پاداش پیروزی: <span class="text-green-200 font-bold">${faNum(GROUP_BATTLE_REWARD_CONFIG.winner.coins)}💰</span> و <span class="text-green-200 font-bold">${faNum(GROUP_BATTLE_REWARD_CONFIG.winner.score)}</span> امتیاز برای هر بازیکن.`;
      }
    }

    return info;
  };

  const refreshLastResult = () => {
    if (!lastResultWrap) return;
    const last = State.groupBattle?.lastResult;
    if (!last) {
      lastResultWrap.classList.add('hidden');
      return;
    }

    lastResultWrap.classList.remove('hidden');
    const lastTimeEl = card.querySelector('[data-last-time]');
    const lastHostEl = card.querySelector('[data-last-host]');
    const lastOpponentEl = card.querySelector('[data-last-opponent]');
    const lastScoreEl = card.querySelector('[data-last-score]');
    const lastSummaryEl = card.querySelector('[data-last-summary]');

    if (lastTimeEl) lastTimeEl.textContent = formatBattleTimestamp(last.playedAt) || 'لحظاتی پیش';
    if (lastHostEl) lastHostEl.innerHTML = `<i class="fas fa-shield-halved text-indigo-200"></i><span>${last.host?.name || '---'}</span>`;
    if (lastOpponentEl) lastOpponentEl.innerHTML = `<i class="fas fa-dragon text-rose-200"></i><span>${last.opponent?.name || '---'}</span>`;
    if (lastScoreEl) lastScoreEl.innerHTML = `${faNum(last.host?.total || 0)} <span class="text-xs opacity-70">در مقابل</span> ${faNum(last.opponent?.total || 0)}`;
    if (lastSummaryEl) {
      const winnerName = last.rewards?.winnerName || (last.winnerGroupId === last.host?.id ? last.host?.name : last.opponent?.name) || '';
      const diff = Math.abs((last.host?.total || 0) - (last.opponent?.total || 0));
      lastSummaryEl.innerHTML = `پیروز نبرد: <span class="text-green-300 font-bold">${winnerName}</span> • اختلاف امتیاز ${faNum(diff)} • پاداش تیم برنده: ${faNum(GROUP_BATTLE_REWARD_CONFIG.winner.coins)}💰 و ${faNum(GROUP_BATTLE_REWARD_CONFIG.winner.score)} امتیاز.`;
    }
  };

  const updateBattleView = ({ saveSelection = false } = {}) => {
    const hostId = hostSelect.value;
    const opponentId = opponentSelect.value;
    const hostGroup = groups.find(g => g.id === hostId);
    const opponentGroup = groups.find(g => g.id === opponentId);

    if (saveSelection) {
      State.groupBattle = State.groupBattle || { selectedHostId: '', selectedOpponentId: '', lastResult: null };
      State.groupBattle.selectedHostId = hostGroup?.id || '';
      State.groupBattle.selectedOpponentId = opponentGroup?.id || '';
      saveState();
    }

    updateGroupMeta(hostGroup, hostMeta);
    updateGroupMeta(opponentGroup, opponentMeta);

    const info = updateLimitBadge();

    const invalid = !hostGroup || !opponentGroup || hostGroup.id === opponentGroup.id;
    const canStart = !invalid && !!userGroup && userGroup.id === hostGroup.id && !info.reached;

    if (startBtn) {
      startBtn.disabled = !canStart;
      startBtn.classList.toggle('opacity-60', startBtn.disabled);
      startBtn.setAttribute('aria-disabled', startBtn.disabled ? 'true' : 'false');
    }

    if (invalid) {
      rosterWrapper?.classList.add('hidden');
      if (placeholderEl) {
        placeholderEl.classList.remove('hidden');
        placeholderEl.innerHTML = createBattlePlaceholder({
          icon: 'fa-people-arrows',
          title: 'گروه‌ها را متفاوت انتخاب کنید',
          description: 'برای شروع نبرد، گروه میزبان و مهمان باید متفاوت باشند.'
        });
      }
      populateGroupBattleResults(card, {
        host: { id: hostGroup?.id, name: hostGroup?.name, total: 0, players: [] },
        opponent: { id: opponentGroup?.id, name: opponentGroup?.name, total: 0, players: [] },
        rounds: [],
        winnerGroupId: null
      }, { preview: true });
      return;
    }

    if (placeholderEl) placeholderEl.classList.add('hidden');
    rosterWrapper?.classList.remove('hidden');

    const participants = getBattleParticipants(hostGroup, opponentGroup);
    const last = State.groupBattle?.lastResult;
    const matchesLast = last && last.host?.id === hostGroup.id && last.opponent?.id === opponentGroup.id;

    const context = matchesLast
      ? last
      : {
          host: { id: hostGroup.id, name: hostGroup.name, total: 0, players: participants.hostPlayers },
          opponent: { id: opponentGroup.id, name: opponentGroup.name, total: 0, players: participants.opponentPlayers },
          rounds: [],
          winnerGroupId: null
        };

    populateGroupBattleResults(card, context, { preview: !matchesLast });

    if (limitHint && userGroup && userGroup.id !== hostGroup.id) {
      limitHint.textContent = 'فقط مدیر یا اعضای گروه میزبان می‌توانند نبرد را آغاز کنند.';
    }
  };

  setOptions();
  updateBattleView({ saveSelection: true });
  refreshLastResult();

  hostSelect.addEventListener('change', () => {
    if (hostSelect.value === opponentSelect.value) {
      const alternative = groups.find(g => g.id !== hostSelect.value);
      if (alternative) opponentSelect.value = alternative.id;
    }
    updateBattleView({ saveSelection: true });
  });

  opponentSelect.addEventListener('change', () => {
    if (hostSelect.value === opponentSelect.value) {
      const alternative = groups.find(g => g.id !== opponentSelect.value);
      if (alternative) hostSelect.value = alternative.id;
    }
    updateBattleView({ saveSelection: true });
  });

  startBtn.addEventListener('click', async () => {
    const limitInfo = getGroupBattleLimitInfo();
    const hostGroup = groups.find(g => g.id === hostSelect.value);
    const opponentGroup = groups.find(g => g.id === opponentSelect.value);

    if (limitInfo.reached) {
      toast('به محدودیت نبرد گروهی امروز رسیدی!');
      return;
    }
    if (!userGroup) {
      toast('برای شروع نبرد ابتدا باید عضو یکی از گروه‌ها شوی.');
      return;
    }
    if (!hostGroup || !opponentGroup || hostGroup.id === opponentGroup.id) {
      toast('گروه میزبان و مهمان را صحیح انتخاب کن.');
      return;
    }
    if (userGroup.id !== hostGroup.id) {
      toast('تنها می‌توانی از طرف گروه خود نبرد را آغاز کنی.');
      return;
    }

    const originalLabel = startBtn.innerHTML;
    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="flex items-center gap-2 justify-center"><span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span><span>در حال شبیه‌سازی...</span></span>';

    await wait(800);

    const result = simulateGroupBattle(hostGroup, opponentGroup);
    const rewardSummary = applyGroupBattleRewards(result);

    State.groupBattle = State.groupBattle || { selectedHostId: '', selectedOpponentId: '', lastResult: null };
    State.groupBattle.lastResult = result;
    State.groupBattle.selectedHostId = hostGroup.id;
    State.groupBattle.selectedOpponentId = opponentGroup.id;

    Server.limits.groupBattles.used = Number(Server.limits.groupBattles.used || 0) + 1;
    Server.limits.groupBattles.lastRecovery = Date.now();

    saveState();

    startBtn.disabled = false;
    startBtn.innerHTML = originalLabel;

    renderTopBars();
    updateBattleView({ saveSelection: false });
    refreshLastResult();

    const diff = Math.abs(result.diff || 0);
    const winnerName = rewardSummary?.winnerName || (result.winnerGroupId === result.host.id ? result.host.name : result.opponent.name);
    const userReward = rewardSummary?.userReward?.applied
      ? ` • پاداش شما: ${faNum(rewardSummary.userReward.coins)}💰 و ${faNum(rewardSummary.userReward.score)} امتیاز`
      : '';
    toast(`<i class="fas fa-trophy ml-2"></i>${winnerName} با اختلاف ${faNum(diff)} امتیاز پیروز شد${userReward}`);

    logEvent('group_battle_simulated', {
      host: hostGroup.name,
      opponent: opponentGroup.name,
      winner: winnerName,
      diff,
      timestamp: result.playedAt
    });
  });
}




function deleteGroup(groupId) {
  const groupIndex = State.groups.findIndex(g => g.id === groupId);
  if (groupIndex === -1) return;
  
  const group = State.groups[groupIndex];
  
  // Remove group from state
  State.groups.splice(groupIndex, 1);
  
  // Clear user's group assignment
  State.user.group = '';
  
  saveState();
  renderGroupSelect();
  renderDashboard();
  
  toast('<i class="fas fa-check-circle ml-2"></i> گروه با موفقیت حذف شد');
  logEvent('group_deleted', { group: group.name });
}

function leaveGroup(groupId) {
  const group = State.groups.find(g => g.id === groupId);
  if (!group) return;
  
  // Remove user from member list
  group.memberList = group.memberList?.filter(m => m !== State.user.name) || [];
  group.members = Math.max(0, group.members - 1);
  
  // Clear user's group assignment
  State.user.group = '';
  
  saveState();
  renderGroupSelect();
  renderDashboard();
  
  toast('<i class="fas fa-check-circle ml-2"></i> از گروه خارج شدید');
  logEvent('group_left', { group: group.name });
}
  renderProvinceSelect();
  renderGroupSelect();
  $('#btn-create-group')?.addEventListener('click', openCreateGroup);
  $('#btn-view-group')?.addEventListener('click', () => {
    const myGroup = getUserGroup() || State.groups.find(g => g.name === State.user.group);
    if (myGroup) {
      showGroupDetail(myGroup);
    } else {
      renderGroupSelect();
      navTo('group');
    }
  });
  $('#btn-go-groups')?.addEventListener('click', () => {
    renderGroupSelect();
    navTo('group');
    logEvent('cta_group_browse');
  });
  $('#btn-create-group-cta')?.addEventListener('click', () => {
    renderGroupSelect();
    navTo('group');
    openCreateGroup();
    logEvent('cta_group_create');
  });

  const communityForm = $('#community-question-form');
  const communityOptionsEl = $('#community-options');
  const communityResetBtn = $('#community-reset');

  if (communityOptionsEl) {
    communityOptionsEl.addEventListener('change', (e) => {
      if (e.target.matches('input[type="radio"][name="community-correct"]')) {
        syncCommunityOptionStates();
      }
    });
    communityOptionsEl.addEventListener('click', (e) => {
      const row = e.target.closest('[data-community-option]');
      if (!row) return;
      if (e.target.matches('input[type="text"]')) return;
      const radio = row.querySelector('input[type="radio"]');
      if (radio && !radio.checked) {
        radio.checked = true;
        syncCommunityOptionStates();
      }
    });
    communityOptionsEl.addEventListener('input', (e) => {
      if (e.target.matches('[data-option-index]')) {
        const row = e.target.closest('[data-community-option]');
        if (row?.querySelector('input[type="radio"]').checked) {
          updateCommunityCorrectPreview();
        }
      }
    });
  }

  $('#community-author')?.addEventListener('focus', () => prefillCommunityAuthor());

  if (communityResetBtn) {
    communityResetBtn.addEventListener('click', () => {
      if (!communityForm) return;
      communityForm.reset();
      buildCommunityQuestionForm();
      prefillCommunityAuthor(true);
      syncCommunityOptionStates();
      toast('<i class="fas fa-broom ml-2"></i>فرم خالی شد');
    });
  }

  if (communityForm) {
    communityForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const authorInput = $('#community-author');
      const categorySelect = $('#community-category');
      const difficultySelect = $('#community-difficulty');
      const questionInput = $('#community-question');
      const authorName = authorInput ? authorInput.value.trim() : '';
      const categoryId = categorySelect ? categorySelect.value : '';
      const difficultyValue = difficultySelect ? difficultySelect.value : 'medium';
      const questionText = questionInput ? questionInput.value.trim() : '';
      const optionInputs = communityOptionsEl
        ? Array.from(communityOptionsEl.querySelectorAll('[data-option-index]'))
        : [];
      const options = optionInputs.map(input => input.value.trim());
      const radios = communityOptionsEl
        ? Array.from(communityOptionsEl.querySelectorAll('input[type="radio"][name="community-correct"]'))
        : [];
      const selectedRadio = radios.find(radio => radio.checked);
      const correctIdx = selectedRadio ? Number(selectedRadio.value) : -1;

      if (!authorName) {
        toast('<i class="fas fa-exclamation-circle ml-2"></i>لطفاً نام خود را وارد کنید');
        authorInput?.focus();
        return;
      }
      if (!categoryId) {
        toast('<i class="fas fa-exclamation-circle ml-2"></i>دسته‌بندی سوال را انتخاب کنید');
        categorySelect?.focus();
        return;
      }
      if (!questionText) {
        toast('<i class="fas fa-exclamation-circle ml-2"></i>متن سوال را بنویسید');
        questionInput?.focus();
        return;
      }
      if (options.length !== 4 || options.some(opt => !opt)) {
        toast('<i class="fas fa-exclamation-circle ml-2"></i>تمام گزینه‌ها باید تکمیل شوند');
        return;
      }
      if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx >= options.length) {
        toast('<i class="fas fa-exclamation-circle ml-2"></i>گزینه صحیح را مشخص کنید');
        return;
      }

      const payload = {
        authorName,
        text: questionText,
        options,
        correctIdx,
        categoryId,
        difficulty: difficultyValue,
        submittedBy: State?.user?.id || undefined
      };

      const submitBtn = communityForm.querySelector('button[type="submit"]');
      const submitDefault = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="flex items-center gap-2"><span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span><span>در حال ارسال...</span></span>';
      }

      try {
        const res = await fetch('/api/public/questions/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        let data = null;
        try { data = await res.json(); } catch { data = null; }
        if (!res.ok) {
          throw new Error(data?.message || 'خطا در ارسال سوال');
        }
        toast(`<i class="fas fa-check-circle ml-2"></i>${data?.message || 'سوال شما برای بررسی ارسال شد'}`);
        logEvent('community_question_submitted', {
          category: categoryId,
          difficulty: difficultyValue
        });
        communityForm.reset();
        buildCommunityQuestionForm();
        prefillCommunityAuthor(true);
        syncCommunityOptionStates();
      } catch (err) {
        toast(`<i class="fas fa-exclamation-circle ml-2"></i>${err.message || 'ارسال سوال با خطا مواجه شد'}`);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = submitDefault;
        }
      }
    });
  }

  // Back Buttons for New Pages
  $('#btn-back-duel')?.addEventListener('click', () => navTo('dashboard'));
  $('#btn-back-province')?.addEventListener('click', () => navTo('dashboard'));
  $('#btn-back-group')?.addEventListener('click', () => navTo('dashboard'));
  $('#btn-back-pass-missions')?.addEventListener('click', () => navTo('dashboard'));
  $('#btn-back-referral')?.addEventListener('click', () => navTo('dashboard'));
  $('#btn-back-support')?.addEventListener('click', () => navTo('dashboard'));
  
  // Wallet/VIP navigation
  $('#btn-open-wallet')?.addEventListener('click', ()=>navTo('wallet'));
  $('#btn-open-wallet-2')?.addEventListener('click', ()=>navTo('wallet'));
  $('#btn-open-vip')?.addEventListener('click', ()=>navTo('vip'));
  $('#go-wallet')?.addEventListener('click', ()=>navTo('wallet'));
  $('#go-vip')?.addEventListener('click', ()=>navTo('vip'));
  $('#btn-back-wallet')?.addEventListener('click', ()=>navTo('shop'));
  $('#btn-back-vip')?.addEventListener('click', ()=>navTo('shop'));
  
  // Leaderboard CTA
  $('#btn-view-leaderboard')?.addEventListener('click', ()=>{
    navTo('leaderboard');
  });
  
  // VIP purchase buttons
  $('#buy-vip-lite')?.addEventListener('click', ()=> startPurchaseVip('lite'));
  $('#buy-vip-pro')?.addEventListener('click', ()=> startPurchaseVip('pro'));
  
  // Detail Popup Events
  $('#detail-close')?.addEventListener('click', closeDetailPopup);
  $('#detail-overlay')?.addEventListener('click', closeDetailPopup);

  // Close modals (receipt)
  $$('[data-close="#modal-receipt"]').forEach(b=> b.addEventListener('click', ()=>closeModal('#modal-receipt')));
  $$('[data-close="#modal-pay-confirm"]').forEach(b=> b.addEventListener('click', ()=>closeModal('#modal-pay-confirm')));
  $$('[data-close="#modal-province-soon"]').forEach(b=> b.addEventListener('click', ()=>closeModal('#modal-province-soon')));
  $$('[data-close="#modal-invite"]').forEach(b=> b.addEventListener('click', ()=>closeModal('#modal-invite')));

  // Game Limits CTAs
  $('#btn-buy-vip-limit')?.addEventListener('click', () => {
    navTo('vip');
  });

  $('#btn-reset-match-limit')?.addEventListener('click', () => {
    if (State.lives <= 0) {
      toast('کلید کافی نیست');
      return;
    }
    if (Server.limits.matches.used === 0) {
      toast('نیازی به ریست نیست');
      return;
    }
    State.lives -= 1;
    renderTopBars();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const t = today.getTime();
    Server.limits.matches.used = 0;
    Server.limits.matches.lastReset = t;
    updateLimitsUI();
    checkLimitsReached();
    saveState();
    toast('<i class="fas fa-check-circle ml-2"></i>محدودیت کوییز روزانه ریست شد');
  });

  $('#btn-reset-duel-limit')?.addEventListener('click', () => {
    if (State.lives <= 0) {
      toast('کلید کافی نیست');
      return;
    }
    if (Server.limits.duels.used === 0) {
      toast('نیازی به ریست نیست');
      return;
    }
    State.lives -= 1;
    renderTopBars();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const t = today.getTime();
    Server.limits.duels.used = 0;
    Server.limits.duels.lastReset = t;
    updateLimitsUI();
    checkLimitsReached();
    saveState();
    toast('<i class="fas fa-check-circle ml-2"></i>محدودیت نبرد ریست شد');
  });

  $('#btn-reset-group-limit')?.addEventListener('click', () => {
    if (State.lives <= 0) {
      toast('کلید کافی نیست');
      return;
    }
    if (Server.limits.groupBattles.used === 0) {
      toast('نیازی به ریست نیست');
      return;
    }
    State.lives -= 1;
    renderTopBars();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const t = today.getTime();
    Server.limits.groupBattles.used = 0;
    Server.limits.groupBattles.lastReset = t;
    updateLimitsUI();
    checkLimitsReached();
    saveState();
    toast('<i class="fas fa-check-circle ml-2"></i>محدودیت نبرد گروهی ریست شد');
  });

  $('#btn-reset-limits')?.addEventListener('click', async () => {
    if (State.lives <= 0) {
      toast('کلید کافی نیست');
      return;
    }
    const btn = $('#btn-reset-limits');
    btn.disabled = true;
    try {
      const res = await fetch('/api/limits/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        State.lives -= 1;
        renderTopBars();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const t = today.getTime();
        Server.limits.matches.used = 0;
        Server.limits.duels.used = 0;
        Server.limits.lives.used = 0;
        Server.limits.groupBattles.used = 0;
        Server.limits.energy.used = 0;
        Server.limits.matches.lastReset = t;
        Server.limits.duels.lastReset = t;
        Server.limits.lives.lastReset = t;
        Server.limits.groupBattles.lastReset = t;
        Server.limits.energy.lastReset = t;
        updateLimitsUI();
        checkLimitsReached();
        saveState();
        toast('<i class="fas fa-check-circle ml-2"></i>محدودیت‌ها ریست شد');
      } else {
        toast(data?.message || 'خطا در ریست محدودیت');
      }
    } catch {
      toast('خطا در ارتباط با سرور');
    } finally {
      btn.disabled = false;
    }
  });
  
  // Province Ranking
  $('#btn-view-ranking')?.addEventListener('click', () => {
    navTo('leaderboard');
    document.querySelector('.leaderboard-tab[data-tab="province"]')?.click();
  });
  
  // Referral
  $('#btn-copy-referral')?.addEventListener('click', () => {
    navigator.clipboard.writeText(State.referral.code || '');
    toast('<i class="fas fa-check-circle ml-2"></i>کد دعوت کپی شد!');
  });

  $('#btn-share-referral')?.addEventListener('click', () => {
    const reward = Number(State.referral?.rewardPerFriend ?? 5);
    const code = State.referral?.code || '';
    const link = `https://t.me/your_bot?start=ref_${State.user.id}`;
    const rewardLabel = faNum(reward);
    const text = `با کد دعوت من در Quiz WebApp Pro ثبت‌نام کن؛ بعد از اولین کوییز هر دو ${rewardLabel} سکه هدیه می‌گیریم! کد: ${code}`;

    try {
      if (navigator.share) {
        navigator.share({
          title: 'دعوت به Quiz WebApp Pro',
          text: text,
          url: link
        });
      } else {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
      }
    } catch {
      navigator.clipboard.writeText(link);
      toast('<i class="fas fa-check-circle ml-2"></i>لینک کپی شد!');
    }
  });
  
  // Support & Advertisers Tabs
  $$('.support-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.support-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.tab-content').forEach(content => content.classList.add('hidden'));
      $(`#${tab.dataset.tab}-content`).classList.remove('hidden');
      
      if (tab.dataset.tab === 'support') {
        renderSupportTickets();
      }
    });
  });
  
  // Support Form
  $('#support-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = $('#support-name').value.trim();
    const mobile = $('#support-mobile').value.trim();
    const message = $('#support-message').value.trim();
    
    if (!name || !mobile || !message) {
      toast('<i class="fas fa-exclamation-circle ml-2"></i>لطفاً تمام فیلدها را پر کنید');
      return;
    }
    
    // Validate mobile number (simple validation)
    if (!/^09[0-9]{9}$/.test(mobile)) {
      toast('<i class="fas fa-exclamation-circle ml-2"></i>شماره موبایل نامعتبر است');
      return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i> در حال ارسال...';
    
    try {
      // Simulate API call
      await wait(1500);
      
      // In a real app, this would be:
      // const result = await Net.jpost('/api/support/tickets', { name, mobile, message });
      
      // Show success message
      toast('<i class="fas fa-check-circle ml-2"></i>تیکت شما با موفقیت ارسال شد');
      
      // Reset form
      e.target.reset();
      
      // Refresh tickets list
      renderSupportTickets();
      
      // Log analytics
      logEvent('support_ticket_created', { category: 'support' });
    } catch (error) {
      toast('<i class="fas fa-exclamation-circle ml-2"></i>خطا در ارسال تیکت. لطفاً دوباره تلاش کنید');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
  
  // Advertiser Form
  $('#advertiser-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const placement = $('#ad-placement').value;
    const budget = $('#ad-budget').value;
    const provinces = Array.from($('#ad-provinces').selectedOptions).map(option => option.value);
    const startDate = $('#ad-start').value;
    const endDate = $('#ad-end').value;
    const creative = $('#ad-creative').value.trim();
    const landing = $('#ad-landing').value.trim();
    
    if (!placement || !budget || !provinces.length || !startDate || !endDate || !creative || !landing) {
      toast('<i class="fas fa-exclamation-circle ml-2"></i>لطفاً تمام فیلدها را پر کنید');
      return;
    }
    
    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      toast('<i class="fas fa-exclamation-circle ml-2"></i>تاریخ پایان باید بعد از تاریخ شروع باشد');
      return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i> در حال ارسال...';
    
    try {
      // Simulate API call
      await wait(1500);

      // In a real app, this would be an API call
      const ad = { placement, budget: Number(budget), provinces, startDate, endDate, creative, landing };
      if(!State.ads[placement]) State.ads[placement] = [];
      State.ads[placement].push(ad);
      saveState();

      // Show success message
      toast('<i class="fas fa-check-circle ml-2"></i>درخواست تبلیغ شما با موفقیت ذخیره شد');

      // Reset form
      e.target.reset();

      // Refresh ads
      AdManager.refreshAll();

      // Log analytics
      logEvent('ad_request_submitted', { category: 'advertiser', placement, budget });
    } catch (error) {
      toast('<i class="fas fa-exclamation-circle ml-2"></i>خطا در ارسال درخواست. لطفاً دوباره تلاش کنید');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
  
  // Share Result
  $('#btn-share')?.addEventListener('click', shareResult);
  $('#btn-again')?.addEventListener('click', openSetupSheet);
  $('#btn-back-results')?.addEventListener('click', ()=>{
    State.duelOpponent = null;
    DuelSession = null;
    $('#duel-banner').classList.add('hidden');
    navTo('dashboard');
  });
  
  // Lifeline buttons
  $('#life-5050')?.addEventListener('click', life5050);
  $('#life-skip')?.addEventListener('click', lifeSkip);
  $('#life-pause')?.addEventListener('click', lifePause);
  
  // Active Match Actions
  $$('.match-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const matchName = e.currentTarget.closest('.active-match-item').querySelector('.match-name').textContent;
      toast(`در ${matchName} ثبت‌نام شدید!`);
    });
  });

  window.addEventListener('DOMContentLoaded', async ()=>{
    try { await initFromAdmin(); }
    catch(e){ console.warn('Admin bootstrap failed', e); toast('اتصال به سرور برقرار نشد؛ داده‌ی دمو غیرفعال شد.'); }
    finally { document.getElementById('loading')?.classList.add('hidden'); }
    await init();
  });

  // ===== Init =====
async function init(){
    try{
      applyExpiredDuelPenalties({ skipRender: true });
      renderHeader(); renderDashboard(); navTo('dashboard');

      if(!State.user.province){
        const sel = $('#first-province');
        if(sel && Array.isArray(State.provinces) && State.provinces.length){
          populateProvinceOptions(sel, 'استان خود را انتخاب کنید');

          if(sel.options.length <= 1){
            State.provinces.forEach(p => {
              const option = document.createElement('option');
              option.value = p.name;
              option.textContent = p.name;
              sel.appendChild(option);
            });
          }

          openModal('#modal-province-select');
        }
      }

      checkDailyReset();
      setInterval(checkDailyReset, 1000);

      await Promise.all([refreshWallet(), refreshSubscription()]);
      renderHeader(); renderDashboard();
      AdManager.refreshAll();

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && $('#modal-payment').classList.contains('show')) {
          closePaymentModal();
        }
      });

      logEvent('session_start', {
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        user_agent: navigator.userAgent
      });

      if(!localStorage.getItem(STORAGE_KEY)){ setTimeout(()=>toast('برای شروع روی «شروع کوییز» بزن ✨'), 800); }

      window.addEventListener('online', ()=>{ $('#wallet-offline')?.classList.add('hidden'); AdManager.refreshAll(); });
      window.addEventListener('offline', ()=>{ $('#wallet-offline')?.classList.remove('hidden'); });

      AdManager.maybeShowInterstitial('app_open');
    }catch(err){
      console.error('Initialization failed', err);
      toast('خطا در راه‌اندازی برنامه');
    }
  }

