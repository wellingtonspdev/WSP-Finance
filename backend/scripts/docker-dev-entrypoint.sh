#!/bin/sh
set -eu

echo "[docker-dev] Generating Prisma client..."
pnpm exec prisma generate

echo "[docker-dev] Applying Prisma migrations with DIRECT_URL..."
pnpm exec prisma migrate deploy

echo "[docker-dev] Running demo seed with DIRECT_URL..."
pnpm exec prisma db seed

echo "[docker-dev] Preparing restricted runtime database role..."
pnpm exec ts-node scripts/docker-prepare-runtime-role.ts

echo "[docker-dev] Starting backend on port ${PORT:-3333}..."
exec pnpm run dev
