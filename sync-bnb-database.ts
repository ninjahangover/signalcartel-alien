/**
 * Update database BNB position to match actual Kraken balance
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

async function syncBNBPosition() {
  console.log('🔄 SYNCING BNB DATABASE POSITION WITH KRAKEN BALANCE\n');

  // 1. Get actual Kraken BNB balance
  const balance = await krakenApiCall('Balance');
  const actualBNB = parseFloat(balance?.BNB || '0');
  console.log(`Actual Kraken BNB balance: ${actualBNB} BNB`);

  // 2. Check current database position
  const dbPosition = await prisma.position.findFirst({
    where: {
      symbol: 'BNBUSD',
      status: 'open'
    }
  });

  if (!dbPosition) {
    console.log('❌ No BNB position found in database');
    await prisma.$disconnect();
    return;
  }

  console.log(`Database BNB position: ${dbPosition.quantity} BNB`);
  console.log(`Position value discrepancy: $${(dbPosition.quantity - actualBNB) * 916}`);

  // 3. Update database to match actual balance
  if (Math.abs(dbPosition.quantity - actualBNB) > 0.001) {
    console.log(`\n🔧 Updating database position: ${dbPosition.quantity} → ${actualBNB} BNB`);

    const updatedPosition = await prisma.position.update({
      where: { id: dbPosition.id },
      data: {
        quantity: actualBNB,
        updated_at: new Date()
      }
    });

    console.log('✅ Database position updated successfully');
    console.log(`New position: ${updatedPosition.quantity} BNB`);

    // Calculate new position value
    const currentPrice = 916; // Approximate current price
    const newValue = actualBNB * currentPrice;
    console.log(`New position value: $${newValue.toFixed(2)}`);
  } else {
    console.log('✅ Database position already matches Kraken balance');
  }

  await prisma.$disconnect();
  console.log('\n🎯 BNB position sync completed!');
}

syncBNBPosition().catch(console.error);