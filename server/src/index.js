// server/src/index.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');

const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const errorHandler = require('./middleware/error');
const triviaRoutes = require('./routes/trivia');
const { startTriviaPoller } = require('./poller/triviaPoller');
const { ensureInitialCategories, syncProviderCategories } = require('./services/categorySeeder');

// init
const app = express();

// ───────────────── Security & parsers
// CSP کامل برای Tailwind CDN، Google Fonts، cdnjs و آواتار نمونه
// یادآوری: برای اینکه HTML استاتیک (که اسکریپت‌های درون‌خطی دارد) درست کار کند، باید
// علاوه بر script-src، دستورهای script-src-elem و script-src-attr را هم بازتعریف کنیم؛
// در غیر اینصورت Helmet برای آن‌ها مقدار «'none'» قرار می‌دهد و اجرای اسکریپت‌ها متوقف می‌شود.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
      imgSrc: ["'self'", "data:", "https://i.pravatar.cc"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// logging
if (env.nodeEnv !== 'production') app.use(morgan('dev'));

// cors
const allowedOrigins = env.cors.allowedOrigins;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  }
}));

// rate limit
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

// ───────────────── Static files
// توجه: HTMLهای شما (Admin-Panel.html / IQuiz-bot.html) در ریشه‌ی پروژه هستند (یک سطح بالاتر از `server`).
app.use(express.static(path.join(__dirname, '..', '..'))); // سرو از ریشه پروژه

// روت دوستانه برای پنل ادمین
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'Admin-Panel.html'));
});

// روت تست برای فایل بات (اختیاری)
app.get('/bot', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'IQuiz-bot.html'));
});

// جلوگیری از 404 برای favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ───────────────── API routes
app.get('/healthz', (req, res) => res.json({ ok: true, status: 'healthy' }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/categories', require('./routes/categories.routes'));
app.use('/api/questions', require('./routes/questions.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/achievements', require('./routes/achievements.routes'));
app.use('/api/ads', require('./routes/ads.routes'));
app.use('/api/public', require('./routes/public.routes'));
app.use('/api/trivia', triviaRoutes);
app.use('/api', require('./routes/trivia-triviaapi'));

// error handler
app.use(errorHandler);

// ───────────────── Start
let server;
let triviaPollerInstance;

const startApp = async () => {
  await connectDB();

  await ensureInitialCategories();
  try {
    await syncProviderCategories();
  } catch (err) {
    logger.warn(`Failed to sync provider categories: ${err.message}`);
  }

  if (env.trivia.enablePoller) {
    triviaPollerInstance = startTriviaPoller();
  }

  server = app.listen(env.port, () => logger.info(`🚀 API running on http://localhost:${env.port}`));
};

startApp().catch(err => {
  logger.error(`Failed to start application: ${err.message}`, err);
  process.exit(1);
});

const shutdown = () => {
  logger.info('Shutting down...');

  if (triviaPollerInstance) {
    triviaPollerInstance.stop();
  }

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
