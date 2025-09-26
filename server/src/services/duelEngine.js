const { randomUUID } = require('crypto');
const logger = require('../config/logger');
const QuestionService = require('./questionService');
const { getDuelRewardConfig } = require('../config/adminSettings');

const MAX_DUEL_QUESTIONS = 20;
const DEFAULT_ROUNDS = 2;
const DEFAULT_QUESTIONS_PER_ROUND = 10;
const DUEL_TIMEOUT_MS = 24 * 60 * 60 * 1000;

const DEFAULT_OPPONENT_POOL = [
  { id: 'op-ali-rezaei', name: 'علی رضایی', score: 12450, avatar: 'https://i.pravatar.cc/60?img=3' },
  { id: 'op-sara-mohammadi', name: 'سارا محمدی', score: 9800, avatar: 'https://i.pravatar.cc/60?img=5' },
  { id: 'op-reza-ghasemi', name: 'رضا قاسمی', score: 15200, avatar: 'https://i.pravatar.cc/60?img=8' },
  { id: 'op-maryam-ahmadi', name: 'مریم احمدی', score: 7650, avatar: 'https://i.pravatar.cc/60?img=11' },
  { id: 'op-hossein-karimi', name: 'حسین کریمی', score: 13200, avatar: 'https://i.pravatar.cc/60?img=12' },
  { id: 'op-negar-mousavi', name: 'نگار موسوی', score: 9100, avatar: 'https://i.pravatar.cc/60?img=13' },
  { id: 'op-kamran-alipour', name: 'کامران علیپور', score: 10100, avatar: 'https://i.pravatar.cc/60?img=14' }
];

const store = {
  duels: new Map(),
  invites: new Map(),
  history: new Map()
};

function sanitizeRequested(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 12;
  return Math.min(parsed, MAX_DUEL_QUESTIONS);
}

function sanitizeUser(rawUser = {}) {
  if (!rawUser || typeof rawUser !== 'object') return { id: 'guest', name: 'بازیکن مهمان' };
  const idCandidate = rawUser.id || rawUser._id || rawUser.userId;
  const id = idCandidate ? String(idCandidate).trim() : '';
  const nameCandidate = rawUser.name || rawUser.username || rawUser.displayName;
  const name = nameCandidate ? String(nameCandidate).trim() : '';
  const avatar = typeof rawUser.avatar === 'string' ? rawUser.avatar.trim() : '';
  const score = Number.isFinite(rawUser.score) ? Math.max(0, Math.round(rawUser.score)) : undefined;
  return {
    id: id || `guest-${Date.now()}`,
    name: name || 'بازیکن مهمان',
    avatar: avatar || `https://i.pravatar.cc/100?u=${encodeURIComponent(name || id || 'guest')}`,
    score
  };
}

function pickOpponent(player, requestedOpponent = {}) {
  const user = sanitizeUser(player);
  if (requestedOpponent && typeof requestedOpponent === 'object' && (requestedOpponent.id || requestedOpponent.name)) {
    const opponent = sanitizeUser(requestedOpponent);
    if (opponent.id === user.id) {
      opponent.id = `${opponent.id}-rival`;
    }
    return opponent;
  }

  const pool = DEFAULT_OPPONENT_POOL.filter((entry) => entry.name !== user.name);
  const choice = pool[Math.floor(Math.random() * pool.length)] || DEFAULT_OPPONENT_POOL[0];
  return { ...choice };
}

function ensureRoundSkeleton(rounds = DEFAULT_ROUNDS) {
  const count = Number.isFinite(rounds) && rounds > 0 ? Math.min(Math.max(1, Math.round(rounds)), 5) : DEFAULT_ROUNDS;
  return Array.from({ length: count }).map((_, index) => ({
    index,
    chooser: index === 0 ? 'you' : 'opponent',
    categoryId: null,
    categoryTitle: '',
    categoryOptions: [],
    results: {},
    totalQuestions: 0
  }));
}

function normalizeCategoryPool(pool) {
  if (!Array.isArray(pool)) return [];
  return pool
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const id = typeof entry.id === 'string' ? entry.id.trim() : '';
      const title = typeof entry.title === 'string' && entry.title.trim()
        ? entry.title.trim()
        : typeof entry.name === 'string' && entry.name.trim()
          ? entry.name.trim()
          : '';
      if (!id || !title) return null;
      return { id, title };
    })
    .filter(Boolean);
}

