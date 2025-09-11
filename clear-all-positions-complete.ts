#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllPositionsComplete() {
  console.log('🧨 NUCLEAR OPTION: Clearing ALL position data for fresh start...\n');
  
  try {
    // Delete all LiveTrades
    const liveTradesDeleted = await prisma.liveTrade.deleteMany({});
    console.log(`🗑️ Deleted ${liveTradesDeleted.count} LiveTrade entries`);
    
    // Delete all LivePositions
    const livePositionsDeleted = await prisma.livePosition.deleteMany({});
    console.log(`🗑️ Deleted ${livePositionsDeleted.count} LivePosition entries`);
    
    // Delete all ManagedTrades
    const managedTradesDeleted = await prisma.managedTrade.deleteMany({});
    console.log(`🗑️ Deleted ${managedTradesDeleted.count} ManagedTrade entries`);
    
    // Delete all ManagedPositions
    const managedPositionsDeleted = await prisma.managedPosition.deleteMany({});
    console.log(`🗑️ Deleted ${managedPositionsDeleted.count} ManagedPosition entries`);
    
    console.log('\n✅ COMPLETE WIPE: All position tracking data cleared');
    console.log('💫 Ready for fresh position creation based on Kraken reality');
    
  } catch (error) {
    console.error('❌ Failed to clear positions:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllPositionsComplete();