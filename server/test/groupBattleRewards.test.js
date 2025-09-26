const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { test, beforeEach, after } = require('node:test');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iquiz-admin-settings-'));
process.env.ADMIN_SETTINGS_FILE = path.join(tmpDir, 'admin-settings.json');

const fsPromises = fs.promises;

const {
  DEFAULT_GROUP_BATTLE_REWARDS,
  getAdminSettingsSnapshot,
  getGroupBattleRewardConfig,
  saveAdminSettings,
  __resetAdminSettingsCache,
} = require('../src/config/adminSettings');
const { applyBattleRewards } = require('../src/services/groupBattle');

beforeEach(async () => {
  __resetAdminSettingsCache();
  await fsPromises.rm(process.env.ADMIN_SETTINGS_FILE, { force: true });
});

after(async () => {
  await fsPromises.rm(tmpDir, { recursive: true, force: true });
});

test('returns default group battle rewards when no settings are stored', () => {
  const config = getGroupBattleRewardConfig();
  assert.deepStrictEqual(config, {
    winner: { ...DEFAULT_GROUP_BATTLE_REWARDS.winner },
    loser: { ...DEFAULT_GROUP_BATTLE_REWARDS.loser },
    groupScore: DEFAULT_GROUP_BATTLE_REWARDS.groupScore,
  });
});

test('persists admin configured group battle rewards', async () => {
  const updated = {
    rewards: {
      groupBattleRewards: {
        winner: { coins: 150, score: 320 },
        loser: { coins: 40, score: 120 },
        groupScore: 640,
      },
    },
  };
  await saveAdminSettings(updated);
  const snapshot = getAdminSettingsSnapshot();
  assert.strictEqual(snapshot.rewards.groupBattleRewards.winner.coins, 150);
  assert.strictEqual(snapshot.rewards.groupBattleRewards.winner.score, 320);
  assert.strictEqual(snapshot.rewards.groupBattleRewards.loser.coins, 40);
  assert.strictEqual(snapshot.rewards.groupBattleRewards.loser.score, 120);
  assert.strictEqual(snapshot.rewards.groupBattleRewards.groupScore, 640);
});

test('applyBattleRewards uses the configured admin rewards', async () => {
  const rewardConfig = {
    rewards: {
      groupBattleRewards: {
        winner: { coins: 200, score: 550 },
        loser: { coins: 60, score: 180 },
        groupScore: 900,
      },
    },
  };
  await saveAdminSettings(rewardConfig);
  const config = getGroupBattleRewardConfig();

  const hostGroup = { groupId: 'host', name: 'میزبان', score: 1000, wins: 2, losses: 1, matches: [] };
  const opponentGroup = { groupId: 'opponent', name: 'حریف', score: 500, wins: 1, losses: 3, matches: [] };
  const result = {
    winnerGroupId: 'host',
    playedAt: new Date().toISOString(),
    host: { total: 120 },
    opponent: { total: 80 },
  };

  const summary = applyBattleRewards(result, hostGroup, opponentGroup, { groupId: 'host' });

  assert.ok(summary);
  assert.strictEqual(hostGroup.score, 1000 + config.groupScore);
  assert.strictEqual(hostGroup.wins, 3);
  assert.strictEqual(opponentGroup.losses, 4);
  assert.strictEqual(summary.userReward.coins, config.winner.coins);
  assert.strictEqual(summary.userReward.score, config.winner.score);
  assert.deepStrictEqual(summary.config, config);
  assert.strictEqual(summary.userReward.type, 'winner');
});
