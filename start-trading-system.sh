#!/bin/bash

# Simple SignalCartel Trading System Startup Script
# Includes Kraken Proxy Server + Production Trading Engine

set -e

echo "🚀 SignalCartel Trading System Startup"
echo "====================================="

# Set environment variables
export DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public"
export ENABLE_GPU_STRATEGIES=true
export NTFY_TOPIC="signal-cartel"
export NODE_OPTIONS="--max-old-space-size=4096"
export TRADING_MODE="LIVE"

# Start Kraken proxy server first
echo "🔧 Starting Kraken Proxy Server..."
npx tsx kraken-proxy-server.ts &
PROXY_PID=$!
echo "✅ Kraken Proxy Server started (PID: $PROXY_PID)"

# Wait for proxy to initialize
sleep 3

# Start trading engine
echo "🚀 Starting Trading Engine..."
if [ -n "$1" ] && [ "$1" = "tensor" ]; then
    TENSOR_ROLLOUT=10 npx tsx production-trading-multi-pair.ts
else
    npx tsx production-trading-multi-pair.ts
fi