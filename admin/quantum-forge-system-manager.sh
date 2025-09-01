#!/bin/bash

# QUANTUM FORGE™ SYSTEM MANAGER
# Quick reference and management script for all system operations

show_status() {
    echo "🔍 QUANTUM FORGE™ SYSTEM STATUS"
    echo "═══════════════════════════════════════════════════════════════"
    
    LOG_DIR="/tmp/signalcartel-logs"
    
    # Check running processes
    if [ -f "$LOG_DIR/master-pipeline.pid" ]; then
        PIPELINE_PID=$(cat "$LOG_DIR/master-pipeline.pid")
        if kill -0 "$PIPELINE_PID" 2>/dev/null; then
            echo "✅ Master Trading Pipeline: Running (PID: $PIPELINE_PID)"
        else
            echo "❌ Master Trading Pipeline: Not running"
        fi
    else
        echo "❌ Master Trading Pipeline: Not running"
    fi
    
    if [ -f "$LOG_DIR/smart-hunter.pid" ]; then
        HUNTER_PID=$(cat "$LOG_DIR/smart-hunter.pid")
        if kill -0 "$HUNTER_PID" 2>/dev/null; then
            echo "✅ Smart Hunter Service: Running (PID: $HUNTER_PID)"
        else
            echo "❌ Smart Hunter Service: Not running"
        fi
    else
        echo "❌ Smart Hunter Service: Not running"
    fi
    
    # Check database
    if PGPASSWORD=quantum_forge_warehouse_2024 docker exec signalcartel-warehouse psql -U warehouse_user -d signalcartel -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Database: Connected"
        
        # Get current data counts
        POSITIONS=$(PGPASSWORD=quantum_forge_warehouse_2024 docker exec signalcartel-warehouse psql -U warehouse_user -d signalcartel -t -c "SELECT COUNT(*) FROM \"ManagedPosition\";" 2>/dev/null | xargs || echo "0")
        TRADES=$(PGPASSWORD=quantum_forge_warehouse_2024 docker exec signalcartel-warehouse psql -U warehouse_user -d signalcartel -t -c "SELECT COUNT(*) FROM \"ManagedTrade\";" 2>/dev/null | xargs || echo "0")
        
        echo "📊 Current Data:"
        echo "   • Positions: $POSITIONS"
        echo "   • Trades: $TRADES"
    else
        echo "❌ Database: Not connected"
    fi
    
    echo
}

show_logs() {
    LOG_DIR="/tmp/signalcartel-logs"
    echo "📁 LOG FILES:"
    echo "═══════════════════════════════════════════════════════════════"
    
    if [ -f "$LOG_DIR/production-trading.log" ]; then
        LINES=$(wc -l < "$LOG_DIR/production-trading.log")
        echo "📊 Trading Log: $LINES lines"
        echo "   tail -f $LOG_DIR/production-trading.log"
    else
        echo "📊 Trading Log: Not found"
    fi
    
    if [ -f "$LOG_DIR/profit-preditor.log" ]; then
        LINES=$(wc -l < "$LOG_DIR/profit-preditor.log")
        echo "🎯 Smart Hunter Log: $LINES lines"
        echo "   tail -f $LOG_DIR/profit-preditor.log"
    else
        echo "🎯 Smart Hunter Log: Not found"
    fi
    
    echo "📁 All logs: ls -la $LOG_DIR/"
    echo
}

show_help() {
    echo "🚀 QUANTUM FORGE™ SYSTEM MANAGER"
    echo "═══════════════════════════════════════════════════════════════"
    echo
    echo "📋 SYSTEM OPERATIONS:"
    echo "   start       - Start the complete Master Trading Pipeline"
    echo "   stop        - Gracefully shutdown all systems"
    echo "   restart     - Stop then start (full restart)"
    echo "   status      - Show current system status"
    echo "   logs        - Show log information and tail commands"
    echo "   reset       - Reset system to Phase 0 with clean $10K balance"
    echo
    echo "🎯 MASTER TRADING PIPELINE FEATURES:"
    echo "   • Mandatory Sequential Execution:"
    echo "     1. Dynamic Strategy Calibration (REQUIRED)"
    echo "     2. Profit Predator Opportunity Validation"
    echo "     3. AI Trading Engine with Calibrated Parameters"
    echo "   • Hot Opportunity Trading (WLFIUSD 85%, ETHUSD 80%)"
    echo "   • Symbol-Specific Parameter Optimization"
    echo "   • Graceful Shutdown with Data Integrity"
    echo
    echo "📁 LOG LOCATIONS:"
    echo "   • Main Trading: /tmp/signalcartel-logs/production-trading.log"
    echo "   • Smart Hunter: /tmp/signalcartel-logs/profit-preditor.log" 
    echo "   • System Status: /tmp/signalcartel-logs/monitor-system.sh"
    echo
    echo "🔧 MANUAL COMMANDS:"
    echo "   • Start: ./admin/start-quantum-forge-with-monitor.sh"
    echo "   • Stop:  ./admin/stop-quantum-forge-gracefully.sh"
    echo "   • Reset: npx tsx admin/simple-system-reset.ts"
    echo
}

case "$1" in
    "start")
        echo "🚀 Starting QUANTUM FORGE™ Master Trading Pipeline..."
        exec ./admin/start-quantum-forge-with-monitor.sh
        ;;
    "stop")
        echo "🛑 Stopping QUANTUM FORGE™ systems gracefully..."
        exec ./admin/stop-quantum-forge-gracefully.sh
        ;;
    "restart")
        echo "🔄 Restarting QUANTUM FORGE™ systems..."
        ./admin/stop-quantum-forge-gracefully.sh
        sleep 3
        exec ./admin/start-quantum-forge-with-monitor.sh
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "reset")
        echo "🧹 Resetting system to Phase 0..."
        echo "⚠️  This will delete ALL trading data and reset to $10K balance"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
            npx tsx admin/simple-system-reset.ts
        else
            echo "Reset cancelled."
        fi
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "Use './admin/quantum-forge-system-manager.sh help' for usage"
        exit 1
        ;;
esac