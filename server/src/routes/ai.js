const router = require('express').Router();
const rateLimit = require('express-rate-limit');

const { protect, adminOnly } = require('../middleware/auth');
const aiController = require('../controllers/ai.controller');

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

router.use(protect, adminOnly);
router.post('/generate', aiLimiter, aiController.generate);
router.post('/generate-questions', aiLimiter, aiController.generate);

module.exports = router;
