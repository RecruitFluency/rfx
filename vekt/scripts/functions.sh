#!/usr/bin/env bash
# Serve the VEKT functions locally under plain Deno (see dev-functions.ts),
# against the local Supabase stack, with model and GHL calls mocked.
set -euo pipefail
cd "$(dirname "$0")/.."
eval "$(npx supabase status -o env 2>/dev/null | grep -E '^(SERVICE_ROLE_KEY|ANON_KEY)=')"
export SUPABASE_URL="http://127.0.0.1:${DEV_FUNCTIONS_PORT:-54331}"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export SUPABASE_ANON_KEY="$ANON_KEY"
export VEKT_APP_SECRET="${VEKT_APP_SECRET:-dev-app-secret}"
export VEKT_WEBHOOK_SECRET="${VEKT_WEBHOOK_SECRET:-dev-webhook-secret}"
export VEKT_GHL_WEBHOOK_TOKEN="${VEKT_GHL_WEBHOOK_TOKEN:-dev-ghl-token}"
export VEKT_FIT_MOCK="${VEKT_FIT_MOCK:-1}"
export VEKT_GHL_MOCK="${VEKT_GHL_MOCK:-1}"
exec "${DENO:-deno}" run --allow-net --allow-env --allow-read scripts/dev-functions.ts
