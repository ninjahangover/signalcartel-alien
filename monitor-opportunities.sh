#!/bin/bash

echo "🔍 OPPORTUNITY MONITORING SCRIPT"
echo "================================="
echo ""
echo "Monitoring trading decisions and capital rotation attempts..."
echo ""

# Monitor for 5 minutes and count key events
echo "📊 Real-time Monitoring (press Ctrl+C to stop):"
echo ""

tail -f /tmp/signalcartel-logs/production-trading.log | while read line; do
    # Highlight trading decisions
    if echo "$line" | grep -q "TENSOR DECISION: TRADE"; then
        echo "🎯 TRADE SIGNAL: $line" | grep --color=always "TRADE"
    fi

    # Highlight skipped trades
    if echo "$line" | grep -q "SKIP BUY\|SKIP SELL\|SKIP TRADE"; then
        echo "⏭️ SKIPPED: $line" | grep --color=always "SKIP"
    fi

    # Highlight exit score calculations
    if echo "$line" | grep -q "EXIT CALCULATION DEBUG\|FINAL EXIT SCORE"; then
        echo "🔄 EXIT LOGIC: $line" | grep --color=always "EXIT"
    fi

    # Highlight capital rotation
    if echo "$line" | grep -q "capital rotation\|position rotation\|ROTATION"; then
        echo "💱 ROTATION: $line" | grep --color=always "rotation"
    fi

    # Highlight insufficient funds
    if echo "$line" | grep -q "Insufficient funds"; then
        echo "💸 NO CAPITAL: $line" | grep --color=always "Insufficient"
    fi

    # Highlight opportunities
    if echo "$line" | grep -q "opportunity\|OPPORTUNITY"; then
        echo "💡 OPPORTUNITY: $line" | grep --color=always "opportunity"
    fi
done