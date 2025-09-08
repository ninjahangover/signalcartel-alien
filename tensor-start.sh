#!/bin/bash

# Tensor AI Fusion V2.0 Start Script
# SignalCartel QUANTUM FORGE™

echo "🚀 Starting Tensor AI Fusion V2.0..."
echo "================================================"

# Step 1: Check if proxy server is running
PROXY_PID=$(pgrep -f "kraken-proxy-server.ts")
if [ -z "$PROXY_PID" ]; then
    echo "📡 Starting Kraken Proxy Server..."
    nohup npx tsx kraken-proxy-server.ts > /tmp/signalcartel-logs/proxy-server.log 2>&1 &
    sleep 3
    echo "✅ Proxy server started (PID: $!)"
else
    echo "✅ Proxy server already running (PID: $PROXY_PID)"
fi

# Step 2: Launch Tensor AI Fusion V2.0
echo "🧮 Launching Tensor AI Fusion V2.0..."
echo "Configuration:"
echo "  - TENSOR_MODE: true"
echo "  - MIN_PROFIT_TARGET: 10.00"
echo "  - BASE_POSITION_SIZE: 100"
echo "  - TRADING_MODE: LIVE"
echo "================================================"

export TENSOR_MODE=true
export MIN_PROFIT_TARGET=10.00
export BASE_POSITION_SIZE=100
export DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public"
export ENABLE_GPU_STRATEGIES=true
export NTFY_TOPIC="signal-cartel"
export NODE_OPTIONS="--max-old-space-size=4096"
export TRADING_MODE="LIVE"

nohup npx tsx production-trading-multi-pair.ts > /tmp/signalcartel-logs/production-trading.log 2>&1 &
TRADING_PID=$!

echo "✅ Tensor AI Fusion V2.0 started (PID: $TRADING_PID)"
echo ""
echo "📊 Monitor logs with:"
echo "  tail -f /tmp/signalcartel-logs/production-trading.log"
echo ""
echo "🛑 Stop system with:"
echo "  ./tensor-stop.sh"
echo ""
echo "🎯 System Status:"
echo "  - Proxy Server PID: $(pgrep -f "kraken-proxy-server.ts")"
echo "  - Trading System PID: $TRADING_PID"
echo "================================================"
echo "🚀 Tensor AI Fusion V2.0 OPERATIONAL"