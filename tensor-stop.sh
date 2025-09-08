#!/bin/bash

# Tensor AI Fusion V2.0 Stop Script
# SignalCartel QUANTUM FORGE™

echo "🛑 Stopping Tensor AI Fusion V2.0..."
echo "================================================"

# Step 1: Stop trading system
TRADING_PID=$(pgrep -f "production-trading-multi-pair.ts")
if [ ! -z "$TRADING_PID" ]; then
    echo "📊 Stopping Trading System (PID: $TRADING_PID)..."
    kill $TRADING_PID
    sleep 2
    
    # Force kill if still running
    if ps -p $TRADING_PID > /dev/null; then
        echo "⚠️  Force stopping Trading System..."
        kill -9 $TRADING_PID
    fi
    echo "✅ Trading System stopped"
else
    echo "ℹ️  Trading System not running"
fi

# Step 2: Stop proxy server
PROXY_PID=$(pgrep -f "kraken-proxy-server.ts")
if [ ! -z "$PROXY_PID" ]; then
    echo "📡 Stopping Proxy Server (PID: $PROXY_PID)..."
    kill $PROXY_PID
    sleep 2
    
    # Force kill if still running
    if ps -p $PROXY_PID > /dev/null; then
        echo "⚠️  Force stopping Proxy Server..."
        kill -9 $PROXY_PID
    fi
    echo "✅ Proxy Server stopped"
else
    echo "ℹ️  Proxy Server not running"
fi

# Step 3: Clean up any remaining Node processes
echo "🧹 Cleaning up any remaining processes..."
pkill -f "npx tsx" 2>/dev/null || true

echo ""
echo "🔍 System Status Check:"
echo "================================================"

# Check if any processes are still running
REMAINING=$(ps aux | grep -E "(production-trading|kraken-proxy)" | grep -v grep)
if [ -z "$REMAINING" ]; then
    echo "✅ All systems successfully stopped"
else
    echo "⚠️  Warning: Some processes may still be running:"
    echo "$REMAINING"
fi

echo "================================================"
echo "🛑 Tensor AI Fusion V2.0 STOPPED"
echo ""
echo "🚀 To restart the system, run:"
echo "  ./tensor-start.sh"