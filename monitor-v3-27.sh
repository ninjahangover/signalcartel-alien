#!/bin/bash
# Monitor V3.14.27 Proactive Entry Validation
echo "🎯 V3.14.27 PROACTIVE ENTRY VALIDATION MONITOR"
echo "=============================================="
echo ""
tail -f /tmp/signalcartel-logs/production-trading.log | stdbuf -oL grep -E "(V3.14.27|PROACTIVE VALIDATION|ENTRY BLOCKED|ENTRY APPROVED|Momentum:|Timing:|Risk-Reward:|🔥 KRAKEN API: Placing)" --line-buffered
