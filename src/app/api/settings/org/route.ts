import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { getOrgProfile, upsertOrgProfile, setBrandTerms, OrgProfile } from '@/lib/settings/org-store';

export const dynamic = 'force-dynamic';

/** GET /api/settings/org — the logged-in user's saved company profile. */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const profile = await getOrgProfile(user.org);
  return NextResponse.json({ profile });
}

const EDITABLE: (keyof OrgProfile)[] = [
  'company_name', 'website', 'contact_email', 'timezone', 'logo_url',
  'industry', 'about', 'services', 'expectations',
];

/** PUT /api/settings/org — save the logged-in user's company profile. */
export async function PUT(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  let body: Partial<Record<keyof OrgProfile, unknown>>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  // Only accept known string fields — ignore anything else the client sends.
  const data: Partial<OrgProfile> = {};
  for (const key of EDITABLE) {
    const v = body[key];
    if (typeof v === 'string') data[key] = v;
  }

  await upsertOrgProfile(user.org, data);

  // Brand-monitoring terms are arrays — accept manual edits alongside the profile.
  const asArray = (v: unknown): string[] | undefined =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;
  const bk = asArray((body as Record<string, unknown>).brand_keywords);
  const bh = asArray((body as Record<string, unknown>).brand_handles);
  const ex = asArray((body as Record<string, unknown>).exclude_terms);
  if (bk || bh || ex) {
    await setBrandTerms(user.org, { brand_keywords: bk, brand_handles: bh, exclude_terms: ex });
  }

  return NextResponse.json({ profile: await getOrgProfile(user.org) });
}
