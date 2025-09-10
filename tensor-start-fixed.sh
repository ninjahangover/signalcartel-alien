#!/bin/bash

# Kill any existing processes
echo "🔧 Cleaning up existing processes..."
pkill -f "tsx.*production-trading" 2>/dev/null
pkill -f "tsx.*kraken-proxy" 2>/dev/null
sleep 2

# Start the Kraken Proxy Server first
echo "🚀 Starting Kraken Proxy Server V2.6..."
npx tsx kraken-proxy-server.ts 2>&1 | tee -a /tmp/signalcartel-logs/kraken-proxy.log &
PROXY_PID=$!
echo "   Proxy PID: $PROXY_PID"

# Wait for proxy to be ready
echo "⏳ Waiting for proxy to initialize..."
sleep 5

# Check if proxy is running
if ! ps -p $PROXY_PID > /dev/null; then
    echo "❌ Kraken proxy failed to start!"
    exit 1
fi

echo "✅ Kraken proxy running"

# Start the main trading system with TENSOR MODE
echo "🧠 Starting TENSOR AI FUSION V2.7 Trading System..."

TENSOR_MODE=true \
DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
ENABLE_GPU_STRATEGIES=true \
NTFY_TOPIC="signal-cartel" \
NODE_OPTIONS="--max-old-space-size=4096" \
TRADING_MODE="LIVE" \
npx tsx production-trading-multi-pair.ts 2>&1 | tee -a /tmp/signalcartel-logs/production-trading.log &

TRADING_PID=$!
echo "   Trading PID: $TRADING_PID"

sleep 5

# Verify both are running
if ps -p $PROXY_PID > /dev/null && ps -p $TRADING_PID > /dev/null; then
    echo "✅ TENSOR AI FUSION V2.7 SYSTEM OPERATIONAL"
    echo ""
    echo "📊 Monitor logs with:"
    echo "   tail -f /tmp/signalcartel-logs/production-trading.log"
    echo ""
    echo "🛑 Stop with:"
    echo "   kill $PROXY_PID $TRADING_PID"
else
    echo "❌ System startup failed!"
    ps -p $PROXY_PID > /dev/null || echo "   - Proxy not running"
    ps -p $TRADING_PID > /dev/null || echo "   - Trading system not running"
    exit 1
fi