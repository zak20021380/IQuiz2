const Group = require('../models/Group');
const GroupBattle = require('../models/GroupBattle');
const { ensureDefaultGroups } = require('../services/groupSeed');
const { simulateGroupBattle, applyBattleRewards, ensureRoster } = require('../services/groupBattle');

exports.listGroups = async (req, res, next) => {
  try {
    await ensureDefaultGroups();
    const groups = await Group.find().sort({ score: -1, wins: -1, name: 1 });
    groups.forEach((group) => ensureRoster(group));
    const dirty = groups.filter((group) => group.isModified());
    if (dirty.length) {
      await Promise.all(dirty.map((group) => group.save()));
    }
    res.json({ ok: true, data: groups.map((group) => group.toJSON()) });
  } catch (err) {
    next(err);
  }
};

exports.listBattles = async (req, res, next) => {
  try {
    const battles = await GroupBattle.find().sort({ playedAt: -1 }).limit(20);
    res.json({ ok: true, data: battles.map((battle) => battle.toJSON()) });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { hostGroupId, opponentGroupId, user } = req.body || {};

    if (!hostGroupId || !opponentGroupId || hostGroupId === opponentGroupId) {
      return res.status(400).json({ ok: false, message: 'انتخاب گروه‌ها معتبر نیست.' });
    }

    await ensureDefaultGroups();

    const [hostGroup, opponentGroup] = await Promise.all([
      Group.findOne({ groupId: hostGroupId }),
      Group.findOne({ groupId: opponentGroupId }),
    ]);

    if (!hostGroup || !opponentGroup) {
      return res.status(404).json({ ok: false, message: 'گروه مورد نظر یافت نشد.' });
    }

    const result = simulateGroupBattle(hostGroup, opponentGroup, user);
    const rewards = applyBattleRewards(result, hostGroup, opponentGroup, user || {});

    await Promise.all([hostGroup.save(), opponentGroup.save()]);

    const battleDoc = await GroupBattle.create({
      battleId: result.id,
      playedAt: new Date(result.playedAt),
      hostGroupId: hostGroup.groupId,
      opponentGroupId: opponentGroup.groupId,
      host: result.host,
      opponent: result.opponent,
      rounds: result.rounds,
      winnerGroupId: result.winnerGroupId,
      diff: result.diff,
      rewards,
    });

    const groups = await Group.find().sort({ score: -1, wins: -1, name: 1 });

    res.status(201).json({
      ok: true,
      data: battleDoc.toJSON(),
      meta: {
        groups: groups.map((group) => group.toJSON()),
      },
    });
  } catch (err) {
    next(err);
  }
};
