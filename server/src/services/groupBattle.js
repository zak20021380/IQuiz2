const { randomUUID } = require('crypto');
const { getGroupBattleRewardConfig } = require('../config/adminSettings');

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function seededFloat(seed, min, max) {
  return min + (max - min) * seededRandom(seed);
}

function sanitizeRosterPlayer(player) {
  if (!player || typeof player !== 'object') return null;

  const name = typeof player.name === 'string' ? player.name.trim() : '';
  const avatar = typeof player.avatar === 'string' ? player.avatar : '';
  const role = typeof player.role === 'string' ? player.role : '';

  const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const normalized = { name, avatar, role };
  const power = toNumber(player.power);
  const accuracy = toNumber(player.accuracy);
  const avgScore = toNumber(player.avgScore);
  const speed = toNumber(player.speed);

  if (!name && !avatar && !role && power === null && accuracy === null && avgScore === null && speed === null) {
    return null;
  }

  if (power !== null) normalized.power = Math.round(power);
  if (accuracy !== null) normalized.accuracy = Math.round(accuracy);
  if (avgScore !== null) normalized.avgScore = Math.round(avgScore);
  if (speed !== null) normalized.speed = speed;

  return normalized;
}

function ensureRoster(group) {
  if (!group) return [];
  const players = Array.isArray(group.roster)
    ? group.roster.map(sanitizeRosterPlayer).filter(Boolean).slice(0, 10)
    : [];
  group.roster = players;

  if (!Array.isArray(group.memberList)) {
    group.memberList = [];
  } else {
    group.memberList = group.memberList
      .map((name) => (typeof name === 'string' ? name.trim() : ''))
      .filter(Boolean);
  }

  const memberSet = new Set(group.memberList);
  players.forEach((player) => {
    if (player.name) memberSet.add(player.name);
  });

  const knownMembers = memberSet.size;
  if (!Number.isFinite(group.members) || group.members < knownMembers) {
    group.members = knownMembers;
  } else {
    group.members = Math.max(0, Math.round(group.members));
  }

  if (!Number.isFinite(group.wins)) group.wins = 0;
  if (!Number.isFinite(group.losses)) group.losses = 0;
  return players;
}

function getBattleParticipants(hostGroup, opponentGroup, user) {
  const hostPlayers = ensureRoster(hostGroup).map((player) => ({ ...player }));
  const opponentPlayers = ensureRoster(opponentGroup).map((player) => ({ ...player }));

  return {
    hostPlayers,
    opponentPlayers,
  };
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

function simulateGroupBattle(hostGroup, opponentGroup, user) {
  if (!hostGroup || !opponentGroup) return null;

  const { hostPlayers, opponentPlayers } = getBattleParticipants(hostGroup, opponentGroup, user);
  const duelCount = 10;
  const baseSeed = Date.now();
  const battleId = `gb-${randomUUID()}`;
  const rounds = [];
  let hostTotal = 0;
  let opponentTotal = 0;

  for (let i = 0; i < duelCount; i += 1) {
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
      winner: performance.winner,
    });
  }

  const normalizedHostTotal = Math.round(hostTotal);
  const normalizedOpponentTotal = Math.round(opponentTotal);
  let winnerGroupId;

  if (normalizedHostTotal === normalizedOpponentTotal) {
    const hostMax = Math.max(...rounds.map((r) => r.hostScore || 0));
    const opponentMax = Math.max(...rounds.map((r) => r.opponentScore || 0));
    winnerGroupId = hostMax >= opponentMax ? hostGroup.groupId : opponentGroup.groupId;
  } else {
    winnerGroupId = normalizedHostTotal > normalizedOpponentTotal ? hostGroup.groupId : opponentGroup.groupId;
  }

  return {
    id: battleId,
    playedAt: new Date().toISOString(),
    host: { id: hostGroup.groupId, name: hostGroup.name, total: normalizedHostTotal, players: hostPlayers.map((p) => (p ? { ...p } : null)) },
    opponent: { id: opponentGroup.groupId, name: opponentGroup.name, total: normalizedOpponentTotal, players: opponentPlayers.map((p) => (p ? { ...p } : null)) },
    rounds,
    winnerGroupId,
    diff: normalizedHostTotal - normalizedOpponentTotal,
  };
}

function applyBattleRewards(result, hostGroup, opponentGroup, user) {
  if (!result) return null;
  const rewardConfig = getGroupBattleRewardConfig();
  const winnerGroup = result.winnerGroupId === hostGroup.groupId ? hostGroup : opponentGroup;
  const loserGroup = winnerGroup === hostGroup ? opponentGroup : hostGroup;

  if (winnerGroup) {
    const currentScore = Number(winnerGroup.score) || 0;
    winnerGroup.score = Math.max(0, Math.round(currentScore + rewardConfig.groupScore));
    winnerGroup.wins = Math.max(0, Math.round((winnerGroup.wins || 0) + 1));
  }

  if (loserGroup) {
    loserGroup.losses = Math.max(0, Math.round((loserGroup.losses || 0) + 1));
  }

  const ensureMatchLog = (group) => {
    if (!group) return;
    if (!Array.isArray(group.matches)) group.matches = [];
  };

  ensureMatchLog(hostGroup);
  ensureMatchLog(opponentGroup);

  const hostRecord = {
    opponentId: opponentGroup?.groupId || '',
    opponent: opponentGroup?.name || '',
    result: result.winnerGroupId === hostGroup?.groupId ? 'win' : 'loss',
    score: { self: result.host?.total || 0, opponent: result.opponent?.total || 0 },
    playedAt: new Date(result.playedAt),
  };

  const opponentRecord = {
    opponentId: hostGroup?.groupId || '',
    opponent: hostGroup?.name || '',
    result: result.winnerGroupId === opponentGroup?.groupId ? 'win' : 'loss',
    score: { self: result.opponent?.total || 0, opponent: result.host?.total || 0 },
    playedAt: new Date(result.playedAt),
  };

  if (hostGroup) {
    hostGroup.matches.unshift(hostRecord);
    hostGroup.matches = hostGroup.matches.slice(0, 10);
  }

  if (opponentGroup) {
    opponentGroup.matches.unshift(opponentRecord);
    opponentGroup.matches = opponentGroup.matches.slice(0, 10);
  }

  const userGroupId = user?.groupId || user?.group;
  const userReward = { coins: 0, score: 0, applied: false, type: 'none' };

  if (userGroupId && (userGroupId === hostGroup?.groupId || userGroupId === opponentGroup?.groupId)) {
    const isHost = userGroupId === hostGroup?.groupId;
    const isWinner = result.winnerGroupId === (isHost ? hostGroup?.groupId : opponentGroup?.groupId);
    const reward = isWinner ? rewardConfig.winner : rewardConfig.loser;
    userReward.coins = reward.coins;
    userReward.score = reward.score;
    userReward.applied = true;
    userReward.type = isWinner ? 'winner' : 'loser';
  }

  const summary = {
    winnerGroupId: result.winnerGroupId,
    winnerName: winnerGroup?.name || '',
    loserName: loserGroup?.name || '',
    config: rewardConfig,
    userReward,
  };

  result.rewards = summary;
  return summary;
}

module.exports = {
  getBattleParticipants,
  simulateGroupBattle,
  applyBattleRewards,
  ensureRoster,
};
