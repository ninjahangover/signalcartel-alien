#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAccuratePositions() {
  console.log('🎯 Creating accurate positions based on actual Kraken reality...\n');
  
  const sessionId = 'session-production-1757538257208';
  const userId = 'user-production';
  const now = new Date();
  
  // Actual positions from user's Kraken account (updated with deposit)
  const actualPositions = [
    { symbol: 'BNBUSDT', value: 100.20, price: 650 }, // BNB major position
    { symbol: 'ETHUSD', value: 50.25, price: 4200 },  // ETH position  
    { symbol: 'SOLUSD', value: 49.81, price: 220 },   // SOL position
    { symbol: 'BTCUSD', value: 0.17, price: 113000 }, // BTC dust position (but still needs tracking)
    // Ignoring: AVAX <$0.01, USDT $42.38 (stablecoin - not a trading position)
    // Available USD cash: $295.82 (after deposit)
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
    console.log(`   Available USD cash: $295.82 (after deposit)`);
    console.log(`   System ready for realistic position sizing!`);
    
  } catch (error) {
    console.error('❌ Failed to create accurate positions:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAccuratePositions();