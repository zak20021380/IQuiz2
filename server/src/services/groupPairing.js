'use strict';

const VALID_MODES = new Set(['bench', 'rotate', 'duplicate']);
const DEFAULT_MODE = 'bench';
const DEFAULT_ROTATION_WINDOW = 1;

function normalizeMode(mode) {
  if (typeof mode !== 'string') return DEFAULT_MODE;
  const trimmed = mode.trim().toLowerCase();
  if (VALID_MODES.has(trimmed)) return trimmed;
  return DEFAULT_MODE;
}

function cloneMembers(team) {
  if (!team || !Array.isArray(team.members)) return [];
  return team.members.slice();
}

function safeRotationWindow(value) {
  const parsed = Number.parseInt(String(value ?? DEFAULT_ROTATION_WINDOW), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_ROTATION_WINDOW;
  return parsed;
}

function rotateArray(items, offset) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const size = items.length;
  if (!Number.isFinite(offset) || offset <= 0) return items.slice();
  const normalized = offset % size;
  if (normalized === 0) return items.slice();
  return items.slice(normalized).concat(items.slice(0, normalized));
}

function rotateSlice(arr, start, count, offset) {
  const paired = arr.slice(0, start);
  if (!count || count <= 0) {
    return { paired, bench: [] };
  }

  const extras = arr.slice(start, start + count);
  if (extras.length <= 1) {
    return { paired, bench: extras.slice() };
  }

  const rotated = rotateArray(extras, offset);
  return { paired, bench: rotated };
}

function zip(a, b, n) {
  const pairs = [];
  for (let i = 0; i < n; i += 1) {
    pairs.push([a[i], b[i]]);
  }
  return pairs;
}

function createPairObjects(pairedA, pairedB) {
  const len = Math.min(pairedA.length, pairedB.length);
  const pairs = [];
  for (let i = 0; i < len; i += 1) {
    pairs.push({ a: pairedA[i], b: pairedB[i], index: i });
  }
  return pairs;
}

function duplicateMembers(source, targetLength) {
  const size = source.length;
  const duplicated = [];
  for (let i = 0; i < targetLength; i += 1) {
    duplicated.push(source[i % size]);
  }
  return duplicated;
}

function pairTeams(teamA = { id: 'A', members: [] }, teamB = { id: 'B', members: [] }, mode = DEFAULT_MODE, options = {}) {
  const normalizedMode = normalizeMode(mode);
  const membersA = cloneMembers(teamA);
  const membersB = cloneMembers(teamB);
  const lenA = membersA.length;
  const lenB = membersB.length;
  const minSize = Math.min(lenA, lenB);
  const maxSize = Math.max(lenA, lenB);

  if (normalizedMode !== 'duplicate' && (lenA === 0 || lenB === 0)) {
    const benchA = membersA.slice();
    const benchB = membersB.slice();
    const result = {
      pairs: [],
      benchA,
      benchB,
      meta: {
        mode: normalizedMode,
        minSize,
        maxSize
      }
    };
    console.info('[group-pairing]', {
      mode: normalizedMode,
      round: options.round ?? 0,
      a: lenA,
      b: lenB,
      pairs: 0,
      benchA: benchA.length,
      benchB: benchB.length
    });
    return result;
  }

  if (normalizedMode === 'duplicate') {
    if (lenA === 0 || lenB === 0) {
      const benchA = membersA.slice();
      const benchB = membersB.slice();
      const result = {
        pairs: [],
        benchA,
        benchB,
        meta: {
          mode: normalizedMode,
          minSize,
          maxSize,
          duplicatedFrom: lenA === 0 && lenB === 0 ? undefined : lenA === 0 ? 'A' : 'B'
        }
      };
      console.info('[group-pairing]', {
        mode: normalizedMode,
        round: options.round ?? 0,
        a: lenA,
        b: lenB,
        pairs: 0,
        benchA: benchA.length,
        benchB: benchB.length
      });
      return result;
    }

    const targetLength = Math.max(lenA, lenB);
    const pairedA = lenA === targetLength ? membersA.slice() : duplicateMembers(membersA, targetLength);
    const pairedB = lenB === targetLength ? membersB.slice() : duplicateMembers(membersB, targetLength);
    const pairs = createPairObjects(pairedA, pairedB);
    const duplicatedFrom = lenA === lenB ? undefined : lenA < lenB ? 'A' : 'B';
    const result = {
      pairs,
      benchA: [],
      benchB: [],
      meta: {
        mode: normalizedMode,
        minSize,
        maxSize,
        duplicatedFrom
      }
    };
    console.info('[group-pairing]', {
      mode: normalizedMode,
      round: options.round ?? 0,
      a: lenA,
      b: lenB,
      pairs: pairs.length,
      benchA: 0,
      benchB: 0
    });
    return result;
  }

  const round = Number.isFinite(options.round) ? Number(options.round) : 0;
  const rotationWindow = safeRotationWindow(options.rotationWindow ?? DEFAULT_ROTATION_WINDOW);

  let pairedA = membersA.slice(0, minSize);
  let benchA = membersA.slice(minSize);
  let pairedB = membersB.slice(0, minSize);
  let benchB = membersB.slice(minSize);

  if (normalizedMode === 'rotate') {
    if (lenA > lenB) {
      const extraA = lenA - minSize;
      const offset = extraA > 0 ? (round * rotationWindow) % Math.max(1, extraA) : 0;
      const rotated = rotateSlice(membersA, minSize, extraA, offset);
      pairedA = rotated.paired;
      benchA = rotated.bench;
    }

    if (lenB > lenA) {
      const extraB = lenB - minSize;
      const offset = extraB > 0 ? (round * rotationWindow) % Math.max(1, extraB) : 0;
      const rotated = rotateSlice(membersB, minSize, extraB, offset);
      pairedB = rotated.paired;
      benchB = rotated.bench;
    }
  }

  const pairCount = Math.min(pairedA.length, pairedB.length, minSize);
  const zipped = zip(pairedA, pairedB, pairCount);
  const pairs = zipped.map(([a, b], index) => ({ a, b, index }));

  const result = {
    pairs,
    benchA,
    benchB,
    meta: {
      mode: normalizedMode,
      minSize,
      maxSize
    }
  };

  console.info('[group-pairing]', {
    mode: normalizedMode,
    round,
    a: lenA,
    b: lenB,
    pairs: pairs.length,
    benchA: benchA.length,
    benchB: benchB.length
  });

  return result;
}

module.exports = {
  VALID_MODES,
  DEFAULT_MODE,
  pairTeams,
  zip,
  rotateSlice
};
