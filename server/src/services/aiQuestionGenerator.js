const { getOpenAIClient } = require('../lib/openaiClient');

async function generateQuestions(params) {
  const client = await getOpenAIClient();
  const resp = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-5',
    input: [
      { role: 'system', content: [{ type: 'input_text', text: params.systemPrompt }] },
      { role: 'user',   content: [{ type: 'input_text', text: params.userPrompt }] }
    ],
    ...(params.response_format ? { response_format: params.response_format } : {}),
    temperature: params.temperature ?? 0.7
  });
  return resp;
}
module.exports = { generateQuestions };
