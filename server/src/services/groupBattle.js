const { getGroupBattleRewardConfig } = require('../config/adminSettings');

const ROSTER_ROLES = ['دانش عمومی','رهبر استراتژی','متخصص علوم','استاد ادبیات','تحلیل‌گر داده','هوش تاریخی','ریاضی‌دان','کارشناس فناوری','حل مسئله سریع','هوش مصنوعی'];
const ROSTER_FIRST_NAMES = ['آرمان','نیلوفر','شروین','فرناز','پارسا','یاسمن','کاوه','مینا','هومن','هستی','رامتین','سولماز','آرین','بهاره','پریسا','بردیا','کیانا','مانی','ترانه','هانیه'];
const ROSTER_LAST_NAMES = ['قاسمی','حسینی','موسوی','محمدی','کاظمی','نعمتی','شکیبا','زارع','فاضلی','رستگار','صادقی','نیک‌پور','شریفی','فرهادی','پاکزاد','نادری','گودرزی','مرادی','توکلی','شفیعی'];

function stringToSeed(str) {
  if (!str) return 1;
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % 2147483647;
  }
  return hash || 1;
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function seededFloat(seed, min, max) {
  return min + (max - min) * seededRandom(seed);
}

function pickFrom(list, seed, offset = 0) {
  if (!Array.isArray(list) || list.length === 0) return '';
  const idx = Math.abs(Math.floor(seed + offset)) % list.length;
  return list[idx];
}

function createSyntheticNameForGroup(group, index) {
  const seed = stringToSeed(`${group?.groupId || group?.id || ''}-${group?.name || ''}`);
  const first = pickFrom(ROSTER_FIRST_NAMES, seed, index * 3);
  const last = pickFrom(ROSTER_LAST_NAMES, seed, index * 7);
  return `${first} ${last}`.trim();
}

function buildRosterEntry(name, index, baseSeed) {
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
    speed,
  };
}

function generateRosterFromMembers(group, desiredCount = 10) {
  const roster = [];
  const used = new Set();
  const baseSeed = stringToSeed(`${group?.groupId || group?.id || ''}-${group?.name || ''}`);
  const members = Array.isArray(group?.memberList) ? group.memberList.filter(Boolean) : [];
  members.forEach((memberName, idx) => {
    if (used.has(memberName)) return;
    const entry = buildRosterEntry(memberName, idx, baseSeed);
    roster.push(entry);
    used.add(memberName);
  });
  let idx = roster.length;
  while (roster.length < desiredCount) {
    const synthetic = createSyntheticNameForGroup(group, idx);
    if (used.has(synthetic)) {
      idx += 1;
      continue;
    }
    const entry = buildRosterEntry(synthetic, idx, baseSeed);
    roster.push(entry);
    used.add(synthetic);
    idx += 1;
  }
  return roster.slice(0, desiredCount);
}

function normalizeRosterMember(player, fallback, index, group) {
  const source = player && typeof player === 'object' ? player : {};
  const baseSeed = stringToSeed(`${group?.groupId || group?.id || ''}-${group?.name || ''}-${index}`);
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

function ensureRoster(group) {
  if (!group) return [];
  const desiredCount = 10;
  const baseRoster = Array.isArray(group.roster) ? group.roster.slice(0, desiredCount) : [];
  const fallback = generateRosterFromMembers(group, desiredCount);
  const players = [];
  for (let i = 0; i < desiredCount; i += 1) {
    const current = baseRoster[i];
    const fallbackPlayer = fallback[i];
    players.push(normalizeRosterMember(current, fallbackPlayer, i, group));
  }
  group.roster = players;
  group.members = Math.max(group.members || 0, players.length);
  if (!Array.isArray(group.memberList) || group.memberList.length === 0) {
    group.memberList = players.slice(0, Math.min(5, players.length)).map((p) => p.name);
  }
  if (!Number.isFinite(group.wins)) group.wins = 0;
  if (!Number.isFinite(group.losses)) group.losses = 0;
  return players;
}

function injectUserPlayer(players, group, user) {
  if (!user || !user.name || !group) return players;
  const groupId = group.groupId || group.id;
  const belongsToGroup = user.groupId === groupId
    || user.groupName === group.name
    || (Array.isArray(group.memberList) && group.memberList.includes(user.name));
  if (!belongsToGroup) return players;
  if (players.some((player) => player && player.name === user.name)) return players;
  const seed = stringToSeed(`${groupId || group.name}-${user.name}`);
  const entry = buildRosterEntry(user.name, 0, seed);
  entry.role = 'کاپیتان تیم';
  entry.power = Math.min(99, (entry.power || 0) + 6);
  entry.avgScore = Math.min(990, (entry.avgScore || 0) + 45);
  entry.accuracy = Math.min(99, (entry.accuracy || 0) + 4);
  return [entry, ...players].slice(0, 10);
}

function getBattleParticipants(hostGroup, opponentGroup, user) {
  const hostPlayers = ensureRoster(hostGroup).map((player) => ({ ...player }));
  const opponentPlayers = ensureRoster(opponentGroup).map((player) => ({ ...player }));

  const adjustedHost = injectUserPlayer(hostPlayers, hostGroup, user);
  const adjustedOpponent = injectUserPlayer(opponentPlayers, opponentGroup, user);

  return {
    hostPlayers: adjustedHost,
    opponentPlayers: adjustedOpponent,
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
    id: `gb-${baseSeed}`,
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
