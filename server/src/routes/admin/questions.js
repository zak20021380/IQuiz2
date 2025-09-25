const router = require('express').Router();
const { protect, adminOnly } = require('../../middleware/auth');
const questionsController = require('../../controllers/questions.controller');

router.use(protect, adminOnly);

router.post('/ingest', questionsController.create);
router.get('/suspects', questionsController.listDuplicateSuspects);
router.post('/:id/review', questionsController.reviewDuplicateCandidate);

module.exports = router;
