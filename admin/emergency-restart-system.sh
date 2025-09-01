#!/bin/bash

echo "🚨 EMERGENCY SYSTEM RESTART"
echo "✅ Fixed: API rate limiting with emergency price cache"
echo "✅ Fixed: TypeScript configuration for ES2022"
echo "✅ Fixed: Position exit monitoring for ALL symbols"
echo "✅ Fixed: Mathematical Intuition multi-AI sizing"
echo ""

# Kill any existing processes
echo "🛑 Stopping any existing processes..."
pkill -f "production-trading" || true
pkill -f "smart-hunter" || true
sleep 2

# Clear logs for fresh start
echo "🧹 Clearing old logs..."
> /tmp/signalcartel-logs/production-trading.log
> /tmp/signalcartel-logs/profit-preditor.log

echo "🚀 Starting FIXED Mathematical Intuition Engine..."
echo "📊 Monitoring: 60-second scans with emergency price cache"
echo "🧠 AI Systems: Multi-validation position sizing active"
echo "💰 Targets: USD/USDT pairs with optimized liquidity"
echo ""

# Start Smart Hunter first (scans every 60 seconds)
echo "🐅 Starting Smart Hunter (60-second scans)..."
nohup npx tsx smart-hunter-service.ts > /tmp/signalcartel-logs/profit-preditor.log 2>&1 &
HUNTER_PID=$!
echo "Smart Hunter PID: $HUNTER_PID"

sleep 5

# Start main trading engine with fixed price fetcher
echo "🧠 Starting Mathematical Intuition Trading Engine..."
DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
ENABLE_GPU_STRATEGIES=true \
NTFY_TOPIC="signal-cartel" \
nohup npx tsx production-trading-multi-pair.ts > /tmp/signalcartel-logs/production-trading.log 2>&1 &
TRADING_PID=$!
echo "Trading Engine PID: $TRADING_PID"

sleep 3

echo "✅ EMERGENCY RESTART COMPLETE!"
echo "📊 Smart Hunter: PID $HUNTER_PID (scanning every 60s)"  
echo "🧠 Trading Engine: PID $TRADING_PID (fixed API issues)"
echo ""
echo "Monitor with:"
echo "  tail -f /tmp/signalcartel-logs/production-trading.log"
echo "  tail -f /tmp/signalcartel-logs/profit-preditor.log"
echo ""
echo "🎯 System ready for Mathematical Intuition profit maximization!"