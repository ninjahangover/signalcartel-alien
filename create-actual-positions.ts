#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createActualPositions() {
  console.log('🔄 Creating actual positions based on real holdings...');

  const sessionId = 'session-production-1757538257208';
  const userId = 'user-production';

  // Current positions based on actual holdings
  const positions = [
    {
      symbol: 'BNBUSD',
      value: 513.50,
      estimatedPrice: 593.0, // Approximate BNB price
      quantity: 513.50 / 593.0
    },
    {
      symbol: 'DOTUSD',
      value: 108.76,
      estimatedPrice: 4.10, // Approximate DOT price
      quantity: 108.76 / 4.10
    },
    {
      symbol: 'ETHUSD',
      value: 50.03,
      estimatedPrice: 2450.0, // Approximate ETH price
      quantity: 50.03 / 2450.0
    },
    {
      symbol: 'DOTUSD',
      value: 58.84,
      estimatedPrice: 4.10, // Approximate DOT price for second position
      quantity: 58.84 / 4.10
    }
  ];

  for (const pos of positions) {
    const positionId = `pos-${pos.symbol.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tradeId = `trade-${pos.symbol.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create ManagedTrade
    await prisma.managedTrade.create({
      data: {
        id: tradeId,
        positionId: positionId,
        strategy: 'TENSOR_FUSION',
        symbol: pos.symbol,
        side: 'BUY',
        quantity: pos.quantity,
        price: pos.estimatedPrice,
        value: pos.value,
        executedAt: new Date(),
        isEntry: true
      }
    });

    // Create ManagedPosition
    await prisma.managedPosition.create({
      data: {
        id: positionId,
        strategy: 'TENSOR_FUSION',
        symbol: pos.symbol,
        side: 'long',
        entryPrice: pos.estimatedPrice,
        quantity: pos.quantity,
        entryTradeId: tradeId,
        entryTime: new Date(),
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Create LivePosition for dashboard
    await prisma.livePosition.create({
      data: {
        id: `live-${positionId}`,
        sessionId: sessionId,
        symbol: pos.symbol,
        strategy: 'TENSOR_FUSION',
        side: 'long',
        quantity: pos.quantity,
        entryPrice: pos.estimatedPrice,
        entryValue: pos.value,
        entryTime: new Date(),
        entryTradeIds: tradeId,
        currentPrice: pos.estimatedPrice,
        unrealizedPnL: 0.0,
        totalCommissions: 0.0,
        totalFees: 0.0,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`✅ Created position: ${pos.symbol} - $${pos.value} (${pos.quantity.toFixed(6)} @ $${pos.estimatedPrice})`);
  }

  console.log('🎯 All actual positions created successfully!');
}

createActualPositions()
  .catch((error) => {
    console.error('❌ Error creating positions:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });