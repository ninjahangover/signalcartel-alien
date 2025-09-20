#!/bin/bash

# Start Failover Sentinel System
# For contest evaluation - ensures 100% uptime

echo "🛡️ STARTING FAILOVER SENTINEL SYSTEM"
echo "===================================="

# Determine our role based on hostname
HOSTNAME=$(hostname)
if [[ "$HOSTNAME" == *"dev1"* ]] || [[ "$1" == "primary" ]]; then
    export NODE_ROLE="primary"
    export PRIMARY_HOST="localhost"
    export FAILOVER_HOST="${FAILOVER_HOST:-dev2.local}"
    echo "📍 Running as PRIMARY node (dev1)"
else
    export NODE_ROLE="failover"
    export PRIMARY_HOST="${PRIMARY_HOST:-dev1.local}"
    export FAILOVER_HOST="localhost"
    echo "📍 Running as FAILOVER node (dev2)"
fi

echo "Primary Host: $PRIMARY_HOST"
echo "Failover Host: $FAILOVER_HOST"
echo ""

# Kill any existing sentinel
pkill -f "failover-sentinel" 2>/dev/null || true

# Start the failover sentinel
echo "🚀 Starting failover monitoring..."
npx tsx admin/failover-sentinel.ts &

SENTINEL_PID=$!
echo "✅ Failover sentinel started (PID: $SENTINEL_PID)"

# Keep script running
echo ""
echo "Press Ctrl+C to stop failover monitoring"
wait $SENTINEL_PID