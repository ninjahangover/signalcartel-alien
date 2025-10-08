/**
 * Restore Actual 6 Kraken Positions to Database
 *
 * Based on dashboard data showing actual holdings:
 * - AVAX: 4.031289 @ $28.35 = $114.29
 * - CORN: 1045.593 @ $0.10 = $100.53
 * - FARTCOIN: 62.58855 @ $0.67 = $41.95
 * - SLAY: 2534.72932 @ $0.03 = $65.90
 * - SOL: 0.043105 @ $223.72 = $9.64
 * - WIF: 1.09175 @ $0.75 = $0.82
 *
 * Total Portfolio: ~$353 (matches user's "$350" statement)
 */

import { PrismaClient } from '@prisma/client';

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

async function restorePositions() {
  console.log('🔧 Restoring 6 actual Kraken positions to database...\n');

  for (const pos of knownPositions) {
    const positionId = `manual-${pos.symbol}-${Date.now()}`;
    const tradeId = `manual-trade-${pos.symbol}-${Date.now()}`;
    const entryTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Estimate: 24 hours ago

    try {
      await prisma.$transaction(async (tx: any) => {
        // Create entry trade
        await tx.managedTrade.create({
          data: {
            id: tradeId,
            positionId: positionId,
            side: 'buy',
            symbol: pos.symbol,
            quantity: pos.quantity,
            price: pos.estimatedEntryPrice,
            value: pos.quantity * pos.estimatedEntryPrice,
            strategy: 'phase-0-ai-order-book-ai',
            executedAt: entryTime,
            pnl: 0,
            isEntry: true
          }
        });

        // Create open position
        await tx.managedPosition.create({
          data: {
            id: positionId,
            strategy: 'phase-0-ai-order-book-ai',
            symbol: pos.symbol,
            side: 'buy',
            entryPrice: pos.estimatedEntryPrice,
            quantity: pos.quantity,
            entryTradeId: tradeId,
            entryTime: entryTime,
            status: 'open',
            stopLoss: null,
            takeProfit: null,
            maxHoldTime: null
          }
        });
      });

      console.log(`✅ Successfully restored ${pos.symbol} to database`);
    } catch (error: any) {
      console.error(`❌ Failed to restore ${pos.symbol}: ${error.message}`);
    }
  }

  // Verification
  const openPositions = await prisma.managedPosition.count({
    where: { status: 'open' }
  });

  const totalValue = knownPositions.reduce((sum, pos) =>
    sum + (pos.quantity * pos.estimatedEntryPrice), 0
  );

  console.log('\n📊 VERIFICATION:');
  console.log(`   • ManagedPosition: ${openPositions} open positions`);
  console.log(`   • Total Position Value: $${totalValue.toFixed(2)}`);
  console.log('');
  console.log('✅ Position restore complete!');
  console.log('🔄 Restart trading system with: ./tensor-stop.sh && sleep 3 && ./tensor-start.sh');
}

restorePositions()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
