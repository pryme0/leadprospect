import { NextRequest, NextResponse } from 'next/server';
import { createAccessRequest } from '@/lib/access/store';

export const dynamic = 'force-dynamic';

/**
 * POST /api/access-requests — PUBLIC. Someone requesting access via /signup.
 * Stores the request for the super admin to review; no account is created.
 * Body: { name, email, company?, phone?, message? }
 */
export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; company?: string; phone?: string; message?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }

  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim();
  if (!name) return NextResponse.json({ message: 'Your name is required.' }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 });

  try {
    const request = createAccessRequest({ name, email, company: body.company, phone: body.phone, message: body.message });
    return NextResponse.json({ ok: true, id: request.id });
  } catch (err) {
    console.error('[POST /api/access-requests]', err);
    return NextResponse.json({ message: 'Could not submit your request. Please try again.' }, { status: 500 });
  }
}
