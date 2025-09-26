const router = require('express').Router();
const ctrl = require('../controllers/duels.controller');

router.get('/overview', ctrl.overview);
router.post('/matchmaking', ctrl.matchmaking);
router.post('/invites', ctrl.sendInvite);
router.post('/invites/:inviteId/accept', ctrl.acceptInvite);
router.post('/invites/:inviteId/decline', ctrl.declineInvite);
router.post('/:duelId/rounds/:roundIndex/category', ctrl.assignCategory);
router.post('/:duelId/rounds/:roundIndex/result', ctrl.submitRound);

module.exports = router;
