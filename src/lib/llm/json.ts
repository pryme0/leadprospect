/**
 * Provider-agnostic JSON completion for the app's analysis features.
 *
 * Tries every configured provider in order — OpenAI (OPENAI_API_KEY), then
 * Anthropic/Claude (ANTHROPIC_API_KEY), then Google Gemini (GEMINI_API_KEY) —
 * falling through to the next one on ANY failure (quota exhaustion, rate
 * limits, network errors). All three are asked to return a single JSON
 * object; the target schema is embedded in the system prompt so it works
 * uniformly across models without per-provider structured-output quirks.
 * Server-side only.
 */
import Anthropic from '@anthropic-ai/sdk';

export type LlmProvider = 'openai' | 'anthropic' | 'gemini';

/** Providers with a configured API key, in fallback order. */
function configuredProviders(): LlmProvider[] {
  const providers: LlmProvider[] = [];
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  if (process.env.ANTHROPIC_API_KEY) providers.push('anthropic');
  if (process.env.GEMINI_API_KEY) providers.push('gemini');
  return providers;
}

export function llmProvider(): LlmProvider | null {
  return configuredProviders()[0] ?? null;
}

/** True when at least one supported LLM provider key is configured. */
export function llmConfigured(): boolean {
  return configuredProviders().length > 0;
}

/** Human-readable note for "no provider" error responses. */
export const LLM_NOT_CONFIGURED = 'AI analysis is not configured (set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY).';

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

/* ── Anthropic (Claude, Messages API) ────────────────────────────────────────── */

async function anthropicJson(system: string, user: string, schema: object, maxTokens: number): Promise<Record<string, unknown>> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.ANALYSIS_MODEL || 'claude-opus-5';
  const client = new Anthropic({ apiKey: key });

  let response;
  try {
    response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      // This is straightforward JSON extraction, not deep reasoning — disable
      // thinking so the full max_tokens budget goes to the JSON response
      // instead of being shared with (and possibly truncated by) thinking.
      thinking: { type: 'disabled' },
      system: systemWithSchema(system, schema),
      messages: [{ role: 'user', content: user }],
    });
  } catch (err) {
    throw new Error(`Anthropic API error: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('Anthropic API refused the request.');
  }
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return parseJsonLoose(text);
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
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        // Gemini 2.5 models think by default. This is plain JSON extraction,
        // not reasoning, and a small maxOutputTokens budget (some call sites
        // pass as little as 400) can be entirely consumed by thinking, leaving
        // no tokens for the actual response — disable it so the full budget
        // goes to the JSON output instead.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = JSON.stringify(await res.json()); } catch { /* ignore */ }
    throw new Error(`Gemini API error ${res.status}: ${detail}`);
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] };
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? '').join('');
  if (!text.trim()) {
    throw new Error(`Gemini returned no text (finishReason: ${candidate?.finishReason ?? 'unknown'}).`);
  }
  return parseJsonLoose(text);
}

/**
 * Run a JSON completion, trying every configured provider in order
 * (OpenAI → Anthropic → Gemini) and falling through to the next one if a
 * provider call fails for any reason — quota exhaustion, rate limits,
 * network errors. Only throws once every configured provider has failed.
 * @throws if no provider is configured, or every configured provider errors.
 */
export async function llmJson(system: string, user: string, schema: object, maxTokens = 2000): Promise<Record<string, unknown>> {
  const providers = configuredProviders();
  if (providers.length === 0) throw new Error(LLM_NOT_CONFIGURED);

  let lastErr: unknown;
  for (const provider of providers) {
    try {
      if (provider === 'openai') return await openaiJson(system, user, schema, maxTokens);
      if (provider === 'anthropic') return await anthropicJson(system, user, schema, maxTokens);
      return await geminiJson(system, user, schema, maxTokens);
    } catch (err) {
      console.error(`[llm] ${provider} failed, trying next provider`, err);
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('All configured LLM providers failed.');
}
