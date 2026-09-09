#!/usr/bin/env bash
# Start all Mini X services for local development (Phase 2-3)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Mini X Dev Stack (Phase 4 — RabbitMQ) ==="
echo "Infrastructure: PostgreSQL, Redis, RabbitMQ"
echo ""

# Ensure infrastructure is up
# docker compose up -d

echo ""
echo "Starting services..."
echo "  Write pool     → :3001, :3002 (TypeScript)"
echo "  Read pool      → :4001, :4002 (Python)"
echo "  Worker         → RabbitMQ Background Consumer"
echo "  Frontend       → http://localhost:5173 (run separately: cd frontend && npm run dev)"
echo ""

# Write service instances
(cd backend && INSTANCE_ID=write-1 PORT=3001 npm run dev) &
(cd backend && INSTANCE_ID=write-2 PORT=3002 npm run dev) &

# Read service instances (Python)
(cd read-service && INSTANCE_ID=read-1 PORT=4001 python3 -m uvicorn app.main:app --host 0.0.0.0 --port 4001 --reload) &
(cd read-service && INSTANCE_ID=read-2 PORT=4002 python3 -m uvicorn app.main:app --host 0.0.0.0 --port 4002 --reload) &

# Background worker (RabbitMQ consumer)
(cd backend && npm run worker) &

trap 'kill 0' EXIT
wait
