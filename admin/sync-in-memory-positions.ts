#!/usr/bin/env node

/**
 * Sync in-memory positions to database for dashboard visibility
 * This fixes the issue where positions exist in memory but not in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal'
});

async function syncInMemoryPositions() {
  console.log('🔄 Syncing in-memory positions to database...');
  
  try {
    // Get recent LiveTrade records with purpose='open' that don't have corresponding positions
    const openTrades = await prisma.liveTrade.findMany({
      where: {
        purpose: 'open',
        executedAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
        }
      },
      orderBy: {
        executedAt: 'desc'
      }
    });
    
    console.log(`📊 Found ${openTrades.length} recent open trades to check`);
    
    // Group by symbol to get the latest position for each
    const latestPositions = new Map();
    for (const trade of openTrades) {
      if (!latestPositions.has(trade.symbol) || 
          trade.executedAt > latestPositions.get(trade.symbol).executedAt) {
        latestPositions.set(trade.symbol, trade);
      }
    }
    
    console.log(`📊 Found ${latestPositions.size} unique symbols with recent trades`);
    
    let syncedCount = 0;
    
    for (const [symbol, trade] of latestPositions) {
      try {
        // Check if position already exists
        const existingPosition = await prisma.managedPosition.findFirst({
          where: {
            symbol: symbol,
            status: 'open'
          }
        });
        
        if (existingPosition) {
          console.log(`✅ Position already exists for ${symbol}`);
          continue;
        }
        
        // Create corresponding ManagedPosition
        const positionId = `pos-${Date.now()}-${symbol.toLowerCase()}`;
        const tradeId = `trade-${Date.now()}-${symbol.toLowerCase()}`;
        
        await prisma.$transaction(async (tx) => {
          // Step 1: Create the ManagedTrade FIRST with temporary positionId
          const managedTrade = await tx.managedTrade.create({
            data: {
              id: tradeId,
              positionId: `temp-${positionId}`, // Temporary, will update after position creation
              symbol: trade.symbol,
              side: trade.side,
              quantity: trade.quantity,
              price: trade.price,
              value: trade.value || (trade.quantity * trade.price),
              isEntry: true,
              strategy: 'tensor-ai-fusion',
              executedAt: trade.executedAt,
              updatedAt: new Date()
            }
          });
          
          // Step 2: Create position with valid entryTradeId foreign key
          const position = await tx.managedPosition.create({
            data: {
              id: positionId,
              strategy: 'tensor-ai-fusion',
              symbol: trade.symbol,
              side: trade.side,
              entryPrice: trade.price,
              quantity: trade.quantity,
              entryTradeId: managedTrade.id, // Now this foreign key is valid
              entryTime: trade.executedAt,
              status: 'open',
              unrealizedPnL: 0.0,
              createdAt: trade.executedAt,
              updatedAt: new Date()
            }
          });
          
          // Step 3: Update the trade with correct positionId
          await tx.managedTrade.update({
            where: { id: managedTrade.id },
            data: { positionId: position.id }
          });
        });
        
        syncedCount++;
        console.log(`✅ Created position for ${symbol}: ${trade.side} ${trade.quantity} @ ${trade.price}`);
        
      } catch (error) {
        console.log(`⚠️ Failed to sync position for ${symbol}: ${error.message}`);
      }
    }
    
    console.log(`✅ Successfully synced ${syncedCount} positions to database`);
    console.log(`📊 Dashboard should now show ${syncedCount} open positions`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncInMemoryPositions();