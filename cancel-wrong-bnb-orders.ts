/**
 * Cancel wrong BNBUSDT orders and create correct BNBUSD order
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

async function fixBNBOrders() {
  console.log('🔧 FIXING BNB ORDERS - CANCEL BNBUSDT & CREATE BNBUSD\n');

  // 1. Get current BNB balance
  const balance = await krakenApiCall('Balance');
  const actualBNB = parseFloat(balance?.BNB || '0');
  console.log(`Current BNB Balance: ${actualBNB} BNB\n`);

  // 2. Cancel all BNBUSDT orders (wrong pair)
  console.log('1. Canceling incorrect BNBUSDT orders...');
  const openOrders = await krakenApiCall('OpenOrders');

  if (openOrders && openOrders.open) {
    const bnbUsdtOrders = Object.entries(openOrders.open).filter(([_, order]: [string, any]) =>
      order.descr.pair === 'BNBUSDT'
    );

    console.log(`Found ${bnbUsdtOrders.length} BNBUSDT orders to cancel`);

    for (const [orderId, order] of bnbUsdtOrders) {
      console.log(`   Canceling: ${order.descr.type} ${order.vol} BNBUSDT @ ${order.descr.price}`);

      const cancelResult = await krakenApiCall('CancelOrder', { txid: orderId });
      if (cancelResult) {
        console.log(`   ✅ Canceled order ${orderId}`);
      } else {
        console.log(`   ❌ Failed to cancel order ${orderId}`);
      }

      // Small delay between cancellations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 3. Create single BNBUSD sell order for all remaining BNB
  if (actualBNB > 0.01) {
    console.log(`\n2. Creating proper BNBUSD sell order for ${actualBNB} BNB...`);

    // Get current BNBUSD price
    const ticker = await krakenApiCall('Ticker', { pair: 'BNBUSD' });
    const currentPrice = parseFloat(ticker?.BNBUSD?.c?.[0] || '900');
    const sellPrice = Math.round(currentPrice * 1.005 * 100) / 100; // 0.5% above current price

    console.log(`   Current BNBUSD price: $${currentPrice}`);
    console.log(`   Setting sell limit at: $${sellPrice}`);
    console.log(`   Order value: $${(actualBNB * sellPrice).toFixed(2)}`);

    const orderResult = await krakenApiCall('AddOrder', {
      pair: 'BNBUSD',
      type: 'sell',
      ordertype: 'limit',
      volume: actualBNB.toFixed(8),
      price: sellPrice.toFixed(2)
    });

    if (orderResult && orderResult.txid) {
      console.log(`   ✅ Created BNBUSD sell order!`);
      console.log(`   Order ID: ${orderResult.txid[0]}`);
      console.log(`   Order: SELL ${actualBNB} BNB @ $${sellPrice} on BNBUSD`);
    } else {
      console.log(`   ❌ Failed to create sell order`);
      console.log(`   Response:`, orderResult);
    }
  }

  console.log('\n✅ BNB order fix completed!');
}

fixBNBOrders().catch(console.error);