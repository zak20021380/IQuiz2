// server/src/services/aiQuestionGenerator.js
// تماس با OpenAI Responses API (بدون SDK) — بدون هیچ محدودیت زمانی (NO TIMEOUT)
// پشتیبانی پروکسی + دیباگ اختیاری + ریترای شبکه‌ای سبک

const { setTimeout: sleep } = require('node:timers/promises');

function buildDispatcherIfProxy() {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxy) return undefined;
  try {
    const { ProxyAgent } = require('undici');
    if (process.env.DEBUG_OPENAI === '1') {
      console.log('[AI] Using ProxyAgent:', proxy);
    }
    return new ProxyAgent(proxy);
  } catch (e) {
    console.warn('[AI] undici ProxyAgent not available:', e?.message);
    return undefined;
  }
}

function nowIso() {
  return new Date().toISOString();
}

async function generateQuestions({ systemPrompt, userPrompt, schema, temperature, seed }) {
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
  const model   = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const dispatcher = buildDispatcherIfProxy();

  const payload = {
    model,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: String(systemPrompt || '') }] },
      { role: 'user',   content: [{ type: 'input_text', text: String(userPrompt   || '') }] }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'mcq_batch',
        schema,
        strict: true
      }
    }
  };

  if (Number.isFinite(temperature)) {
    payload.temperature = Math.max(0, Math.min(2, Number(temperature)));
  }

  if (Number.isSafeInteger(seed)) {
    payload.seed = seed;
  }

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    ...(dispatcher ? { dispatcher } : {})
  };

  if (process.env.DEBUG_OPENAI === '1') {
    console.log('[AI]', nowIso(), '→ Request', { baseUrl, model, hasProxy: !!dispatcher });
  }

  // ریترای سبک برای خطاهای صرفاً شبکه‌ای/موقتی
  const attempts = 3;
  const backoffs = [1000, 3000];

  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${baseUrl}/v1/responses`, fetchOptions);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg  = data?.error?.message || data?.message || 'OpenAI request failed';
        const code = data?.error?.type || 'openai_error';
        // قابل‌ریترای: 429/5xx
        if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
          throw new Error(`${code}: ${msg} (status ${res.status})`);
        }
        // غیرقابل‌ریترای
        throw new Error(`${code}: ${msg}`);
      }

      if (process.env.DEBUG_OPENAI === '1') {
        console.log('[AI]', nowIso(), '← Response OK');
      }
      return data; // کنترلر از data.output_text می‌خوانَد
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || '');

      if (process.env.DEBUG_OPENAI === '1') {
        console.warn('[AI]', nowIso(), `✖ Attempt ${i + 1} failed:`, msg);
      }

      // فقط روی خطاهای شبکه‌ای/موقتی ریترای کن
      const isNetwork = /network|fetch failed|UND_ERR_SOCKET|ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|TLS/i.test(msg);
      if (i < attempts - 1 && isNetwork) {
        await sleep(backoffs[i]);
        continue;
      }

      // برای دیباگ، IP ریزالو‌شده را لاگ/ضمیمه کن
      try {
        const dns = require('dns').promises;
        const got = await dns.lookup('api.openai.com');
        throw new Error(`network_error: ${msg} [dns:${got?.address}]`);
      } catch {
        throw new Error(`network_error: ${msg}`);
      }
    }
  }

  throw lastErr || new Error('network_error: unknown');
}

module.exports = { generateQuestions };
