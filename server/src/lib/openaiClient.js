const OpenAI = require('openai');
const env = require('../config/env');

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  const error = new Error('Missing OPENAI_API_KEY');
  error.statusCode = 503;
  throw error;
}

const clientOptions = { apiKey };

if (env?.ai?.openai?.baseUrl) {
  clientOptions.baseURL = env.ai.openai.baseUrl;
}
if (env?.ai?.openai?.organization) {
  clientOptions.organization = env.ai.openai.organization;
}
if (env?.ai?.openai?.project) {
  clientOptions.project = env.ai.openai.project;
}

const openai = new OpenAI(clientOptions);

module.exports = { openai };
