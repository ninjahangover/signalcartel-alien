#!/usr/bin/env node

/**
 * Migrate ManagedTrade data to LiveTrade table for dashboard visibility
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal'
});

async function migrateTradesToDashboard() {
  console.log('🔄 Migrating ManagedTrade data to LiveTrade table for dashboard visibility...');
  
  try {
    // Get recent ManagedTrade records (last 24 hours)
    const recentTrades = await prisma.managedTrade.findMany({
      where: {
        executedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: {
        executedAt: 'desc'
      }
    });
    
    console.log(`📊 Found ${recentTrades.length} recent ManagedTrade records to migrate`);
    
    if (recentTrades.length === 0) {
      console.log('ℹ️  No recent trades found to migrate');
      return;
    }
    
    // Create a dummy trading session ID
    const sessionId = `migrated-session-${Date.now()}`;
    
    let migratedCount = 0;
    
    for (const trade of recentTrades) {
      try {
        // Check if this trade is already migrated
        const existingLiveTrade = await prisma.liveTrade.findFirst({
          where: {
            exchangeTradeId: trade.id
          }
        });
        
        if (existingLiveTrade) {
          continue; // Skip already migrated trades
        }
        
        // Create corresponding LiveTrade record
        await prisma.liveTrade.create({
          data: {
            id: `live-${trade.id}`,
            sessionId: sessionId,
            positionId: trade.positionId,
            exchangeOrderId: `kraken-${trade.id}`,
            exchangeTradeId: trade.id,
            symbol: trade.symbol,
            side: trade.side === 'buy' ? 'buy' : 'sell',
            type: 'market',
            quantity: trade.quantity,
            price: trade.price,
            value: trade.value,
            commission: 0.0, // Calculate if needed
            fees: 0.0,
            netValue: trade.value,
            purpose: trade.isEntry ? 'open' : 'close',
            isEntry: trade.isEntry,
            strategy: trade.strategy,
            signalConfidence: 0.5, // Default value
            signalSource: 'tensor-ai-fusion',
            requestedAt: trade.executedAt,
            submittedAt: trade.executedAt,
            executedAt: trade.executedAt,
            acknowledgedAt: trade.executedAt,
            orderStatus: 'filled',
            fillStatus: 'filled',
            filledQuantity: trade.quantity,
            remainingQuantity: 0.0,
            pnl: trade.pnl || 0.0,
            pnlPercent: 0.0, // Calculate if needed
            tradeNotes: 'Migrated from ManagedTrade for dashboard visibility',
            updatedAt: trade.executedAt // Required field
          }
        });
        
        migratedCount++;
        
      } catch (error) {
        console.log(`⚠️  Failed to migrate trade ${trade.id}: ${error.message}`);
      }
    }
    
    console.log(`✅ Successfully migrated ${migratedCount} trades to LiveTrade table`);
    console.log(`📊 Dashboard should now show ${migratedCount} recent trades`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

migrateTradesToDashboard();