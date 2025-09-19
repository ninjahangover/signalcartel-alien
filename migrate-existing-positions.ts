/**
 * POSITION MIGRATION UTILITY
 * Migrates existing positions to the unified Trade Lifecycle Manager system
 * Assigns unique trade IDs to unmanaged positions and integrates them into the unified system
 */

import { PrismaClient } from '@prisma/client';
import { tradeLifecycleManager } from './src/lib/trade-lifecycle-manager';
import { krakenApiService } from './src/lib/kraken-api-service';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function migrateExistingPositions() {
  console.log('🔄 POSITION MIGRATION: Starting migration of existing positions...');

  try {
    // Get all open positions from database that don't have trade IDs
    const openPositions = await prisma.managedPosition.findMany({
      where: {
        status: 'open',
        OR: [
          { metadata: null },
          {
            metadata: {
              path: ['tradeId'],
              equals: null
            }
          }
        ]
      }
    });

    console.log(`📊 Found ${openPositions.length} unmanaged positions to migrate`);

    if (openPositions.length === 0) {
      console.log('✅ All positions already have trade IDs - migration complete');
      return;
    }

    // Get current prices for P&L calculation
    const symbols = [...new Set(openPositions.map(pos => pos.symbol))];
    const currentPrices: Record<string, number> = {};

    for (const symbol of symbols) {
      try {
        const priceData = await krakenApiService.getCurrentPrice(symbol);
        if (priceData.success) {
          currentPrices[symbol] = priceData.price;
          console.log(`💰 Current price for ${symbol}: $${priceData.price}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not get price for ${symbol}:`, error.message);
      }
    }

    // Migrate each position
    for (const position of openPositions) {
      const tradeId = generateTradeId(position.symbol, position.side.toUpperCase() as 'BUY' | 'SELL');
      const currentPrice = currentPrices[position.symbol] || position.entryPrice;

      // Calculate unrealized P&L
      const isLong = position.side.toLowerCase() === 'buy' || position.side.toLowerCase() === 'long';
      const unrealizedPnL = isLong
        ? (currentPrice - position.entryPrice) * position.quantity
        : (position.entryPrice - currentPrice) * position.quantity;

      console.log(`🆔 Migrating ${position.symbol}: ${position.quantity} @ $${position.entryPrice}`);
      console.log(`   Trade ID: ${tradeId}`);
      console.log(`   Current Price: $${currentPrice}`);
      console.log(`   Unrealized P&L: $${unrealizedPnL.toFixed(4)}`);

      // Update database with trade ID and current data
      await prisma.managedPosition.update({
        where: { id: position.id },
        data: {
          currentPrice: currentPrice,
          unrealizedPnL: unrealizedPnL,
          metadata: {
            tradeId: tradeId,
            migratedAt: new Date(),
            originalPositionId: position.id,
            migrationSource: 'unified_coordinator_migration',
            currentPrice: currentPrice,
            unrealizedPnL: unrealizedPnL
          }
        }
      });

      // Create corresponding ManagedTrade record for complete tracking
      await prisma.managedTrade.create({
        data: {
          symbol: position.symbol,
          side: position.side.toLowerCase(),
          quantity: position.quantity,
          entryPrice: position.entryPrice,
          status: 'open',
          strategy: 'unified_coordinator_migrated',
          confidence: 0.7, // Default confidence for migrated positions
          realizedPnL: 0,
          metadata: {
            tradeId: tradeId,
            migratedFrom: 'managedPosition',
            originalPositionId: position.id,
            migrationTimestamp: new Date(),
            currentPrice: currentPrice,
            unrealizedPnL: unrealizedPnL
          }
        }
      });

      console.log(`✅ Successfully migrated ${position.symbol} with trade ID: ${tradeId}`);
    }

    console.log(`🎉 MIGRATION COMPLETE: ${openPositions.length} positions now managed by Trade Lifecycle Manager`);

    // Get updated statistics
    const stats = tradeLifecycleManager.getTradeStatistics();
    console.log(`📊 UNIFIED SYSTEM STATUS:`);
    console.log(`   Active Trades: ${stats.activeTrades}`);
    console.log(`   Total Unrealized P&L: $${stats.totalUnrealizedPnL.toFixed(4)}`);
    console.log(`   Source Breakdown:`, stats.sourceBreakdown);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function generateTradeId(symbol: string, side: 'BUY' | 'SELL'): string {
  const timestamp = Date.now();
  const uuid = uuidv4().slice(0, 8);
  return `${symbol}_${side}_${timestamp}_${uuid}`;
}

// Run migration
migrateExistingPositions();