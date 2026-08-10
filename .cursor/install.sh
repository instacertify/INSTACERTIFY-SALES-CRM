#!/usr/bin/env bash
# Idempotent Cloud Agent setup for the Instacertify Sales CRM.
# Safe to run repeatedly: it refreshes dependencies, ensures a local .env,
# syncs the SQLite schema, and seeds baseline data only when the DB is empty.
set -euo pipefail

# Always operate from the repository root (parent of this .cursor directory).
cd "$(dirname "$0")/.."

# Install dependencies from the lockfile. `postinstall` runs `prisma generate`.
npm ci

# Provide a local .env with non-secret development defaults when missing.
# (.env is gitignored; production hosts should set real secrets instead.)
if [ ! -f .env ]; then
  cp .env.example .env
fi

# Export the dev env vars so the Prisma client/seed can resolve DATABASE_URL
# (`tsx prisma/seed.ts` does not auto-load .env the way the Prisma CLI does).
set -a
# shellcheck disable=SC1091
. ./.env
set +a

# Create/refresh the SQLite schema. `prisma db push` is idempotent.
npx prisma db push --skip-generate

# Seed baseline data (users, lead sources, services, sample template/testing
# items) only when the database has no users yet, so re-running install does
# not create duplicate bank details or templates.
USERS="$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.count().then(c=>console.log(c)).catch(()=>console.log(0)).finally(()=>p.\$disconnect())")"
if [ "$USERS" = "0" ]; then
  echo "Seeding baseline data..."
  npm run db:seed
else
  echo "Database already has $USERS user(s); skipping seed."
fi

echo "Install complete."
