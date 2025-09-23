#!/bin/bash
# Graceful shutdown for Breakout Evaluation System

echo "🛑 Stopping Breakout Evaluation System..."

# Read PIDs
if [ -f /tmp/breakout-logs/trader.pid ]; then
    kill $(cat /tmp/breakout-logs/trader.pid) 2>/dev/null
    echo "✅ Trader stopped"
fi

if [ -f /tmp/breakout-logs/dashboard.pid ]; then
    kill $(cat /tmp/breakout-logs/dashboard.pid) 2>/dev/null
    echo "✅ Dashboard stopped"
fi

if [ -f /tmp/breakout-logs/monitor.pid ]; then
    kill $(cat /tmp/breakout-logs/monitor.pid) 2>/dev/null
    echo "✅ Monitor stopped"
fi

if [ -f /tmp/breakout-logs/tensor.pid ]; then
    kill $(cat /tmp/breakout-logs/tensor.pid) 2>/dev/null
    echo "✅ Tensor stopped"
fi

if [ -f /tmp/breakout-logs/proxy.pid ]; then
    kill $(cat /tmp/breakout-logs/proxy.pid) 2>/dev/null
    echo "✅ Proxy stopped"
fi

# Clean up PID files
rm -f /tmp/breakout-logs/*.pid

echo ""
echo "✅ Breakout Evaluation System stopped"
echo "📊 Main system unaffected (port 3004)"