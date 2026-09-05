#!/bin/sh
# Runs migrations (and the idempotent seed) before handing off to the server, so a
# deploy never needs a manual DB step. Both are opt-out via RUN_MIGRATIONS/RUN_SEED.
set -e

cd /app/backend

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "🗃️  Applying Prisma migrations..."
    pnpm exec prisma migrate deploy
fi

if [ "${RUN_SEED:-true}" = "true" ]; then
    echo "🌱 Seeding database (idempotent — upserts only)..."
    pnpm exec tsx prisma/seed.ts
fi

echo "🚀 Starting backend..."
exec "$@"
