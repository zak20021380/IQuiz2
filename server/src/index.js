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

const connectDB = require('./config/db');
const logger = require('./config/logger');
const errorHandler = require('./middleware/error');

// init
const app = express();
connectDB();

// ───────────────── Security & parsers
// CSP کامل برای Tailwind CDN، Google Fonts، cdnjs و آواتار نمونه
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
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
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// cors
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

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

// error handler
app.use(errorHandler);

// ───────────────── Start
const port = process.env.PORT || 4000;
const server = app.listen(port, () => logger.info(`🚀 API running on http://localhost:${port}`));

const shutdown = () => {
  logger.info('Shutting down...');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
