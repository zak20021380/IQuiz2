const test = require('node:test');
const assert = require('assert');

const QuestionService = require('../src/services/questionService');
const { loadDuelQuestions, MAX_DUEL_QUESTIONS } = require('../src/services/duelEngine');

test('loadDuelQuestions enforces cap and removes duplicates', async () => {
  const original = QuestionService.getQuestions;
  let capturedCount = null;

  QuestionService.getQuestions = async (params) => {
    capturedCount = params.count;
    return {
      ok: true,
      countRequested: params.count,
      items: [
        { id: 'a', text: 'A', options: ['1', '2', '3', '4'], correctIndex: 0, category: 'general' },
        { id: 'a', text: 'A copy', options: ['1', '2', '3', '4'], correctIndex: 1, category: 'general' },
        { id: 'b', text: 'B', options: ['1', '2', '3', '4'], correctIndex: 2, category: 'general' }
      ]
    };
  };

  try {
    const questions = await loadDuelQuestions({ requested: MAX_DUEL_QUESTIONS + 5, category: 'general' });
    assert.strictEqual(capturedCount, MAX_DUEL_QUESTIONS);
    assert.strictEqual(questions.length, 2);
    const ids = new Set(questions.map((q) => q.id));
    assert.strictEqual(ids.size, questions.length);
  } finally {
    QuestionService.getQuestions = original;
  }
});

test('loadDuelQuestions throws when service returns no questions', async () => {
  const original = QuestionService.getQuestions;
  QuestionService.getQuestions = async () => ({ ok: true, items: [] });

  try {
    await assert.rejects(loadDuelQuestions({ requested: 5 }), /no_questions/);
  } finally {
    QuestionService.getQuestions = original;
  }
});
