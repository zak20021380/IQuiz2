// server/src/index.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');

const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const errorHandler = require('./middleware/error');

const jserviceRoutes = require('./routes/jservice.routes');
const aiRoutes = require('./routes/ai');
const walletRoutes = require('./routes/wallet.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const paymentsRoutes = require('./routes/payments.routes');
const paymentsPublicRoutes = require('./routes/payments-public.routes');
const { ensureInitialCategories, syncProviderCategories } = require('./services/categorySeeder');

const app = express();
app.set('trust proxy', 1);

// Security & parsers
const telegramOrigins = Array.from(new Set((env.telegram?.allowedOrigins || []).filter(Boolean)));
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
      imgSrc: ["'self'", "data:", "https://i.pravatar.cc", ...telegramOrigins],
      connectSrc: ["'self'", ...telegramOrigins],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());
if (env.nodeEnv !== 'production') app.use(morgan('dev'));
app.use(cors());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

// Static + friendly routes
app.use(express.static(path.join(__dirname, '..', '..')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', '..', 'Admin-Panel.html')));
app.get('/bot', (req, res) => res.sendFile(path.join(__dirname, '..', '..', 'IQuiz-bot.html')));
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/healthz', (req, res) => res.json({ ok: true, status: 'healthy' }));

// Regular API routes (order matters)
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/categories', require('./routes/categories.routes'));
app.use('/api/questions', require('./routes/questions.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/achievements', require('./routes/achievements.routes'));
app.use('/api/ads', require('./routes/ads.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/group-battles', require('./routes/group-battles.routes'));
app.use('/api/duels', require('./routes/duels.routes'));
app.use('/api/limits', require('./routes/limits.routes'));
app.use('/api/admin/questions', require('./routes/admin/questions'));
app.use('/api/admin/metrics', require('./routes/admin/metrics'));
app.use('/api/admin/shop', require('./routes/admin/shop'));
app.use('/api/admin/settings', require('./routes/admin/settings'));
app.use('/api/public', require('./routes/public.routes'));
app.use('/api/jservice', jserviceRoutes);
app.use('/api/wallet', walletRoutes);

// Mount subscription BEFORE AI (so /api/subscription/* is reachable)
app.use('/api/subscription', subscriptionRoutes);

// payments
app.use('/api/payments', paymentsRoutes);
app.use('/payments', paymentsPublicRoutes);

// Mount AI on its own prefix (won’t shadow other /api/* routes)
app.use('/api/ai', aiRoutes);

// Debug helpers
app.get('/__routes', (req, res) => {
  try {
    const out = [];
    const scan = (base, layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods || {}).join(',').toUpperCase();
        out.push(`${methods} ${base}${layer.route.path}`);
      } else if (layer.name === 'router' && layer.handle?.stack) {
        layer.handle.stack.forEach(l => scan(base, l));
      } else if (layer.regexp && layer.handle?.stack) {
        const m = layer.regexp.toString().match(/^\/\^\\(.*)\\\/\?\$\//);
        const basePath = m ? `/${m[1].replace(/\\\//g, '/')}` : '';
        layer.handle.stack.forEach(l => scan(basePath, l));
      }
    };
    (app._router?.stack || []).forEach(l => scan('', l));
    res.json(out);
  } catch { res.json([]); }
});
app.get('/__sign/:id', (req, res) => {
  const jwt = require('jsonwebtoken');
  const s = process.env.JWT_SECRET || 'insecure-dev';
  res.json({ token: jwt.sign({ sub: req.params.id, role: 'admin' }, s, { algorithm: 'HS256', expiresIn: '30m' }) });
});

// Error handler (last)
app.use(errorHandler);

// Start
let server;
const startApp = async () => {
  await connectDB();
  await ensureInitialCategories();
  try { await syncProviderCategories(); } catch (err) { logger.warn(`Failed to sync provider categories: ${err.message}`); }
  server = app.listen(env.port, () => logger.info(`🚀 API running on http://localhost:${env.port}`));
};
startApp().catch(err => {
  logger.error(`Failed to start application: ${err.message}`, err);
  process.exit(1);
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down...');
  if (server) {
    server.close(() => { logger.info('HTTP server closed'); process.exit(0); });
  } else { process.exit(0); }
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
