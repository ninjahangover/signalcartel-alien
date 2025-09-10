#!/bin/bash

# 🚀 TENSOR AI FUSION V2.7 - IMPROVED STARTUP SCRIPT
# Complete system startup with better error handling and validation
# Date: September 10, 2025

echo "🚀 TENSOR AI FUSION V2.7 - STARTUP SEQUENCE INITIATED"
echo "=============================================="
echo ""

# Function to check if process is running
check_process() {
    if ps -p $1 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Step 1: Clean shutdown of existing processes
echo "🧹 STEP 1: Cleaning up existing processes..."
echo "   Stopping trading system..."
pkill -f "npx tsx production-trading" 2>/dev/null || true
echo "   Stopping proxy server..."
pkill -f "kraken-proxy-server" 2>/dev/null || true
echo "   Stopping monitors..."
pkill -f "tail.*signalcartel" 2>/dev/null || true
sleep 3
echo "✅ Process cleanup completed"
echo ""

# Step 2: Verify required directories exist
echo "📁 STEP 2: Ensuring log directories exist..."
mkdir -p /tmp/signalcartel-logs
echo "✅ Log directories ready"
echo ""

# Step 3: Start Kraken Proxy Server V2.6
echo "🔧 STEP 3: Starting Kraken Proxy Server V2.6..."
echo "   Launching proxy server..."
npx tsx kraken-proxy-server.ts > /tmp/signalcartel-logs/kraken-proxy.log 2>&1 &
PROXY_PID=$!
echo "   Proxy PID: $PROXY_PID"

# Wait for proxy to be ready
echo "   Waiting for proxy to initialize..."
for i in {1..10}; do
    sleep 1
    if curl -s http://127.0.0.1:3002/api/queue-stats >/dev/null 2>&1; then
        echo "✅ Kraken Proxy V2.6 running and ready!"
        echo "   📊 Queue stats: http://127.0.0.1:3002/api/queue-stats"
        break
    elif [ $i -eq 10 ]; then
        echo "❌ Kraken Proxy failed to start!"
        echo "   Last 10 lines of proxy log:"
        tail -n 10 /tmp/signalcartel-logs/kraken-proxy.log
        exit 1
    fi
done
echo ""

# Step 4: Start Main Tensor AI Fusion V2.7 System
echo "🧮 STEP 4: Launching Tensor AI Fusion V2.7..."
echo "   Environment Configuration:"
echo "   • TENSOR_MODE=true"
echo "   • TRADING_MODE=LIVE" 
echo "   • ENABLE_GPU_STRATEGIES=true"
echo "   • DATABASE_URL=configured"
echo ""

echo "   Starting trading system..."
TENSOR_MODE=true \
DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
ENABLE_GPU_STRATEGIES=true \
NTFY_TOPIC="signal-cartel" \
NODE_OPTIONS="--max-old-space-size=4096" \
TRADING_MODE="LIVE" \
npx tsx production-trading-multi-pair.ts > /tmp/signalcartel-logs/production-trading.log 2>&1 &

TRADING_PID=$!
echo "   Trading PID: $TRADING_PID"
echo ""

# Step 5: System validation with proper wait
echo "🔍 STEP 5: Validating system startup..."
echo "   Waiting for systems to initialize (up to 30 seconds)..."

SYSTEMS_READY=false
for i in {1..6}; do
    sleep 5
    echo "   Checking system status (attempt $i/6)..."
    
    # Check if processes are still running
    if ! check_process $PROXY_PID; then
        echo "❌ Kraken Proxy crashed! Check logs:"
        tail -n 20 /tmp/signalcartel-logs/kraken-proxy.log
        exit 1
    fi
    
    if ! check_process $TRADING_PID; then
        echo "❌ Trading system crashed! Check logs:"
        tail -n 20 /tmp/signalcartel-logs/production-trading.log
        exit 1
    fi
    
    # Check for successful initialization
    TENSOR_OK=false
    GPU_OK=false
    KRAKEN_OK=false
    
    if grep -q "TENSOR FUSION: FULLY ENABLED" /tmp/signalcartel-logs/production-trading.log 2>/dev/null; then
        TENSOR_OK=true
    fi
    
    if grep -q "GPU-Accelerated Queue Manager" /tmp/signalcartel-logs/kraken-proxy.log 2>/dev/null; then
        GPU_OK=true
    fi
    
    if grep -q "Kraken authentication successful" /tmp/signalcartel-logs/production-trading.log 2>/dev/null; then
        KRAKEN_OK=true
    fi
    
    if [ "$TENSOR_OK" = true ] && [ "$GPU_OK" = true ]; then
        SYSTEMS_READY=true
        echo ""
        echo "✅ Core systems initialized successfully!"
        [ "$TENSOR_OK" = true ] && echo "   ✅ Tensor Fusion Engine: ACTIVE"
        [ "$GPU_OK" = true ] && echo "   ✅ GPU Queue Manager: ACTIVE"
        [ "$KRAKEN_OK" = true ] && echo "   ✅ Kraken Authentication: SUCCESS" || echo "   ⏳ Kraken Authentication: In progress..."
        break
    fi
done

if [ "$SYSTEMS_READY" = false ]; then
    echo ""
    echo "⚠️  Systems still initializing after 30 seconds"
    echo "   Check the logs for details:"
    echo "   • Trading log: tail -f /tmp/signalcartel-logs/production-trading.log"
    echo "   • Proxy log: tail -f /tmp/signalcartel-logs/kraken-proxy.log"
fi
echo ""

# Step 6: Display monitoring commands
echo "📊 MONITORING COMMANDS"
echo "=============================================="
echo ""
echo "🧠 Watch Mathematical Conviction:"
echo "   tail -f /tmp/signalcartel-logs/production-trading.log | grep --color=always 'MATHEMATICAL.*CONVICTION'"
echo ""
echo "🚀 Watch Tensor Decisions:" 
echo "   tail -f /tmp/signalcartel-logs/production-trading.log | grep --color=always 'TENSOR.*DECISION'"
echo ""
echo "❌ Watch for Errors:"
echo "   tail -f /tmp/signalcartel-logs/production-trading.log | grep --color=always -i 'error\\|fail'"
echo ""
echo "⚡ Check GPU Queue Stats:"
echo "   curl http://127.0.0.1:3002/api/queue-stats | jq ."
echo ""
echo "📈 Full Trading Log:"
echo "   tail -f /tmp/signalcartel-logs/production-trading.log"
echo ""
echo "🔧 Full Proxy Log:"
echo "   tail -f /tmp/signalcartel-logs/kraken-proxy.log"
echo ""

# Step 7: Process management info
echo "🔧 PROCESS MANAGEMENT"
echo "=============================================="
echo "Running processes:"
echo "   • Kraken Proxy PID: $PROXY_PID"
echo "   • Trading System PID: $TRADING_PID"
echo ""
echo "Stop all systems:"
echo "   pkill -f 'npx tsx'"
echo ""
echo "Restart script:"
echo "   ./tensor-start-v2.sh"
echo ""

# Step 8: Final status
echo "🎯 TENSOR AI FUSION V2.7 STARTUP STATUS"
echo "=============================================="
if check_process $PROXY_PID && check_process $TRADING_PID; then
    echo "✅ Status: SYSTEMS OPERATIONAL"
    echo "✅ Both processes running:"
    ps -p $PROXY_PID -o pid,etime,cmd --no-headers | head -n 1
    ps -p $TRADING_PID -o pid,etime,cmd --no-headers | head -n 1
else
    echo "⚠️  Status: PARTIAL STARTUP"
    check_process $PROXY_PID && echo "✅ Proxy: Running" || echo "❌ Proxy: Not running"
    check_process $TRADING_PID && echo "✅ Trading: Running" || echo "❌ Trading: Not running"
fi
echo ""
echo "Architecture: GPU-Accelerated + Mathematical Conviction"
echo "Mode: LIVE TRADING ENABLED"
echo "Infrastructure: V2.7 Database Transaction Mastery"
echo ""
echo "🚀 System running in background - use monitoring commands above"
echo ""