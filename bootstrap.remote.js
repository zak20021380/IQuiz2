import { $, $$ } from '../utils/dom.js';
import { clamp, faNum, faDecimal, formatDuration, formatRelativeTime } from '../utils/format.js';
import { configureFeedback, vibrate, toast, wait, SFX, shootConfetti } from '../utils/feedback.js';
import { RemoteConfig } from '../config/remote-config.js';
import {
  getAdminSettings,
  subscribeToAdminSettings,
  DEFAULT_GROUP_BATTLE_REWARDS,
  DEFAULT_DUEL_REWARDS,
} from '../config/admin-settings.js';
import Net from '../services/net.js';
import Api from '../services/api.js';
import {
  State,
  STORAGE_KEY,
  DEFAULT_QUESTION_TIME,
  DEFAULT_MAX_QUESTIONS,
  ensureGroupRosters,
  isUserGroupAdmin,
  getUserGroup,
  isUserInGroup,
  stringToSeed,
  buildRosterEntry,
  seededFloat,
  spendKeys,
  DEFAULT_DUEL_FRIENDS
} from '../state/state.js';
import { Server } from '../state/server.js';
import {
  Admin,
  getAdminCategories,
  getActiveCategories,
  getFirstCategory,
  findCategoryById,
  getEffectiveDiffs,
  getCategoryDifficultyPool
} from '../state/admin.js';
import { loadState, saveState } from '../state/persistence.js';
import { setGuestId } from '../utils/guest.js';
import {
  initFromAdmin,
  buildSetupFromAdmin,
  applyConfigToUI
} from '../features/admin/setup.js';
import {
  configureQuizEngine,
  renderQuestionUI,
  updateLifelineStates,
  isValidQuestion,
} from '../features/quiz/engine.js';
import { normalizeDuelRewardsConfig, applyDuelOutcomeRewards } from '../features/duel/rewards.js';
import { startQuizFromAdmin } from '../features/quiz/loader.js';

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
  const ADMIN_DEFAULTS = getAdminSettings();
  let adminSettings = ADMIN_DEFAULTS;
  let generalSettings = adminSettings?.general || {};
  let rewardSettings = adminSettings?.rewards || {};
  const DIFFICULTY_TIME_MULTIPLIERS = { easy: 1, medium: 0.85, hard: 0.7 };
  const HERO_THEMES = ['sky', 'emerald', 'purple', 'amber'];
  const FALLBACK_APP_NAME = 'Quiz WebApp Pro';
  const APP_TITLE_SUFFIX = ' — نسخه فارسی';
  const PAYMENT_SESSION_STORAGE_KEY = 'quiz_payment_session_id_v1';
  const PENDING_PAYMENT_STORAGE_KEY = 'quiz_pending_payment_v1';
  const PURCHASE_NOTICE_STORAGE_KEY = 'quiz_purchase_success_notice_v1';
  const PURCHASE_NOTICE_TTL = 6 * 60 * 60 * 1000;
  const TELEGRAM_BOT_USERNAME = (document.body?.dataset?.telegramBot || 'IQuizBot').replace(/^@+/, '').trim() || 'IQuizBot';
  const TELEGRAM_BOT_WEB_LINK = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
  const TELEGRAM_BOT_APP_LINK = `tg://resolve?domain=${TELEGRAM_BOT_USERNAME}`;

  const WALLET_TOPUP_DEFAULTS = {
    min: 50_000,
    max: 2_000_000,
    step: 50_000,
    defaultAmount: 200_000,
  };

  const walletTopupState = {
    amount: WALLET_TOPUP_DEFAULTS.defaultAmount,
    plannedAmount: null,
  };

  let walletTopupRecommendation = null;

  const enNum = n => Number(n).toLocaleString('en-US');

  const FALLBACK_GROUP_BATTLE_REWARD_CONFIG = {
    winner: { coins: DEFAULT_GROUP_BATTLE_REWARDS.winner.coins, score: DEFAULT_GROUP_BATTLE_REWARDS.winner.score },
    loser: { coins: DEFAULT_GROUP_BATTLE_REWARDS.loser.coins, score: DEFAULT_GROUP_BATTLE_REWARDS.loser.score },
    groupScore: DEFAULT_GROUP_BATTLE_REWARDS.groupScore,
  };

  const FALLBACK_DUEL_REWARD_CONFIG = {
    winner: { coins: DEFAULT_DUEL_REWARDS.winner.coins, score: DEFAULT_DUEL_REWARDS.winner.score },
    loser: { coins: DEFAULT_DUEL_REWARDS.loser.coins, score: DEFAULT_DUEL_REWARDS.loser.score },
    draw: { coins: DEFAULT_DUEL_REWARDS.draw.coins, score: DEFAULT_DUEL_REWARDS.draw.score },
  };

  const sanitizeBattleRewardValue = (value, fallback) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(0, Math.round(num));
  };

  function normalizeGroupBattleRewardsConfig(source, fallback = FALLBACK_GROUP_BATTLE_REWARD_CONFIG) {
    const base = fallback || FALLBACK_GROUP_BATTLE_REWARD_CONFIG;
    const config = source && typeof source === 'object' ? source : {};
    const winnerSource = config.winner && typeof config.winner === 'object' ? config.winner : {};
    const loserSource = config.loser && typeof config.loser === 'object' ? config.loser : {};
    return {
      winner: {
        coins: sanitizeBattleRewardValue(winnerSource.coins, base.winner.coins),
        score: sanitizeBattleRewardValue(winnerSource.score, base.winner.score),
      },
      loser: {
        coins: sanitizeBattleRewardValue(loserSource.coins, base.loser.coins),
        score: sanitizeBattleRewardValue(loserSource.score, base.loser.score),
      },
      groupScore: sanitizeBattleRewardValue(config.groupScore, base.groupScore),
    };
  }

  function getGroupBattleRewardConfig() {
    const defaults = normalizeGroupBattleRewardsConfig(
      adminSettings?.rewards?.groupBattleRewards || ADMIN_DEFAULTS?.rewards?.groupBattleRewards || DEFAULT_GROUP_BATTLE_REWARDS
    );
    const current = rewardSettings?.groupBattleRewards || rewardSettings?.groupBattle;
    return normalizeGroupBattleRewardsConfig(current, defaults);
  }

  function getDuelRewardConfig() {
    const defaults = normalizeDuelRewardsConfig(
      adminSettings?.rewards?.duelRewards || ADMIN_DEFAULTS?.rewards?.duelRewards || DEFAULT_DUEL_REWARDS,
      FALLBACK_DUEL_REWARD_CONFIG,
    );
    const current = rewardSettings?.duelRewards || rewardSettings?.duel;
    return normalizeDuelRewardsConfig(current, defaults);
  }

  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  function generateClientId(prefix = 'pay_'){
    if (typeof crypto !== 'undefined' && crypto.randomUUID){
      return prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    }
    return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function buildTelegramStartLinks(payload = '') {
    const sanitized = typeof payload === 'string' ? payload.trim() : String(payload || '').trim();
    if (!sanitized) {
      return { web: TELEGRAM_BOT_WEB_LINK, app: TELEGRAM_BOT_APP_LINK };
    }
    const encoded = encodeURIComponent(sanitized);
    return {
      web: `${TELEGRAM_BOT_WEB_LINK}?start=${encoded}`,
      app: `${TELEGRAM_BOT_APP_LINK}&start=${encoded}`,
    };
  }

  function buildTelegramShareUrl(link, text = '') {
    const target = link || TELEGRAM_BOT_WEB_LINK;
    const message = text || '';
    return `https://t.me/share/url?url=${encodeURIComponent(target)}&text=${encodeURIComponent(message)}`;
  }

  function openTelegramLink(url) {
    if (!url) return false;
    try {
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(url);
        return true;
      }
    } catch (error) {
      console.warn('openTelegramLink failed', error);
    }
    const opened = window.open(url, '_blank', 'noopener');
    return !!opened;
  }

  async function shareOnTelegram(link, text) {
    const shareUrl = buildTelegramShareUrl(link, text);
    const opened = openTelegramLink(shareUrl);
    if (opened) {
      toast('<i class="fab fa-telegram-plane ml-2"></i>تلگرام برای اشتراک‌گذاری باز شد');
      return;
    }
    const fallbackText = text ? `${text}\n${link}` : link;
    const copied = await copyToClipboard(fallbackText);
    if (copied) {
      toast('<i class="fas fa-copy ml-2"></i>لینک برای اشتراک‌گذاری کپی شد');
    } else {
      prompt('این پیام را برای دوستانت بفرست:', fallbackText);
    }
  }

  function ensurePaymentSessionId(){
    try {
      const existing = localStorage.getItem(PAYMENT_SESSION_STORAGE_KEY);
      if (existing) return existing;
      const fresh = generateClientId('ps_');
      localStorage.setItem(PAYMENT_SESSION_STORAGE_KEY, fresh);
      return fresh;
    } catch (err) {
      return '';
    }
  }

  function storePendingPayment(payload){
    try {
      sessionStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {}
  }

  function readPendingPayment(){
    try {
      const raw = sessionStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function clearPendingPayment(){
    try { sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY); } catch (err) {}
  }

  function storePurchaseNotice(payload = {}){
    try {
      const normalized = { ...payload };
      normalized.timestamp = Number.isFinite(normalized.timestamp) ? Number(normalized.timestamp) : Date.now();
      sessionStorage.setItem(PURCHASE_NOTICE_STORAGE_KEY, JSON.stringify(normalized));
    } catch (err) {}
  }

  function getPurchaseNotice({ consume = false } = {}){
    try {
      const raw = sessionStorage.getItem(PURCHASE_NOTICE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        sessionStorage.removeItem(PURCHASE_NOTICE_STORAGE_KEY);
        return null;
      }
      const timestamp = Number(parsed.timestamp) || 0;
      if (timestamp && (Date.now() - timestamp) > PURCHASE_NOTICE_TTL) {
        sessionStorage.removeItem(PURCHASE_NOTICE_STORAGE_KEY);
        return null;
      }
      if (consume) {
        sessionStorage.removeItem(PURCHASE_NOTICE_STORAGE_KEY);
      }
      return parsed;
    } catch (err) {
      if (consume) {
        try { sessionStorage.removeItem(PURCHASE_NOTICE_STORAGE_KEY); } catch (_) {}
      }
      return null;
    }
  }

  function clearPurchaseNotice(){
    try { sessionStorage.removeItem(PURCHASE_NOTICE_STORAGE_KEY); } catch (err) {}
  }

  function getBaseQuestionDuration(){
    return Math.max(5, Number(generalSettings?.questionTime) || DEFAULT_QUESTION_TIME);
  }

  function getMaxQuestionLimit(){
    return Math.max(3, Number(generalSettings?.maxQuestions) || DEFAULT_MAX_QUESTIONS);
  }

  function getDurationForDifficulty(diffValue){
    const base = getBaseQuestionDuration();
    const key = (diffValue || '').toString().toLowerCase();
    let multiplier = DIFFICULTY_TIME_MULTIPLIERS.easy;
    if (key.includes('hard') || key.includes('سخت')) {
      multiplier = DIFFICULTY_TIME_MULTIPLIERS.hard;
    } else if (key.includes('medium') || key.includes('normal') || key.includes('متوسط')) {
      multiplier = DIFFICULTY_TIME_MULTIPLIERS.medium;
    }
    return Math.max(5, Math.round(base * multiplier));
  }

  function updateAdminSnapshot(next){
    if (!next || typeof next !== 'object') return;
    adminSettings = next;
    generalSettings = next.general || generalSettings;
    rewardSettings = next.rewards || rewardSettings;
  }

  function getCorrectAnswerBasePoints(){
    const raw = Number(rewardSettings?.pointsCorrect);
    if (!Number.isFinite(raw) || raw <= 0) return 100;
    return Math.max(10, Math.round(raw));
  }

  function getCorrectAnswerBaseCoins(){
    const raw = Number(rewardSettings?.coinsCorrect);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.max(0, Math.round(raw));
  }

  function normalizeQuestionId(raw){
    if (raw == null) return '';
    const str = String(raw).trim();
    return str.length ? str : '';
  }

  function getPendingAnswerQueue(){
    if (!Array.isArray(State.quiz?.pendingAnswerIds)) {
      State.quiz.pendingAnswerIds = [];
    }
    return State.quiz.pendingAnswerIds;
  }

  function trackQuestionConsumption(question){
    if (!question || typeof question !== 'object') return;
    const id = normalizeQuestionId(question.id || question.uid || question.publicId);
    if (!id) return;
    const queue = getPendingAnswerQueue();
    if (!queue.includes(id)) {
      queue.push(id);
    }
  }

  let flushAnswersInFlight = null;
  let flushAnswersScheduled = false;

  async function flushAnsweredQuestionQueue(){
    if (flushAnswersInFlight) {
      return flushAnswersInFlight;
    }
    const queue = getPendingAnswerQueue();
    if (!queue.length) return null;
    const normalized = Array.from(new Set(queue.map(normalizeQuestionId).filter(Boolean)));
    if (!normalized.length) {
      State.quiz.pendingAnswerIds = [];
      saveState();
      return null;
    }
    const payloadSet = new Set(normalized);
    const task = (async () => {
      try {
        const res = await Api.recordAnswers(normalized);
        if (res && res.ok !== false) {
          State.quiz.pendingAnswerIds = getPendingAnswerQueue()
            .map(normalizeQuestionId)
            .filter((id) => id && !payloadSet.has(id));
          saveState();
        }
      } catch (err) {
        console.warn('[quiz] Failed to sync answered questions', err);
      } finally {
        flushAnswersInFlight = null;
      }
    })();
    flushAnswersInFlight = task;
    return task;
  }

  function scheduleFlushAnsweredQuestions(){
    if (flushAnswersScheduled) return;
    flushAnswersScheduled = true;
    setTimeout(() => {
      flushAnswersScheduled = false;
      flushAnsweredQuestionQueue();
    }, 500);
  }

  function getAppName(){
    const raw = generalSettings?.appName;
    if (raw == null) return FALLBACK_APP_NAME;
    const str = String(raw).trim();
    return str.length ? str : FALLBACK_APP_NAME;
  }

  function updateAppNameDisplays(){
    const appName = getAppName();
    if (typeof document !== 'undefined'){ 
      document.title = `${appName}${APP_TITLE_SUFFIX}`;
      $$('[data-app-name]').forEach((el) => {
        if (el) el.textContent = appName;
      });
    }
    return appName;
  }

  function applyGeneralSettingsToUI(){
    updateAppNameDisplays();
    const baseDuration = getBaseQuestionDuration();
    const maxQuestions = getMaxQuestionLimit();
    if (typeof document !== 'undefined' && generalSettings?.language){
      document.documentElement.setAttribute('lang', generalSettings.language);
    }
    State.quiz.baseDuration = baseDuration;
    if (!State.quiz.inProgress){
      State.quiz.duration = baseDuration;
      State.quiz.remain = baseDuration;
      updateTimerVisual();
    }
    State.quiz.maxQuestions = maxQuestions;

    const range = document.getElementById('range-count');
    if (range){
      const min = Number(range.min) || 3;
      range.max = String(maxQuestions);
      const currentRaw = Number(range.value || range.getAttribute('value') || maxQuestions);
      const clampedValue = clamp(currentRaw, min, maxQuestions);
      range.value = String(clampedValue);
      range.setAttribute('value', String(clampedValue));
      range.disabled = maxQuestions <= min;
      const setupCountEl = document.getElementById('setup-count');
      if (setupCountEl) setupCountEl.textContent = faNum(clampedValue);
    }
  }
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





  
  const online = () => navigator.onLine;

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
  
  // ===== App State (legacy gameplay remains local) =====
  configureFeedback(() => State.settings);


  const TIMER_CIRC = 2 * Math.PI * 64;
  const DUEL_ROUNDS = 2;
  const DUEL_QUESTIONS_PER_ROUND = 10;
  const DUEL_TIMEOUT_MS = 24 * 60 * 60 * 1000;
  const DUEL_INVITE_TIMEOUT_MS = DUEL_TIMEOUT_MS;
  let DuelSession = null;
  let PendingDuelFriend = null;
  let quizTimerPausedForQuit = false;
  let quitModalKeyHandler = null;

  loadState();
  const pendingFlush = flushAnsweredQuestionQueue();
  if (pendingFlush && typeof pendingFlush.catch === 'function') {
    pendingFlush.catch(() => {});
  }
  applyGeneralSettingsToUI();
  applyShopSettingsToUI();
  document.documentElement.setAttribute('data-theme', State.theme || 'ocean');

  const qs = new URLSearchParams(location.search);
  const duelInviter = qs.get('duel_invite');
  if(duelInviter && !State.settings.blockDuels){
    toast(`${duelInviter} شما را به نبرد دعوت کرده است!`);
  }

  const paymentStatusParam = qs.get('payment_status');
  const paymentIdParam = qs.get('payment_id');
  if (paymentIdParam){
    handleGatewayReturn(paymentStatusParam, paymentIdParam, {
      refId: qs.get('ref_id'),
      message: qs.get('payment_message'),
      session: qs.get('payment_session')
    }).finally(() => {
      ['payment_status','payment_id','ref_id','payment_message','payment_session'].forEach(key => qs.delete(key));
      const newQuery = qs.toString();
      const newUrl = newQuery ? `${location.pathname}?${newQuery}` : location.pathname;
      history.replaceState({}, '', newUrl);
    });
  }

  // Telegram WebApp (optional)
  const initialTelegramUserSnapshot = { ...State.user };
  (async () => {
    if (!window.Telegram || !Telegram.WebApp) {
      return;
    }

    try {
      Telegram.WebApp.ready();
      const initDataUnsafe = Telegram.WebApp.initDataUnsafe || {};
      const rawInitData = Telegram.WebApp.initData || '';
      const u = initDataUnsafe.user;

      if (u) {
        State.user.id = String(u.id);
        State.user.name = [u.first_name, u.last_name].filter(Boolean).join(' ');
        if (!State.user.name && u.username) {
          State.user.name = `@${u.username}`;
        } else if (u.username) {
          State.user.name += ` (@${u.username})`;
        }
        if (u.photo_url) {
          State.user.avatar = u.photo_url;
        }
      }

      if (!rawInitData) {
        saveState();
        return;
      }

      const sessionPayload = {
        initData: rawInitData,
        hash: initDataUnsafe.hash || '',
        auth_date: initDataUnsafe.auth_date || initDataUnsafe.authDate || '',
        fallbackId: String(u?.id || State.user.id || ''),
        fallbackName: State.user.name || u?.username || '',
      };

      const sessionResponse = await Net.jpost('/api/public/telegram/session', sessionPayload);

      if (!sessionResponse || sessionResponse.error) {
        throw new Error(sessionResponse?.error || 'telegram_session_failed');
      }

      const resolvedUser = sessionResponse.user || sessionResponse.profile || null;
      if (resolvedUser && typeof resolvedUser === 'object') {
        if (resolvedUser.id !== undefined) {
          State.user.id = String(resolvedUser.id);
        }
        if (resolvedUser.name) {
          State.user.name = String(resolvedUser.name);
        }
        if (resolvedUser.avatar) {
          State.user.avatar = String(resolvedUser.avatar);
        }
      }

      if (sessionResponse.token) {
        Net.setAuthToken(sessionResponse.token);
      } else {
        Net.setAuthToken('');
      }

      if (sessionResponse.guestId) {
        setGuestId(sessionResponse.guestId);
      }

      if (sessionResponse.permanentUserId && resolvedUser && resolvedUser.id === undefined) {
        State.user.id = String(sessionResponse.permanentUserId);
      }

      saveState();
    } catch (err) {
      console.error('Telegram session verification failed', err);
      Object.assign(State.user, initialTelegramUserSnapshot);
      Net.setAuthToken('');
      saveState();
    }
  })();

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

  function getVipLimitMultiplier(){
    if (!Server?.subscription?.active) return 1;
    return Server.subscription.tier === 'pro' ? 3 : 2;
  }

  function getGameResourceLimit(type){
    const cfg = RemoteConfig?.gameLimits?.[type];
    if (!cfg) return Infinity;
    const base = Number(cfg.daily);
    if (!Number.isFinite(base) || base <= 0) return Infinity;
    return base * getVipLimitMultiplier();
  }

  function hasRemainingGameResource(type){
    if (type === 'energy') return true;
    const bucket = Server?.limits?.[type];
    if (!bucket) return true;
    const limit = getGameResourceLimit(type);
    if (!Number.isFinite(limit)) return true;
    return bucket.used < limit;
  }

  function useGameResource(type) {
    if (type === 'energy') return true;
    const now = Date.now();

    // Check if we can use the resource
    if (!hasRemainingGameResource(type)) {
      return false;
    }

    // Use the resource
    if (Server?.limits?.[type]) {
      Server.limits[type].used++;
      Server.limits[type].lastRecovery = now;
    }

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
    const hdrWallet = $('#hdr-wallet');
    if (hdrWallet) {
      hdrWallet.textContent = (Server.wallet.coins == null ? '—' : faNum(Server.wallet.coins));
    }
    const vip = Server.subscription.active===true;
    $('#vip-badge').classList.toggle('hidden', !vip);
  }

  function getDuelInviteDeadline(invite){
    if (!invite) return NaN;
    const deadline = Number(invite.deadline);
    if (Number.isFinite(deadline)) return deadline;
    const requestedAt = Number(invite.requestedAt);
    if (!Number.isFinite(requestedAt)) return NaN;
    return requestedAt + DUEL_INVITE_TIMEOUT_MS;
  }

  function pruneExpiredDuelInvites(options = {}){
    if (!Array.isArray(State.duelInvites)) {
      State.duelInvites = [];
      return [];
    }
    const now = Date.now();
    const normalized = [];
    const expired = [];
    const fallbackAvatar = (id, opponent) => `https://i.pravatar.cc/100?u=${encodeURIComponent(`${id}-${opponent}`)}`;
    const prevSnapshot = JSON.stringify(State.duelInvites || []);
    for (const invite of State.duelInvites) {
      if (!invite || typeof invite !== 'object') continue;
      const idRaw = invite.id ?? invite.inviteId ?? invite.duelId;
      const id = idRaw != null ? String(idRaw) : '';
      if (!id) continue;
      const opponentRaw = typeof invite.opponent === 'string' ? invite.opponent.trim() : '';
      const opponent = opponentRaw || 'حریف ناشناس';
      const avatar = invite.avatar || fallbackAvatar(id, opponent);
      let requestedAt = Number(invite.requestedAt);
      let deadline = Number(invite.deadline);
      if (!Number.isFinite(requestedAt) && Number.isFinite(deadline)) {
        requestedAt = deadline - DUEL_INVITE_TIMEOUT_MS;
      }
      if (!Number.isFinite(deadline) && Number.isFinite(requestedAt)) {
        deadline = requestedAt + DUEL_INVITE_TIMEOUT_MS;
      }
      if (!Number.isFinite(requestedAt) || !Number.isFinite(deadline)) continue;
      requestedAt = Math.round(requestedAt);
      deadline = Math.round(deadline);
      const normalizedInvite = {
        id,
        opponent,
        avatar,
        requestedAt,
        deadline,
        message: typeof invite.message === 'string' ? invite.message : 'در انتظار پاسخ',
        source: invite.source || 'friend',
      };
      if (deadline <= now) {
        expired.push(normalizedInvite);
      } else {
        normalized.push(normalizedInvite);
      }
    }
    normalized.sort((a, b) => a.deadline - b.deadline);
    State.duelInvites = normalized;
    if (prevSnapshot !== JSON.stringify(State.duelInvites)) {
      saveState();
    }
    if (expired.length && !options.silent) {
      const label = expired.length === 1
        ? `درخواست نبرد ${expired[0].opponent} به دلیل اتمام مهلت حذف شد`
        : `${faNum(expired.length)} درخواست نبرد به دلیل اتمام مهلت حذف شد`;
      toast(`<i class="fas fa-hourglass-end ml-2"></i>${label}`);
    }
    return expired;
  }

  function renderDuelInvites(options = {}){
    const container = $('#active-duel-requests');
    if (!container) return 0;
    const { skipPrune = false, silent = true } = options;
    if (!skipPrune) pruneExpiredDuelInvites({ silent });
    const invites = Array.isArray(State.duelInvites) ? State.duelInvites : [];
    container.innerHTML = '';
    if (!invites.length) {
      const empty = document.createElement('div');
      empty.className = 'glass rounded-2xl p-3 text-sm opacity-80 text-center';
      empty.textContent = 'درخواست فعالی وجود ندارد.';
      container.appendChild(empty);
      return 0;
    }
    const now = Date.now();
    const duelActive = !!State.duelOpponent;
    invites.forEach(invite => {
      if (!invite || typeof invite !== 'object') return;
      const item = document.createElement('div');
      item.className = 'active-match-item';
      item.dataset.inviteId = invite.id;
      const info = document.createElement('div');
      info.className = 'match-info';
      const avatar = document.createElement('img');
      avatar.className = 'match-avatar';
      avatar.src = invite.avatar;
      avatar.alt = invite.opponent;
      const details = document.createElement('div');
      details.className = 'match-details';
      const nameEl = document.createElement('div');
      nameEl.className = 'match-name';
      nameEl.textContent = invite.opponent;
      const statusEl = document.createElement('div');
      statusEl.className = 'match-status';
      const requestedAt = Number(invite.requestedAt);
      const deadline = getDuelInviteDeadline(invite);
      const timeLeft = Number.isFinite(deadline) ? deadline - now : NaN;
      const requestedLabel = Number.isFinite(requestedAt) ? formatRelativeTime(requestedAt) : '';
      let statusText;
      if (!Number.isFinite(timeLeft) || timeLeft <= 0) {
        statusText = requestedLabel ? `ارسال شده ${requestedLabel} • مهلت تمام شده` : 'مهلت تمام شده';
      } else if (timeLeft < 60 * 1000) {
        statusText = requestedLabel
          ? `ارسال شده ${requestedLabel} • کمتر از یک دقیقه تا پایان مهلت`
          : 'کمتر از یک دقیقه تا پایان مهلت';
      } else {
        const duration = formatDuration(timeLeft);
        statusText = requestedLabel
          ? `ارسال شده ${requestedLabel} • ${duration} تا پایان مهلت`
          : `${duration} تا پایان مهلت`;
      }
      if (duelActive) {
        statusText += ' • نبردی در حال برگزاری است';
        item.classList.add('active-match-item--disabled');
        item.setAttribute('aria-disabled', 'true');
      }
      statusEl.textContent = statusText;
      details.append(nameEl, statusEl);
      info.append(avatar, details);
      const actions = document.createElement('div');
      actions.className = 'match-actions';
      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'match-action match-action--accept';
      acceptBtn.type = 'button';
      acceptBtn.dataset.duelAction = 'accept';
      acceptBtn.dataset.inviteId = invite.id;
      acceptBtn.textContent = 'پذیرفتن';
      if (duelActive) {
        acceptBtn.disabled = true;
        acceptBtn.classList.add('is-disabled');
        acceptBtn.textContent = 'در حال نبرد';
      }
      const declineBtn = document.createElement('button');
      declineBtn.className = 'match-action match-action--decline';
      declineBtn.type = 'button';
      declineBtn.dataset.duelAction = 'decline';
      declineBtn.dataset.inviteId = invite.id;
      declineBtn.textContent = 'رد کردن';
      if (duelActive) {
        declineBtn.disabled = true;
        declineBtn.classList.add('is-disabled');
      }
      actions.append(acceptBtn, declineBtn);
      item.append(info, actions);
      container.appendChild(item);
    });
    return invites.length;
  }

  async function handleDuelInviteAccept(inviteId, triggerBtn){
    if (State.duelOpponent) {
      toast('ابتدا نبرد در حال اجرا را به پایان برسان سپس دعوت جدید را بپذیر.');
      renderDuelInvites({ skipPrune: true, silent: true });
      return;
    }

    let originalText = '';
    if (triggerBtn) {
      originalText = triggerBtn.textContent || '';
      triggerBtn.disabled = true;
      triggerBtn.classList.add('is-disabled');
      triggerBtn.textContent = 'در حال شروع...';
    }

    const categoryPool = getDuelCategories().map(cat => ({
      id: cat.id,
      title: cat.title || cat.name || 'دسته‌بندی',
      description: cat.description || ''
    }));

    try {
      const res = await Api.duelAcceptInvite(inviteId, {
        userId: State.user?.id,
        userName: State.user?.name,
        avatar: State.user?.avatar,
        rounds: DUEL_ROUNDS,
        questionsPerRound: DUEL_QUESTIONS_PER_ROUND,
        categoryPool
      });

      const data = res?.data || {};
      const duel = data.duel || null;
      const overview = res?.meta?.overview || data.overview;

      if (!duel) {
        toast('شروع نبرد ممکن نشد');
        if (triggerBtn) {
          triggerBtn.disabled = false;
          triggerBtn.textContent = originalText || 'پذیرفتن';
          triggerBtn.classList.remove('is-disabled');
        }
        renderDuelInvites({ skipPrune: true, silent: true });
        return;
      }

      toast(`<i class="fas fa-handshake ml-2"></i>درخواست نبرد ${duel.opponent?.name || 'حریف'} پذیرفته شد`);
      logEvent('duel_invite_accepted', { inviteId, opponent: duel.opponent?.name });

      const started = await startDuelMatch(duel.opponent, { duel, overview });

      if (!started) {
        toast('<i class="fas fa-triangle-exclamation ml-2"></i>شروع نبرد ممکن نشد یا لغو شد.');
        logEvent('duel_invite_accept_failed', { inviteId, opponent: duel.opponent?.name });
      } else {
        logEvent('duel_invite_match_started', { inviteId, opponent: duel.opponent?.name });
      }
    } catch (error) {
      console.error('Failed to accept duel invite', error);
      toast('پذیرش دعوت نبرد با مشکل مواجه شد');
    } finally {
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.textContent = originalText || 'پذیرفتن';
        triggerBtn.classList.remove('is-disabled');
      }
      renderDuelInvites({ skipPrune: true, silent: true });
    }
  }

  function handleDuelInviteDecline(inviteId){
    Api.duelDeclineInvite(inviteId, {
      userId: State.user?.id,
      userName: State.user?.name
    }).then(res => {
      const overview = res?.meta?.overview || res?.data?.overview;
      if (overview) applyDuelOverviewData(overview, { skipRenderDashboard: true });
      toast(`<i class="fas fa-circle-xmark ml-2"></i>درخواست نبرد رد شد`);
      logEvent('duel_invite_declined', { inviteId });
    }).catch(error => {
      console.error('Failed to decline duel invite', error);
      toast('رد کردن دعوت نبرد با مشکل مواجه شد');
    }).finally(() => {
      renderDuelInvites({ skipPrune: true, silent: true });
    });
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
    const statWallet = $('#stat-wallet');
    if (statWallet) {
      statWallet.textContent = (Server.wallet.coins == null ? '—' : faNum(Server.wallet.coins));
    }
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

    renderDuelInvites({ silent: true });

    // Update limits UI
    updateLimitsUI();
  }
  
  function renderTopBars(){
    $('#lives').textContent = faNum(State.lives);
    $('#coins').textContent = faNum(State.coins);
    const livesChip = $('#lives')?.closest('.chip');
    if (livesChip) livesChip.classList.add('hidden');
    const coinsChip = $('#coins')?.closest('.chip');
    if (coinsChip) coinsChip.classList.add('hidden');
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

  updateLifelineStates();
  
  const NAV_PAGES=['dashboard','quiz','leaderboard','shop','wallet','vip','results','duel','province','group','pass-missions','referral','support'];
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
    if(page==='shop'){ renderShop(); }
    if(page==='wallet'){ renderWallet(); }
    if(page==='vip'){ renderVipPlans(); updateVipUI(); }
    if(page==='referral'){ renderReferral(); }
  }
  
  // ===== Leaderboard / Details (unchanged + detail popups) =====
  function renderLeaderboard(){
    const me = { id: State.user.id, name: State.user.name, score: State.score };
    const withMe = [...State.leaderboard.filter(x=>x.id!==me.id), me].sort((a,b)=>b.score-a.score);
    const myRank = withMe.findIndex(x=>x.id===me.id) + 1;
    const arr = withMe.slice(0,50);
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
      if(u.id===me.id) row.classList.add('ring-2','ring-yellow-300/80');
      row.addEventListener('click', () => showUserDetail({...u, nationalRank:rank}));
      wrap.appendChild(row);
    });

    const myRankCard = $('#my-rank-card');
    if(myRankCard){
      if(myRank>0){
        myRankCard.classList.remove('hidden');
        const badgeClass = myRank===1 ? 'bg-gradient-to-br from-yellow-200 to-yellow-400 text-gray-900'
          : myRank===2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900'
          : myRank===3 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-gray-900'
          : 'bg-white/20';
        myRankCard.innerHTML = `
          <div class="glass rounded-2xl p-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="rank-badge ${badgeClass}">${faNum(myRank)}</span>
              <div>
                <div class="font-bold">رتبه شما</div>
                <div class="text-xs opacity-80">در لیدربورد هفتگی افراد</div>
              </div>
            </div>
            <div class="text-sm font-bold text-yellow-300 flex items-center gap-1"><i class="fas fa-star"></i><span>${faNum(me.score)}</span></div>
          </div>`;
      }else{
        myRankCard.classList.add('hidden');
        myRankCard.innerHTML='';
      }
    }

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
    popup.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
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
    saveState();
    if (reason === 'selection_cancelled' || reason === 'user_cancelled') {
      toast('نبرد لغو شد');
    } else if (reason === 'no_category') {
      toast('شروع نبرد ممکن نشد');
    } else if (reason === 'limit_reached') {
      toast('سهمیه نبردهای امروزت برای نبرد تن‌به‌تن به پایان رسیده است. فردا دوباره تلاش کن!');
    }
    logEvent('duel_cancelled', { reason });
  }

  function closeDetailPopup(options = {}) {
    const popup = $('#detail-popup');
    const overlay = $('#detail-overlay');
    const context = popup?.dataset?.context || '';
    popup?.classList.remove('show');
    overlay?.classList.remove('show');
    if (popup) popup.setAttribute('aria-hidden', 'true');
    if (overlay) overlay.setAttribute('aria-hidden', 'true');
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
    const wins = Number.isFinite(Number(group.wins)) ? Number(group.wins) : 0;
    const losses = Number.isFinite(Number(group.losses)) ? Number(group.losses) : 0;
    const totalMatches = Math.max(0, wins + losses);
    const winRateRaw = totalMatches ? (wins / totalMatches) * 100 : 0;
    const lossRateRaw = totalMatches ? (losses / totalMatches) * 100 : 0;
    const winRateDigits = totalMatches ? faDecimal(winRateRaw, Number.isInteger(winRateRaw) ? 0 : 1) : faNum(0);
    const lossRateDigits = totalMatches ? faDecimal(lossRateRaw, Number.isInteger(lossRateRaw) ? 0 : 1) : faNum(0);
    const progressValue = Number.isFinite(winRateRaw) ? Math.max(0, Math.min(100, winRateRaw)) : 0;
    const progressDisplay = Math.round(progressValue * 10) / 10;
    const progressWidth = progressDisplay;
    const progressAria = progressDisplay.toFixed(1);
    let dominanceBadge = '';
    if (!totalMatches) {
      dominanceBadge = '<span class="group-record-trend neutral"><i class="fas fa-seedling ml-1"></i>شروع تازه</span>';
    } else if (wins > losses) {
      dominanceBadge = `<span class="group-record-trend positive"><i class="fas fa-arrow-trend-up ml-1"></i>برتری ${faNum(Math.abs(wins - losses))}</span>`;
    } else if (losses > wins) {
      dominanceBadge = `<span class="group-record-trend negative"><i class="fas fa-arrow-trend-down ml-1"></i>نیاز به جبران ${faNum(Math.abs(wins - losses))}</span>`;
    } else {
      dominanceBadge = '<span class="group-record-trend neutral"><i class="fas fa-scale-balanced ml-1"></i>عملکرد متعادل</span>';
    }
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

    const recordSection = `
      <div class="group-record-section mt-4">
        <div class="group-record-header">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="group-record-title"><i class="fas fa-ranking-star"></i><span>عملکرد رقابتی گروه</span></div>
            <div class="group-record-meta">
              <span class="chip group-record-total"><i class="fas fa-hashtag ml-1"></i>مجموع نبردها: ${faNum(totalMatches)}</span>
              ${dominanceBadge}
            </div>
          </div>
          <p class="text-xs opacity-80 leading-6">
            نگاهی سریع به توازن برد و باخت‌های رسمی و روند عملکرد کلی گروه.
          </p>
        </div>
        <div class="group-record-grid">
          <div class="group-record-card wins">
            <div class="record-icon"><i class="fas fa-trophy"></i></div>
            <div class="record-metric">
              <span class="record-label">بردهای ثبت‌شده</span>
              <span class="record-value">${faNum(wins)}</span>
            </div>
            <span class="record-badge">
              <i class="fas fa-chart-line ml-1"></i>
              ${winRateDigits}٪ پیروزی
            </span>
          </div>
          <div class="group-record-card losses">
            <div class="record-icon"><i class="fas fa-skull"></i></div>
            <div class="record-metric">
              <span class="record-label">باخت‌های تجربه‌شده</span>
              <span class="record-value">${faNum(losses)}</span>
            </div>
            <span class="record-badge">
              <i class="fas fa-heart-crack ml-1"></i>
              ${lossRateDigits}٪ باخت
            </span>
          </div>
        </div>
        <div class="group-record-progress">
          <div class="progress-header">
            <div class="progress-title">
              <i class="fas fa-wave-square"></i>
              <span>نمودار عملکرد کلی</span>
            </div>
            <div class="progress-meta">
              <span>نرخ برد <strong>${winRateDigits}٪</strong></span>
              <span>نرخ باخت <strong>${lossRateDigits}٪</strong></span>
            </div>
          </div>
          <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressAria}" aria-valuetext="${winRateDigits} درصد">
            <span style="width:${progressWidth}%"></span>
          </div>
          <div class="progress-footer">
            <span><i class="fas fa-trophy text-emerald-300"></i>${faNum(wins)} برد</span>
            <span><i class="fas fa-skull text-rose-300"></i>${faNum(losses)} باخت</span>
          </div>
        </div>
      </div>`;

    content += recordSection;

    const joinPayload = `group_${group.id}`;
    const inviteLinks = buildTelegramStartLinks(joinPayload);
    const inviteLink = inviteLinks.web;
    const inviteFallback = `${location.origin}${location.pathname}?join=${encodeURIComponent(group.id)}`;
    const membersHtml = (group.memberList || []).map(m=>`<div class="glass rounded-xl p-2 text-sm flex items-center gap-2"><i class="fas fa-user text-blue-200"></i>${m}</div>`).join('');
    content += `
      <div class="mt-4">
        ${isAdmin ? `<div class="glass rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-sm font-bold">
              <i class="fas fa-share-nodes text-sky-300"></i>
              <span>دعوت از اعضا</span>
            </div>
            <span class="text-[0.7rem] chip bg-white/10 border-white/20">لینک اختصاصی</span>
          </div>
          <p class="text-xs opacity-80">لینک گروه خود را کپی کنید و برای دوستانتان ارسال نمایید تا بتوانند به سادگی به شما بپیوندند.</p>
          <div class="flex gap-2">
            <input id="group-share-link" class="form-input flex-1 text-left ltr" value="${inviteLink}" readonly>
            <button id="btn-copy-group-link" class="btn btn-secondary" title="کپی لینک"><i class="fas fa-copy"></i></button>
            <button id="btn-share-group-link" class="btn btn-group" title="اشتراک لینک"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>` : ''}
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
    $('#btn-copy-group-link')?.addEventListener('click', async () => {
      const ok = await copyToClipboard(inviteLink);
      toast(ok ? '<i class="fas fa-check-circle ml-2"></i>لینک گروه کپی شد' : 'کپی لینک با خطا مواجه شد');
    });
    $('#btn-share-group-link')?.addEventListener('click', async () => {
      vibrate(10);
      const appName = getAppName();
      const text = `به گروه ${group.name} در ${appName} بپیوندید!`;
      const shareMessage = `${text} اگر تلگرام به‌طور خودکار باز نشد از این لینک استفاده کن: ${inviteFallback}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: `دعوت به گروه ${group.name}`,
            text: shareMessage,
            url: inviteLink
          });
          toast('<i class="fas fa-check-circle ml-2"></i>لینک گروه ارسال شد');
          return;
        } catch (error) {
          console.warn('navigator.share group link failed', error);
        }
      }
      await shareOnTelegram(inviteLink, shareMessage);
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
      wins: 0,
      losses: 0,
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
  function getQuestionAt(index) {
    if (!Array.isArray(State.quiz.list)) return null;
    if (!Number.isInteger(index) || index < 0 || index >= State.quiz.list.length) return null;
    const candidate = State.quiz.list[index];
    return isValidQuestion(candidate) ? candidate : null;
  }

  function findNextValidQuestionIndex(startIndex = 0) {
    if (!Array.isArray(State.quiz.list)) return -1;
    const total = State.quiz.list.length;
    for (let idx = Math.max(0, startIndex); idx < total; idx += 1) {
      if (isValidQuestion(State.quiz.list[idx])) {
        return idx;
      }
    }
    return -1;
  }

  function goToQuestion(index) {
    const question = getQuestionAt(index);
    if (!question) {
      return false;
    }
    State.quiz.idx = index;
    State.quiz.answered = false;
    renderQuestionUI(question);
    resetTimer();
    return true;
  }

  function moveToNextValidQuestion(startIndex = State.quiz.idx + 1) {
    const nextIndex = findNextValidQuestionIndex(startIndex);
    if (nextIndex === -1) {
      endQuiz();
      return true;
    }
    const moved = goToQuestion(nextIndex);
    if (!moved) {
      return moveToNextValidQuestion(nextIndex + 1);
    }
    return false;
  }

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
  if (ring?.setAttribute) ring.setAttribute('stroke-dasharray', String(TIMER_CIRC));

  const effective = Number.isFinite(seconds) && seconds > 0
    ? seconds
    : getDurationForDifficulty(State.quiz.diffValue || State.quiz.diff || 'easy');

  const baseDuration = getBaseQuestionDuration?.() ?? effective;
  if (!State.quiz.inProgress || State.quiz.baseDuration !== baseDuration) {
    State.quiz.baseDuration = baseDuration;
  }

  // خاموش کردن هر تایمر قبلی قبل از ست‌کردن مقادیر
  if (State.quiz?.timer) { clearInterval(State.quiz.timer); State.quiz.timer = null; }

  State.quiz.duration = effective;
  State.quiz.remain   = effective;

  updateTimerVisual?.();
  startQuizTimerCountdown();
}

function startQuizTimerCountdown(){
  // جلوگیری از دوبل‌استارت
  if (State.quiz?.timer) { clearInterval(State.quiz.timer); State.quiz.timer = null; }

  // اگر بازی متوقفه/در جریان نیست، یا پرچم توقف فعاله، برگرد
  if (!State.quiz || (typeof quizTimerPausedForQuit !== 'undefined' && quizTimerPausedForQuit) || !State.quiz.inProgress) {
    return;
  }

  State.quiz.timer = setInterval(() => {
    // توقف وسط راه
    if (!State.quiz.inProgress) {
      clearInterval(State.quiz.timer); State.quiz.timer = null; return;
    }

    State.quiz.remain = Math.max(0, (State.quiz.remain ?? 0) - 1);
    if (State.quiz.remain <= 5 && State.quiz.remain > 0) SFX?.tick?.();
    updateTimerVisual?.();

    if (State.quiz.remain <= 0){
      State.quiz.remain = 0;
      clearInterval(State.quiz.timer); State.quiz.timer = null;
      State.quiz.answered = true;
      lockChoices?.();
      const currentQuestion = getQuestionAt(State.quiz.idx);
      const ended = registerAnswer?.(-1, currentQuestion, { timedOut: true });
      (typeof onTimerExpired === 'function' ? onTimerExpired : handleTimeUp)?.(ended);
    }
  }, 1000);
}

  function handleTimeUp(ended){
    if(ended) return;
    setTimeout(nextQuestion, 900);
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
  
  document.getElementById('setup-start')?.addEventListener('click', async (event) => {
    const started = await startQuizFromAdmin(event);
    if (started) {
      closeSheet();
      navTo('quiz');
    }
  });
  document.getElementById('setup-duel')?.addEventListener('click', ()=>{
    logEvent('open_duel_from_setup');
    closeSheet();
    navTo('duel');
  });
    document.getElementById('range-count')?.addEventListener('input', e=>{
      var setupCountEl = document.getElementById('setup-count');
      if (setupCountEl) setupCountEl.textContent = faNum(e.target.value);
    });

  function lockChoices(){ $$('#choices .choice').forEach(el=> el.classList.add('pointer-events-none','opacity-70')); }
  
  function registerAnswer(idx, question, options = {}){
    const { timedOut = false } = options || {};
    const q = question || getQuestionAt(State.quiz.idx);
    if (!q) {
      console.warn('[quiz] Invalid question encountered, skipping.');
      return moveToNextValidQuestion(State.quiz.idx + 1);
    }
    trackQuestionConsumption(q);
    const correct = q.a;
    const hasAnswer = Number.isInteger(idx) && idx >= 0;
    const ok = hasAnswer && (idx===correct);
    const basePointsValue = getCorrectAnswerBasePoints();
    const baseCoinsValue = getCorrectAnswerBaseCoins();
    const basePoints = ok ? basePointsValue : 0;
    const baseCoins = ok ? baseCoinsValue : 0;
    const timeBonus = ok ? Math.round(basePoints * 0.5 * (State.quiz.remain / Math.max(1, State.quiz.duration))) : 0;
    const boostActive = Date.now() < State.boostUntil;
    const vipBonus = ok && Server.subscription.active ? Math.round(basePoints * 0.2) : 0; // VIP from server
    const earned = ok ? Math.floor((basePoints + timeBonus + vipBonus) * (boostActive ? 2 : 1)) : 0;
    if(ok){
      State.score += earned;
      State.coins += baseCoins;
      State.quiz.sessionEarned += earned;
      State.quiz.correctStreak = (State.quiz.correctStreak || 0) + 1;
      SFX.correct(); vibrate(30);
    } else if (hasAnswer && !timedOut) {
      State.quiz.correctStreak = 0;
      spendKeys(1);
      // Use a life from the limit
      useGameResource('lives');
      SFX.wrong(); vibrate([10,30,10]);
    } else {
      State.quiz.correctStreak = 0;
    }

    const userAnswerLabel = hasAnswer && q.c[idx] != null
      ? q.c[idx]
      : (timedOut ? 'پاسخی ثبت نشد' : '—');

    State.quiz.results.push({
      q: q.q,
      ok,
      correct: q.c[correct],
      you: userAnswerLabel,
      timedOut,
    });
    saveState(); renderHeader(); renderTopBars();
    scheduleFlushAnsweredQuestions();

    // Log analytics
    logEvent('question_answered', {
      correct: ok,
      timeSpent: State.quiz.duration - State.quiz.remain,
      category: State.quiz.cat || q.cat,
      difficulty: State.quiz.diff || q.diff
    });

    return false;
  }
  
  function selectAnswer(idx){
    if(State.quiz.answered) return;
    const currentQuestion = getQuestionAt(State.quiz.idx);
    if (!currentQuestion) {
      moveToNextValidQuestion(State.quiz.idx + 1);
      return;
    }
    State.quiz.answered = true; clearInterval(State.quiz.timer);
    const correct = currentQuestion.a;
    const list = $$('#choices .choice');
    list.forEach((el,i)=> el.classList.add(i===correct? 'correct':'wrong'));
    lockChoices();
    const ended = registerAnswer(idx, currentQuestion);
    if(!ended && State.quiz.answered){
      setTimeout(nextQuestion, 900);
    }
  }

  function nextQuestion(){
    moveToNextValidQuestion(State.quiz.idx + 1);
  }

  configureQuizEngine({
    renderTopBars,
    resetTimer,
    selectAnswer,
    nextQuestion,
    addExtraTime,
    logEvent
  });

  async function endQuiz(){
    State.quiz.inProgress=false;
    await flushAnsweredQuestionQueue();
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
        <div class="text-xs opacity-70">پاسخ شما: ${r.you}</div>`;
      wrap.appendChild(row);
    });
    const duelActive = !!(DuelSession && State.duelOpponent);
    if (duelActive) {
      const status = await completeDuelRound(correctCount, State.quiz.sessionEarned);
      if (status === 'next') {
        saveState();
        return;
      }
      if (status === 'finished') {
        finalizeDuelResults(DuelSession?.lastSummary);
        saveState();
        navTo('results');
        AdManager.maybeShowInterstitial('post_quiz');
        return;
      }
      if (status === 'error') {
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
    const streakRewards = rewardSettings || {};
    const coinUnit = Math.max(0, Number(streakRewards.coinsStreak) || 0);
    const pointUnit = Math.max(0, Number(streakRewards.pointsStreak) || 0);
    const coinsReward = coinUnit * State.streak;
    const pointsReward = pointUnit * State.streak;
    State.coins += coinsReward;
    State.score += pointsReward;
    saveState(); renderDashboard(); renderHeader();
    const rewardParts = [];
    if (coinsReward > 0) rewardParts.push(`${faNum(coinsReward)} سکه`);
    if (pointsReward > 0) rewardParts.push(`${faNum(pointsReward)} امتیاز`);
    const rewardLabel = rewardParts.length ? rewardParts.join(' و ') : 'بدون پاداش';
    toast(`<i class="fas fa-gift ml-2"></i>پاداش امروز: ${rewardLabel} 🎉`);
    if(State.streak>=3 && !State.achievements.streak3){ State.achievements.streak3=true; toast('<i class="fas fa-fire ml-2"></i>نشان «استریک ۳ روزه»!'); }
  }
  
  async function startDaily(){
    State.lives = Math.max(State.lives, 1);
    let categoryId = State.quiz.catId;
    if (categoryId == null) {
      const firstCategory = getActiveCategories()[0] || getFirstCategory();
      categoryId = firstCategory?.id;
    }

    const catObj = findCategoryById(categoryId);
    const diffPoolRaw = getCategoryDifficultyPool(catObj);
    const diffPool = Array.isArray(diffPoolRaw) && diffPoolRaw.length ? diffPoolRaw : getEffectiveDiffs();

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

    const started = await startQuizFromAdmin({ count:5, difficulty: preferred ? preferred.value : undefined, categoryId, source:'daily' });
    if (started) {
      navTo('quiz');
    }
  }
  
  // ===== Shop (legacy soft-currency), VIP button rerouted =====

  function getShopConfig(){
    return RemoteConfig.shop || adminSettings?.shop || {};
  }

  function isDeprecatedVipTier(plan){
    if (!plan || typeof plan !== 'object') return false;
    const fields = [plan.tier, plan.id, plan.displayName, plan.name, plan.badge];
    for (const field of fields){
      if (!field) continue;
      const normalized = String(field).trim().toLowerCase();
      if (!normalized) continue;
      if (normalized.includes('lite') || normalized.includes('لایت')){
        return true;
      }
    }
    return false;
  }

  function sanitizeVipPlanList(plans){
    if (!Array.isArray(plans)) return [];
    const unique = [];
    const seen = new Set();
    for (const plan of plans){
      if (!plan || typeof plan !== 'object') continue;
      if (isDeprecatedVipTier(plan)) continue;
      const key = String(plan.tier || plan.id || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(plan);
    }
    if (!unique.length){
      const fallback = plans.find((plan) => plan && (plan.tier || plan.id));
      if (fallback) unique.push(fallback);
    }
    return unique;
  }

  function getVipPlanConfigs(){
    const pricing = RemoteConfig?.pricing?.vip || {};
    const adminPlans = Array.isArray(RemoteConfig?.shop?.vipPlans) ? RemoteConfig.shop.vipPlans : [];
    if (adminPlans.length) {
      return sanitizeVipPlanList(adminPlans
        .map((plan, index) => {
          if (!plan || typeof plan !== 'object') return null;
          const tier = plan.tier || plan.id;
          if (!tier) return null;
          const base = pricing[tier] || {};
          const benefits = Array.isArray(plan.benefits) && plan.benefits.length
            ? plan.benefits.slice()
            : Array.isArray(base.benefits) ? base.benefits.slice() : [];
          const priceToman = Number(plan.price != null ? plan.price : base.priceToman);
          return {
            tier,
            ...base,
            ...plan,
            displayName: plan.displayName || base.displayName || tier,
            priceToman: Number.isFinite(priceToman) ? priceToman : Number(base.priceToman) || 0,
            priceCents: Number.isFinite(plan.priceCents) ? Number(plan.priceCents) : Number(base.priceCents) || undefined,
            benefits,
            order: Number.isFinite(plan.order) ? Number(plan.order) : (Number(base.order) || index + 1),
            active: plan.active !== false && base.active !== false,
            featured: plan.featured === true || base.featured === true,
            badge: plan.badge || base.badge || '',
            buttonText: plan.buttonText || base.buttonText || 'خرید اشتراک',
            period: plan.period || base.period || ''
          };
        })
        .filter(Boolean));
    }
    return sanitizeVipPlanList(Object.keys(pricing).map((tier, index) => {
      const base = pricing[tier] || {};
      const benefits = Array.isArray(base.benefits) ? base.benefits.slice() : [];
      return {
        tier,
        ...base,
        displayName: base.displayName || tier,
        priceToman: Number(base.priceToman) || 0,
        benefits,
        order: Number.isFinite(base.order) ? Number(base.order) : index + 1,
        active: base.active !== false,
        featured: base.featured === true,
        badge: base.badge || '',
        buttonText: base.buttonText || 'خرید اشتراک',
        period: base.period || ''
      };
    }));
  }

  function hasActiveVipPlans(){
    return getVipPlanConfigs().some((plan) => plan && plan.active !== false);
  }

  function getActiveVipPlans(){
    return getVipPlanConfigs()
      .filter((plan) => plan && plan.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  function normalizeVipPrice(plan){
    if (!plan) return Number.POSITIVE_INFINITY;
    const toman = Number(plan.priceToman || plan.price || 0);
    if (toman > 0) return toman;
    const cents = Number(plan.priceCents || 0);
    if (cents > 0 && RemoteConfig?.pricing?.usdToToman){
      return Math.round((cents / 100) * RemoteConfig.pricing.usdToToman);
    }
    return Number.POSITIVE_INFINITY;
  }

  function formatVipPrice(plan){
    if (!plan) return '—';
    const period = plan.period ? ` / ${plan.period}` : '';
    const toman = Number(plan.priceToman || plan.price || 0);
    if (toman > 0){
      return `${faNum(Math.round(toman))} تومان${period}`;
    }
    const cents = Number(plan.priceCents || 0);
    if (cents > 0 && RemoteConfig?.pricing?.usdToToman){
      const estimated = Math.round((cents / 100) * RemoteConfig.pricing.usdToToman);
      return `${faNum(estimated)} تومان${period}`;
    }
    if (cents > 0){
      const dollars = cents / 100;
      return `${faDecimal(dollars)} دلار${period}`;
    }
    return period ? period.replace(/^\s*\/\s*/, '') || 'رایگان' : 'رایگان';
  }

  function getCheapestVipPlan(){
    const plans = getActiveVipPlans();
    if (!plans.length) return null;
    return plans.slice().sort((a, b) => normalizeVipPrice(a) - normalizeVipPrice(b))[0];
  }

  function getPrimaryVipPlan(){
    const plans = getActiveVipPlans();
    if (!plans.length) return null;
    return plans.find((plan) => plan && plan.featured) || plans[0];
  }

  function renderShopSectionsVisibility(){
    const shop = getShopConfig();
    const enabled = shop.enabled !== false;
    const sections = shop.sections || {};
    const vipAvailable = hasActiveVipPlans();
    $$('[data-shop-section]').forEach((el) => {
      const key = el.dataset.shopSection;
      if (!key) return;
      let show = enabled;
      if (key === 'balances') {
        show = enabled && (shop.hero?.showBalances !== false);
      } else if (key === 'hero') {
        show = enabled && sections.hero !== false;
      } else if (key === 'keys') {
        show = enabled && sections.keys !== false;
      } else if (key === 'wallet') {
        show = enabled && sections.wallet !== false;
      } else if (key === 'wallet-topup') {
        show = enabled && sections.wallet !== false && shop.quickTopup !== false;
      } else if (key === 'vip-intro') {
        show = enabled && sections.vip !== false && vipAvailable;
      }
      el.classList.toggle('hidden', !show);
    });
    $$('[data-shop-quick-topup]').forEach((btn) => {
      btn.classList.toggle('hidden', shop.enabled === false || shop.quickTopup === false);
    });
  }

  function renderShopHero(){
    const heroEl = $('#shop-hero-block');
    if (!heroEl) return;
    const shop = getShopConfig();
    const enabled = shop.enabled !== false;
    const sections = shop.sections || {};
    const hero = shop.hero || {};
    const shouldShow = enabled && sections.hero !== false;
    heroEl.classList.toggle('hidden', !shouldShow);
    if (!shouldShow) return;
    const titleEl = heroEl.querySelector('[data-shop-hero-title]');
    if (titleEl) titleEl.textContent = hero.title || 'به فروشگاه خوش آمدید';
    const subtitleEl = heroEl.querySelector('[data-shop-hero-subtitle]');
    if (subtitleEl) subtitleEl.textContent = hero.subtitle || '';
    const noteEl = heroEl.querySelector('[data-shop-hero-note]');
    if (noteEl) {
      if (hero.note) {
        noteEl.textContent = hero.note;
        noteEl.classList.remove('hidden');
      } else {
        noteEl.classList.add('hidden');
      }
    }
    const ctaEl = $('#shop-hero-cta');
    if (ctaEl) {
      const textEl = ctaEl.querySelector('[data-shop-hero-cta-text]');
      if (textEl) textEl.textContent = hero.ctaText || 'مشاهده پیشنهادها';
      const link = hero.ctaLink || '#wallet';
      ctaEl.setAttribute('href', link || '#');
      if (link && /^https?:/i.test(link)) {
        ctaEl.setAttribute('target', '_blank');
        ctaEl.setAttribute('rel', 'noopener');
      } else {
        ctaEl.removeAttribute('target');
        ctaEl.removeAttribute('rel');
      }
    }
    const tagsEl = heroEl.querySelector('[data-shop-hero-tags]');
    if (tagsEl) {
      tagsEl.innerHTML = '';
      const tags = [];
      if (shop.quickTopup) tags.push('شارژ سریع فعال');
      if (shop.quickPurchase) tags.push('خرید آنی بدون تایید دوباره');
      if (shop.dynamicPricing) tags.push('قیمت‌گذاری پویا');
      if (shop.currency) tags.push(`ارز: ${shop.currency === 'coin' ? 'سکه بازی' : shop.currency}`);
      if (hero.showTags === false || !tags.length) {
        tagsEl.classList.add('hidden');
      } else {
        tagsEl.classList.remove('hidden');
        tags.forEach((text) => {
          const chip = document.createElement('span');
          chip.className = 'chip bg-white/15 border border-white/25';
          chip.textContent = text;
          tagsEl.appendChild(chip);
        });
      }
    }
    HERO_THEMES.forEach((theme) => heroEl.classList.remove(`hero-theme-${theme}`));
    const theme = hero.theme && HERO_THEMES.includes(hero.theme) ? hero.theme : 'sky';
    heroEl.classList.add(`hero-theme-${theme}`);
  }

  function renderShopSupport(){
    const supportEl = $('#shop-support-cta');
    if (!supportEl) return;
    const support = getShopConfig().messaging || {};
    const enabled = getShopConfig().enabled !== false;
    const hasSupport = !!(support.supportLink || support.supportCta);
    supportEl.classList.toggle('hidden', !(enabled && hasSupport));
    if (!(enabled && hasSupport)) return;
    const msgEl = supportEl.querySelector('[data-support-message]');
    if (msgEl) msgEl.textContent = support.supportCta || 'برای سوالات بیشتر با پشتیبانی در تماس باشید.';
    const linkEl = $('#shop-support-link');
    if (linkEl) {
      const href = support.supportLink || '#';
      linkEl.href = href;
      if (href && /^https?:/i.test(href)) {
        linkEl.setAttribute('target', '_blank');
        linkEl.setAttribute('rel', 'noopener');
      } else {
        linkEl.removeAttribute('target');
        linkEl.removeAttribute('rel');
      }
    }
  }

  function renderShopVipIntro(){
    const detailBtn = $('#btn-open-vip');
    const buyBtn = $('#btn-buy-vip');
    const priceEl = $('[data-shop-vip-price]');
    const benefitsEl = $('[data-shop-vip-benefits]');
    const shop = getShopConfig();
    const enabled = shop.enabled !== false && shop.sections?.vip !== false;
    const plans = getActiveVipPlans();
    const primaryPlan = enabled && plans.length ? getPrimaryVipPlan() : null;
    const hasPlan = Boolean(primaryPlan);

    if (detailBtn){
      detailBtn.disabled = !hasPlan;
      detailBtn.setAttribute('aria-disabled', hasPlan ? 'false' : 'true');
      detailBtn.innerHTML = hasPlan
        ? '<i class="fas fa-crown ml-1"></i> جزئیات اشتراک'
        : '<i class="fas fa-crown ml-1"></i> به زودی';
      detailBtn.title = hasPlan ? 'مشاهده جزئیات کامل اشتراک VIP' : 'پلن فعال برای نمایش وجود ندارد';
    }

    if (buyBtn){
      buyBtn.disabled = !hasPlan;
      buyBtn.setAttribute('aria-disabled', hasPlan ? 'false' : 'true');
      if (hasPlan){
        buyBtn.dataset.vipPlanButton = primaryPlan.tier || primaryPlan.id || 'vip';
        buyBtn.innerHTML = '<i class="fas fa-check ml-1"></i> خرید اشتراک';
        buyBtn.onclick = () => startPurchaseVip(primaryPlan.tier || primaryPlan.id, buyBtn);
      } else {
        delete buyBtn.dataset.vipPlanButton;
        buyBtn.innerHTML = '<i class="fas fa-hourglass-half ml-1"></i> به زودی';
        buyBtn.onclick = null;
      }
    }

    if (priceEl){
      if (hasPlan){
        const priceLabel = formatVipPrice(primaryPlan);
        priceEl.textContent = priceLabel && priceLabel !== 'رایگان'
          ? `شروع از ${priceLabel}`
          : 'اشتراک فعال است';
      } else {
        priceEl.textContent = 'شروع از —';
      }
    }

    if (benefitsEl){
      if (hasPlan && Array.isArray(primaryPlan.benefits) && primaryPlan.benefits.length){
        const summary = primaryPlan.benefits.slice(0, 3).join(' • ');
        benefitsEl.textContent = summary;
      } else {
        benefitsEl.textContent = 'حذف تبلیغات • محدودیت‌های بیشتر • پشتیبانی ویژه';
      }
    }
  }

  function getVipBillingLabel(value){
    if (!value) return '';
    const map = {
      weekly: 'هفتگی',
      monthly: 'ماهانه',
      quarterly: 'سه‌ماهه',
      yearly: 'سالانه'
    };
    return map[value] || '';
  }

  function buildVipModalPlan(plan){
    const card = document.createElement('article');
    card.className = 'vip-modal-plan';
    if (plan.featured) card.classList.add('is-featured');
    card.dataset.vipPlanCard = plan.tier || '';

    const header = document.createElement('div');
    header.className = 'vip-modal-plan-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'vip-modal-plan-title';
    const nameEl = document.createElement('div');
    nameEl.className = 'vip-modal-plan-name';
    nameEl.textContent = plan.displayName || plan.tier || 'اشتراک VIP';
    titleWrap.appendChild(nameEl);
    if (plan.period){
      const periodEl = document.createElement('div');
      periodEl.className = 'vip-modal-plan-period';
      periodEl.textContent = plan.period;
      titleWrap.appendChild(periodEl);
    }
    header.appendChild(titleWrap);

    const priceWrap = document.createElement('div');
    priceWrap.className = 'vip-modal-plan-price';
    const priceEl = document.createElement('span');
    priceEl.textContent = formatVipPrice(plan);
    priceWrap.appendChild(priceEl);
    if (plan.badge){
      const badgeEl = document.createElement('span');
      badgeEl.className = 'vip-badge';
      badgeEl.textContent = plan.badge;
      priceWrap.appendChild(badgeEl);
    }
    header.appendChild(priceWrap);
    card.appendChild(header);

    const benefitsList = document.createElement('ul');
    benefitsList.className = 'vip-modal-benefits';
    const benefits = Array.isArray(plan.benefits) ? plan.benefits.filter(Boolean) : [];
    if (benefits.length){
      benefits.forEach((benefit) => {
        const li = document.createElement('li');
        li.textContent = benefit;
        benefitsList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'جزئیات مزایا به زودی اعلام می‌شود.';
      benefitsList.appendChild(li);
    }
    card.appendChild(benefitsList);

    const ctaWrap = document.createElement('div');
    ctaWrap.className = 'vip-modal-cta';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.vipPlanButton = plan.tier || '';
    const label = plan.buttonText || 'خرید اشتراک';
    btn.innerHTML = `<i class="fas fa-check"></i><span>${label}</span>`;
    btn.setAttribute('aria-label', `${label} ${plan.displayName || plan.tier || ''}`.trim());
    btn.addEventListener('click', () => startPurchaseVip(plan.tier, btn));
    ctaWrap.appendChild(btn);
    card.appendChild(ctaWrap);

    return card;
  }

  function openVipDetailsModal(){
    const modal = $('#modal-vip-details');
    const plans = getActiveVipPlans();
    if (!modal || !plans.length){
      return false;
    }
    const planWrap = modal.querySelector('[data-vip-modal-plans]');
    const summaryEl = modal.querySelector('[data-vip-modal-summary]');
    const tagsWrap = modal.querySelector('[data-vip-modal-tags]');
    if (!planWrap){
      return false;
    }

    planWrap.innerHTML = '';
    const shop = getShopConfig();
    const vipConfig = shop.vip || {};
    const primaryPlan = getPrimaryVipPlan();
    const summaryText = vipConfig.customNote
      || (Array.isArray(primaryPlan?.benefits) && primaryPlan.benefits.length
        ? primaryPlan.benefits.slice(0, 3).join(' • ')
        : 'با اشتراک VIP از امکانات ویژه و پشتیبانی اختصاصی بهره‌مند شوید.');
    if (summaryEl){
      summaryEl.textContent = summaryText;
    }

    if (tagsWrap){
      const tags = [];
      const billingLabel = getVipBillingLabel(vipConfig.billingCycle);
      if (billingLabel){
        tags.push({ icon: 'fa-rotate', text: `دوره ${billingLabel}` });
      }
      if (Number(vipConfig.trialDays) > 0){
        tags.push({ icon: 'fa-gift', text: `${faNum(Math.round(Number(vipConfig.trialDays)))} روز دوره آزمایشی` });
      }
      if (Number(vipConfig.slots) > 0){
        tags.push({ icon: 'fa-users', text: `ظرفیت محدود به ${faNum(Math.round(Number(vipConfig.slots)))} نفر` });
      }
      if (vipConfig.autoRenew){
        tags.push({ icon: 'fa-arrows-rotate', text: 'تمدید خودکار فعال است' });
      }
      if (vipConfig.autoApprove){
        tags.push({ icon: 'fa-bolt', text: 'تایید فوری پس از پرداخت' });
      }
      tagsWrap.innerHTML = '';
      if (tags.length){
        tags.forEach((tag) => {
          const span = document.createElement('span');
          span.className = 'vip-modal-tag';
          span.innerHTML = `<i class="fas ${tag.icon}"></i><span>${tag.text}</span>`;
          tagsWrap.appendChild(span);
        });
        tagsWrap.classList.remove('hidden');
      } else {
        tagsWrap.classList.add('hidden');
      }
    }

    plans.forEach((plan) => {
      planWrap.appendChild(buildVipModalPlan(plan));
    });

    openModal('#modal-vip-details');
    setTimeout(() => {
      modal.querySelector('[data-close="#modal-vip-details"]')?.focus({ preventScroll: true });
    }, 60);
    return true;
  }

  function normalizeTopupSettings(source){
    const config = source && typeof source === 'object' ? source : {};
    const min = Math.max(10_000, Number(config.minAmount) || WALLET_TOPUP_DEFAULTS.min);
    const max = Math.max(min, Number(config.maxAmount) || WALLET_TOPUP_DEFAULTS.max);
    const stepRaw = Number(config.stepAmount);
    const step = Math.max(1_000, Number.isFinite(stepRaw) && stepRaw > 0 ? stepRaw : WALLET_TOPUP_DEFAULTS.step);
    const defaultRaw = Number(config.defaultAmount);
    const defaultAmount = clamp(
      Number.isFinite(defaultRaw) && defaultRaw > 0 ? defaultRaw : WALLET_TOPUP_DEFAULTS.defaultAmount,
      min,
      max
    );
    const presetSource = Array.isArray(config.presets) && config.presets.length
      ? config.presets
      : [defaultAmount, Math.round((min + max) / 2), max];
    const presetSet = new Set();
    const presets = [];
    presetSource.forEach((value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      const normalized = clamp(Math.round(numeric / step) * step, min, max);
      if (!presetSet.has(normalized)){
        presetSet.add(normalized);
        presets.push(normalized);
      }
    });
    presets.sort((a, b) => a - b);
    return { min, max, step, defaultAmount, presets };
  }

  function getWalletTopupSettings(){
    const shop = getShopConfig();
    const source =
      (shop?.quickTopup && typeof shop.quickTopup === 'object')
        ? shop.quickTopup
        : shop?.quickTopupConfig;
    return normalizeTopupSettings(source);
  }

  function getNormalizedWalletPackages(){
    const usdToToman = RemoteConfig?.pricing?.usdToToman || 70_000;
    const raw = Array.isArray(RemoteConfig?.pricing?.coins) ? RemoteConfig.pricing.coins : [];
    return raw
      .map((pkg, index) => {
        const amount = Number(pkg.amount) || 0;
        const bonus = Number(pkg.bonus || 0);
        const basePrice = Number(pkg.priceToman || pkg.price || 0);
        const priceCents = Number(pkg.priceCents || 0);
        const priceToman = basePrice > 0 ? basePrice : (priceCents > 0 ? Math.round((priceCents / 100) * usdToToman) : 0);
        const totalCoins = Math.round(amount + (amount * bonus / 100));
        const priority = Number(pkg.priority ?? (index + 1));
        return {
          ...pkg,
          amount,
          bonus,
          priceToman,
          totalCoins,
          priority,
        };
      })
      .filter((pkg) => pkg.amount > 0 && pkg.priceToman > 0)
      .sort((a, b) => (a.priority ?? a.amount) - (b.priority ?? b.amount));
  }

  function pickWalletPackageByAmount(amount, packages = getNormalizedWalletPackages()){
    if (!packages.length) return null;
    const target = Math.max(0, Number(amount) || 0);
    let candidate = null;
    let bestDiff = Infinity;
    let fallback = null;
    packages.forEach((pkg) => {
      if (!fallback || pkg.priceToman > fallback.priceToman){
        fallback = pkg;
      }
      if (pkg.priceToman >= target){
        const diff = pkg.priceToman - target;
        if (diff < bestDiff){
          bestDiff = diff;
          candidate = pkg;
        }
      }
    });
    return candidate || fallback || null;
  }

  function getBestWalletCoinRate(packages = getNormalizedWalletPackages()){
    let best = 0;
    packages.forEach((pkg) => {
      const ratio = pkg.priceToman > 0 ? pkg.totalCoins / pkg.priceToman : 0;
      if (ratio > best){
        best = ratio;
      }
    });
    return best;
  }

  function renderShopBalances(){
    if ($('#shop-gcoins'))  $('#shop-gcoins').textContent  = faNum(State.coins);
    if ($('#shop-wallet'))  $('#shop-wallet').textContent  = (Server.wallet.coins==null?'—':faNum(Server.wallet.coins));
    const topupBalance = $('#shop-topup-balance');
    if (topupBalance){
      topupBalance.textContent = (Server.wallet.coins==null?'—':faNum(Server.wallet.coins));
    }
    if ($('#keys-count'))   $('#keys-count').textContent   = faNum(State.keys || 0);
  }

  function renderShopLowBalanceMessage(){
    const warningEl = $('#shop-low-balance-warning');
    if (!warningEl) return;
    const shop = getShopConfig();
    const enabled = shop.enabled !== false;
    const threshold = Number(shop.lowBalanceThreshold) || 0;
    const shouldShow = enabled && threshold > 0 && State.coins < threshold;
    const msgEl = warningEl.querySelector('[data-low-balance-message]');
    if (!enabled) {
      if (msgEl) msgEl.textContent = 'فروشگاه موقتاً در دسترس نیست.';
      warningEl.classList.remove('hidden');
      return;
    }
    if (msgEl) {
      const fallback = `موجودی کمتر از ${faNum(threshold)} سکه است. برای خرید دوباره شارژ کن.`;
      msgEl.textContent = shop.messaging?.lowBalance || fallback;
    }
    warningEl.classList.toggle('hidden', !shouldShow);
  }

  function renderShopPurchaseNotice(){
    const banner = $('#shop-purchase-success');
    if (!banner) return;
    const notice = getPurchaseNotice();
    if (!notice) {
      banner.classList.add('hidden');
      return;
    }

    const messageEl = banner.querySelector('[data-purchase-message]');
    if (messageEl) {
      messageEl.textContent = notice.message || 'خرید با موفقیت انجام شد.';
    }

    const metaEl = banner.querySelector('[data-purchase-meta]');
    if (metaEl) {
      const metaParts = [];
      const balanceValue = Number(notice.balance);
      if (Number.isFinite(balanceValue)) {
        metaParts.push(`موجودی فعلی: ${faNum(balanceValue)} سکه`);
      }
      if (notice.reference) {
        metaParts.push(`کد تراکنش: ${notice.reference}`);
      }
      const ts = Number(notice.timestamp) || 0;
      if (ts) {
        metaParts.push(formatRelativeTime(ts));
      }
      metaEl.textContent = metaParts.length ? metaParts.join(' • ') : 'موجودی شما به‌روزرسانی شد.';
    }

    const closeBtn = banner.querySelector('[data-purchase-dismiss]');
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = 'true';
      closeBtn.addEventListener('click', () => {
        clearPurchaseNotice();
        renderShopPurchaseNotice();
      });
    }

    banner.classList.remove('hidden');
  }

  function announcePurchaseSuccess({ coinsAdded = 0, balance = null, itemLabel = '', reference = '' } = {}){
    const coins = Math.max(0, Number(coinsAdded) || 0);
    const balanceValue = Number.isFinite(Number(balance)) ? Number(balance) : null;
    const label = itemLabel ? String(itemLabel).trim() : '';
    const baseMessage = label ? `${label} خریداری شد` : 'خرید با موفقیت انجام شد';
    const coinsPart = coins > 0 ? `؛ ${faNum(coins)} سکه به موجودی سکه‌ات اضافه شد` : '';
    const message = `${baseMessage}${coinsPart}.`;
    toast(`<i class="fas fa-check-circle ml-2"></i> ${message}`);
    storePurchaseNotice({ message, coinsAdded: coins, balance: balanceValue, itemLabel: label, reference, timestamp: Date.now() });
    renderShopPurchaseNotice();
  }

  function renderShopWalletTopup(){
    const card = $('#shop-wallet-topup');
    if (!card) return;
    const shop = getShopConfig();
    const quickEnabled = shop.enabled !== false && (shop.sections?.wallet !== false) && shop.quickTopup !== false;
    card.classList.toggle('hidden', !quickEnabled);
    if (!quickEnabled) return;

    const settings = getWalletTopupSettings();
    const packages = getNormalizedWalletPackages();
    const isOnline = online();

    const range = card.querySelector('[data-topup-range]');
    const input = card.querySelector('[data-topup-input]');
    const maxBtn = card.querySelector('[data-topup-max]');
    const presetsWrap = card.querySelector('[data-topup-presets]');
    const amountEl = card.querySelector('[data-topup-amount]');
    const coinsEl = card.querySelector('[data-topup-coins]');
    const limitsEl = card.querySelector('[data-topup-limits]');
    const suggestionEl = card.querySelector('[data-topup-suggestion]');
    const offlineEl = card.querySelector('[data-topup-offline]');
    const submitBtn = card.querySelector('[data-topup-submit]');

    const clampToStep = (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return settings.defaultAmount;
      const snapped = Math.round(numeric / settings.step) * settings.step;
      return clamp(snapped, settings.min, settings.max);
    };

    walletTopupState.amount = clampToStep(walletTopupState.amount ?? settings.defaultAmount);

    if (range){
      range.min = settings.min;
      range.max = settings.max;
      range.step = settings.step;
    }
    if (input){
      input.min = settings.min;
      input.max = settings.max;
      input.step = settings.step;
    }
    if (limitsEl){
      limitsEl.textContent = `حداقل ${faNum(settings.min)} و حداکثر ${faNum(settings.max)} تومان (گام‌های ${faNum(settings.step)} تومانی)`;
    }
    let lastRecommended = null;

    const updateAmount = (value) => {
      const next = clampToStep(value);
      walletTopupState.amount = next;
      if (range) range.value = String(next);
      if (input) input.value = String(next);
      if (amountEl) amountEl.textContent = `${faNum(next)} تومان`;
      lastRecommended = pickWalletPackageByAmount(next, packages);
      if (coinsEl){
        if (lastRecommended){
          coinsEl.innerHTML = `با این مبلغ می‌توانی بسته‌ای با حدود <span class="text-emerald-200 font-semibold">${faNum(lastRecommended.totalCoins)}</span> سکه تهیه کنی.`;
        } else {
          const bestRate = getBestWalletCoinRate(packages);
          if (bestRate > 0){
            const estimate = Math.round(next * bestRate);
            coinsEl.innerHTML = `تقریباً ${faNum(estimate)} سکه در دسترس خواهی داشت.`;
          } else {
          coinsEl.textContent = 'به محض فعال شدن بسته‌های سکه، می‌توانی از این مبلغ ذخیره‌شده استفاده کنی.';
          }
        }
      }
      if (suggestionEl){
        if (lastRecommended){
          const displayName = lastRecommended.displayName || `بسته ${faNum(lastRecommended.amount)} سکه`;
          suggestionEl.innerHTML = `پیشنهاد ما: <span class="text-emerald-200 font-bold">${displayName}</span> با قیمت ${faNum(lastRecommended.priceToman)} تومان نزدیک‌ترین گزینه به مبلغ انتخابی است.`;
        } else {
          suggestionEl.textContent = 'پس از ثبت مبلغ، در صفحه بعد بسته مناسب را انتخاب کن.';
        }
      }
    };

    if (presetsWrap){
      presetsWrap.innerHTML = '';
      settings.presets.forEach((value) => {
        const presetValue = clampToStep(value);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip bg-white/10 border border-white/20 hover:bg-white/15 transition text-xs flex items-center gap-2';
        btn.innerHTML = `<i class="fas fa-bolt text-emerald-300"></i><span>${faNum(presetValue)}</span><span>تومان</span>`;
        btn.addEventListener('click', () => updateAmount(presetValue));
        presetsWrap.appendChild(btn);
      });
    }

    if (range && !range.dataset.bound){
      range.dataset.bound = 'true';
      range.addEventListener('input', (event) => {
        updateAmount(event.target?.value ?? settings.defaultAmount);
      });
    }
    if (input && !input.dataset.bound){
      input.dataset.bound = 'true';
      input.addEventListener('input', () => {
        updateAmount(input.value);
      });
      input.addEventListener('blur', () => {
        input.value = String(walletTopupState.amount);
      });
    }
    if (maxBtn && !maxBtn.dataset.bound){
      maxBtn.dataset.bound = 'true';
      maxBtn.addEventListener('click', () => updateAmount(settings.max));
    }

    updateAmount(walletTopupState.amount);

    if (offlineEl){
      offlineEl.classList.toggle('hidden', isOnline);
    }
    card.classList.toggle('opacity-60', !isOnline);

    if (submitBtn){
      submitBtn.disabled = !isOnline;
      submitBtn.setAttribute('aria-disabled', isOnline ? 'false' : 'true');
      submitBtn.title = isOnline ? 'تایید مبلغ و رفتن به مرحله پرداخت' : 'برای ثبت مبلغ باید آنلاین باشی';
      if (!submitBtn.dataset.bound){
        submitBtn.dataset.bound = 'true';
        submitBtn.addEventListener('click', () => {
          if (!online()){ toast('<i class="fas fa-wifi-slash ml-2"></i>برای شارژ باید آنلاین باشی'); return; }
          const amount = walletTopupState.amount;
          const recommended = pickWalletPackageByAmount(amount, packages);
          walletTopupState.plannedAmount = amount;
          walletTopupRecommendation = recommended?.id || null;
          const parts = [`مبلغ ${faNum(amount)} تومان برای خرید بعدی ذخیره شد.`];
          if (recommended){
            const name = recommended.displayName || `بسته ${faNum(recommended.amount)} سکه`;
            parts.push(`در مرحله بعد، بسته ${name} با قیمت ${faNum(recommended.priceToman)} تومان را انتخاب کن.`);
          } else {
            parts.push('در مرحله بعد می‌توانی بسته مناسب را از بخش خرید سکه انتخاب کنی.');
          }
          toast(`<i class="fas fa-wallet ml-2"></i>${parts.join(' ')}`);
          navTo('wallet');
        });
      }
    }
  }

  function renderKeyPackages(){
    const grid = $('#shop-keys-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const shop = getShopConfig();
    const enabled = shop.enabled !== false && (shop.sections?.keys !== false);
    const packs = enabled ? (RemoteConfig?.pricing?.keys || []) : [];
    if (!enabled){
      const info = document.createElement('div');
      info.className = 'glass-dark rounded-2xl p-4 text-center opacity-80 col-span-full';
      info.textContent = 'بخش کلیدها غیرفعال شده است.';
      grid.appendChild(info);
      return;
    }
    if (!packs.length){
      const empty = document.createElement('div');
      empty.className = 'glass-dark rounded-2xl p-4 text-center opacity-80 col-span-full';
      empty.textContent = 'در حال حاضر بسته‌ای فعال نیست';
      grid.appendChild(empty);
      return;
    }
    let bestId = null;
    if (shop.promotions?.autoHighlight !== false){
      let bestRatio = -Infinity;
      packs.forEach((pkg) => {
        const ratio = pkg.priceGame > 0 ? (pkg.amount / pkg.priceGame) : 0;
        if (ratio > bestRatio) { bestRatio = ratio; bestId = pkg.id; }
      });
    }
    packs.forEach((pkg) => {
      const btn = document.createElement('button');
      btn.className = 'product-card glass-dark rounded-2xl p-3 border border-white/15 hover:bg-white/15 transition text-right min-h-[92px] flex flex-col justify-between relative';
      btn.dataset.buyKey = pkg.id;
      const cant = State.coins < pkg.priceGame;
      btn.disabled = cant;
      btn.title = cant ? 'سکهٔ بازی کافی نیست' : `خرید ${faNum(pkg.amount)} کلید`;
      if (pkg.badge) {
        const badge = document.createElement('div');
        badge.className = 'ribbon';
        badge.textContent = pkg.badge;
        btn.appendChild(badge);
      } else if (bestId && pkg.id === bestId) {
        const badge = document.createElement('div');
        badge.className = 'ribbon auto';
        badge.textContent = 'به‌صرفه‌ترین';
        btn.appendChild(badge);
      }
      const label = document.createElement('div');
      label.className = 'text-xs opacity-80';
      label.dataset.packageLabel = '';
      label.textContent = pkg.displayName || pkg.label || `بسته ${faNum(pkg.amount)} کلید`;
      btn.appendChild(label);
      const amountWrap = document.createElement('div');
      amountWrap.className = 'font-extrabold text-lg';
      const amountSpan = document.createElement('span');
      amountSpan.dataset.amount = '';
      amountSpan.textContent = faNum(pkg.amount);
      amountWrap.appendChild(amountSpan);
      amountWrap.appendChild(document.createTextNode(' کلید'));
      btn.appendChild(amountWrap);
      const priceWrap = document.createElement('div');
      priceWrap.className = 'text-xs opacity-90 flex items-center gap-1';
      priceWrap.innerHTML = `<i class="fas fa-coins text-yellow-300"></i> <span data-price>${faNum(pkg.priceGame)}</span> سکه`;
      btn.appendChild(priceWrap);
      if (pkg.description) {
        const desc = document.createElement('div');
        desc.className = 'text-[11px] opacity-70 mt-2 leading-snug';
        desc.textContent = pkg.description;
        btn.appendChild(desc);
      }
      grid.appendChild(btn);
    });
  }

  function renderVipPlans(){
    const container = $('#vip-plans');
    const template = $('#vip-plan-template');
    const meta = $('#vip-meta');
    if (!container || !template || !template.content?.firstElementChild) {
      renderShopVipIntro();
      return;
    }
    container.innerHTML = '';
    const plans = getActiveVipPlans();
    if (!plans.length) {
      const empty = document.createElement('div');
      empty.className = 'text-sm opacity-70 text-center bg-white/5 border border-white/10 rounded-2xl p-4';
      empty.textContent = 'پلنی برای خرید فعال نشده است.';
      container.appendChild(empty);
      if (meta) {
        meta.textContent = 'برای نمایش پلن‌های VIP ابتدا آن‌ها را در پنل مدیریت فعال کنید.';
      }
      renderShopVipIntro();
      return;
    }

    plans.forEach((plan) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.vipPlanCard = plan.tier;
      if (plan.featured) {
        node.classList.add('border-amber-300/40', 'shadow-lg', 'shadow-amber-500/20');
      }
      const nameEl = node.querySelector('[data-plan-name]');
      if (nameEl) nameEl.textContent = plan.displayName || plan.tier || 'اشتراک VIP';
      const periodEl = node.querySelector('[data-plan-period]');
      if (periodEl) periodEl.textContent = plan.period || '';
      const priceEl = node.querySelector('[data-plan-price]');
      if (priceEl) priceEl.textContent = formatVipPrice(plan);
      const badgeEl = node.querySelector('[data-plan-badge]');
      if (badgeEl) {
        if (plan.badge) {
          badgeEl.textContent = plan.badge;
          badgeEl.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold';
        } else {
          badgeEl.remove();
        }
      }
      const benefitsEl = node.querySelector('[data-plan-benefits]');
      if (benefitsEl) {
        benefitsEl.innerHTML = '';
        const benefits = Array.isArray(plan.benefits) ? plan.benefits.filter(Boolean) : [];
        if (benefits.length) {
          benefits.forEach((benefit) => {
            const li = document.createElement('li');
            li.textContent = benefit;
            benefitsEl.appendChild(li);
          });
        } else {
          const li = document.createElement('li');
          li.textContent = 'جزئیات مزایا به زودی اعلام می‌شود.';
          benefitsEl.appendChild(li);
        }
      }
      const btn = node.querySelector('[data-plan-button]');
      if (btn) {
        const label = plan.buttonText || 'خرید اشتراک';
        btn.textContent = label;
        btn.dataset.vipPlanButton = plan.tier;
        btn.setAttribute('aria-label', `${label} ${plan.displayName || plan.tier}`);
        btn.classList.remove('btn-primary', 'btn-secondary');
        btn.classList.add(plan.featured ? 'btn-primary' : 'btn-secondary');
        btn.addEventListener('click', () => startPurchaseVip(plan.tier, btn));
      }
      container.appendChild(node);
    });

    if (meta) {
      const summary = getShopConfig().vip || {};
      meta.innerHTML = '';
      if (summary.customNote) {
        const note = document.createElement('div');
        note.textContent = summary.customNote;
        meta.appendChild(note);
      }
      const tags = [];
      if (Number(summary.trialDays) > 0) tags.push(`دوره آزمایشی ${faNum(Math.round(Number(summary.trialDays)))} روز`);
      if (Number(summary.slots) > 0) tags.push(`ظرفیت ${faNum(Math.round(Number(summary.slots)))} نفر`);
      if (summary.autoRenew) tags.push('تمدید خودکار فعال');
      if (summary.autoApprove) tags.push('تایید فوری پس از پرداخت');
      const billingLabel = getVipBillingLabel(summary.billingCycle);
      if (billingLabel) tags.push(`صورتحساب ${billingLabel}`);
      if (tags.length) {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-wrap gap-2 mt-3 text-xs opacity-80 justify-end sm:justify-start';
        tags.forEach((label) => {
          const chip = document.createElement('span');
          chip.className = 'inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/15';
          chip.textContent = label;
          wrap.appendChild(chip);
        });
        meta.appendChild(wrap);
      }
      if (!meta.innerHTML.trim()) {
        meta.textContent = 'پلن مناسب خود را انتخاب کنید و فوراً مزایای VIP را فعال نمایید.';
      }
    }

    renderShopVipIntro();
  }

  // ===== Shop (Keys) =====
  function renderShop(){
    renderShopSectionsVisibility();
    renderShopHero();
    renderShopSupport();
    renderShopVipIntro();
    renderShopBalances();
    renderShopLowBalanceMessage();
    renderShopPurchaseNotice();
    renderShopWalletTopup();
    renderKeyPackages();
  }

  function applyShopSettingsToUI(){
    renderShop();
    renderVipPlans();
    renderWallet();
  }

  subscribeToAdminSettings((next) => {
    updateAdminSnapshot(next);
    applyGeneralSettingsToUI();
    applyShopSettingsToUI();
  });


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
  const shop = getShopConfig();
  const template = shop.messaging?.success || '';
  const successMsg = template
    ? template.replace(/\{amount\}/g, faNum(pack.amount)).replace(/\{price\}/g, faNum(pack.priceGame))
    : `${faNum(pack.amount)} کلید خریداری شد`;
  toast(`<i class="fas fa-check-circle ml-2"></i> ${successMsg}`);
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
  function renderWalletPromo(){
    const banner = $('#wallet-promo-banner');
    if (!banner) return;
    const shop = getShopConfig();
    const enabled = shop.enabled !== false && shop.sections?.wallet !== false;
    const promotions = shop.promotions || {};
    const parseDate = (value) => {
      if (!value) return null;
      const parsed = new Date(value);
      const time = parsed.getTime();
      return Number.isFinite(time) ? time : null;
    };
    const now = Date.now();
    const start = parseDate(promotions.startDate);
    const end = parseDate(promotions.endDate);
    const withinWindow = (!start || now >= start) && (!end || now <= end);
    let message = promotions.bannerMessage || '';
    if (!message && promotions.defaultDiscount > 0){
      message = `برای مدت محدود ${faNum(promotions.defaultDiscount)}٪ تخفیف روی بسته‌ها فعال است.`;
    }
    const shouldShow = enabled && withinWindow && !!message;
    banner.classList.toggle('hidden', !shouldShow);
    if (shouldShow){
      const textEl = banner.querySelector('[data-wallet-promo-text]');
      if (textEl) textEl.textContent = message;
    }
  }

  function renderWalletCustomPlan(){
    const hint = $('#wallet-custom-plan');
    if (!hint) return;
    const amount = walletTopupState.plannedAmount;
    if (!amount){
      hint.classList.add('hidden');
      hint.innerHTML = '';
      return;
    }

    const packs = getNormalizedWalletPackages();
    const recommended = walletTopupRecommendation
      ? packs.find((pkg) => pkg.id === walletTopupRecommendation)
      : pickWalletPackageByAmount(amount, packs);

    const amountLabel = `مبلغ انتخابی شما: <span class="font-bold text-white">${faNum(amount)}</span> تومان`;
    let followUp = '';
    if (recommended){
      const displayName = recommended.displayName || `بسته ${faNum(recommended.amount)} سکه`;
      followUp = `پیشنهاد ما انتخاب <span class="font-bold text-emerald-200">${displayName}</span> با قیمت ${faNum(recommended.priceToman)} تومان است.`;
    } else if (!packs.length){
      followUp = 'در حال حاضر بسته‌ای برای خرید فعال نیست، اما مبلغ ذخیره‌شده به محض فعال شدن بسته‌ها قابل استفاده خواهد بود.';
    } else {
      followUp = 'می‌توانی از بسته‌های موجود برای خرید فوری استفاده کنی.';
    }

    hint.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="space-y-1">
          <div class="font-semibold text-emerald-200 flex items-center gap-2"><i class="fas fa-bolt"></i><span>شارژ دلخواه آماده است</span></div>
          <div class="text-sm leading-6">${amountLabel}${followUp ? ` • ${followUp}` : ''}</div>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="btn btn-secondary px-4 text-xs whitespace-nowrap" data-clear-topup>
            <i class="fas fa-times ml-1"></i>انصراف
          </button>
        </div>
      </div>
    `;
    hint.classList.remove('hidden');

    const clearBtn = hint.querySelector('[data-clear-topup]');
    if (clearBtn && !clearBtn.dataset.bound){
      clearBtn.dataset.bound = 'true';
      clearBtn.addEventListener('click', () => {
        walletTopupState.plannedAmount = null;
        walletTopupRecommendation = null;
        renderWallet();
        renderShopWalletTopup();
      });
    }
  }

  function buildPackages(){
    const grid = $('#pkg-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const shop = getShopConfig();
    const enabled = shop.enabled !== false && shop.sections?.wallet !== false;
    if (!enabled){
      grid.innerHTML = `<div class="glass-dark rounded-2xl p-4 text-center opacity-80">خرید سکه در حال حاضر فعال نیست.</div>`;
      $('#wallet-offline')?.classList.add('hidden');
      return;
    }

    const packs = getNormalizedWalletPackages();

    if (walletTopupRecommendation && !packs.some((pkg) => pkg.id === walletTopupRecommendation)){
      walletTopupRecommendation = null;
    }

    if (!packs.length){
      grid.innerHTML = `<div class="glass-dark rounded-2xl p-4 text-center opacity-80">در حال حاضر بسته‌ای موجود نیست</div>`;
      $('#wallet-offline')?.classList.toggle('hidden', online());
      return;
    }

    let highlightId = null;
    if (shop.promotions?.autoHighlight !== false){
      let bestScore = -Infinity;
      packs.forEach((pkg) => {
        const score = pkg.priceToman > 0 ? (pkg.totalCoins / pkg.priceToman) : 0;
        if (score > bestScore){
          bestScore = score;
          highlightId = pkg.id;
        }
      });
    }

    let recommendedId = walletTopupRecommendation;
    if (!recommendedId && walletTopupState.plannedAmount){
      recommendedId = pickWalletPackageByAmount(walletTopupState.plannedAmount, packs)?.id || null;
    }

    packs.forEach((pkg) => {
      const card = document.createElement('div');
      card.className = 'glass-dark rounded-2xl p-4 card-hover flex flex-col justify-between relative h-full';
      const ribbon = pkg.badge
        ? `<div class="ribbon">${pkg.badge}</div>`
        : (highlightId && pkg.id === highlightId ? '<div class="ribbon auto">به‌صرفه‌ترین</div>' : '');
      const bonusLine = pkg.bonus
        ? `<div class="text-xs text-emerald-300 mt-1"><i class="fas fa-gift ml-1"></i> ${faNum(pkg.bonus)}٪ هدیه</div>`
        : '';
      const paymentChip = pkg.paymentMethod
        ? `<span class="chip bg-white/10 border border-white/20">${pkg.paymentMethod}</span>`
        : '';
      const description = pkg.description
        ? `<div class="text-xs opacity-70 mt-2 leading-6">${pkg.description}</div>`
        : '';
      card.innerHTML = `
        ${ribbon}
        <div class="pkg-card-body">
          <div class="pkg-card-info">
            <div class="pkg-card-header">
              <div>
                <div class="text-sm opacity-80">${pkg.displayName || `بسته ${faNum(pkg.amount)} سکه`}</div>
                <div class="text-2xl font-extrabold mt-1">${faNum(pkg.amount)} سکه</div>
                ${bonusLine}
              </div>
              <div class="pkg-card-meta">
                <span class="pkg-card-meta-label">دریافتی کل</span>
                <span class="pkg-card-meta-value">${faNum(pkg.totalCoins)}</span>
                ${paymentChip ? `<span class="pkg-card-meta-chip">${paymentChip}</span>` : ''}
              </div>
            </div>
            <div class="pkg-card-price">
              <i class="fas fa-receipt"></i>
              <span>قیمت: ${faNum(pkg.priceToman)} تومان</span>
            </div>
            ${description}
          </div>
          <div class="pkg-payment-footer">
            <div class="pkg-secure-line">
              <span class="pkg-secure-icon"><i class="fas fa-shield-check"></i></span>
              <div class="pkg-secure-copy">
                <span class="pkg-secure-title">پرداخت امن آنلاین</span>
                <span class="pkg-secure-sub">تسویه آنی سکه پس از تایید تراکنش</span>
              </div>
            </div>
            <button class="btn btn-primary pkg-buy-btn buy-pkg" data-id="${pkg.id}" data-price="${pkg.priceToman}">
              <i class="fas fa-lock ml-1"></i> پرداخت امن ${faNum(pkg.priceToman)} تومان
            </button>
          </div>
        </div>
      `;
      if (recommendedId && pkg.id === recommendedId){
        card.classList.add('ring-2', 'ring-emerald-400/80', 'shadow-lg', 'shadow-emerald-500/20');
        card.dataset.walletRecommendation = 'true';
        const badge = document.createElement('span');
        badge.className = 'chip absolute bottom-4 right-4 bg-emerald-400/90 text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-lg';
        badge.innerHTML = '<i class="fas fa-hand-point-up"></i><span>پیشنهاد شما</span>';
        card.appendChild(badge);
      }
      const btn = card.querySelector('.buy-pkg');
      if (btn){
        btn.setAttribute('aria-label', `خرید بسته ${faNum(pkg.amount)} سکه`);
      }
      grid.appendChild(card);
    });

    const walletBalance = $('#wallet-balance');
    if (walletBalance) {
      walletBalance.textContent = (Server.wallet.coins == null ? '—' : faNum(Server.wallet.coins));
    }
    const walletOffline = $('#wallet-offline');
    if (walletOffline) {
      walletOffline.classList.toggle('hidden', online());
    }
  }

  function renderWallet(){
    renderWalletPromo();
    renderWalletCustomPlan();
    buildPackages();
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

  // Update modal content
  $('#payment-package-name').textContent = `بسته ${faNum(pkg.amount)} سکه`;
  $('#payment-coins-amount').textContent = `${faNum(totalCoins)} سکه`;
  $('#payment-price').textContent = `${faNum(priceToman)} تومان`;

  const gatewayInfo = $('#payment-gateway-info');
  if (gatewayInfo){
    const title = gatewayInfo.querySelector('.payment-gateway-title');
    const sub = gatewayInfo.querySelector('.payment-gateway-sub');
    if (title) title.textContent = 'انتقال به درگاه پرداخت امن شاپرک';
    if (sub) sub.textContent = 'پس از تکمیل پرداخت، سکه‌ها به صورت خودکار به حساب شما اضافه می‌شوند.';
  }

  // Update button text based on balance
  const confirmBtn = $('#payment-confirm-btn');
  if (!confirmBtn){
    return;
  }
  confirmBtn.innerHTML = '<i class="fas fa-shield-halved ml-2"></i> رفتن به درگاه پرداخت';
  confirmBtn.dataset.defaultHtml = confirmBtn.innerHTML;

  // Set up click handler
  confirmBtn.onclick = () => handlePaymentConfirm(pkg.id, priceToman);

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

async function handlePaymentConfirm(packageId, priceToman) {
  const confirmBtn = $('#payment-confirm-btn');
  const cancelBtn = $('#payment-cancel-btn');
  const defaultHtml = confirmBtn?.dataset?.defaultHtml || confirmBtn?.innerHTML || '';
  const loadingHtml = '<i class="fas fa-spinner fa-spin ml-2"></i> در حال اتصال به درگاه...';

  if (confirmBtn){
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = loadingHtml;
  }
  if (cancelBtn){
    cancelBtn.disabled = true;
  }

  try {
    toast('<i class="fas fa-shield-halved ml-2"></i> در حال انتقال به درگاه پرداخت امن...');
    closePaymentModal();
    await startExternalPayment(packageId, priceToman);
  } finally {
    if (confirmBtn){
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = defaultHtml;
    }
    if (cancelBtn){
      cancelBtn.disabled = false;
    }
  }
}

async function startExternalPayment(packageId, priceToman){
  try {
    const sessionId = ensurePaymentSessionId();
    const returnUrl = `${location.origin}${location.pathname}`;
    const payload = {
      packageId,
      sessionId,
      returnUrl,
      userId: State.user?.id && State.user.id !== 'guest' ? State.user.id : ''
    };

    await logEvent('payment_gateway_redirect', {
      packageId,
      priceToman,
      reason: 'insufficient_balance',
      sessionId
    });

    const res = await Net.jpost('/api/payments/zarinpal/create', payload);
    if (!res || res.ok === false || !res.data){
      toast('<i class="fas fa-triangle-exclamation ml-2"></i> ایجاد تراکنش ناموفق بود.');
      return;
    }

    const { paymentId, paymentUrl, authority } = res.data;
    if (!paymentId || !paymentUrl){
      toast('<i class="fas fa-triangle-exclamation ml-2"></i> پاسخ درگاه نامعتبر است.');
      return;
    }

    storePendingPayment({ paymentId, packageId, sessionId, authority, priceToman });
    window.location.href = paymentUrl;
  } catch (err) {
    toast('<i class="fas fa-triangle-exclamation ml-2"></i> اتصال به درگاه پرداخت ممکن نشد.');
  }
}

async function handleGatewayReturn(statusParam, paymentId, extra = {}){
  try {
    const pending = readPendingPayment();
    const sessionId = pending?.sessionId || extra.session || ensurePaymentSessionId();
    const endpoint = new URL(`/api/payments/${paymentId}/status`, location.origin);
    if (sessionId) endpoint.searchParams.set('sessionId', sessionId);

    const res = await Net.jget(endpoint.toString());
    if (!res || res.ok === false || !res.data){
      toast('<i class="fas fa-triangle-exclamation ml-2"></i> بررسی وضعیت پرداخت ناموفق بود.');
      clearPendingPayment();
      await logEvent('payment_status_failed', { paymentId, status: statusParam || 'unknown' });
      return;
    }

    const data = res.data;
    const packageId = data.package?.id || pending?.packageId || null;
    const packageSnapshot = (data.package && typeof data.package === 'object' && Object.keys(data.package).length)
      ? data.package
      : ((RemoteConfig.pricing.coins || []).find(p => p.id === packageId) || null);
    const packageTitle = packageSnapshot?.displayName
      || packageSnapshot?.label
      || (packageSnapshot?.amount ? `بسته ${faNum(packageSnapshot.amount)} سکه` : 'بسته سکه');
    const refId = data.refId || extra.refId || '';

    if (data.status === 'paid') {
      if (Number.isFinite(data.walletBalance)) {
        Server.wallet.coins = Number(data.walletBalance);
      } else if (Number.isFinite(data.coins)) {
        const current = Number(Server.wallet.coins) || 0;
        Server.wallet.coins = current + Number(data.coins);
      }

      renderHeader();
      renderDashboard();
      renderShop();
      renderWallet();

      const coinsAwarded = Number.isFinite(data.coins) ? Number(data.coins) : (packageSnapshot?.totalCoins || packageSnapshot?.amount || 0);

      openReceipt({
        title: 'پرداخت با موفقیت انجام شد',
        rows: [
          ['کد پیگیری', refId || '—'],
          ['آیتم', packageTitle],
          ['سکه دریافتی', faNum(coinsAwarded)],
          ['سکه‌های فعلی', faNum(Server.wallet.coins || 0)]
        ]
      });
      announcePurchaseSuccess({ coinsAdded: coinsAwarded, balance: Server.wallet.coins, itemLabel: packageTitle, reference: refId || '' });
      SFX.coin();
      shootConfetti();
      await logEvent('payment_status_success', { paymentId, refId, packageId });
    } else if (data.status === 'canceled') {
      toast('<i class="fas fa-circle-xmark ml-2"></i> پرداخت توسط کاربر لغو شد.');
      await logEvent('payment_status_canceled', { paymentId });
    } else {
      const message = data.message || extra.message || 'پرداخت ناموفق بود.';
      toast(`<i class="fas fa-triangle-exclamation ml-2"></i> ${message}`);
      await logEvent('payment_status_failed', { paymentId, status: data.status, message });
    }
  } catch (err) {
    toast('<i class="fas fa-triangle-exclamation ml-2"></i> خطا در پردازش نتیجه پرداخت.');
  } finally {
    clearPendingPayment();
  }
}

  function showPayConfirm(btn){
    const pkgId = btn.dataset.id;
    const price = parseFloat(btn.dataset.price||'0');
    const wallet = Server.wallet.coins||0;
    $('#pay-popup-message').innerHTML = `قیمت بسته: ${faNum(price)} تومان`;
    $('#pay-popup-wallet').innerHTML = `بودجه خرید: ${faNum(wallet)} تومان`;
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
    const plansAvailable = hasActiveVipPlans();
    if (!plansAvailable){
      meta.innerHTML = '<div class="text-sm opacity-80">پلن فعالی در دسترس نیست.</div>';
    } else if(s.active){
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

  const txnId = res?.data?.txnId || null;

  if(!txnId){
    btn.disabled = false;
    btn.innerHTML = normalLabel;
    toast('<i class="fas fa-triangle-exclamation ml-2"></i> ایجاد تراکنش ناموفق');
    await logEvent('purchase_failed', { kind:'coins', pkgId, reason:'create_failed' });
    return;
  }

  // Poll wallet until updated or timeout
  const before = Server.wallet.coins;
  let ok=false;
  const walletData = res?.data?.wallet;
  if(walletData && typeof walletData === 'object'){
    const walletCoins = Number(walletData.coins);
    if(Number.isFinite(walletCoins)){
      Server.wallet.coins = walletCoins;
      const hdrWallet = $('#hdr-wallet');
      if(hdrWallet) hdrWallet.textContent = faNum(Server.wallet.coins);
      const statWallet = $('#stat-wallet');
      if(statWallet) statWallet.textContent = faNum(Server.wallet.coins);
      const balanceEl = $('#wallet-balance');
      if(balanceEl) balanceEl.textContent = faNum(Server.wallet.coins);
      if(before==null || walletCoins>before){ ok=true; }
    }
    if(walletData.lastTxnId){
      Server.wallet.lastTxnId = walletData.lastTxnId;
    }
  }
  if(!ok){
    for(let i=0;i<20;i++){
      await wait(1000);
      await refreshWallet();
      if(Server.wallet.coins!=null && (before==null || Server.wallet.coins>before)){ ok=true; break; }
    }
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
        ['سکه‌های فعلی', faNum(Server.wallet.coins)]
      ]
    });
    const delta = (Server.wallet.coins != null && before != null) ? (Server.wallet.coins - before) : 0;
    const coinsAdded = Math.max(0, Number.isFinite(delta) ? delta : 0) || Math.max(pkg.totalCoins || 0, pkg.amount || 0);
    const packageLabel = pkg.displayName || `بسته ${faNum(pkg.amount)} سکه`;
    announcePurchaseSuccess({ coinsAdded, balance: Server.wallet.coins, itemLabel: packageLabel, reference: txnId });
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
  
  async function startPurchaseVip(tier, sourceButton){
    if(!online()){ toast('<i class="fas fa-wifi-slash ml-2"></i> آفلاین هستی'); return; }
    const pricing = RemoteConfig.pricing.vip[tier];
    if(!pricing){ toast('پلن یافت نشد'); return; }
    const idem = genIdemKey();
    const btn = sourceButton || document.querySelector(`[data-vip-plan-button="${tier}"]`);
    const planName = pricing.displayName || pricing.name || tier;
    const prevHTML = btn ? btn.innerHTML : null;
    const prevDisabled = btn ? btn.disabled : false;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i> ایجاد تراکنش...';
    }
    const priceCents = Number.isFinite(pricing.priceCents)
      ? Number(pricing.priceCents)
      : (Number.isFinite(pricing.priceToman) && RemoteConfig?.pricing?.usdToToman
          ? Math.round((pricing.priceToman / RemoteConfig.pricing.usdToToman) * 100)
          : undefined);
    await logEvent('purchase_initiated', { kind:'vip', tier, priceCents, priceToman: pricing.priceToman ?? null, idem });
    const res = await Net.jpost('/api/payments/create', { idempotencyKey: idem, type:'vip', tier });
    const txnId = res?.data?.txnId || null;
    if(!txnId){
      if (btn) {
        btn.disabled = prevDisabled;
        btn.innerHTML = prevHTML;
      }
      toast('<i class="fas fa-triangle-exclamation ml-2"></i> ایجاد تراکنش VIP ناموفق');
      await logEvent('purchase_failed', { kind:'vip', tier, reason:'create_failed' });
      return;
    }
    const walletData = res?.data?.wallet;
    if(walletData && typeof walletData === 'object'){
      const walletCoins = Number(walletData.coins);
      if(Number.isFinite(walletCoins)){
        Server.wallet.coins = walletCoins;
        const hdrWallet = $('#hdr-wallet');
        if(hdrWallet) hdrWallet.textContent = faNum(Server.wallet.coins);
        const statWallet = $('#stat-wallet');
        if(statWallet) statWallet.textContent = faNum(Server.wallet.coins);
        const balanceEl = $('#wallet-balance');
        if(balanceEl) balanceEl.textContent = faNum(Server.wallet.coins);
      }
      if(walletData.lastTxnId){
        Server.wallet.lastTxnId = walletData.lastTxnId;
      }
    }
    // Poll subscription
    let ok=false;
    for(let i=0;i<20;i++){ await wait(1200); await refreshSubscription(); if(Server.subscription.active){ ok=true; break; } }
    if (btn) {
      btn.disabled = prevDisabled;
      btn.innerHTML = prevHTML;
    }
    if(ok){
      await logEvent('purchase_succeeded', { kind:'vip', tier, txnId });
      await logEvent('vip_activated', { tier, expiry: Server.subscription.expiry||null });
      openReceipt({ title:'اشتراک فعال شد 🎉', rows:[
        ['کد تراکنش', txnId],
        ['پلن', planName],
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
      const allowedTrigger = 'app_open';
      if(trigger !== allowedTrigger) return;
      if(!this.enabled() || !RemoteConfig.ads.placements.interstitial) return;
      const now = Date.now();
      const storageKey = 'iquiz_interstitial_last_shown';
      const dayMs = 24 * 60 * 60 * 1000;
      let lastShown = 0;
      try {
        const stored = window.localStorage?.getItem(storageKey);
        if(stored) lastShown = Number(stored) || 0;
      } catch {}
      if(lastShown && (now - lastShown) < dayMs) return;
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
      try { window.localStorage?.setItem(storageKey, String(now)); } catch {}
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
  
  // ===== Setup Sheet =====
  function openSetupSheet(){
    buildSetupFromAdmin();
    const range = $('#range-count');
    const countLabel = $('#setup-count');
    if(range && countLabel){ countLabel.textContent = faNum(range.value || range.getAttribute('value') || 5); }
    openSheet();
  }
  function openSheet(){
    const sheet = $('#sheet-setup');
    sheet?.classList.add('show');
    sheet?.setAttribute('aria-hidden', 'false');
  }
  function closeSheet(){
    const sheet = $('#sheet-setup');
    sheet?.classList.remove('show');
    sheet?.setAttribute('aria-hidden', 'true');
  }
  
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
  async function shareResult(){
    const ok = State.quiz.results.filter(r=>r.ok).length, total=State.quiz.results.length;
    const appName = getAppName();
    const text = `من در ${appName} ${faNum(ok)}/${faNum(total)} پاسخ درست دادم و ${faNum(State.quiz.sessionEarned)} امتیاز گرفتم!`;
    const payload = `res_${State.user.id || 'guest'}`;
    const { web } = buildTelegramStartLinks(payload);
    try{
      if (navigator.share) {
        await navigator.share({
          title: 'نتیجه مسابقه',
          text: text,
          url: web
        });
        toast('<i class="fas fa-check-circle ml-2"></i>نتیجه ارسال شد');
      } else {
        await shareOnTelegram(web, text);
      }
    }catch{
      await shareOnTelegram(web, text);
    }
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
    const payload = `ref_${State.user.id || 'guest'}`;
    const { web, app } = buildTelegramStartLinks(payload);
    const appName = getAppName();
    const codeValue = State.referral?.code || '';
    const shareText = codeValue
      ? `با لینک من در ${appName} ثبت‌نام کن و کد ${codeValue} را وارد کن؛ بعد از اولین کوییز هر دو ${rewardLabel} سکه هدیه می‌گیریم.`
      : `با لینک من در ${appName} ثبت‌نام کن؛ بعد از اولین کوییز هر دو ${rewardLabel} سکه هدیه می‌گیریم.`;
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
      linkEl.value = web;
      linkEl.dataset.value = web;
      linkEl.dataset.appLink = app;
    }

    const shareBtn = $('#invite-share-telegram');
    if (shareBtn) {
      shareBtn.dataset.link = web;
      shareBtn.dataset.text = shareText;
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

  function cleanupQuitModalKeyHandler(){
    if(quitModalKeyHandler){
      document.removeEventListener('keydown', quitModalKeyHandler);
      quitModalKeyHandler = null;
    }
  }

  function resumeQuizTimerAfterQuitPrompt(){
    if(!quizTimerPausedForQuit) return;
    quizTimerPausedForQuit = false;
    if(!State.quiz?.inProgress) return;
    if(State.quiz.remain <= 0) return;
    startQuizTimerCountdown();
  }

  function updateQuitConfirmSummary(){
    const results = Array.isArray(State.quiz?.results) ? State.quiz.results : [];
    const answered = results.length;
    const correct = results.reduce((sum, item)=> sum + (item?.ok ? 1 : 0), 0);
    const earned = Math.max(0, Number(State.quiz?.sessionEarned || 0));
    const total = Array.isArray(State.quiz?.list) ? State.quiz.list.length : answered;

    const answeredEl = $('#quit-answered-count');
    if(answeredEl) answeredEl.textContent = faNum(answered);

    const correctEl = $('#quit-correct-count');
    if(correctEl) correctEl.textContent = faNum(correct);

    const earnedEl = $('#quit-earned-score');
    if(earnedEl) earnedEl.textContent = faNum(earned);

    const summaryTextEl = $('#quit-summary-text');
    if(summaryTextEl){
      if(answered === 0){
        summaryTextEl.textContent = 'هنوز به هیچ سؤالی پاسخ نداده‌ای. با خروج، مسابقه بدون امتیاز پایان خواهد یافت.';
      }else if(total > answered){
        summaryTextEl.textContent = `تا این لحظه به ${faNum(answered)} سؤال از ${faNum(total)} پاسخ داده‌ای. با خروج، مسابقه همین حالا پایان می‌یابد.`;
      }else{
        summaryTextEl.textContent = `تا این لحظه به ${faNum(answered)} سؤال پاسخ داده‌ای. با خروج، مسابقه همین حالا پایان می‌یابد.`;
      }
    }
  }

  function bindQuitModalEscape(){
    cleanupQuitModalKeyHandler();
    quitModalKeyHandler = (event)=>{
      if(event.key === 'Escape'){
        event.preventDefault();
        cleanupQuitModalKeyHandler();
        closeModal('#modal-quit-confirm');
        resumeQuizTimerAfterQuitPrompt();
      }
    };
    document.addEventListener('keydown', quitModalKeyHandler);
  }

  function openQuitConfirmModal(){
    if(!State.quiz?.inProgress){
      quizTimerPausedForQuit = false;
      navTo('dashboard');
      return;
    }
    updateQuitConfirmSummary();
    quizTimerPausedForQuit = true;
    if(State.quiz?.timer){
      clearInterval(State.quiz.timer);
      State.quiz.timer = null;
    }
    openModal('#modal-quit-confirm');
    bindQuitModalEscape();
    setTimeout(()=> $('#confirm-quit')?.focus({ preventScroll:true }), 80);
  }

  function handleQuitConfirm(){
    cleanupQuitModalKeyHandler();
    closeModal('#modal-quit-confirm');
    const confirmBtn = $('#confirm-quit');
    if(confirmBtn) confirmBtn.disabled = true;
    const hadQuiz = !!State.quiz?.inProgress;
    quizTimerPausedForQuit = false;
    if(State.quiz.timer){
      clearInterval(State.quiz.timer);
      State.quiz.timer = null;
    }
    if(hadQuiz){
      cancelDuelSession('user_cancelled');
      endQuiz();
    }else{
      navTo('dashboard');
    }
    if(confirmBtn){
      setTimeout(()=>{ confirmBtn.disabled = false; }, 600);
    }
  }

  function handleQuitCancel(){
    cleanupQuitModalKeyHandler();
    closeModal('#modal-quit-confirm');
    resumeQuizTimerAfterQuitPrompt();
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
  $('#btn-quit')?.addEventListener('click', openQuitConfirmModal);
  $('#btn-continue-quiz')?.addEventListener('click', handleQuitCancel);
  $('#confirm-quit')?.addEventListener('click', handleQuitConfirm);
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
  $('#invite-share-telegram')?.addEventListener('click', async (event) => {
    event.preventDefault();
    const btn = event.currentTarget;
    const link = btn?.dataset?.link || $('#invite-link')?.value || '';
    const text = btn?.dataset?.text || '';
    if (!link) {
      toast('لینک دعوت آماده نیست');
      return;
    }
    await shareOnTelegram(link, text);
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
    openModal('#modal-profile');
  });
  $('[data-close="#modal-profile"]')?.addEventListener('click', ()=>closeModal('#modal-profile'));
  $('#btn-save-profile')?.addEventListener('click', ()=>{
    const n = $('#inp-name').value.trim();
    if(n) State.user.name = n;

    // استان قابل تغییر نیست، بنابراین مقدار آن ذخیره نمی‌شود

    saveState();
    renderHeader();
    renderDashboard();
    closeModal('#modal-profile');
    toast('ذخیره شد ✅');
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
  const duelFriends = normalizeDuelFriendsList(State.duelFriends);
  State.duelFriends = duelFriends;

  function applyDuelOverviewData(overview = {}, options = {}) {
    const invites = Array.isArray(overview.invites) ? overview.invites : [];
    const pending = Array.isArray(overview.pending) ? overview.pending : [];
    const history = Array.isArray(overview.history) ? overview.history : [];
    const stats = overview.stats || {};

    State.duelInvites = invites.map((invite) => ({ ...invite }));
    State.pendingDuels = pending.map((duel) => ({ ...duel }));
    State.duelHistory = history.map((entry) => ({ ...entry }));
    State.duelWins = Number.isFinite(stats.wins) ? Math.max(0, Math.round(stats.wins)) : 0;
    State.duelLosses = Number.isFinite(stats.losses) ? Math.max(0, Math.round(stats.losses)) : 0;
    State.duelDraws = Number.isFinite(stats.draws) ? Math.max(0, Math.round(stats.draws)) : 0;

    if (!options.skipSave) saveState();
    renderDuelInvites({ skipPrune: true, silent: true });
    if (!options.skipRenderDashboard) renderDashboard();
  }

  async function refreshDuelOverview(options = {}) {
    try {
      const res = await Api.duelOverview({
        userId: State.user?.id,
        userName: State.user?.name,
        avatar: State.user?.avatar
      });
      if (res?.ok && res.data) {
        applyDuelOverviewData(res.data, { skipRenderDashboard: options.skipRenderDashboard });
      }
    } catch (error) {
      console.warn('Failed to refresh duel overview', error);
    }
  }

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
    return getActiveCategories();
  }

  function pickOpponentCategory(roundIndex){
    if (!DuelSession) return null;
    const round = DuelSession.rounds?.[roundIndex];
    if (round && round.categoryId) {
      return {
        id: round.categoryId,
        title: round.categoryTitle || 'دسته‌بندی'
      };
    }
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
    const round = DuelSession.rounds?.[roundIndex];
    const serverOptions = Array.isArray(round?.categoryOptions) ? round.categoryOptions.filter(Boolean) : [];
    let categories = [];
    if (serverOptions.length) {
      categories = serverOptions.map((opt, idx) => ({
        id: opt.id,
        title: opt.title || opt.name || `دسته ${faNum(idx + 1)}`,
        description: opt.description || ''
      }));
    } else {
      const available = getDuelCategories();
      categories = available.map((cat, idx) => ({
        id: cat.id,
        title: cat.title || cat.name || `دسته ${faNum(idx + 1)}`,
        description: cat.description || ''
      }));
    }

    if (categories.length === 0){
      cancelDuelSession('no_category');
      return;
    }

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
        const title = cat.title || `دسته ${faNum(idx+1)}`;
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

    if (!DuelSession.consumedResource && !hasRemainingGameResource('duels')) {
      toast('سهمیه نبردهای امروزت برای نبرد تن‌به‌تن به پایان رسیده است.');
      logEvent('duel_limit_blocked', { opponent: DuelSession.opponent?.name, round: roundIndex + 1 });
      cancelDuelSession('limit_reached');
      navTo('duel');
      return false;
    }

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
    } else if (!difficultyValue){
      const fallbackDiffs = getEffectiveDiffs();
      if (fallbackDiffs.length){
        difficultyValue = fallbackDiffs[0].value;
        difficultyLabel = fallbackDiffs[0].label || fallbackDiffs[0].value;
      }
    }
    DuelSession.difficulty = { value: difficultyValue, label: difficultyLabel };

    if (round.chooser === 'you' && !round.serverCategoryConfirmed) {
      try {
        const res = await Api.duelAssignCategory(DuelSession.id, roundIndex, {
          userId: State.user?.id,
          userName: State.user?.name,
          categoryId,
          categoryTitle: catTitle
        });
        if (res?.meta?.overview) applyDuelOverviewData(res.meta.overview, { skipRenderDashboard: true });
        if (res?.data?.round) {
          round.categoryId = res.data.round.categoryId || round.categoryId;
          round.categoryTitle = res.data.round.categoryTitle || round.categoryTitle;
          round.totalQuestions = res.data.round.totalQuestions || round.totalQuestions;
        }
        round.serverCategoryConfirmed = true;
      } catch (error) {
        console.error('Failed to assign duel category', error);
        toast('برای این دسته‌بندی سؤال کافی موجود نیست');
        return false;
      }
    }

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

    navTo('quiz');

    DuelSession.started = true;
    DuelSession.currentRoundIndex = roundIndex;
    const opponentName = DuelSession.opponent?.name || '';
    if (!DuelSession.consumedResource){
      const allowed = useGameResource('duels');
      if (!allowed) {
        toast('سهمیه نبردهای امروزت برای نبرد تن‌به‌تن به پایان رسیده است.');
        logEvent('duel_limit_blocked', { opponent: opponentName, round: roundIndex + 1, phase: 'post_start' });
        cancelDuelSession('limit_reached');
        navTo('duel');
        return false;
      }
      DuelSession.consumedResource = true;
      logEvent('duel_start', { opponent: opponentName, round: roundIndex + 1, category: catTitle });
    } else {
      logEvent('duel_round_start', { opponent: opponentName, round: roundIndex + 1, category: catTitle });
    }

    State.duelOpponent = DuelSession.opponent;
    $('#duel-opponent-name').textContent = opponentName;
    $('#duel-banner').classList.remove('hidden');
    saveState();

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

  async function completeDuelRound(correctCount, earnedPoints){
    if (!DuelSession || !State.duelOpponent) return 'none';
    const roundIdx = DuelSession.currentRoundIndex || 0;
    const round = DuelSession.rounds?.[roundIdx];
    if (!round) return 'none';

    const totalQuestions = State.quiz.results.length || State.quiz.list.length || round.totalQuestions || DUEL_QUESTIONS_PER_ROUND;
    const yourCorrect = correctCount;
    const yourWrong = Math.max(0, totalQuestions - yourCorrect);
    const yourEarned = Number.isFinite(earnedPoints) ? earnedPoints : State.quiz.sessionEarned;

    round.player = { correct: yourCorrect, wrong: yourWrong, earned: yourEarned };
    round.totalQuestions = totalQuestions;

    try {
      const res = await Api.duelSubmitRound(DuelSession.id, roundIdx, {
        userId: State.user?.id,
        userName: State.user?.name,
        categoryId: round.categoryId,
        categoryTitle: round.categoryTitle,
        correct: yourCorrect,
        wrong: yourWrong,
        earned: yourEarned,
        totalQuestions
      });

      if (res?.meta?.overview) applyDuelOverviewData(res.meta.overview, { skipRenderDashboard: true });

      const result = res?.data || {};
      if (result.round) {
        round.player = result.round.player || round.player;
        round.opponent = result.round.opponent || round.opponent;
        round.totalQuestions = result.round.totalQuestions || round.totalQuestions;
      }

      const opponentStats = round.opponent || { correct: 0, wrong: 0, earned: 0 };

      if (result.totals) {
        DuelSession.totalYourScore = Number(result.totals.you?.earned) || yourEarned;
        DuelSession.totalOpponentScore = Number(result.totals.opponent?.earned) || opponentStats.earned;
      } else {
        DuelSession.totalYourScore += yourEarned;
        DuelSession.totalOpponentScore += opponentStats.earned || 0;
      }

      logEvent('duel_round_end', {
        opponent: DuelSession.opponent?.name,
        round: roundIdx + 1,
        your_correct: yourCorrect,
        opponent_correct: opponentStats.correct
      });

      toast(`راند ${faNum(roundIdx + 1)} به پایان رسید: ${faNum(round.player?.correct || 0)} درست در برابر ${faNum(opponentStats.correct || 0)}`);

      if (result.summary && result.status === 'finished') {
        DuelSession.lastSummary = result.summary;
        return 'finished';
      }

      if (result.status === 'next') {
        const nextIndex = roundIdx + 1;
        if (nextIndex < DuelSession.rounds.length) {
          DuelSession.currentRoundIndex = nextIndex;
          setTimeout(() => promptDuelRoundCategory(nextIndex), 1200);
        }
        return 'next';
      }

      return result.status || 'next';
    } catch (error) {
      console.error('Failed to submit duel round', error);
      toast('ثبت نتیجه نبرد ممکن نشد، دوباره تلاش کن');
      return 'error';
    }
  }

  function finalizeDuelResults(summary){
    if (!DuelSession) return;
    const summaryData = summary || DuelSession.lastSummary || null;
    const opponent = summaryData?.opponent || DuelSession.opponent || {};
    const youName = State.user?.name || 'شما';
    const oppName = opponent.name || 'حریف';

    const totals = summaryData?.totals || DuelSession.rounds.reduce((acc, round) => {
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
    } else if (totals.you.earned < totals.opp.earned) {
      winnerText = `${oppName} با مجموع ${faNum(totals.opp.earned)} امتیاز پیروز شد!`;
    }

    const rewardSummary = summaryData?.rewards && typeof summaryData.rewards === 'object' ? summaryData.rewards : {};
    const duelOutcome = summaryData?.outcome || (totals.you.earned > totals.opp.earned
      ? 'win'
      : totals.you.earned < totals.opp.earned
        ? 'loss'
        : 'draw');
    const duelRewardConfig = normalizeDuelRewardsConfig(rewardSummary.config || getDuelRewardConfig());
    const alreadyApplied = rewardSummary?.userReward?.applied === true;
    const rewardResult = applyDuelOutcomeRewards(
      duelOutcome,
      duelRewardConfig,
      State,
      {
        apply: !alreadyApplied,
        opponentOutcome: rewardSummary?.opponentOutcome,
      }
    );

    rewardSummary.config = rewardResult.config;
    rewardSummary.userOutcome = rewardResult.outcome;
    rewardSummary.opponentOutcome = rewardResult.opponentOutcome;
    rewardSummary.userReward = { ...rewardResult.userReward, applied: true };
    rewardSummary.opponentReward = { ...rewardResult.opponentReward };
    if (summaryData) {
      summaryData.rewards = rewardSummary;
    }

    if (!alreadyApplied && rewardResult.userReward.coins + rewardResult.userReward.score > 0) {
      renderHeader();
      renderTopBars();
      saveState();
    }

    if (Array.isArray(State.pendingDuels)) {
      State.pendingDuels = State.pendingDuels.filter(duel => duel.id !== DuelSession?.id);
    }

    $('#duel-avatar-you').src = State.user?.avatar || 'https://i.pravatar.cc/60?img=1';
    $('#duel-name-you').textContent = youName;
    $('#duel-avatar-opponent').src = opponent.avatar || 'https://i.pravatar.cc/60?img=2';
    $('#duel-name-opponent').textContent = oppName;
    $('#duel-winner').textContent = winnerText;
    $('#duel-stats').innerHTML = `${youName}: ${faNum(totals.you.correct)} درست، ${faNum(totals.you.wrong)} نادرست، ${faNum(totals.you.earned)} امتیاز<br>${oppName}: ${faNum(totals.opp.correct)} درست، ${faNum(totals.opp.wrong)} نادرست، ${faNum(totals.opp.earned)} امتیاز`;
    const rewardDetailsEl = $('#duel-reward-breakdown');
    if (rewardDetailsEl) {
      const labels = { win: 'برنده', loss: 'بازنده', draw: 'مساوی' };
      const youLabel = labels[rewardResult.outcome] || 'برنده';
      const oppLabel = labels[rewardResult.opponentOutcome] || 'بازنده';
      rewardDetailsEl.innerHTML = `${youName} (${youLabel}): +${faNum(rewardResult.userReward.coins)}💰 • +${faNum(rewardResult.userReward.score)} امتیاز<br>${oppName} (${oppLabel}): +${faNum(rewardResult.opponentReward.coins)}💰 • +${faNum(rewardResult.opponentReward.score)} امتیاز`;
      rewardDetailsEl.classList.remove('hidden');
    }

    $('#duel-result').classList.remove('hidden');

    const summaryRounds = summaryData?.rounds || DuelSession.rounds;
    const summaryEl = $('#duel-rounds-summary');
    if (summaryEl) {
      const summaryHtml = summaryRounds.map((round, idx) => {
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

  function normalizeDuelFriendsList(list){
    const base = Array.isArray(list) ? list : [];
    const normalized = [];
    const seenNames = new Set();
    const usedIds = new Set();
    for (const friend of base) {
      if (!friend || typeof friend !== 'object') continue;
      const name = typeof friend.name === 'string' ? friend.name.trim() : '';
      if (!name || seenNames.has(name)) continue;
      let id = Number(friend.id);
      if (!Number.isFinite(id) || id <= 0) id = null;
      const scoreVal = Number(friend.score);
      const score = Number.isFinite(scoreVal) && scoreVal > 0 ? Math.round(scoreVal) : suggestScoreFromState();
      const avatar = typeof friend.avatar === 'string' && friend.avatar.trim()
        ? friend.avatar
        : generateAvatarFromName(name);
      normalized.push({ id, name, score, avatar });
      seenNames.add(name);
    }
    if (!normalized.length) {
      return DEFAULT_DUEL_FRIENDS.map(friend => ({ ...friend }));
    }
    normalized.forEach((friend, index) => {
      let id = Number(friend.id);
      if (!Number.isFinite(id) || id <= 0 || usedIds.has(id)) {
        id = index + 1;
      }
      usedIds.add(id);
      friend.id = id;
    });
    return normalized.slice(0, 20);
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
    saveState();
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
        saveState();
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

  async function startDuelMatch(opponent, options = {}){
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

    const diffPoolRaw = getCategoryDifficultyPool(catObj);
    const diffPool = Array.isArray(diffPoolRaw) && diffPoolRaw.length ? diffPoolRaw : getEffectiveDiffs();

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

    const difficultyInfo = preferred ? { value: preferred.value, label: preferred.label || preferred.value } : null;

    const acknowledged = await ensureDuelRuleReminder();
    if (!acknowledged){
      logEvent('duel_rule_declined', { opponent: opponent?.name });
      return false;
    }

    const categoryPool = categories.slice(0, 12).map(cat => ({
      id: cat.id,
      title: cat.title || cat.name || 'دسته‌بندی',
      description: cat.description || ''
    }));

    const payload = {
      userId: State.user?.id,
      userName: State.user?.name,
      avatar: State.user?.avatar,
      opponent,
      difficulty: difficultyInfo,
      categoryPool,
      rounds: DUEL_ROUNDS,
      questionsPerRound: DUEL_QUESTIONS_PER_ROUND
    };

    const existingDuel = options?.duel || null;
    let duel = existingDuel;
    if (!existingDuel) {
      let response;
      try {
        if (opponent && opponent.inviteId) {
          response = await Api.duelAcceptInvite(opponent.inviteId, payload);
        } else {
          response = await Api.duelMatchmaking(payload);
        }
      } catch (error) {
        console.error('Failed to start duel', error);
        toast('شروع نبرد ممکن نشد، بعداً دوباره تلاش کن');
        return false;
      }

      const data = response?.data || {};
      const overview = response?.meta?.overview || data.overview;
      if (overview) applyDuelOverviewData(overview, { skipRenderDashboard: true });

      duel = data.duel || null;
      if (!duel) {
        toast('پاسخ سرور برای شروع نبرد نامعتبر بود');
        return false;
      }
    } else if (options?.overview) {
      applyDuelOverviewData(options.overview, { skipRenderDashboard: true });
    }

    const startedAt = duel.startedAt || Date.now();
    const deadline = duel.deadline || startedAt + DUEL_TIMEOUT_MS;
    const opponentInfo = duel.opponent || opponent || { name: 'حریف' };

    DuelSession = {
      id: duel.id,
      startedAt,
      deadline,
      opponent: opponentInfo,
      difficulty: duel.difficulty || difficultyInfo,
      rounds: Array.isArray(duel.rounds)
        ? duel.rounds.map((round) => ({
            index: round.index,
            chooser: round.chooser,
            categoryId: round.categoryId || null,
            categoryTitle: round.categoryTitle || '',
            categoryOptions: Array.isArray(round.categoryOptions) ? round.categoryOptions : [],
            player: round.player || { correct: 0, wrong: 0, earned: 0 },
            opponent: round.opponent || { correct: 0, wrong: 0, earned: 0 },
            totalQuestions: round.totalQuestions || 0,
            serverCategoryConfirmed: round.chooser !== 'you' || !!round.categoryId
          }))
        : [],
      currentRoundIndex: 0,
      totalYourScore: 0,
      totalOpponentScore: 0,
      consumedResource: false,
      awaitingSelection: false,
      selectionResolved: false,
      started: false,
      resolveStart: null,
      lastSummary: null
    };

    if (!DuelSession.rounds.length) {
      DuelSession.rounds = Array.from({ length: DUEL_ROUNDS }, (_, idx) => ({
        index: idx,
        chooser: idx === 0 ? 'you' : 'opponent',
        categoryId: null,
        categoryTitle: '',
        categoryOptions: categoryPool,
        player: { correct: 0, wrong: 0, earned: 0 },
        opponent: { correct: 0, wrong: 0, earned: 0 },
        totalQuestions: 0,
        serverCategoryConfirmed: false
      }));
    }

    State.duelOpponent = opponentInfo;
    saveState();
    logEvent('duel_rule_acknowledged', { opponent: opponentInfo?.name, deadlineHours: 24 });
    toast(`حریف ${opponentInfo?.name || 'جدید'} پیدا شد!`);
    logEvent('duel_random_found', { opponent: opponentInfo?.name });

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
    try {
      const started = await startDuelMatch({ source: 'matchmaking' });
      if (!started) btn.disabled = false;
    } catch (error) {
      console.error('Random duel failed', error);
      btn.disabled = false;
    }
    if (btn.disabled) {
      setTimeout(() => { btn.disabled = false; }, 2000);
    }
  });

  // Invite Link Copy
  $('#btn-duel-link')?.addEventListener('click', async () => {
    vibrate(20);
    const inviter = State?.user?.name || 'کاربر آیکوئیز';
    const payload = `duel_${State.user.id || 'guest'}_${Date.now()}`;
    const { web } = buildTelegramStartLinks(payload);
    const appName = getAppName();
    const message = `${inviter} تو را به نبرد تن‌به‌تن در ${appName} دعوت کرده است! روی لینک زیر بزن و ربات را استارت کن.`;
    await shareOnTelegram(web, message);
    logEvent('duel_invite_link');
  });

  refreshDuelOverview({ skipRenderDashboard: true }).then(() => {
    renderDuelInvites({ skipPrune: true, silent: true });
    renderDashboard();
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

function normalizeGroupFromServer(group) {
  if (!group || typeof group !== 'object') return null;
  const id = group.id || group.groupId || group._id;
  if (!id) return null;
  return {
    ...group,
    id,
    groupId: group.groupId || id,
    roster: Array.isArray(group.roster) ? group.roster.map(player => ({ ...player })) : [],
    memberList: Array.isArray(group.memberList) ? [...group.memberList] : [],
    matches: Array.isArray(group.matches) ? group.matches.map(match => ({ ...match })) : [],
    requests: Array.isArray(group.requests) ? [...group.requests] : [],
  };
}

async function syncGroupsFromServer({ silent = false } = {}) {
  try {
    const res = await Api.groups();
    if (!res?.ok || !Array.isArray(res.data)) {
      if (!silent) toast('خطا در دریافت گروه‌ها از سرور');
      return null;
    }
    const normalized = res.data.map(normalizeGroupFromServer).filter(Boolean);
    State.groups = normalized;
    ensureGroupRosters();
    saveState();
    return normalized;
  } catch (err) {
    console.warn('Failed to sync groups', err);
    if (!silent) toast('خطا در همگام‌سازی گروه‌ها با سرور');
    return null;
  }
}

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

function buildBattlePlayerMarkup(player, options = {}) {
  const {
    side = 'host',
    roundIndex = 1,
    score = null,
    opponentScore = null,
    winner = null,
    preview = false
  } = options;

  const hasPlayer = player && typeof player === 'object';
  const defaultName = `بازیکن ${faNum(roundIndex)}`;
  const name = hasPlayer && player.name ? player.name : defaultName;
  const role = hasPlayer && player.role ? player.role : (hasPlayer ? 'نقش نامشخص' : 'جایگاه خالی');
  const avatarUrl = hasPlayer && player.avatar ? player.avatar : '';
  const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };
  const power = hasPlayer ? toNumber(player.power) : null;
  const accuracy = hasPlayer ? toNumber(player.accuracy) : null;
  const avgScore = hasPlayer ? toNumber(player.avgScore) : null;
  const speed = hasPlayer ? toNumber(player.speed) : null;

  const classes = ['battle-player'];
  if (!hasPlayer) {
    classes.push('battle-player-empty');
  } else if (!preview && (winner === 'host' || winner === 'opponent')) {
    if (winner === side) {
      classes.push('battle-player-winner');
    } else {
      classes.push('battle-player-loser');
    }
  }

  const roundLabel = `راند ${faNum(roundIndex)}`;
  const scoreLabel = preview ? 'پیش‌بینی نبرد' : 'امتیاز راند';
  const roundLabelSafe = escapeHtml(roundLabel);
  const scoreLabelSafe = escapeHtml(scoreLabel);
  const scoreValueNum = toNumber(score);
  const opponentScoreNum = toNumber(opponentScore);
  const scoreValue = scoreValueNum !== null ? faNum(scoreValueNum) : '—';

  let diffBadge = '';
  if (!preview && scoreValueNum !== null && opponentScoreNum !== null) {
    const diff = scoreValueNum - opponentScoreNum;
    if (diff === 0) {
      diffBadge = '<span class="text-xs font-semibold opacity-80">مساوی</span>';
    } else if (diff > 0) {
      diffBadge = `<span class="text-xs font-semibold text-green-200">+${faNum(Math.abs(diff))}</span>`;
    } else {
      diffBadge = `<span class="text-xs font-semibold text-rose-200">-${faNum(Math.abs(diff))}</span>`;
    }
  }

  const meta = [];
  if (power !== null) meta.push(`<span><i class="fas fa-bolt"></i>${faNum(power)}</span>`);
  if (accuracy !== null) meta.push(`<span><i class="fas fa-bullseye"></i>${faNum(accuracy)}٪</span>`);
  if (avgScore !== null) meta.push(`<span><i class="fas fa-star"></i>${faNum(avgScore)}</span>`);
  if (speed !== null) meta.push(`<span><i class="fas fa-gauge-high"></i>${faDecimal(speed, 1)}</span>`);

  const roleIcon = side === 'host' ? 'fa-shield-halved' : 'fa-dragon';

  const avatarMarkup = hasPlayer && avatarUrl
    ? `<img class="battle-player-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}">`
    : `<div class="battle-player-avatar placeholder"><i class="fas fa-user"></i></div>`;

  const metaMarkup = hasPlayer && meta.length
    ? `<div class="battle-player-meta">${meta.join('')}</div>`
    : (hasPlayer
        ? '<div class="text-xs opacity-70 leading-6">آمار بازیکن در دسترس نیست.</div>'
        : '<div class="text-xs opacity-70 leading-6">بازیکنی برای این ردیف معرفی نشده است.</div>');

  return `
    <div class="${classes.join(' ')}" data-battle-round="${roundIndex}">
      <div class="battle-player-header">
        <div class="battle-player-info">
          ${avatarMarkup}
          <div class="flex flex-col gap-1">
            <div class="battle-player-name">${escapeHtml(name)}</div>
            <div class="battle-player-role"><i class="fas ${roleIcon}"></i><span>${escapeHtml(role)}</span></div>
          </div>
        </div>
        <span class="chip px-3 py-1 text-xs font-bold">${roundLabelSafe}</span>
      </div>
      <div class="battle-player-score">
        <span>${scoreValue}</span>
        <span class="text-xs opacity-75">${scoreLabelSafe}</span>
        ${diffBadge}
      </div>
      ${metaMarkup}
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
      const rewardConfig = State.groupBattle?.lastResult?.rewards?.config || getGroupBattleRewardConfig();
      if (!userGroup) {
        limitHint.textContent = 'برای شروع نبرد باید ابتدا عضو یک گروه شوید.';
      } else if (info.reached) {
        limitHint.textContent = 'به سقف نبردهای امروز رسیدید؛ فردا دوباره تلاش کنید یا با خرید VIP محدودیت را افزایش دهید.';
      } else {
        limitHint.innerHTML = `پاداش پیروزی: <span class="text-green-200 font-bold">${faNum(rewardConfig?.winner?.coins ?? 0)}💰</span> و <span class="text-green-200 font-bold">${faNum(rewardConfig?.winner?.score ?? 0)}</span> امتیاز برای هر بازیکن.`;
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
      const rewardConfig = last.rewards?.config || getGroupBattleRewardConfig();
      const winnerName = last.rewards?.winnerName || (last.winnerGroupId === last.host?.id ? last.host?.name : last.opponent?.name) || '';
      const diff = Math.abs((last.host?.total || 0) - (last.opponent?.total || 0));
      lastSummaryEl.innerHTML = `پیروز نبرد: <span class="text-green-300 font-bold">${winnerName}</span> • اختلاف امتیاز ${faNum(diff)} • پاداش تیم برنده: ${faNum(rewardConfig?.winner?.coins ?? 0)}💰 و ${faNum(rewardConfig?.winner?.score ?? 0)} امتیاز.`;
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
    startBtn.innerHTML = '<span class="flex items-center gap-2 justify-center"><span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span><span>در حال ثبت نبرد...</span></span>';

    try {
      const payload = {
        hostGroupId: hostGroup.id,
        opponentGroupId: opponentGroup.id,
        user: {
          id: State.user.id || '',
          name: State.user.name || '',
          groupId: userGroup?.id || State.user.group || '',
          group: State.user.group || '',
        },
      };

      const response = await Api.startGroupBattle(payload);
      if (!response?.ok || !response?.data) {
        toast(response?.message || 'خطا در ثبت نبرد گروهی. لطفاً دوباره تلاش کن.');
        return;
      }

      const result = response.data;
      const rewardSummary = result.rewards || null;

      if (Array.isArray(response.meta?.groups)) {
        const normalizedGroups = response.meta.groups.map(normalizeGroupFromServer).filter(Boolean);
        if (normalizedGroups.length) {
          State.groups = normalizedGroups;
          ensureGroupRosters();
          groups.length = 0;
          groups.push(...State.groups);
          setOptions();
        }
      }

      State.groupBattle = State.groupBattle || { selectedHostId: '', selectedOpponentId: '', lastResult: null };
      State.groupBattle.lastResult = result;
      State.groupBattle.selectedHostId = hostGroup.id;
      State.groupBattle.selectedOpponentId = opponentGroup.id;

      if (rewardSummary?.userReward?.applied) {
        State.coins += Number(rewardSummary.userReward.coins || 0);
        State.score += Number(rewardSummary.userReward.score || 0);
      }

      if (response.meta?.limits?.groupBattles) {
        Server.limits.groupBattles = { ...Server.limits.groupBattles, ...response.meta.limits.groupBattles };
      } else {
        Server.limits.groupBattles.used = Number(Server.limits.groupBattles.used || 0) + 1;
        Server.limits.groupBattles.lastRecovery = Date.now();
      }

      saveState();

      renderHeader();
      renderDashboard();
      updateLimitsUI();
      renderTopBars();
      updateBattleView({ saveSelection: false });
      refreshLastResult();

      const diff = Math.abs(result.diff || 0);
      const winnerName = rewardSummary?.winnerName || (result.winnerGroupId === result.host?.id ? result.host?.name : result.opponent?.name) || '';
      const userRewardText = rewardSummary?.userReward?.applied
        ? ` • پاداش شما: ${faNum(rewardSummary.userReward.coins)}💰 و ${faNum(rewardSummary.userReward.score)} امتیاز`
        : '';
      toast(`<i class="fas fa-trophy ml-2"></i>${winnerName} با اختلاف ${faNum(diff)} امتیاز پیروز شد${userRewardText}`);

      logEvent('group_battle_recorded', {
        host: hostGroup.name,
        opponent: opponentGroup.name,
        winner: winnerName,
        diff,
        timestamp: result.playedAt,
      });
    } catch (err) {
      console.warn('Failed to record group battle', err);
      toast('خطا در ثبت نبرد گروهی. لطفاً دوباره تلاش کن.');
    } finally {
      startBtn.disabled = false;
      startBtn.innerHTML = originalLabel;
    }
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
  $('#btn-open-vip')?.addEventListener('click', (event)=>{
    event.preventDefault();
    const opened = openVipDetailsModal();
    if (!opened){
      navTo('vip');
    }
  });
  $('#go-wallet')?.addEventListener('click', ()=>navTo('wallet'));
  $('#go-vip')?.addEventListener('click', ()=>navTo('vip'));
  $('#btn-back-wallet')?.addEventListener('click', ()=>navTo('shop'));
  $('#btn-back-vip')?.addEventListener('click', ()=>navTo('shop'));
  
  // Leaderboard CTA
  $('#btn-view-leaderboard')?.addEventListener('click', ()=>{
    navTo('leaderboard');
  });
  
  // VIP purchase buttons
  
  // Detail Popup Events
  const detailPopupEl = $('#detail-popup');
  const detailOverlayEl = $('#detail-overlay');
  detailPopupEl?.setAttribute('aria-hidden', 'true');
  detailOverlayEl?.setAttribute('aria-hidden', 'true');
  $('#detail-close')?.addEventListener('click', closeDetailPopup);
  detailOverlayEl?.addEventListener('click', closeDetailPopup);

  const setupSheetEl = $('#sheet-setup');
  setupSheetEl?.setAttribute('aria-hidden', 'true');

  // Close modals (receipt)
  $$('[data-close="#modal-receipt"]').forEach(b=> b.addEventListener('click', ()=>closeModal('#modal-receipt')));
  $$('[data-close="#modal-pay-confirm"]').forEach(b=> b.addEventListener('click', ()=>closeModal('#modal-pay-confirm')));
  $$('[data-close="#modal-province-soon"]').forEach(b=> b.addEventListener('click', ()=>closeModal('#modal-province-soon')));
  $$('[data-close="#modal-invite"]').forEach(b=> b.addEventListener('click', ()=>closeModal('#modal-invite')));
  $$('[data-close="#modal-vip-details"]').forEach(b=> b.addEventListener('click', ()=>closeModal('#modal-vip-details')));

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
    spendKeys(1);
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
    spendKeys(1);
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
    spendKeys(1);
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
        spendKeys(1);
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

  $('#btn-share-referral')?.addEventListener('click', async () => {
    vibrate(20);
    const reward = Number(State.referral?.rewardPerFriend ?? 5);
    const code = State.referral?.code || '';
    const payload = `ref_${State.user.id || 'guest'}`;
    const { web } = buildTelegramStartLinks(payload);
    const rewardLabel = faNum(reward);
    const appName = getAppName();
    const text = code
      ? `با لینک من در ${appName} ثبت‌نام کن و کد ${code} را وارد کن؛ بعد از اولین کوییز هر دو ${rewardLabel} سکه هدیه می‌گیریم!`
      : `با لینک من در ${appName} ثبت‌نام کن؛ بعد از اولین کوییز هر دو ${rewardLabel} سکه هدیه می‌گیریم!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `دعوت به ${appName}`,
          text,
          url: web
        });
        toast('<i class="fas fa-check-circle ml-2"></i>دعوت ارسال شد');
        return;
      } catch (error) {
        console.warn('navigator.share failed', error);
      }
    }

    await shareOnTelegram(web, text);
  });

  const referralDuelBtn = document.getElementById('btn-referral-duel');
  if (referralDuelBtn) {
    referralDuelBtn.addEventListener('click', () => navTo('duel'));
  }

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
  
  $('#active-duel-requests')?.addEventListener('click', event => {
    const actionBtn = event.target.closest('[data-duel-action]');
    if (!actionBtn) return;
    const inviteId = actionBtn.dataset.inviteId;
    if (!inviteId) return;
    event.preventDefault();
    vibrate(15);
    if (actionBtn.dataset.duelAction === 'accept') {
      handleDuelInviteAccept(inviteId, actionBtn);
    } else if (actionBtn.dataset.duelAction === 'decline') {
      handleDuelInviteDecline(inviteId);
    }
  });

  // Active Match Actions
  $$('.match-action').forEach(btn => {
    if (btn.dataset.duelAction) return;
    btn.addEventListener('click', (e) => {
      const matchName = e.currentTarget.closest('.active-match-item').querySelector('.match-name').textContent;
      toast(`در ${matchName} ثبت‌نام شدید!`);
    });
  });

function handleQuizBackNavigation() {
  cancelDuelSession('user_cancelled');
  navTo('dashboard');
}

export function getQuizEventHandlers() {
  return {
    onShareResult: shareResult,
    onPlayAgain: openSetupSheet,
    onBackToDashboard: handleQuizBackNavigation,
  };
}

export async function bootstrap() {
  try {
    await initFromAdmin();
    renderProvinceSelect();
    buildSetupFromAdmin();
    applyConfigToUI({ checkDailyReset });
    await syncGroupsFromServer({ silent: true });
  }
  catch (e) {
    console.warn('Admin bootstrap failed', e);
    toast('اتصال به سرور برقرار نشد؛ داده‌ی دمو غیرفعال شد.');
  }
  finally {
    document.getElementById('loading')?.classList.add('hidden');
  }
  await init();
}

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

      setInterval(() => {
        pruneExpiredDuelInvites({ silent: false });
        renderDuelInvites({ skipPrune: true, silent: true });
      }, 60 * 1000);

      await Promise.all([refreshWallet(), refreshSubscription()]);
      renderHeader(); renderDashboard();
      AdManager.refreshAll();

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && $('#modal-payment').classList.contains('show')) {
          closePaymentModal();
        }
      });

      $('#payment-cancel-btn')?.addEventListener('click', () => {
        closePaymentModal();
      });

      logEvent('session_start', {
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        user_agent: navigator.userAgent
      });

      if(!localStorage.getItem(STORAGE_KEY)){ setTimeout(()=>toast('برای شروع روی «شروع کوییز» بزن ✨'), 800); }

      window.addEventListener('online', ()=>{
        $('#wallet-offline')?.classList.add('hidden');
        renderShopWalletTopup();
        renderWalletCustomPlan();
        AdManager.refreshAll();
      });
      window.addEventListener('offline', ()=>{
        $('#wallet-offline')?.classList.remove('hidden');
        renderShopWalletTopup();
        renderWalletCustomPlan();
      });

      AdManager.maybeShowInterstitial('app_open');
    }catch(err){
      console.error('Initialization failed', err);
      toast('خطا در راه‌اندازی برنامه');
    }
  }

