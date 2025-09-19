# Kraken Perpetual Trading Integration Guide

## Current Situation
- You have $100 USD in your Kraken perpetual trading account
- System currently generates many SELL/SHORT signals but can't execute on spot
- Need to enable perpetual trading to utilize these signals

## Key Differences: Spot vs Perpetual

### Spot Trading (Current)
- Can only BUY and SELL what you own
- Cannot short sell
- Uses regular Kraken API: `api.kraken.com`

### Perpetual/Futures Trading
- Can go LONG (buy) or SHORT (sell) without owning the asset
- Uses collateral (your $100 USD) to open positions
- Different API endpoint: `futures.kraken.com`
- Requires separate API keys from futures dashboard

## Integration Requirements

### 1. API Setup
```bash
# Need separate API credentials for futures
# Get them from: https://futures.kraken.com/trade/settings/api

KRAKEN_FUTURES_API_KEY="your_futures_api_key"
KRAKEN_FUTURES_API_SECRET="your_futures_secret"
```

### 2. Key API Endpoints

**Futures API Base URL**: `https://futures.kraken.com/derivatives/api/v3`

**Essential Endpoints**:
- `/accounts` - Get account balance and margin info
- `/openpositions` - Get current positions
- `/sendorder` - Place new orders
- `/cancelorder` - Cancel orders
- `/tickers` - Get market prices

### 3. Order Types for Perpetuals

```typescript
interface PerpetualOrder {
  orderType: 'lmt' | 'mkt';  // Limit or Market
  symbol: 'PI_XBTUSD';        // Perpetual symbols start with PI_
  side: 'buy' | 'sell';        // Buy = LONG, Sell = SHORT
  size: number;                // Contract size
  limitPrice?: number;         // For limit orders
  reduceOnly?: boolean;        // Only reduce position, don't open new
}
```

### 4. Position Management Without Leverage

To trade without leverage (1x):
```typescript
// Calculate position size based on available margin
const availableMargin = 100; // Your USD
const btcPrice = 114000;      // Current BTC price

// For 1x leverage (no leverage):
const maxContracts = availableMargin / btcPrice;

// Example: Open a SHORT position
const order = {
  orderType: 'lmt',
  symbol: 'PI_XBTUSD',
  side: 'sell',        // SHORT
  size: 0.0008,        // ~$91 worth at $114k
  limitPrice: 114500   // Limit price
};
```

### 5. Implementation Steps

1. **Create Futures API Service** (`kraken-futures-api.ts`)
2. **Add Account Type Selection** to trading system
3. **Modify Order Execution** to route to correct API
4. **Update Position Manager** to handle perpetual positions
5. **Add Risk Management** for perpetual-specific risks

### 6. Testing Without Leverage

```typescript
// Safe test trade example
async function testPerpetualTrade() {
  // 1. Check account balance
  const account = await getFuturesAccount();
  console.log('Available margin:', account.availableMargin);

  // 2. Calculate safe position size (no leverage)
  const btcPrice = await getPrice('PI_XBTUSD');
  const positionSize = Math.floor((account.availableMargin * 0.9) / btcPrice * 10000) / 10000;

  // 3. Place small test order
  const testOrder = {
    orderType: 'lmt',
    symbol: 'PI_XBTUSD',
    side: 'sell',  // Test SHORT since system wants to sell
    size: positionSize,
    limitPrice: btcPrice * 1.001  // Slightly above market
  };

  const result = await placeFuturesOrder(testOrder);
  console.log('Test order result:', result);
}
```

## Integration with Current System

### Modify `production-trading-multi-pair.ts`:

```typescript
// Add account type configuration
const ACCOUNT_TYPE = process.env.ACCOUNT_TYPE || 'SPOT'; // SPOT or PERPETUAL

// In trade execution logic:
if (signal === 'SELL' && !hasPosition) {
  if (ACCOUNT_TYPE === 'PERPETUAL') {
    // Can execute SHORT on perpetual
    await executePerpetualShort(symbol, amount);
  } else {
    // Current behavior - skip on spot
    console.log('Cannot short on spot account');
  }
}
```

## Risk Considerations

1. **No Leverage Initially**: Keep leverage at 1x for safety
2. **Position Sizing**: Never risk more than 90% of available margin
3. **Stop Losses**: Always set stop losses for perpetual positions
4. **Funding Rates**: Perpetuals have funding costs every 8 hours
5. **Liquidation**: Even at 1x, extreme moves can liquidate

## Next Steps

1. Set up Kraken Futures API credentials
2. Create test script to verify access
3. Implement basic perpetual order placement
4. Test with minimal position size ($10-20)
5. Monitor for 24 hours before increasing size

## Monitoring

Once enabled, monitor:
- Funding rates paid/received
- Margin usage percentage
- Unrealized P&L
- Number of SHORT positions successfully opened
- Win rate on SHORT trades vs LONG trades