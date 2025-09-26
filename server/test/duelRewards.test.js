const test = require('node:test');
const assert = require('assert');

test('applyDuelOutcomeRewards applies configured duel payouts to player balances', async () => {
  const module = await import('../../Iquiz-assets/src/features/duel/rewards.js');
  const { applyDuelOutcomeRewards, normalizeDuelRewardsConfig } = module;

  const configured = normalizeDuelRewardsConfig({
    winner: { coins: 75, score: 210 },
    loser: { coins: 15, score: 45 },
    draw: { coins: 30, score: 90 },
  });

  const winState = { coins: 10, score: 1000 };
  const winResult = applyDuelOutcomeRewards('win', configured, winState);
  assert.strictEqual(winState.coins, 85);
  assert.strictEqual(winState.score, 1210);
  assert.strictEqual(winResult.userReward.applied, true);
  assert.strictEqual(winResult.userReward.coins, 75);
  assert.strictEqual(winResult.userReward.score, 210);
  assert.strictEqual(winResult.opponentReward.coins, configured.loser.coins);
  assert.strictEqual(winResult.opponentReward.outcome, 'loss');

  const lossState = { coins: 50, score: 500 };
  const lossResult = applyDuelOutcomeRewards('loss', configured, lossState);
  assert.strictEqual(lossState.coins, 65);
  assert.strictEqual(lossState.score, 545);
  assert.strictEqual(lossResult.userReward.outcome, 'loss');
  assert.strictEqual(lossResult.opponentReward.outcome, 'win');

  const drawState = { coins: 30, score: 300 };
  const drawResult = applyDuelOutcomeRewards('draw', configured, drawState, { apply: false });
  assert.strictEqual(drawState.coins, 30);
  assert.strictEqual(drawState.score, 300);
  assert.strictEqual(drawResult.userReward.applied, false);
  assert.strictEqual(drawResult.userReward.coins, configured.draw.coins);
  assert.strictEqual(drawResult.userReward.score, configured.draw.score);
  assert.strictEqual(drawResult.opponentReward.outcome, 'draw');
});
