#!/bin/bash
# Clean dashboard restart script for real money trading

echo "🛑 Stopping all dashboard processes..."
pkill -f "pretty-pnl-dashboard.ts" 2>/dev/null || true
lsof -ti:3004 | xargs -r kill -9 2>/dev/null || true

echo "⏳ Waiting for processes to clean up..."
sleep 3

echo "🚀 Starting single clean dashboard instance..."
DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
npx tsx pretty-pnl-dashboard.ts &

echo "✅ Dashboard restarted cleanly at http://localhost:3004"
echo "📊 Your real money trading dashboard is ready!"