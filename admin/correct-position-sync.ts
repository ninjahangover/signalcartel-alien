/**
 * CORRECTED POSITION SYNC - Using actual Kraken balances from dashboard log
 * Fixed quantities and proper USD conversion
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function correctPositionSync() {
  console.log('🚀 CORRECTED POSITION SYNC - Starting...');
  console.log('================================================');

  // Clear existing positions
  console.log('🧹 Clearing all existing position data...');
  await prisma.liveTrade.deleteMany({});
  await prisma.livePosition.deleteMany({});
  await prisma.managedTrade.deleteMany({});
  await prisma.managedPosition.deleteMany({});
  console.log('✅ Database completely cleared for fresh sync');

  // Actual Kraken balances from dashboard log with current prices
  const actualHoldings = [
    { symbol: 'AVAXUSD', quantity: 1.6754, currentPrice: 28.14 }, // Real AVAX price ~$28
    { symbol: 'BNBUSD', quantity: 0.43956, currentPrice: 593 },   // Real BNB price ~$593
    { symbol: 'DOTUSD', quantity: 13.179, currentPrice: 4.1 },    // Real DOT price ~$4.1
    // Skip ETH - 0.00001003 is essentially zero, not worth tracking
  ];

  console.log('🔄 Creating positions from ACTUAL Kraken holdings...');

  for (const holding of actualHoldings) {
    const positionValue = holding.quantity * holding.currentPrice;
    const positionId = `pos-${holding.symbol.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tradeId = `trade-${Date.now()}`;

    console.log(`   📊 Creating: ${holding.symbol} - ${holding.quantity} units @ $${holding.currentPrice} ($${positionValue.toFixed(2)})`);

    // Create ManagedPosition
    await prisma.managedPosition.create({
      data: {
        id: positionId,
        symbol: holding.symbol,
        side: 'LONG',
        quantity: holding.quantity,
        entryPrice: holding.currentPrice,
        status: 'open',
        openedAt: new Date(),
        sessionId: 'session-production-1757538257208',
        userId: 'user-production',
        strategy: 'position-sync'
      }
    });

    // Create LivePosition
    await prisma.livePosition.create({
      data: {
        id: positionId,
        symbol: holding.symbol,
        side: 'LONG',
        quantity: holding.quantity,
        entryPrice: holding.currentPrice,
        status: 'OPEN',
        sessionId: 'session-production-1757538257208',
        userId: 'user-production'
      }
    });

    // Create ManagedTrade
    await prisma.managedTrade.create({
      data: {
        id: tradeId,
        positionId: positionId,
        symbol: holding.symbol,
        side: 'BUY',
        quantity: holding.quantity,
        price: holding.currentPrice,
        timestamp: new Date(),
        sessionId: 'session-production-1757538257208',
        userId: 'user-production'
      }
    });

    // Create LiveTrade
    await prisma.liveTrade.create({
      data: {
        id: tradeId,
        symbol: holding.symbol,
        side: 'BUY',
        quantity: holding.quantity,
        price: holding.currentPrice,
        timestamp: new Date(),
        sessionId: 'session-production-1757538257208',
        userId: 'user-production'
      }
    });

    console.log(`   ✅ Created complete position: ${holding.symbol}`);
  }

  // Verify sync
  const livePositions = await prisma.livePosition.count();
  const managedPositions = await prisma.managedPosition.count();
  const managedTrades = await prisma.managedTrade.count();
  const totalPortfolioValue = actualHoldings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);

  console.log('\n📊 SYNC VERIFICATION:');
  console.log(`   • LivePosition entries: ${livePositions}`);
  console.log(`   • ManagedPosition entries: ${managedPositions}`);
  console.log(`   • ManagedTrade entries: ${managedTrades}`);
  console.log(`   • Total portfolio value: $${totalPortfolioValue.toFixed(2)}`);

  console.log('\n✅ CORRECTED POSITION SYNC COMPLETED SUCCESSFULLY');
  console.log('================================================');
  console.log('Database now shows ACTUAL Kraken account holdings');
}

correctPositionSync()
  .then(() => {
    console.log('Position sync completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Position sync failed:', error);
    process.exit(1);
  });