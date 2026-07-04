/**
 * Provider-agnostic JSON completion for the app's analysis features.
 *
 * Prefers OpenAI (OPENAI_API_KEY) and falls back to Google Gemini
 * (GEMINI_API_KEY). Both are asked to return a single JSON object; the target
 * schema is embedded in the system prompt so it works uniformly across models
 * without per-provider structured-output quirks. Server-side only.
 */

export type LlmProvider = 'openai' | 'gemini';

export function llmProvider(): LlmProvider | null {
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return null;
}

/** True when at least one supported LLM provider key is configured. */
export function llmConfigured(): boolean {
  return llmProvider() !== null;
}

/** Human-readable note for "no provider" error responses. */
export const LLM_NOT_CONFIGURED = 'AI analysis is not configured (set OPENAI_API_KEY or GEMINI_API_KEY).';

function parseJsonLoose(text: string): Record<string, unknown> {
  let t = (text ?? '').trim();
  // Strip ```json … ``` / ``` … ``` fences some models add.
  if (t.startsWith('```')) t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  // Fall back to the first {...} block if there's leading/trailing prose.
  if (!t.startsWith('{')) {
    const s = t.indexOf('{');
    const e = t.lastIndexOf('}');
    if (s !== -1 && e > s) t = t.slice(s, e + 1);
  }
  try { return JSON.parse(t) as Record<string, unknown>; }
  catch { throw new Error('Model returned unparseable JSON output.'); }
}

function systemWithSchema(system: string, schema: object): string {
  return `${system}

Respond with ONLY a single valid JSON object — no prose, no markdown fences — that conforms to this JSON schema:
${JSON.stringify(schema)}`;
}

/* ── OpenAI (Chat Completions, JSON mode) ────────────────────────────────────── */

async function openaiJson(system: string, user: string, schema: object, maxTokens: number): Promise<Record<string, unknown>> {
  const key = process.env.OPENAI_API_KEY!;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemWithSchema(system, schema) },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = JSON.stringify(await res.json()); } catch { /* ignore */ }
    throw new Error(`OpenAI API error ${res.status}: ${detail}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return parseJsonLoose(data.choices?.[0]?.message?.content ?? '');
}

/* ── Gemini (generateContent, JSON mime) ─────────────────────────────────────── */

async function geminiJson(system: string, user: string, schema: object, maxTokens: number): Promise<Record<string, unknown>> {
  const key = process.env.GEMINI_API_KEY!;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemWithSchema(system, schema) }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = JSON.stringify(await res.json()); } catch { /* ignore */ }
    throw new Error(`Gemini API error ${res.status}: ${detail}`);
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
  return parseJsonLoose(text);
}

/**
 * Run a JSON completion against the configured provider.
 * @throws if no provider is configured or the API errors.
 */
export async function llmJson(system: string, user: string, schema: object, maxTokens = 2000): Promise<Record<string, unknown>> {
  const provider = llmProvider();
  if (!provider) throw new Error(LLM_NOT_CONFIGURED);
  return provider === 'openai'
    ? openaiJson(system, user, schema, maxTokens)
    : geminiJson(system, user, schema, maxTokens);
}
