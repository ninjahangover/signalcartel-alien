#!/bin/bash
# 🛑 CFT EVALUATION SYSTEM - COMPREHENSIVE SHUTDOWN SCRIPT
# Graceful shutdown for CFT Evaluation System with complete process cleanup
# Author: CFT Evaluation System V1.0
# Date: September 22, 2025

echo "🛑 CFT EVALUATION SYSTEM - COMPREHENSIVE SHUTDOWN"
echo "==============================================="

# Step 1: Comprehensive CFT process cleanup
echo "🧹 STEP 1: Comprehensive cleanup of CFT processes..."

# Kill all CFT-specific trading processes
echo "  🔍 Stopping CFT production trading processes..."
pkill -f "cft-production-trading-enhanced" 2>/dev/null || true
pkill -f "cft-production-trading" 2>/dev/null || true
pkill -f "cft-evaluation-trader" 2>/dev/null || true

echo "  🔍 Stopping CFT system components..."
pkill -f "cft-system-guardian" 2>/dev/null || true
pkill -f "cft-demo-mode" 2>/dev/null || true
pkill -f "cft-start" 2>/dev/null || true

echo "  🔍 Stopping CFT monitoring processes..."
pkill -f "tail.*cft-logs" 2>/dev/null || true

echo "  🔍 Comprehensive CFT tsx process cleanup..."
pkill -f "npx tsx.*cft" 2>/dev/null || true
pkill -f "tsx.*cft-production" 2>/dev/null || true
pkill -f "tsx.*cft-evaluation" 2>/dev/null || true

# Wait for processes to fully terminate
echo "  ⏳ Waiting for process termination..."
sleep 3

# Force kill any remaining CFT processes
echo "  🔨 Force cleanup any remaining CFT processes..."
pgrep -f "cft-production-trading" | xargs -r kill -9 2>/dev/null || true
pgrep -f "cft-evaluation" | xargs -r kill -9 2>/dev/null || true
pgrep -f "cft-system-guardian" | xargs -r kill -9 2>/dev/null || true

# Final verification
echo "  🔍 Verifying CFT cleanup..."
REMAINING=$(pgrep -f "npx tsx.*cft|cft-production|cft-evaluation|cft-system" | wc -l)
if [ "$REMAINING" -eq 0 ]; then
    echo "✅ Complete CFT process cleanup verified - all CFT processes stopped"
else
    echo "⚠️  Warning: $REMAINING CFT processes may still be running"
    pgrep -f "npx tsx.*cft|cft-production|cft-evaluation|cft-system" | head -5
fi

# Step 2: Clean up PID files and logs
echo "📁 STEP 2: Cleaning up PID files and log rotation..."

# Clean up PID files
rm -f /tmp/cft-logs/*.pid 2>/dev/null || true

# Archive current logs with timestamp
if [ -d "/tmp/cft-logs" ]; then
    TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    mkdir -p /tmp/cft-logs/archive 2>/dev/null || true
    if [ -f "/tmp/cft-logs/cft-production-enhanced.log" ]; then
        cp /tmp/cft-logs/cft-production-enhanced.log "/tmp/cft-logs/archive/cft-production-${TIMESTAMP}.log" 2>/dev/null || true
    fi
    echo "✅ Log files archived with timestamp: ${TIMESTAMP}"
fi

# Step 3: Verify main system is unaffected
echo "🏆 STEP 3: Verifying main SignalCartel system is unaffected..."
MAIN_PROCESSES=$(pgrep -f "production-trading-multi-pair|kraken-proxy|system-guardian" | wc -l)
if [ "$MAIN_PROCESSES" -gt 0 ]; then
    echo "✅ Main SignalCartel system is running normally ($MAIN_PROCESSES processes)"
else
    echo "ℹ️  Main SignalCartel system is not currently running"
fi

# Step 4: Final status and cleanup verification
echo ""
echo "🔍 STEP 4: FINAL CFT CLEANUP VERIFICATION"
echo "==============================================="

# Check for any remaining CFT processes
CFT_PROCESSES=$(pgrep -f "cft-" | wc -l)
echo "📊 Remaining CFT Processes: $CFT_PROCESSES"

if [ "$CFT_PROCESSES" -eq 0 ]; then
    echo "✅ CFT Evaluation System completely stopped"
else
    echo "⚠️  Warning: Some CFT processes may still be running"
    echo "Manual cleanup may be required:"
    echo "   pkill -9 -f 'cft-'"
fi

# Show final status
echo ""
echo "🎯 CFT EVALUATION SYSTEM SHUTDOWN COMPLETE"
echo "==============================================="
echo "Status: 🔴 CFT SYSTEM OFFLINE"
echo "Main System: 🟢 SIGNALCARTEL UNAFFECTED"
echo "Logs: 📋 Archived in /tmp/cft-logs/"
echo "Restart: 🔄 Use ./cft-start-enhanced.sh"
echo ""
echo "🏆 SignalCartel main system continues running normally"