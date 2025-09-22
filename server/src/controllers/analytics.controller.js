const User = require('../models/User');
const Question = require('../models/Question');
const Category = require('../models/Category');
const Ad = require('../models/Ad');

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
  return list.map((item) => {
    const questionCount = Number(item?.questionCount) || 0;
    const categoryDoc = item?.category || {};
    const categoryId = item?._id ? String(item._id) : null;
    return {
      id: categoryId,
      name: categoryDoc.displayName || categoryDoc.name || 'نامشخص',
      color: categoryDoc.color || 'blue',
      questionCount,
      percentage: totalQuestions > 0
        ? Math.round((questionCount / totalQuestions) * 1000) / 10
        : 0
    };
  });
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
            questionCount: { $sum: 1 }
          }
        },
        { $sort: { questionCount: -1 } },
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
