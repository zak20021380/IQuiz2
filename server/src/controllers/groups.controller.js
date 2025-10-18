const Group = require('../models/Group');
const User = require('../models/User');
const leaderboardService = require('../services/leaderboard');
const { loadGroups, serializeGroup } = require('../services/groups');

function sanitizeGroupId(value) {
  if (value == null) return '';
  const str = String(value).trim();
  return str;
}

function sanitizeGroupName(value) {
  if (!value && value !== 0) return '';
  const str = String(value).replace(/\s+/g, ' ').trim();
  if (!str) return '';
  if (str.length < 3 || str.length > 48) return '';
  return str;
}

function slugifyName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    || 'group';
}

async function generateUniqueGroupId(name) {
  const base = slugifyName(name) || 'group';
  let candidate = base;
  let suffix = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Group.exists({ groupId: candidate })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 20) {
      candidate = `${base}-${Date.now().toString(36)}`;
      if (!(await Group.exists({ groupId: candidate }))) break; // eslint-disable-line no-await-in-loop
    }
  }
  return candidate;
}

function deriveMemberName(user) {
  if (!user) return '';
  if (user.name) return user.name;
  if (user.username) return user.username;
  if (user.telegramUsername) return user.telegramUsername;
  if (user.telegramId) return `tg_${user.telegramId}`;
  if (user._id) return String(user._id);
  return '';
}

async function ensureAdminAfterDeparture(groupId, departingMemberName) {
  if (!groupId) return { removed: false };
  const group = await Group.findOne({ groupId });
  if (!group) {
    return { removed: true };
  }

  const adminName = group.admin ? String(group.admin).trim() : '';
  if (adminName && (!departingMemberName || adminName !== departingMemberName)) {
    return { removed: false };
  }

  const members = Array.isArray(group.memberList)
    ? group.memberList.filter((member) => member && member !== departingMemberName)
    : [];

  if (!members.length) {
    await Group.deleteOne({ groupId });
    return { removed: true };
  }

  group.admin = members[0];
  await group.save();
  return { removed: false, newAdmin: members[0] };
}

async function buildSuccessResponse({ res, status = 200, groupDoc = null, overview = null, removedGroupId = null, userId = null }) {
  const groups = await loadGroups();
  const meta = {
    groups: groups.map((group) => serializeGroup(group)),
  };

  if (overview) {
    meta.overview = overview;
  } else if (userId) {
    meta.overview = await leaderboardService.getOverview({ userId });
  }

  if (removedGroupId) {
    meta.removedGroupId = removedGroupId;
  }

  res.status(status).json({
    ok: true,
    data: groupDoc ? serializeGroup(groupDoc) : null,
    meta,
  });
}

exports.list = async (req, res, next) => {
  try {
    const groups = await loadGroups();
    res.json({ ok: true, data: groups.map((group) => serializeGroup(group)) });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: 'ابتدا وارد حساب کاربری شوید.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ ok: false, message: 'کاربر یافت نشد.' });
    }

    if (user.groupId) {
      return res.status(400).json({ ok: false, message: 'برای ساخت گروه جدید باید ابتدا از گروه فعلی خارج شوید.' });
    }

    const nameInput = req.body?.name ?? req.body?.groupName ?? '';
    const name = sanitizeGroupName(nameInput);
    if (!name) {
      return res.status(400).json({ ok: false, message: 'نام گروه معتبر نیست. حداقل ۳ و حداکثر ۴۸ کاراکتر وارد کنید.' });
    }

    const existing = await Group.findOne({ name });
    if (existing) {
      return res.status(409).json({ ok: false, message: 'گروهی با این نام قبلاً ثبت شده است.' });
    }

    const groupId = await generateUniqueGroupId(name);
    const memberName = deriveMemberName(user);
    const score = Number.isFinite(Number(user.score)) ? Math.max(0, Math.round(Number(user.score))) : 0;
    const created = new Date().toISOString();

    const groupDoc = new Group({
      groupId,
      name,
      admin: memberName,
      created,
      score,
      members: 0,
      memberList: [],
      requests: [],
      matches: [],
    });
    await groupDoc.save();

    const overview = await leaderboardService.updateProfile({
      userId: user._id,
      group: { id: groupId, name },
    });

    const updatedGroup = await Group.findOneAndUpdate(
      { groupId },
      {
        $set: { admin: memberName, created },
        $pull: { requests: String(user._id) },
      },
      { new: true }
    );

    await buildSuccessResponse({ res, status: 201, groupDoc: updatedGroup, overview });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({ ok: false, message: 'شناسه این گروه قبلاً استفاده شده است. لطفاً نام دیگری انتخاب کنید.' });
      return;
    }
    next(error);
  }
};

