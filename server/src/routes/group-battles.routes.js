const router = require('express').Router();
const ctrl = require('../controllers/group-battles.controller');

router.get('/groups', ctrl.listGroups);
router.get('/', ctrl.listBattles);
router.post('/', ctrl.create);

module.exports = router;
