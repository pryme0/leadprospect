/**
 * AI relevance + sentiment for candidate mentions. Filters out posts that only
 * coincidentally match a brand term (critical for common-word names) and tags
 * sentiment. Uses the provider-agnostic JSON helper (OpenAI, Gemini fallback).
 * Degrades to "relevant + neutral" when no provider key is set so ingestion
 * still works (just unfiltered/unsentimented).
 */
import { llmJson, llmConfigured } from '@/lib/llm/json';

const BATCH = 20;

export type Sentiment = 'positive' | 'neutral' | 'negative';
export interface Verdict { relevant: boolean; sentiment: Sentiment }

const SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'number' },
          relevant: { type: 'boolean' },
          sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
        },
        required: ['index', 'relevant', 'sentiment'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
} as const;

async function classifyBatch(company: string, summary: string, texts: string[]): Promise<Verdict[]> {
  const fallback = texts.map<Verdict>(() => ({ relevant: true, sentiment: 'neutral' }));
  if (!llmConfigured()) return fallback;

  const system = `You verify social/web mentions of a specific company and rate sentiment.
Company: "${company}"${summary ? `\nWhat they do: ${summary}` : ''}

For each numbered item decide:
- relevant: TRUE only if the text is genuinely about THIS company/product (not a different thing that happens to share the name, not a generic use of the word). When unsure, FALSE.
- sentiment: the author's sentiment toward the company — positive, neutral, or negative.
Return one result per item, echoing its index.`;

  const user = texts.map((t, i) => `[${i}] ${t.replace(/\s+/g, ' ').slice(0, 400)}`).join('\n');

  try {
    const parsed = await llmJson(system, user, SCHEMA, 1500) as {
      results?: { index: number; relevant: boolean; sentiment: Sentiment }[];
    };
    const out = [...fallback];
    for (const r of parsed.results ?? []) {
      if (r.index >= 0 && r.index < out.length) out[r.index] = { relevant: !!r.relevant, sentiment: r.sentiment };
    }
    return out;
  } catch {
    return fallback;
  }
}

/** Classify an arbitrary number of texts (batched). Order preserved. */
export async function classifyMentions(company: string, summary: string, texts: string[]): Promise<Verdict[]> {
  const out: Verdict[] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    out.push(...await classifyBatch(company, summary, texts.slice(i, i + BATCH)));
  }
  return out;
}
