#!/bin/bash

# NUCLEAR SHUTDOWN - KILLS ALL TRADING PROCESSES
echo "🔥 NUCLEAR SHUTDOWN - TERMINATING ALL PROCESSES"
echo "════════════════════════════════════════════════════════════════"

# Kill all TSX/Node processes related to trading
echo "🛑 Killing all trading-related processes..."

# Kill specific patterns
pkill -f "tsx.*production-trading" 2>/dev/null || true
pkill -f "tsx.*master-trading" 2>/dev/null || true
pkill -f "tsx.*smart-hunter" 2>/dev/null || true
pkill -f "tsx.*profit-predator" 2>/dev/null || true
pkill -f "tsx.*ai-focused" 2>/dev/null || true
pkill -f "tsx.*quantum-forge" 2>/dev/null || true
pkill -f "npm exec tsx" 2>/dev/null || true
pkill -f "scripts/engines" 2>/dev/null || true

# Kill any lingering tsx processes
pkill -f "npx tsx" 2>/dev/null || true

# Clean up PID files
rm -f /tmp/signalcartel-logs/*.pid

# Wait a moment for processes to die
sleep 2

# Check if anything is still running
REMAINING=$(ps aux | grep -E "(tsx|node).*(trading|hunter|master|production)" | grep -v grep | wc -l)

if [ "$REMAINING" -gt 0 ]; then
    echo "⚠️ Found $REMAINING stubborn processes, using SIGKILL..."
    pkill -9 -f "tsx" 2>/dev/null || true
    pkill -9 -f "node.*trading" 2>/dev/null || true
    pkill -9 -f "npm exec tsx" 2>/dev/null || true
    sleep 1
fi

# Final check for Docker container processes
DOCKER_TSX=$(ps aux | grep "scripts/engines" | grep -v grep | wc -l)
if [ "$DOCKER_TSX" -gt 0 ]; then
    echo "⚠️ Found $DOCKER_TSX Docker container processes..."
    # Try sudo kill for Docker processes
    ps aux | grep "scripts/engines" | grep -v grep | awk '{print $2}' | xargs -r sudo kill -9 2>/dev/null || true
fi

echo "✅ ALL PROCESSES TERMINATED"
echo "════════════════════════════════════════════════════════════════"
echo "   Use ./admin/start-quantum-forge-with-monitor.sh to restart"
echo "   OR run directly: npx tsx production-trading-multi-pair.ts"
