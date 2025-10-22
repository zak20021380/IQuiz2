const mongoose = require('mongoose');
const User = require('../models/User');
const Group = require('../models/Group');
const ProvinceStat = require('../models/ProvinceStat');
const logger = require('../config/logger');

const LEADERBOARD_LIMIT = 20;

function normalizeProvince(value) {
  if (!value) return '';
  const str = String(value).trim();
  return str;
}

function normalizeGroupInput(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return { id: trimmed, name: trimmed };
  }
  if (typeof raw === 'object') {
    const idSource = raw.id ?? raw.groupId ?? raw.slug ?? raw.code ?? raw.name;
    const nameSource = raw.name ?? raw.title ?? raw.displayName ?? idSource;
    if (!idSource) return null;
    const id = String(idSource).trim();
    const name = String(nameSource || id).trim();
    if (!id) return null;
    return { id, name: name || id };
  }
  return null;
}

function sanitizeScore(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.round(num));
}

async function incrementProvinceStats(previousProvince, nextProvince, scoreDelta) {
  const signedDelta = Number.isFinite(scoreDelta) ? Math.round(scoreDelta) : 0;
  const now = new Date();

  if (previousProvince && previousProvince !== nextProvince) {
    try {
      const prevDoc = await ProvinceStat.findOneAndUpdate(
        { province: previousProvince },
        {
          $inc: { memberCount: -1 },
          $set: { updatedAt: now },
          $setOnInsert: { province: previousProvince, score: 0, memberCount: 0 }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      if (prevDoc && prevDoc.memberCount < 0) {
        prevDoc.memberCount = 0;
        await prevDoc.save();
      }
    } catch (err) {
      logger.warn(`[leaderboard] Failed to decrement province stats for ${previousProvince}: ${err.message}`);
    }
  }

  if (!nextProvince) {
    return;
  }

  const update = {
    $inc: { score: signedDelta },
    $set: { updatedAt: now },
    $setOnInsert: { province: nextProvince, score: 0, memberCount: 0 }
  };

  if (previousProvince !== nextProvince) {
    update.$inc.memberCount = 1;
  }

  try {
    const doc = await ProvinceStat.findOneAndUpdate(
      { province: nextProvince },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    if (doc) {
      if (doc.score < 0) doc.score = 0;
      if (doc.memberCount < 0) doc.memberCount = 0;
      if (doc.isModified()) await doc.save();
    }
  } catch (err) {
    logger.warn(`[leaderboard] Failed to increment province stats for ${nextProvince}: ${err.message}`);
  }
}

function deriveMemberName(user) {
  if (!user) return '';
  if (user.name) return user.name;
  if (user.username) return user.username;
  if (user.telegramUsername) return user.telegramUsername;
  if (user.telegramId) return `tg_${user.telegramId}`;
  if (user._id instanceof mongoose.Types.ObjectId) return user._id.toHexString();
  if (user._id) return String(user._id);
  return '';
}

async function decrementGroupMembership(groupId, memberName) {
  if (!groupId) return;
  const update = { $inc: { members: -1 } };
  if (memberName) {
    update.$pull = { memberList: memberName };
  }
  try {
    const doc = await Group.findOneAndUpdate(
      { groupId },
      update,
      { new: true }
    );
    if (doc && doc.members < 0) {
      doc.members = 0;
      await doc.save();
    }
  } catch (err) {
    logger.warn(`[leaderboard] Failed to decrement group ${groupId}: ${err.message}`);
  }
}

async function upsertGroup(groupId, groupName, memberName) {
  if (!groupId) return null;
  const update = {
    $setOnInsert: {
      groupId,
      name: groupName || groupId,
      score: 0,
      members: 0,
      admin: memberName || groupName || groupId,
      memberList: []
    },
    $set: {}
  };
  if (groupName) {
    update.$set.name = groupName;
  }
  if (memberName) {
    update.$addToSet = { memberList: memberName };
    update.$inc = { members: 1 };
  }
  try {
    const doc = await Group.findOneAndUpdate(
      { groupId },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    if (doc && doc.members < 0) {
      doc.members = Math.max(0, doc.members);
      await doc.save();
    }
    return doc;
  } catch (err) {
    logger.warn(`[leaderboard] Failed to upsert group ${groupId}: ${err.message}`);
    return null;
  }
}

async function incrementGroupScore(groupId, scoreDelta) {
  const delta = Number.isFinite(scoreDelta) ? Math.round(scoreDelta) : 0;
  if (!groupId || delta === 0) return;
  try {
    const doc = await Group.findOneAndUpdate(
      { groupId },
      { $inc: { score: delta } },
      { new: true }
    );
    if (doc && doc.score < 0) {
      doc.score = 0;
      await doc.save();
    }
  } catch (err) {
    logger.warn(`[leaderboard] Failed to increment group score for ${groupId}: ${err.message}`);
  }
}

async function handleGroupTransition(userBefore, userAfter, desiredGroup, scoreDelta) {
  const prevGroupId = (userBefore.groupId || '').trim();
  const memberName = deriveMemberName(userAfter || userBefore);

  const targetGroupId = desiredGroup && desiredGroup.id ? desiredGroup.id.trim() : '';
  const targetGroupName = desiredGroup && desiredGroup.name ? desiredGroup.name : '';

  if (prevGroupId === targetGroupId) {
    if (targetGroupId) {
      await incrementGroupScore(targetGroupId, scoreDelta);
    }
    return;
  }

  if (prevGroupId) {
    await decrementGroupMembership(prevGroupId, memberName);
  }

  if (!targetGroupId) {
    return;
  }

  await upsertGroup(targetGroupId, targetGroupName, memberName);
  await incrementGroupScore(targetGroupId, scoreDelta);
}

function mapUserForResponse(userDoc) {
  if (!userDoc) return null;
  const id = userDoc._id ? userDoc._id.toString() : userDoc.id;
  const name = userDoc.name || userDoc.username || userDoc.telegramUsername || 'کاربر';
  return {
    id,
    name,
    score: sanitizeScore(userDoc.score),
    province: userDoc.province || '',
    groupId: userDoc.groupId || '',
    group: userDoc.groupName || '',
    avatar: userDoc.avatar || ''
  };
}

function mapGroupForResponse(groupDoc) {
  if (!groupDoc) return null;
  const id = groupDoc.groupId || groupDoc.id;
  return {
    id,
    groupId: id,
    name: groupDoc.name || id,
    score: sanitizeScore(groupDoc.score),
    members: sanitizeScore(groupDoc.members),
    admin: groupDoc.admin || ''
  };
}

function mapProvinceForResponse(stat) {
  if (!stat) return null;
  const name = stat.province || stat.name || '';
  return {
    id: name,
    name,
    score: sanitizeScore(stat.score),
    members: sanitizeScore(stat.memberCount)
  };
}

async function loadProvinceStats() {
  let stats = await ProvinceStat.find().sort({ score: -1, memberCount: -1, province: 1 }).lean();
  if (stats.length) return stats;
  const agg = await User.aggregate([
    { $match: { province: { $nin: [null, '', undefined] } } },
    {
      $group: {
        _id: '$province',
        score: { $sum: { $ifNull: ['$score', 0] } },
        members: { $sum: 1 }
      }
    },
    { $sort: { score: -1 } }
  ]);
  if (!agg.length) return [];
  const ops = agg.map((item) => ({
    updateOne: {
      filter: { province: item._id },
      update: {
        $set: {
          province: item._id,
          score: sanitizeScore(item.score),
          memberCount: sanitizeScore(item.members),
          updatedAt: new Date()
        }
      },
      upsert: true
    }
  }));
  try {
    await ProvinceStat.bulkWrite(ops, { ordered: false });
  } catch (err) {
    logger.warn(`[leaderboard] Failed to backfill province stats: ${err.message}`);
  }
  stats = await ProvinceStat.find().sort({ score: -1, memberCount: -1, province: 1 }).lean();
  return stats;
}

async function computeUserRank(userDoc) {
  if (!userDoc) return null;
  const score = Number(userDoc.score) || 0;
  const higher = await User.countDocuments({ score: { $gt: score } });
  return sanitizeScore(higher + 1);
}

async function computeProvinceRank(provinceName, provinceScore) {
  if (!provinceName) return null;
  const stats = await ProvinceStat.countDocuments({ score: { $gt: provinceScore || 0 } });
  return sanitizeScore(stats + 1);
}

async function computeGroupRank(groupId, groupScore) {
  if (!groupId) return null;
  const higher = await Group.countDocuments({ score: { $gt: groupScore || 0 } });
  return sanitizeScore(higher + 1);
}

async function buildOverviewPayload(userDoc) {
  const [users, groups, provinces] = await Promise.all([
    User.find().sort({ score: -1, createdAt: 1 }).limit(LEADERBOARD_LIMIT).lean(),
    Group.find().sort({ score: -1, members: -1, name: 1 }).limit(LEADERBOARD_LIMIT).lean(),
    loadProvinceStats()
  ]);

  const userEntries = users.map(mapUserForResponse).filter(Boolean);
  const groupEntries = groups.map(mapGroupForResponse).filter(Boolean);
  const provinceEntries = provinces.map(mapProvinceForResponse).filter(Boolean);

  const result = {
    users: userEntries,
    groups: groupEntries,
    provinces: provinceEntries,
  };

  if (userDoc) {
    const rank = await computeUserRank(userDoc);
    const provinceRank = userDoc.province
      ? await computeProvinceRank(userDoc.province, userDoc.score)
      : null;
    const groupRank = userDoc.groupId
      ? await computeGroupRank(userDoc.groupId, userDoc.score)
      : null;
    result.user = {
      id: userDoc._id ? userDoc._id.toString() : undefined,
      name: userDoc.name || userDoc.username || '',
      username: userDoc.username || '',
      avatar: userDoc.avatar || '',
      score: sanitizeScore(userDoc.score),
      coins: sanitizeScore(userDoc.coins),
      keys: sanitizeScore(userDoc.keys),
      province: userDoc.province || '',
      groupId: userDoc.groupId || '',
      group: userDoc.groupName || '',
      rank,
      provinceRank,
      groupRank,
    };
  }

  return result;
}

async function applyScoreDelta({
  userId,
  scoreDelta = 0,
  coinDelta = 0,
  keyDelta = 0,
  province = undefined,
  group = undefined,
}) {
  if (!userId) throw new Error('userId is required');
  const userDoc = await User.findById(userId);
  if (!userDoc) throw new Error('User not found');

  const normalizedProvince = province === undefined ? userDoc.province : normalizeProvince(province);
  const normalizedGroup = group === undefined ? undefined : normalizeGroupInput(group);

  const scoreInc = Number.isFinite(scoreDelta) ? Math.round(scoreDelta) : 0;
  const coinInc = Number.isFinite(coinDelta) ? Math.round(coinDelta) : 0;
  const keyInc = Number.isFinite(keyDelta) ? Math.round(keyDelta) : 0;

  const inc = {};
  if (scoreInc) inc.score = scoreInc;
  if (coinInc) inc.coins = coinInc;
  if (keyInc) inc.keys = keyInc;

  const update = {};
  if (Object.keys(inc).length) {
    update.$inc = inc;
  }
  const set = {};

  if (normalizedProvince !== undefined && normalizedProvince !== userDoc.province) {
    set.province = normalizedProvince;
  }

  if (normalizedGroup !== undefined) {
    if (normalizedGroup === null) {
      set.groupId = '';
      set.groupName = '';
    } else {
      set.groupId = normalizedGroup.id;
      set.groupName = normalizedGroup.name;
    }
  }

  if (Object.keys(set).length) {
    update.$set = set;
  }

  if (!Object.keys(update).length) {
    return buildOverviewPayload(userDoc);
  }

  const updatedUser = await User.findByIdAndUpdate(userDoc._id, update, { new: true, runValidators: false });

  await incrementProvinceStats(userDoc.province || '', updatedUser.province || '', scoreInc);

  const desiredGroup = normalizedGroup === undefined
    ? { id: updatedUser.groupId || '', name: updatedUser.groupName || '' }
    : normalizedGroup;

  await handleGroupTransition(userDoc, updatedUser, desiredGroup, scoreInc);

  return buildOverviewPayload(updatedUser);
}

async function updateProfile({ userId, province = undefined, group = undefined }) {
  return applyScoreDelta({ userId, scoreDelta: 0, coinDelta: 0, keyDelta: 0, province, group });
}

async function getOverview({ userId } = {}) {
  let userDoc = null;
  if (userId) {
    userDoc = await User.findById(userId);
  }
  return buildOverviewPayload(userDoc);
}

module.exports = {
  applyScoreDelta,
  updateProfile,
  getOverview,
};
