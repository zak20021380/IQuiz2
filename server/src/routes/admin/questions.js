const router = require('express').Router();
const { requireAdmin } = require('../../middleware/adminAuth');
const questionsController = require('../../controllers/questions.controller');

router.use(requireAdmin);

router.post('/ingest', questionsController.create);
router.get('/suspects', questionsController.listDuplicateSuspects);
router.post('/:id/review', questionsController.reviewDuplicateCandidate);

module.exports = router;
