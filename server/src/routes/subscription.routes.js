const router = require('express').Router();
const { protect } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscription.controller');

router.get('/', protect, subscriptionController.getSubscriptionStatus);
router.get('/me', protect, subscriptionController.getSubscriptionStatus);

module.exports = router;
