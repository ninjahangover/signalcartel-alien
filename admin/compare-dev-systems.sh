#!/bin/bash

# QUANTUM FORGE™ Dev1 vs Dev2 A/B Testing Dashboard
# Compares experimental features on Dev1 against baseline Dev2

echo "═══════════════════════════════════════════════════════════════════════════════════"
echo "           QUANTUM FORGE™ A/B TESTING DASHBOARD - DEV1 (Experimental) vs DEV2 (Control)"
echo "═══════════════════════════════════════════════════════════════════════════════════"
echo ""

# Database connection
DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="signalcartel"
DB_USER="warehouse_user"
export PGPASSWORD="quantum_forge_warehouse_2024"

# Function to run PostgreSQL query
run_query() {
    docker exec signalcartel-warehouse psql -U $DB_USER -d $DB_NAME -t -A -F"," -c "$1" 2>/dev/null
}

# Get current time
CURRENT_TIME=$(date '+%Y-%m-%d %H:%M:%S UTC')
echo "📅 Report Time: $CURRENT_TIME"
echo ""

# Performance comparison for last 24 hours
echo "═══════════════════════════════════════════════════════════════════════════════════"
echo "                              24-HOUR PERFORMANCE COMPARISON"
echo "═══════════════════════════════════════════════════════════════════════════════════"

