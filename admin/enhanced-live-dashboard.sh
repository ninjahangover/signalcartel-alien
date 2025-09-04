#!/bin/bash

# 🚀 ENHANCED LIVE TRADING DASHBOARD
# Shows real-time webhook activity, commission checks, and live trading signals
# Monitors the actual production-trading-multi-pair.ts process logs

# Dashboard configuration
REFRESH_INTERVAL=${1:-3}
DASHBOARD_NAME="ENHANCED LIVE TRADING DASHBOARD"

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Function to get live trading logs (last few lines)
get_live_activity() {
    if [[ -f /tmp/signalcartel-logs/production-trading.log ]]; then
        tail -n 15 /tmp/signalcartel-logs/production-trading.log 2>/dev/null | grep -E "(WEBHOOK|COMMISSION CHECK|TRADE|BTC.*:\s\$|Enhanced Analysis|BTCUSD.*\$[0-9])" | tail -n 8
    fi
}

# Function to get current market prices from logs
get_current_prices() {
    if [[ -f /tmp/signalcartel-logs/production-trading.log ]]; then
        tail -n 100 /tmp/signalcartel-logs/production-trading.log 2>/dev/null | grep -E "(BTCUSD.*: \$|ETHUSD.*: \$)" | tail -n 1
    fi
}

# Function to get recent webhook activity
get_webhook_activity() {
    if [[ -f /tmp/signalcartel-logs/production-trading.log ]]; then
        tail -n 50 /tmp/signalcartel-logs/production-trading.log 2>/dev/null | grep -E "WEBHOOK.*SUCCESS|WEBHOOK.*FAILED|LIVE TRADING.*webhook" | tail -n 3
    fi
}

# Function to get commission check activity
get_commission_checks() {
    if [[ -f /tmp/signalcartel-logs/production-trading.log ]]; then
        tail -n 30 /tmp/signalcartel-logs/production-trading.log 2>/dev/null | grep "COMMISSION CHECK" | tail -n 3
    fi
}

# Function to get active trading signals
get_trading_signals() {
    if [[ -f /tmp/signalcartel-logs/production-trading.log ]]; then
        tail -n 50 /tmp/signalcartel-logs/production-trading.log 2>/dev/null | grep -E "Enhanced Analysis.*TRADE.*Confidence|BLOCKED.*Enhanced" | tail -n 3
    fi
}

# Function to check live system status
get_system_status() {
    local live_processes=$(pgrep -f "TRADING_MODE=LIVE.*production-trading" | wc -l)
    local total_processes=$(pgrep -f "production-trading" | wc -l)
    
    echo "Live: $live_processes | Total: $total_processes"
}

# Function to get recent database activity
get_recent_db_activity() {
    PGPASSWORD=quantum_forge_warehouse_2024 docker exec signalcartel-warehouse psql -U warehouse_user -d signalcartel -c "
    SELECT 
        symbol,
        ROUND(quantity::numeric, 4) as qty,
        ROUND(\"entryPrice\"::numeric, 2) as price,
        COALESCE(ROUND(\"realizedPnL\"::numeric, 4), 0.00) as pnl,
        TO_CHAR(\"createdAt\", 'HH24:MI:SS') as time
    FROM \"ManagedPosition\" 
    WHERE \"createdAt\" > NOW() - INTERVAL '30 minutes'
    ORDER BY \"createdAt\" DESC 
    LIMIT 3;" 2>/dev/null
}

# Function to display enhanced live dashboard
display_dashboard() {
    clear
    
    local current_time=$(date '+%Y-%m-%d %H:%M:%S %Z')
    local system_status=$(get_system_status)
    
    # Dashboard header
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║                    🚀 ENHANCED LIVE TRADING DASHBOARD                           ║${NC}"
    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${WHITE}$current_time${NC} | ${BLUE}Refresh: ${REFRESH_INTERVAL}s${NC} | ${GREEN}Processes: $system_status${NC}"
    echo
    
    # Current Market Prices
    echo -e "${BOLD}${GREEN}💹 REAL-TIME MARKET PRICES${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    local current_prices=$(get_current_prices)
    if [[ -n "$current_prices" ]]; then
        echo -e "  ${CYAN}$current_prices${NC}"
    else
        echo -e "  ${YELLOW}Fetching current prices...${NC}"
    fi
    echo
    
    # Live Trading Activity (Most Recent)
    echo -e "${BOLD}${RED}🔥 LIVE TRADING ACTIVITY${NC}"
    echo -e "${RED}═══════════════════════════════════════${NC}"
    local live_activity=$(get_live_activity)
    if [[ -n "$live_activity" ]]; then
        echo "$live_activity" | while IFS= read -r line; do
            # Color code different types of activity
            if [[ $line == *"WEBHOOK SUCCESS"* ]]; then
                echo -e "  ${GREEN}✅ $line${NC}"
            elif [[ $line == *"WEBHOOK"* ]]; then
                echo -e "  ${BLUE}🔗 $line${NC}"
            elif [[ $line == *"COMMISSION CHECK"* ]]; then
                echo -e "  ${PURPLE}💰 $line${NC}"
            elif [[ $line == *"TRADE"* ]]; then
                echo -e "  ${YELLOW}🎯 $line${NC}"
            elif [[ $line == *"BTC"* ]] || [[ $line == *"ETH"* ]]; then
                echo -e "  ${CYAN}📊 $line${NC}"
            else
                echo -e "  ${WHITE}$line${NC}"
            fi
        done
    else
        echo -e "  ${YELLOW}No recent activity (system may be starting up)${NC}"
    fi
    echo
    
    # Recent Webhook Activity
    echo -e "${BOLD}${BLUE}🔗 WEBHOOK ACTIVITY (Last 3)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    local webhook_activity=$(get_webhook_activity)
    if [[ -n "$webhook_activity" ]]; then
        echo "$webhook_activity" | while IFS= read -r line; do
            if [[ $line == *"SUCCESS"* ]]; then
                echo -e "  ${GREEN}✅ $line${NC}"
            elif [[ $line == *"FAILED"* ]]; then
                echo -e "  ${RED}❌ $line${NC}"
            else
                echo -e "  ${BLUE}🔗 $line${NC}"
            fi
        done
    else
        echo -e "  ${YELLOW}No recent webhook activity${NC}"
    fi
    echo
    
    # Commission Checks (New Feature)
    echo -e "${BOLD}${PURPLE}💰 COMMISSION CONSTRAINT CHECKS${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════${NC}"
    local commission_checks=$(get_commission_checks)
    if [[ -n "$commission_checks" ]]; then
        echo "$commission_checks" | while IFS= read -r line; do
            if [[ $line == *"Net "*"."* ]]; then
                echo -e "  ${PURPLE}📊 $line${NC}"
            else
                echo -e "  ${WHITE}$line${NC}"
            fi
        done
    else
        echo -e "  ${YELLOW}No recent commission checks${NC}"
    fi
    echo
    
    # Trading Signals
    echo -e "${BOLD}${YELLOW}🎯 ACTIVE TRADING SIGNALS${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"
    local trading_signals=$(get_trading_signals)
    if [[ -n "$trading_signals" ]]; then
        echo "$trading_signals" | while IFS= read -r line; do
            if [[ $line == *"TRADE"* ]] && [[ $line == *"Confidence"* ]]; then
                echo -e "  ${GREEN}🎯 $line${NC}"
            elif [[ $line == *"BLOCKED"* ]]; then
                echo -e "  ${RED}🚫 $line${NC}"
            else
                echo -e "  ${WHITE}$line${NC}"
            fi
        done
    else
        echo -e "  ${YELLOW}No recent trading signals${NC}"
    fi
    echo
    
    # Recent Database Activity
    echo -e "${BOLD}${CYAN}📊 DATABASE ACTIVITY (Last 30 min)${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    local db_activity=$(get_recent_db_activity)
    if [[ -n "$db_activity" && "$db_activity" != *"(0 rows)"* ]]; then
        echo "$db_activity" | tail -n +3 | head -3 | while IFS='|' read -r symbol qty price pnl time; do
            # Clean up the fields
            symbol=$(echo "$symbol" | xargs)
            qty=$(echo "$qty" | xargs)
            price=$(echo "$price" | xargs)
            pnl=$(echo "$pnl" | xargs)
            time=$(echo "$time" | xargs)
            
            # Color code P&L
            if [[ "$pnl" =~ ^-.*$ ]]; then
                pnl_color="${RED}"
            elif [[ "$pnl" == "0.00" ]]; then
                pnl_color="${YELLOW}"
            else
                pnl_color="${GREEN}"
            fi
            
            echo -e "  ${WHITE}$symbol:${NC} ${CYAN}$qty${NC} @ ${YELLOW}\$$price${NC} → ${pnl_color}\$$pnl${NC} (${BLUE}$time${NC})"
        done
    else
        echo -e "  ${YELLOW}No recent database activity${NC}"
    fi
    echo
    
    # System Information
    echo -e "${BOLD}${WHITE}🔧 SYSTEM INFORMATION${NC}"
    echo -e "${WHITE}═══════════════════════════════════════${NC}"
    echo -e "  ${WHITE}Log File:${NC}           ${CYAN}/tmp/signalcartel-logs/production-trading.log${NC}"
    echo -e "  ${WHITE}Live Processes:${NC}     ${GREEN}$(pgrep -f "TRADING_MODE=LIVE" | wc -l)${NC}"
    echo -e "  ${WHITE}Total Processes:${NC}    ${BLUE}$(pgrep -f "production-trading" | wc -l)${NC}"
    echo -e "  ${WHITE}Emergency Stop:${NC}     ${RED}./admin/emergency-stop.sh${NC}"
    echo
    
    # Quick Actions
    echo -e "${BOLD}${MAGENTA}⚡ QUICK MONITORING COMMANDS${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════${NC}"
    echo -e "  ${WHITE}Follow Logs:${NC}        ${CYAN}tail -f /tmp/signalcartel-logs/production-trading.log${NC}"
    echo -e "  ${WHITE}Webhook Only:${NC}       ${CYAN}tail -f /tmp/signalcartel-logs/production-trading.log | grep WEBHOOK${NC}"
    echo -e "  ${WHITE}Commission Only:${NC}    ${CYAN}tail -f /tmp/signalcartel-logs/production-trading.log | grep 'COMMISSION CHECK'${NC}"
    echo -e "  ${WHITE}Trading Signals:${NC}    ${CYAN}tail -f /tmp/signalcartel-logs/production-trading.log | grep 'Enhanced Analysis'${NC}"
    echo
    
    echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}Press ${RED}Ctrl+C${NC} to exit | Refresh every ${BLUE}${REFRESH_INTERVAL}s${NC} | ${MAGENTA}ENHANCED LIVE VIEW${NC}"
}

# Main dashboard loop
main() {
    echo -e "${GREEN}Starting Enhanced Live Trading Dashboard...${NC}"
    echo -e "${BLUE}Refresh interval: $REFRESH_INTERVAL seconds${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
    echo ""
    
    # Trap Ctrl+C to exit gracefully
    trap 'echo -e "\n${GREEN}Enhanced Live Trading Dashboard stopped.${NC}"; exit 0' INT
    
    while true; do
        display_dashboard
        sleep $REFRESH_INTERVAL
    done
}

# Display usage if help requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "Enhanced Live Trading Dashboard - Real-time Activity Monitor"
    echo "Usage: $0 [refresh_interval]"
    echo ""
    echo "Shows:"
    echo "  • Real-time webhook activity and trade executions"
    echo "  • Commission constraint checks (not simulation)"
    echo "  • Live trading signals and confidence levels"
    echo "  • Current market prices from live feeds"
    echo "  • Recent database activity and positions"
    echo ""
    echo "Options:"
    echo "  refresh_interval    Refresh interval in seconds (default: 3)"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                 # Refresh every 3 seconds"
    echo "  $0 1               # Refresh every 1 second (very fast)"
    echo "  $0 5               # Refresh every 5 seconds"
    exit 0
fi

# Run the dashboard
main