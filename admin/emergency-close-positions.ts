/**
 * EMERGENCY POSITION CLOSURE SCRIPT
 * Closes all open positions to reset the system
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function emergencyCloseAllPositions() {
  console.log('🚨 EMERGENCY POSITION CLOSURE INITIATED');
  console.log('=====================================');
  
  try {
    // Get all open positions
    const openPositions = await prisma.managedPosition.findMany({
      where: {
        status: 'open'
      }
    });
    
    console.log(`📊 Found ${openPositions.length} open positions to close`);
    
    if (openPositions.length === 0) {
      console.log('✅ No open positions found');
      return;
    }
    
    // Get current prices for all symbols
    const symbols = [...new Set(openPositions.map(p => p.symbol))];
    console.log(`💰 Getting current prices for ${symbols.length} symbols...`);
    
    const { realTimePriceFetcher } = await import('../src/lib/real-time-price-fetcher');
    const priceMap = new Map<string, number>();
    
    for (const symbol of symbols) {
      try {
        const priceData = await realTimePriceFetcher.getCurrentPrice(symbol);
        if (priceData.success && priceData.price > 0) {
          priceMap.set(symbol, priceData.price);
          console.log(`  ${symbol}: $${priceData.price}`);
        }
      } catch (error) {
        console.warn(`  ⚠️ Could not get price for ${symbol}`);
      }
    }
    
    // Close each position
    let closedCount = 0;
    let totalPnL = 0;
    
    for (const position of openPositions) {
      const currentPrice = priceMap.get(position.symbol);
      
      if (!currentPrice) {
        console.log(`  ⏭️ Skipping ${position.id} - no price for ${position.symbol}`);
        continue;
      }
      
      // Calculate PnL
      const pnl = position.side === 'long' 
        ? (currentPrice - position.entryPrice) * position.quantity
        : (position.entryPrice - currentPrice) * position.quantity;
      
      // Update position to closed
      await prisma.managedPosition.update({
        where: { id: position.id },
        data: {
          status: 'closed',
          exitPrice: currentPrice,
          exitTime: new Date(),
          realizedPnL: pnl
        }
      });
      
      closedCount++;
      totalPnL += pnl;
      
      const emoji = pnl > 0 ? '🟢' : '🔴';
      console.log(`  ${emoji} Closed ${position.id}: ${position.symbol} ${position.side} | P&L: $${pnl.toFixed(2)}`);
    }
    
    console.log('');
    console.log('📊 CLOSURE SUMMARY:');
    console.log(`  Positions closed: ${closedCount}/${openPositions.length}`);
    console.log(`  Total P&L: $${totalPnL.toFixed(2)}`);
    console.log(`  Average P&L: $${(totalPnL / closedCount).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error during emergency closure:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the emergency closure
emergencyCloseAllPositions().catch(console.error);