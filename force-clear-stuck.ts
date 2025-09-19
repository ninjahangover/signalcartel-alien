/**
 * Force clear any remaining stuck positions from all tracking tables
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function forceClearStuck() {
  console.log('🧹 FORCE CLEARING: Any remaining stuck positions...');

  try {
    // Check what's still there
    const managedPos = await prisma.managedPosition.findMany({});
    console.log(`📊 Found ${managedPos.length} managed positions:`);
    managedPos.forEach(pos => {
      console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} (${pos.status})`);
    });

    const managedTrades = await prisma.managedTrade.findMany({});
    console.log(`📊 Found ${managedTrades.length} managed trades`);

    // Force delete everything
    const posResult = await prisma.managedPosition.deleteMany({});
    console.log(`✅ Force deleted ${posResult.count} managed positions`);

    const tradeResult = await prisma.managedTrade.deleteMany({});
    console.log(`✅ Force deleted ${tradeResult.count} managed trades`);

    // Clear LivePosition too
    try {
      const liveResult = await prisma.livePosition.deleteMany({});
      console.log(`✅ Force deleted ${liveResult.count} live positions`);
    } catch (e) {
      console.log('ℹ️ LivePosition cleared or not found');
    }

    // Clear LiveTrade too
    try {
      const liveTradeResult = await prisma.liveTrade.deleteMany({});
      console.log(`✅ Force deleted ${liveTradeResult.count} live trades`);
    } catch (e) {
      console.log('ℹ️ LiveTrade cleared or not found');
    }

    console.log('🎯 ALL STUCK POSITIONS FORCE CLEARED - Dashboard should be clean now!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceClearStuck();