const router = require('express').Router();
const controller = require('../controllers/payments.controller');
const { protect } = require('../middleware/auth');

router.post('/create', protect, controller.createInternalPayment);
router.post('/zarinpal/create', controller.createZarinpalPayment);
router.get('/:id/status', controller.getPaymentStatus);

module.exports = router;