function attachCategoryOptions(rounds, pool) {
  const options = normalizeCategoryPool(pool).slice(0, 12);
  if (!options.length) return rounds;
  return rounds.map((round) => ({
    ...round,
    categoryOptions: round.chooser === 'you' ? options : round.categoryOptions
  }));
}

function simulateOpponentRound(round, totalQuestions, yourCorrect, yourEarned) {
  const advantage = round.chooser === 'opponent' ? 1 : 0;
  const min = Math.max(0, Math.min(totalQuestions, yourCorrect - 2));
  const max = Math.min(totalQuestions, Math.max(min, yourCorrect + 2 + advantage));
  const correct = Math.round(min + Math.random() * (max - min));
  const boundedCorrect = Math.max(0, Math.min(totalQuestions, correct));
  const wrong = Math.max(0, totalQuestions - boundedCorrect);
  let perQuestionEarned = 100;
  if (yourCorrect > 0 && Number.isFinite(yourEarned)) {
    perQuestionEarned = Math.max(0, Math.round(yourEarned / yourCorrect));
  }
  const earned = boundedCorrect * perQuestionEarned;
  return { correct: boundedCorrect, wrong, earned };
}

async function loadDuelQuestions(ctx = {}) {
  const requested = sanitizeRequested(ctx.requested ?? ctx.count ?? ctx.rounds ?? DEFAULT_QUESTIONS_PER_ROUND);
  const category = typeof ctx.category === 'string' ? ctx.category.trim() : '';
  const difficulty = typeof ctx.difficulty === 'string' ? ctx.difficulty.trim().toLowerCase() : '';
  const userId = ctx.userId || ctx.user?._id || ctx.user?.id;
  const guestId = ctx.guestId || ctx.guestKey || ctx.guest;

  const { ok, items } = await QuestionService.getQuestions({
    count: requested,
    category,
    difficulty,
    userId,
    guestId,
    user: ctx.user
  });

  if (!ok || !Array.isArray(items) || items.length === 0) {
    throw new Error('no_questions');
  }

  const seen = new Set();
  const unique = [];
  for (const item of items) {
    if (!item || !item.id) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
    if (unique.length === requested) break;
  }

  logger.info(
    `[duel] requested=${requested} delivered=${unique.length} category=${category || 'any'} difficulty=${difficulty || 'any'}`
  );

  if (!unique.length) {
    throw new Error('no_questions');
  }

  return unique;
}

function createDuelRecord(player, opponent, options = {}) {
  const id = options.id || randomUUID();
  const startedAt = Date.now();
  const deadline = startedAt + DUEL_TIMEOUT_MS;
  const rounds = attachCategoryOptions(ensureRoundSkeleton(options.rounds), options.categoryPool);
  const duel = {
    id,
    createdAt: startedAt,
    startedAt,
    deadline,
    rounds,
    participants: {
      [player.id]: { ...player, role: 'challenger' },
      [opponent.id]: { ...opponent, role: 'opponent' }
    },
    difficulty: options.difficulty || null,
    questionsPerRound: options.questionsPerRound || DEFAULT_QUESTIONS_PER_ROUND,
    status: 'active'
  };
  store.duels.set(id, duel);
  return duel;
}

function getOpponentId(duel, userId) {
  const ids = Object.keys(duel.participants || {});
  if (!ids.length) return null;
  if (ids.length === 1) return ids[0];
  return ids.find((id) => id !== userId) || ids[0];
}

function getTotalsForDuel(duel, userId, opponentId) {
  const totals = {
    you: { correct: 0, wrong: 0, earned: 0, questions: 0 },
    opponent: { correct: 0, wrong: 0, earned: 0, questions: 0 }
  };
  for (const round of duel.rounds) {
    const youStats = round.results[userId] || {};
    const oppStats = round.results[opponentId] || {};
    const questions = round.totalQuestions || (youStats.correct || 0) + (youStats.wrong || 0) || duel.questionsPerRound;
    totals.you.correct += youStats.correct || 0;
    totals.you.wrong += youStats.wrong || 0;
    totals.you.earned += youStats.earned || 0;
    totals.you.questions += questions;
    totals.opponent.correct += oppStats.correct || 0;
    totals.opponent.wrong += oppStats.wrong || 0;
    totals.opponent.earned += oppStats.earned || 0;
    totals.opponent.questions += questions;
  }
  return totals;
}

function sanitizeRewardEntry(entry = {}) {
  const coins = Number(entry.coins);
  const score = Number(entry.score);
  return {
    coins: Number.isFinite(coins) ? Math.max(0, Math.round(coins)) : 0,
    score: Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0,
  };
}

