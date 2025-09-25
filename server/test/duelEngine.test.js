const test = require('node:test');
const assert = require('assert');

const QuestionService = require('../src/services/questionService');
const { loadDuelQuestions, MAX_DUEL_QUESTIONS } = require('../src/services/duelEngine');

test('loadDuelQuestions enforces cap, removes duplicates, and forwards user identity', async () => {
  const original = QuestionService.getQuestions;
  let capturedCount = null;
  let capturedUserId = null;
  let capturedGuestId = null;

  QuestionService.getQuestions = async (params) => {
    capturedCount = params.count;
    capturedUserId = params.userId;
    capturedGuestId = params.guestId;
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
    const questions = await loadDuelQuestions({
      requested: MAX_DUEL_QUESTIONS + 5,
      category: 'general',
      userId: 'user-42',
      guestId: 'guest-1'
    });
    assert.strictEqual(capturedCount, MAX_DUEL_QUESTIONS);
    assert.strictEqual(questions.length, 2);
    const ids = new Set(questions.map((q) => q.id));
    assert.strictEqual(ids.size, questions.length);
    assert.strictEqual(capturedUserId, 'user-42');
    assert.strictEqual(capturedGuestId, 'guest-1');
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
