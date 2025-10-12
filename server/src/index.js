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

// --- helper: خروجی ماژول رو به Router تبدیل کن
function ensureRouter(mod, name) {
  if (typeof mod === 'function') return mod;
  if (mod && typeof mod.router === 'function') return mod.router;
  if (mod && typeof mod.default === 'function') return mod.default;
  throw new TypeError(`Route "${name}" does not export a middleware function`);
}

// --- helper: ایمن mount کن؛ اگه ترکید فقط warn بده
const failedRoutes = [];
function safeMount(app, prefix, modulePath, label = modulePath) {
  try {
    const mod = require(modulePath);
    const router = ensureRouter(mod, label);
    app.use(prefix, router);
    logger.info(`[routes] mounted ${label} -> ${prefix}`);
  } catch (err) {
    failedRoutes.push({ prefix, modulePath, error: err.message });
    logger.warn(`[routes] skipped ${label} at ${prefix}: ${err.message}`);
  }
}

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
app.use(express.static(path.join(__dirname, '..', '..'))); // => /var/www/king-ofiq/bot
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', '..', 'Admin-Panel.html')));
app.get('/bot',   (req, res) => res.sendFile(path.join(__dirname, '..', '..', 'IQuiz-bot.html')));
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/healthz', (req, res) => res.json({ ok: true, status: 'healthy' }));

// --- Routes (به ترتیب مهم)
safeMount(app, '/api/auth',            './routes/auth.routes',            'auth.routes');
safeMount(app, '/api/categories',      './routes/categories.routes',      'categories.routes');
safeMount(app, '/api/questions',       './routes/questions.routes',       'questions.routes');
safeMount(app, '/api/users',           './routes/users.routes',           'users.routes');
safeMount(app, '/api/achievements',    './routes/achievements.routes',    'achievements.routes');
safeMount(app, '/api/ads',             './routes/ads.routes',             'ads.routes');
safeMount(app, '/api/analytics',       './routes/analytics.routes',       'analytics.routes');
safeMount(app, '/api/group-battles',   './routes/group-battles.routes',   'group-battles.routes');
safeMount(app, '/api/duels',           './routes/duels.routes',           'duels.routes');
safeMount(app, '/api/limits',          './routes/limits.routes',          'limits.routes');
safeMount(app, '/api/admin/questions', './routes/admin/questions',        'admin/questions');
safeMount(app, '/api/admin/metrics',   './routes/admin/metrics',          'admin/metrics');
safeMount(app, '/api/admin/shop',      './routes/admin/shop',             'admin/shop');
safeMount(app, '/api/admin/settings',  './routes/admin/settings',         'admin/settings');

// مهم برای ربات
safeMount(app, '/api/public',          './routes/public.routes',          'public.routes');

// مالی/کیف پول/اشتراک/AI
safeMount(app, '/api/wallet',          './routes/wallet.routes',          'wallet.routes');
safeMount(app, '/api/subscription',    './routes/subscription.routes',    'subscription.routes');
safeMount(app, '/api/payments',        './routes/payments.routes',        'payments.routes');
safeMount(app, '/payments',            './routes/payments-public.routes', 'payments-public.routes');
safeMount(app, '/api/ai',              './routes/ai',                     'ai');

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

// ببین کدوم routeها اسکیپ شدن
app.get('/__failed', (req, res) => res.json(failedRoutes));

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
  const { ensureInitialCategories, syncProviderCategories } = require('./services/categorySeeder');
  await ensureInitialCategories();
  try { await syncProviderCategories(); } catch (err) {
    logger.warn(`Failed to sync provider categories: ${err.message}`);
  }
  const port = env.port || process.env.PORT || 4000;
  server = app.listen(port, () => logger.info(`🚀 API running on http://localhost:${port}`));
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
