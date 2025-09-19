import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeRecentTrades() {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

  // Get recent positions
  const recentPositions = await prisma.position.findMany({
    where: {
      created_at: {
        gte: fourHoursAgo
      }
    },
    orderBy: {
      created_at: 'desc'
    },
    take: 20
  });

  console.log('\n📊 RECENT TRADES ANALYSIS (Last 4 Hours)');
  console.log('=' .repeat(60));

  const hardcodedPairs = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'ADAUSD', 'DOTUSD', 'AVAXUSD', 'BNBUSD'];

  let discoveredCount = 0;
  let hardcodedCount = 0;

  console.log('\n🔍 Individual Trades:');
  for (const pos of recentPositions) {
    const isHardcoded = hardcodedPairs.includes(pos.symbol);
    const label = isHardcoded ? '❌ HARDCODED' : '✅ DISCOVERED';

    if (isHardcoded) hardcodedCount++;
    else discoveredCount++;

    console.log(`  ${label}: ${pos.symbol} - ${pos.created_at.toISOString()}`);
  }

  console.log('\n📈 Summary:');
  console.log(`  Total Trades: ${recentPositions.length}`);
  console.log(`  Discovered Opportunities: ${discoveredCount} (${(discoveredCount/recentPositions.length*100).toFixed(1)}%)`);
  console.log(`  Hardcoded Fallbacks: ${hardcodedCount} (${(hardcodedCount/recentPositions.length*100).toFixed(1)}%)`);

  // Check unique symbols traded
  const uniqueSymbols = [...new Set(recentPositions.map(p => p.symbol))];
  console.log(`\n🎯 Unique Symbols Traded: ${uniqueSymbols.join(', ')}`);

  // Identify non-hardcoded trades
  const discoveredSymbols = uniqueSymbols.filter(s => !hardcodedPairs.includes(s));
  if (discoveredSymbols.length > 0) {
    console.log(`\n✨ DISCOVERED OPPORTUNITIES TRADED:`);
    console.log(`  ${discoveredSymbols.join(', ')}`);
  } else {
    console.log(`\n⚠️  WARNING: No discovered opportunities traded - only hardcoded pairs!`);
  }
}

analyzeRecentTrades()
  .catch(console.error)
  .finally(() => prisma.$disconnect());