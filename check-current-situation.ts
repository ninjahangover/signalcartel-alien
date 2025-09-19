/**
 * Quick check of current Kraken balance and open orders to understand BNB situation
 */

const KRAKEN_API_KEY = 'DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR';
const KRAKEN_PRIVATE_KEY = 'p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==';

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

async function checkCurrentSituation() {
  console.log('🔍 CHECKING CURRENT KRAKEN SITUATION\n');

  // Check account balance
  console.log('1. Account Balance:');
  console.log('==================');
  const balance = await krakenApiCall('Balance');
  if (balance) {
    console.log('BNB Balance:', balance.BNB || '0');
    console.log('USD Balance:', balance.ZUSD || '0');
    console.log('All balances:', JSON.stringify(balance, null, 2));
  }

  console.log('\n2. Open Orders:');
  console.log('===============');
  const openOrders = await krakenApiCall('OpenOrders');
  if (openOrders && openOrders.open) {
    const orders = Object.values(openOrders.open);
    console.log(`Found ${orders.length} open orders:`);

    orders.forEach((order: any, index) => {
      console.log(`\nOrder ${index + 1}:`);
      console.log(`  Pair: ${order.descr.pair}`);
      console.log(`  Type: ${order.descr.type}`);
      console.log(`  Order Type: ${order.descr.ordertype}`);
      console.log(`  Volume: ${order.vol}`);
      console.log(`  Price: ${order.descr.price}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Value: $${(parseFloat(order.vol) * parseFloat(order.descr.price || '0')).toFixed(2)}`);
    });

    // Calculate total open orders value
    const totalValue = orders.reduce((sum: number, order: any) => {
      return sum + (parseFloat(order.vol) * parseFloat(order.descr.price || '0'));
    }, 0);
    console.log(`\n💰 Total Open Orders Value: $${totalValue.toFixed(2)}`);
  }

  console.log('\n3. Recent Trades (last 5):');
  console.log('===========================');
  const trades = await krakenApiCall('TradesHistory', { count: 5 });
  if (trades && trades.trades) {
    const tradeArray = Object.entries(trades.trades).slice(0, 5);
    tradeArray.forEach(([txId, trade]: [string, any]) => {
      console.log(`${trade.pair}: ${trade.type} ${trade.vol} @ $${trade.price} = $${trade.cost}`);
    });
  }
}

checkCurrentSituation().catch(console.error);