#!/bin/bash
# SYSTEM GUARDIAN STARTUP SCRIPT
# Starts the trading system heartbeat monitor as a background service

echo "🛡️ Starting System Guardian..."

# Ensure log directory exists
mkdir -p /tmp/signalcartel-logs

# Start System Guardian in background
nohup npx tsx system-guardian.ts > /tmp/signalcartel-logs/system-guardian-startup.log 2>&1 &

# Get the PID
GUARDIAN_PID=$!
echo $GUARDIAN_PID > /tmp/signalcartel-logs/system-guardian.pid

echo "✅ System Guardian started with PID: $GUARDIAN_PID"
echo "📊 Monitor logs: tail -f /tmp/signalcartel-logs/system-guardian.log"
echo "🛑 To stop: kill $GUARDIAN_PID"

# Wait a moment and check if it's still running
sleep 3
if kill -0 $GUARDIAN_PID 2>/dev/null; then
    echo "🟢 System Guardian is running and monitoring trading system"
else
    echo "🔴 System Guardian failed to start - check logs"
    cat /tmp/signalcartel-logs/system-guardian-startup.log
fi