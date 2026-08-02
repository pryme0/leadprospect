import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { resolveUserSbu } from '@/lib/crawler/user-sbu';
import { getSignalsPool } from '@/lib/crawler/signals-db';

export const dynamic = 'force-dynamic';

interface DuplicateGroup {
  key: string;
  type: 'email' | 'name' | 'username';
  leads: {
    id: string;
    name: string | null;
    email: string | null;
    username: string | null;
    source: string;
    created_at: string;
  }[];
}

/**
 * GET /api/leads/duplicates — find potential duplicate leads.
 * Groups by: same email, same username, or very similar names.
 */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'Subscription required.' }, { status: 403 });
  }

  try {
    const { sbu } = await resolveUserSbu(req);
    if (!sbu) return NextResponse.json({ duplicates: [] });

    const pool = getSignalsPool();
    if (!pool) return NextResponse.json({ duplicates: [] });

    // Find signals with duplicate emails
    const emailDupes = await pool.query(`
      SELECT id, name, email, username, source, created_at
      FROM signals
      WHERE sbu_id = $1
        AND email IS NOT NULL
        AND email != ''
        AND email IN (
          SELECT email FROM signals
          WHERE sbu_id = $1 AND email IS NOT NULL AND email != ''
          GROUP BY email HAVING COUNT(*) > 1
        )
      ORDER BY email, created_at DESC
    `, [sbu]);

    // Find signals with duplicate usernames (cross-platform)
    const usernameDupes = await pool.query(`
      SELECT id, name, email, username, source, created_at
      FROM signals
      WHERE sbu_id = $1
        AND username IS NOT NULL
        AND username != ''
        AND LOWER(username) IN (
          SELECT LOWER(username) FROM signals
          WHERE sbu_id = $1 AND username IS NOT NULL AND username != ''
          GROUP BY LOWER(username) HAVING COUNT(*) > 1
        )
      ORDER BY LOWER(username), created_at DESC
    `, [sbu]);

    const duplicates: DuplicateGroup[] = [];
    const seenIds = new Set<string>();

    // Group by email
    const byEmail: Record<string, DuplicateGroup['leads']> = {};
    for (const row of emailDupes.rows) {
      const key = (row.email as string).toLowerCase();
      if (!byEmail[key]) byEmail[key] = [];
      byEmail[key].push({
        id: row.id,
        name: row.name,
        email: row.email,
        username: row.username,
        source: row.source,
        created_at: row.created_at,
      });
      seenIds.add(row.id);
    }
    for (const [email, leads] of Object.entries(byEmail)) {
      if (leads.length > 1) {
        duplicates.push({ key: email, type: 'email', leads });
      }
    }

    // Group by username (excluding already grouped by email)
    const byUsername: Record<string, DuplicateGroup['leads']> = {};
    for (const row of usernameDupes.rows) {
      if (seenIds.has(row.id)) continue;
      const key = (row.username as string).toLowerCase();
      if (!byUsername[key]) byUsername[key] = [];
      byUsername[key].push({
        id: row.id,
        name: row.name,
        email: row.email,
        username: row.username,
        source: row.source,
        created_at: row.created_at,
      });
    }
    for (const [username, leads] of Object.entries(byUsername)) {
      if (leads.length > 1) {
        duplicates.push({ key: `@${username}`, type: 'username', leads });
      }
    }

    return NextResponse.json({
      duplicates: duplicates.slice(0, 50),
      total: duplicates.length,
    });
  } catch (err) {
    console.error('[GET /api/leads/duplicates]', err);
    return NextResponse.json({ duplicates: [], total: 0 });
  }
}
