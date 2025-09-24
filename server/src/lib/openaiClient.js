// CJS-compatible shim for ESM-only 'openai'
let OpenAIClass = null;

async function getOpenAIClient() {
  if (!OpenAIClass) {
    // 'openai' is ESM; dynamic import works fine in CJS
    OpenAIClass = (await import('openai')).default;
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }
  return new OpenAIClass({ apiKey: process.env.OPENAI_API_KEY });
}

module.exports = { getOpenAIClient };
