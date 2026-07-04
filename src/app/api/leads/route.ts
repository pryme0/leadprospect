import { NextResponse } from 'next/server';
import { getLeadsDb, insertLead, listLeads } from '@/lib/leads/db';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CaptureBody {
  first_name?: string;
  email?: string;
  phone_number?: string;
  timeline_to_start?: string;
  income_goal?: string;
  source_tool?: string;
  consent_call?: boolean;
  consent_email?: boolean;
  consented?: boolean;
  lead_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_path?: string;
}

/**
 * POST /api/leads — capture a real lead from the site.
 * Persists to leads.db. No demo/placeholder values are invented: fields the
 * capture form does not collect (timeline, income goal) are stored empty.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CaptureBody;

    const first_name = (body.first_name ?? '').trim();
    const email = (body.email ?? '').trim();
    const phone_number = (body.phone_number ?? '').trim();

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, message: 'A valid email is required.' }, { status: 400 });
    }

    // Intent is derived from a real signal (explicit consent), not fabricated.
    const intent_level = body.consented ? 'HIGH_INTENT' : 'MEDIUM_INTENT';
    // Source tool: prefer the campaign source when present, else the form origin.
    const source_tool = (body.source_tool || body.utm_source || 'homepage').toString();

    const db = getLeadsDb();
    const id = insertLead(db, {
      first_name,
      email,
      phone_number,
      timeline_to_start: (body.timeline_to_start ?? '').toString(),
      income_goal: (body.income_goal ?? '').toString(),
      source_tool,
      intent_level,
      consent_call: !!body.consent_call,
      consent_email: !!body.consent_email,
      consented: !!body.consented,
      lead_source: body.lead_source ?? 'Website',
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      utm_term: body.utm_term ?? null,
      utm_content: body.utm_content ?? null,
      referrer: body.referrer ?? null,
      landing_path: body.landing_path ?? null,
    });

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/leads]', err);
    return NextResponse.json({ ok: false, message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/leads — paginated, filterable list for the admin lead queue.
 * Query: page, limit, source_tool, intent_level.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const db = getLeadsDb();
    const { leads, total, total_pages } = listLeads(db, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
      source_tool: searchParams.get('source_tool') ?? undefined,
      intent_level: searchParams.get('intent_level') ?? undefined,
    });

    return NextResponse.json({
      leads,
      data: leads,
      total,
      total_pages,
      totalPages: total_pages,
      pagination: { total, total_pages },
    });
  } catch (err) {
    console.error('[GET /api/leads]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
