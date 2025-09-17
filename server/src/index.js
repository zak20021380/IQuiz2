require('dotenv').config();
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

// security & parsers
const defaultCsp = helmet.contentSecurityPolicy.getDefaultDirectives();
const extendedCsp = {
  ...defaultCsp,
  'img-src': [...(defaultCsp['img-src'] || []), 'https://i.pravatar.cc'],
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: extendedCsp,
    },
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// logging
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// cors
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  }
}));

// rate limit
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

// routes
app.get('/healthz', (req, res) => res.json({ ok:true, status:'healthy' }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/categories', require('./routes/categories.routes'));
app.use('/api/questions', require('./routes/questions.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/achievements', require('./routes/achievements.routes'));

// error handler
app.use(errorHandler);

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
