import { NextResponse } from 'next/server';
import { listSignals } from '@/lib/crawler/signals-db';
import { toUiSignal } from '@/lib/crawler/map';
import { resolveUserSbu } from '@/lib/crawler/user-sbu';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crawler/signals — the logged-in user's classified signals.
 * Scoped to the user's crawler SBU (set by /api/leads/generate) so each user
 * only sees signals from their own website analysis — never the global pool.
 * Query: page, limit, offset, source, intent_level, intent_category, processed,
 * has_email, min_urgency, q, order_by.
 */
export async function GET(req: Request) {
  try {
    // Resolve the user's SBU (deterministic fallback across environments).
    const { sbu, provisioned } = await resolveUserSbu(req);

    if (!sbu) {
      return NextResponse.json({
        signals: [], data: [], total: 0, total_pages: 1, totalPages: 1, needs_generation: !provisioned,
      });
    }

    const sp = new URL(req.url).searchParams;
    const limit = Math.min(Number(sp.get('limit') ?? 20) || 20, 500);
    const offset = sp.get('offset') !== null
      ? Number(sp.get('offset'))
      : (Math.max(1, Number(sp.get('page') ?? 1)) - 1) * limit;

    const intent = sp.get('intent_level');
    const orderByRaw = sp.get('order_by');
    const { signals, total } = await listSignals({
      sbu,
      limit,
      offset,
      source: sp.get('source') || undefined,
      intentLevel: intent === 'HIGH_INTENT' || intent === 'MEDIUM_INTENT' || intent === 'LOW_INTENT' ? intent : undefined,
      intentCategory: sp.get('intent_category') || undefined,
      ingestionCategory: sp.get('ingestion_category') || undefined,
      processed: sp.get('processed') === 'true' ? true : sp.get('processed') === 'false' ? false : undefined,
      hasEmail: sp.get('has_email') === 'true' ? true : sp.get('has_email') === 'false' ? false : undefined,
      minScore: sp.get('min_urgency') ? Number(sp.get('min_urgency')) : undefined,
      search: sp.get('q') || undefined,
      orderBy: orderByRaw === 'urgency_score' || orderByRaw === 'classified_at' || orderByRaw === 'created_at' ? orderByRaw : undefined,
    });

    const data = signals.map(toUiSignal);
    const total_pages = Math.max(1, Math.ceil(total / limit));
    return NextResponse.json({ signals: data, data, total, total_pages, totalPages: total_pages });
  } catch (err) {
    console.error('[GET /api/crawler/signals]', err);
    return NextResponse.json({ error: 'Failed to load signals', signals: [], data: [], total: 0, total_pages: 1 }, { status: 500 });
  }
}