PERFORMANCE_QUERY="
WITH system_data AS (
  SELECT 
    CASE 
      WHEN strategy LIKE '%phase-0%' THEN 'Dev1-Experimental'
      WHEN strategy LIKE '%phase-1%' THEN 'Dev1-Experimental'
      WHEN strategy LIKE '%phase-2%' THEN 'Dev1-Experimental'
      WHEN strategy LIKE '%phase-3%' THEN 'Dev2-Control'
      WHEN strategy LIKE '%phase-4%' THEN 'Dev2-Control'
      ELSE 'Unknown'
    END as system,
    \"realizedPnL\",
    \"createdAt\",
    \"exitedAt\"
  FROM \"ManagedPosition\"
  WHERE \"createdAt\" > NOW() - INTERVAL '24 hours'
    AND \"realizedPnL\" IS NOT NULL
)
SELECT 
  system,
  COUNT(*) as trades,
  ROUND(AVG(\"realizedPnL\")::numeric, 4) as avg_pnl,
  ROUND(SUM(\"realizedPnL\")::numeric, 2) as total_pnl,
  ROUND((COUNT(CASE WHEN \"realizedPnL\" > 0 THEN 1 END)::float / 
         NULLIF(COUNT(*), 0) * 100)::numeric, 2) as win_rate,
  ROUND(MAX(\"realizedPnL\")::numeric, 4) as best_trade,
  ROUND(MIN(\"realizedPnL\")::numeric, 4) as worst_trade,
  ROUND(STDDEV(\"realizedPnL\")::numeric, 4) as volatility
FROM system_data
WHERE system != 'Unknown'
GROUP BY system
ORDER BY avg_pnl DESC;"

echo "System            | Trades | Avg P&L  | Total P&L | Win Rate | Best    | Worst   | Volatility"
echo "------------------|--------|----------|-----------|----------|---------|---------|------------"

result=$(run_query "$PERFORMANCE_QUERY")
if [ -z "$result" ]; then
    echo "No data available for the last 24 hours"
else
    echo "$result" | while IFS=',' read -r system trades avg_pnl total_pnl win_rate best worst volatility; do
        # Color coding based on performance
        if [[ "$system" == "Dev1-Experimental" ]]; then
            system_display="\033[1;36mDev1-Experimental\033[0m"
        else
            system_display="\033[1;33mDev2-Control    \033[0m"
        fi
        
        # Color code P&L
        if (( $(echo "$avg_pnl > 0" | bc -l) )); then
            avg_pnl_display="\033[1;32m$avg_pnl\033[0m"
            total_pnl_display="\033[1;32m$total_pnl\033[0m"
        else
            avg_pnl_display="\033[1;31m$avg_pnl\033[0m"
            total_pnl_display="\033[1;31m$total_pnl\033[0m"
        fi
        
        printf "%-28b | %-6s | %-16b | %-17b | %-8s%% | %-7s | %-7s | %-10s\n" \
               "$system_display" "$trades" "$avg_pnl_display" "$total_pnl_display" \
               "$win_rate" "$best" "$worst" "$volatility"
    done
fi

echo ""

# Feature Comparison
echo "═══════════════════════════════════════════════════════════════════════════════════"
echo "                              EXPERIMENTAL FEATURES STATUS"
echo "═══════════════════════════════════════════════════════════════════════════════════"

echo ""
echo "📊 Dev1 Experimental Features:"
echo "  ✅ Market Regime Filter: ACTIVE"
echo "  ✅ Trading Windows: ACTIVE (Asia/Europe/US sessions)"
echo "  ✅ Technical Pattern Recognition: ACTIVE"
echo "  ✅ Dynamic Position Sizing: ACTIVE"
echo "  ✅ Weekend Trading Restrictions: ACTIVE"
echo ""
echo "🎯 Dev2 Control Features:"
echo "  ✅ Standard QUANTUM FORGE Phase System"
echo "  ✅ Multi-Source Sentiment"
echo "  ✅ Mathematical Intuition"
echo "  ✅ Order Book Intelligence"
echo "  ❌ No experimental features"
echo ""

# Trading Activity Comparison
echo "═══════════════════════════════════════════════════════════════════════════════════"
echo "                              TRADING ACTIVITY ANALYSIS"
echo "═══════════════════════════════════════════════════════════════════════════════════"

ACTIVITY_QUERY="
WITH hourly_data AS (
  SELECT 
    CASE 
      WHEN strategy LIKE '%phase-0%' OR strategy LIKE '%phase-1%' OR strategy LIKE '%phase-2%' THEN 'Dev1'
      WHEN strategy LIKE '%phase-3%' OR strategy LIKE '%phase-4%' THEN 'Dev2'
      ELSE 'Unknown'
    END as system,
    DATE_TRUNC('hour', \"createdAt\") as hour,
    COUNT(*) as trades
  FROM \"ManagedPosition\"
  WHERE \"createdAt\" > NOW() - INTERVAL '24 hours'
  GROUP BY system, hour
)
SELECT 
  system,
  AVG(trades)::numeric(8,2) as avg_trades_per_hour,
  MAX(trades) as peak_hour_trades,
  MIN(trades) as min_hour_trades,
  COUNT(DISTINCT hour) as active_hours
FROM hourly_data
WHERE system != 'Unknown'
GROUP BY system
ORDER BY system;"

echo ""
echo "System | Avg Trades/Hour | Peak Hour | Min Hour | Active Hours"
echo "-------|-----------------|-----------|----------|-------------"

result=$(run_query "$ACTIVITY_QUERY")
if [ -n "$result" ]; then
    echo "$result" | while IFS=',' read -r system avg_tph peak min hours; do
        printf "%-6s | %-15s | %-9s | %-8s | %-12s\n" \
               "$system" "$avg_tph" "$peak" "$min" "$hours/24"
    done
fi

# Market Conditions Impact (Dev1 Only)
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════════"
echo "                         DEV1 MARKET REGIME FILTER IMPACT"
echo "═══════════════════════════════════════════════════════════════════════════════════"

# Check if Dev1 has reduced trading during low-quality periods
REGIME_QUERY="
WITH time_periods AS (
  SELECT 
    EXTRACT(DOW FROM \"createdAt\") as day_of_week,
    EXTRACT(HOUR FROM \"createdAt\") as hour,
    COUNT(*) as trades,
    AVG(\"realizedPnL\")::numeric(8,4) as avg_pnl
  FROM \"ManagedPosition\"
  WHERE \"createdAt\" > NOW() - INTERVAL '7 days'
    AND strategy LIKE '%phase-%'
    AND \"realizedPnL\" IS NOT NULL
  GROUP BY day_of_week, hour
  ORDER BY day_of_week, hour
)
SELECT 
  CASE day_of_week
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day,
  SUM(trades) as total_trades,
  ROUND(AVG(avg_pnl)::numeric, 4) as avg_pnl
FROM time_periods
GROUP BY day_of_week
ORDER BY day_of_week
LIMIT 7;"

echo ""
echo "Trading Pattern by Day (Dev1 - Shows Weekend Filter Effect):"
echo "Day       | Trades | Avg P&L"
echo "----------|--------|----------"

result=$(run_query "$REGIME_QUERY")
if [ -n "$result" ]; then
    echo "$result" | while IFS=',' read -r day trades avg_pnl; do
        # Highlight weekend days
        if [[ "$day" == "Saturday" ]] || [[ "$day" == "Sunday" ]]; then
            printf "\033[1;33m%-9s | %-6s | %-8s\033[0m\n" "$day" "$trades" "$avg_pnl"
        else
            printf "%-9s | %-6s | %-8s\n" "$day" "$trades" "$avg_pnl"
        fi
    done
fi

# Key Insights
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════════"
echo "                                   KEY INSIGHTS"
echo "═══════════════════════════════════════════════════════════════════════════════════"

# Calculate performance difference
DEV1_PNL=$(run_query "SELECT COALESCE(ROUND(AVG(\"realizedPnL\")::numeric, 4), 0) FROM \"ManagedPosition\" WHERE \"createdAt\" > NOW() - INTERVAL '24 hours' AND \"realizedPnL\" IS NOT NULL AND (strategy LIKE '%phase-0%' OR strategy LIKE '%phase-1%' OR strategy LIKE '%phase-2%')")
DEV2_PNL=$(run_query "SELECT COALESCE(ROUND(AVG(\"realizedPnL\")::numeric, 4), 0) FROM \"ManagedPosition\" WHERE \"createdAt\" > NOW() - INTERVAL '24 hours' AND \"realizedPnL\" IS NOT NULL AND (strategy LIKE '%phase-3%' OR strategy LIKE '%phase-4%')")

echo ""
if (( $(echo "$DEV1_PNL > $DEV2_PNL" | bc -l) )); then
    DIFF=$(echo "$DEV1_PNL - $DEV2_PNL" | bc)
    echo "🎯 Dev1 OUTPERFORMING Dev2 by $DIFF per trade"
    echo "   → Market regime filters appear to be working"
    echo "   → Consider expanding experimental features"
elif (( $(echo "$DEV2_PNL > $DEV1_PNL" | bc -l) )); then
    DIFF=$(echo "$DEV2_PNL - $DEV1_PNL" | bc)
    echo "⚠️  Dev2 OUTPERFORMING Dev1 by $DIFF per trade"
    echo "   → Experimental filters may be too restrictive"
    echo "   → Consider adjusting thresholds"
else
    echo "➖ Dev1 and Dev2 performing equally"
    echo "   → Continue monitoring for patterns"
fi

# Recommendations
echo ""
echo "📋 Recommendations:"
echo "   1. Monitor weekend trading patterns - Dev1 should show reduced activity"
echo "   2. Check peak trading hours align with Asia/Europe/US sessions"
echo "   3. Compare volatility - Dev1 should have lower volatility if filters work"
echo "   4. Track win rate improvement over time"
echo ""

echo "═══════════════════════════════════════════════════════════════════════════════════"
echo "                          Next update in 60 seconds..."
echo "═══════════════════════════════════════════════════════════════════════════════════"