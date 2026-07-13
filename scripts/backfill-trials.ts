/**
 * Backfill the 7-working-day free trial onto existing organizations, and report
 * every org's current trial/plan status + working days remaining.
 *
 * - Owners = users where id = org_id AND role != 'superadmin' (an org owner is a
 *   user who is their own org).
 * - Only orgs with NO subscription row get a trial (idempotent — never touches a
 *   paid sub, a super-admin grant, or an already-started/expired trial).
 * - Existing orgs' trials are anchored to their real created_at (so an org
 *   created weeks ago is already past its trial and reads 0 days left).
 *
 * Usage:
 *   npx tsx scripts/backfill-trials.ts            # report only (no writes)
 *   npx tsx scripts/backfill-trials.ts --apply    # grant trials + report
 */
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { computeTrialValidUntil, workingDaysRemaining, TRIAL_TIER } from '../src/lib/subscription/trial';
import { TIER_MODULES } from '../src/lib/subscription/tiers';

const APPLY = process.argv.includes('--apply');

function loadDatabaseUrl(): string {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/^DATABASE_URL=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error('DATABASE_URL not found in .env.local/.env');
}

interface Owner { id: string; company: string | null; email: string; created_at: string }
interface SubRow { plan_tier: string | null; grant_kind: string | null; valid_until: string | null; paystack_ref: string | null }

/**
 * An org should be put on the trial clock when either it has NO subscription, or
 * it's on a legacy permanent free Basic — i.e. Basic, ongoing (no expiry), NOT a
 * trial already, and never paid (no paystack_ref). Paid Basic, Pro/Max, existing
 * trials, and time-boxed grants are all left untouched.
 */
function qualifiesForTrial(sub: SubRow | undefined): boolean {
  if (!sub || !sub.plan_tier) return true;
  return sub.plan_tier === TRIAL_TIER
    && sub.grant_kind !== 'trial'
    && !sub.valid_until
    && !sub.paystack_ref;
}

function subStatus(sub: SubRow | undefined, now = new Date()): string {
  if (!sub || !sub.plan_tier) return 'no plan';
  if (!sub.valid_until) return `${sub.plan_tier} (ongoing)`;
  const expired = now.getTime() > new Date(sub.valid_until).getTime();
  const kind = sub.grant_kind ?? 'subscription';
  if (kind === 'trial') {
    return expired ? 'trial ENDED' : `trial · ${workingDaysRemaining(sub.valid_until, now)} working days left`;
  }
  const d = Math.ceil((new Date(sub.valid_until).getTime() - now.getTime()) / 86_400_000);
  return expired ? `${kind} EXPIRED` : `${kind} · ${d}d left`;
}

(async () => {
  const pg = new Client({ connectionString: loadDatabaseUrl().replace(/[?&]sslmode=[^&]*/g, ''), ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const owners = (await pg.query(
    `SELECT u.id, u.email, u.created_at, p.company_name AS company
       FROM users u LEFT JOIN org_profiles p ON p.user_id = u.id
      WHERE u.id = u.org_id AND u.role != 'superadmin'
      ORDER BY u.created_at DESC`,
  )).rows as Owner[];

  const subs = new Map<string, SubRow>();
  for (const r of (await pg.query('SELECT user_id, plan_tier, grant_kind, valid_until, paystack_ref FROM subscriptions')).rows) {
    subs.set(r.user_id, r);
  }

  console.log(`\n${APPLY ? 'APPLY' : 'REPORT-ONLY (pass --apply to grant)'} — ${owners.length} organization(s)\n`);
  let changed = 0;
  const now = new Date();
  for (const o of owners) {
    const label = (o.company || o.email || o.id).slice(0, 34).padEnd(34);
    const before = subs.get(o.id);
    const qualifies = qualifiesForTrial(before);
    const createdShort = String(o.created_at).slice(0, 10);
    if (qualifies && APPLY) {
      const validUntil = computeTrialValidUntil(new Date(o.created_at));
      const modules = JSON.stringify(TIER_MODULES[TRIAL_TIER]);
      const ts = new Date().toISOString();
      // Upsert: fresh grant for no-plan orgs; conversion for legacy permanent Basic.
      await pg.query(
        `INSERT INTO subscriptions (user_id, modules_json, plan_tier, activated_at, updated_at, valid_until, grant_kind, grant_note)
         VALUES ($1,$2,$3,$4,$4,$5,'trial','7-working-day free trial (backfill)')
         ON CONFLICT (user_id) DO UPDATE SET
           modules_json = excluded.modules_json, plan_tier = excluded.plan_tier,
           updated_at = excluded.updated_at, valid_until = excluded.valid_until,
           grant_kind = 'trial', grant_note = excluded.grant_note`,
        [o.id, modules, TRIAL_TIER, ts, validUntil],
      );
      changed += 1;
      const verb = before ? 'CONVERTED' : ' GRANTED ';
      console.log(`  ${verb} ${label} created ${createdShort} → ${subStatus({ plan_tier: TRIAL_TIER, grant_kind: 'trial', valid_until: validUntil, paystack_ref: null }, now)}`);
    } else {
      const tag = qualifies ? ' would  ' : '  keep  ';
      console.log(`  ${tag} ${label} created ${createdShort} → ${subStatus(before, now)}`);
    }
  }

  const wouldChange = owners.filter((o) => qualifiesForTrial(subs.get(o.id))).length;
  console.log(`\n${APPLY ? `Changed ${changed} org(s) to trial.` : `${wouldChange} org(s) would be put on the trial clock. Re-run with --apply.`}`);
  console.log('NOTE: run the /api/super/enforce sweep (or reload the platform dashboard) after --apply so sbus.active reflects any newly-expired trials.\n');
  await pg.end();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
