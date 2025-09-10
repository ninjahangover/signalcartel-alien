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
    // User has 2 ETH positions and 1 SOLUSD position to track
    const positions = [
      { symbol: 'ETHUSD', quantity: 0.01152073732718894, entryPrice: 4340.00 },
      { symbol: 'ETHUSD', quantity: 0.01152073732718894, entryPrice: 4340.00 },
      { symbol: 'SOLUSD', quantity: 0.2244265900623906, entryPrice: 222.79 }
    ];
    
    for (const pos of positions) {
      const tradeId = `trade-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Step 1: Create the entry trade first (using tradeId as positionId too)
      await prisma.$executeRaw`
        INSERT INTO "ManagedTrade" (
          id, "positionId", symbol, side, quantity, price, value, 
          "isEntry", strategy, "executedAt"
        ) VALUES (
          ${tradeId},
          ${tradeId},
          ${pos.symbol},
          'buy',
          ${pos.quantity},
          ${pos.entryPrice},
          ${pos.quantity * pos.entryPrice},
          true,
          'tensor-ai-fusion',
          now()
        )
      `;
      
      // Step 2: Create the position (using tradeId as both position ID and entryTradeId)
      await prisma.$executeRaw`
        INSERT INTO "ManagedPosition" (
          id, symbol, strategy, side, "entryPrice", quantity, 
          "entryTradeId", "entryTime", status, "createdAt", "updatedAt"
        ) VALUES (
          ${tradeId},
          ${pos.symbol},
          'tensor-ai-fusion',
          'long',
          ${pos.entryPrice},
          ${pos.quantity},
          ${tradeId},
          now(),
          'open',
          now(),
          now()
        )
      `;
      
      console.log(`✅ ${pos.symbol}: ${pos.quantity} units @ $${pos.entryPrice} (ID: ${tradeId})`);
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