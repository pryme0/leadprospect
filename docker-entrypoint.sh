#!/bin/sh
# Runtime entrypoint. Runs as root so it can make the (possibly freshly-mounted,
# root-owned) persistent volume writable by the non-root app user, then drops to
# that user to run the app. Without this, a Railway volume mounted at /data comes
# up root-owned and the nextjs user can't create app.db (SQLITE_CANTOPEN) — which
# would silently wipe users/mentions/leads on every restart.
set -e

DATA_DIR="${DATA_DIR:-/data}"
mkdir -p "$DATA_DIR"
chown -R nextjs:nodejs "$DATA_DIR" 2>/dev/null || true

exec su-exec nextjs:nodejs "$@"
