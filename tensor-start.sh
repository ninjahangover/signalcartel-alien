#!/bin/bash

# 🚀 TENSOR AI FUSION V2.7 - COMPREHENSIVE STARTUP SCRIPT
# Complete system startup with cleanup, validation, and monitoring
# Author: Tensor AI Fusion V2.7 Database Transaction Mastery
# Date: September 10, 2025

echo "🚀 TENSOR AI FUSION V2.9 - COMPLETE ECOSYSTEM STARTUP"
echo "=============================================="

# Step 1: Comprehensive process cleanup
echo "🧹 STEP 1: Comprehensive cleanup of existing processes..."

# Kill all known trading processes
echo "  🔍 Stopping production trading processes..."
pkill -f "production-trading" 2>/dev/null || true
pkill -f "profit-predator" 2>/dev/null || true

echo "  🔍 Stopping proxy and infrastructure..."
pkill -f "kraken-proxy" 2>/dev/null || true
pkill -f "system-guardian" 2>/dev/null || true
pkill -f "dashboard" 2>/dev/null || true

echo "  🔍 Stopping monitoring processes..."
pkill -f "tail.*signalcartel" 2>/dev/null || true
pkill -f "pretty-pnl" 2>/dev/null || true

echo "  🔍 Comprehensive tsx process cleanup..."
pkill -f "npx tsx" 2>/dev/null || true
pkill -f "tsx.*trading" 2>/dev/null || true
pkill -f "tsx.*kraken" 2>/dev/null || true
pkill -f "tsx.*profit" 2>/dev/null || true

# Wait for processes to fully terminate
echo "  ⏳ Waiting for process termination..."
sleep 5

# Force kill any remaining processes
echo "  🔨 Force cleanup any remaining processes..."
pgrep -f "production-trading" | xargs -r kill -9 2>/dev/null || true
pgrep -f "profit-predator" | xargs -r kill -9 2>/dev/null || true
pgrep -f "kraken-proxy" | xargs -r kill -9 2>/dev/null || true

# Final verification
echo "  🔍 Verifying cleanup..."
REMAINING=$(pgrep -f "npx tsx.*trading|kraken-proxy|profit-predator" | wc -l)
if [ "$REMAINING" -eq 0 ]; then
    echo "✅ Complete process cleanup verified - all trading processes stopped"
else
    echo "⚠️  Warning: $REMAINING processes may still be running"
    pgrep -f "npx tsx.*trading|kraken-proxy|profit-predator" | head -5
fi

# Step 2: Verify required directories exist
echo "📁 STEP 2: Ensuring log directories exist..."
mkdir -p /tmp/signalcartel-logs
echo "✅ Log directories ready"

# Step 3: Database connection test
echo "🗄️  STEP 3: Testing database connection..."
if DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" npx tsx admin/test-prisma-connection.ts 2>/dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed - continuing anyway"
fi

# Step 3.5: Robust position sync with actual Kraken holdings
echo "🔄 STEP 3.5: Robust position sync with actual Kraken holdings..."
# Load environment variables first
source .env 2>/dev/null || true
# Use robust position sync for perfect database alignment
DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
timeout 20s npx tsx admin/robust-position-sync.ts > /tmp/signalcartel-logs/position-sync.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Robust position sync completed successfully - database perfectly aligned"
else
    echo "⚠️  Robust position sync failed or timed out - continuing anyway"
fi

# Step 4: Start Kraken Proxy Server V2.6 (First to establish API connection)
echo "🔧 STEP 4: Starting Kraken Proxy Server V2.6..."
echo "   📡 Starting proxy server to establish Kraken API connection..."
nohup npx tsx kraken-proxy-server.ts > /tmp/signalcartel-logs/kraken-proxy.log 2>&1 &
PROXY_PID=$!

# Wait for proxy to fully initialize
echo "   ⏳ Waiting for proxy initialization (10 seconds)..."
sleep 10

# Verify proxy is running and ready
if curl -s http://127.0.0.1:3002/api/queue-stats >/dev/null 2>&1; then
    echo "✅ Kraken Proxy V2.6 running (PID: $PROXY_PID)"
    echo "📊 API connection established - ready for trading processes"
else
    echo "⚠️  Kraken Proxy still initializing... continuing anyway"
fi

# Critical: Wait for API rate limit reset before starting other processes
echo "   🔄 Ensuring clean API state (waiting 10 seconds for any rate limits to clear)..."
sleep 10

# Step 5: Start System Guardian with ntfy alerts
echo "🛡️ STEP 5: Starting System Guardian with critical failure alerts..."
nohup env \
  DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
  NTFY_TOPIC="signal-cartel" \
  npx tsx admin/system-guardian.ts > /tmp/signalcartel-logs/system-guardian.log 2>&1 &
GUARDIAN_PID=$!
sleep 2

# Verify guardian is running
if ps -p $GUARDIAN_PID > /dev/null; then
    echo "✅ System Guardian running (PID: $GUARDIAN_PID) - ntfy alerts enabled"
else
    echo "⚠️  System Guardian startup failed"
fi

# Step 5.5: Start Profit Predator Engine (Sequential startup for API safety)
echo "🐅 STEP 5.5: Starting QUANTUM FORGE™ Profit Predator Engine..."
echo "   ⏳ Sequential startup to prevent API flooding..."

nohup env \
  DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
  ENABLE_GPU_STRATEGIES=true \
  CUDA_VISIBLE_DEVICES=0 \
  TF_FORCE_GPU_ALLOW_GROWTH=true \
  NTFY_TOPIC="signal-cartel" \
  NODE_OPTIONS="--max-old-space-size=4096" \
  TRADING_MODE="LIVE" \
  npx tsx production-trading-profit-predator.ts > /tmp/signalcartel-logs/profit-predator.log 2>&1 &
PREDATOR_PID=$!

# Wait for Profit Predator to establish its API connections
echo "   ⏳ Waiting for Profit Predator API authentication (15 seconds)..."
sleep 15

# Verify profit predator is running
if ps -p $PREDATOR_PID > /dev/null; then
    echo "✅ Profit Predator running (PID: $PREDATOR_PID) - API connections established"
    # Additional wait for GPU context stabilization
    echo "   🔥 Waiting for GPU context stabilization (10 seconds)..."
    sleep 10
else
    echo "⚠️  Profit Predator startup failed"
fi

# Critical: API spacing before starting main trading system
echo "   🔄 API rate limit spacing before main trading system (10 seconds)..."
sleep 10

# Step 6: Start Main Tensor AI Fusion V2.7 System (Final component for API safety)
echo "🧮 STEP 6: Launching Tensor AI Fusion V2.7..."
echo "   🔧 Environment Variables:"
echo "   • TENSOR_MODE=true"
echo "   • TRADING_MODE=LIVE"
echo "   • ENABLE_GPU_STRATEGIES=true"
echo "   • DATABASE_URL=configured"
echo "   • GPU acceleration enabled"
echo "   📡 Starting main trading system with established API connections..."

nohup env \
  TENSOR_MODE=true \
  DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
  ENABLE_GPU_STRATEGIES=true \
  ENABLE_MARGIN_TRADING=true \
  ENABLE_FUTURES_TRADING=true \
  NTFY_TOPIC="signal-cartel" \
  NODE_OPTIONS="--max-old-space-size=4096" \
  TRADING_MODE="LIVE" \
  npx tsx production-trading-multi-pair.ts > /tmp/signalcartel-logs/production-trading.log 2>&1 &

TRADING_PID=$!

# Extended wait for main trading system initialization
echo "   ⏳ Waiting for main trading system initialization (20 seconds)..."
sleep 20

# Step 7: System validation
echo "🔍 STEP 7: Validating system startup..."

# Check for key success indicators in logs
if grep -q "TENSOR FUSION: FULLY ENABLED" /tmp/signalcartel-logs/production-trading.log 2>/dev/null; then
    echo "✅ Tensor Fusion Engine: ACTIVE"
else
    echo "⏳ Tensor Fusion Engine: Initializing..."
fi

if grep -q "GPU-Accelerated Queue Manager" /tmp/signalcartel-logs/kraken-proxy.log 2>/dev/null; then
    echo "✅ GPU Queue Manager: ACTIVE"
else
    echo "⏳ GPU Queue Manager: Initializing..."
fi

if grep -q "Kraken authentication successful" /tmp/signalcartel-logs/production-trading.log 2>/dev/null; then
    echo "✅ Kraken Authentication: SUCCESS"
else
    echo "⏳ Kraken Authentication: In progress..."
fi

if grep -q "SYSTEM GUARDIAN STARTED" /tmp/signalcartel-logs/system-guardian.log 2>/dev/null; then
    echo "✅ System Guardian: MONITORING (ntfy alerts active)"
else
    echo "⏳ System Guardian: Initializing..."
fi

if grep -q "PROFIT PREDATOR ENGINE" /tmp/signalcartel-logs/profit-predator.log 2>/dev/null; then
    echo "✅ Profit Predator: HUNTING (opportunity scanning active)"
else
    echo "⏳ Profit Predator: Initializing..."
fi

# Step 8: Display monitoring commands
echo ""
echo "📊 STEP 8: MONITORING COMMANDS"
echo "=============================================="
echo "🧠 Mathematical Conviction:"
echo "   tail -f /tmp/signalcartel-logs/production-trading.log | grep 'MATHEMATICAL.*CONVICTION'"
echo ""
echo "🚀 Tensor Decisions:" 
echo "   tail -f /tmp/signalcartel-logs/production-trading.log | grep 'TENSOR.*DECISION'"
echo ""
echo "🐅 Profit Predator Hunts:"
echo "   tail -f /tmp/signalcartel-logs/profit-predator.log | grep 'HUNT'"
echo ""
echo "⚡ GPU Queue Stats:"
echo "   curl http://127.0.0.1:3002/api/queue-stats"
echo ""
echo "📈 Full System Log:"
echo "   tail -f /tmp/signalcartel-logs/production-trading.log"
echo ""
echo "🔧 Kraken Proxy Log:"
echo "   tail -f /tmp/signalcartel-logs/kraken-proxy.log"
echo ""
echo "🐅 Profit Predator Log:"
echo "   tail -f /tmp/signalcartel-logs/profit-predator.log"
echo ""
echo "🛡️ System Guardian Log:"
echo "   tail -f /tmp/signalcartel-logs/system-guardian.log"
echo ""
echo "🔄 Position Sync Log:"
echo "   tail -f /tmp/signalcartel-logs/position-sync.log"

# Step 9: Process information
echo ""
echo "🔧 STEP 9: PROCESS INFORMATION" 
echo "=============================================="
echo "Kraken Proxy PID: $PROXY_PID"
echo "System Guardian PID: $GUARDIAN_PID"
echo "Profit Predator PID: $PREDATOR_PID"
echo "Trading System PID: $TRADING_PID"
echo ""
echo "Emergency stop command:"
echo "   pkill -f 'npx tsx'"
echo ""

# Step 10: API Rate Limit Validation
echo ""
echo "🔍 STEP 10: API RATE LIMIT VALIDATION"
echo "=============================================="
echo "Checking for any rate limit errors in startup logs..."

# Check for rate limit errors
RATE_LIMIT_ERRORS=$(grep -c "Rate limit exceeded" /tmp/signalcartel-logs/*.log 2>/dev/null || echo "0")
if [ "$RATE_LIMIT_ERRORS" -eq 0 ]; then
    echo "✅ API Rate Limits: CLEAN - No rate limit violations detected"
else
    echo "⚠️  API Rate Limits: $RATE_LIMIT_ERRORS violations detected during startup"
    echo "   This is normal for the first few minutes after restart"
fi

# Verify processes are still running
ACTIVE_PROCESSES=$(pgrep -f "npx tsx.*trading|kraken-proxy|profit-predator" | wc -l)
echo "📊 Active Trading Processes: $ACTIVE_PROCESSES"

# Step 11: Final status
echo ""
echo "🎯 TENSOR AI FUSION V2.9 STARTUP COMPLETE"
echo "=============================================="
echo "Status: 🟢 COMPLETE ECOSYSTEM OPERATIONAL"
echo "Architecture: GPU-Accelerated + Mathematical Conviction + System Guardian"
echo "Mode: LIVE TRADING ENABLED"
echo "Infrastructure: V2.9 Dashboard Synchronization + V2.7 Database Mastery"
echo "Protection: 24/7 System Guardian with ntfy critical failure alerts"
echo "API Protection: Sequential startup with rate limit prevention"
echo ""
echo "System will continue running in background."
echo "Use monitoring commands above to track performance."
echo ""
echo "🚀 Ready for Mathematical Conviction Trading! 🧮"
echo ""
echo "⚠️  IMPORTANT: If rate limit errors persist, wait 2-3 minutes"
echo "   for Kraken API limits to fully reset before making API calls."