import { appPool, ensureAppSchema } from '@/lib/app-pg';

let ready: Promise<void> | null = null;
function ensureReady(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    await ensureAppSchema();
    await appPool().query(`
      CREATE TABLE IF NOT EXISTS lead_merges (
        org_id         TEXT NOT NULL,
        lead_id        TEXT NOT NULL,
        merged_into_id TEXT NOT NULL,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (org_id, lead_id)
      );
    `);
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

/** Record that `leadId` was merged into `mergedIntoId` — it should be suppressed from lists going forward. */
export async function recordMerge(orgId: string, leadId: string, mergedIntoId: string): Promise<void> {
  await ensureReady();
  await appPool().query(
    `INSERT INTO lead_merges (org_id, lead_id, merged_into_id) VALUES ($1, $2, $3)
     ON CONFLICT (org_id, lead_id) DO UPDATE SET merged_into_id = EXCLUDED.merged_into_id`,
    [orgId, leadId, mergedIntoId],
  );
}

/** All lead ids that have been merged away for this org (to filter out of lists). */
export async function getMergedLeadIds(orgId: string): Promise<Set<string>> {
  await ensureReady();
  const { rows } = await appPool().query(`SELECT lead_id FROM lead_merges WHERE org_id = $1`, [orgId]);
  return new Set((rows as { lead_id: string }[]).map((r) => r.lead_id));
}
