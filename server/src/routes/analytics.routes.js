const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/analytics.controller');

router.use(protect, adminOnly);
router.get('/dashboard', ctrl.dashboard);

module.exports = router;
