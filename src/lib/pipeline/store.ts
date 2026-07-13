/**
 * Sales pipeline — the org-owned deal/stage tracker for crawler leads. Mirrors
 * `src/lib/outreach/store.ts`'s pattern exactly: a self-contained table on the
 * SHARED Postgres (same pool as `signals`), keyed by (org_id, lead_id).
 *
 * `lead_id` references `signals.id` in the SAME database but is NOT a foreign
 * key — `signals` is owned/ALTERed out-of-band by the external crawler's
 * TypeORM classifier service (see thelixcrawler/src/signals/postgres.ts), so a
 * hard FK would be unsafe. Scoping/joins happen at the query layer instead.
 */
import { appPool, ensureAppSchema } from '@/lib/app-pg';

export type PipelineStage = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
export const PIPELINE_STAGES: PipelineStage[] = ['new', 'contacted', 'qualified', 'won', 'lost'];

export interface PipelineRow {
  id: string;
  org_id: string;
  lead_id: string;
  stage: PipelineStage;
  value: number | null;
  owner_user_id: string | null;
  notes: string | null;
  lost_reason: string | null;
  follow_up_at: string | null;
  stage_changed_at: string;
  created_at: string;
  updated_at: string;
}

let ready: Promise<void> | null = null;
function ensureReady(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    await ensureAppSchema();
    const p = appPool();
    // Needed for gen_random_uuid(); a no-op if already enabled.
    await p.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await p.query(`
      CREATE TABLE IF NOT EXISTS lead_pipeline (
        id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id           TEXT NOT NULL,
        lead_id          TEXT NOT NULL,
        stage            TEXT NOT NULL DEFAULT 'new',
        value            NUMERIC,
        owner_user_id    TEXT,
        notes            TEXT,
        lost_reason      TEXT,
        follow_up_at     TIMESTAMPTZ,
        stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_lead_pipeline_org_lead ON lead_pipeline(org_id, lead_id)`);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_lead_pipeline_org_stage ON lead_pipeline(org_id, stage)`);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_lead_pipeline_lead ON lead_pipeline(lead_id)`);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_lead_pipeline_followup ON lead_pipeline(org_id, follow_up_at) WHERE follow_up_at IS NOT NULL`);
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

/**
 * Auto-entry: every HIGH/MEDIUM-intent, prospect-qualifying signal for this org's
 * SBU gets a `lead_pipeline` row in 'new' if it doesn't already have one. Single
 * batched, idempotent statement — safe to call on every read (lazy upsert, no
 * cron). `ON CONFLICT DO NOTHING` + the pre-filtering `NOT EXISTS` make repeat
 * calls cheap no-ops.
 */
export async function syncPipelineForOrg(orgId: string, sbu: string): Promise<void> {
  await ensureReady();
  // signals.id is uuid; lead_pipeline.lead_id is text (no FK — see file header),
  // so cast s.id::text on both the inserted value and the NOT EXISTS comparison.
  await appPool().query(
    `INSERT INTO lead_pipeline (org_id, lead_id, stage)
     SELECT $1, s.id::text, 'new'
     FROM signals s
     WHERE s.sbu_id = $2
       AND s.intent_level IN ('HIGH_INTENT', 'MEDIUM_INTENT')
       AND COALESCE(s.intent_category, '') <> 'Not a Prospect'
       AND NOT EXISTS (
         SELECT 1 FROM lead_pipeline lp WHERE lp.org_id = $1 AND lp.lead_id = s.id::text
       )
     ON CONFLICT (org_id, lead_id) DO NOTHING`,
    [orgId, sbu],
  );
}

export interface PipelineListFilter {
  stage?: PipelineStage;
  ownerUserId?: string;
  leadIds?: string[];
}

/** All pipeline rows for an org, optionally filtered. */
export async function listPipelineRows(orgId: string, filter: PipelineListFilter = {}): Promise<PipelineRow[]> {
  await ensureReady();
  const clauses = ['org_id = $1'];
  const params: unknown[] = [orgId];
  if (filter.stage) { params.push(filter.stage); clauses.push(`stage = $${params.length}`); }
  if (filter.ownerUserId) { params.push(filter.ownerUserId); clauses.push(`owner_user_id = $${params.length}`); }
  if (filter.leadIds && filter.leadIds.length) { params.push(filter.leadIds); clauses.push(`lead_id = ANY($${params.length})`); }
  const { rows } = await appPool().query(
    `SELECT * FROM lead_pipeline WHERE ${clauses.join(' AND ')} ORDER BY stage_changed_at DESC`,
    params,
  );
  return rows as PipelineRow[];
}

export async function getPipelineRow(orgId: string, leadId: string): Promise<PipelineRow | null> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM lead_pipeline WHERE org_id = $1 AND lead_id = $2`,
    [orgId, leadId],
  );
  return (rows[0] as PipelineRow) ?? null;
}

/** Stage-only lookup for a batch of leads (Lead Queue pill rendering). */
export async function getPipelineStagesByLeadIds(orgId: string, leadIds: string[]): Promise<Record<string, { stage: PipelineStage; follow_up_at: string | null }>> {
  if (leadIds.length === 0) return {};
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT lead_id, stage, follow_up_at FROM lead_pipeline WHERE org_id = $1 AND lead_id = ANY($2)`,
    [orgId, leadIds],
  );
  const out: Record<string, { stage: PipelineStage; follow_up_at: string | null }> = {};
  for (const r of rows as { lead_id: string; stage: PipelineStage; follow_up_at: string | null }[]) {
    out[r.lead_id] = { stage: r.stage, follow_up_at: r.follow_up_at };
  }
  return out;
}

/** Manual add (e.g. a LOW-intent lead the auto-entry rule skipped). Idempotent. */
export async function upsertManualPipelineEntry(orgId: string, leadId: string): Promise<void> {
  await ensureReady();
  await appPool().query(
    `INSERT INTO lead_pipeline (org_id, lead_id, stage) VALUES ($1, $2, 'new')
     ON CONFLICT (org_id, lead_id) DO NOTHING`,
    [orgId, leadId],
  );
}

export interface PipelineUpdateInput {
  stage?: PipelineStage;
  value?: number | null;
  owner_user_id?: string | null;
  notes?: string | null;
  lost_reason?: string | null;
  follow_up_at?: string | null;
}

/** Update a pipeline row. Stamps stage_changed_at only when `stage` actually changes. */
export async function updatePipelineRow(orgId: string, leadId: string, input: PipelineUpdateInput): Promise<PipelineRow | null> {
  await ensureReady();
  const existing = await getPipelineRow(orgId, leadId);
  if (!existing) return null;

  const sets: string[] = ['updated_at = now()'];
  const params: unknown[] = [];
  const push = (col: string, value: unknown) => { params.push(value); sets.push(`${col} = $${params.length}`); };

  if (input.stage && input.stage !== existing.stage) {
    push('stage', input.stage);
    sets.push('stage_changed_at = now()');
  }
  if (input.value !== undefined) push('value', input.value);
  if (input.owner_user_id !== undefined) push('owner_user_id', input.owner_user_id);
  if (input.notes !== undefined) push('notes', input.notes);
  if (input.lost_reason !== undefined) push('lost_reason', input.lost_reason);
  if (input.follow_up_at !== undefined) push('follow_up_at', input.follow_up_at);

  params.push(orgId, leadId);
  await appPool().query(
    `UPDATE lead_pipeline SET ${sets.join(', ')} WHERE org_id = $${params.length - 1} AND lead_id = $${params.length}`,
    params,
  );
  return getPipelineRow(orgId, leadId);
}

/**
 * Forward-only auto-advance: New → Contacted the moment outreach is sent. Never
 * regresses a later stage (qualified/won/lost) — the WHERE guard is the whole
 * mechanism. A no-op (0 rows matched) if no pipeline row exists yet or it has
 * already moved past 'new'.
 */
export async function advancePastNew(orgId: string, leadId: string): Promise<void> {
  await ensureReady();
  await appPool().query(
    `UPDATE lead_pipeline SET stage = 'contacted', stage_changed_at = now(), updated_at = now()
     WHERE org_id = $1 AND lead_id = $2 AND stage = 'new'`,
    [orgId, leadId],
  );
}

export interface PipelineStats {
  counts: Record<PipelineStage, number>;
  winRate: number;          // won / (won + lost), 0 if none closed yet
  wonValue: number;
  openValue: number;
  avgCycleDays: number;     // avg New→Won time, for won deals
  overdueFollowups: number;
}

export function emptyPipelineStats(): PipelineStats {
  return {
    counts: { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0 },
    winRate: 0, wonValue: 0, openValue: 0, avgCycleDays: 0, overdueFollowups: 0,
  };
}

/** Funnel counts, win rate, value totals, avg cycle time, overdue follow-ups. */
export async function getPipelineStats(orgId: string): Promise<PipelineStats> {
  await ensureReady();
  const [agg, cycle] = await Promise.all([
    appPool().query(
      `SELECT
         COUNT(*) FILTER (WHERE stage = 'new')::int AS new_count,
         COUNT(*) FILTER (WHERE stage = 'contacted')::int AS contacted_count,
         COUNT(*) FILTER (WHERE stage = 'qualified')::int AS qualified_count,
         COUNT(*) FILTER (WHERE stage = 'won')::int AS won_count,
         COUNT(*) FILTER (WHERE stage = 'lost')::int AS lost_count,
         COALESCE(SUM(value) FILTER (WHERE stage = 'won'), 0)::numeric AS won_value,
         COALESCE(SUM(value) FILTER (WHERE stage NOT IN ('won','lost')), 0)::numeric AS open_value,
         COUNT(*) FILTER (WHERE follow_up_at IS NOT NULL AND follow_up_at < now() AND stage NOT IN ('won','lost'))::int AS overdue_followups
       FROM lead_pipeline WHERE org_id = $1`,
      [orgId],
    ),
    appPool().query(
      `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (stage_changed_at - created_at)) / 86400.0), 0)::float AS avg_days
       FROM lead_pipeline WHERE org_id = $1 AND stage = 'won'`,
      [orgId],
    ),
  ]);
  const a = agg.rows[0] ?? {};
  const won = a.won_count ?? 0;
  const lost = a.lost_count ?? 0;
  return {
    counts: {
      new: a.new_count ?? 0, contacted: a.contacted_count ?? 0, qualified: a.qualified_count ?? 0,
      won, lost,
    },
    winRate: (won + lost) > 0 ? won / (won + lost) : 0,
    wonValue: Number(a.won_value ?? 0),
    openValue: Number(a.open_value ?? 0),
    avgCycleDays: Math.round((cycle.rows[0]?.avg_days ?? 0) * 10) / 10,
    overdueFollowups: a.overdue_followups ?? 0,
  };
}
