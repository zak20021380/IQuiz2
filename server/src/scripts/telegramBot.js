#!/usr/bin/env node
require('dotenv').config();

const fetch = require('node-fetch');
const { Telegraf, Markup } = require('telegraf');
const env = require('../config/env');
const logger = require('../config/logger');

const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || env.telegram.botToken || '').trim();

if (!BOT_TOKEN) {
  console.error('[telegram-bot] TELEGRAM_BOT_TOKEN is required.');
  process.exit(1);
}

const DEFAULT_JWT = (process.env.TELEGRAM_BOT_DEFAULT_JWT || '').trim();
const BASE_URL = (() => {
  const raw =
    process.env.TELEGRAM_API_BASE_URL ||
    process.env.API_BASE_URL ||
    process.env.APP_BASE_URL ||
    `http://localhost:${env.port}`;
  return String(raw).replace(/\/+$/, '');
})();

const sessions = new Map();

const bot = new Telegraf(BOT_TOKEN, {
  logger: (scope, error) => {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn(`[telegram-bot] ${scope}: ${err.message}`);
  }
});

bot.catch((error, ctx) => {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(`[telegram-bot] handler error: ${err.message}`);
  if (ctx && typeof ctx.reply === 'function') {
    ctx.reply('اوه! مشکلی پیش آمد. لطفاً دوباره امتحان کنید.').catch(() => {});
  }
});

function ensureSession(ctx) {
  const id = ctx?.from?.id;
  if (!id) {
    throw new Error('شناسه‌ی تلگرام کاربر نامشخص است.');
  }
  const key = String(id);
  if (!sessions.has(key)) {
    sessions.set(key, {
      guestId: key,
      score: 0,
      totalAnswered: 0,
      correctAnswers: 0,
      history: [],
      askedIds: new Set(),
      currentQuestion: null,
      jwt: DEFAULT_JWT ? DEFAULT_JWT : null,
      lastCategory: null,
      lastDifficulty: null,
      lastQuestionAt: 0
    });
  }
  const session = sessions.get(key);
  session.guestId = key;
  return session;
}

function parseArgs(ctx) {
  const raw = ctx?.state?.commandArgs || '';
  if (!raw) return [];
  return raw.split(/\s+/).map((item) => item.trim()).filter(Boolean);
}

async function apiRequest(path, { session, method = 'GET', body } = {}) {
  const url = new URL(path, `${BASE_URL}/`);
  if (session?.guestId) {
    url.searchParams.set('guestId', session.guestId);
  }

  const headers = { Accept: 'application/json' };
  if (session?.guestId) {
    headers['x-guest-id'] = session.guestId;
  }
  if (session?.jwt) {
    headers.Authorization = `Bearer ${session.jwt}`;
  }

  let payload;
  if (body && method.toUpperCase() !== 'GET') {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: payload
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API request failed (${response.status}): ${text || 'Unknown error'}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  return response.json();
}

async function fetchConfig(session) {
  return apiRequest('/api/public/config', { session });
}

async function fetchCategories(session) {
  return apiRequest('/api/public/categories', { session });
}

async function fetchQuestion(session, { category, difficulty } = {}) {
  const query = new URLSearchParams();
  query.set('count', '1');
  if (category) query.set('category', category);
  if (difficulty) query.set('difficulty', difficulty);
  if (session?.guestId) query.set('guestId', session.guestId);

  const data = await apiRequest(`/api/public/questions?${query.toString()}`, { session });
  if (!data || !Array.isArray(data.items) || data.items.length === 0) {
    return null;
  }
  return data.items[0];
}

async function recordAnswer(session, questionId) {
  if (!questionId) return;
  try {
    await apiRequest('/api/public/answers', {
      session,
      method: 'POST',
      body: { questionIds: [questionId] }
    });
  } catch (error) {
    logger.warn(`[telegram-bot] failed to record answer for ${questionId}: ${error.message}`);
  }
}

function formatConfigMessage(data) {
  if (!data || typeof data !== 'object') {
    return 'پیکربندی در دسترس نیست.';
  }
  const pricing = data.pricing || {};
  const coins = Array.isArray(pricing.coins) ? pricing.coins.slice(0, 3) : [];
  const coinsSummary = coins
    .map((coin) => `• ${coin.amount} سکه → ${coin.priceToman?.toLocaleString?.('fa-IR') || coin.priceToman} تومان`)
    .join('\n');
  const limits = data.gameLimits || {};
  const matchesLimit = limits.matches?.daily != null ? limits.matches.daily : 'نامشخص';
  return [
    `🎮 *${data.appName || 'IQuiz'}*` ,
    coinsSummary ? `💰 بسته‌های سکه:\n${coinsSummary}` : null,
    `🎯 محدودیت روزانه مسابقات: ${matchesLimit}`,
    data.ads?.enabled ? '📺 تبلیغات فعال است.' : '📺 تبلیغات غیرفعال.'
  ].filter(Boolean).join('\n\n');
}

function formatCategoriesMessage(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return 'هیچ دسته‌بندی‌ای در دسترس نیست.';
  }
  const top = categories.slice(0, 10);
  const lines = top.map((cat, index) => {
    const slug = cat.slug || cat.id || `cat-${index + 1}`;
    const title = cat.title || cat.name || slug;
    return `${index + 1}. ${title} (${slug})`;
  });
  return `📚 دسته‌بندی‌های فعال:\n${lines.join('\n')}`;
}

