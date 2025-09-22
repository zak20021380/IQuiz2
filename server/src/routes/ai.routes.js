const router = require('express').Router();

const { protect, adminOnly } = require('../middleware/auth');
const aiController = require('../controllers/ai.controller');

router.use(protect, adminOnly);
router.post('/generate-questions', aiController.generate);

module.exports = router;
