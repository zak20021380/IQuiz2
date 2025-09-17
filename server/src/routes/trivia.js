const router = require('express').Router();

let fetchImpl = globalThis.fetch;
try {
  // node-fetch@2 (CommonJS) - preferred per requirements
  fetchImpl = require('node-fetch');
} catch (err) {
  if (typeof fetchImpl !== 'function') throw err;
}
const Question = require('../models/Question');
const Category = require('../models/Category');

const TRIVIA_URL = 'https://opentdb.com/api.php?amount=20&type=multiple';

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

router.post('/import', async (req, res, next) => {
  try {
    const response = await fetchImpl(TRIVIA_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch trivia questions: ${response.status}`);
    }

    const payload = await response.json();
    if (payload.response_code && payload.response_code !== 0) {
      return res.status(502).json({ ok: false, message: 'Trivia provider returned an error' });
    }

    const questions = Array.isArray(payload.results) ? payload.results : [];
    if (questions.length === 0) {
      return res.status(502).json({ ok: false, message: 'No trivia questions returned from provider' });
    }

    const categoryCache = new Map();
    const docs = [];

    for (const item of questions) {
      const incorrect = Array.isArray(item.incorrect_answers) ? item.incorrect_answers : [];
      const correct = item.correct_answer;
      const choices = shuffle([...incorrect, correct]);
      const correctIndex = choices.indexOf(correct);

      const categoryName = item.category || 'General';
      let categoryDoc = categoryCache.get(categoryName);
      if (!categoryDoc) {
        categoryDoc = await Category.findOne({ name: categoryName });
        if (!categoryDoc) {
          categoryDoc = await Category.create({ name: categoryName });
        }
        categoryCache.set(categoryName, categoryDoc);
      }

      docs.push({
        text: item.question,
        choices,
        correctIndex,
        difficulty: item.difficulty || 'easy',
        category: categoryDoc._id,
        categoryName
      });
    }

    const inserted = await Question.insertMany(docs);
    res.json({ ok: true, count: inserted.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
