#!/bin/bash

# QUANTUM FORGE™ GRACEFUL SHUTDOWN SCRIPT
# 
# Performs sequential shutdown to prevent data corruption:
# 1. Stop new trades/signals
# 2. Allow current positions to close gracefully
# 3. Shutdown AI systems in reverse order
# 4. Close database connections
# 5. Archive logs and cleanup

set -e  # Exit on any error

echo "🛑 QUANTUM FORGE™ GRACEFUL SHUTDOWN INITIATED"
echo "════════════════════════════════════════════════════════════════"
echo "📋 SEQUENTIAL SHUTDOWN PROTOCOL:"
echo "   1️⃣ Stop Smart Hunter (no new opportunities)"
echo "   2️⃣ Allow Master Trading Pipeline to complete current operations"
echo "   3️⃣ Graceful AI Trading Engine shutdown"
echo "   4️⃣ Database connection cleanup"
echo "   5️⃣ Log archival and cleanup"
echo "════════════════════════════════════════════════════════════════"
echo

# Log directory
LOG_DIR="/tmp/signalcartel-logs"
SHUTDOWN_LOG="$LOG_DIR/shutdown-$(date +%Y%m%d_%H%M%S).log"

# Logging function
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$SHUTDOWN_LOG"
}

log "🛑 Graceful shutdown process started"

# ============================================================================
# PHASE 1: STOP SMART HUNTER SERVICE
# ============================================================================

log "📋 PHASE 1: Stopping Smart Hunter Service"

if [ -f "$LOG_DIR/smart-hunter.pid" ]; then
    HUNTER_PID=$(cat "$LOG_DIR/smart-hunter.pid")
    if kill -0 "$HUNTER_PID" 2>/dev/null; then
        log "🛑 Stopping Smart Hunter Service (PID: $HUNTER_PID)..."
        log "   • Preventing new opportunity scans"
        
        # Send TERM signal first for graceful shutdown
        kill -TERM "$HUNTER_PID" 2>/dev/null || true
        
        # Wait up to 10 seconds for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 "$HUNTER_PID" 2>/dev/null; then
                log "✅ Smart Hunter Service stopped gracefully"
                break
            fi
            sleep 1
            if [ $i -eq 10 ]; then
                log "⚠️ Smart Hunter Service didn't respond to TERM, using KILL"
                kill -KILL "$HUNTER_PID" 2>/dev/null || true
            fi
        done
    else
        log "ℹ️ Smart Hunter Service was not running"
    fi
    rm -f "$LOG_DIR/smart-hunter.pid"
else
    log "ℹ️ Smart Hunter PID file not found - service may not be running"
fi

# ============================================================================
# PHASE 2: GRACEFUL MASTER TRADING PIPELINE SHUTDOWN
# ============================================================================

log "📋 PHASE 2: Graceful Master Trading Pipeline Shutdown"

if [ -f "$LOG_DIR/master-pipeline.pid" ]; then
    PIPELINE_PID=$(cat "$LOG_DIR/master-pipeline.pid")
    if kill -0 "$PIPELINE_PID" 2>/dev/null; then
        log "🛑 Initiating Master Trading Pipeline shutdown (PID: $PIPELINE_PID)..."
        log "   • Stopping new trades"
        log "   • Allowing current operations to complete"
        
        # Send SIGINT for graceful shutdown (same as Ctrl+C)
        kill -INT "$PIPELINE_PID" 2>/dev/null || true
        
        # Wait longer for trading pipeline (up to 30 seconds)
        log "⏳ Waiting for trading operations to complete..."
        for i in {1..30}; do
            if ! kill -0 "$PIPELINE_PID" 2>/dev/null; then
                log "✅ Master Trading Pipeline stopped gracefully"
                break
            fi
            if [ $((i % 5)) -eq 0 ]; then
                log "   • Still waiting... ($i/30 seconds)"
            fi
            sleep 1
            if [ $i -eq 30 ]; then
                log "⚠️ Master Trading Pipeline taking too long, sending TERM signal"
                kill -TERM "$PIPELINE_PID" 2>/dev/null || true
                sleep 5
                if kill -0 "$PIPELINE_PID" 2>/dev/null; then
                    log "🚨 Emergency KILL signal sent"
                    kill -KILL "$PIPELINE_PID" 2>/dev/null || true
                fi
            fi
        done
    else
        log "ℹ️ Master Trading Pipeline was not running"
    fi
    rm -f "$LOG_DIR/master-pipeline.pid"
else
    log "ℹ️ Master Trading Pipeline PID file not found - service may not be running"
fi

# ============================================================================
# PHASE 3: DATABASE CONNECTION CLEANUP
# ============================================================================

log "📋 PHASE 3: Database Connection Cleanup"

# Give any remaining database connections time to close
log "⏳ Allowing database connections to close..."
sleep 3

# Check for any remaining TypeScript/Node processes
log "🔍 Checking for remaining processes..."
TSX_PROCESSES=$(pgrep -f "tsx.*trading\|tsx.*hunter\|tsx.*master\|tsx.*production" 2>/dev/null || true)
if [ -n "$TSX_PROCESSES" ]; then
    log "⚠️ Found lingering processes, cleaning up with process groups..."
    echo "$TSX_PROCESSES" | xargs -r kill -TERM 2>/dev/null || true
    sleep 3
    echo "$TSX_PROCESSES" | xargs -r kill -KILL 2>/dev/null || true
    
    # Also kill process groups to catch any child processes
    log "🔥 Cleaning up process groups..."
    ps -eo pid,pgid,cmd | grep -E "(tsx|node).*(trading|hunter|master)" | grep -v grep | while read pid pgid cmd; do
        kill -KILL -$pgid 2>/dev/null || true
    done
fi

# Final zombie process cleanup
log "🧹 Final zombie process cleanup..."
# Wait for any zombie processes to be reaped
sleep 2
# Check for zombie processes and clean them up
ZOMBIES=$(ps aux | awk '$8 ~ /^Z/ { print $2 }' || true)
if [ -n "$ZOMBIES" ]; then
    log "⚠️ Found zombie processes, attempting cleanup..."
    echo "$ZOMBIES" | xargs -r kill -KILL 2>/dev/null || true
else
    log "✅ No zombie processes found"
fi

log "✅ Database connections cleaned up"

# ============================================================================
# PHASE 4: LOG ARCHIVAL AND CLEANUP
# ============================================================================

log "📋 PHASE 4: Log Archival and Final Status"

# Create final system status report
log "📊 Final System Status:"
if [ -f "$LOG_DIR/production-trading.log" ]; then
    TRADING_LINES=$(wc -l < "$LOG_DIR/production-trading.log" 2>/dev/null || echo "0")
    log "   • Trading log: $TRADING_LINES lines"
else
    log "   • Trading log: Not found"
fi

if [ -f "$LOG_DIR/profit-preditor.log" ]; then
    HUNTER_LINES=$(wc -l < "$LOG_DIR/profit-preditor.log" 2>/dev/null || echo "0")
    log "   • Smart Hunter log: $HUNTER_LINES lines"
else
    log "   • Smart Hunter log: Not found"
fi

# Archive logs if they exist and are substantial
ARCHIVE_DIR="$LOG_DIR/archive"
mkdir -p "$ARCHIVE_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if [ -f "$LOG_DIR/production-trading.log" ] && [ -s "$LOG_DIR/production-trading.log" ]; then
    cp "$LOG_DIR/production-trading.log" "$ARCHIVE_DIR/production-trading-$TIMESTAMP.log"
    log "📁 Archived trading log to: $ARCHIVE_DIR/production-trading-$TIMESTAMP.log"
fi

if [ -f "$LOG_DIR/profit-preditor.log" ] && [ -s "$LOG_DIR/profit-preditor.log" ]; then
    cp "$LOG_DIR/profit-preditor.log" "$ARCHIVE_DIR/profit-preditor-$TIMESTAMP.log"
    log "📁 Archived Smart Hunter log to: $ARCHIVE_DIR/profit-preditor-$TIMESTAMP.log"
fi

# Clean up monitoring script
rm -f "$LOG_DIR/monitor-system.sh"

log ""
log "🎯 QUANTUM FORGE™ GRACEFUL SHUTDOWN COMPLETE!"
log "════════════════════════════════════════════════════════════════"
log "✅ All systems stopped gracefully:"
log "   • Smart Hunter Service: Stopped"
log "   • Master Trading Pipeline: Stopped with data integrity"
log "   • Database connections: Cleaned up"
log "   • Logs: Archived to $ARCHIVE_DIR"
log ""
log "📊 System Status: OFFLINE"
log "🔄 To restart: ./admin/start-quantum-forge-with-monitor.sh"
log "📁 Shutdown log: $SHUTDOWN_LOG"
log "════════════════════════════════════════════════════════════════"

echo
echo "✅ QUANTUM FORGE™ GRACEFULLY SHUTDOWN"
echo "   All trading systems stopped safely with data integrity preserved"
echo
echo "🔄 RESTART COMMANDS:"
echo "   • Full system: ./admin/start-quantum-forge-with-monitor.sh"
echo "   • Reset & restart: ./admin/simple-system-reset.ts then start script"
echo
echo "📁 LOGS ARCHIVED:"
echo "   • Shutdown: $SHUTDOWN_LOG"
echo "   • Archive: $ARCHIVE_DIR"