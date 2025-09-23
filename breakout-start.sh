#!/bin/bash
# Breakout Evaluation System Startup Script
# Runs parallel to main SignalCartel system

echo "🎯 Starting SignalCartel Breakout Evaluation System ($5,000)"
echo "================================================"

# Create separate log directory for breakout
mkdir -p /tmp/breakout-logs

# Check if main system is running (informational)
if pgrep -f "production-trading-multi-pair.ts" > /dev/null; then
    echo "✅ Main system detected running on port 3004"
    echo "✅ Breakout will run on separate ports (3005, 5001, 3002)"
fi

# Start Kraken Proxy on different port (3002)
echo "Starting Kraken Proxy (Port 3002)..."
cd /home/telgkb9/depot/signalcartel-breakout
npx tsx src/lib/kraken-proxy-breakout.ts > /tmp/breakout-logs/proxy.log 2>&1 &
PROXY_PID=$!

sleep 3

# Start Tensor Analysis on different port (5001)
echo "Starting Tensor Analysis (Port 5001)..."
npx tsx src/lib/tensor-breakout.ts > /tmp/breakout-logs/tensor.log 2>&1 &
TENSOR_PID=$!

sleep 3

# Start Evaluation Monitor (tracks drawdown/daily loss)
echo "Starting Evaluation Monitor..."
npx tsx src/monitoring/evaluation-monitor.ts > /tmp/breakout-logs/monitor.log 2>&1 &
MONITOR_PID=$!

sleep 2

# Start Dashboard on port 3005
echo "Starting Dashboard (Port 3005)..."
npx tsx src/dashboard/breakout-dashboard.ts > /tmp/breakout-logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!

sleep 2

# Start Main Trading System
echo "Starting Breakout Trading System..."
npx tsx breakout-trader.ts > /tmp/breakout-logs/trader.log 2>&1 &
TRADER_PID=$!

# Save PIDs for shutdown script
echo $PROXY_PID > /tmp/breakout-logs/proxy.pid
echo $TENSOR_PID > /tmp/breakout-logs/tensor.pid
echo $MONITOR_PID > /tmp/breakout-logs/monitor.pid
echo $DASHBOARD_PID > /tmp/breakout-logs/dashboard.pid
echo $TRADER_PID > /tmp/breakout-logs/trader.pid

echo ""
echo "✅ Breakout Evaluation System Started!"
echo "=================================="
echo "📊 Dashboard: http://localhost:3005"
echo "📈 Profit Target: $500 / $5000 (10%)"
echo "⚠️ Max Daily Loss: $200 (4%)"
echo "🛑 Max Drawdown: $250 (5%)"
echo ""
echo "📁 Logs: /tmp/breakout-logs/"
echo "🔧 Main system continues on port 3004"
echo ""
echo "Use ./breakout-stop.sh to shutdown"