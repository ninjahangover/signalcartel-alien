#!/bin/bash

# 📊 SignalCartel Trading Status Check
# Quick overview of system status and recent activity

echo "📊 SIGNALCARTEL TRADING STATUS CHECK"
echo "===================================="

# Check running processes
echo "🔍 ACTIVE PROCESSES:"
TRADING_PROCS=$(pgrep -f "production-trading\|multi-pair\|signalcartel" | wc -l)
if [ "$TRADING_PROCS" -gt 0 ]; then
    echo "✅ $TRADING_PROCS trading processes running"
    pgrep -f "production-trading\|multi-pair\|signalcartel" | xargs ps -o pid,cmd | head -5
else
    echo "❌ No trading processes found"
fi

echo ""
echo "💰 ACCOUNT & POSITIONS:"
echo "======================"

# Check database for recent activity
echo "🔍 Checking database for recent positions..."
PGPASSWORD=quantum_forge_warehouse_2024 docker exec signalcartel-warehouse psql -U warehouse_user -d signalcartel -c "
SELECT 
    COUNT(*) as total_positions,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_positions,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_positions,
    SUM(CASE WHEN \"realizedPnL\" IS NOT NULL THEN \"realizedPnL\" ELSE 0 END)::numeric(8,2) as total_pnl,
    MAX(\"createdAt\") as last_activity
FROM \"ManagedPosition\" 
WHERE \"createdAt\" > NOW() - INTERVAL '1 hour';" 2>/dev/null || echo "⚠️ Database check failed"

echo ""
echo "📋 RECENT LOGS:"
echo "==============="
if [ -f "/tmp/signalcartel-logs/production-trading.log" ]; then
    echo "📄 Last 10 lines of trading log:"
    tail -10 /tmp/signalcartel-logs/production-trading.log
else
    echo "❌ No trading log found"
fi

echo ""
echo "🚨 QUICK ACTIONS:"
echo "================"
echo "Stop all trading:  ./admin/emergency-stop.sh"
echo "View live logs:    tail -f /tmp/signalcartel-logs/production-trading.log"
echo "Check positions:   [database query above]"