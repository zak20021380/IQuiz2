import { DEFAULT_DUEL_REWARDS } from '../../config/admin-settings.js';

const BASE_DUEL_REWARDS = {
  winner: { ...DEFAULT_DUEL_REWARDS.winner },
  loser: { ...DEFAULT_DUEL_REWARDS.loser },
  draw: { ...DEFAULT_DUEL_REWARDS.draw },
};

const OUTCOME_TO_CONFIG_KEY = {
  win: 'winner',
  winner: 'winner',
  loss: 'loser',
  lose: 'loser',
  loser: 'loser',
  draw: 'draw',
  tie: 'draw',
};

const CONFIG_KEY_TO_OUTCOME = {
  winner: 'win',
  loser: 'loss',
  draw: 'draw',
};

function sanitizeRewardValue(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.round(num));
}

export function normalizeDuelRewardsConfig(source, fallback = BASE_DUEL_REWARDS) {
  const base = fallback || BASE_DUEL_REWARDS;
  const raw = source && typeof source === 'object' ? source : {};
  const build = (key) => {
    const candidate = raw[key] && typeof raw[key] === 'object' ? raw[key] : {};
    const baseOutcome = base[key] || { coins: 0, score: 0 };
    return {
      coins: sanitizeRewardValue(candidate.coins, baseOutcome.coins),
      score: sanitizeRewardValue(candidate.score, baseOutcome.score),
    };
  };
  return {
    winner: build('winner'),
    loser: build('loser'),
    draw: build('draw'),
  };
}

function normalizeOutcomeKey(outcome) {
  if (typeof outcome !== 'string') return 'draw';
  const key = outcome.trim().toLowerCase();
  return OUTCOME_TO_CONFIG_KEY[key] || 'draw';
}

function invertOutcomeKey(key) {
  if (key === 'winner') return 'loser';
  if (key === 'loser') return 'winner';
  return 'draw';
}

export function applyDuelOutcomeRewards(outcome, config, state, options = {}) {
  const normalizedConfig = normalizeDuelRewardsConfig(config);
  const outcomeKey = normalizeOutcomeKey(outcome);
  const opponentKey = normalizeOutcomeKey(options.opponentOutcome) || invertOutcomeKey(outcomeKey);
  const resolvedOpponentKey = options.opponentOutcome ? opponentKey : invertOutcomeKey(outcomeKey);
  const userReward = {
    coins: normalizedConfig[outcomeKey]?.coins ?? 0,
    score: normalizedConfig[outcomeKey]?.score ?? 0,
    outcome: CONFIG_KEY_TO_OUTCOME[outcomeKey] || 'draw',
  };
  const opponentReward = {
    coins: normalizedConfig[resolvedOpponentKey]?.coins ?? 0,
    score: normalizedConfig[resolvedOpponentKey]?.score ?? 0,
    outcome: CONFIG_KEY_TO_OUTCOME[resolvedOpponentKey] || 'draw',
  };

  const shouldApply = options.apply !== false;
  const currentCoins = Number(state?.coins) || 0;
  const currentScore = Number(state?.score) || 0;
  const applied = shouldApply && state && typeof state === 'object';
  const nextCoins = applied ? currentCoins + userReward.coins : currentCoins;
  const nextScore = applied ? currentScore + userReward.score : currentScore;

  if (applied) {
    state.coins = nextCoins;
    state.score = nextScore;
  }

  return {
    outcome: userReward.outcome,
    opponentOutcome: CONFIG_KEY_TO_OUTCOME[resolvedOpponentKey] || 'draw',
    config: normalizedConfig,
    userReward: { ...userReward, applied },
    opponentReward: { ...opponentReward, applied: false },
    totals: { coins: nextCoins, score: nextScore },
  };
}

export function invertDuelOutcome(outcome) {
  const key = normalizeOutcomeKey(outcome);
  return CONFIG_KEY_TO_OUTCOME[invertOutcomeKey(key)] || 'draw';
}
