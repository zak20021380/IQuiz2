const router = require('express').Router();
const { postAiGenerate } = require('../controllers/ai.controller');
router.post('/ai/generate', postAiGenerate);
module.exports = router;
