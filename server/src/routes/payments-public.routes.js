const router = require('express').Router();
const controller = require('../controllers/payments.controller');

router.get('/zarinpal/callback', controller.handleZarinpalCallback);

module.exports = router;
