/**
 * Query Kraken API directly to see all BNB trades and calculate proper average entry price
 */

// Hardcoded credentials that work
const KRAKEN_API_KEY = 'DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR';
const KRAKEN_PRIVATE_KEY = 'p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==';

// Kraken API call function
async function krakenApiCall(endpoint: string, params: any = {}) {
  try {
    const response = await fetch('http://localhost:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        params,
        apiKey: KRAKEN_API_KEY,
        apiSecret: KRAKEN_PRIVATE_KEY
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken error: ${data.error.join(', ')}`);
    }

    return data.result;
  } catch (error) {
    console.error(`Kraken API ${endpoint} failed:`, error.message);
    return null;
  }
}

async function checkBNBTrades() {
  console.log('🔍 Querying Kraken API for BNB trades...\n');

  try {
    // Get trades history
    const tradesResult = await krakenApiCall('TradesHistory');

    if (!tradesResult || !tradesResult.trades) {
      console.log('❌ No trades data received from Kraken');
      return;
    }

    const trades = tradesResult.trades;
    const bnbTrades = [];

    console.log(`📊 Found ${Object.keys(trades).length} total trades in Kraken history`);
    console.log('🔍 Filtering for BNB trades...\n');

    // Filter BNB trades - check all possible BNB symbols
    for (const [txId, trade] of Object.entries(trades)) {
      console.log(`Trade: ${trade.pair} - ${trade.type} ${trade.vol} @ ${trade.price}`);

      if (trade.pair.includes('BNB') ||
          trade.pair === 'BNBUSD' ||
          trade.pair === 'BNB/USD' ||
          trade.pair === 'XBNBZUSD' ||
          trade.pair === 'BNB' ||
          trade.pair.startsWith('BNB')) {
        bnbTrades.push({
          txId,
          ...trade,
          timestamp: new Date(trade.time * 1000)
        });
      }
    }

    if (bnbTrades.length === 0) {
      console.log('❌ No BNB trades found in Kraken history');
      return;
    }

    console.log(`📈 Found ${bnbTrades.length} BNB trades:`);
    console.log('=====================================\n');

    let totalQuantity = 0;
    let totalCost = 0;
    let buyTrades = [];

    bnbTrades.sort((a, b) => a.time - b.time); // Sort by time

    bnbTrades.forEach((trade, index) => {
      const quantity = parseFloat(trade.vol);
      const price = parseFloat(trade.price);
      const cost = parseFloat(trade.cost);
      const type = trade.type;

      console.log(`${index + 1}. ${type.toUpperCase()} ${quantity} BNB @ $${price} = $${cost.toFixed(2)}`);
      console.log(`   TX ID: ${trade.txId}`);
      console.log(`   Time: ${trade.timestamp.toLocaleString()}`);
      console.log(`   Fee: $${parseFloat(trade.fee).toFixed(2)}\n`);

      if (type === 'buy') {
        buyTrades.push(trade);
        totalQuantity += quantity;
        totalCost += cost;
      }
    });

    if (buyTrades.length > 0) {
      const averagePrice = totalCost / totalQuantity;

      console.log('📊 BNB POSITION CALCULATION:');
      console.log('=====================================');
      console.log(`Total BUY trades: ${buyTrades.length}`);
      console.log(`Total quantity bought: ${totalQuantity.toFixed(6)} BNB`);
      console.log(`Total cost: $${totalCost.toFixed(2)}`);
      console.log(`Average entry price: $${averagePrice.toFixed(2)}`);
      console.log(`Current database entry price: $593.00`);

      if (Math.abs(averagePrice - 593) > 0.01) {
        console.log(`\n⚠️  ENTRY PRICE MISMATCH!`);
        console.log(`   Database: $593.00`);
        console.log(`   Calculated: $${averagePrice.toFixed(2)}`);
        console.log(`   Difference: $${(averagePrice - 593).toFixed(2)}`);
      } else {
        console.log(`\n✅ Entry prices match!`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking BNB trades:', error);
  }
}

checkBNBTrades();