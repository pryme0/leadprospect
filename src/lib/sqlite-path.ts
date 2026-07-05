import fs from 'fs';
import path from 'path';

/**
 * Resolves the on-disk location for the app's SQLite databases (app.db,
 * comms.db, leads.db).
 *
 * In production the container's working directory is typically NOT writable by
 * the app user (the Next standalone image runs as a non-root `nextjs` user while
 * /app is root-owned) — creating a DB file there fails with SQLITE_CANTOPEN. It
 * is also ephemeral, so data would be lost on every redeploy.
 *
 * Set DATA_DIR to a writable, PERSISTENT directory (e.g. a mounted volume like
 * /data) in production. Defaults to the current working directory for local dev.
 * The directory is created if missing.
 */
export function sqliteFile(name: string): string {
  const dir = process.env.DATA_DIR?.trim() || process.cwd();
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* best effort — surfaced by the SqliteError if the dir is truly unusable */
  }
  return path.join(dir, name);
}