function buildDuelRewardSummary(outcome = 'draw') {
  const rawConfig = getDuelRewardConfig() || {};
  const normalizedConfig = {
    winner: sanitizeRewardEntry(rawConfig.winner),
    loser: sanitizeRewardEntry(rawConfig.loser),
    draw: sanitizeRewardEntry(rawConfig.draw),
  };
  const outcomeMap = { win: 'winner', loss: 'loser', draw: 'draw' };
  const userKey = outcomeMap[outcome] || 'draw';
  const opponentOutcome = outcome === 'win' ? 'loss' : outcome === 'loss' ? 'win' : 'draw';
  const opponentKey = outcomeMap[opponentOutcome] || 'draw';
  return {
    config: normalizedConfig,
    outcome,
    opponentOutcome,
    userReward: { ...normalizedConfig[userKey], outcome, applied: false },
    opponentReward: { ...normalizedConfig[opponentKey], outcome: opponentOutcome, applied: false },
  };
}

function pushHistory(userId, entry) {
  if (!userId) return;
  const list = store.history.get(userId) || [];
  list.unshift(entry);
  store.history.set(userId, list.slice(0, 20));
}

function computeStats(userId) {
  const history = store.history.get(userId) || [];
  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const item of history) {
    if (!item || !item.outcome) continue;
    if (item.outcome === 'win') wins += 1;
    else if (item.outcome === 'loss') losses += 1;
    else if (item.outcome === 'draw') draws += 1;
  }
  return { wins, losses, draws };
}

function collectInvitesForUser(userId) {
  const invites = [];
  const now = Date.now();
  for (const invite of store.invites.values()) {
    if (!invite || invite.status !== 'pending') continue;
    if (invite.targetId !== userId) continue;
    if (invite.deadline && invite.deadline < now) {
      invite.status = 'expired';
      continue;
    }
    invites.push({
      id: invite.id,
      opponent: invite.from.name,
      avatar: invite.from.avatar,
      requestedAt: invite.createdAt,
      deadline: invite.deadline,
      source: 'invite'
    });
  }
  invites.sort((a, b) => (a.deadline || 0) - (b.deadline || 0));
  return invites;
}

function collectPendingDuels(userId) {
  const now = Date.now();
  const pending = [];
  for (const duel of store.duels.values()) {
    if (!duel || duel.status !== 'active') continue;
    if (!duel.participants[userId]) continue;
    pending.push({
      id: duel.id,
      opponent: duel.participants[getOpponentId(duel, userId)]?.name || 'حریف',
      startedAt: duel.startedAt,
      deadline: duel.deadline
    });
  }
  return pending.filter((entry) => !entry.deadline || entry.deadline > now);
}

function buildOverview(user) {
  const normalized = sanitizeUser(user);
  return {
    invites: collectInvitesForUser(normalized.id),
    pending: collectPendingDuels(normalized.id),
    history: (store.history.get(normalized.id) || []).map((entry) => ({ ...entry })),
    stats: computeStats(normalized.id)
  };
}

async function ensureRoundCategory(duel, roundIndex, payload = {}) {
  const round = duel.rounds[roundIndex];
  if (!round) throw new Error('round_not_found');
  const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId.trim() : '';
  const categoryTitle = typeof payload.categoryTitle === 'string' ? payload.categoryTitle.trim() : '';
  if (!categoryId) throw new Error('category_required');
  const difficulty = duel.difficulty?.value || duel.difficulty || payload.difficulty || '';
  try {
    const questions = await loadDuelQuestions({
      requested: duel.questionsPerRound,
      category: categoryId,
      difficulty,
      userId: payload.userId,
      user: payload.user
    });
    round.categoryId = categoryId;
    round.categoryTitle = categoryTitle || (questions[0]?.categoryName || 'دسته‌بندی عمومی');
    round.totalQuestions = questions.length;
    round.questionIds = questions.map((item) => item.id);
  } catch (error) {
    logger.warn(`[duel] failed to load questions for category=${categoryId}: ${error.message}`);
    throw error;
  }
  return {
    index: roundIndex,
    categoryId: round.categoryId,
    categoryTitle: round.categoryTitle,
    totalQuestions: round.totalQuestions
  };
}

