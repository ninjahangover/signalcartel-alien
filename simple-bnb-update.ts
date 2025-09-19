/**
 * Simple database update for BNB position quantity
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

async function updateBNBPosition() {
  console.log('🔄 UPDATING BNB POSITION IN DATABASE\n');

  // Get actual Kraken BNB balance
  const balance = await krakenApiCall('Balance');
  const actualBNB = parseFloat(balance?.BNB || '0');
  console.log(`Actual Kraken BNB balance: ${actualBNB} BNB`);

  // Import Prisma client dynamically
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Find BNB position
    const bnbPosition = await prisma.position.findFirst({
      where: {
        symbol: 'BNBUSD',
        status: 'open'
      }
    });

    if (!bnbPosition) {
      console.log('❌ No open BNB position found in database');
      return;
    }

    console.log(`Database BNB position: ${bnbPosition.quantity} BNB`);
    console.log(`Difference: ${(bnbPosition.quantity - actualBNB).toFixed(6)} BNB`);

    // Update to actual balance
    const updated = await prisma.position.update({
      where: { id: bnbPosition.id },
      data: {
        quantity: actualBNB,
        updated_at: new Date()
      }
    });

    console.log('✅ BNB position updated successfully!');
    console.log(`New quantity: ${updated.quantity} BNB`);
    console.log(`New value at $916: $${(updated.quantity * 916).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Database update failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateBNBPosition().catch(console.error);