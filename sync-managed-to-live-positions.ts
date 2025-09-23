#!/usr/bin/env npx tsx

/**
 * Sync ManagedPosition/ManagedTrade data to LivePosition/LiveTrade tables
 * This fixes the dashboard connectivity and P&L tracking issues
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncManagedToLivePositions() {
  console.log('🔄 Starting sync from ManagedPosition to LivePosition...');

  try {
    // Get all managed positions
    const managedPositions = await prisma.managedPosition.findMany({
      include: {
        entryTrade: true,
        exitTrade: true
      }
    });

    console.log(`📊 Found ${managedPositions.length} managed positions to sync`);

    // Get or create a user first
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: 'production-user-' + Date.now(),
          email: 'production@signalcartel.local',
          name: 'Production Trading User'
        }
      });
    }

    // Get current trading session or create one
    let session = await prisma.liveTradingSession.findFirst({
      where: { status: 'active' },
      orderBy: { startedAt: 'desc' }
    });

    if (!session) {
      session = await prisma.liveTradingSession.create({
        data: {
          userId: user.id,
          sessionName: `Production Trading Session ${new Date().toISOString().split('T')[0]}`,
          strategy: 'QUANTUM_FORGE_PRODUCTION',
          status: 'active',
          startedAt: new Date(),
          initialCapital: 600.0,
          currentCapital: 600.0,
          maxDailyLoss: 50.0,
          maxPositionSize: 100.0
        }
      });
      console.log(`✅ Created new trading session: ${session.id}`);
    }

    for (const managedPos of managedPositions) {
      // Check if LivePosition already exists
      const existingLivePos = await prisma.livePosition.findFirst({
        where: {
          symbol: managedPos.symbol,
          side: managedPos.side,
          entryTime: managedPos.entryTime
        }
      });

      if (existingLivePos) {
        console.log(`⏭️  Skipping ${managedPos.symbol} - already exists in LivePosition`);
        continue;
      }

      // Calculate entry value and current price
      const entryValue = managedPos.quantity * managedPos.entryPrice;
      const currentPrice = managedPos.exitPrice || managedPos.entryPrice; // Use exit price if closed

      // Create corresponding LivePosition
      const livePositionData = {
        id: managedPos.id.replace('pos-', 'live-pos-pos-'),
        sessionId: session.id,
        symbol: managedPos.symbol,
        strategy: managedPos.strategy,
        side: managedPos.side,
        quantity: managedPos.quantity,
        entryPrice: managedPos.entryPrice,
        entryValue: entryValue,
        entryTime: managedPos.entryTime,
        entryTradeIds: managedPos.entryTradeId || '',
        currentPrice: currentPrice,
        unrealizedPnL: managedPos.unrealizedPnL || 0,
        status: managedPos.status === 'open' ? 'open' : 'closed',
        exitPrice: managedPos.exitPrice,
        exitValue: managedPos.exitPrice ? managedPos.quantity * managedPos.exitPrice : null,
        exitTime: managedPos.exitTime,
        exitTradeIds: managedPos.exitTradeId || '',
        realizedPnL: managedPos.realizedPnL,
        netPnL: managedPos.realizedPnL,
        totalCommissions: 0.0,
        totalFees: 0.0,
        updatedAt: new Date()
      };

      const livePosition = await prisma.livePosition.create({
        data: livePositionData
      });

      console.log(`✅ Created LivePosition: ${managedPos.symbol} (${managedPos.status})`);

      // Get corresponding trades
      const managedTrades = await prisma.managedTrade.findMany({
        where: { positionId: managedPos.id },
        orderBy: { executedAt: 'asc' }
      });

      // Create corresponding LiveTrades
      for (const managedTrade of managedTrades) {
        const liveTradeData = {
          id: managedTrade.id.replace('trade-', 'live-trade-'),
          sessionId: session.id,
          positionId: livePosition.id,
          symbol: managedTrade.symbol,
          side: managedTrade.side.toLowerCase(),
          type: 'market',
          quantity: managedTrade.quantity,
          price: managedTrade.price,
          value: managedTrade.value,
          netValue: managedTrade.value,
          purpose: managedTrade.isEntry ? 'ENTRY' : 'EXIT',
          isEntry: managedTrade.isEntry,
          strategy: managedTrade.strategy,
          requestedAt: managedTrade.executedAt,
          submittedAt: managedTrade.executedAt,
          executedAt: managedTrade.executedAt,
          acknowledgedAt: managedTrade.executedAt,
          orderStatus: 'filled',
          fillStatus: 'filled',
          filledQuantity: managedTrade.quantity,
          remainingQuantity: 0,
          pnl: managedTrade.pnl,
          updatedAt: new Date()
        };

        await prisma.liveTrade.create({
          data: liveTradeData
        });

        console.log(`  📝 Created LiveTrade: ${managedTrade.symbol} ${managedTrade.side} (PnL: ${managedTrade.pnl || 'N/A'})`);
      }
    }

    // Calculate session totals
    const totalPnL = await prisma.liveTrade.aggregate({
      where: {
        sessionId: session.id,
        pnl: { not: null }
      },
      _sum: { pnl: true }
    });

    console.log('\n📈 SYNC COMPLETE:');
    console.log(`   Positions synced: ${managedPositions.length}`);
    console.log(`   Session total P&L: $${totalPnL._sum.pnl?.toFixed(2) || '0.00'}`);
    console.log(`   Session ID: ${session.id}`);

  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  syncManagedToLivePositions()
    .then(() => {
      console.log('🎉 Sync completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Sync failed:', error);
      process.exit(1);
    });
}