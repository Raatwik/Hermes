#!/usr/bin/env bash
# Start the full DIH stack: MQTT broker, sim publisher, ML subscriber, FastAPI backend, frontend dev server.
# Usage: ./run/start.sh
# Stop:  Ctrl+C (sends SIGINT to all child processes)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

cleanup() {
    echo ""
    echo "[run] Shutting down all services..."
    kill 0 2>/dev/null
    wait 2>/dev/null
    echo "[run] All services stopped."
}
trap cleanup EXIT INT TERM

echo "============================================"
echo "  DIH — Digital Twin Full Stack Launcher"
echo "============================================"
echo ""
echo "[run] Root: $ROOT_DIR"
echo ""

# 1. MQTT Broker
echo "[run] Starting MQTT broker..."
python -m integration.broker &
sleep 2

# 2. Sim Publisher (plays back telemetry at 10x speed)
echo "[run] Starting simulation publisher..."
python integration/sim_publisher.py --speed 10 &
sleep 1

# 3. ML Subscriber
echo "[run] Starting ML subscriber..."
python -m integration.ml_subscriber &
sleep 1

# 4. FastAPI Backend
echo "[run] Starting FastAPI backend on :8000..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
sleep 1

# 5. Frontend Dev Server
echo "[run] Starting frontend dev server..."
cd frontend && npm run dev &
cd "$ROOT_DIR"

echo ""
echo "============================================"
echo "  All services running. Press Ctrl+C to stop."
echo "============================================"
echo ""

wait