exports.join = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: 'ابتدا وارد حساب کاربری شوید.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ ok: false, message: 'کاربر یافت نشد.' });
    }

    const groupId = sanitizeGroupId(req.params.groupId);
    if (!groupId) {
      return res.status(400).json({ ok: false, message: 'شناسه گروه نامعتبر است.' });
    }

    if (user.groupId && user.groupId === groupId) {
      return res.status(400).json({ ok: false, message: 'شما هم‌اکنون عضو این گروه هستید.' });
    }

    const group = await Group.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ ok: false, message: 'گروه مورد نظر یافت نشد.' });
    }

    const previousGroupId = user.groupId || '';
    const departingName = previousGroupId ? deriveMemberName(user) : '';

    const overview = await leaderboardService.updateProfile({
      userId: user._id,
      group: { id: group.groupId, name: group.name },
    });

    await Group.updateOne(
      { groupId },
      { $pull: { requests: String(user._id) } }
    ).catch(() => {});

    if (previousGroupId && previousGroupId !== groupId && departingName) {
      await ensureAdminAfterDeparture(previousGroupId, departingName);
    }

    const updatedGroup = await Group.findOne({ groupId });
    await buildSuccessResponse({ res, groupDoc: updatedGroup, overview });
  } catch (error) {
    next(error);
  }
};

exports.leave = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: 'ابتدا وارد حساب کاربری شوید.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ ok: false, message: 'کاربر یافت نشد.' });
    }

    const groupId = sanitizeGroupId(req.params.groupId);
    if (!groupId) {
      return res.status(400).json({ ok: false, message: 'شناسه گروه نامعتبر است.' });
    }

    if (!user.groupId || user.groupId !== groupId) {
      return res.status(400).json({ ok: false, message: 'شما عضو این گروه نیستید.' });
    }

    const memberName = deriveMemberName(user);
    const overview = await leaderboardService.updateProfile({ userId: user._id, group: null });
    const { removed } = await ensureAdminAfterDeparture(groupId, memberName);
    await buildSuccessResponse({ res, groupDoc: null, overview, removedGroupId: removed ? groupId : null });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: 'ابتدا وارد حساب کاربری شوید.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ ok: false, message: 'کاربر یافت نشد.' });
    }

    const groupId = sanitizeGroupId(req.params.groupId);
    if (!groupId) {
      return res.status(400).json({ ok: false, message: 'شناسه گروه نامعتبر است.' });
    }

    const group = await Group.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ ok: false, message: 'گروه یافت نشد.' });
    }

    const adminName = deriveMemberName(user);
    if (!adminName || group.admin !== adminName) {
      return res.status(403).json({ ok: false, message: 'فقط مدیر گروه می‌تواند آن را حذف کند.' });
    }

    await Group.deleteOne({ groupId });
    await User.updateMany(
      { groupId },
      { $set: { groupId: '', groupName: '' } }
    );

    const overview = await leaderboardService.updateProfile({ userId: user._id, group: null });
    await buildSuccessResponse({ res, overview, removedGroupId: groupId });
  } catch (error) {
    next(error);
  }
};
