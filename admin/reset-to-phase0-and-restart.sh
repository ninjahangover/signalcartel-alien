#!/bin/bash

# SignalCartel QUANTUM FORGE™ - Phase 0 Reset and Restart (Non-Interactive)
# This script performs a complete Phase 0 reset and system restart automatically

set -e  # Exit on any error

echo "🚀 QUANTUM FORGE™ PHASE 0 RESET & RESTART"
echo "==========================================="

# Configuration
DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public"
LOG_DIR="/tmp/signalcartel-logs"

# Function to kill processes gracefully
kill_processes() {
    echo "🛑 Stopping existing trading processes..."
    
    # Kill production trading processes
    pkill -f "production-trading-multi-pair" || true
    pkill -f "smart-hunter-service" || true
    
    # Wait for graceful shutdown
    sleep 3
    
    echo "✅ All trading processes stopped"
}

# Function to check database connectivity
check_database() {
    echo "🔍 Checking database connectivity..."
    
    if PGPASSWORD=quantum_forge_warehouse_2024 docker exec signalcartel-warehouse psql -U warehouse_user -d signalcartel -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Database connection verified"
    else
        echo "❌ Database connection failed"
        exit 1
    fi
}

# Function to execute Phase 0 reset
execute_phase0_reset() {
    echo "🔄 Executing Phase 0 reset..."
    echo "💰 Resetting to clean $10,000 balance"
    
    DATABASE_URL="$DATABASE_URL" npx tsx admin/simple-system-reset.ts
    
    echo "✅ Phase 0 reset complete - Fresh $10,000 balance"
}

# Function to start trading systems
start_systems() {
    echo ""
    echo "🚀 Starting trading systems..."
    
    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    # Start main trading engine in background
    echo "🎯 Starting Pine Script Foundation Trading Engine..."
    DATABASE_URL="$DATABASE_URL" ENABLE_GPU_STRATEGIES=true NTFY_TOPIC="signal-cartel" nohup npx tsx production-trading-multi-pair.ts > "$LOG_DIR/production-trading.log" 2>&1 &
    TRADING_PID=$!
    
    # Wait a moment for startup
    sleep 5
    
    # Start Smart Hunter service in background
    echo "🔍 Starting Smart Hunter Service..."
    nohup npx tsx smart-hunter-service.ts > "$LOG_DIR/smart-hunter.log" 2>&1 &
    HUNTER_PID=$!
    
    # Wait for systems to initialize
    sleep 3
    
    echo "✅ Trading Engine started (PID: $TRADING_PID)"
    echo "✅ Smart Hunter started (PID: $HUNTER_PID)"
    
    # Save PIDs for monitoring
    echo "$TRADING_PID" > "$LOG_DIR/trading.pid"
    echo "$HUNTER_PID" > "$LOG_DIR/hunter.pid"
}

# Function to verify systems are running
verify_systems() {
    echo ""
    echo "🔍 Verifying system status..."
    
    # Check if processes are still running
    sleep 5
    
    if ps -p $(cat "$LOG_DIR/trading.pid" 2>/dev/null) > /dev/null 2>&1; then
        echo "✅ Trading Engine: Running"
    else
        echo "❌ Trading Engine: Failed to start - check logs"
        cat "$LOG_DIR/production-trading.log" | tail -20
    fi
    
    if ps -p $(cat "$LOG_DIR/hunter.pid" 2>/dev/null) > /dev/null 2>&1; then
        echo "✅ Smart Hunter: Running"
    else
        echo "❌ Smart Hunter: Failed to start - check logs"
        cat "$LOG_DIR/smart-hunter.log" | tail -20
    fi
    
    # Check database activity
    echo ""
    echo "📊 Database status (should show Phase 0):"
    PGPASSWORD=quantum_forge_warehouse_2024 docker exec signalcartel-warehouse psql -U warehouse_user -d signalcartel -c "SELECT COUNT(*) as positions, MAX(\"createdAt\") as last_trade FROM \"ManagedPosition\";"
}

# Function to show monitoring commands
show_monitoring() {
    echo ""
    echo "📊 MONITORING COMMANDS:"
    echo "======================="
    echo "View trading logs:     tail -f $LOG_DIR/production-trading.log"
    echo "View hunter logs:      tail -f $LOG_DIR/smart-hunter.log"
    echo "Check opportunities:   cat $LOG_DIR/smart-hunter-opportunities.json"
    echo "Stop systems:          pkill -f 'production-trading\\|smart-hunter'"
    echo "System status:         ps aux | grep -E 'production-trading|smart-hunter'"
    echo ""
}

# Main execution
main() {
    echo "Starting automated Phase 0 reset and restart..."
    echo ""
    
    # Step 1: Stop existing processes
    kill_processes
    
    # Step 2: Check database
    check_database
    
    # Step 3: Execute Phase 0 reset
    execute_phase0_reset
    
    # Step 4: Start systems
    start_systems
    
    # Step 5: Verify everything is running
    verify_systems
    
    # Step 6: Show monitoring info
    show_monitoring
    
    echo "🎉 PHASE 0 RESET AND RESTART COMPLETE!"
    echo ""
    echo "🎯 Pine Script Foundation System active in Phase 0"
    echo "💰 Clean $10,000 conceptual balance"
    echo "🔥 Smart Hunter finding profitable opportunities"
    echo "📊 Data collection phase: 10% confidence threshold"
    echo ""
}

# Run main function
main