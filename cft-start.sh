#!/bin/bash
# CFT Evaluation System Startup Script
# ByBit API integration for Crypto Fund Trader evaluation

echo "🏆 Starting CFT Evaluation System ($10,000 ByBit)"
echo "================================================"

# Create log directory for CFT
mkdir -p /tmp/cft-logs

# Check if CFT system is already running
if [ -f /tmp/cft-logs/trader.pid ]; then
    PID=$(cat /tmp/cft-logs/trader.pid 2>/dev/null)
    if [ -n "$PID" ] && kill -0 $PID 2>/dev/null; then
        echo "⚠️  CFT system is already running (PID: $PID)"
        echo "🛑 Stop first with: ./cft-stop.sh"
        exit 1
    fi
fi

# Clean up any stale PID files
rm -f /tmp/cft-logs/*.pid

# Check environment variables
if [ -z "$BYBIT_API_KEY" ] || [ -z "$BYBIT_API_SECRET" ]; then
    echo "⚠️  Environment variables not loaded. Loading from .env..."
    set -a
    source .env
    set +a
fi

# Check API credentials
if [ -z "$BYBIT_API_KEY" ]; then
    echo "❌ BYBIT_API_KEY not configured!"
    echo "Please check your .env file"
    exit 1
fi

echo "✅ ByBit API Key: ${BYBIT_API_KEY:0:8}..."

# Check if main system is running (informational)
if pgrep -f "production-trading-multi-pair.ts" > /dev/null; then
    echo "✅ Main SignalCartel system detected (port 3004)"
    echo "✅ CFT system will run on separate ports"
else
    echo "ℹ️  Main SignalCartel system not detected"
    echo "✅ CFT system will use standard ports"
fi

# Safety check: Never interfere with main system processes
echo "🛡️ Safety check: Protecting main system processes..."

# Test ByBit API connection first
echo "🧪 Testing ByBit API connection..."
if npx tsx test-bybit-cft-connection.ts > /tmp/cft-logs/connection-test.log 2>&1; then
    echo "✅ ByBit API connection successful"
else
    echo "❌ ByBit API connection failed!"
    echo "📋 Check /tmp/cft-logs/connection-test.log for details"
    echo "💡 Common issues:"
    echo "   - IP not whitelisted in ByBit API settings"
    echo "   - VPN required for geo-restricted access"
    echo "   - API credentials incorrect"
    echo ""
    echo "🎮 Starting demo mode instead..."
    npx tsx cft-demo-mode.ts > /tmp/cft-logs/demo.log 2>&1 &
    DEMO_PID=$!
    echo $DEMO_PID > /tmp/cft-logs/demo.pid
    echo "📺 Demo running in background, check /tmp/cft-logs/demo.log"
    echo "🛑 Use ./cft-stop.sh to stop demo"
    exit 0
fi

# Start CFT System Guardian with ntfy alerts
echo "🛡️ Starting CFT System Guardian..."
nohup env \
  NTFY_TOPIC="cft-evaluation" \
  npx tsx src/monitoring/cft-system-guardian.ts > /tmp/cft-logs/system-guardian.log 2>&1 &
GUARDIAN_PID=$!

sleep 2

# Verify guardian is running
if ps -p $GUARDIAN_PID > /dev/null; then
    echo "✅ System Guardian running (PID: $GUARDIAN_PID) - ntfy alerts enabled"
else
    echo "⚠️  System Guardian startup failed"
fi

# Start CFT Enhanced Production Trading System (full AI suite)
echo "🚀 Starting CFT Enhanced Production Trading System..."
npx tsx cft-production-trading-enhanced.ts > /tmp/cft-logs/cft-production-enhanced.log 2>&1 &
TRADER_PID=$!

sleep 3

# Check if trader started successfully
if kill -0 $TRADER_PID 2>/dev/null; then
    echo "✅ CFT Trader started successfully"
else
    echo "❌ CFT Trader failed to start"
    echo "📋 Check /tmp/cft-logs/trader.log for details"
    exit 1
fi

# Start monitoring dashboard (if available)
if [ -f "src/dashboard/cft-dashboard.ts" ]; then
    echo "📊 Starting CFT Dashboard..."
    npx tsx src/dashboard/cft-dashboard.ts > /tmp/cft-logs/dashboard.log 2>&1 &
    DASHBOARD_PID=$!
    echo $DASHBOARD_PID > /tmp/cft-logs/dashboard.pid
fi

# Save PIDs for shutdown script
echo $GUARDIAN_PID > /tmp/cft-logs/guardian.pid
echo $TRADER_PID > /tmp/cft-logs/trader.pid

echo ""
echo "✅ CFT Evaluation System Started!"
echo "================================="
echo "🏆 Account: $10,000 ByBit CFT Evaluation"
echo "🎯 Profit Target: $800 (8% - Phase 1)"
echo "🛡️  Daily Loss Limit: $500 (5%)"
echo "🔒 Max Loss Limit: $1,200 (12% - Premium)"
echo "💰 Profit Split: 90% (Premium)"
echo "📈 Win Rate Target: 76%+ (your proven performance)"
echo ""
echo "📁 Logs: /tmp/cft-logs/"
echo "🎮 Demo Mode: npx tsx cft-demo-mode.ts"
echo ""
echo "🔧 MONITORING COMMANDS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 CFT Trading Signals:"
echo "   tail -f /tmp/cft-logs/cft-production-enhanced.log | grep 'SIGNAL'"
echo ""
echo "🛡️ System Guardian Alerts:"
echo "   tail -f /tmp/cft-logs/system-guardian.log"
echo ""
echo "📈 Full CFT Enhanced System Log:"
echo "   tail -f /tmp/cft-logs/cft-production-enhanced.log"
echo ""
echo "💡 Trader Console Commands:"
echo "  trader.enableAutoTrading()  - Start evaluation"
echo "  trader.enableSignalMode()   - Signals only"
echo "  trader.displaySystemStatus() - Show status"
echo ""
echo "⚠️  REMEMBER: First trade starts 30-day evaluation!"
echo "🛑 Use ./cft-stop.sh to shutdown"