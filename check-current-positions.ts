/**
 * Check current positions and display unified management status
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentPositions() {
  console.log('📊 CURRENT POSITION STATUS CHECK');
  console.log('=================================');

  try {
    // Check ManagedPosition table
    const managedPositions = await prisma.managedPosition.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📋 MANAGED POSITIONS: ${managedPositions.length} open positions`);

    for (const pos of managedPositions) {
      console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} (${pos.side}) - ID: ${pos.id}`);
      console.log(`      Created: ${pos.createdAt}`);
      console.log(`      Current P&L: $${pos.unrealizedPnL || 'Unknown'}`);
    }

    // Check ManagedTrade table
    const managedTrades = await prisma.managedTrade.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n🔄 MANAGED TRADES: ${managedTrades.length} open trades`);

    for (const trade of managedTrades) {
      console.log(`   ${trade.symbol}: ${trade.quantity} @ $${trade.entryPrice} (${trade.side}) - Strategy: ${trade.strategy}`);
      console.log(`      Created: ${trade.createdAt}`);
      console.log(`      Realized P&L: $${trade.realizedPnL || 0}`);
    }

    // Check LivePosition table
    const livePositions = await prisma.livePosition.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n⚡ LIVE POSITIONS: ${livePositions.length} open positions`);

    for (const pos of livePositions) {
      console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} (${pos.side})`);
      console.log(`      Current Price: $${pos.currentPrice || 'Unknown'}`);
      console.log(`      Unrealized P&L: $${pos.unrealizedPnL || 'Unknown'}`);
    }

    // Summary for user's 6 positions (ADA, AVAX, BNB, SOL, ETH, BTC)
    const userPositions = ['ADAUSD', 'AVAXUSD', 'BNBUSD', 'SOLUSD', 'ETHUSD', 'BTCUSD'];
    console.log(`\n🎯 USER'S 6 POSITIONS STATUS:`);

    for (const symbol of userPositions) {
      const managed = managedPositions.find(p => p.symbol === symbol);
      const live = livePositions.find(p => p.symbol === symbol);
      const trade = managedTrades.find(t => t.symbol === symbol);

      console.log(`   ${symbol}:`);
      console.log(`      ManagedPosition: ${managed ? '✅ Tracked' : '❌ Missing'}`);
      console.log(`      LivePosition: ${live ? '✅ Tracked' : '❌ Missing'}`);
      console.log(`      ManagedTrade: ${trade ? '✅ Tracked' : '❌ Missing'}`);

      if (managed) {
        console.log(`         Quantity: ${managed.quantity} @ $${managed.entryPrice}`);
        console.log(`         P&L: $${managed.unrealizedPnL || 'Unknown'}`);
      }
    }

    console.log(`\n📈 PORTFOLIO SUMMARY:`);
    const totalPositions = managedPositions.length;
    const totalValue = managedPositions.reduce((sum, pos) =>
      sum + (pos.quantity * pos.entryPrice), 0
    );
    const totalPnL = managedPositions.reduce((sum, pos) =>
      sum + (pos.unrealizedPnL || 0), 0
    );

    console.log(`   Total Positions: ${totalPositions}`);
    console.log(`   Total Entry Value: $${totalValue.toFixed(2)}`);
    console.log(`   Total Unrealized P&L: $${totalPnL.toFixed(4)}`);

  } catch (error) {
    console.error('❌ Error checking positions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentPositions();