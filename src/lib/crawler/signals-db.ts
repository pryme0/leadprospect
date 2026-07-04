/**
 * Read-only access to the crawler's classified-signals Postgres.
 *
 * This is the SAME database `thelixcrawler` writes its LLM-classified,
 * Apollo/FullEnrich-enriched signals into. The lead dashboard reads from here so
 * every record shown is a real crawler record — no mock/seed data.
 *
 * Query logic (prospect filter, dedupe-by-person, stats) is ported faithfully
 * from thelixcrawler/src/signals/{signal-reader,non-prospect-filter}.ts so the
 * dashboard's lead list matches the crawler's own /api/signals/leads output.
 */
import { Pool } from 'pg';

/* ── Connection (cached across dev hot-reloads) ──────────────────────────────── */

const g = globalThis as unknown as { __signalsPool?: Pool | null };

/** Returns a pooled connection, or null when DATABASE_URL is not configured. */
export function getSignalsPool(): Pool | null {
  if (g.__signalsPool !== undefined) return g.__signalsPool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    g.__signalsPool = null;
    return null;
  }
  // DigitalOcean managed Postgres ships a self-signed CA chain. pg v8+ treats
  // `sslmode=require` in the URL as verify-full, overriding our ssl option — so
  // strip it and pin ssl here (mirrors the crawler's postgres.ts).
  const cleanUrl = url.replace(/[?&]sslmode=[^&]*/g, '');
  g.__signalsPool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 30_000,
    // Fail fast on an unreachable/slow DB (Railway can pause or blip): a 10s
    // hang per request made the polling dashboard feel broken. Cap query time
    // too so a slow aggregate can't tie up a connection indefinitely.
    connectionTimeoutMillis: 5_000,
    query_timeout: 8_000,
    statement_timeout: 8_000,
  });
  // A pool 'error' event on an idle client would otherwise crash the process.
  g.__signalsPool.on('error', (err) => {
    console.error('[signals-db pool] idle client error:', err.message);
  });
  return g.__signalsPool;
}

export function signalsConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

/* ── Non-prospect filter (ported from non-prospect-filter.ts) ────────────────── */

const NON_PROSPECT_TOKENS = [
  'recruit', 'staffing', 'headhunter', 'sourcer', 'talent acquisition',
  'talent partner', 'talent advisor', 'talent management', 'career coach',
  'job coach', 'leadership coach', 'executive coach', 'career strategist',
  'career consultant', 'resume writer', 'cv writer', 'human resources',
  'people operations', 'people ops', 'immigration consultant',
];
const NON_PROSPECT_BOUNDED_TOKENS = ['hr', 'hrbp', 'chro', 'coach', 'talent'];
const NON_PROSPECT_PG_REGEX = [
  ...NON_PROSPECT_TOKENS,
  ...NON_PROSPECT_BOUNDED_TOKENS.map((t) => `\\y${t}\\y`),
].join('|');

function prospectsOnlySql(): string {
  return `(
    COALESCE(intent_category, '') <> 'Not a Prospect'
    AND COALESCE(enriched_title, '') !~* '${NON_PROSPECT_PG_REGEX}'
    AND COALESCE(name, '') !~* '${NON_PROSPECT_PG_REGEX}'
  )`;
}

/* ── Types ───────────────────────────────────────────────────────────────────── */

export interface SignalRow {
  id: string;
  source: string;
  sbu_id: string | null;
  kind: string | null;
  username: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  content: string;
  url: string | null;
  post_url: string | null;
  profile_url: string | null;
  timestamp: string | null;
  content_hash: string | null;
  ingestion_category: string | null;
  processed: boolean;
  intent_level: string | null;
  intent_category: string | null;
  urgency_score: number | null;
  pain_points: string[] | null;
  summary: string | null;
  classified_at: string | null;
  enriched_name: string | null;
  enriched_email: string | null;
  enriched_phone: string | null;
  enriched_company: string | null;
  enriched_title: string | null;
  enriched_linkedin_url: string | null;
  enriched_via: string | null;
  enriched_at: string | null;
  created_at: string;
}

export interface SignalQuery {
  intentLevel?: 'LOW_INTENT' | 'MEDIUM_INTENT' | 'HIGH_INTENT';
  intentCategory?: string;
  ingestionCategory?: string;
  source?: string;
  /** Per-user scoping: only return signals tagged with this crawler SBU id. */
  sbu?: string;
  minScore?: number;
  maxScore?: number;
  hasEmail?: boolean;
  processed?: boolean;
  since?: string;
  search?: string;
  orderBy?: 'urgency_score' | 'classified_at' | 'created_at';
  excludeNonProspects?: boolean;
  deduplicateByPerson?: boolean;
  limit?: number;
  offset?: number;
}

const ORDER_BY_WHITELIST = new Set(['urgency_score', 'classified_at', 'created_at']);

const SELECT_COLUMNS = `
  id, source, sbu_id, kind, username, name, email, phone, location,
  content, url, post_url, profile_url,
  timestamp, content_hash, ingestion_category, processed,
  intent_level, intent_category, urgency_score, pain_points, summary, classified_at,
  enriched_name, enriched_email, enriched_phone, enriched_company,
  enriched_title, enriched_linkedin_url, enriched_via, enriched_at, created_at
`;

function buildWhere(q: SignalQuery): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const push = (clause: string, value: unknown) => {
    params.push(value);
    clauses.push(clause.replace('?', `$${params.length}`));
  };

  // source is optional here (dashboard shows all platforms by default).
  if (q.source) push('source = ?', q.source);
  if (q.sbu) push('sbu_id = ?', q.sbu);
  if (q.intentLevel) push('intent_level = ?', q.intentLevel);
  if (q.intentCategory) push('intent_category = ?', q.intentCategory);
  if (q.ingestionCategory) push('ingestion_category = ?', q.ingestionCategory);
  if (typeof q.minScore === 'number') push('urgency_score >= ?', q.minScore);
  if (typeof q.maxScore === 'number') push('urgency_score <= ?', q.maxScore);
  if (q.hasEmail === true) {
    clauses.push("(enriched_email IS NOT NULL AND enriched_email != '' AND enriched_email NOT LIKE '%@null%')");
  } else if (q.hasEmail === false) {
    clauses.push("(enriched_email IS NULL OR enriched_email = '' OR enriched_email LIKE '%@null%')");
  }
  if (typeof q.processed === 'boolean') push('processed = ?', q.processed);
  if (q.since) push('created_at >= ?::timestamptz', q.since);
  if (q.excludeNonProspects) clauses.push(prospectsOnlySql());
  if (q.search) {
    const term = `%${q.search}%`;
    params.push(term, term, term);
    const n = params.length;
    clauses.push(`(content ILIKE $${n - 2} OR name ILIKE $${n - 1} OR username ILIKE $${n})`);
  }

  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

/* ── Reads ───────────────────────────────────────────────────────────────────── */

export async function listSignals(q: SignalQuery = {}): Promise<{ signals: SignalRow[]; total: number; limit: number; offset: number }> {
  const pool = getSignalsPool();
  if (!pool) throw new Error('Signals Postgres not configured (DATABASE_URL missing)');

  const limit = Math.max(1, Math.min(q.limit ?? 50, 500));
  const offset = Math.max(0, q.offset ?? 0);
  const orderBy = q.orderBy && ORDER_BY_WHITELIST.has(q.orderBy) ? q.orderBy : 'classified_at';
  const where = buildWhere(q);

  let rows: SignalRow[];
  let total: number;

  if (q.deduplicateByPerson) {
    const dedupeWhere = where.sql
      ? `${where.sql} AND username IS NOT NULL AND username != ''`
      : `WHERE username IS NOT NULL AND username != ''`;

    const countRes = await pool.query(
      `SELECT COUNT(DISTINCT username)::int AS n FROM signals ${dedupeWhere}`,
      where.params,
    );
    total = countRes.rows[0]?.n ?? 0;

    const dataRes = await pool.query(
      `SELECT ${SELECT_COLUMNS} FROM (
         SELECT DISTINCT ON (username) ${SELECT_COLUMNS}
         FROM signals ${dedupeWhere}
         ORDER BY username, urgency_score DESC NULLS LAST, classified_at DESC NULLS LAST
       ) deduped
       ORDER BY ${orderBy} DESC NULLS LAST
       LIMIT ${limit} OFFSET ${offset}`,
      where.params,
    );
    rows = dataRes.rows;
  } else {
    const countRes = await pool.query(`SELECT COUNT(*)::int AS n FROM signals ${where.sql}`, where.params);
    total = countRes.rows[0]?.n ?? 0;

    const dataRes = await pool.query(
      `SELECT ${SELECT_COLUMNS} FROM signals ${where.sql}
       ORDER BY ${orderBy} DESC NULLS LAST
       LIMIT ${limit} OFFSET ${offset}`,
      where.params,
    );
    rows = dataRes.rows;
  }

  return { signals: rows, total, limit, offset };
}

export async function getSignalById(id: string): Promise<SignalRow | null> {
  const pool = getSignalsPool();
  if (!pool) throw new Error('Signals Postgres not configured');
  const res = await pool.query(`SELECT ${SELECT_COLUMNS} FROM signals WHERE id = $1`, [id]);
  return (res.rows[0] as SignalRow) ?? null;
}

export interface SignalStats {
  total: number;
  processed: number;
  pending: number;
  withEmail: number;
  byIntentLevel: { intent_level: string | null; count: number }[];
  byIntentCategory: { intent_category: string | null; count: number }[];
  byIngestionCategory: { ingestion_category: string | null; count: number }[];
}

/** Well-formed zero stats — returned when the crawler DB is unreachable so the
 * dashboard degrades to zeros instead of erroring. */
export function emptySignalStats(): SignalStats {
  return { total: 0, processed: 0, pending: 0, withEmail: 0, byIntentLevel: [], byIntentCategory: [], byIngestionCategory: [] };
}

export async function signalStats(opts: { source?: string; sbu?: string } = {}): Promise<SignalStats> {
  const pool = getSignalsPool();
  if (!pool) throw new Error('Signals Postgres not configured');

  const params: unknown[] = [];
  const clauses: string[] = [];
  if (opts.source) { params.push(opts.source); clauses.push(`source = $${params.length}`); }
  if (opts.sbu)    { params.push(opts.sbu);    clauses.push(`sbu_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const [totals, byLevel, byCategory, byIngestion] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE processed)::int AS processed,
        COUNT(*) FILTER (WHERE NOT processed)::int AS pending,
        COUNT(*) FILTER (WHERE enriched_email IS NOT NULL AND enriched_email != '' AND enriched_email NOT LIKE '%@null%')::int AS with_email
      FROM signals ${where}
    `, params),
    pool.query(`SELECT intent_level, COUNT(*)::int AS count FROM signals ${where} GROUP BY intent_level ORDER BY count DESC`, params),
    pool.query(`SELECT intent_category, COUNT(*)::int AS count FROM signals ${where} GROUP BY intent_category ORDER BY count DESC`, params),
    pool.query(`SELECT ingestion_category, COUNT(*)::int AS count FROM signals ${where} GROUP BY ingestion_category ORDER BY count DESC`, params),
  ]);

  const t = totals.rows[0];
  return {
    total: t?.total ?? 0,
    processed: t?.processed ?? 0,
    pending: t?.pending ?? 0,
    withEmail: t?.with_email ?? 0,
    byIntentLevel: byLevel.rows,
    byIntentCategory: byCategory.rows,
    byIngestionCategory: byIngestion.rows,
  };
}

/* ── Dashboard metrics (all values computed from real crawler rows) ──────────── */

export interface DashboardMetrics {
  total_signals: number;
  high_intent_count: number;
  high_intent_signals: number;
  high_intent_wow: number;
  leads_captured: number;
  conversion_rate: number;
  avg_urgency: number;
  urgency_distribution: { bucket: string; count: number }[];
  ghl_sync_rate: number;
  ghl_synced: number;
  ghl_unsynced: number;
  signals_by_day: { date: string; count: number }[];
  signals_by_platform: { platform: string; count: number }[];
  leads_by_tool: { tool: string; count: number }[];
  leads_by_day: { date: string; count: number }[];
  top_pain_points: { point: string; count: number }[];
  daily: {
    today: { linkedin_signals: number; linkedin_high_intent: number; leads_captured: number; conversion_rate: number; avg_urgency: number };
    yesterday: { linkedin_signals: number; linkedin_high_intent: number; leads_captured: number; conversion_rate: number; avg_urgency: number };
  };
}

/** Well-formed zero metrics — returned when the crawler DB is unreachable. */
export function emptyDashboardMetrics(): DashboardMetrics {
  const emptyDay = { linkedin_signals: 0, linkedin_high_intent: 0, leads_captured: 0, conversion_rate: 0, avg_urgency: 0 };
  return {
    total_signals: 0, high_intent_count: 0, high_intent_signals: 0, high_intent_wow: 0,
    leads_captured: 0, conversion_rate: 0, avg_urgency: 0,
    urgency_distribution: [], ghl_sync_rate: 0, ghl_synced: 0, ghl_unsynced: 0,
    signals_by_day: [], signals_by_platform: [], leads_by_tool: [], leads_by_day: [], top_pain_points: [],
    daily: { today: { ...emptyDay }, yesterday: { ...emptyDay } },
  };
}

const HAS_EMAIL_SQL = "enriched_email IS NOT NULL AND enriched_email != '' AND enriched_email NOT LIKE '%@null%'";

export async function dashboardMetrics(sbu?: string): Promise<DashboardMetrics> {
  const pool = getSignalsPool();
  if (!pool) throw new Error('Signals Postgres not configured');

  // Per-user scope: every aggregate is filtered to the caller's SBU when set.
  const whereSbu = sbu ? 'WHERE sbu_id = $1' : '';
  const andSbu   = sbu ? ' AND sbu_id = $1' : '';
  const p: unknown[] = sbu ? [sbu] : [];

  const [totals, urgencyDist, byDay, byPlatform, byTool, painPoints, daily] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE intent_level = 'HIGH_INTENT')::int AS high_intent,
        COUNT(*) FILTER (WHERE ${HAS_EMAIL_SQL})::int AS with_email,
        COALESCE(ROUND(AVG(urgency_score) FILTER (WHERE urgency_score IS NOT NULL))::int, 0) AS avg_urgency,
        COUNT(*) FILTER (WHERE intent_level = 'HIGH_INTENT' AND created_at >= now() - interval '7 days')::int AS hi_this_week,
        COUNT(*) FILTER (WHERE intent_level = 'HIGH_INTENT' AND created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days')::int AS hi_prev_week
      FROM signals ${whereSbu}
    `, p),
    pool.query(`
      SELECT bucket, COUNT(*)::int AS count FROM (
        SELECT CASE
          WHEN urgency_score BETWEEN 0 AND 30 THEN '0-30'
          WHEN urgency_score BETWEEN 31 AND 60 THEN '31-60'
          WHEN urgency_score BETWEEN 61 AND 80 THEN '61-80'
          WHEN urgency_score BETWEEN 81 AND 100 THEN '81-100'
        END AS bucket
        FROM signals WHERE urgency_score IS NOT NULL${andSbu}
      ) b WHERE bucket IS NOT NULL
      GROUP BY bucket ORDER BY bucket
    `, p),
    pool.query(`
      SELECT to_char(created_at::date, 'YYYY-MM-DD') AS date,
             COUNT(*)::int AS count,
             COUNT(*) FILTER (WHERE ${HAS_EMAIL_SQL})::int AS leads
      FROM signals
      WHERE created_at >= now() - interval '8 days'${andSbu}
      GROUP BY created_at::date ORDER BY created_at::date
    `, p),
    pool.query(`SELECT source AS platform, COUNT(*)::int AS count FROM signals ${whereSbu} GROUP BY source ORDER BY count DESC`, p),
    pool.query(`
      SELECT COALESCE(ingestion_category, 'uncategorized') AS tool, COUNT(*)::int AS count
      FROM signals WHERE ${HAS_EMAIL_SQL}${andSbu}
      GROUP BY ingestion_category ORDER BY count DESC LIMIT 6
    `, p),
    pool.query(`
      SELECT pp AS point, COUNT(*)::int AS count
      FROM signals, jsonb_array_elements_text(pain_points) pp
      WHERE jsonb_typeof(pain_points) = 'array'${andSbu}
      GROUP BY pp ORDER BY count DESC LIMIT 8
    `, p),
    pool.query(`
      SELECT
        (created_at::date = current_date) AS is_today,
        COUNT(*)::int AS signals,
        COUNT(*) FILTER (WHERE intent_level = 'HIGH_INTENT')::int AS high_intent,
        COUNT(*) FILTER (WHERE ${HAS_EMAIL_SQL})::int AS leads,
        COALESCE(ROUND(AVG(urgency_score) FILTER (WHERE urgency_score IS NOT NULL))::int, 0) AS avg_urgency
      FROM signals
      WHERE created_at::date IN (current_date, current_date - 1)${andSbu}
      GROUP BY created_at::date = current_date
    `, p),
  ]);

  const t = totals.rows[0] ?? {};
  const total = t.total ?? 0;
  const withEmail = t.with_email ?? 0;
  const hiThis = t.hi_this_week ?? 0;
  const hiPrev = t.hi_prev_week ?? 0;
  const wow = hiPrev > 0 ? Math.round(((hiThis - hiPrev) / hiPrev) * 100) : 0;

  const dayRows = byDay.rows as { date: string; count: number; leads: number }[];
  const dayFmt = (r: { is_today: boolean; signals: number; high_intent: number; leads: number; avg_urgency: number }) => ({
    linkedin_signals: r.signals,
    linkedin_high_intent: r.high_intent,
    leads_captured: r.leads,
    conversion_rate: r.signals ? r.leads / r.signals : 0,
    avg_urgency: r.avg_urgency,
  });
  const emptyDay = { linkedin_signals: 0, linkedin_high_intent: 0, leads_captured: 0, conversion_rate: 0, avg_urgency: 0 };
  const todayRow = (daily.rows as any[]).find((r) => r.is_today === true);
  const yestRow = (daily.rows as any[]).find((r) => r.is_today === false);

  return {
    total_signals: total,
    high_intent_count: t.high_intent ?? 0,
    high_intent_signals: t.high_intent ?? 0,
    high_intent_wow: wow,
    leads_captured: withEmail,
    conversion_rate: total ? withEmail / total : 0,
    avg_urgency: t.avg_urgency ?? 0,
    urgency_distribution: urgencyDist.rows,
    ghl_sync_rate: 0,
    ghl_synced: 0,
    ghl_unsynced: withEmail,
    signals_by_day: dayRows.map((d) => ({ date: d.date, count: d.count })),
    leads_by_day: dayRows.map((d) => ({ date: d.date, count: d.leads })),
    signals_by_platform: byPlatform.rows,
    leads_by_tool: byTool.rows,
    top_pain_points: painPoints.rows,
    daily: {
      today: todayRow ? dayFmt(todayRow) : emptyDay,
      yesterday: yestRow ? dayFmt(yestRow) : emptyDay,
    },
  };
}
