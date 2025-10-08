/**
 * Manual Position Restore Script
 *
 * Restores known Kraken positions to the database that were wiped by position sync
 * Based on dashboard log showing actual holdings
 */

import { prisma } from '../src/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

interface KrakenPosition {
  symbol: string;
  quantity: number;
  estimatedEntryPrice: number;
}

async function restorePositions() {
  console.log('🔧 MANUAL POSITION RESTORE - Starting...');
  console.log('================================================');

  // Positions from dashboard logs (Oct 6, 2025)
  const knownPositions: KrakenPosition[] = [
    {
      symbol: 'WIFUSD',
      quantity: 1.091750,
      estimatedEntryPrice: 0.75
    },
    {
      symbol: 'AVAXUSD',
      quantity: 4.031289,
      estimatedEntryPrice: 28.32
    },
    {
      symbol: 'SOLUSD',
      quantity: 0.043105,
      estimatedEntryPrice: 222.58
    }
  ];

  console.log(`📊 Restoring ${knownPositions.length} positions from Kraken account...`);

  for (const pos of knownPositions) {
    const positionId = `manual-restore-${Date.now()}-${pos.symbol}`;
    const tradeId = `manual-restore-trade-${Date.now()}-${pos.symbol}`;
    const entryTime = new Date();
    const entryValue = pos.quantity * pos.estimatedEntryPrice;

    console.log(`\n📝 Restoring ${pos.symbol}:`);
    console.log(`   Quantity: ${pos.quantity}`);
    console.log(`   Entry Price: $${pos.estimatedEntryPrice}`);
    console.log(`   Entry Value: $${entryValue.toFixed(2)}`);

    try {
      await prisma.$transaction(async (tx: any) => {
        // Create trade entry
        await tx.managedTrade.create({
          data: {
            id: tradeId,
            positionId: positionId,
            side: 'buy',
            symbol: pos.symbol,
            quantity: pos.quantity,
            price: pos.estimatedEntryPrice,
            value: entryValue,
            strategy: 'phase-0-ai-order-book-ai',
            executedAt: entryTime,
            pnl: 0,
            isEntry: true
          }
        });

        // Create position
        await tx.managedPosition.create({
          data: {
            id: positionId,
            strategy: 'phase-0-ai-order-book-ai',
            symbol: pos.symbol,
            side: 'buy',
            entryPrice: pos.estimatedEntryPrice,
            quantity: pos.quantity,
            entryTradeId: tradeId,
            entryTime: entryTime,
            status: 'open',
            stopLoss: null,
            takeProfit: null,
            maxHoldTime: null
          }
        });

        // Note: Skipping LivePosition/LiveTrade (optional dashboard tables)
        // The core ManagedPosition/ManagedTrade are sufficient for exit logic to work
      });

      console.log(`   ✅ Successfully restored ${pos.symbol} to database`);
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`   ❌ Failed to restore ${pos.symbol}:`, error.message);
    }
  }

  // Verify restoration
  console.log('\n📊 VERIFICATION:');

  const managedCount = await prisma.managedPosition.count({ where: { status: 'open' } });
  const liveCount = await prisma.livePosition.count({ where: { status: 'open' } });

  console.log(`   • ManagedPosition: ${managedCount} open positions`);
  console.log(`   • LivePosition: ${liveCount} open positions`);

  const positions = await prisma.managedPosition.findMany({
    where: { status: 'open' },
    select: {
      symbol: true,
      quantity: true,
      entryPrice: true
    }
  });

  console.log('\n📋 Restored Positions:');
  let totalValue = 0;
  for (const p of positions) {
    const value = p.quantity * p.entryPrice;
    console.log(`   • ${p.symbol}: ${p.quantity} @ $${p.entryPrice} = $${value.toFixed(2)}`);
    totalValue += value;
  }
  console.log(`\n💰 Total Position Value: $${totalValue.toFixed(2)}`);

  console.log('\n✅ MANUAL POSITION RESTORE COMPLETED');
  console.log('================================================');
}

restorePositions()
  .then(() => {
    console.log('✅ Restore successful - positions now tracked for exit logic');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  });