function finalizeDuel(duel, userId) {
  const opponentId = getOpponentId(duel, userId);
  const totals = getTotalsForDuel(duel, userId, opponentId);
  const outcome = totals.you.earned > totals.opponent.earned
    ? 'win'
    : totals.you.earned < totals.opponent.earned
      ? 'loss'
      : 'draw';
  const resolvedAt = Date.now();
  duel.status = 'completed';

  const opponent = duel.participants[opponentId] || { name: 'حریف' };
  pushHistory(userId, {
    id: duel.id,
    opponent: opponent.name,
    opponentScore: totals.opponent.earned,
    yourScore: totals.you.earned,
    outcome,
    reason: outcome === 'draw' ? 'draw' : 'score',
    resolvedAt,
    startedAt: duel.startedAt,
    deadline: duel.deadline
  });

  const challengerId = opponentId;
  if (challengerId) {
    const challengerTotals = {
      you: totals.opponent,
      opponent: totals.you
    };
    const challengerOutcome = outcome === 'win' ? 'loss' : outcome === 'loss' ? 'win' : 'draw';
    pushHistory(challengerId, {
      id: duel.id,
      opponent: duel.participants[userId]?.name || 'حریف',
      opponentScore: challengerTotals.opponent.earned,
      yourScore: challengerTotals.you.earned,
      outcome: challengerOutcome,
      reason: challengerOutcome === 'draw' ? 'draw' : 'score',
      resolvedAt,
      startedAt: duel.startedAt,
      deadline: duel.deadline
    });
  }

  const rewards = buildDuelRewardSummary(outcome);

  return {
    duelId: duel.id,
    opponent,
    totals,
    outcome,
    resolvedAt,
    rewards,
    rounds: duel.rounds.map((round) => ({
      index: round.index,
      chooser: round.chooser,
      categoryId: round.categoryId,
      categoryTitle: round.categoryTitle,
      player: round.results[userId] || { correct: 0, wrong: 0, earned: 0 },
      opponent: round.results[opponentId] || { correct: 0, wrong: 0, earned: 0 },
      totalQuestions: round.totalQuestions
    }))
  };
}

function serializeDuelForUser(duel, userId) {
  const opponentId = getOpponentId(duel, userId);
  const opponent = duel.participants[opponentId] || null;
  const normalizedRounds = duel.rounds.map((round) => ({
    index: round.index,
    chooser: round.chooser,
    categoryId: round.categoryId,
    categoryTitle: round.categoryTitle,
    categoryOptions: round.categoryOptions,
    player: round.results[userId] || null,
    opponent: round.results[opponentId] || null,
    totalQuestions: round.totalQuestions
  }));
  return {
    id: duel.id,
    startedAt: duel.startedAt,
    deadline: duel.deadline,
    difficulty: duel.difficulty,
    opponent,
    rounds: normalizedRounds
  };
}

async function createMatchmakingDuel(payload = {}) {
  const user = sanitizeUser(payload.user || payload.player);
  const difficulty = payload.difficulty || null;
  const opponent = pickOpponent(user, payload.opponent);
  const duel = createDuelRecord(user, opponent, {
    difficulty,
    rounds: payload.rounds,
    questionsPerRound: payload.questionsPerRound,
    categoryPool: payload.categoryPool
  });

  if (Array.isArray(payload.categoryPool) && payload.categoryPool.length && duel.rounds.length > 1) {
    const pool = normalizeCategoryPool(payload.categoryPool);
    const remaining = pool.filter((entry) => entry.id !== duel.rounds[0].categoryId);
    const choice = remaining[Math.floor(Math.random() * remaining.length)] || pool[0];
    if (choice) {
      duel.rounds[1].categoryId = choice.id;
      duel.rounds[1].categoryTitle = choice.title;
    }
  }

  return {
    duel: serializeDuelForUser(duel, user.id),
    overview: buildOverview(user)
  };
}

function createInvite(payload = {}) {
  const from = sanitizeUser(payload.from || payload.user);
  const target = sanitizeUser({ id: payload.targetId, name: payload.targetName, avatar: payload.targetAvatar });
  const id = randomUUID();
  const createdAt = Date.now();
  const deadline = createdAt + DUEL_TIMEOUT_MS;
  const invite = {
    id,
    from,
    targetId: target.id,
    status: 'pending',
    createdAt,
    deadline,
    payload: {
      difficulty: payload.difficulty || null,
      categoryPool: payload.categoryPool || []
    }
  };
  store.invites.set(id, invite);
  return {
    invite: {
      id,
      opponent: from.name,
      avatar: from.avatar,
      requestedAt: createdAt,
      deadline,
      source: 'invite'
    },
    overview: buildOverview(target)
  };
}

function declineInvite(inviteId, user) {
  const invite = store.invites.get(inviteId);
  if (!invite) {
    throw new Error('invite_not_found');
  }
  invite.status = 'declined';
  return { overview: buildOverview(user) };
}

