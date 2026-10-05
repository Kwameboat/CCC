#!/usr/bin/env bash
# Set CCC production env vars on Vercel.
# Usage:
#   export VERCEL_TOKEN=xxxxx   # from https://vercel.com/account/tokens
#   ./scripts/set-vercel-env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "Missing VERCEL_TOKEN. Create one at https://vercel.com/account/tokens"
  exit 1
fi

URL="${VITE_SUPABASE_URL:-https://fsfpegyvqwroeunehfml.supabase.co}"
KEY="${VITE_SUPABASE_ANON_KEY:-}"

if [[ -z "$KEY" && -f .env.local ]]; then
  # shellcheck disable=SC1091
  set -a
  source .env.local
  set +a
  URL="${VITE_SUPABASE_URL}"
  KEY="${VITE_SUPABASE_ANON_KEY}"
fi

if [[ -z "$KEY" ]]; then
  echo "Missing VITE_SUPABASE_ANON_KEY (set in env or .env.local)"
  exit 1
fi

npx --yes vercel link --yes --token "$VERCEL_TOKEN" || true

add_env() {
  local name="$1"
  local value="$2"
  local env="$3"
  printf '%s' "$value" | npx --yes vercel env add "$name" "$env" --token "$VERCEL_TOKEN" --force 2>/dev/null \
    || printf '%s' "$value" | npx --yes vercel env add "$name" "$env" --token "$VERCEL_TOKEN"
}

for ENV_NAME in production preview development; do
  echo "Setting VITE_SUPABASE_URL ($ENV_NAME)..."
  add_env "VITE_SUPABASE_URL" "$URL" "$ENV_NAME" || true
  echo "Setting VITE_SUPABASE_ANON_KEY ($ENV_NAME)..."
  add_env "VITE_SUPABASE_ANON_KEY" "$KEY" "$ENV_NAME" || true
done

echo "Ensuring demo login is not enabled..."
printf 'false' | npx --yes vercel env add VITE_ENABLE_DEMO_LOGIN production --token "$VERCEL_TOKEN" --force 2>/dev/null || true

echo "Done. Redeploy production so Vite rebuilds with the new env:"
echo "  npx vercel --prod --token \"\$VERCEL_TOKEN\""
