#!/usr/bin/env bash
# Deploy / update Instacertify CRM on Hostinger VPS with PM2 — NO Docker.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.example and set production values."
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

echo "==> Install dependencies"
npm install --omit=dev=false

echo "==> Prisma generate + push + seed (safe upserts)"
export DATABASE_URL="${DATABASE_URL:?DATABASE_URL required}"
npm run db:setup

echo "==> Build API + Web"
# Bake public API URL into Next build
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://${DOMAIN:-crm.instacertify.in}/api/v1}"
# Ensure API can read root .env when started via PM2
cp -f .env apps/api/.env
cp -f .env packages/database/.env
npm run build

echo "==> Restart PM2 apps"
if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload ecosystem.config.cjs --update-env
  pm2 save
  pm2 status
else
  echo "PM2 not found. Install with: sudo npm install -g pm2"
  echo "Then: pm2 start ecosystem.config.cjs && pm2 save && pm2 startup"
  exit 1
fi

echo "==> Deploy complete"
echo "API health: curl -s http://127.0.0.1:4000/api/v1/admin/health"
echo "Web local:  curl -sI http://127.0.0.1:3000 | head -5"
