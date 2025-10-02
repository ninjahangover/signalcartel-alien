#!/bin/bash
#
# Kraken Futures Trading - Shutdown Script
# Gracefully stops the futures trading engine
#

echo "🛑 Stopping Kraken Futures Trading System..."
echo "================================================"

# Find and kill futures trading processes
PIDS=$(pgrep -f "production-trading-futures.ts")

if [ -z "$PIDS" ]; then
    echo "ℹ️  No futures trading processes found"
    exit 0
fi

echo "🔍 Found futures trading processes: $PIDS"

# Send SIGTERM for graceful shutdown
echo "📤 Sending graceful shutdown signal..."
pkill -TERM -f "production-trading-futures.ts"

# Wait up to 10 seconds for graceful shutdown
for i in {1..10}; do
    sleep 1
    REMAINING=$(pgrep -f "production-trading-futures.ts" | wc -l)
    if [ "$REMAINING" -eq 0 ]; then
        echo "✅ Futures trading engine stopped gracefully"
        echo ""
        echo "📊 View final logs:"
        echo "   tail -50 /tmp/signalcartel-logs/futures-trading.log"
        echo ""
        exit 0
    fi
    echo "   Waiting for shutdown... ($i/10)"
done

# Force kill if still running
echo "⚠️  Graceful shutdown timed out, forcing termination..."
pkill -9 -f "production-trading-futures.ts"
sleep 1

if pgrep -f "production-trading-futures.ts" > /dev/null; then
    echo "❌ Failed to stop futures trading processes"
    exit 1
else
    echo "✅ Futures trading engine forcefully stopped"
    echo ""
fi
