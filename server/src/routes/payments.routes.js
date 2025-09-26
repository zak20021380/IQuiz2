const router = require('express').Router();
const controller = require('../controllers/payments.controller');

router.post('/zarinpal/create', controller.createZarinpalPayment);
router.get('/:id/status', controller.getPaymentStatus);

module.exports = router;