function getQuestionOptions(question) {
  if (!question) return [];
  if (Array.isArray(question.options) && question.options.length) return question.options;
  if (Array.isArray(question.choices) && question.choices.length) return question.choices;
  return [];
}

function getCorrectIndex(question) {
  if (!question) return -1;
  if (Number.isInteger(question.answerIndex)) return Number(question.answerIndex);
  if (Number.isInteger(question.correctIdx)) return Number(question.correctIdx);
  return -1;
}

function formatQuestionMessage(session, question) {
  const options = getQuestionOptions(question);
  const difficulty = question.difficulty || 'medium';
  const header = [`سؤال جدید از دسته‌ی ${question.categoryName || question.cat || question.category || 'عمومی'}`, `درجه سختی: ${difficulty}`];
  const body = [`${question.text || question.title || 'متن سؤال در دسترس نیست.'}`];
  const optionLines = options.map((option, index) => `${index + 1}. ${option}`);
  const footer = [`امتیاز فعلی: ${session.score} | پاسخ صحیح: ${session.correctAnswers}/${session.totalAnswered}`];
  return [...header, '', ...body, '', ...optionLines, '', 'برای پاسخ از دستور /answer استفاده کنید یا یکی از دکمه‌ها را لمس نمایید.', '', footer.join(' ')]
    .join('\n');
}

function computeScoreIncrement(question, correct) {
  if (!correct) return 0;
  const difficulty = (question.difficulty || '').toLowerCase();
  switch (difficulty) {
    case 'hard':
      return 3;
    case 'easy':
      return 1;
    default:
      return 2;
  }
}

async function presentQuestion(ctx, session, question) {
  const options = getQuestionOptions(question);
  const keyboard = options.length
    ? Markup.inlineKeyboard(options.map((option, index) => [Markup.button.callback(`${index + 1}. ${option}`, `answer:${index}`)]))
    : undefined;
  const message = formatQuestionMessage(session, question);
  if (keyboard) {
    await ctx.reply(message, keyboard);
  } else {
    await ctx.reply(message);
  }
}

async function handlePlay(ctx, session, args) {
  let category = null;
  let difficulty = null;

  for (const arg of args) {
    const normalized = arg.toLowerCase();
    if (normalized.startsWith('cat=') || normalized.startsWith('category=')) {
      category = arg.split('=')[1];
      continue;
    }
    if (normalized.startsWith('diff=') || normalized.startsWith('difficulty=')) {
      difficulty = arg.split('=')[1];
      continue;
    }
    if (!category) {
      category = arg;
    } else if (!difficulty) {
      difficulty = arg;
    }
  }

  session.lastCategory = category || session.lastCategory;
  session.lastDifficulty = difficulty || session.lastDifficulty;

  const question = await fetchQuestion(session, {
    category: session.lastCategory,
    difficulty: session.lastDifficulty
  });

  if (!question) {
    await ctx.reply('سؤالی برای شما پیدا نشد. لطفاً دسته یا سختی دیگری را امتحان کنید.');
    return;
  }

  session.currentQuestion = question;
  session.askedIds.add(question.id || question.publicId);
  session.lastQuestionAt = Date.now();
  await presentQuestion(ctx, session, question);
}

function resolveAnswerIndex(session, input) {
  if (!session.currentQuestion) return { index: -1, normalizedInput: input };
  const options = getQuestionOptions(session.currentQuestion);
  if (!options.length) return { index: -1, normalizedInput: input };

  const trimmed = (input || '').trim();
  if (!trimmed) return { index: -1, normalizedInput: '' };

  const numeric = Number.parseInt(trimmed, 10);
  if (Number.isFinite(numeric) && numeric >= 1 && numeric <= options.length) {
    return { index: numeric - 1, normalizedInput: String(numeric) };
  }

  const lower = trimmed.toLowerCase();
  const matchIndex = options.findIndex((option) => String(option).toLowerCase() === lower);
  return { index: matchIndex, normalizedInput: trimmed };
}

