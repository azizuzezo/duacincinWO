#!/usr/bin/env bash
# Full-stack regression run, isolated from your real data:
#   throwaway Postgres (Docker) + the real Go API + the built Next.js app,
#   then e2e/api.mjs (API journey) and e2e/ui.mjs (browser checks on real data).
# The API binary runs from a temp directory with a clean environment, so the
# project's .env (real Resend/Supabase/Midtrans keys) is never read.
# See e2e/README.md for requirements and options.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_NAME="${E2E_PG_CONTAINER:-dc-e2e-pg}"
PG_PORT="${E2E_PG_PORT:-55432}"
API_PORT="${E2E_API_PORT:-8080}"
WORK="$(mktemp -d)"
PIDS=()

cleanup() {
  for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null || true; done
  docker rm -f "$PG_NAME" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

need() { command -v "$1" >/dev/null 2>&1 || { echo "Perlu '$1' di PATH." >&2; exit 2; }; }
need docker; need go; need node; need npm; need curl

if [ -z "${CHROMIUM:-}" ]; then
  for c in chromium-browser chromium google-chrome google-chrome-stable; do
    if command -v "$c" >/dev/null 2>&1; then CHROMIUM="$(command -v "$c")"; break; fi
  done
fi
[ -n "${CHROMIUM:-}" ] || { echo "Chromium tidak ditemukan. Set CHROMIUM=/path/ke/chromium." >&2; exit 2; }
export CHROMIUM E2E_PG_CONTAINER="$PG_NAME" E2E_API_PORT="$API_PORT"

# CORS on the API only allows http://localhost:3000. Port 3000 is fixed; the API port is configurable.
for port in 3000 "$API_PORT" "$PG_PORT"; do
  if ss -ltn 2>/dev/null | grep -q ":${port} "; then echo "Port $port sudah dipakai. Hentikan prosesnya dulu." >&2; exit 2; fi
done

wait_for() { # url, label
  for _ in $(seq 1 60); do curl -fsS -o /dev/null "$1" 2>/dev/null && return 0; sleep 0.5; done
  echo "Timeout menunggu $2." >&2; return 1
}

echo "== Postgres sementara"
docker rm -f "$PG_NAME" >/dev/null 2>&1 || true
docker run -d --name "$PG_NAME" -e POSTGRES_PASSWORD=test -e POSTGRES_DB=duacincin \
  -p "127.0.0.1:${PG_PORT}:5432" postgres:16-alpine >/dev/null
for _ in $(seq 1 60); do docker exec "$PG_NAME" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 0.5; done

echo "== Build API (set E2E_GO_BUILD_FLAGS untuk flag tambahan, mis. -modfile=...)"
# shellcheck disable=SC2086
(cd "$ROOT/server" && go build ${E2E_GO_BUILD_FLAGS:-} -o "$WORK/api" ./cmd/api)

echo "== Jalankan API (migrasi berjalan otomatis)"
mkdir -p "$WORK/run/work"
(cd "$WORK/run/work" && exec env -i PATH="$PATH" HOME="$HOME" PORT="$API_PORT" APP_ENV=development \
  DATABASE_POOLER="postgres://postgres:test@127.0.0.1:${PG_PORT}/duacincin?sslmode=disable" \
  JWT_SECRET="e2e-only-secret-not-for-real-use" "$WORK/api" >"$WORK/api.log" 2>&1) &
PIDS+=($!)
wait_for "http://localhost:${API_PORT}/healthz" "API" || { tail -20 "$WORK/api.log"; exit 1; }

echo "== Web"
# NEXT_PUBLIC_API_URL is inlined at build time, so the bundle must be built for the API port used now.
BUILT_FOR="$(cat "$ROOT/web/.next/.e2e-api-port" 2>/dev/null || true)"
if [ ! -d "$ROOT/web/.next" ] || [ "${E2E_REBUILD:-0}" = "1" ] || [ "$BUILT_FOR" != "$API_PORT" ]; then
  (cd "$ROOT/web" && NEXT_PUBLIC_API_URL="http://localhost:${API_PORT}" npm run build)
  echo "$API_PORT" > "$ROOT/web/.next/.e2e-api-port"
fi
# A previous run may have cached API responses (revalidate) for the server-rendered SEO pages.
rm -rf "$ROOT/web/.next/cache/fetch-cache"
(cd "$ROOT/web" && exec node node_modules/next/dist/bin/next start -p 3000 >"$WORK/web.log" 2>&1) &
PIDS+=($!)
wait_for http://localhost:3000/ "web" || { tail -20 "$WORK/web.log"; exit 1; }

echo; echo "== API journey"
api_status=0; node "$ROOT/e2e/api.mjs" || api_status=$?
echo; echo "== UI checks"
ui_status=0; node "$ROOT/e2e/ui.mjs" || ui_status=$?

contrast_status=0
if [ "${E2E_SKIP_CONTRAST:-0}" != "1" ]; then
  echo; echo "== Kontras WCAG"
  node "$ROOT/e2e/contrast.mjs" || contrast_status=$?
fi

if [ "${E2E_HOLD:-0}" = "1" ]; then
  echo; echo "E2E_HOLD=1: stack tetap hidup (web :3000, API :${API_PORT}). Hentikan dengan Ctrl+C atau kill proses ini."
  wait
fi

echo
if [ "$api_status" -eq 0 ] && [ "$ui_status" -eq 0 ] && [ "$contrast_status" -eq 0 ]; then echo "SEMUA LULUS"; exit 0; fi
echo "ADA YANG GAGAL (api=$api_status ui=$ui_status kontras=$contrast_status). Ekor log API:"; tail -15 "$WORK/api.log"
exit 1
