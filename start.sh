#!/usr/bin/env bash
# start.sh — starts all CivicPress services (backend + public + admin)
# Usage: ./start.sh [--seed]   add --seed to re-run the DB seed before starting

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

# ── helpers ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}▸${NC} $*"; }
ok()    { echo -e "${GREEN}✔${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
die()   { echo -e "${RED}✖ $*${NC}" >&2; exit 1; }

wait_port() {          # wait_port <port> <label> [timeout_sec]
  local port=$1 label=$2 timeout=${3:-20}
  local elapsed=0
  while ! lsof -ti:"$port" >/dev/null 2>&1; do
    sleep 1; elapsed=$((elapsed+1))
    [[ $elapsed -ge $timeout ]] && die "$label did not start within ${timeout}s (port $port)"
  done
  ok "$label is up on :$port"
}

wait_health() {        # wait_health <url> <label> [timeout_sec]
  local url=$1 label=$2 timeout=${3:-30}
  local elapsed=0
  while ! curl -sf "$url" >/dev/null 2>&1; do
    sleep 1; elapsed=$((elapsed+1))
    [[ $elapsed -ge $timeout ]] && die "$label health check failed after ${timeout}s ($url)"
  done
  ok "$label is healthy"
}

cleanup() {
  echo ""
  info "Shutting down…"
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "${PUBLIC_PID:-}" ]]  && kill "$PUBLIC_PID"  2>/dev/null || true
  [[ -n "${ADMIN_PID:-}" ]]   && kill "$ADMIN_PID"   2>/dev/null || true
  ok "All processes stopped."
}
trap cleanup EXIT INT TERM

# ── parse args ─────────────────────────────────────────────────────────────────
RUN_SEED=false
for arg in "$@"; do [[ "$arg" == "--seed" ]] && RUN_SEED=true; done

# ── preflight ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${RED}  ██████╗██╗██╗   ██╗██╗ ██████╗${NC}"
echo -e "${RED} ██╔════╝██║██║   ██║██║██╔════╝${NC}"
echo -e "${RED} ██║     ██║██║   ██║██║██║     ${NC}"
echo -e "${RED} ██║     ██║╚██╗ ██╔╝██║██║     ${NC}"
echo -e "${RED} ╚██████╗██║ ╚████╔╝ ██║╚██████╗${NC}"
echo -e "${RED}  ╚═════╝╚═╝  ╚═══╝  ╚═╝ ╚═════╝${NC}"
echo -e "           ${CYAN}CivicPress Dev Stack${NC}"
echo ""

# Ensure Docker daemon is running (required for Postgres container)
ensure_docker() {
  command -v docker >/dev/null 2>&1 || die "Docker is not installed. Install Docker Desktop and retry."
  if docker info >/dev/null 2>&1; then
    ok "Docker is running"
    return
  fi
  warn "Docker daemon not running"
  case "$(uname -s)" in
    Darwin)
      info "Starting Docker Desktop…"
      open -a Docker 2>/dev/null || die "Failed to launch Docker Desktop. Start it manually and retry."
      ;;
    Linux)
      info "Attempting to start Docker via systemctl…"
      sudo systemctl start docker 2>/dev/null || true
      ;;
    *)
      die "Unsupported OS for auto-starting Docker. Start it manually and retry."
      ;;
  esac
  local elapsed=0 timeout=60
  while ! docker info >/dev/null 2>&1; do
    sleep 2; elapsed=$((elapsed+2))
    [[ $elapsed -ge $timeout ]] && die "Docker did not start within ${timeout}s"
  done
  ok "Docker is running"
}

# Pick the right compose command (v2 plugin vs legacy docker-compose)
compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    die "Neither 'docker compose' nor 'docker-compose' is available."
  fi
}

ensure_docker

# Check Postgres — bring it up via docker compose if not responding
if ! pg_isready -h localhost -p 5432 -q 2>/dev/null; then
  warn "PostgreSQL not responding on :5432"
  info "Starting Postgres via docker compose…"
  (cd "$ROOT" && compose up -d postgres) || die "Failed to start Postgres container"
  local_elapsed=0
  while ! pg_isready -h localhost -p 5432 -q 2>/dev/null; do
    sleep 1; local_elapsed=$((local_elapsed+1))
    [[ $local_elapsed -ge 30 ]] && die "PostgreSQL did not become ready within 30s"
  done
fi
ok "PostgreSQL is up"

# Check for pending migrations
cd "$ROOT/apps/backend"
PENDING=$(node_modules/.bin/prisma migrate status 2>&1 | grep -c "Following migration" || true)
if [[ "$PENDING" -gt 0 ]]; then
  warn "Pending DB migrations detected — running them now…"
  node_modules/.bin/prisma migrate deploy
fi

# Optional seed
if [[ "$RUN_SEED" == "true" ]]; then
  info "Running seed (this may take a minute)…"
  cd "$ROOT"
  pnpm seed
fi

# Check that at least some data exists
POST_COUNT=$(node_modules/.bin/ts-node --swc -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.post.count().then(n=>{console.log(n);p.\$disconnect();});
" 2>/dev/null || echo "0")
if [[ "$POST_COUNT" -eq 0 ]]; then
  warn "Database has no posts. Run with --seed to populate:"
  echo "    ./start.sh --seed"
fi

cd "$ROOT"

# ── kill any stale processes ───────────────────────────────────────────────────
for port in 3000 4200 4300; do
  PID=$(lsof -ti:"$port" 2>/dev/null || true)
  [[ -n "$PID" ]] && { warn "Port $port in use (PID $PID) — killing…"; kill "$PID" 2>/dev/null || true; sleep 1; }
done

# ── start services ─────────────────────────────────────────────────────────────
info "Starting backend  → http://localhost:3000"
(cd "$ROOT/apps/backend" && node_modules/.bin/ts-node --swc src/main.ts) \
  > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

wait_port 3000 "Backend"
wait_health "http://localhost:3000/v1/health" "Backend API"

info "Starting public   → http://localhost:4200"
(cd "$ROOT/apps/public" && node_modules/.bin/vite) \
  > "$LOG_DIR/public.log" 2>&1 &
PUBLIC_PID=$!

info "Starting admin    → http://localhost:4300"
(cd "$ROOT/apps/admin" && node_modules/.bin/vite) \
  > "$LOG_DIR/admin.log" 2>&1 &
ADMIN_PID=$!

wait_port 4200 "Public frontend"
wait_port 4300 "Admin frontend"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}All services running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}Public site${NC}   →  http://localhost:4200"
echo -e "  ${CYAN}Admin panel${NC}   →  http://localhost:4300"
echo -e "  ${CYAN}Backend API${NC}   →  http://localhost:3000"
echo ""
echo -e "  Logs in ${YELLOW}.logs/${NC}   (backend.log, public.log, admin.log)"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services."
echo ""

# ── tail all logs ─────────────────────────────────────────────────────────────
tail -qF "$LOG_DIR/backend.log" "$LOG_DIR/public.log" "$LOG_DIR/admin.log" &
TAIL_PID=$!

# Wait for any child to exit (indicates a crash)
wait "$BACKEND_PID" "$PUBLIC_PID" "$ADMIN_PID" 2>/dev/null || true
kill "$TAIL_PID" 2>/dev/null || true
