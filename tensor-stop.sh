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

# Step 2: Stop profit predator
PREDATOR_PID=$(pgrep -f "production-trading-profit-predator.ts")
if [ ! -z "$PREDATOR_PID" ]; then
    echo "🐅 Stopping Profit Predator (PID: $PREDATOR_PID)..."
    kill $PREDATOR_PID
    sleep 2
    
    # Force kill if still running
    if ps -p $PREDATOR_PID > /dev/null; then
        echo "⚠️  Force stopping Profit Predator..."
        kill -9 $PREDATOR_PID
    fi
    echo "✅ Profit Predator stopped"
else
    echo "ℹ️  Profit Predator not running"
fi

# Step 3: Stop proxy server
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

# Step 4: Stop system guardian
GUARDIAN_PID=$(pgrep -f "quantum-forge-live-monitor.ts")
if [ ! -z "$GUARDIAN_PID" ]; then
    echo "🛡️ Stopping System Guardian (PID: $GUARDIAN_PID)..."
    kill $GUARDIAN_PID
    sleep 2
    
    # Force kill if still running
    if ps -p $GUARDIAN_PID > /dev/null; then
        echo "⚠️  Force stopping System Guardian..."
        kill -9 $GUARDIAN_PID
    fi
    echo "✅ System Guardian stopped"
else
    echo "ℹ️  System Guardian not running"
fi

# Step 5: Clean up any remaining Node processes
echo "🧹 Cleaning up any remaining processes..."
pkill -f "npx tsx" 2>/dev/null || true

echo ""
echo "🔍 System Status Check:"
echo "================================================"

# Check if any processes are still running
REMAINING=$(ps aux | grep -E "(production-trading|kraken-proxy|profit-predator|quantum-forge-live-monitor)" | grep -v grep)
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