#!/usr/bin/env bash
# PM2 startup script for CivicPress production (hardcoded domain)
# Public  -> https://civicpress.ro/
# Admin   -> https://civicpress.ro/admin
# API     -> https://civicpress.ro/v1

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/apps/backend"
DOMAIN="civicpress.ro"
PUBLIC_URL="https://${DOMAIN}"
ADMIN_URL="${PUBLIC_URL}/admin"

echo "Starting CivicPress with PM2"
echo "Domain: ${PUBLIC_URL}"
echo "==========================================="

for cmd in pm2 node; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ Missing dependency: $cmd"
    exit 1
  fi
done

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found in PATH. Trying corepack..."
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
    corepack prepare pnpm@9 --activate >/dev/null 2>&1 || true
  fi
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "❌ Missing dependency: pnpm"
  echo "Install with one of:"
  echo "  - corepack enable && corepack prepare pnpm@9 --activate"
  echo "  - npm i -g pnpm"
  exit 1
fi

cd "$ROOT_DIR"

echo "Installing dependencies..."
pnpm install --frozen-lockfile || pnpm install

echo "Building workspace..."
export VITE_API_BASE_URL=""
echo "Generating Prisma client..."
pnpm --filter @civicpress/backend prisma:generate
echo "Applying Prisma migrations..."
pnpm --filter @civicpress/backend exec prisma migrate deploy
pnpm --filter @civicpress/shared build
pnpm --filter @civicpress/backend build
pnpm --filter @civicpress/public build
pnpm --filter @civicpress/admin build -- --base /admin/

echo "Restarting PM2 services..."
pm2 stop civic-backend >/dev/null 2>&1 || true
pm2 delete civic-backend >/dev/null 2>&1 || true
pm2 stop civic-public >/dev/null 2>&1 || true
pm2 delete civic-public >/dev/null 2>&1 || true
pm2 stop civic-admin >/dev/null 2>&1 || true
pm2 delete civic-admin >/dev/null 2>&1 || true

echo "Starting backend on 127.0.0.1:3000..."
(
  export PUBLIC_URL="$PUBLIC_URL"
  export ADMIN_URL="$ADMIN_URL"
  export MEDIA_BASE_URL="$PUBLIC_URL"
  export PORT=3000
  pm2 start "node dist/apps/backend/src/main.js" --name civic-backend --cwd "$BACKEND_DIR"
)

echo "Starting public SSR on 127.0.0.1:4200..."
(
  export PORT=4200
  export HOST=127.0.0.1
  export NITRO_PORT=4200
  export NITRO_HOST=127.0.0.1
  # Ensure Analog/Nitro serves page-data from /_analog/* (not /api/_analog/*).
  export NITRO_APP_BASE_URL="/"
  pm2 start "node apps/public/dist/analog/server/index.mjs" --name civic-public --cwd "$ROOT_DIR"
)

echo "Starting admin preview on 127.0.0.1:4300..."
pm2 start "pnpm --filter @civicpress/admin preview -- --host 127.0.0.1 --port 4300 --strictPort" \
  --name civic-admin \
  --cwd "$ROOT_DIR"

pm2 save >/dev/null 2>&1 || true

echo ""
echo "Services managed by PM2:"
echo "  - civic-backend  (http://127.0.0.1:3000)"
echo "  - civic-public   (http://127.0.0.1:4200)"
echo "  - civic-admin    (http://127.0.0.1:4300)"
echo ""
echo "Expected public routes (via nginx):"
echo "  - ${PUBLIC_URL}/       -> civic-public"
echo "  - ${ADMIN_URL}         -> civic-admin"
echo "  - ${PUBLIC_URL}/v1/*   -> civic-backend"
echo ""
echo "Done."
