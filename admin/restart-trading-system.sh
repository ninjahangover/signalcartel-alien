#!/bin/bash

# SignalCartel QUANTUM FORGE™ - Automated System Restart Script
# This script handles complete system restart with optional Phase 0 reset

set -e  # Exit on any error

echo "🚀 QUANTUM FORGE™ SYSTEM RESTART"
echo "=================================="

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

# Function to reset to Phase 0 (optional)
reset_to_phase0() {
    echo ""
    echo "🎯 PHASE 0 RESET OPTIONS:"
    echo "1. Keep current progress (Phase 2 with 613+ positions)"
    echo "2. Reset to Phase 0 (Clean $10,000 balance, fresh start)"
    echo ""
    read -p "Enter choice (1 or 2): " choice
    
    case $choice in
        2)
            echo "🔄 Executing Phase 0 reset..."
            DATABASE_URL="$DATABASE_URL" npx tsx admin/simple-system-reset.ts
            echo "✅ Phase 0 reset complete - Fresh $10,000 balance"
            ;;
        1)
            echo "✅ Keeping current Phase 2 progress"
            ;;
        *)
            echo "⚠️ Invalid choice, keeping current progress"
            ;;
    esac
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
        echo "❌ Trading Engine: Failed to start"
    fi
    
    if ps -p $(cat "$LOG_DIR/hunter.pid" 2>/dev/null) > /dev/null 2>&1; then
        echo "✅ Smart Hunter: Running"
    else
        echo "❌ Smart Hunter: Failed to start"
    fi
    
    # Check database activity
    echo "📊 Database status:"
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
    echo "Starting automated system restart..."
    echo ""
    
    # Step 1: Stop existing processes
    kill_processes
    
    # Step 2: Check database
    check_database
    
    # Step 3: Optional Phase 0 reset
    reset_to_phase0
    
    # Step 4: Start systems
    start_systems
    
    # Step 5: Verify everything is running
    verify_systems
    
    # Step 6: Show monitoring info
    show_monitoring
    
    echo "🎉 SYSTEM RESTART COMPLETE!"
    echo ""
    echo "🎯 Pine Script Foundation System is now active"
    echo "💰 Phase-based intelligence system operational"
    echo "🔥 Smart Hunter finding profitable opportunities"
    echo ""
}

# Run main function
main