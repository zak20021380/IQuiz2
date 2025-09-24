// server/src/controllers/ai.controller.js
const { generateQuestions } = require('../services/aiQuestionGenerator');

/**
 * امن و سفت: از Responses API با text.format(json_schema) خروجی می‌گیریم،
 * JSON رو به‌صورت مقاوم پارس می‌کنیم و به فرمت فرانت تبدیل می‌کنیم.
 */
async function postAiGenerate(req, res) {
  try {
    const {
      topic,
      count = 5,
      difficulty = 'medium',
      lang = 'fa',
      previewOnly = true
    } = req.body || {};

    const n = Math.max(1, Math.min(50, Number(count) || 5));
    const subject = (typeof topic === 'string' && topic.trim()) ? topic.trim() : 'general knowledge';

    // JSON Schema سخت‌گیرانه — بدون explanation (که مجبور نشیم تولیدش کنیم)
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      required: ["items"],
      properties: {
        items: {
          type: "array",
          minItems: n,
          maxItems: n,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["question", "options", "correct_index"],
            properties: {
              question: { type: "string" },
              options: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: { type: "string" }
              },
              correct_index: { type: "integer", minimum: 0, maximum: 3 }
            }
          }
        }
      }
    };

    const sysLang = lang === 'fa' ? 'Persian' : 'target-language';
    const systemPrompt =
      `You generate ${sysLang} multiple-choice questions (MCQs). ` +
      `Exactly 1 correct answer, exactly 4 options. ` +
      `Your output MUST strictly match the provided JSON schema and MUST NOT include extra fields.`;

    const userPrompt =
      `Generate ${n} ${lang === 'fa' ? 'Persian' : lang} MCQs about: ${subject} ` +
      `(difficulty: ${difficulty}). Return pure JSON only (no markdown, no prose).`;

    // تماس با سرویس (بدون temperature چون بعضی مدل‌ها ساپورت نمی‌کنند)
    const resp = await generateQuestions({ systemPrompt, userPrompt, schema });

    // ————— استخراج JSON از پاسخ مدل —————
    const data = extractJsonObject(resp);
    const items = Array.isArray(data?.items) ? data.items : [];

    // ————— تبدیل به فرمت مورد انتظار فرانت —————
    const preview = items.map((it) => ({
      text: String(it?.question || ''),
      choices: Array.isArray(it?.options)
        ? it.options.slice(0, 4).map((x) => String(x || ''))
        : ['', '', '', ''],
      correctIndex: Number.isInteger(it?.correct_index) ? it.correct_index : 0,
      // explanation اختیاریه؛ اگه نبود خالی بمونه تا UI بشکنه نکنه
      explanation: typeof it?.explanation === 'string' ? it.explanation : ''
    }));

    const duplicates = [];
    const invalid = [];

    return res.json(
      previewOnly
        ? { preview, duplicates, invalid }
        : { preview, inserted: preview.length, generated: preview.length, duplicates, invalid }
    );
  } catch (err) {
    // لاگ کوتاه سروری مفید
    console.error('[AI GENERATE ERROR]', err?.message);
    res.status(400).json({ ok: false, message: err?.message || 'AI generation failed' });
  }
}

/**
 * تلاش‌های مقاوم برای بیرون کشیدن JSON از پاسخ Responses API.
 * از چند مسیر متداول می‌خواند و اگر مدل سه‌تا بک‌تیک گذاشته باشد پاک می‌کند.
 */
function extractJsonObject(resp) {
  const candidates = [];

  if (typeof resp?.output_text === 'string') candidates.push(resp.output_text);

  // بعضی پاسخ‌ها در آرایه‌ی output می‌آیند
  try {
    const outputArr = Array.isArray(resp?.output) ? resp.output : [];
    for (const c of outputArr) {
      const content = Array.isArray(c?.content) ? c.content : [];
      for (const chunk of content) {
        if (typeof chunk?.text === 'string') candidates.push(chunk.text);
      }
    }
  } catch (_) { /* ignore */ }

  // اولین کاندیدای قابل‌پارس
  for (const raw of candidates) {
    const cleaned = stripFences(String(raw || ''));
    try {
      const obj = JSON.parse(cleaned);
      if (obj && typeof obj === 'object') return obj;
    } catch (_) { /* try next */ }
  }

  // اگر هیچی نشد، برای دیباگ، بخشی از متن بده
  const sample = (candidates[0] || '').slice(0, 300);
  throw new Error(`Model did not return valid JSON. Sample: ${sample}`);
}

/** حذف ``` و ```json و فضای اضافه اطراف */
function stripFences(s) {
  return s.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

module.exports = { postAiGenerate };
