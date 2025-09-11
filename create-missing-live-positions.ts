#!/usr/bin/env tsx
/**
 * Create missing LivePosition entries for existing open positions
 * This script backfills the LivePosition table for positions created before the dashboard fix
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function createMissingLivePositions() {
  console.log('🔧 Creating missing LivePosition entries for dashboard visibility...\n');

  try {
    // Get all open positions from ManagedPosition
    const openPositions = await prisma.managedPosition.findMany({
      where: { status: 'open' }
    });

    console.log(`📊 Found ${openPositions.length} open positions in ManagedPosition table`);

    if (openPositions.length === 0) {
      console.log('✅ No open positions found - nothing to backfill');
      return;
    }

    const sessionId = process.env.LIVE_TRADING_SESSION_ID || 'session-production-1757538257208';
    console.log(`🔑 Using session ID: ${sessionId}\n`);

    for (const position of openPositions) {
      const livePositionId = `live-pos-${position.id}`;
      
      // Check if LivePosition already exists
      const existingLivePosition = await prisma.livePosition.findUnique({
        where: { id: livePositionId }
      });

      if (existingLivePosition) {
        console.log(`⏭️  LivePosition ${livePositionId} already exists for ${position.symbol}`);
        continue;
      }

      try {
        // Create the missing LivePosition
        await prisma.livePosition.create({
          data: {
            id: livePositionId,
            sessionId: sessionId,
            symbol: position.symbol,
            strategy: position.strategy,
            side: position.side,
            quantity: position.quantity,
            entryPrice: position.entryPrice,
            entryValue: position.quantity * position.entryPrice,
            entryTime: position.entryTime,
            entryTradeIds: position.entryTradeId || 'unknown',
            status: 'open',
            unrealizedPnL: 0.0,
            totalCommissions: 0.0,
            totalFees: 0.0,
            createdAt: position.createdAt,
            updatedAt: new Date()
          }
        });

        console.log(`✅ Created LivePosition ${livePositionId} for ${position.symbol} (${position.side})`);
        
        // Also update the corresponding LiveTrade to link to this position
        const correspondingLiveTrade = await prisma.liveTrade.findFirst({
          where: {
            symbol: position.symbol,
            side: position.side,
            quantity: position.quantity,
            price: position.entryPrice,
            purpose: 'open'
          },
          orderBy: { executedAt: 'desc' }
        });

        if (correspondingLiveTrade && !correspondingLiveTrade.positionId) {
          await prisma.liveTrade.update({
            where: { id: correspondingLiveTrade.id },
            data: { positionId: livePositionId }
          });
          console.log(`🔗 Linked LiveTrade ${correspondingLiveTrade.id} to LivePosition ${livePositionId}`);
        }

      } catch (error) {
        console.error(`❌ Failed to create LivePosition for ${position.symbol}: ${error.message}`);
      }
    }

    // Verify the results
    console.log('\n📊 VERIFICATION:');
    const livePositionCount = await prisma.livePosition.count();
    const openLivePositionCount = await prisma.livePosition.count({
      where: { status: 'open' }
    });

    console.log(`✅ Total LivePositions: ${livePositionCount}`);
    console.log(`✅ Open LivePositions: ${openLivePositionCount}`);
    console.log(`✅ Expected open positions: ${openPositions.length}`);

    if (openLivePositionCount === openPositions.length) {
      console.log('\n🎉 SUCCESS: All open positions now have corresponding LivePosition entries!');
      console.log('🖥️  Dashboard should now display all open positions correctly.');
    } else {
      console.log('\n⚠️  WARNING: Mismatch between expected and actual LivePosition count');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔐 Database connection closed');
  }
}

createMissingLivePositions().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});