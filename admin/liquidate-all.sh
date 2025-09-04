#!/bin/bash

echo "🚨 EMERGENCY LIQUIDATION - MANUAL TRIGGER"
echo "=========================================="
echo ""
echo "This will:"
echo "  1. Close all open positions in database"
echo "  2. Send liquidation webhooks to external API"
echo "  3. Convert all holdings to USD"
echo ""
read -p "Are you sure you want to liquidate ALL positions? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
    echo ""
    echo "🔥 Starting emergency liquidation..."
    
    DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
    npx tsx admin/emergency-liquidation.ts
    
    echo ""
    echo "✅ Emergency liquidation complete!"
    echo "   Check your external API for liquidation orders"
    echo "   All database positions have been closed"
else
    echo "❌ Liquidation cancelled"
fi