async function handleAnswer(ctx, session, index) {
  const question = session.currentQuestion;
  if (!question) {
    await ctx.reply('سؤالی در حال اجرا نیست. ابتدا از دستور /play استفاده کنید.');
    return;
  }

  const options = getQuestionOptions(question);
  if (index < 0 || index >= options.length) {
    await ctx.reply('گزینه‌ی نامعتبر است. لطفاً شماره‌ی یکی از گزینه‌ها را وارد کنید.');
    return;
  }

  const correctIndex = getCorrectIndex(question);
  const isCorrect = correctIndex === index;
  const delta = computeScoreIncrement(question, isCorrect);

  session.totalAnswered += 1;
  if (isCorrect) {
    session.correctAnswers += 1;
    session.score += delta;
  }
  session.history.push({
    id: question.id || question.publicId,
    title: question.text || question.title,
    correct: isCorrect,
    answeredAt: new Date().toISOString()
  });
  if (session.history.length > 50) {
    session.history.splice(0, session.history.length - 50);
  }

  session.currentQuestion = null;

  await recordAnswer(session, question.id || question.publicId);

  const responseLines = [
    isCorrect ? '✅ پاسخ شما صحیح بود!' : `❌ پاسخ نادرست. پاسخ صحیح گزینه ${correctIndex + 1} بود.`,
    `امتیاز فعلی: ${session.score}`,
    `آمار پاسخ‌های صحیح: ${session.correctAnswers}/${session.totalAnswered}`,
    'برای دریافت سؤال بعدی دستور /play را ارسال کنید.'
  ];

  await ctx.reply(responseLines.join('\n'));
}

bot.start(async (ctx) => {
  const session = ensureSession(ctx);
  session.score = 0;
  session.totalAnswered = 0;
  session.correctAnswers = 0;
  session.history = [];
  session.askedIds = new Set();
  session.currentQuestion = null;

  await ctx.reply('👋 سلام! به ربات IQuiz خوش آمدید. با دستور /play یک مسابقه تازه شروع کنید.');
  try {
    const config = await fetchConfig(session);
    if (config) {
      await ctx.replyWithMarkdown(formatConfigMessage(config));
    }
  } catch (error) {
    logger.warn(`[telegram-bot] failed to fetch config: ${error.message}`);
  }
});

bot.command('config', async (ctx) => {
  const session = ensureSession(ctx);
  const args = parseArgs(ctx);
  if (args[0] && args[0].toLowerCase() === 'token') {
    const tokenValue = args.slice(1).join(' ');
    if (!tokenValue) {
      await ctx.reply('لطفاً مقدار توکن JWT را بعد از دستور وارد کنید.');
      return;
    }
    session.jwt = tokenValue.trim();
    await ctx.reply('توکن جدید ذخیره شد. اکنون درخواست‌ها با اعتبارسنجی ارسال می‌شوند.');
    return;
  }

  try {
    const config = await fetchConfig(session);
    await ctx.replyWithMarkdown(formatConfigMessage(config));
  } catch (error) {
    await ctx.reply('بارگذاری تنظیمات ممکن نشد.');
    logger.warn(`[telegram-bot] config command failed: ${error.message}`);
  }
});

bot.command('categories', async (ctx) => {
  const session = ensureSession(ctx);
  try {
    const categories = await fetchCategories(session);
    await ctx.reply(formatCategoriesMessage(categories));
  } catch (error) {
    await ctx.reply('امکان دریافت دسته‌بندی‌ها وجود ندارد.');
    logger.warn(`[telegram-bot] categories command failed: ${error.message}`);
  }
});

bot.command('play', async (ctx) => {
  const session = ensureSession(ctx);
  const args = parseArgs(ctx);
  try {
    await handlePlay(ctx, session, args);
  } catch (error) {
    await ctx.reply('در آماده‌سازی سؤال خطایی رخ داد.');
    logger.warn(`[telegram-bot] play command failed: ${error.message}`);
  }
});

bot.command('answer', async (ctx) => {
  const session = ensureSession(ctx);
  const args = parseArgs(ctx);
  if (!args.length) {
    await ctx.reply('لطفاً شماره یا متن گزینه مورد نظر را بعد از دستور /answer وارد کنید.');
    return;
  }
  const { index } = resolveAnswerIndex(session, args.join(' '));
  try {
    await handleAnswer(ctx, session, index);
  } catch (error) {
    await ctx.reply('بررسی پاسخ با مشکل روبه‌رو شد.');
    logger.warn(`[telegram-bot] answer command failed: ${error.message}`);
  }
});

bot.action(/^answer:(\d+)$/, async (ctx) => {
  const session = ensureSession(ctx);
  const match = ctx.match;
  const index = Number.parseInt(Array.isArray(match) ? match[1] : match, 10);
  if (Number.isNaN(index)) {
    await ctx.answerCbQuery('پاسخ نامعتبر است.');
    return;
  }
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([]));
  } catch (error) {
    logger.warn(`[telegram-bot] failed to clear inline keyboard: ${error.message}`);
  }
  try {
    await handleAnswer(ctx, session, index);
  } catch (error) {
    await ctx.reply('امکان پردازش پاسخ وجود ندارد.');
    logger.warn(`[telegram-bot] inline answer failed: ${error.message}`);
  }
});

(async () => {
  console.log(`[telegram-bot] Launching bot with polling against ${BASE_URL}`);
  await bot.launch();
  console.log('[telegram-bot] Bot is running. Press Ctrl+C to stop.');
})();

process.once('SIGINT', () => {
  bot.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  process.exit(0);
});
