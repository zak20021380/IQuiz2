// server/src/services/aiQuestionGenerator.js
// تماس با OpenAI Responses API (بدون SDK) — بدون هیچ محدودیت زمانی (NO TIMEOUT)
// پشتیبانی پروکسی + دیباگ اختیاری + ریترای شبکه‌ای سبک
'use strict';

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

async function generateQuestions({ systemPrompt, userPrompt, schema }) {
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

  const baseUrl    = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
  const model      = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const dispatcher = buildDispatcherIfProxy();
  const hostname   = (() => {
    try { return new URL(baseUrl).hostname || 'api.openai.com'; }
    catch { return 'api.openai.com'; }
  })();

  // Payload طبق Responses API (بدون temperature / seed برای جلوگیری از خطای Unsupported parameter)
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

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'IQuizServer/1.0 (+node-fetch)'
    },
    body: JSON.stringify(payload),
    // بدون تایم‌اوت: عمداً AbortController استفاده نشده
    ...(dispatcher ? { dispatcher } : {})
  };

  if (process.env.DEBUG_OPENAI === '1') {
    console.log('[AI]', nowIso(), '→ Request', { baseUrl, model, hasProxy: !!dispatcher });
  }

  // ریترای سبک فقط برای خطاهای شبکه‌ای/موقتی
  const attempts = 3;
  const backoffs = [1000, 3000];

  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${baseUrl}/v1/responses`, fetchOptions);
      // ممکنه در خطاها بدنه JSON نباشه (مثلاً HTML 502)، پس با احتیاط:
      let data = null;
      try { data = await res.json(); } catch { data = null; }

      if (!res.ok) {
        const msg  = data?.error?.message || data?.message || `HTTP ${res.status}`;
        const code = data?.error?.type || 'openai_error';

        // قابل ریترای: 429 یا 5xx
        if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
          throw new Error(`${code}: ${msg} (status ${res.status})`);
        }

        // غیرقابل ریترای
        throw new Error(`${code}: ${msg}`);
      }

      if (process.env.DEBUG_OPENAI === '1') {
        console.log('[AI]', nowIso(), '← Response OK');
      }
      return data; // کنترلر از data.output_text یا content می‌خواند
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || '');

      if (process.env.DEBUG_OPENAI === '1') {
        console.warn('[AI]', nowIso(), `✖ Attempt ${i + 1} failed:`, msg);
      }

      // فقط خطاهای شبکه‌ای/موقتی باعث ریترای شوند
      const isNetwork =
        /network|fetch failed|UND_ERR_SOCKET|ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|TLS|aborted/i.test(msg);
      if (i < attempts - 1 && isNetwork) {
        await sleep(backoffs[i]);
        continue;
      }

      // ضمیمه‌ی DNS برای دیباگ بهتر
      try {
        const dns = require('dns').promises;
        const got = await dns.lookup(hostname);
        throw new Error(`network_error: ${msg} [dns:${got?.address}]`);
      } catch {
        throw new Error(`network_error: ${msg}`);
      }
    }
  }

  // اصولاً نباید اینجا برسیم
  throw lastErr || new Error('network_error: unknown');
}

module.exports = { generateQuestions };
