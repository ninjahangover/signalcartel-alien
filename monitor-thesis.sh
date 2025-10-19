#!/bin/bash
# Monitor Trade Thesis Engine predictions in real-time

echo "📈 Monitoring Trade Thesis Engine Predictions..."
echo "================================================"
echo ""
echo "Watching for:"
echo "  • 📈 Trade Thesis Prediction - AI target/stop predictions"
echo "  • 🔥 KRAKEN API - Actual order placement"
echo "  • ✅ POSITION OPENED - Trade confirmation"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

tail -f /tmp/signalcartel-logs/production-trading.log | stdbuf -oL grep -E "(Trade Thesis Prediction|Target:|Stop:|R:R:|Reasoning:|🔥 KRAKEN API|✅ POSITION OPENED|✅ REAL POSITION)" --line-buffered
