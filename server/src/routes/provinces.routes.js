const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/provinces.controller');

router.use(protect, adminOnly);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
