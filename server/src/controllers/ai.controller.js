const { generateQuestions } = require('../services/aiQuestionGenerator');

async function postAiGenerate(req, res) {
  try {
    const { topic, count = 5, difficulty = 'medium', lang = 'fa', previewOnly = true } = req.body || {};
    const n = Math.max(1, Math.min(50, Number(count) || 5));

    const schema = {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array', minItems: n, maxItems: n,
          items: {
            type: 'object',
            required: ['question', 'options', 'correct_index'],
            properties: {
              question: { type: 'string' },
              options: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
              correct_index: { type: 'integer', minimum: 0, maximum: 3 },
              explanation: { type: 'string' }
            }
          }
        }
      }
    };

    const systemPrompt = `You generate ${lang==='fa'?'Persian':'target-language'} MCQs. One correct answer, exactly 4 options. Output MUST match the JSON schema.`;
    const userPrompt = `Generate ${n} ${lang==='fa'?'Persian':lang} MCQs about: ${topic||'general knowledge'} (difficulty: ${difficulty}). Only JSON, no markdown.`;

    const resp = await generateQuestions({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'mcq_batch', schema, strict: true }
      }
    });

    const data = JSON.parse(resp.output_text || '{}');
    const items = Array.isArray(data?.items) ? data.items : [];

    const preview = items.map(it => ({
      text: String(it.question || ''),
      choices: Array.isArray(it.options) ? it.options.slice(0,4).map(x => String(x || '')) : ['','','',''],
      correctIndex: Number.isInteger(it.correct_index) ? it.correct_index : 0,
      explanation: typeof it.explanation === 'string' ? it.explanation : ''
    }));

    const duplicates = [];
    const invalid = [];

    return res.json(previewOnly
      ? { preview, duplicates, invalid }
      : { preview, inserted: preview.length, generated: preview.length, duplicates, invalid }
    );
  } catch (err) {
    return res.status(400).json({ ok:false, message: err?.message || 'AI generation failed' });
  }
}

module.exports = { postAiGenerate };
