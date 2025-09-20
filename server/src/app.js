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
const errorHandler = require('./middleware/error');
const triviaRoutes = require('./routes/trivia');

function createApp() {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com'],
        scriptSrcElem: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com'],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https://i.pravatar.cc'],
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

  if (env.nodeEnv !== 'production') {
    app.use(morgan('dev'));
  }

  const allowedOrigins = env.cors.allowedOrigins;
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    }
  }));

  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

  app.use(express.static(path.join(__dirname, '..', '..')));

  app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'Admin-Panel.html'));
  });

  app.get('/bot', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'IQuiz-bot.html'));
  });

  app.get('/favicon.ico', (req, res) => res.status(204).end());

  app.get('/healthz', (req, res) => res.json({ ok: true, status: 'healthy' }));

  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/categories', require('./routes/categories.routes'));
  app.use('/api/questions', require('./routes/questions.routes'));
  app.use('/api/users', require('./routes/users.routes'));
  app.use('/api/achievements', require('./routes/achievements.routes'));
  app.use('/api/ads', require('./routes/ads.routes'));
  app.use('/api/provinces', require('./routes/provinces.routes'));
  app.use('/api/public', require('./routes/public.routes'));
  app.use('/api/trivia', triviaRoutes);
  app.use('/api', require('./routes/trivia-triviaapi'));

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
