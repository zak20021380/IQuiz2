const Payment = require('../models/Payment');

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function effectivePaymentDate(payment) {
  return toDate(payment.verifiedAt)
    || toDate(payment.updatedAt)
    || toDate(payment.createdAt);
}

function computeDeltaPercent(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function computeTrend(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 'neutral';
  if (current > previous) return 'positive';
  if (current < previous) return 'negative';
  return 'neutral';
}

function sumRevenue(payments) {
  return payments.reduce((total, payment) => total + (Number(payment.amountToman) || 0), 0);
}

function buildPackageSummary(payment) {
  const snapshot = payment.packageSnapshot || {};
  const displayName = snapshot.displayName || snapshot.name || snapshot.title;
  const fallbackName = payment.type === 'vip' ? 'اشتراک VIP' : `بسته ${payment.packageId}`;
  const name = (displayName && String(displayName).trim()) || fallbackName;
  let category = snapshot.category;
  if (!category) {
    if (payment.type === 'vip') category = 'اشتراک ویژه';
    else if (payment.type === 'coins' || payment.type === 'external') category = 'بسته سکه';
    else category = 'آیتم فروشگاه';
  }
  return { name, category };
}

function filterPayments(payments, start, end) {
  const startTime = start ? start.getTime() : Number.NEGATIVE_INFINITY;
  const endTime = end ? end.getTime() : Number.POSITIVE_INFINITY;
  return payments.filter((payment) => {
    const time = payment.effectiveAt.getTime();
    return time >= startTime && time < endTime;
  });
}

function buildDailyTimeline(payments, start, days) {
  const timeline = [];
  for (let i = 0; i < days; i += 1) {
    const dayStart = new Date(start.getTime() + i * DAY_MS);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const slice = filterPayments(payments, dayStart, dayEnd);
    timeline.push({
      date: dayStart.toISOString().slice(0, 10),
      revenue: Math.round(sumRevenue(slice)),
      orders: slice.length,
    });
  }
  return timeline;
}

function buildBucketTimeline(payments, start, end, bucketSizeDays, labelBuilder) {
  const timeline = [];
  let bucketIndex = 0;
  let bucketStart = new Date(start);
  while (bucketStart < end) {
    const bucketEnd = new Date(Math.min(end.getTime(), bucketStart.getTime() + bucketSizeDays * DAY_MS));
    const slice = filterPayments(payments, bucketStart, bucketEnd);
    timeline.push({
      date: bucketStart.toISOString().slice(0, 10),
      label: labelBuilder(bucketIndex, bucketStart, bucketEnd),
      revenue: Math.round(sumRevenue(slice)),
      orders: slice.length,
    });
    bucketIndex += 1;
    bucketStart = bucketEnd;
  }
  return timeline;
}

async function loadRecentPaidPayments() {
  const now = new Date();
  const earliest = new Date(startOfDay(now).getTime() - 120 * DAY_MS);
  const records = await Payment.find({
    status: 'paid',
    $or: [
      { verifiedAt: { $gte: earliest } },
      { verifiedAt: null, createdAt: { $gte: earliest } },
    ],
  }).select({
    amountToman: 1,
    packageId: 1,
    packageSnapshot: 1,
    type: 1,
    verifiedAt: 1,
    createdAt: 1,
    updatedAt: 1,
  }).lean();

  return records
    .map((record) => {
      const effectiveAt = effectivePaymentDate(record);
      const amount = Number(record.amountToman) || 0;
      if (!effectiveAt || amount <= 0) {
        return null;
      }
      const { name, category } = buildPackageSummary(record);
      return {
        amountToman: amount,
        packageId: String(record.packageId || '').trim() || 'unknown',
        packageName: name,
        packageCategory: category,
        effectiveAt,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.effectiveAt - b.effectiveAt);
}

function buildTopItems(payments, totalRevenue) {
  if (!payments.length || totalRevenue <= 0) return [];
  const summary = new Map();
  payments.forEach((payment) => {
    const key = payment.packageId;
    const existing = summary.get(key) || {
      id: key,
      name: payment.packageName,
      category: payment.packageCategory,
      revenue: 0,
      orders: 0,
    };
    existing.revenue += payment.amountToman;
    existing.orders += 1;
    summary.set(key, existing);
  });

  return Array.from(summary.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      revenue: Math.round(item.revenue),
      orders: item.orders,
      share: totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0,
    }));
}

function buildMetric({
  currentRevenue,
  currentOrders,
  previousRevenue,
  compareLabel,
  previousOrders,
}) {
  const delta = computeDeltaPercent(currentRevenue, previousRevenue);
  const trend = computeTrend(currentRevenue, previousRevenue);
  const safeDelta = Number.isFinite(delta) ? delta : (previousRevenue > 0 ? 0 : null);
  const metric = {
    revenue: Math.round(currentRevenue),
    orders: currentOrders,
    compareTo: compareLabel,
    trend,
  };
  if (Number.isFinite(safeDelta)) {
    metric.delta = safeDelta;
  }
  if (previousOrders != null) {
    metric.previousOrders = previousOrders;
  }
  return metric;
}

async function getRevenueOverview() {
  const payments = await loadRecentPaidPayments();
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);
  const prevWeekStart = new Date(weekStart.getTime() - 7 * DAY_MS);
  const monthStart = new Date(todayStart.getTime() - 29 * DAY_MS);
  const prevMonthStart = new Date(monthStart.getTime() - 30 * DAY_MS);
  const quarterStart = new Date(todayStart.getTime() - 89 * DAY_MS);

  const todayPayments = filterPayments(payments, todayStart, now);
  const yesterdayPayments = filterPayments(payments, new Date(todayStart.getTime() - DAY_MS), todayStart);

  const weekPayments = filterPayments(payments, weekStart, now);
  const prevWeekPayments = filterPayments(payments, prevWeekStart, weekStart);

  const monthPayments = filterPayments(payments, monthStart, now);
  const prevMonthPayments = filterPayments(payments, prevMonthStart, monthStart);

  const quarterPayments = filterPayments(payments, quarterStart, now);

  const todayRevenue = sumRevenue(todayPayments);
  const yesterdayRevenue = sumRevenue(yesterdayPayments);
  const weekRevenue = sumRevenue(weekPayments);
  const prevWeekRevenue = sumRevenue(prevWeekPayments);
  const monthRevenue = sumRevenue(monthPayments);
  const prevMonthRevenue = sumRevenue(prevMonthPayments);
  const quarterRevenue = sumRevenue(quarterPayments);

  const todayOrders = todayPayments.length;
  const weekOrders = weekPayments.length;
  const monthOrders = monthPayments.length;
  const quarterOrders = quarterPayments.length;
  const prevWeekOrders = prevWeekPayments.length;
  const prevMonthOrders = prevMonthPayments.length;

  const averageOrderValue = monthOrders > 0 ? monthRevenue / monthOrders : 0;
  const previousAverage = prevMonthOrders > 0 ? prevMonthRevenue / prevMonthOrders : 0;
  const averageDelta = computeDeltaPercent(averageOrderValue, previousAverage);
  const averageTrend = computeTrend(averageOrderValue, previousAverage);

  const weeklyTimeline = buildDailyTimeline(payments, weekStart, 7);
  const monthlyTimeline = buildBucketTimeline(
    payments,
    monthStart,
    now,
    7,
    (index) => `هفته ${index + 1}`,
  );
  const quarterTimeline = buildBucketTimeline(
    payments,
    quarterStart,
    now,
    30,
    (index) => `ماه ${index + 1}`,
  );

  const topItems = buildTopItems(monthPayments, monthRevenue);

  const dataset = {
    currency: 'rial',
    updatedAt: now.toISOString(),
    metrics: {
      today: buildMetric({
        currentRevenue: todayRevenue,
        currentOrders: todayOrders,
        previousRevenue: yesterdayRevenue,
        compareLabel: 'در مقایسه با دیروز',
        previousOrders: yesterdayPayments.length,
      }),
      week: buildMetric({
        currentRevenue: weekRevenue,
        currentOrders: weekOrders,
        previousRevenue: prevWeekRevenue,
        compareLabel: 'نسبت به هفته قبل',
        previousOrders: prevWeekOrders,
      }),
      month: buildMetric({
        currentRevenue: monthRevenue,
        currentOrders: monthOrders,
        previousRevenue: prevMonthRevenue,
        compareLabel: 'نسبت به ماه قبل',
        previousOrders: prevMonthOrders,
      }),
      average: {
        revenue: Math.round(averageOrderValue),
        orders: monthOrders,
        compareTo: 'میانگین ماه قبل',
        trend: averageTrend,
      },
    },
    ranges: {
      weekly: {
        label: '۷ روز اخیر',
        totalRevenue: Math.round(weekRevenue),
        totalOrders: weekOrders,
        timeline: weeklyTimeline,
      },
      monthly: {
        label: '۳۰ روز اخیر',
        totalRevenue: Math.round(monthRevenue),
        totalOrders: monthOrders,
        timeline: monthlyTimeline,
      },
      quarter: {
        label: '۹۰ روز اخیر',
        totalRevenue: Math.round(quarterRevenue),
        totalOrders: quarterOrders,
        timeline: quarterTimeline,
      },
    },
    topItems,
  };

  if (Number.isFinite(averageDelta)) {
    dataset.metrics.average.delta = averageDelta;
  }

  if (topItems.length > 0) {
    dataset.highlight = {
      name: topItems[0].name,
      revenue: topItems[0].revenue,
      orders: topItems[0].orders,
      share: topItems[0].share,
    };
  }

  return dataset;
}

module.exports = {
  getRevenueOverview,
};
