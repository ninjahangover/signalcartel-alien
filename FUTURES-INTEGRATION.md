# Kraken Futures Integration Guide
## V3.11.0 - Isolated Perpetual Contract Trading System

### 🎯 **Overview**

This integration adds **isolated** Kraken Futures (perpetual contracts) trading alongside your existing spot trading system. The two systems run **completely independently** with separate capital, API keys, and processes.

---

## 📊 **System Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                   EXISTING SPOT SYSTEM                       │
│  • Capital: $460                                            │
│  • Pairs: AVAXUSD, WIFUSD, BTCUSD, BNBUSD                  │
│  • API: Kraken Spot API                                     │
│  • Process: production-trading-multi-pair.ts                │
│  • Status: UNTOUCHED ✅                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    NEW FUTURES SYSTEM                        │
│  • Capital: $100 (test allocation)                          │
│  • Contracts: fi_xbtusd, fi_ethusd, fi_solusd, etc.        │
│  • API: Kraken Futures API (separate keys)                 │
│  • Process: production-trading-futures.ts                   │
│  • Status: READY FOR ACTIVATION ⚡                          │
└─────────────────────────────────────────────────────────────┘

          SHARED: AI Signals from Unified Tensor Coordinator
```

---

## 🚀 **Quick Start**

### **Step 1: Fund Your Futures Account**

1. Log into Kraken Futures (separate from Kraken Pro)
2. Transfer $100 from your Kraken Pro account to Futures
3. Verify balance appears in Futures wallet

### **Step 2: Enable Futures Trading**

Edit `.env` and change:
```bash
FUTURES_TRADING_ENABLED=true  # Change from false to true
```

### **Step 3: Start Futures Trading**

```bash
./futures-start.sh
```

### **Step 4: Monitor**

```bash
# Watch live trading
tail -f /tmp/signalcartel-logs/futures-trading.log

# Check positions and balance
# (Logs show position updates every minute)
```

### **Step 5: Stop (if needed)**

```bash
./futures-stop.sh
```

---

## ⚙️ **Configuration**

All futures settings are in `.env`:

```bash
# Enable/Disable
FUTURES_TRADING_ENABLED=false  # Set to true to activate

# Safety Settings
FUTURES_MAX_CAPITAL=100         # Maximum capital to deploy
FUTURES_MAX_LEVERAGE=2          # Conservative 2x leverage
FUTURES_MIN_CONFIDENCE=20       # Minimum AI confidence (%)
FUTURES_POSITION_SIZE_PCT=10    # Position size: 10% = $10 per trade

# Testing (optional)
FUTURES_DEMO_MODE=false         # Use demo environment for testing
```

### **Recommended Settings for $100 Test Capital:**

| Setting | Value | Reasoning |
|---------|-------|-----------|
| `FUTURES_MAX_CAPITAL` | `100` | Your test allocation |
| `FUTURES_MAX_LEVERAGE` | `2` | Conservative (Kraken allows up to 50x!) |
| `FUTURES_MIN_CONFIDENCE` | `20` | Same as spot system |
| `FUTURES_POSITION_SIZE_PCT` | `10` | $10 per trade = 10 trades max |

---

## 📈 **Available Perpetual Contracts**

The system monitors these perpetuals (can be expanded):

| Contract | Description | Typical Spread |
|----------|-------------|----------------|
| `fi_xbtusd` | Bitcoin | ~0.01% |
| `fi_ethusd` | Ethereum | ~0.01% |
| `fi_solusd` | Solana | ~0.02% |
| `fi_xrpusd` | XRP | ~0.02% |
| `fi_adausd` | Cardano | ~0.02% |
| `fi_dotusd` | Polkadot | ~0.02% |
| `fi_avaxusd` | Avalanche | ~0.02% |
| `fi_maticusd` | Polygon | ~0.02% |

---

## 🤖 **How It Works**

### **Signal Generation**

1. Reuses **same AI signals** from your spot system
2. Unified Tensor Coordinator analyzes market
3. Signals must meet `20%` confidence threshold

### **Position Entry**

- **BUY signal** → Opens **LONG** position
- **SELL signal** → Opens **SHORT** position (this is the new capability!)
- Position size: 10% of $100 = **$10 per trade**
- Leverage: **2x** (conservative)

### **Position Exit**

Automatic exits on:
- ✅ **Take Profit**: +10% gain
- 🛑 **Stop Loss**: -5% loss
- ⏰ **Time Exit**: 4 hours + any profit (>0.5%)

### **Risk Management**

- Maximum capital: **$100** (isolated from spot)
- Maximum leverage: **2x** (vs 50x available)
- Maximum positions: **10** (at $10 each)
- Stop loss: **-5%** per trade
- Account-wide stop: Automatic if capital drops to $80

---

## 📊 **Monitoring & Logs**

### **Log File**

```bash
/tmp/signalcartel-logs/futures-trading.log
```

### **What You'll See**

```
🚀 KRAKEN FUTURES TRADING ENGINE - STARTING
================================================
💰 Capital: $100 | Leverage: 2x | Position Size: 10%
🎯 Min Confidence: 20% | Demo Mode: false
✅ Futures API connection verified
💰 USD: $100.00 available, $100.00 margin
📊 No existing futures positions

🔄 FUTURES CYCLE 1 - 2:00:00 PM
🎯 fi_xbtusd: BUY signal (24.5% confidence)
💵 fi_xbtusd: Position size $10.00 = 0.0001 contracts @ $63420
✅ fi_xbtusd: LONG position opened
   Order ID: ORDER-ABC123
   Size: 0.0001 contracts
   Leverage: 2x

📊 Monitoring 1 open positions...
   fi_xbtusd: LONG | P&L: $0.45 (4.50%) | Time: 15m
```

---

## 🔒 **Safety Features**

### **Complete Isolation**

✅ **Separate Processes** - Futures and Spot run independently
✅ **Separate Capital** - $100 futures, $460 spot (never mix)
✅ **Separate API Keys** - Different credentials
✅ **Separate Databases** - In-memory tracking only
✅ **Easy Shutdown** - Stop futures without touching spot

### **Conservative Defaults**

✅ **2x Leverage** - Much lower than 50x maximum
✅ **Small Positions** - $10 per trade
✅ **Strict Stop Loss** - -5% automatic exit
✅ **Take Profit** - Lock in +10% gains
✅ **Time Limits** - Exit stale positions

### **Fail-Safe Mechanisms**

- If API fails → System stops trading
- If balance drops to $80 → All positions closed
- If connection lost → Graceful shutdown
- Emergency stop: `./futures-stop.sh`

---

## 🎯 **Expected Performance**

### **With $100 Capital:**

| Metric | Conservative | Moderate | Optimistic |
|--------|--------------|----------|------------|
| Trades/Day | 2-3 | 4-6 | 8-10 |
| Win Rate | 60% | 70% | 80% |
| Avg Profit | $2 | $3 | $5 |
| Daily P&L | $1-2 | $3-5 | $8-12 |
| Weekly P&L | $7-14 | $21-35 | $56-84 |

**Note**: These are estimates. Actual performance depends on market conditions and AI accuracy.

---

## 🛠️ **Troubleshooting**

### **"Futures trading is DISABLED"**

- Edit `.env` and set `FUTURES_TRADING_ENABLED=true`

### **"Failed to start Futures Trading Engine"**

1. Check `/tmp/signalcartel-logs/futures-trading.log` for errors
2. Verify API keys are set in `.env`
3. Confirm futures account is funded

### **"Authentication Error"**

- API keys might be for Spot instead of Futures
- Generate new keys from **Kraken Futures** (not Kraken Pro)

### **"Insufficient balance"**

- Verify $100 is in your Futures account (not Spot)
- Check balance in Kraken Futures web interface

---

## 📋 **Commands Reference**

```bash
# Start futures trading
./futures-start.sh

# Stop futures trading
./futures-stop.sh

# Monitor live
tail -f /tmp/signalcartel-logs/futures-trading.log

# Check if running
ps aux | grep production-trading-futures

# View last 50 log entries
tail -50 /tmp/signalcartel-logs/futures-trading.log
```

---

## 🔄 **Integration with Spot System**

### **Shared Components**

- ✅ AI Signals (Unified Tensor Coordinator)
- ✅ Adaptive Profit Brain (learning from both systems)
- ✅ Market Data Cache
- ✅ Logging Infrastructure

### **Independent Components**

- 🔒 API Clients (separate for Spot vs Futures)
- 🔒 Balance Tracking (isolated)
- 🔒 Position Management (isolated)
- 🔒 Execution Logic (independent processes)

---

## 📈 **Scaling Plan**

Once you verify the system works with $100:

### **Phase 1: Testing ($100)**
- Run for 1-2 weeks
- Verify signals are profitable
- Test LONG and SHORT positions
- Monitor leverage impact

### **Phase 2: Scale ($500)**
- Increase `FUTURES_MAX_CAPITAL=500`
- Keep position size at 10% ($50/trade)
- Same 2x leverage
- Expand to more contracts

### **Phase 3: Optimize ($1000+)**
- Tune position sizing based on performance
- Adjust leverage per contract (volatile = lower)
- Add more perpetuals
- Integrate with System Guardian monitoring

---

## ⚠️ **Important Notes**

1. **Futures Are Risky** - Can lose more than $100 if not managed properly (our system has safeguards)
2. **Separate From Spot** - These systems don't interact; you can run both simultaneously
3. **Test First** - Consider using `FUTURES_DEMO_MODE=true` for paper trading
4. **Monitor Actively** - Especially in first 24-48 hours
5. **Emergency Stop** - Always know how to quickly stop: `./futures-stop.sh`

---

## 📞 **Support**

If you encounter issues:

1. Check `/tmp/signalcartel-logs/futures-trading.log`
2. Review this documentation
3. Verify `.env` configuration
4. Ensure futures account is funded
5. Test API connectivity: Run `npx tsx -e "import { getKrakenFuturesClient } from './src/lib/kraken-futures-client'; getKrakenFuturesClient().healthCheck().then(ok => console.log('Health:', ok))"`

---

**Last Updated**: October 1, 2025
**Version**: V3.11.0 - Isolated Futures Integration
**Status**: Ready for Activation ⚡
