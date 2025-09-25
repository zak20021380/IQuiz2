const test = require('node:test');
const assert = require('node:assert/strict');

const { pairTeams } = require('../src/services/groupPairing');

function createPlayer(id) {
  return { id: String(id), joinedAt: id * 1000 };
}

test('bench mode pairs up to min size and benches extras', () => {
  const teamA = { id: 'A', members: [createPlayer(1), createPlayer(2), createPlayer(3)] };
  const teamB = {
    id: 'B',
    members: [createPlayer(4), createPlayer(5), createPlayer(6), createPlayer(7), createPlayer(8)]
  };

  const result = pairTeams(teamA, teamB, 'bench');

  assert.equal(result.pairs.length, 3);
  assert.equal(result.benchA.length, 0);
  assert.equal(result.benchB.length, 2);
  assert.deepEqual(
    result.benchB.map((player) => player.id),
    ['7', '8']
  );
  assert.deepEqual(
    result.pairs.map((pair) => [pair.a.id, pair.b.id]),
    [
      ['1', '4'],
      ['2', '5'],
      ['3', '6']
    ]
  );
});

test('rotate mode rotates which extras are benched based on round', () => {
  const teamA = { id: 'A', members: [createPlayer(1), createPlayer(2), createPlayer(3)] };
  const teamB = {
    id: 'B',
    members: [createPlayer(4), createPlayer(5), createPlayer(6), createPlayer(7), createPlayer(8)]
  };

  const round0 = pairTeams(teamA, teamB, 'rotate', { round: 0, rotationWindow: 1 });
  const round1 = pairTeams(teamA, teamB, 'rotate', { round: 1, rotationWindow: 1 });
  const round2 = pairTeams(teamA, teamB, 'rotate', { round: 2, rotationWindow: 1 });

  assert.deepEqual(round0.benchB.map((player) => player.id), ['7', '8']);
  assert.deepEqual(round1.benchB.map((player) => player.id), ['8', '7']);
  assert.deepEqual(round2.benchB.map((player) => player.id), ['7', '8']);

  assert.equal(round0.pairs.length, 3);
  assert.equal(round1.pairs.length, 3);
  assert.equal(round2.pairs.length, 3);
});

test('duplicate mode reuses smaller team members without benches', () => {
  const teamA = { id: 'A', members: [createPlayer(1), createPlayer(2)] };
  const teamB = {
    id: 'B',
    members: [createPlayer(3), createPlayer(4), createPlayer(5), createPlayer(6), createPlayer(7)]
  };

  const result = pairTeams(teamA, teamB, 'duplicate');

  assert.equal(result.pairs.length, 5);
  assert.deepEqual(
    result.pairs.map((pair) => [pair.a.id, pair.b.id]),
    [
      ['1', '3'],
      ['2', '4'],
      ['1', '5'],
      ['2', '6'],
      ['1', '7']
    ]
  );
  assert.equal(result.benchA.length, 0);
  assert.equal(result.benchB.length, 0);
  assert.equal(result.meta.duplicatedFrom, 'A');
});

test('symmetric teams have no bench or duplication', () => {
  const teamA = { id: 'A', members: [createPlayer(1), createPlayer(2), createPlayer(3)] };
  const teamB = { id: 'B', members: [createPlayer(4), createPlayer(5), createPlayer(6)] };

  const benchMode = pairTeams(teamA, teamB, 'bench');
  const rotateMode = pairTeams(teamA, teamB, 'rotate', { round: 3 });
  const duplicateMode = pairTeams(teamA, teamB, 'duplicate');

  assert.equal(benchMode.benchA.length, 0);
  assert.equal(benchMode.benchB.length, 0);
  assert.equal(rotateMode.benchA.length, 0);
  assert.equal(rotateMode.benchB.length, 0);
  assert.equal(duplicateMode.meta.duplicatedFrom, undefined);
  assert.equal(duplicateMode.pairs.length, 3);
});

test('empty team results in benches only', () => {
  const teamA = { id: 'A', members: [] };
  const teamB = { id: 'B', members: [createPlayer(1), createPlayer(2)] };

  const benchMode = pairTeams(teamA, teamB, 'bench');
  assert.equal(benchMode.pairs.length, 0);
  assert.equal(benchMode.benchA.length, 0);
  assert.equal(benchMode.benchB.length, 2);

  const duplicateMode = pairTeams(teamA, teamB, 'duplicate');
  assert.equal(duplicateMode.pairs.length, 0);
  assert.equal(duplicateMode.benchB.length, 2);
  assert.equal(duplicateMode.meta.duplicatedFrom, 'A');
});
