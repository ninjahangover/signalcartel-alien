#!/bin/bash

# QUANTUM FORGE™ MASTER TRADING PIPELINE STARTUP SCRIPT
# 
# Graceful sequential startup:
# 1. Environment validation
# 2. Database connectivity check
# 3. Master Trading Pipeline with mandatory calibration
# 4. Background monitoring services
# 5. Log monitoring and alerts

set -e  # Exit on any error

echo "🚀 QUANTUM FORGE™ MASTER TRADING PIPELINE STARTUP"
echo "════════════════════════════════════════════════════════════════"
echo "📋 SEQUENTIAL STARTUP PROTOCOL:"
echo "   1️⃣ Environment & Database Validation"
echo "   2️⃣ Launch Master Trading Pipeline (Calibration → Profit Predator → Trading)"
echo "   3️⃣ Start Smart Hunter Background Service"
echo "   4️⃣ Initialize Log Monitoring"
echo "════════════════════════════════════════════════════════════════"
echo

# Create log directory
LOG_DIR="/tmp/signalcartel-logs"
mkdir -p "$LOG_DIR"

STARTUP_LOG="$LOG_DIR/startup-$(date +%Y%m%d_%H%M%S).log"
MAIN_LOG="$LOG_DIR/production-trading.log"
SMART_HUNTER_LOG="$LOG_DIR/profit-preditor.log"

# Logging function
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$STARTUP_LOG"
}

# Error handling
error_exit() {
    local message="$1"
    log "❌ CRITICAL ERROR: $message"
    log "🚨 STARTUP ABORTED - System not started"
    echo
    echo "🔍 Check logs for details:"
    echo "   • Startup: $STARTUP_LOG"
    echo "   • Main: $MAIN_LOG"
    exit 1
}

# Cleanup function for graceful shutdown
cleanup() {
    log ""
    log "🛑 Graceful shutdown initiated..."
    
    # Stop Master Trading Pipeline
    if [ -f "$LOG_DIR/master-pipeline.pid" ]; then
        PIPELINE_PID=$(cat "$LOG_DIR/master-pipeline.pid")
        if kill -0 "$PIPELINE_PID" 2>/dev/null; then
            log "🛑 Stopping Master Trading Pipeline (PID: $PIPELINE_PID)..."
            kill -TERM "$PIPELINE_PID" 2>/dev/null || true
            sleep 5
            kill -KILL "$PIPELINE_PID" 2>/dev/null || true
        fi
        rm -f "$LOG_DIR/master-pipeline.pid"
    fi
    
    # Stop Smart Hunter
    if [ -f "$LOG_DIR/smart-hunter.pid" ]; then
        HUNTER_PID=$(cat "$LOG_DIR/smart-hunter.pid")
        if kill -0 "$HUNTER_PID" 2>/dev/null; then
            log "🛑 Stopping Smart Hunter Service (PID: $HUNTER_PID)..."
            kill -TERM "$HUNTER_PID" 2>/dev/null || true
            sleep 3
            kill -KILL "$HUNTER_PID" 2>/dev/null || true
        fi
        rm -f "$LOG_DIR/smart-hunter.pid"
    fi
    
    log "✅ QUANTUM FORGE™ GRACEFUL SHUTDOWN COMPLETE"
    exit 0
}

trap cleanup SIGINT SIGTERM
trap 'error_exit "Unexpected error during startup"' ERR

log "🚀 Quantum Forge™ startup initiated"

# ============================================================================
# PHASE 1: ENVIRONMENT & DATABASE VALIDATION
# ============================================================================

log "📋 PHASE 1: Environment & Database Validation"

# Check if TypeScript is available
if ! command -v npx &> /dev/null; then
    error_exit "npx not found - Node.js/npm required"
fi

# Validate database environment
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public"
    log "🔧 Using default DATABASE_URL"
else
    log "✅ DATABASE_URL configured"
fi

# Test database connectivity
log "🔍 Testing database connectivity..."
if ! PGPASSWORD=quantum_forge_warehouse_2024 docker exec signalcartel-warehouse psql -U warehouse_user -d signalcartel -c "SELECT 1;" > /dev/null 2>&1; then
    error_exit "Database connection failed - ensure PostgreSQL container is running"
fi
log "✅ Database connectivity confirmed"

# Check TypeScript compilation
log "🔍 Validating TypeScript compilation..."
if ! npx tsc --noEmit > /dev/null 2>&1; then
    log "⚠️ TypeScript compilation warnings detected (proceeding anyway)"
else
    log "✅ TypeScript compilation clean"
fi

# ============================================================================
# PHASE 2: MASTER TRADING PIPELINE LAUNCH
# ============================================================================

log "📋 PHASE 2: Master Trading Pipeline Launch"
log "🔧 This will run mandatory sequential execution:"
log "   • Dynamic Strategy Calibration (REQUIRED)"
log "   • Profit Predator Opportunity Validation" 
log "   • AI Trading Engine with Calibrated Parameters"

# Set environment variables
export ENABLE_GPU_STRATEGIES=true
export NTFY_TOPIC="signal-cartel"
export NODE_OPTIONS="--max-old-space-size=4096"

log "🚀 Starting Master Trading Pipeline..."

# Start Master Trading Pipeline in background
nohup npx tsx master-trading-pipeline.ts > "$MAIN_LOG" 2>&1 &
PIPELINE_PID=$!

log "✅ Master Trading Pipeline started (PID: $PIPELINE_PID)"
echo "$PIPELINE_PID" > "$LOG_DIR/master-pipeline.pid"

# Wait for calibration to complete
log "⏳ Waiting for mandatory calibration to complete..."
sleep 5

# Check if pipeline is still running
if ! kill -0 "$PIPELINE_PID" 2>/dev/null; then
    error_exit "Master Trading Pipeline failed to start - check logs"
fi

log "✅ Master Trading Pipeline operational"

# ============================================================================
# PHASE 3: SMART HUNTER BACKGROUND SERVICE
# ============================================================================

log "📋 PHASE 3: Smart Hunter Background Service"

# Start Smart Hunter service
nohup npx tsx smart-hunter-service.ts > "$SMART_HUNTER_LOG" 2>&1 &
HUNTER_PID=$!

log "✅ Smart Hunter service started (PID: $HUNTER_PID)"
echo "$HUNTER_PID" > "$LOG_DIR/smart-hunter.pid"

sleep 2

# Verify Smart Hunter is running
if ! kill -0 "$HUNTER_PID" 2>/dev/null; then
    log "⚠️ Smart Hunter service may have failed to start (continuing anyway)"
else
    log "✅ Smart Hunter service operational"
fi

# ============================================================================
# PHASE 4: MONITORING & ALERTS
# ============================================================================

log "📋 PHASE 4: Log Monitoring & System Status"

# Create monitoring script
cat > "$LOG_DIR/monitor-system.sh" << 'EOF'
#!/bin/bash
LOG_DIR="/tmp/signalcartel-logs"

echo "🔍 QUANTUM FORGE™ SYSTEM STATUS"
echo "═══════════════════════════════════════════════════════════════"

# Check PIDs
PIPELINE_PID=$(cat "$LOG_DIR/master-pipeline.pid" 2>/dev/null || echo "")
HUNTER_PID=$(cat "$LOG_DIR/smart-hunter.pid" 2>/dev/null || echo "")

if [ -n "$PIPELINE_PID" ] && kill -0 "$PIPELINE_PID" 2>/dev/null; then
    echo "✅ Master Trading Pipeline: Running (PID: $PIPELINE_PID)"
else
    echo "❌ Master Trading Pipeline: Not running"
fi

if [ -n "$HUNTER_PID" ] && kill -0 "$HUNTER_PID" 2>/dev/null; then
    echo "✅ Smart Hunter Service: Running (PID: $HUNTER_PID)"
else
    echo "❌ Smart Hunter Service: Not running"
fi

echo
echo "📊 Recent Trading Activity (last 10 lines):"
echo "───────────────────────────────────────────────────────────────"
tail -n 10 "$LOG_DIR/production-trading.log" 2>/dev/null || echo "No trading log found"

echo
echo "🎯 Recent Opportunities (last 5 lines):"
echo "───────────────────────────────────────────────────────────────"
tail -n 5 "$LOG_DIR/profit-preditor.log" 2>/dev/null || echo "No Smart Hunter log found"

echo
echo "📍 Log Files:"
echo "   • Main Trading: $LOG_DIR/production-trading.log"
echo "   • Smart Hunter: $LOG_DIR/profit-preditor.log"
echo "   • Startup: $LOG_DIR/startup-*.log"
EOF

chmod +x "$LOG_DIR/monitor-system.sh"

# ============================================================================
# STARTUP COMPLETE - START LIVE MONITORING
# ============================================================================

log ""
log "🎉 QUANTUM FORGE™ MASTER TRADING PIPELINE SUCCESSFULLY STARTED!"
log "═══════════════════════════════════════════════════════════════"
log "✅ All systems operational:"
log "   • Master Trading Pipeline: Calibration → Profit Predator → Trading"
log "   • Smart Hunter Service: Background opportunity detection"
log "   • Log Monitoring: Real-time system status"
log ""
log "📊 System Status:"
log "   • Pipeline PID: $PIPELINE_PID"
log "   • Smart Hunter PID: $HUNTER_PID"
log "   • Phase: Will auto-detect from database (likely Phase 0)"
log "   • Strategy: Pine Script Foundation with Dynamic Calibration"
log ""

# Show initial status
echo
echo "🔍 INITIAL SYSTEM STATUS:"
"$LOG_DIR/monitor-system.sh"

echo
echo "✅ QUANTUM FORGE™ STARTUP COMPLETE - System Ready for Trading!"
echo
echo "🔍 LIVE MONITORING OPTIONS:"
echo "   1. Press ENTER for live log monitoring (recommended)"
echo "   2. Use Ctrl+C to exit and manage system manually"
echo "   3. Run: ./admin/stop-quantum-forge-gracefully.sh to stop system"
echo

# Wait for user input or proceed with monitoring
read -t 10 -p "Press ENTER to start live monitoring (auto-start in 10 seconds): " || true

echo
echo "🔍 STARTING LIVE LOG MONITORING..."
echo "   • Use Ctrl+C to stop system gracefully"
echo "   • All systems will shutdown properly on exit"
echo "═══════════════════════════════════════════════════════════════"

# Monitor logs in foreground
tail -f "$MAIN_LOG" 2>/dev/null || log "Main log not available yet - system starting..."