const Group = require('../models/Group');
const { ensureDefaultGroups } = require('./groupSeed');
const { ensureRoster } = require('./groupBattle');

async function loadGroups() {
  await ensureDefaultGroups();
  const groups = await Group.find().sort({ score: -1, wins: -1, members: -1, name: 1 });
  groups.forEach((group) => ensureRoster(group));
  const dirty = groups.filter((group) => group.isModified());
  if (dirty.length) {
    await Promise.all(dirty.map((group) => group.save()));
  }
  return groups;
}

function serializeGroup(group) {
  if (!group) return null;
  if (typeof group.toJSON === 'function') {
    return group.toJSON();
  }
  return group;
}

module.exports = {
  loadGroups,
  serializeGroup,
};
