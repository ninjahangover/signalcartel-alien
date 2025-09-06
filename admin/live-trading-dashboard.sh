#!/bin/bash

# 🔥 COMPREHENSIVE LIVE TRADING DASHBOARD
# Real-time monitoring of live trading with actual Kraken account
# Shows trading activity, positions, P&L, and system status

# Dashboard configuration
REFRESH_INTERVAL=${1:-5}
DASHBOARD_NAME="LIVE TRADING DASHBOARD"

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

# Database query function
db_query() {
    local query="$1"
    local database="${2:-signalcartel}"
    local result
    local retry_count=0
    local max_retries=3
    
    while [[ $retry_count -lt $max_retries ]]; do
        result=$(PGPASSWORD=quantum_forge_warehouse_2024 docker exec signalcartel-warehouse psql -U warehouse_user -d "$database" -t -c "$query" 2>/dev/null | tr -d ' ' | head -1)
        
        if [[ -n "$result" && "$result" != "" && "$result" != "FATAL:" ]]; then
            echo "$result"
            return 0
        fi
        
        ((retry_count++))
        sleep 0.1
    done
    
    echo "0"
}

# Function to format numbers with commas
format_number() {
    printf "%'.0f" "$1" 2>/dev/null || echo "$1"
}

# Function to format currency
format_currency() {
    local amount="$1"
    if [[ "$amount" =~ ^-?[0-9]+\.?[0-9]*$ ]]; then
        printf "$%.2f" "$amount"
    else
        echo "$amount"
    fi
}

# Function to check if live trading is active (improved detection)
check_live_trading_active() {
    local live_processes=0
    
    # Check for various live trading patterns
    if pgrep -f "TRADING_MODE=LIVE" > /dev/null; then
        ((live_processes++))
    fi
    if pgrep -f "KRAKEN_API_KEY.*production-trading" > /dev/null; then
        ((live_processes++))
    fi
    if pgrep -f "production-trading-multi-pair.ts" > /dev/null; then
        ((live_processes++))
    fi
    
    if [ "$live_processes" -gt 0 ]; then
        echo "ACTIVE"
    else
        echo "INACTIVE"
    fi
}

# Function to get recent live trades from database
get_recent_trades() {
    local limit="${1:-5}"
    PGPASSWORD=quantum_forge_warehouse_2024 docker exec signalcartel-warehouse psql -U warehouse_user -d signalcartel -c "
    SELECT 
        symbol,
        ROUND(quantity::numeric, 4) as qty,
        \"entryPrice\" as price,
        COALESCE(ROUND(\"realizedPnL\"::numeric, 4), 0.00) as pnl,
        \"createdAt\"::timestamp::time as time,
        LEFT(\"entryTradeId\", 8) as entry_tx,
        CASE WHEN \"exitTradeId\" IS NOT NULL THEN LEFT(\"exitTradeId\", 8) ELSE 'OPEN' END as exit_tx
    FROM \"ManagedPosition\" 
    WHERE \"createdAt\" > NOW() - INTERVAL '5 minutes'
    ORDER BY \"createdAt\" DESC 
    LIMIT $limit;" 2>/dev/null
}

# Function to get open positions
get_open_positions() {
    PGPASSWORD=quantum_forge_warehouse_2024 docker exec signalcartel-warehouse psql -U warehouse_user -d signalcartel -c "
    SELECT 
        symbol,
        ROUND(quantity::numeric, 4) as qty,
        \"entryPrice\" as entry,
        \"createdAt\"::timestamp::time as opened,
        LEFT(\"entryTradeId\", 8) as tx_id
    FROM \"ManagedPosition\" 
    WHERE status = 'open'
    ORDER BY \"createdAt\" DESC;" 2>/dev/null
}

# Function to get USD balance (account balance)
get_kraken_balance() {
    # First check if proxy server is running
    if ! curl -s http://127.0.0.1:3002/health >/dev/null 2>&1; then
        echo "Proxy Offline"
        return 0
    fi
    
    # Try the simple balance script for USD balance only
    local balance=$(timeout 5s npx tsx get-balance-simple.ts 2>/dev/null | head -1)
    
    if [[ "$balance" =~ ^[0-9]+\.?[0-9]*$ ]] && [[ $(echo "$balance > 0" | bc -l 2>/dev/null || echo 0) -eq 1 ]]; then
        echo "$balance"
        return 0
    fi
    
    # Fallback to production logs parsing
    local log_balance=""
    if [[ -f "/tmp/signalcartel-logs/production-trading.log" ]]; then
        log_balance=$(tail -200 /tmp/signalcartel-logs/production-trading.log | grep -E "REAL AVAILABLE BALANCE|Kraken Balance:|Final Balance:|Balance:|USD:" | tail -1 | grep -o '\$[0-9]*\.[0-9]*' | sed 's/\$//')
    fi
    
    if [[ "$log_balance" =~ ^[0-9]+\.?[0-9]*$ ]] && [[ $(echo "$log_balance > 0" | bc -l 2>/dev/null || echo 0) -eq 1 ]]; then
        echo "$log_balance"
        return 0
    fi
    
    # Final fallback
    echo "Balance Unknown"
}

# Function to get complete portfolio value (USD + crypto holdings) - fast estimate
get_complete_portfolio_value() {
    # First check if proxy server is running
    if ! curl -s http://127.0.0.1:3002/health >/dev/null 2>&1; then
        echo "Proxy Offline"
        return 0
    fi
    
    # Try the fast portfolio summary script
    local portfolio_value=$(timeout 15s npx tsx get-portfolio-summary.ts 2>/dev/null | grep "Portfolio Estimate:" | sed 's/.*\$\([0-9]*\.[0-9]*\).*/\1/')
    
    if [[ "$portfolio_value" =~ ^[0-9]+\.?[0-9]*$ ]] && [[ $(echo "$portfolio_value > 0" | bc -l 2>/dev/null || echo 0) -eq 1 ]]; then
        echo "$portfolio_value"
        return 0
    fi
    
    # Fallback to just USD balance if portfolio estimate fails
    echo "$(get_kraken_balance)"
}

# Function to display comprehensive live trading dashboard
display_dashboard() {
    clear
    
    # Get current data
    local live_status=$(check_live_trading_active)
    local kraken_balance=$(get_kraken_balance)
    local portfolio_value=$(get_complete_portfolio_value)
    local current_time=$(date '+%Y-%m-%d %H:%M:%S %Z')
    
    # Get comprehensive trading statistics from database (only recent session data)
    # Use 5 minutes to capture only fresh trades after restart
    local session_cutoff="NOW() - INTERVAL '5 minutes'"
    local total_trades=$(db_query "SELECT COUNT(*) FROM \"ManagedPosition\" WHERE \"createdAt\" > $session_cutoff;")
    local open_positions=$(db_query "SELECT COUNT(*) FROM \"ManagedPosition\" WHERE status = 'open';")
    local total_pnl=$(db_query "SELECT COALESCE(SUM(\"realizedPnL\"), 0) FROM \"ManagedPosition\" WHERE \"createdAt\" > $session_cutoff AND \"realizedPnL\" IS NOT NULL;")
    local recent_trades=$(db_query "SELECT COUNT(*) FROM \"ManagedPosition\" WHERE \"createdAt\" > NOW() - INTERVAL '1 hour';")
    local winning_trades=$(db_query "SELECT COUNT(*) FROM \"ManagedPosition\" WHERE \"realizedPnL\" > 0 AND \"createdAt\" > $session_cutoff;")
    local losing_trades=$(db_query "SELECT COUNT(*) FROM \"ManagedPosition\" WHERE \"realizedPnL\" < 0 AND \"createdAt\" > $session_cutoff;")
    local breakeven_trades=$(db_query "SELECT COUNT(*) FROM \"ManagedPosition\" WHERE \"realizedPnL\" = 0 AND \"createdAt\" > $session_cutoff;")
    local total_with_pnl=$(db_query "SELECT COUNT(*) FROM \"ManagedPosition\" WHERE \"realizedPnL\" IS NOT NULL AND \"createdAt\" > $session_cutoff;")
    
    # Get all-time statistics
    local all_time_trades=$(db_query "SELECT COUNT(*) FROM \"ManagedPosition\" WHERE \"realizedPnL\" IS NOT NULL;")
    local all_time_pnl=$(db_query "SELECT COALESCE(SUM(\"realizedPnL\"), 0) FROM \"ManagedPosition\" WHERE \"realizedPnL\" IS NOT NULL;")
    local all_time_winning=$(db_query "SELECT COUNT(*) FROM \"ManagedPosition\" WHERE \"realizedPnL\" > 0;")
    local all_time_losing=$(db_query "SELECT COUNT(*) FROM \"ManagedPosition\" WHERE \"realizedPnL\" < 0;")
    
    # Get average win/loss amounts (current session)
    local avg_win=$(db_query "SELECT COALESCE(AVG(\"realizedPnL\"), 0) FROM \"ManagedPosition\" WHERE \"realizedPnL\" > 0 AND \"createdAt\" > $session_cutoff;")
    local avg_loss=$(db_query "SELECT COALESCE(AVG(\"realizedPnL\"), 0) FROM \"ManagedPosition\" WHERE \"realizedPnL\" < 0 AND \"createdAt\" > $session_cutoff;")
    
    # Get best and worst trades (current session)
    local best_trade=$(db_query "SELECT COALESCE(MAX(\"realizedPnL\"), 0) FROM \"ManagedPosition\" WHERE \"createdAt\" > $session_cutoff;")
    local worst_trade=$(db_query "SELECT COALESCE(MIN(\"realizedPnL\"), 0) FROM \"ManagedPosition\" WHERE \"createdAt\" > $session_cutoff;")
    
    # Calculate win rates
    local win_rate=0
    local all_time_win_rate=0
    if [[ "$total_with_pnl" -gt 0 ]]; then
        win_rate=$(echo "scale=1; $winning_trades * 100 / $total_with_pnl" | bc -l 2>/dev/null || echo "0")
    fi
    if [[ "$all_time_trades" -gt 0 ]]; then
        all_time_win_rate=$(echo "scale=1; $all_time_winning * 100 / $all_time_trades" | bc -l 2>/dev/null || echo "0")
    fi
    
    # Calculate profit factor (avg win / avg loss ratio)
    local profit_factor=0
    if [[ $(echo "$avg_loss < 0" | bc -l 2>/dev/null) -eq 1 ]]; then
        profit_factor=$(echo "scale=2; ($avg_win) / (-1 * $avg_loss)" | bc -l 2>/dev/null || echo "0")
    fi
    
    # Dashboard header
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║                      🔥 QUANTUM FORGE™ LIVE TRADING DASHBOARD                   ║${NC}"
    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${WHITE}$current_time${NC} | ${BLUE}Refresh: ${REFRESH_INTERVAL}s${NC} | ${RED}REAL MONEY TRADING${NC}"
    echo
    
    # Live Trading Status
    echo -e "${BOLD}${RED}🔥 LIVE TRADING STATUS${NC}"
    echo -e "${RED}═══════════════════════════════════════${NC}"
    if [ "$live_status" = "ACTIVE" ]; then
        echo -e "  ${WHITE}System Status:${NC}      ${BOLD}${GREEN}🟢 LIVE TRADING ACTIVE${NC}"
        echo -e "  ${WHITE}Risk Level:${NC}         ${BOLD}${RED}🚨 REAL MONEY${NC}"
        echo -e "  ${WHITE}Active Processes:${NC}   ${GREEN}$(pgrep -f "production-trading" | wc -l)${NC}"
    else
        echo -e "  ${WHITE}System Status:${NC}      ${BOLD}${YELLOW}⚪ INACTIVE${NC}"
        echo -e "  ${WHITE}Risk Level:${NC}         ${BOLD}${GREEN}📄 SAFE${NC}"
        echo -e "  ${WHITE}Active Processes:${NC}   ${RED}0${NC}"
    fi
    echo
    
    # Real Account Information
    echo -e "${BOLD}${GREEN}💰 REAL KRAKEN ACCOUNT${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo -e "  ${WHITE}Account Balance:${NC}    ${BOLD}${CYAN}$(format_currency $kraken_balance)${NC} ${WHITE}(USD)${NC}"
    echo -e "  ${WHITE}Portfolio Value:${NC}    ${BOLD}${MAGENTA}$(format_currency $portfolio_value)${NC} ${WHITE}(Total)${NC}"
    echo -e "  ${WHITE}Open Positions:${NC}     ${YELLOW}$(format_number $open_positions)${NC}"
    echo -e "  ${WHITE}Loss Limit:${NC}         ${BOLD}${RED}\\$100.00 MAX${NC}"
    
    # Color code P&L
    local pnl_color
    if (( $(echo "$total_pnl > 0" | bc -l 2>/dev/null || echo 0) )); then
        pnl_color="${GREEN}"
    else
        pnl_color="${RED}"
    fi
    echo -e "  ${WHITE}Session P&L:${NC}        ${pnl_color}$(format_currency $total_pnl)${NC}"
    echo
    
    # Trading Performance (Current Session)
    echo -e "${BOLD}${PURPLE}📊 TRADING PERFORMANCE (SESSION)${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════${NC}"
    echo -e "  ${WHITE}Session Trades:${NC}     ${CYAN}$(format_number $total_trades)${NC} (${BLUE}$(format_number $recent_trades)${NC} last hour)"
    echo -e "  ${WHITE}Winning Trades:${NC}     ${GREEN}$(format_number $winning_trades)${NC}"
    echo -e "  ${WHITE}Losing Trades:${NC}      ${RED}$(format_number $losing_trades)${NC}"
    echo -e "  ${WHITE}Breakeven Trades:${NC}   ${YELLOW}$(format_number $breakeven_trades)${NC}"
    echo -e "  ${WHITE}Win Rate:${NC}           ${BOLD}${YELLOW}$(printf "%.1f" "$win_rate")%${NC}"
    
    # Show average win/loss if we have data
    if [[ "$winning_trades" -gt 0 ]] || [[ "$losing_trades" -gt 0 ]]; then
        echo -e "  ${WHITE}Average Win:${NC}        ${GREEN}$(format_currency $avg_win)${NC}"
        if [[ "$losing_trades" -gt 0 ]]; then
            echo -e "  ${WHITE}Average Loss:${NC}       ${RED}$(format_currency $avg_loss)${NC}"
            echo -e "  ${WHITE}Profit Factor:${NC}      ${BOLD}${CYAN}$(printf "%.2f" "$profit_factor")${NC}"
        fi
        echo -e "  ${WHITE}Best Trade:${NC}         ${GREEN}$(format_currency $best_trade)${NC}"
        if [[ $(echo "$worst_trade < 0" | bc -l 2>/dev/null) -eq 1 ]]; then
            echo -e "  ${WHITE}Worst Trade:${NC}        ${RED}$(format_currency $worst_trade)${NC}"
        fi
    fi
    echo
    
    # All-Time Performance
    echo -e "${BOLD}${MAGENTA}🏆 ALL-TIME PERFORMANCE${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════${NC}"
    echo -e "  ${WHITE}Total Trades:${NC}       ${CYAN}$(format_number $all_time_trades)${NC}"
    echo -e "  ${WHITE}Winning Trades:${NC}     ${GREEN}$(format_number $all_time_winning)${NC}"
    echo -e "  ${WHITE}Losing Trades:${NC}      ${RED}$(format_number $all_time_losing)${NC}"
    echo -e "  ${WHITE}All-Time Win Rate:${NC}  ${BOLD}${YELLOW}$(printf "%.1f" "$all_time_win_rate")%${NC}"
    echo -e "  ${WHITE}Total P&L:${NC}          ${BOLD}$(if (( $(echo "$all_time_pnl >= 0" | bc -l 2>/dev/null || echo 0) )); then echo "${GREEN}"; else echo "${RED}"; fi)$(format_currency $all_time_pnl)${NC}"
    echo
    
    # Recent Trading Activity
    echo -e "${BOLD}${BLUE}⚡ RECENT TRADES (Last 5 Minutes)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    
    # Get recent trades and display them
    local trades_output
    trades_output=$(get_recent_trades 3)
    
    if [[ -n "$trades_output" && "$trades_output" != *"(0 rows)"* ]]; then
        echo "$trades_output" | tail -n +3 | head -3 | while IFS='|' read -r symbol qty price pnl time entry_tx exit_tx; do
            # Clean up the fields
            symbol=$(echo "$symbol" | xargs)
            qty=$(echo "$qty" | xargs)
            price=$(echo "$price" | xargs)
            pnl=$(echo "$pnl" | xargs)
            time=$(echo "$time" | xargs)
            entry_tx=$(echo "$entry_tx" | xargs)
            exit_tx=$(echo "$exit_tx" | xargs)
            
            # Color code P&L
            if [[ "$pnl" =~ ^-.*$ ]] || [[ "$pnl" == "0.00" ]]; then
                pnl_color="${RED}"
            else
                pnl_color="${GREEN}"
            fi
            
            echo -e "  ${WHITE}$symbol:${NC} ${CYAN}$qty${NC} @ ${YELLOW}\$$price${NC} = ${pnl_color}\$$pnl${NC} (${BLUE}$time${NC})"
            echo -e "    ${WHITE}📊 Entry TX:${NC} ${MAGENTA}$entry_tx${NC} | ${WHITE}Exit TX:${NC} ${MAGENTA}$exit_tx${NC}"
        done
    else
        echo -e "  ${YELLOW}No recent trades in last 5 minutes${NC}"
    fi
    echo
    
    # Current Open Positions
    echo -e "${BOLD}${YELLOW}🎯 OPEN POSITIONS${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"
    
    local positions_output
    positions_output=$(get_open_positions)
    
    if [[ -n "$positions_output" && "$positions_output" != *"(0 rows)"* ]]; then
        echo "$positions_output" | tail -n +3 | head -5 | while IFS='|' read -r symbol qty entry opened tx_id; do
            # Clean up the fields
            symbol=$(echo "$symbol" | xargs)
            qty=$(echo "$qty" | xargs)
            entry=$(echo "$entry" | xargs)
            opened=$(echo "$opened" | xargs)
            tx_id=$(echo "$tx_id" | xargs)
            
            echo -e "  ${WHITE}$symbol:${NC} ${CYAN}$qty${NC} @ ${YELLOW}\$$entry${NC} (${BLUE}$opened${NC})"
            echo -e "    ${WHITE}📊 Entry TX:${NC} ${MAGENTA}$tx_id${NC}"
        done
    else
        echo -e "  ${GREEN}✅ No open positions${NC}"
    fi
    echo
    
    # Safety Controls
    echo -e "${BOLD}${WHITE}🛡️  SAFETY CONTROLS${NC}"
    echo -e "${WHITE}═══════════════════════════════════════${NC}"
    echo -e "  ${WHITE}Emergency Stop:${NC}     ${RED}./admin/emergency-stop.sh${NC}"
    echo -e "  ${WHITE}Live Logs:${NC}          ${CYAN}tail -f /tmp/signalcartel-logs/production-trading.log${NC}"
    echo -e "  ${WHITE}Paper Dashboard:${NC}    ${BLUE}./admin/terminal-dashboard.sh${NC}"
    echo -e "  ${WHITE}Balance Check:${NC}      ${CYAN}npx tsx admin/test-kraken-balance.ts${NC}"
    echo
    
    echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}Press ${RED}Ctrl+C${NC} to exit | Refresh every ${BLUE}${REFRESH_INTERVAL}s${NC} | ${MAGENTA}LIVE TRADING ONLY${NC}"
}

# Main dashboard loop
main() {
    echo -e "${GREEN}Starting LIVE TRADING Dashboard...${NC}"
    echo -e "${BLUE}Refresh interval: $REFRESH_INTERVAL seconds${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
    echo ""
    
    # Trap Ctrl+C to exit gracefully
    trap 'echo -e "\n${GREEN}Live Trading Dashboard stopped.${NC}"; exit 0' INT
    
    while true; do
        display_dashboard
        sleep $REFRESH_INTERVAL
    done
}

# Display usage if help requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "QUANTUM FORGE™ Live Trading Dashboard"
    echo "Usage: $0 [refresh_interval]"
    echo ""
    echo "Options:"
    echo "  refresh_interval    Refresh interval in seconds (default: 5)"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                 # Refresh every 5 seconds"
    echo "  $0 3               # Refresh every 3 seconds"
    echo "  $0 1               # Refresh every 1 second (fast)"
    exit 0
fi

# Run the dashboard
main