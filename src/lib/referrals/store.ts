/**
 * Referral store (shared Postgres). Per-org referral state + an append-only
 * points ledger. org_id = the owner user's id (the workspace key), matching
 * every other app store. Mirrors the patterns in subscription/server-store.ts
 * (singleton upsert) and billing/transactions.ts (append-only ledger).
 */
import { randomBytes } from 'crypto';
import { appPool, ensureAppSchema } from '@/lib/app-pg';
import type { RedemptionOption } from './config';

export interface ReferralRecord {
  org_id: string;
  referral_code: string | null;
  referred_by_org_id: string | null;
  points_balance: number;
  points_earned_total: number;
  bonus_leads_per_day: number;
  bonus_leads_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralEvent {
  id: string;
  org_id: string;
  type: 'earn' | 'redeem';
  points: number;
  referred_org_id: string | null;
  note: string | null;
  created_at: string;
}

async function ensureRow(orgId: string): Promise<void> {
  const now = new Date().toISOString();
  await appPool().query(
    `INSERT INTO referrals (org_id, created_at, updated_at) VALUES ($1,$2,$2)
     ON CONFLICT (org_id) DO NOTHING`,
    [orgId, now],
  );
}

/** Generate a unique short referral code once, then always return the same one. */
export async function ensureReferralCode(orgId: string): Promise<string> {
  await ensureAppSchema();
  await ensureRow(orgId);
  const cur = (await appPool().query('SELECT referral_code FROM referrals WHERE org_id = $1', [orgId])).rows[0];
  if (cur?.referral_code) return cur.referral_code as string;

  for (let i = 0; i < 12; i++) {
    const code = randomBytes(5).toString('hex').toUpperCase(); // 10 hex chars, unguessable
    try {
      const r = await appPool().query(
        `UPDATE referrals SET referral_code = $1, updated_at = $2 WHERE org_id = $3 AND referral_code IS NULL`,
        [code, new Date().toISOString(), orgId],
      );
      if ((r.rowCount ?? 0) > 0) return code;
      // referral_code was set concurrently — return it
      const again = (await appPool().query('SELECT referral_code FROM referrals WHERE org_id = $1', [orgId])).rows[0];
      if (again?.referral_code) return again.referral_code as string;
    } catch {
      // unique-index collision on the code — loop and try a fresh one
    }
  }
  throw new Error('Could not generate a unique referral code.');
}

/** Full referral row for an org (ensures a row + code exist). */
export async function getReferral(orgId: string): Promise<ReferralRecord> {
  await ensureReferralCode(orgId);
  const { rows } = await appPool().query('SELECT * FROM referrals WHERE org_id = $1', [orgId]);
  return rows[0] as ReferralRecord;
}

/**
 * The org's currently-active bonus to the daily HIGH-intent lead cap (0 if none
 * or expired). Hot path — called by GET /api/crawler/leads — so it only reads,
 * never creates a row.
 */
export async function getActiveBonusLeadsPerDay(orgId: string): Promise<number> {
  await ensureAppSchema();
  const { rows } = await appPool().query(
    `SELECT bonus_leads_per_day FROM referrals
       WHERE org_id = $1 AND bonus_leads_until IS NOT NULL AND bonus_leads_until > $2`,
    [orgId, new Date().toISOString()],
  );
  return (rows[0]?.bonus_leads_per_day as number) ?? 0;
}

/** Resolve a referral code to the referring org id (or null). */
export async function resolveReferrerByCode(code: string): Promise<string | null> {
  await ensureAppSchema();
  const c = (code ?? '').trim();
  if (!c) return null;
  const { rows } = await appPool().query(
    'SELECT org_id FROM referrals WHERE lower(referral_code) = lower($1) LIMIT 1',
    [c],
  );
  return (rows[0]?.org_id as string) ?? null;
}

/** Record that `orgId` was referred by `referrerOrgId` (first writer wins). */
export async function setReferredBy(orgId: string, referrerOrgId: string): Promise<void> {
  await ensureAppSchema();
  await ensureRow(orgId);
  await appPool().query(
    'UPDATE referrals SET referred_by_org_id = COALESCE(referred_by_org_id, $1), updated_at = $2 WHERE org_id = $3',
    [referrerOrgId, new Date().toISOString(), orgId],
  );
}

/**
 * Credit the referrer for a newly-created referred org. Idempotent: the partial
 * unique index guarantees a given referred org credits its referrer at most
 * once. Returns true if points were actually awarded (false if already credited).
 */
export async function awardReferralPoints(
  referrerOrgId: string,
  referredOrgId: string,
  points: number,
  note?: string,
): Promise<boolean> {
  await ensureAppSchema();
  await ensureRow(referrerOrgId);
  const now = new Date().toISOString();
  const ins = await appPool().query(
    `INSERT INTO referral_events (id, org_id, type, points, referred_org_id, note, created_at)
     VALUES ($1,$2,'earn',$3,$4,$5,$6)
     ON CONFLICT (org_id, referred_org_id) WHERE type = 'earn' AND referred_org_id IS NOT NULL DO NOTHING`,
    [`rfe_${randomBytes(10).toString('hex')}`, referrerOrgId, points, referredOrgId, note ?? null, now],
  );
  if ((ins.rowCount ?? 0) === 0) return false; // already credited for this referred org
  await appPool().query(
    `UPDATE referrals
       SET points_balance = points_balance + $1,
           points_earned_total = points_earned_total + $1,
           updated_at = $2
     WHERE org_id = $3`,
    [points, now, referrerOrgId],
  );
  return true;
}

/**
 * Spend points on a redemption option. Atomically checks the balance and, if
 * sufficient, decrements it and sets the active bonus (replacing any prior one).
 */
export async function redeemForBonusLeads(
  orgId: string,
  option: RedemptionOption,
): Promise<{ ok: boolean; message?: string; referral?: ReferralRecord }> {
  await ensureAppSchema();
  await ensureRow(orgId);
  const now = new Date().toISOString();
  const until = new Date(Date.now() + option.days * 86_400_000).toISOString();
  const dec = await appPool().query(
    `UPDATE referrals
       SET points_balance = points_balance - $1,
           bonus_leads_per_day = $2,
           bonus_leads_until = $3,
           updated_at = $4
     WHERE org_id = $5 AND points_balance >= $1
     RETURNING *`,
    [option.cost, option.leadsPerDay, until, now, orgId],
  );
  if ((dec.rowCount ?? 0) === 0) return { ok: false, message: 'Not enough points for this reward.' };
  await appPool().query(
    `INSERT INTO referral_events (id, org_id, type, points, referred_org_id, note, created_at)
     VALUES ($1,$2,'redeem',$3,NULL,$4,$5)`,
    [`rfe_${randomBytes(10).toString('hex')}`, orgId, option.cost, option.label, now],
  );
  return { ok: true, referral: dec.rows[0] as ReferralRecord };
}

/** How many orgs this org has successfully referred (= earn events). */
export async function countReferredOrgs(orgId: string): Promise<number> {
  await ensureAppSchema();
  const { rows } = await appPool().query(
    "SELECT COUNT(*)::int AS n FROM referral_events WHERE org_id = $1 AND type = 'earn'",
    [orgId],
  );
  return (rows[0]?.n as number) ?? 0;
}

export async function listReferralEvents(orgId: string, limit = 20): Promise<ReferralEvent[]> {
  await ensureAppSchema();
  const { rows } = await appPool().query(
    'SELECT * FROM referral_events WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2',
    [orgId, limit],
  );
  return rows as ReferralEvent[];
}
