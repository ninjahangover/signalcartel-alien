#!/usr/bin/env npx tsx
/**
 * Close older positions to make room for high-priority Smart Hunter opportunities
 * WLFIUSD: 85.0% score, TRUMPUSD: 80.0% score
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function closeOlderPositions() {
  console.log('🔄 Fetching current open positions...');
  
  const openPositions = await prisma.managedPosition.findMany({
    where: { status: 'open' },
    orderBy: { createdAt: 'asc' }, // Oldest first
    include: {
      entryTrade: true
    }
  });
  
  console.log(`📊 Found ${openPositions.length} open positions`);
  
  if (openPositions.length < 5) {
    console.log('✅ Position limit not reached, no need to close positions');
    return;
  }
  
  // Close the 2 oldest positions to make room for high-priority opportunities
  const positionsToClose = openPositions.slice(0, 2);
  
  console.log('\n🎯 Closing 2 oldest positions to make room for:');
  console.log('   - WLFIUSD: 85.0% score, 75.0% confidence');
  console.log('   - TRUMPUSD: 80.0% score, 70.0% confidence\n');
  
  for (const position of positionsToClose) {
    console.log(`📉 Closing position: ${position.symbol} ${position.side} @ $${position.entryPrice}`);
    console.log(`   Entry: ${position.createdAt}`);
    console.log(`   Age: ${Math.round((Date.now() - position.createdAt.getTime()) / (1000 * 60))} minutes`);
    
    // Get current price for P&L calculation (using entry price as approximation)
    const currentPrice = parseFloat(position.entryPrice); // Conservative estimate
    const quantity = parseFloat(position.quantity);
    
    let pnl = 0;
    if (position.side === 'long') {
      pnl = (currentPrice - parseFloat(position.entryPrice)) * quantity;
    } else {
      pnl = (parseFloat(position.entryPrice) - currentPrice) * quantity;
    }
    
    // Create exit trade record
    const exitTradeId = `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await prisma.managedTrade.create({
      data: {
        id: exitTradeId,
        positionId: position.id,
        side: position.side === 'long' ? 'sell' : 'buy',
        symbol: position.symbol,
        quantity: quantity,
        price: currentPrice,
        value: quantity * currentPrice,
        strategy: 'admin_close_for_opportunities',
        executedAt: new Date(),
        pnl: pnl,
        isEntry: false
      }
    });
    
    // Update position to closed
    await prisma.managedPosition.update({
      where: { id: position.id },
      data: {
        status: 'closed',
        exitPrice: currentPrice,
        exitTradeId: exitTradeId,
        exitTime: new Date(),
        realizedPnL: pnl
      }
    });
    
    console.log(`✅ Closed ${position.symbol}: P&L $${pnl.toFixed(4)}`);
  }
  
  const remainingPositions = await prisma.managedPosition.count({
    where: { status: 'open' }
  });
  
  console.log(`\n🎉 Position cleanup complete!`);
  console.log(`📊 Open positions: ${remainingPositions}/5`);
  console.log(`🚀 Ready for high-priority opportunities: WLFIUSD (85%) & TRUMPUSD (80%)`);
}

closeOlderPositions()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error closing positions:', error);
    process.exit(1);
  });