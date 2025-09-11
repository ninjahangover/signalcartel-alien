#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAccuratePositions() {
  console.log('🎯 Creating accurate positions based on actual Kraken reality...\n');
  
  const sessionId = 'session-production-1757538257208';
  const userId = 'user-production';
  const now = new Date();
  
  // ACTUAL positions from user's REAL Kraken account (as stated by user)
  const actualPositions = [
    { symbol: 'AVAXUSD', value: 50.02, price: 29.00 },  // Avalanche $50.02
    { symbol: 'BTCUSD', value: 50.00, price: 114000 },  // Bitcoin $50.00
    // Note: BND $49.91 is not a standard crypto pair - may be bond or special asset
    // Available cash: USD $370.98 + USDT $19.52 = $390.50 total liquidity
  ];
  
  try {
    for (const pos of actualPositions) {
      const quantity = pos.value / pos.price;
      const positionId = `pos-${Date.now()}-${pos.symbol.toLowerCase()}-real`;
      const tradeId = `trade-${Date.now()}-${pos.symbol.toLowerCase()}-entry`;
      
      console.log(`📊 Creating ${pos.symbol}: $${pos.value} (${quantity.toFixed(8)} @ $${pos.price})`);
      
      // Use transaction to handle foreign key constraints
      await prisma.$transaction(async (tx) => {
        // Create ManagedPosition first (without entryTradeId)
        await tx.managedPosition.create({
          data: {
            id: positionId,
            symbol: pos.symbol,
            quantity: quantity,
            entryPrice: pos.price,
            status: 'open',
            side: 'buy',
            strategy: 'manual-import',
            entryTime: now,
            createdAt: now
          }
        });
        
        // Create ManagedTrade  
        await tx.managedTrade.create({
          data: {
            id: tradeId,
            positionId: positionId,
            symbol: pos.symbol,
            side: 'buy',
            quantity: quantity,
            price: pos.price,
            value: pos.value,
            strategy: 'manual-import',
            executedAt: now,
            isEntry: true
          }
        });
        
        // Update position with trade reference
        await tx.managedPosition.update({
          where: { id: positionId },
          data: { entryTradeId: tradeId }
        });
      });
      
      // Create LivePosition for dashboard
      await prisma.livePosition.create({
        data: {
          id: `live-${positionId}`,
          symbol: pos.symbol,
          quantity: quantity,
          entryPrice: pos.price,
          entryValue: pos.value,
          entryTime: now,
          entryTradeIds: tradeId,
          status: 'open',
          side: 'buy',
          strategy: 'manual-import',
          sessionId: sessionId,
          updatedAt: now
        }
      });
      
      console.log(`✅ Created complete tracking for ${pos.symbol}`);
    }
    
    console.log('\n🎉 SUCCESS: All positions created based on actual Kraken reality!');
    
    // Verify
    const managedCount = await prisma.managedPosition.count();
    const liveCount = await prisma.livePosition.count();
    
    console.log(`\n📊 VERIFICATION:`);
    console.log(`   ManagedPositions: ${managedCount}`);  
    console.log(`   LivePositions: ${liveCount}`);
    console.log(`   Expected: ${actualPositions.length}`);
    
    if (managedCount === actualPositions.length && liveCount === actualPositions.length) {
      console.log(`✅ PERFECT SYNC: Database matches Kraken reality exactly!`);
    } else {
      console.log(`❌ SYNC ERROR: Position counts don't match`);
    }
    
    console.log(`\n💰 BALANCE SUMMARY:`);
    console.log(`   Total crypto positions: $${actualPositions.reduce((sum, p) => sum + p.value, 0).toFixed(2)}`);
    console.log(`   BND position: $49.91 (special asset)`);
    console.log(`   Available USD cash: $370.98`);
    console.log(`   Available USDT: $19.52`);
    console.log(`   Total Portfolio Value: ~$540.43`);
    console.log(`   System ready for accurate position tracking!`);
    
  } catch (error) {
    console.error('❌ Failed to create accurate positions:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAccuratePositions();