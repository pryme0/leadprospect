import fs from 'fs';
import Database from 'better-sqlite3';
import { appPool } from '@/lib/app-pg';
import { sqliteFile } from '@/lib/sqlite-path';

/**
 * Best-effort one-time copy of a SQLite table into the Postgres table of the
 * same name. Idempotent (ON CONFLICT DO NOTHING by default) so it's safe to run
 * on every boot — once rows are in Postgres they're never touched again. Skips
 * silently when the SQLite file or table is absent (fresh envs, or already
 * migrated). Used to carry existing per-env data into the shared Postgres as
 * each store moves over.
 */
export async function migrateSqliteTable(opts: {
  /** SQLite filename, e.g. 'comms.db' | 'app.db' | 'leads.db'. */
  file: string;
  /** Source & destination table name (same in both). */
  table: string;
  /** Columns to copy — must exist in both tables. */
  columns: string[];
  /** Conflict clause; defaults to skipping duplicates. */
  conflict?: string;
  /** Optional per-row value mapper (defaults to `columns` order). */
  transform?: (row: Record<string, unknown>) => unknown[];
}): Promise<number> {
  const path = sqliteFile(opts.file);
  if (!fs.existsSync(path)) return 0;
  let sq: Database.Database;
  try {
    sq = new Database(path, { readonly: true, fileMustExist: true });
  } catch {
    return 0;
  }
  try {
    const has = sq
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
      .get(opts.table);
    if (!has) return 0;
    const rows = sq.prepare(`SELECT ${opts.columns.join(', ')} FROM ${opts.table}`).all() as Record<string, unknown>[];
    if (rows.length === 0) return 0;
    const p = appPool();
    const placeholders = opts.columns.map((_, i) => `$${i + 1}`).join(', ');
    const conflict = opts.conflict ?? 'ON CONFLICT DO NOTHING';
    let copied = 0;
    for (const r of rows) {
      const vals = opts.transform ? opts.transform(r) : opts.columns.map((c) => r[c]);
      const res = await p.query(
        `INSERT INTO ${opts.table} (${opts.columns.join(', ')}) VALUES (${placeholders}) ${conflict}`,
        vals,
      );
      copied += res.rowCount ?? 0;
    }
    if (copied > 0) console.log(`[pg-migrate] ${opts.file}:${opts.table} → copied ${copied} row(s)`);
    return copied;
  } catch (err) {
    console.warn(`[pg-migrate] ${opts.file}:${opts.table} skipped:`, err instanceof Error ? err.message : err);
    return 0;
  } finally {
    try { sq.close(); } catch { /* ignore */ }
  }
}
