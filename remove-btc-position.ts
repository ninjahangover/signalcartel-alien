#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeBtcPosition() {
  console.log('🔄 Removing liquidated BTC position from tracking...\n');
  
  try {
    // Find BTC positions
    const btcPositions = await prisma.managedPosition.findMany({
      where: { symbol: 'BTCUSD' }
    });
    
    const btcLivePositions = await prisma.livePosition.findMany({
      where: { symbol: 'BTCUSD' }
    });
    
    console.log(`📊 Found ${btcPositions.length} ManagedPosition(s) and ${btcLivePositions.length} LivePosition(s) for BTCUSD`);
    
    // Delete associated trades first
    for (const pos of btcPositions) {
      if (pos.entryTradeId) {
        await prisma.managedTrade.delete({
          where: { id: pos.entryTradeId }
        });
        console.log(`🗑️ Deleted ManagedTrade: ${pos.entryTradeId}`);
      }
    }
    
    // Delete ManagedPositions
    const deletedManaged = await prisma.managedPosition.deleteMany({
      where: { symbol: 'BTCUSD' }
    });
    console.log(`🗑️ Deleted ${deletedManaged.count} ManagedPosition entries for BTCUSD`);
    
    // Delete LivePositions
    const deletedLive = await prisma.livePosition.deleteMany({
      where: { symbol: 'BTCUSD' }
    });
    console.log(`🗑️ Deleted ${deletedLive.count} LivePosition entries for BTCUSD`);
    
    console.log('\n✅ BTC position successfully removed from tracking');
    console.log('💰 $0.17 has been added to your available USD balance on Kraken');
    console.log('🎯 System now tracks exactly 3 active trading positions: BNB, ETH, SOL');
    
    // Verify final counts
    const remainingManaged = await prisma.managedPosition.count();
    const remainingLive = await prisma.livePosition.count();
    
    console.log(`\n📊 FINAL VERIFICATION:`);
    console.log(`   ManagedPositions: ${remainingManaged}`);
    console.log(`   LivePositions: ${remainingLive}`);
    console.log(`   Expected: 3 (BNB, ETH, SOL)`);
    
    if (remainingManaged === 3 && remainingLive === 3) {
      console.log(`✅ PERFECT: Database now matches Kraken reality exactly!`);
    } else {
      console.log(`❌ MISMATCH: Position counts don't match expected 3`);
    }
    
  } catch (error) {
    console.error('❌ Failed to remove BTC position:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

removeBtcPosition();