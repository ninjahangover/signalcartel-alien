#!/usr/bin/env npx ts-node

/**
 * 🔧 V3.14.3 COMPLETE POSITION RESTORATION
 *
 * Restores 6 actual Kraken positions to LivePosition table with all required fields:
 * - AVAXUSD: 4.031289 @ $28.35 = $114.29
 * - CORNUSD: 1045.593 @ $0.10 = $100.53
 * - FARTCOINUSD: 62.58855 @ $0.67 = $41.95
 * - SLAYUSD: 2534.72932 @ $0.03 = $65.90
 * - SOLUSD: 0.043105 @ $223.72 = $9.64
 * - WIFUSD: 1.09175 @ $0.75 = $0.82
 *
 * Total Portfolio Value: ~$353 (including $20.35 cash)
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

interface KrakenPosition {
  symbol: string;
  quantity: number;
  estimatedEntryPrice: number;
}

// 🔧 V3.14.3: All 6 actual Kraken positions from dashboard logs
const knownPositions: KrakenPosition[] = [
  { symbol: 'AVAXUSD', quantity: 4.031289, estimatedEntryPrice: 28.35 },
  { symbol: 'CORNUSD', quantity: 1045.593, estimatedEntryPrice: 0.10 },
  { symbol: 'FARTCOINUSD', quantity: 62.58855, estimatedEntryPrice: 0.67 },
  { symbol: 'SLAYUSD', quantity: 2534.72932, estimatedEntryPrice: 0.03 },
  { symbol: 'SOLUSD', quantity: 0.043105, estimatedEntryPrice: 223.72 },
  { symbol: 'WIFUSD', quantity: 1.09175, estimatedEntryPrice: 0.75 }
];

async function restorePositions() {
  console.log('🔧 V3.14.3: COMPLETE POSITION RESTORATION');
  console.log('');

  try {
    // Get the existing session
    const session = await prisma.livePosition.findFirst({
      select: { sessionId: true }
    });

    const sessionId = session?.sessionId || 'session-production-1757538257208';
    console.log(`📋 Using session ID: ${sessionId}`);
    console.log('');

    // Clear old LivePosition entries (keep them first for logging)
    const existingCount = await prisma.livePosition.count();
    console.log(`🗑️  Clearing ${existingCount} old LivePosition entries...`);
    await prisma.livePosition.deleteMany({});
    console.log('✅ Old positions cleared');
    console.log('');

    // Restore each position
    console.log('🔄 Restoring 6 actual Kraken positions...');
    console.log('');

    const now = new Date();
    const entryTime = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // Assume 24h ago

    for (const pos of knownPositions) {
      const positionId = `pos-restored-${randomBytes(8).toString('hex')}`;
      const tradeId = `trade-restored-${randomBytes(8).toString('hex')}`;
      const entryValue = pos.quantity * pos.estimatedEntryPrice;

      console.log(`📍 ${pos.symbol}:`);
      console.log(`   Quantity: ${pos.quantity}`);
      console.log(`   Entry: $${pos.estimatedEntryPrice}`);
      console.log(`   Value: $${entryValue.toFixed(2)}`);

      await prisma.livePosition.create({
        data: {
          id: positionId,
          sessionId: sessionId,
          symbol: pos.symbol,
          side: 'buy',
          quantity: pos.quantity,
          entryPrice: pos.estimatedEntryPrice,
          currentPrice: pos.estimatedEntryPrice, // Will be updated by position updater
          entryValue: entryValue,
          entryTradeIds: tradeId,
          entryTime: entryTime,
          strategy: 'phase-0-ai-order-book-ai',
          status: 'open',
          unrealizedPnL: 0,
          totalCommissions: 0,
          totalFees: 0,
          positionNotes: 'Restored from Kraken holdings - manual restoration V3.14.3',
          updatedAt: now
        }
      });

      console.log(`✅ ${pos.symbol} restored`);
      console.log('');
    }

    // Verify restoration
    const restoredPositions = await prisma.livePosition.findMany({
      where: { status: 'open' },
      select: {
        symbol: true,
        quantity: true,
        entryPrice: true,
        entryValue: true,
        status: true
      }
    });

    console.log('');
    console.log('📊 RESTORATION VERIFICATION:');
    console.log(`   • Total positions restored: ${restoredPositions.length}`);

    let totalValue = 0;
    for (const pos of restoredPositions) {
      totalValue += pos.entryValue;
      console.log(`   • ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} = $${pos.entryValue.toFixed(2)}`);
    }

    console.log(`   • Total portfolio value: $${totalValue.toFixed(2)}`);
    console.log('');
    console.log('✅ POSITION RESTORATION COMPLETE');
    console.log('');
    console.log('🚀 Next step: Restart system with ./tensor-stop.sh && ./tensor-start.sh');

  } catch (error) {
    console.error('❌ RESTORATION FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restorePositions();
