/**
 * Restore Actual 6 Kraken Positions to LivePosition Table
 *
 * The production trading system uses LivePosition table (not ManagedPosition)
 * for position tracking and exit evaluation.
 *
 * Based on dashboard data showing actual holdings:
 * - AVAX: 4.031289 @ $28.35 = $114.29
 * - CORN: 1045.593 @ $0.10 = $100.53
 * - FARTCOIN: 62.58855 @ $0.67 = $41.95
 * - SLAY: 2534.72932 @ $0.03 = $65.90
 * - SOL: 0.043105 @ $223.72 = $9.64
 * - WIF: 1.09175 @ $0.75 = $0.82
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
  console.log('🔧 Restoring 6 actual Kraken positions to LivePosition table...\n');

  // Clear old LivePosition entries
  await prisma.livePosition.deleteMany({});
  console.log('✅ Cleared old LivePosition entries\n');

  for (const pos of knownPositions) {
    const positionId = `live-${pos.symbol}-${Date.now()}`;
    const tradeIds = [`entry-${pos.symbol}-${Date.now()}`];
    const entryTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Estimate: 24 hours ago

    try {
      // Create live position (required fields based on schema)
      const entryValue = pos.quantity * pos.estimatedEntryPrice;
      await prisma.livePosition.create({
        data: {
          id: positionId,
          symbol: pos.symbol,
          side: 'buy',
          quantity: pos.quantity,
          entryPrice: pos.estimatedEntryPrice,
          entryValue: entryValue,
          entryTradeIds: tradeIds,
          entryTime: entryTime,
          strategy: 'phase-0-ai-order-book-ai',
          status: 'open',
          metadata: {}
        }
      });

      console.log(`✅ Successfully restored ${pos.symbol} to LivePosition`);
    } catch (error: any) {
      console.error(`❌ Failed to restore ${pos.symbol}: ${error.message}`);
    }
  }

  // Verification
  const openPositions = await prisma.livePosition.count({
    where: { status: 'open' }
  });

  const totalValue = knownPositions.reduce((sum, pos) =>
    sum + (pos.quantity * pos.estimatedEntryPrice), 0
  );

  console.log('\n📊 VERIFICATION:');
  console.log(`   • LivePosition: ${openPositions} open positions`);
  console.log(`   • Total Position Value: $${totalValue.toFixed(2)}`);
  console.log('');
  console.log('✅ Position restore complete!');
  console.log('🔄 System will auto-load positions on next cycle (no restart needed)');
}

restorePositions()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
