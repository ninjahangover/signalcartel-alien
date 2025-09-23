# SignalCartel Breakout Evaluation System

## 🎯 Quick Overview

**Purpose**: Pass Breakout's $5,000 1-Step evaluation to get funded account
**System**: Runs parallel to main trading system on different ports
**Strategy**: Conservative position sizing with your proven 76%+ win rate

## 📊 Breakout Rules (1-Step Challenge)

### Account Requirements
- **Starting Balance**: $5,000
- **Profit Target**: $500 (10%)
- **Minimum Trading Days**: 5
- **Maximum Period**: 30 days

### Drawdown Rules (CRITICAL)
- **Daily Loss**: 4% of balance at 00:30 UTC (resets daily)
  - $200 max daily loss from $5,000 balance
  - Based on EQUITY (includes floating P&L)

- **Max Drawdown**: 6% static from starting balance
  - $300 maximum drawdown (never trails)
  - Based on EQUITY (includes floating P&L)

## 🚀 System Architecture

### Separate Infrastructure (No Interference)
```
Main System (Production):
- Dashboard: localhost:3004
- Tensor: localhost:5000
- Proxy: localhost:3001
- Database: signalcartel

Breakout System (Evaluation):
- Dashboard: localhost:3005
- Tensor: localhost:5001
- Proxy: localhost:3002
- Database: breakout_eval
```

## 💎 Trading Configuration

### High Priority Pairs (5x Leverage)
- **BTCUSD**: 5x leverage, max 10 BTC per order
- **ETHUSD**: 5x leverage, max 540 ETH per order

### Medium Priority Pairs (2x Leverage)
- **XRPUSD, ADAUSD, SOLUSD, AVAXUSD**: Good liquidity
- **DOGEUSD, MATICUSD**: Popular momentum pairs

### Position Sizing
- Max risk per trade: 1% ($50)
- Max position size: $100 (unleveraged value)
- Max concurrent positions: 3
- Stop loss: 2% typical

### Fee Structure
- Trading fee: 0.035% per side
- Financing fee: 0.09% daily (charged at 00:25 UTC)

## 🛡️ Risk Management Features

1. **Real-Time Drawdown Monitor**
   - Checks equity every 10 seconds
   - Auto-stops on breach
   - Visual warnings when approaching limits

2. **Daily Reset Logic**
   - Automatic reset at 00:30 UTC
   - Fresh daily loss allowance
   - Preserves max drawdown tracking

3. **Emergency Stop**
   - Triggers on any limit breach
   - Closes all positions immediately
   - Saves evaluation state

## 📈 Strategy for Success

### Conservative Approach (Recommended)
- Focus on BTCUSD/ETHUSD with 5x leverage
- $50-100 positions (before leverage)
- 2% stop loss, 3% take profit
- Target 2-3 trades per day
- Need only 10 winning trades to pass

### Mathematical Edge
- Your 76% win rate = strong probability
- 10 trades at 3% profit = $150 per win
- 4 trades at 2% loss = $20 per loss
- Net: ~$110 profit per 10 trades
- Need 5 cycles (50 trades) to reach $500 target

## ⚡ Quick Commands

```bash
# Start Breakout evaluation system
cd /home/telgkb9/depot/signalcartel-breakout
./breakout-start.sh

# Monitor dashboard
# Open browser: http://localhost:3005

# Check logs
tail -f /tmp/breakout-logs/monitor.log

# Stop system
./breakout-stop.sh
```

## 🎯 Path to $500 Profit

**Week 1**:
- Trade BTCUSD/ETHUSD only
- 2-3 trades daily
- Target: $100-150 profit

**Week 2**:
- Add SOLUSD/AVAXUSD if performing well
- Maintain discipline
- Target: $200 cumulative

**Week 3-4**:
- Conservative continuation
- Reach $500 target
- Minimum 5 trading days achieved

## ⚠️ Critical Reminders

1. **NEVER exceed $200 daily loss** (equity-based)
2. **NEVER exceed $300 total drawdown** (equity-based)
3. **Close positions before 00:25 UTC** to avoid financing fees
4. **Monitor floating P&L** - it counts toward limits
5. **Use the dashboard** - visual monitoring prevents breaches

## 🏆 Why This Will Work

- **Proven System**: 76% win rate in production
- **Conservative Sizing**: Only risking 1% per trade
- **Parallel Operation**: No interference with main system
- **Real Monitoring**: Drawdown calculator prevents breaches
- **Mathematical Edge**: Need only 10% return with high win rate

---

**Status**: Ready for deployment
**Next Step**: Fund Breakout account and start evaluation
**Goal**: Pass in 2-3 weeks → Get funded account → Scale profits