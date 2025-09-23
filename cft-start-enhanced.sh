#!/bin/bash

# 🏆 CFT ENHANCED PRODUCTION TRADING SYSTEM - COMPREHENSIVE STARTUP
# Full AI suite with guardian monitoring and all components from main system
# Author: CFT Evaluation System V1.0
# Date: September 22, 2025

echo "🏆 CFT ENHANCED PRODUCTION TRADING SYSTEM - COMPREHENSIVE STARTUP"
echo "================================================================"

# Step 1: Comprehensive process cleanup
echo "🧹 STEP 1: Comprehensive cleanup of existing CFT processes..."

# Kill all known CFT trading processes
echo "  🔍 Stopping CFT production trading processes..."
pkill -f "cft-production-trading-enhanced" 2>/dev/null || true
pkill -f "cft-system-guardian" 2>/dev/null || true

echo "  🔍 Comprehensive CFT tsx process cleanup..."
pkill -f "npx tsx.*cft" 2>/dev/null || true
pkill -f "tsx.*cft-production" 2>/dev/null || true

# Wait for processes to fully terminate
echo "  ⏳ Waiting for process termination..."
sleep 3

# Final verification
echo "  🔍 Verifying CFT cleanup..."
REMAINING=$(pgrep -f "npx tsx.*cft|cft-production|cft-system" | wc -l)
if [ "$REMAINING" -eq 0 ]; then
    echo "✅ Complete CFT process cleanup verified - ready for fresh start"
else
    echo "⚠️  Warning: $REMAINING CFT processes may still be running"
fi

# Step 2: Verify required directories exist
echo "📁 STEP 2: Ensuring CFT log directories exist..."
mkdir -p /tmp/cft-logs
echo "✅ CFT Log directories ready"

# Step 3: Environment setup
echo "🔧 STEP 3: CFT Environment configuration..."
export NODE_ENV=production
export TRADING_MODE=CFT_EVALUATION
export TENSOR_MODE=true
export TENSOR_ROLLOUT=100
export ENABLE_TELEMETRY=true
export ENABLE_WEBHOOKS=${WEBHOOK_URL:+true}
export CFT_MODE=true
export NTFY_TOPIC="cft-evaluation"
export NODE_OPTIONS="--max-old-space-size=4096"

echo "📊 CFT Configuration:"
echo "   - Account: $10,000 CFT Evaluation"
echo "   - Mode: Enhanced (Full AI Suite)"
echo "   - Tensor Fusion: ENABLED"
echo "   - Guardian Monitor: ENABLED"
echo "   - Telemetry: ENABLED"
echo "   - WebSocket: Real-time data"
echo "   - AI Systems: 8+ integrated"
echo ""

# Step 4: Start CFT System Guardian (First to establish monitoring)
echo "🛡️ STEP 4: Starting CFT System Guardian with critical failure alerts..."
nohup env \
  CFT_MODE=true \
  NTFY_TOPIC="cft-evaluation" \
  npx tsx cft-system-guardian.ts > /tmp/cft-logs/cft-system-guardian.log 2>&1 &
GUARDIAN_PID=$!
sleep 2

# Verify guardian is running
if ps -p $GUARDIAN_PID > /dev/null; then
    echo "✅ CFT System Guardian running (PID: $GUARDIAN_PID) - ntfy alerts enabled"
else
    echo "⚠️  CFT System Guardian startup failed"
fi

# Step 5: Start Main CFT Enhanced Trading System
echo "🚀 STEP 5: Launching CFT Enhanced Trading System..."
echo "   🔧 Environment Variables:"
echo "   • CFT_MODE=true"
echo "   • TRADING_MODE=CFT_EVALUATION"
echo "   • TENSOR_MODE=true"
echo "   • Guardian monitoring enabled"
echo "   📡 Starting main CFT trading system..."

nohup env \
  CFT_MODE=true \
  TRADING_MODE=CFT_EVALUATION \
  TENSOR_MODE=true \
  NTFY_TOPIC="cft-evaluation" \
  NODE_OPTIONS="--max-old-space-size=4096" \
  npx tsx cft-production-trading-enhanced.ts > /tmp/cft-logs/cft-production-enhanced.log 2>&1 &

TRADING_PID=$!

# Extended wait for main trading system initialization
echo "   ⏳ Waiting for CFT trading system initialization (15 seconds)..."
sleep 15

# Step 6: System validation
echo "🔍 STEP 6: Validating CFT system startup..."

# Check for key success indicators in logs
if grep -q "CFT Enhanced Trading System" /tmp/cft-logs/cft-production-enhanced.log 2>/dev/null; then
    echo "✅ CFT Enhanced Engine: ACTIVE"
else
    echo "⏳ CFT Enhanced Engine: Initializing..."
fi

if grep -q "ByBit Dual Client Initialized" /tmp/cft-logs/cft-production-enhanced.log 2>/dev/null; then
    echo "✅ ByBit API Connection: SUCCESS"
else
    echo "⏳ ByBit API Connection: In progress..."
fi

if grep -q "CFT SYSTEM GUARDIAN STARTED" /tmp/cft-logs/cft-system-guardian.log 2>/dev/null; then
    echo "✅ CFT System Guardian: MONITORING (ntfy alerts active)"
else
    echo "⏳ CFT System Guardian: Initializing..."
fi

if grep -q "Profit Predator: Scanning for opportunities" /tmp/cft-logs/cft-production-enhanced.log 2>/dev/null; then
    echo "✅ Profit Predator: HUNTING (opportunity scanning active)"
else
    echo "⏳ Profit Predator: Initializing..."
fi

# Step 7: Display monitoring commands
echo ""
echo "📊 STEP 7: CFT MONITORING COMMANDS"
echo "=================================="
echo "🧠 AI Decision Making:"
echo "   tail -f /tmp/cft-logs/cft-production-enhanced.log | grep 'Phase'"
echo ""
echo "🎯 Profit Predator Hunting:"
echo "   tail -f /tmp/cft-logs/cft-production-enhanced.log | grep 'Profit Predator'"
echo ""
echo "📈 Full CFT System Log:"
echo "   tail -f /tmp/cft-logs/cft-production-enhanced.log"
echo ""
echo "🛡️ CFT System Guardian Log:"
echo "   tail -f /tmp/cft-logs/cft-system-guardian.log"
echo ""

# Step 8: Process information
echo ""
echo "🔧 STEP 8: CFT PROCESS INFORMATION"
echo "=================================="
echo "CFT System Guardian PID: $GUARDIAN_PID"
echo "CFT Trading System PID: $TRADING_PID"
echo ""
echo "Emergency stop command:"
echo "   ./cft-stop.sh"
echo ""

# Step 9: Verify processes are still running
ACTIVE_CFT_PROCESSES=$(pgrep -f "npx tsx.*cft" | wc -l)
echo "📊 Active CFT Processes: $ACTIVE_CFT_PROCESSES"

# Step 10: Final status
echo ""
echo "🎯 CFT ENHANCED TRADING SYSTEM STARTUP COMPLETE"
echo "==============================================="
echo "Status: 🟢 CFT EVALUATION SYSTEM OPERATIONAL"
echo "Architecture: AI-Enhanced + Guardian Monitoring + Mathematical Conviction"
echo "Mode: CFT EVALUATION TRADING ENABLED"
echo "Infrastructure: V1.0 CFT System + Guardian Protection"
echo "Protection: 24/7 CFT System Guardian with ntfy critical failure alerts"
echo ""
echo "CFT System will continue running in background."
echo "Use monitoring commands above to track performance."
echo ""
echo "🏆 Ready for CFT $10,000 Evaluation Challenge! 💰"
echo ""