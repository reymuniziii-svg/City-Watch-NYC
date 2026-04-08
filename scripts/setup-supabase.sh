#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────
#  City Watch NYC — Supabase Setup & Deploy
#  Applies migrations and deploys edge functions.
#
#  Prerequisites:
#    • Supabase CLI installed (npx supabase or brew install supabase/tap/supabase)
#    • .env file with SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN,
#      SUPABASE_SERVICE_ROLE_KEY set
#
#  Usage:
#    bash scripts/setup-supabase.sh            # run all steps
#    bash scripts/setup-supabase.sh migrate     # run migrations only
#    bash scripts/setup-supabase.sh deploy      # deploy functions only
# ─────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env if present
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
elif [ -f "$ROOT_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.local"
  set +a
fi

# ── Validate required variables ──────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

missing=0
for var in SUPABASE_PROJECT_REF SUPABASE_ACCESS_TOKEN; do
  if [ -z "${!var:-}" ]; then
    echo -e "${RED}✗ Missing ${BOLD}${var}${RESET}"
    missing=1
  fi
done

if [ "$missing" -eq 1 ]; then
  echo ""
  echo "Set these in your .env file. See .env.example for details."
  exit 1
fi

export SUPABASE_ACCESS_TOKEN

SUPABASE="npx supabase"
STEP="${1:-all}"

# ── Run migrations ───────────────────────────────────
run_migrate() {
  echo -e "\n${GREEN}${BOLD}▶ Pushing database migrations...${RESET}"
  $SUPABASE db push --project-ref "$SUPABASE_PROJECT_REF"
  echo -e "${GREEN}✓ Migrations applied.${RESET}"
}

# ── Deploy edge functions ────────────────────────────
run_deploy() {
  echo -e "\n${GREEN}${BOLD}▶ Deploying edge functions...${RESET}"

  FUNCTIONS_DIR="$ROOT_DIR/supabase/functions"
  if [ ! -d "$FUNCTIONS_DIR" ]; then
    echo "No functions directory found at $FUNCTIONS_DIR"
    exit 1
  fi

  for func_dir in "$FUNCTIONS_DIR"/*/; do
    func_name="$(basename "$func_dir")"
    echo -e "  Deploying ${BOLD}${func_name}${RESET}..."
    $SUPABASE functions deploy "$func_name" --project-ref "$SUPABASE_PROJECT_REF"
  done

  echo -e "${GREEN}✓ All edge functions deployed.${RESET}"
}

# ── Set function secrets ─────────────────────────────
run_secrets() {
  echo -e "\n${GREEN}${BOLD}▶ Setting edge function secrets...${RESET}"

  # Collect secrets that are set in the environment
  secrets=()
  for var in SUPABASE_SERVICE_ROLE_KEY RESEND_API_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET APP_URL; do
    if [ -n "${!var:-}" ]; then
      secrets+=("${var}=${!var}")
    fi
  done

  if [ ${#secrets[@]} -gt 0 ]; then
    $SUPABASE secrets set "${secrets[@]}" --project-ref "$SUPABASE_PROJECT_REF"
    echo -e "${GREEN}✓ Secrets configured.${RESET}"
  else
    echo "  No secrets found in environment to set."
  fi
}

# ── Main ─────────────────────────────────────────────
case "$STEP" in
  migrate)  run_migrate ;;
  deploy)   run_deploy ;;
  secrets)  run_secrets ;;
  all)
    run_migrate
    run_deploy
    run_secrets
    echo -e "\n${GREEN}${BOLD}✓ Supabase setup complete!${RESET}\n"
    ;;
  *)
    echo "Usage: $0 {all|migrate|deploy|secrets}"
    exit 1
    ;;
esac
