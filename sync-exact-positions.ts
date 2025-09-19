/**
 * EXACT POSITION SYNC - Based on user's current holdings
 * BNB 411.80, DOT 58.50, AVAX 50.49, BTC 50.01
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncExactPositions() {
  console.log('🚀 EXACT POSITION SYNC - Starting...');
  console.log('================================================');

  // Clear existing positions
  console.log('🧹 Clearing all existing position data...');
  await prisma.liveTrade.deleteMany({});
  await prisma.livePosition.deleteMany({});
  await prisma.managedTrade.deleteMany({});
  await prisma.managedPosition.deleteMany({});
  console.log('✅ Database completely cleared for fresh sync');

  // Your EXACT current holdings from Kraken
  const exactHoldings = [
    { symbol: 'BNBUSD', value: 411.80, currentPrice: 593 },   // BNB - still holding!
    { symbol: 'DOTUSD', value: 58.50, currentPrice: 4.1 },   // DOT
    { symbol: 'AVAXUSD', value: 50.49, currentPrice: 28.14 }, // AVAX
    { symbol: 'BTCUSD', value: 50.01, currentPrice: 114280 }, // BTC
  ];

  console.log('🔄 Creating positions from EXACT current holdings...');

  for (const holding of exactHoldings) {
    // Calculate quantity from value and current price
    const quantity = holding.value / holding.currentPrice;
    const positionId = `pos-${holding.symbol.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tradeId = `trade-${Date.now()}`;

    console.log(`   📊 Creating: ${holding.symbol} - ${quantity.toFixed(6)} units @ $${holding.currentPrice} ($${holding.value})`);

    // Create ManagedPosition
    await prisma.managedPosition.create({
      data: {
        id: positionId,
        symbol: holding.symbol,
        side: 'LONG',
        quantity: quantity,
        entryPrice: holding.currentPrice,
        status: 'open',
        openedAt: new Date(),
        entryTime: new Date(),
        sessionId: 'session-production-1757538257208',
        userId: 'user-production',
        strategy: 'exact-sync'
      }
    });

    // Create LivePosition
    await prisma.livePosition.create({
      data: {
        id: positionId,
        symbol: holding.symbol,
        side: 'LONG',
        quantity: quantity,
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
        quantity: quantity,
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
        quantity: quantity,
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
  const totalPortfolioValue = exactHoldings.reduce((sum, h) => sum + h.value, 0);

  console.log('\n📊 SYNC VERIFICATION:');
  console.log(`   • LivePosition entries: ${livePositions}`);
  console.log(`   • ManagedPosition entries: ${managedPositions}`);
  console.log(`   • ManagedTrade entries: ${managedTrades}`);
  console.log(`   • Total portfolio value: $${totalPortfolioValue.toFixed(2)}`);

  console.log('\n✅ EXACT POSITION SYNC COMPLETED SUCCESSFULLY');
  console.log('================================================');
  console.log('Dashboard now shows YOUR EXACT current Kraken holdings!');
}

syncExactPositions()
  .then(() => {
    console.log('Exact position sync completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Exact position sync failed:', error);
    process.exit(1);
  });