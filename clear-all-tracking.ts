/**
 * Clear all position and trade tracking for fresh start
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllTracking() {
  console.log('🧹 CLEARING ALL TRACKING: Fresh start for unified system...');

  try {
    // Clear ManagedPosition
    const posResult = await prisma.managedPosition.deleteMany({});
    console.log(`✅ Cleared ${posResult.count} managed positions`);

    // Clear ManagedTrade
    const tradeResult = await prisma.managedTrade.deleteMany({});
    console.log(`✅ Cleared ${tradeResult.count} managed trades`);

    // Clear LivePosition if exists
    try {
      const liveResult = await prisma.livePosition.deleteMany({});
      console.log(`✅ Cleared ${liveResult.count} live positions`);
    } catch (e) {
      console.log('ℹ️ LivePosition table not found or empty');
    }

    console.log('🎯 ALL TRACKING CLEARED - System ready for fresh unified start!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllTracking();