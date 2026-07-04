import { NextResponse } from 'next/server';
import { getSignalById } from '@/lib/crawler/signals-db';
import { toUiSignal } from '@/lib/crawler/map';

export const dynamic = 'force-dynamic';

/** GET /api/crawler/signals/:id — one classified signal by UUID. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const row = await getSignalById(params.id);
    if (!row) return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    return NextResponse.json(toUiSignal(row));
  } catch (err) {
    console.error('[GET /api/crawler/signals/:id]', err);
    return NextResponse.json({ error: 'Failed to load signal' }, { status: 500 });
  }
}
