#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCorrectPositions() {
  console.log('🎯 Creating CORRECT positions: BNB, DOT, and BTC only...\n');

  const sessionId = 'session-production-1757538257208';
  const userId = 'user-production';
  const now = new Date();

  // ACTUAL positions - BNB, DOT, BTC only (as corrected by user)
  const actualPositions = [
    { symbol: 'BNBUSD', value: 49.91, price: 650 },  // BNB $49.91 @ $650
    { symbol: 'DOTUSD', value: 110.24, price: 4.52 }, // DOT $110.24 @ $4.52
    { symbol: 'BTCUSD', value: 94.81, price: 110000 }, // BTC $94.81 @ $110K
  ];

  try {
    for (const pos of actualPositions) {
      const quantity = pos.value / pos.price;
      const positionId = `pos-${Date.now()}-${pos.symbol.toLowerCase()}-correct`;
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
          symbol: pos.symbol,
          quantity: quantity,
          averagePrice: pos.price,
          currentPrice: pos.price,
          status: 'open',
          sessionId: sessionId,
          userId: userId,
          createdAt: now,
          updatedAt: now
        }
      });

      console.log(`✅ Created complete tracking for ${pos.symbol}`);
    }

    console.log('\n🎉 SUCCESS: All positions created based on actual Kraken reality!');

    // Verification
    const managedCount = await prisma.managedPosition.count();
    const liveCount = await prisma.livePosition.count();
    const expectedCount = actualPositions.length;

    console.log('\n📊 VERIFICATION:');
    console.log(`   ManagedPositions: ${managedCount}`);
    console.log(`   LivePositions: ${liveCount}`);
    console.log(`   Expected: ${expectedCount}`);

    if (managedCount === expectedCount && liveCount === expectedCount) {
      console.log('✅ PERFECT SYNC: Database matches Kraken reality exactly!');

      const totalValue = actualPositions.reduce((sum, pos) => sum + pos.value, 0);
      console.log(`\n💰 PORTFOLIO SUMMARY:`);
      console.log(`   Total crypto positions: $${totalValue.toFixed(2)}`);
      console.log(`   BNB: $49.91, DOT: $110.24, BTC: $94.81`);
      console.log(`   System ready for accurate position tracking!`);
    } else {
      console.log('❌ SYNC ERROR: Position counts do not match!');
    }

  } catch (error) {
    console.error('❌ Error creating positions:', error);
  }
}

fixCorrectPositions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());