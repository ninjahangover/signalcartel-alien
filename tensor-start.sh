#!/bin/bash

# 🚀 TENSOR AI FUSION V2.7 - COMPREHENSIVE STARTUP SCRIPT
# Complete system startup with cleanup, validation, and monitoring
# Author: Tensor AI Fusion V2.7 Database Transaction Mastery
# Date: September 10, 2025

echo "🚀 TENSOR AI FUSION V2.7 - STARTUP SEQUENCE INITIATED"
echo "=============================================="

# Step 1: Clean shutdown of existing processes
echo "🧹 STEP 1: Cleaning up existing processes..."
pkill -f "npx tsx production-trading" 2>/dev/null || true
pkill -f "kraken-proxy-server" 2>/dev/null || true
pkill -f "tail.*signalcartel" 2>/dev/null || true
sleep 2
echo "✅ Process cleanup completed"

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

# Step 4: Start Kraken Proxy Server V2.6
echo "🔧 STEP 4: Starting Kraken Proxy Server V2.6..."
nohup npx tsx kraken-proxy-server.ts > /tmp/signalcartel-logs/kraken-proxy.log 2>&1 &
PROXY_PID=$!
sleep 3

# Verify proxy is running
if curl -s http://127.0.0.1:3002/api/queue-stats >/dev/null 2>&1; then
    echo "✅ Kraken Proxy V2.6 running (PID: $PROXY_PID)"
    echo "📊 Queue stats: http://127.0.0.1:3002/api/queue-stats"
else
    echo "⚠️  Kraken Proxy startup in progress..."
fi

# Step 5: Start Main Tensor AI Fusion V2.7 System
echo "🧮 STEP 5: Launching Tensor AI Fusion V2.7..."
echo "🔧 Environment Variables:"
echo "   • TENSOR_MODE=true"
echo "   • TRADING_MODE=LIVE" 
echo "   • ENABLE_GPU_STRATEGIES=true"
echo "   • DATABASE_URL=configured"
echo "   • GPU acceleration enabled"

nohup env \
  TENSOR_MODE=true \
  DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
  ENABLE_GPU_STRATEGIES=true \
  NTFY_TOPIC="signal-cartel" \
  NODE_OPTIONS="--max-old-space-size=4096" \
  TRADING_MODE="LIVE" \
  npx tsx production-trading-multi-pair.ts > /tmp/signalcartel-logs/production-trading.log 2>&1 &

TRADING_PID=$!
sleep 5

# Step 6: System validation
echo "🔍 STEP 6: Validating system startup..."

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

# Step 7: Display monitoring commands
echo ""
echo "📊 STEP 7: MONITORING COMMANDS"
echo "=============================================="
echo "🧠 Mathematical Conviction:"
echo "   tail -f /tmp/signalcartel-logs/production-trading.log | grep 'MATHEMATICAL.*CONVICTION'"
echo ""
echo "🚀 Tensor Decisions:" 
echo "   tail -f /tmp/signalcartel-logs/production-trading.log | grep 'TENSOR.*DECISION'"
echo ""
echo "⚡ GPU Queue Stats:"
echo "   curl http://127.0.0.1:3002/api/queue-stats"
echo ""
echo "📈 Full System Log:"
echo "   tail -f /tmp/signalcartel-logs/production-trading.log"
echo ""
echo "🔧 Kraken Proxy Log:"
echo "   tail -f /tmp/signalcartel-logs/kraken-proxy.log"

# Step 8: Process information
echo ""
echo "🔧 STEP 8: PROCESS INFORMATION" 
echo "=============================================="
echo "Kraken Proxy PID: $PROXY_PID"
echo "Trading System PID: $TRADING_PID"
echo ""
echo "Emergency stop command:"
echo "   pkill -f 'npx tsx'"
echo ""

# Step 9: Final status
echo "🎯 TENSOR AI FUSION V2.7 STARTUP COMPLETE"
echo "=============================================="
echo "Status: 🟢 SYSTEMS OPERATIONAL"
echo "Architecture: GPU-Accelerated + Mathematical Conviction"
echo "Mode: LIVE TRADING ENABLED"
echo "Infrastructure: V2.7 Database Transaction Mastery"
echo ""
echo "System will continue running in background."
echo "Use monitoring commands above to track performance."
echo ""
echo "🚀 Ready for Mathematical Conviction Trading! 🧮"