async function acceptInvite(inviteId, payload = {}) {
  const invite = store.invites.get(inviteId);
  if (!invite || invite.status !== 'pending') {
    throw new Error('invite_not_found');
  }
  const accepter = sanitizeUser(payload.user || payload.accepter);
  if (invite.targetId && invite.targetId !== accepter.id) {
    throw new Error('invite_not_for_user');
  }
  invite.status = 'accepted';
  const duel = createDuelRecord(accepter, invite.from, {
    difficulty: invite.payload?.difficulty || payload.difficulty,
    rounds: payload.rounds,
    questionsPerRound: payload.questionsPerRound,
    categoryPool: invite.payload?.categoryPool || payload.categoryPool
  });
  if (duel.rounds.length > 1 && (!duel.rounds[1].categoryId || !duel.rounds[1].categoryTitle)) {
    const pool = normalizeCategoryPool(invite.payload?.categoryPool || payload.categoryPool);
    if (pool.length) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      duel.rounds[1].categoryId = pick.id;
      duel.rounds[1].categoryTitle = pick.title;
    }
  }
  return {
    duel: serializeDuelForUser(duel, accepter.id),
    overview: buildOverview(accepter)
  };
}

async function submitRoundResult(duelId, roundIndex, payload = {}) {
  const duel = store.duels.get(duelId);
  if (!duel) throw new Error('duel_not_found');
  if (duel.status !== 'active') throw new Error('duel_not_active');
  const user = sanitizeUser(payload.user || payload.player);
  if (!duel.participants[user.id]) {
    duel.participants[user.id] = { ...user };
  }
  const round = duel.rounds[roundIndex];
  if (!round) throw new Error('round_not_found');
  if (!round.categoryId && payload.categoryId) {
    await ensureRoundCategory(duel, roundIndex, {
      categoryId: payload.categoryId,
      categoryTitle: payload.categoryTitle,
      user
    });
  }

  const totalQuestions = Number.isFinite(payload.totalQuestions)
    ? Math.max(1, Math.round(payload.totalQuestions))
    : round.totalQuestions || duel.questionsPerRound;

  const playerStats = {
    correct: Math.max(0, Number(payload.correct) || 0),
    wrong: Math.max(0, Number(payload.wrong) || 0),
    earned: Math.max(0, Number(payload.earned) || 0)
  };
  round.results[user.id] = playerStats;
  round.totalQuestions = totalQuestions;

  const opponentId = getOpponentId(duel, user.id);
  if (opponentId) {
    const opponentStats = round.results[opponentId] || simulateOpponentRound(round, totalQuestions, playerStats.correct, playerStats.earned);
    round.results[opponentId] = opponentStats;
  }

  const totals = getTotalsForDuel(duel, user.id, opponentId);

  const finished = duel.rounds.every((item) => item.results[user.id]);
  let summary = null;
  if (finished) {
    summary = finalizeDuel(duel, user.id);
  }

  return {
    status: finished ? 'finished' : 'next',
    round: {
      index: roundIndex,
      chooser: round.chooser,
      categoryId: round.categoryId,
      categoryTitle: round.categoryTitle,
      player: round.results[user.id],
      opponent: opponentId ? round.results[opponentId] : null,
      totalQuestions: round.totalQuestions
    },
    totals,
    summary,
    overview: buildOverview(user)
  };
}

async function assignRoundCategory(duelId, roundIndex, payload = {}) {
  const duel = store.duels.get(duelId);
  if (!duel) throw new Error('duel_not_found');
  const user = sanitizeUser(payload.user || payload.player);
  const roundInfo = await ensureRoundCategory(duel, roundIndex, {
    categoryId: payload.categoryId,
    categoryTitle: payload.categoryTitle,
    user,
    userId: user.id
  });
  return {
    round: {
      index: roundInfo.index,
      categoryId: roundInfo.categoryId,
      categoryTitle: roundInfo.categoryTitle,
      totalQuestions: roundInfo.totalQuestions
    },
    overview: buildOverview(user)
  };
}

module.exports = {
  MAX_DUEL_QUESTIONS,
  DEFAULT_ROUNDS,
  DEFAULT_QUESTIONS_PER_ROUND,
  DUEL_TIMEOUT_MS,
  loadDuelQuestions,
  createMatchmakingDuel,
  createInvite,
  acceptInvite,
  declineInvite,
  submitRoundResult,
  assignRoundCategory,
  buildOverview
};
