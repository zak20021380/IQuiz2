const router = require('express').Router();
const ctrl = require('../controllers/groups.controller');
const { protect } = require('../middleware/auth');

router.get('/', ctrl.list);
router.post('/', protect, ctrl.create);
router.post('/:groupId/join', protect, ctrl.join);
router.post('/:groupId/leave', protect, ctrl.leave);
router.delete('/:groupId', protect, ctrl.remove);

module.exports = router;
