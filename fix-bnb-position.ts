/**
 * Fix BNB position to match actual Kraken balance and cancel wrong orders
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function fixBNBPosition() {
  console.log('🔧 FIXING BNB POSITION MISMATCH\n');

  // 1. Check current database position
  console.log('1. Checking database BNB position...');
  const dbPosition = await prisma.position.findFirst({
    where: {
      symbol: 'BNBUSD',
      status: 'open'
    }
  });

  if (dbPosition) {
    console.log(`   Database: ${dbPosition.quantity} BNB @ $${dbPosition.entry_price}`);
  } else {
    console.log('   No BNB position in database');
  }

  // 2. Check actual Kraken balance
  console.log('\n2. Checking Kraken actual balance...');
  const balance = await krakenApiCall('Balance');
  const actualBNB = parseFloat(balance?.BNB || '0');
  console.log(`   Kraken actual: ${actualBNB} BNB`);

  // 3. Cancel all existing BNBUSDT orders (wrong pair)
  console.log('\n3. Canceling incorrect BNBUSDT orders...');
  const openOrders = await krakenApiCall('OpenOrders');
  if (openOrders && openOrders.open) {
    const bnbOrders = Object.entries(openOrders.open).filter(([_, order]: [string, any]) =>
      order.descr.pair === 'BNBUSDT'
    );

    for (const [orderId, order] of bnbOrders) {
      console.log(`   Canceling order ${orderId}: ${order.descr.type} ${order.vol} BNBUSDT @ ${order.descr.price}`);

      const cancelResult = await krakenApiCall('CancelOrder', { txid: orderId });
      if (cancelResult) {
        console.log(`   ✅ Canceled order ${orderId}`);
      } else {
        console.log(`   ❌ Failed to cancel order ${orderId}`);
      }
    }
  }

  // 4. Update database position to match actual balance
  if (dbPosition && actualBNB !== dbPosition.quantity) {
    console.log(`\n4. Updating database position: ${dbPosition.quantity} → ${actualBNB} BNB`);

    await prisma.position.update({
      where: { id: dbPosition.id },
      data: {
        quantity: actualBNB,
        updated_at: new Date()
      }
    });
    console.log('   ✅ Database position updated');
  }

  // 5. If we still have BNB, create proper BNBUSD sell order
  if (actualBNB > 0.01) { // Only if we have meaningful amount
    console.log(`\n5. Creating proper BNBUSD sell order for ${actualBNB} BNB...`);

    // Get current BNB price for BNBUSD
    const ticker = await krakenApiCall('Ticker', { pair: 'BNBUSD' });
    const currentPrice = parseFloat(ticker?.BNBUSD?.c?.[0] || '900');
    const sellPrice = Math.round(currentPrice * 1.01 * 100) / 100; // 1% above current price

    console.log(`   Current BNBUSD price: $${currentPrice}`);
    console.log(`   Setting sell limit at: $${sellPrice}`);

    const orderResult = await krakenApiCall('AddOrder', {
      pair: 'BNBUSD',
      type: 'sell',
      ordertype: 'limit',
      volume: actualBNB.toFixed(8),
      price: sellPrice.toFixed(2)
    });

    if (orderResult) {
      console.log(`   ✅ Created BNBUSD sell order: ${actualBNB} BNB @ $${sellPrice}`);
      console.log(`   Order ID: ${orderResult.txid?.[0] || 'Unknown'}`);
    } else {
      console.log(`   ❌ Failed to create sell order`);
    }
  }

  console.log('\n✅ BNB position fix completed!');

  await prisma.$disconnect();
}

fixBNBPosition().catch(console.error);