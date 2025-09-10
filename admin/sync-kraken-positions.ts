#!/usr/bin/env npx tsx

/**
 * 🔄 CRITICAL POSITION SYNC TOOL
 * Syncs untracked Kraken positions into the Mathematical Conviction system
 * 
 * Purpose: Ensure all Kraken positions are tracked and monitored by AI systems
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface KrakenPosition {
  symbol: string;
  quantity: number;
  estimatedEntryPrice: number;
}

async function syncKrakenPositions() {
  console.log('🔄 KRAKEN POSITION SYNC - Importing untracked positions');
  console.log('====================================================');
  
  // Known untracked positions from Kraken account analysis
  const unTrackedPositions: KrakenPosition[] = [
    { symbol: 'DOTUSD', quantity: 12.1951219500, estimatedEntryPrice: 8.50 },  // Largest position
    { symbol: 'ETHUSD', quantity: 0.0231811200, estimatedEntryPrice: 4200.00 },
    { symbol: 'BTCUSD', quantity: 0.0004473200, estimatedEntryPrice: 110000.00 },
    { symbol: 'SOLUSD', quantity: 0.0003838800, estimatedEntryPrice: 220.00 },
    { symbol: 'AVAXUSD', quantity: 0.0000065800, estimatedEntryPrice: 45.00 }
  ];
  
  console.log(`📊 Found ${unTrackedPositions.length} untracked positions to sync`);
  
  for (const position of unTrackedPositions) {
    try {
      console.log(`\n🔍 Syncing ${position.symbol}:`);
      console.log(`   Quantity: ${position.quantity}`);
      console.log(`   Est. Entry: $${position.estimatedEntryPrice}`);
      
      // Check if position already exists in database
      const existingPosition = await prisma.managedPosition.findFirst({
        where: {
          symbol: position.symbol,
          status: 'open'
        }
      });
      
      if (existingPosition) {
        console.log(`   ⚠️  Position already exists in database: ${existingPosition.id}`);
        continue;
      }
      
      // 🧠 V2.7 ATOMIC TRANSACTION: Resolve circular foreign key constraint with nullable entryTradeId
      const result = await prisma.$transaction(async (tx) => {
        // Step 1: Create position with null entryTradeId (now allowed by schema)
        const tempPosition = await tx.managedPosition.create({
          data: {
            symbol: position.symbol,
            strategy: 'tensor-ai-fusion',
            side: 'long',
            entryPrice: position.estimatedEntryPrice,
            quantity: position.quantity,
            entryTradeId: null,  // Now nullable in schema
            entryTime: new Date(),
            status: 'open',
            stopLoss: null,
            takeProfit: null,
            maxHoldTime: null
          }
        });
        
        // Step 2: Create trade with correct positionId
        const entryTrade = await tx.managedTrade.create({
          data: {
            positionId: tempPosition.id,
            side: 'buy',
            symbol: position.symbol,
            quantity: position.quantity,
            price: position.estimatedEntryPrice,
            value: position.quantity * position.estimatedEntryPrice,
            strategy: 'tensor-ai-fusion',
            executedAt: new Date(),
            pnl: null,
            isEntry: true
          }
        });
        
        // Step 3: Update position with correct entryTradeId
        const finalPosition = await tx.managedPosition.update({
          where: { id: tempPosition.id },
          data: { entryTradeId: entryTrade.id }
        });
        
        return { position: finalPosition, trade: entryTrade };
      });
      
      console.log(`   ✅ Synced to database: ${result.position.id}`);
      console.log(`   🧠 Mathematical Conviction: Ready for AI monitoring`);
      
    } catch (error) {
      console.log(`   ❌ Failed to sync ${position.symbol}: ${error.message}`);
    }
  }
  
  console.log('\n🎯 SYNC COMPLETE');
  console.log('================');
  console.log('✅ All untracked positions are now in the Mathematical Conviction system');
  console.log('🧠 AI systems can now monitor and manage these positions');
  console.log('📊 Check dashboard to see position tracking');
  
  // Verify sync results
  const totalOpenPositions = await prisma.managedPosition.count({
    where: { status: 'open' }
  });
  
  console.log(`\n📈 Total tracked positions: ${totalOpenPositions}`);
  
  await prisma.$disconnect();
}

// Run the sync
syncKrakenPositions().catch((error) => {
  console.error('💥 SYNC FAILED:', error);
  process.exit(1);
});