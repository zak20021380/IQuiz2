const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/questions.controller');

router.use(protect, adminOnly);
router.get('/duplicates', ctrl.listDuplicates);
router.get('/', ctrl.list);
router.get('/stats/summary', ctrl.statsSummary);
router.post('/', ctrl.create);
router.post('/bulk-delete', ctrl.bulkDelete);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
