const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const Category = require('../models/Category');
const Ad = require('../models/Ad');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const logger = require('../config/logger');

const weekdayFormatter = new Intl.DateTimeFormat('fa-IR', { weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat('fa-IR', { month: '2-digit', day: '2-digit' });

function buildDailySeries(raw = [], startDate, days = 7) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const bucket = new Map();
  raw.forEach((item) => {
    if (!item || typeof item._id !== 'string') return;
    const key = item._id;
    const count = Number(item.count) || 0;
    bucket.set(key, count);
  });
  const series = [];
  for (let i = 0; i < days; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = current.toISOString().slice(0, 10);
    const count = bucket.get(key) || 0;
    const displayDate = new Date(current);
    series.push({
      date: key,
      count,
      label: weekdayFormatter.format(displayDate),
      fullLabel: dateFormatter.format(displayDate)
    });
  }
  return series;
}

function mapTopCategories(list, totalQuestions) {
  const totals = list.reduce((acc, item) => {
    acc.questions += Number(item?.questionCount) || 0;
    acc.selections += Number(item?.selectionCount) || 0;
    acc.consumption += Number(item?.consumptionCount) || 0;
    return acc;
  }, { questions: 0, selections: 0, consumption: 0 });

  return list.map((item) => {
    const questionCount = Number(item?.questionCount) || 0;
    const selectionCount = Number(item?.selectionCount) || 0;
    const consumptionCount = Number(item?.consumptionCount) || 0;
    const categoryDoc = item?.category || {};
    const categoryId = item?._id ? String(item._id) : null;

    const questionShare = totalQuestions > 0
      ? Math.round((questionCount / totalQuestions) * 1000) / 10
      : 0;
    const selectionShare = totals.selections > 0
      ? Math.round((selectionCount / totals.selections) * 1000) / 10
      : 0;
    const consumptionShare = totals.consumption > 0
      ? Math.round((consumptionCount / totals.consumption) * 1000) / 10
      : 0;

    return {
      id: categoryId,
      name: categoryDoc.displayName || categoryDoc.name || 'نامشخص',
      color: categoryDoc.color || 'blue',
      questionCount,
      selectionCount,
      consumptionCount,
      percentage: questionShare,
      selectionShare,
      consumptionShare
    };
  });
}

function buildCoalesceExpression(paths, fallback = 0) {
  if (!Array.isArray(paths) || paths.length === 0) return fallback;
  return paths.reduceRight((acc, path) => ({ $ifNull: [path, acc] }), fallback);
}

function buildNumericAccumulator(paths) {
  return {
    $sum: {
      $convert: {
        input: buildCoalesceExpression(paths),
        to: 'double',
        onError: 0,
        onNull: 0
      }
    }
  };
}

function buildActivityStream(users = [], questions = [], ads = []) {
  const items = [];

  users.forEach((user) => {
    if (!user) return;
    items.push({
      type: 'user',
      title: 'ثبت‌نام کاربر جدید',
      description: user.username ? `کاربر «${user.username}» ثبت‌نام کرد` : 'کاربر جدید به آیکوئیز پیوست',
      icon: 'fa-user-plus',
      accent: 'emerald',
      createdAt: user.createdAt
    });
  });

  questions.forEach((question) => {
    if (!question) return;
    const title = question.status === 'approved' ? 'سوال تایید شد' : 'سوال جدید ثبت شد';
    const categoryName = question.categoryName || 'نامشخص';
    items.push({
      type: 'question',
      title,
      description: `دسته‌بندی: ${categoryName}`,
      icon: 'fa-circle-question',
      accent: question.status === 'approved' ? 'sky' : 'amber',
      createdAt: question.createdAt
    });
  });

  ads.forEach((ad) => {
    if (!ad) return;
    const status = typeof ad.status === 'string' ? ad.status.toLowerCase() : '';
    const statusLabel = status === 'active' ? 'فعال شد' : status === 'paused' ? 'متوقف شد' : 'ایجاد شد';
    items.push({
      type: 'ad',
      title: 'کمپین تبلیغاتی',
      description: ad.name ? `کمپین «${ad.name}» ${statusLabel}` : 'کمپین تبلیغاتی جدید',
      icon: 'fa-bullhorn',
      accent: status === 'active' ? 'amber' : 'violet',
      createdAt: ad.createdAt
    });
  });

  return items
    .map((item) => {
      if (!item?.createdAt) return null;
      const date = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
      if (Number.isNaN(date.getTime())) return null;
      return { ...item, createdAt: date };
    })
    .filter(Boolean)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8)
    .map((item) => ({
      type: item.type,
      title: item.title,
      description: item.description,
      icon: item.icon,
      accent: item.accent,
      createdAt: item.createdAt.toISOString()
    }));
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parseDateInput(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function normalizeString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

exports.dashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWindow = new Date(startOfToday);
    startOfWindow.setDate(startOfWindow.getDate() - 6);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      newUsers24h,
      newUsersToday,
      newUsersYesterday,
      userDailyAgg,
      categoriesTotal,
      categoriesActive,
      categoriesPending,
      categoriesDisabled,
      categoriesWithQuestionsIds,
      questionsTotal,
      topCategoryAgg,
      adsStatusAgg,
      recentUsers,
      recentQuestions,
      recentAds
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active', isActive: { $ne: false } }),
      User.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
      User.countDocuments({ createdAt: { $gte: startOfToday, $lt: startOfTomorrow } }),
      User.countDocuments({ createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
      User.aggregate([
        { $match: { createdAt: { $gte: startOfWindow } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Category.countDocuments(),
      Category.countDocuments({ status: 'active' }),
      Category.countDocuments({ status: 'pending' }),
      Category.countDocuments({ status: 'disabled' }),
      Question.distinct('category'),
      Question.countDocuments(),
      Question.aggregate([
        {
          $group: {
            _id: '$category',
            questionCount: { $sum: 1 },
            selectionCount: buildNumericAccumulator([
              '$meta.analytics.selectionCount',
              '$meta.analytics.selections',
              '$meta.stats.selectionCount',
              '$meta.stats.selections',
              '$meta.usage.selectionCount',
              '$meta.usage.selections'
            ]),
            consumptionCount: buildNumericAccumulator([
              '$meta.analytics.consumptionCount',
              '$meta.analytics.playedCount',
              '$meta.analytics.consumed',
              '$meta.stats.consumptionCount',
              '$meta.stats.playedCount',
              '$meta.stats.consumed',
              '$meta.usage.consumptionCount',
              '$meta.usage.played',
              '$meta.usage.consumed'
            ])
          }
        },
        {
          $addFields: {
            engagementScore: {
              $add: [
                { $multiply: [{ $ifNull: ['$selectionCount', 0] }, 1.5] },
                { $ifNull: ['$consumptionCount', 0] },
                { $multiply: [{ $ifNull: ['$questionCount', 0] }, 0.35] }
              ]
            }
          }
        },
        { $sort: { engagementScore: -1, selectionCount: -1, questionCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $unwind: {
            path: '$category',
            preserveNullAndEmptyArrays: true
          }
        }
      ]),
      Ad.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      User.find().sort({ createdAt: -1 }).limit(5).lean(),
      Question.find().sort({ createdAt: -1 }).limit(5).lean(),
      Ad.find().sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const dailySeries = buildDailySeries(userDailyAgg, startOfWindow, 7);
    const categoriesWithQuestionsCount = categoriesWithQuestionsIds
      .filter((value) => value != null)
      .length;

    const adsByStatus = adsStatusAgg.reduce((acc, item) => {
      if (!item || typeof item._id !== 'string') return acc;
      acc[item._id] = Number(item.count) || 0;
      return acc;
    }, {});
    const adsTotal = Object.values(adsByStatus).reduce((sum, value) => sum + value, 0);

    const topCategories = mapTopCategories(topCategoryAgg, questionsTotal);
    const activity = buildActivityStream(recentUsers, recentQuestions, recentAds);

    res.json({
      ok: true,
      data: {
        generatedAt: now.toISOString(),
        users: {
          total: totalUsers,
          active: activeUsers,
          new24h: newUsers24h,
          today: newUsersToday,
          yesterday: newUsersYesterday,
          daily: dailySeries
        },
        categories: {
          total: categoriesTotal,
          active: categoriesActive,
          pending: categoriesPending,
          disabled: categoriesDisabled,
          withQuestions: categoriesWithQuestionsCount
        },
        ads: {
          total: adsTotal,
          active: adsByStatus.active || 0,
          paused: adsByStatus.paused || 0,
          draft: adsByStatus.draft || 0,
          archived: adsByStatus.archived || 0
        },
        questions: {
          total: questionsTotal
        },
        topCategories,
        activity
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.recordEvent = async (req, res, next) => {
  try {
    const payload = isPlainObject(req.body) ? req.body : {};

    const rawName = normalizeString(payload.eventName || payload.name || payload.event || '');
    if (!rawName) {
      return res.status(400).json({ ok: false, message: 'eventName is required' });
    }

    const occurredAt = parseDateInput(
      payload.occurredAt
      || payload.timestamp
      || payload.time
      || payload.eventTime
    );

    if (!occurredAt) {
      return res.status(400).json({ ok: false, message: 'A valid timestamp is required' });
    }

    const rawUserId = normalizeString(payload.userId || payload.accountId || '');
    let userId = null;
    if (rawUserId) {
      if (!mongoose.Types.ObjectId.isValid(rawUserId)) {
        return res.status(400).json({ ok: false, message: 'userId must be a valid ObjectId' });
      }
      userId = rawUserId;
    }

    const guestId = normalizeString(payload.guestId || payload.sessionId || payload.deviceId || '');
    if (!userId && !guestId) {
      return res.status(400).json({ ok: false, message: 'guestId or userId is required' });
    }

    let metadata = null;
    if (payload.metadata !== undefined) {
      if (!isPlainObject(payload.metadata)) {
        return res.status(400).json({ ok: false, message: 'metadata must be an object' });
      }
      metadata = payload.metadata;
    }

    const eventToPersist = {
      name: rawName,
      occurredAt,
      userId,
      guestId: guestId || null,
      metadata,
      userAgent: normalizeString(req.get?.('user-agent') || ''),
      clientIp: normalizeString(req.ip || (req.connection && req.connection.remoteAddress) || ''),
      receivedAt: new Date()
    };

    let persisted = false;
    const readyState = mongoose.connection.readyState;
    if (readyState === 1 || readyState === 2) {
      try {
        await AnalyticsEvent.create(eventToPersist);
        persisted = true;
      } catch (error) {
        logger.warn(`[analytics] Failed to persist event "${rawName}": ${error.message}`);
      }
    }

    if (!persisted) {
      logger.info(`[analytics] ${rawName}`, {
        event: eventToPersist
      });
    }

    return res.status(201).json({ ok: true });
  } catch (error) {
    logger.error(`[analytics] Failed to record event: ${error.message}`);
    return next(error);
  }
};
