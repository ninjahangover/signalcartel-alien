import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

interface KrakenPosition {
  symbol: string;
  quantity: number;
  estimatedEntryPrice: number;
}

const knownPositions: KrakenPosition[] = [
  { symbol: 'AVAXUSD', quantity: 4.031289, estimatedEntryPrice: 28.35 },
  { symbol: 'CORNUSD', quantity: 1045.593, estimatedEntryPrice: 0.10 },
  { symbol: 'FARTCOINUSD', quantity: 62.58855, estimatedEntryPrice: 0.67 },
  { symbol: 'SLAYUSD', quantity: 2534.72932, estimatedEntryPrice: 0.03 },
  { symbol: 'SOLUSD', quantity: 0.043105, estimatedEntryPrice: 223.72 },
  { symbol: 'WIFUSD', quantity: 1.09175, estimatedEntryPrice: 0.75 }
];

async function restoreToManagedPosition() {
  console.log('📋 Restoring 6 positions to ManagedPosition table...\n');

  const now = new Date();
  const entryTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

  for (const pos of knownPositions) {
    const positionId = `pos-managed-${randomBytes(8).toString('hex')}`;
    const tradeId = `trade-entry-${randomBytes(8).toString('hex')}`;
    const entryValue = pos.quantity * pos.estimatedEntryPrice;

    console.log(`Creating ${pos.symbol}: ${pos.quantity} @ $${pos.estimatedEntryPrice} = $${entryValue.toFixed(2)}`);

    await prisma.managedPosition.create({
      data: {
        id: positionId,
        symbol: pos.symbol,
        side: 'long',
        quantity: pos.quantity,
        entryPrice: pos.estimatedEntryPrice,
        entryTime: entryTime,
        strategy: 'phase-0-ai-order-book-ai',
        status: 'open',
        unrealizedPnL: 0,
        realizedPnL: 0,
        createdAt: entryTime,
        updatedAt: now
      }
    });

    // Also create entry trade
    await prisma.managedTrade.create({
      data: {
        id: tradeId,
        positionId: positionId,
        strategy: 'phase-0-ai-order-book-ai',
        symbol: pos.symbol,
        side: pos.symbol.endsWith('USD') ? 'buy' : 'long',
        quantity: pos.quantity,
        price: pos.estimatedEntryPrice,
        value: entryValue,
        executedAt: entryTime,
        isEntry: true
      }
    });

    console.log(`✅ Created ManagedPosition ${positionId} with entry trade ${tradeId}\n`);
  }

  console.log('\n📊 Verification:');
  const count = await prisma.managedPosition.count({ where: { status: 'open' } });
  console.log(`Total open ManagedPosition records: ${count}`);

  await prisma.$disconnect();
}

restoreToManagedPosition().catch(console.error);
