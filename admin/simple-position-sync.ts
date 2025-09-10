#!/usr/bin/env npx tsx

/**
 * 🔄 SIMPLE POSITION SYNC TOOL
 * Manually insert untracked positions to bypass complex database constraints
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simplePositionSync() {
  console.log('🔄 SIMPLE KRAKEN POSITION SYNC');
  console.log('===============================');
  
  try {
    // Get current positions
    const currentPositions = await prisma.managedPosition.findMany({
      where: { status: 'open' }
    });
    
    console.log(`📊 Current tracked positions: ${currentPositions.length}`);
    
    if (currentPositions.length > 0) {
      console.log('⚠️  Positions already tracked. Skipping sync.');
      return;
    }
    
    // Direct SQL insertion to bypass complex constraints
    const positions = [
      { symbol: 'DOTUSD', quantity: 12.1951219500, entryPrice: 8.50 },
      { symbol: 'ETHUSD', quantity: 0.0231811200, entryPrice: 4200.00 },
      { symbol: 'BTCUSD', quantity: 0.0004473200, entryPrice: 110000.00 },
      { symbol: 'SOLUSD', quantity: 0.0003838800, entryPrice: 220.00 },
      { symbol: 'AVAXUSD', quantity: 0.0000065800, entryPrice: 45.00 }
    ];
    
    for (const pos of positions) {
      const result = await prisma.$executeRaw`
        INSERT INTO "ManagedPosition" (
          id, symbol, strategy, side, "entryPrice", quantity, 
          "entryTradeId", "entryTime", status, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid()::text,
          ${pos.symbol},
          'tensor-ai-fusion',
          'long',
          ${pos.entryPrice},
          ${pos.quantity},
          concat('sync-', extract(epoch from now())::text),
          now(),
          'open',
          now(),
          now()
        )
      `;
      
      console.log(`✅ ${pos.symbol}: ${pos.quantity} units @ $${pos.entryPrice}`);
    }
    
    const finalCount = await prisma.managedPosition.count({
      where: { status: 'open' }
    });
    
    console.log('');
    console.log('🎯 SYNC COMPLETE');
    console.log(`📈 Total tracked positions: ${finalCount}`);
    console.log('🧠 Mathematical Conviction system can now monitor these positions');
    
  } catch (error) {
    console.error('💥 SYNC FAILED:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simplePositionSync();