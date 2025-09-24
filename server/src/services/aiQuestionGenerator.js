async function generateQuestions({ systemPrompt, userPrompt, schema, temperature = 0.7 }) {
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

  const payload = {
    model: process.env.OPENAI_MODEL || 'gpt-5',
    input: [
      { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
      { role: 'user',   content: [{ type: 'input_text', text: userPrompt   }] }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'mcq_batch',
        schema,
        strict: true
      }
    },
    temperature
  };

  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || 'OpenAI request failed');
  return data; // data.output_text → JSON string مطابق اسکیما
}

module.exports = { generateQuestions };
