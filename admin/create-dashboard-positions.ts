#!/usr/bin/env node

/**
 * Create positions in database based on recent LiveTrade records for dashboard visibility
 * This is a simpler approach that focuses on dashboard visibility
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal'
});

async function createDashboardPositions() {
  console.log('🔄 Creating dashboard positions from recent trades...');
  
  try {
    // Get recent LiveTrade records with purpose='open'
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
    
    console.log(`📊 Found ${openTrades.length} recent open trades`);
    
    // Group by symbol to get the latest position for each
    const latestPositions = new Map();
    for (const trade of openTrades) {
      if (!latestPositions.has(trade.symbol) || 
          trade.executedAt > latestPositions.get(trade.symbol).executedAt) {
        latestPositions.set(trade.symbol, trade);
      }
    }
    
    console.log(`📊 Creating positions for ${latestPositions.size} symbols: ${Array.from(latestPositions.keys()).join(', ')}`);
    
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
        
        // Create simplified position without foreign key constraints
        const positionId = `pos-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        await prisma.managedPosition.create({
          data: {
            id: positionId,
            strategy: 'tensor-ai-fusion',
            symbol: trade.symbol,
            side: trade.side,
            entryPrice: trade.price,
            quantity: trade.quantity,
            entryTradeId: null, // Set to null to avoid foreign key issues
            entryTime: trade.executedAt,
            status: 'open',
            unrealizedPnL: 0.0,
            createdAt: trade.executedAt,
            updatedAt: new Date()
          }
        });
        
        syncedCount++;
        console.log(`✅ Created position for ${symbol}: ${trade.side} ${trade.quantity} @ $${trade.price}`);
        
      } catch (error) {
        console.log(`⚠️ Failed to create position for ${symbol}: ${error.message}`);
      }
    }
    
    console.log(`✅ Successfully created ${syncedCount} positions for dashboard`);
    
    // Verify positions were created
    const openPositions = await prisma.managedPosition.findMany({
      where: { status: 'open' },
      select: { symbol: true, side: true, quantity: true, entryPrice: true }
    });
    
    console.log(`📊 Dashboard should now show ${openPositions.length} open positions:`);
    for (const pos of openPositions) {
      console.log(`   - ${pos.symbol}: ${pos.side} ${pos.quantity} @ $${pos.entryPrice}`);
    }
    
  } catch (error) {
    console.error('❌ Creation failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createDashboardPositions();