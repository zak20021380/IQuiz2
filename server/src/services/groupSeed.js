const Group = require('../models/Group');
const defaults = require('../seed/groups.data');

let ensurePromise = null;

async function upsertDefaultGroup(group) {
  const existing = await Group.findOne({ groupId: group.groupId });
  if (!existing) {
    await Group.create(group);
    return;
  }

  let needsSave = false;

  ['name', 'score', 'members', 'admin', 'created', 'wins', 'losses'].forEach((key) => {
    if (group[key] != null && existing[key] !== group[key]) {
      existing[key] = group[key];
      needsSave = true;
    }
  });

  if (Array.isArray(group.memberList) && group.memberList.length && existing.memberList.length === 0) {
    existing.memberList = group.memberList;
    needsSave = true;
  }

  if (Array.isArray(group.matches) && group.matches.length && existing.matches.length === 0) {
    existing.matches = group.matches;
    needsSave = true;
  }

  if (Array.isArray(group.roster) && group.roster.length && existing.roster.length === 0) {
    existing.roster = group.roster;
    needsSave = true;
  }

  if (needsSave) await existing.save();
}

async function ensureDefaultGroups() {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    const count = await Group.countDocuments();
    if (count === 0) {
      await Group.insertMany(defaults);
      return;
    }

    await Promise.all(defaults.map(upsertDefaultGroup));
  })()
    .catch((err) => {
      ensurePromise = null;
      throw err;
    })
    .finally(() => {
      ensurePromise = null;
    });

  return ensurePromise;
}

module.exports = { ensureDefaultGroups };
