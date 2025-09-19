#!/bin/bash

# Manual start script for System Guardian (non-systemd alternative)
# This provides an alternative way to ensure System Guardian is always running

echo "🛡️ Starting SignalCartel System Guardian (Manual Mode)..."

# Set working directory
cd /home/telgkb9/depot/current

# Check if already running
if pgrep -f "system-guardian.ts" > /dev/null; then
    echo "⚠️  System Guardian is already running!"
    exit 0
fi

# Create log directory if it doesn't exist
mkdir -p /tmp/signalcartel-logs

# Start System Guardian with auto-restart loop
while true; do
    echo "🚀 Starting System Guardian at $(date)..."

    DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
    NTFY_TOPIC="signal-cartel" \
    NODE_OPTIONS="--max-old-space-size=4096" \
    npx tsx admin/system-guardian.ts >> /tmp/signalcartel-logs/system-guardian.log 2>&1

    EXIT_CODE=$?
    echo "⚠️  System Guardian exited with code $EXIT_CODE at $(date)" >> /tmp/signalcartel-logs/system-guardian.log

    # Send ntfy alert about restart
    curl -d "System Guardian crashed and restarting (exit code: $EXIT_CODE)" \
         https://ntfy.sh/signal-cartel 2>/dev/null

    echo "🔄 Restarting System Guardian in 10 seconds..."
    sleep 10
done &

# Save PID for later management
echo $! > /tmp/signalcartel-guardian.pid

echo "✅ System Guardian started with auto-restart enabled!"
echo "📋 PID saved to /tmp/signalcartel-guardian.pid"
echo "📊 Logs: tail -f /tmp/signalcartel-logs/system-guardian.log"
echo "🛑 To stop: kill \$(cat /tmp/signalcartel-guardian.pid)"