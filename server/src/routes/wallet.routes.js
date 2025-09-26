const router = require('express').Router();
const { protect } = require('../middleware/auth');
const walletController = require('../controllers/wallet.controller');

router.get('/', protect, walletController.getWalletBalance);

module.exports = router;
