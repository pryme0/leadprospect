import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/comms/db';
import { getConversations } from '@/lib/comms/conversations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform') ?? 'all';
    const conversations = await getConversations(getDb(), platform);
    return NextResponse.json({ conversations });
  } catch (err) {
    console.error('[GET /api/comms/conversations]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
