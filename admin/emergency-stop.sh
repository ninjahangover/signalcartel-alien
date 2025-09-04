#!/bin/bash

# 🚨 EMERGENCY STOP SCRIPT 🚨
# Immediately stops all SignalCartel trading processes
# Use this script if you need to stop trading IMMEDIATELY

echo "🚨 EMERGENCY STOP INITIATED 🚨"
echo "================================"
echo "Stopping all SignalCartel trading processes..."

# Kill all trading processes by pattern matching
echo "🔥 Stopping production trading engines..."
pkill -f "production-trading" && echo "✅ Production trading stopped" || echo "⚠️ No production trading processes found"

echo "🔥 Stopping multi-pair trading..."
pkill -f "multi-pair" && echo "✅ Multi-pair trading stopped" || echo "⚠️ No multi-pair processes found"

echo "🔥 Stopping any TypeScript trading processes..."
pkill -f "npx tsx.*trading" && echo "✅ TypeScript trading processes stopped" || echo "⚠️ No TypeScript trading processes found"

echo "🔥 Stopping heartbeat monitors..."
pkill -f "signalcartel-heartbeat" && echo "✅ Heartbeat monitors stopped" || echo "⚠️ No heartbeat processes found"

echo "🔥 Stopping alert systems..."
pkill -f "trading-alerts" && echo "✅ Alert systems stopped" || echo "⚠️ No alert processes found"

echo ""
echo "🛑 EMERGENCY STOP COMPLETE 🛑"
echo "==============================="
echo "📊 Checking for remaining processes..."

# Check if any processes are still running
REMAINING=$(pgrep -f "production-trading\|multi-pair\|signalcartel" | wc -l)
if [ "$REMAINING" -gt 0 ]; then
    echo "⚠️ WARNING: $REMAINING processes still running"
    echo "🔍 Remaining processes:"
    pgrep -f "production-trading\|multi-pair\|signalcartel" | xargs ps -p
    echo ""
    echo "💀 If needed, force kill with: sudo pkill -9 -f 'trading'"
else
    echo "✅ ALL TRADING PROCESSES STOPPED SUCCESSFULLY"
fi

echo ""
echo "📋 POST-STOP CHECKLIST:"
echo "========================"
echo "1. ✅ All trading processes stopped"
echo "2. 🔍 Check Kraken account for any open positions"
echo "3. 📊 Review trading logs: tail -50 /tmp/signalcartel-logs/production-trading.log"
echo "4. 💾 Check database for position status if needed"
echo ""
echo "🔄 To restart trading:"
echo "   PAPER MODE: Remove TRADING_MODE env var"
echo "   LIVE MODE:  TRADING_MODE=\"LIVE\" [trading command]"