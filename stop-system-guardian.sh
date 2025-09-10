#!/bin/bash
# STOP SYSTEM GUARDIAN

PID_FILE="/tmp/signalcartel-logs/system-guardian.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat $PID_FILE)
    echo "🛑 Stopping System Guardian (PID: $PID)..."
    
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ System Guardian stopped"
        rm -f $PID_FILE
    else
        echo "⚠️ Process not running, cleaning up PID file"
        rm -f $PID_FILE
    fi
else
    echo "⚠️ No PID file found, attempting to find and stop guardian processes..."
    pkill -f "system-guardian.ts"
    echo "✅ Guardian processes stopped"
fi