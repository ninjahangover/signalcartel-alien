#!/bin/bash
# Monitor V3.14.27.1 Entry Approvals - Watch for successful trades
# Shows: OHLC fetches, momentum scores, overall confidence, and approval status

echo "📊 V3.14.27.1 PROACTIVE ENTRY MONITOR"
echo "====================================="
echo "Watching for entry approvals..."
echo ""
echo "Legend:"
echo "  🟢 APPROVED - Entry passed all validations"
echo "  🔴 BLOCKED  - Entry blocked (momentum/timing/confidence)"
echo "  📊 DATA     - OHLC fetch successful (100 prices/volumes)"
echo ""

tail -f /tmp/signalcartel-logs/production-trading.log | stdbuf -oL grep --line-buffered -E "(V3.14.27.1 OHLC FETCH|Overall Confidence:|Momentum:.*[0-9]|✅ V3.14.27 ENTRY APPROVED|🚫 V3.14.27 ENTRY BLOCKED)" | while read line; do
  if [[ "$line" =~ "OHLC FETCH" ]]; then
    echo "📊 $line"
  elif [[ "$line" =~ "Overall Confidence" ]]; then
    # Extract confidence percentage
    confidence=$(echo "$line" | grep -oP '\d+\.\d+%' | head -1)
    if (( $(echo "${confidence%\%} >= 60" | bc -l) )); then
      echo "  ✅ Confidence: $confidence (STRONG)"
    elif (( $(echo "${confidence%\%} >= 50" | bc -l) )); then
      echo "  ⚠️  Confidence: $confidence (moderate)"
    else
      echo "  ❌ Confidence: $confidence (weak)"
    fi
  elif [[ "$line" =~ "Momentum:" ]]; then
    # Extract momentum strength
    momentum=$(echo "$line" | grep -oP '\d+/100' | head -1)
    strength=${momentum%/*}
    if (( strength >= 60 )); then
      echo "  🟢 Momentum: $momentum (STRONG - likely to pass)"
    elif (( strength >= 40 )); then
      echo "  🟡 Momentum: $momentum (acceptable)"
    elif (( strength >= 20 )); then
      echo "  🟠 Momentum: $momentum (weak)"
    else
      echo "  🔴 Momentum: $momentum (very weak)"
    fi
  elif [[ "$line" =~ "✅ V3.14.27 ENTRY APPROVED" ]]; then
    echo "🟢 APPROVED: $line"
    echo "  🎉 TRADE EXECUTING - proactive validation passed!"
    echo ""
  elif [[ "$line" =~ "🚫 V3.14.27 ENTRY BLOCKED" ]]; then
    echo "🔴 BLOCKED: $line"
    echo ""
  fi
done
