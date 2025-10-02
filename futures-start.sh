#!/bin/bash
#
# Kraken Futures Trading - Startup Script
# Isolated system for perpetual contract trading
# Safe to run alongside spot trading system
#

echo "🚀 Starting Kraken Futures Trading System..."
echo "================================================"

# Check if futures trading is enabled
if grep -q "FUTURES_TRADING_ENABLED=false" .env 2>/dev/null; then
    echo ""
    echo "⚠️  FUTURES TRADING IS DISABLED"
    echo ""
    echo "To enable futures trading:"
    echo "  1. Fund your Kraken Futures account (recommended: \$100 for testing)"
    echo "  2. Edit .env and set: FUTURES_TRADING_ENABLED=true"
    echo "  3. Review other FUTURES_* settings in .env"
    echo "  4. Run this script again"
    echo ""
    exit 0
fi

# Create log directory
mkdir -p /tmp/signalcartel-logs

# Kill any existing futures trading processes
echo "🧹 Cleaning up old processes..."
pkill -f "production-trading-futures.ts" 2>/dev/null || true
sleep 2

# Start futures trading engine
echo "🎯 Starting Futures Trading Engine..."
nohup npx tsx production-trading-futures.ts > /tmp/signalcartel-logs/futures-trading.log 2>&1 &
FUTURES_PID=$!

# Wait a moment for startup
sleep 3

# Check if process is running
if ps -p $FUTURES_PID > /dev/null 2>&1; then
    echo "✅ Futures Trading Engine started (PID: $FUTURES_PID)"
    echo ""
    echo "📊 Monitor with:"
    echo "   tail -f /tmp/signalcartel-logs/futures-trading.log"
    echo ""
    echo "🛑 Stop with:"
    echo "   ./futures-stop.sh"
    echo ""
    echo "================================================"
    echo "⚠️  IMPORTANT SAFETY NOTES:"
    echo "   • This runs INDEPENDENTLY of spot trading"
    echo "   • Uses separate \$100 futures capital"
    echo "   • Trades perpetual contracts (fi_xbtusd, etc.)"
    echo "   • Max leverage: 2x (conservative)"
    echo "   • Position size: 10% per trade"
    echo "================================================"
else
    echo "❌ Failed to start Futures Trading Engine"
    echo "   Check /tmp/signalcartel-logs/futures-trading.log for errors"
    exit 1
fi
