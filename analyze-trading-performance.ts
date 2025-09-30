#!/usr/bin/env ts-node
import { prisma } from './src/lib/prisma';

interface PairStats {
  symbol: string;
  totalTrades: number;
  winners: number;
  losers: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
}

async function analyzePerformance() {
  console.log('🔍 COMPREHENSIVE TRADING ANALYSIS - 2103 CYCLES\n');
  console.log('═'.repeat(80));

  // Overall statistics
  const allPositions = await prisma.position.findMany({
    orderBy: { entryTime: 'asc' }
  });

  const closedPositions = allPositions.filter(p => p.status === 'CLOSED');
  const openPositions = allPositions.filter(p => p.status === 'OPEN');

  // Win/Loss calculations
  const winners = closedPositions.filter(p => (p.realizedPnl || 0) > 0);
  const losers = closedPositions.filter(p => (p.realizedPnl || 0) < 0);
  const breakeven = closedPositions.filter(p => (p.realizedPnl || 0) === 0);

  const totalPnl = closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
  const winRate = closedPositions.length > 0 ? (winners.length / closedPositions.length * 100) : 0;

  const avgWin = winners.length > 0
    ? winners.reduce((sum, p) => sum + (p.realizedPnl || 0), 0) / winners.length
    : 0;
  const avgLoss = losers.length > 0
    ? losers.reduce((sum, p) => sum + (p.realizedPnl || 0), 0) / losers.length
    : 0;

  const profitFactor = Math.abs(avgLoss) > 0 ? Math.abs(avgWin / avgLoss) : 0;

  const largestWin = winners.length > 0
    ? Math.max(...winners.map(p => p.realizedPnl || 0))
    : 0;
  const largestLoss = losers.length > 0
    ? Math.min(...losers.map(p => p.realizedPnl || 0))
    : 0;

  // Open position P&L
  const openPnl = openPositions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

  console.log('\n📊 OVERALL PERFORMANCE');
  console.log('─'.repeat(80));
  console.log(`Total Positions:        ${allPositions.length}`);
  console.log(`  Closed:               ${closedPositions.length}`);
  console.log(`  Open:                 ${openPositions.length}`);
  console.log(`\nWin/Loss Breakdown:`);
  console.log(`  Winners:              ${winners.length} (${(winners.length / closedPositions.length * 100).toFixed(1)}%)`);
  console.log(`  Losers:               ${losers.length} (${(losers.length / closedPositions.length * 100).toFixed(1)}%)`);
  console.log(`  Breakeven:            ${breakeven.length}`);
  console.log(`  Win Rate:             ${winRate.toFixed(2)}%`);
  console.log(`\nProfit & Loss:`);
  console.log(`  Realized P&L:         $${totalPnl.toFixed(2)}`);
  console.log(`  Unrealized P&L:       $${openPnl.toFixed(2)}`);
  console.log(`  Total P&L:            $${(totalPnl + openPnl).toFixed(2)}`);
  console.log(`\nAverage Performance:`);
  console.log(`  Avg Win:              $${avgWin.toFixed(2)}`);
  console.log(`  Avg Loss:             $${avgLoss.toFixed(2)}`);
  console.log(`  Profit Factor:        ${profitFactor.toFixed(2)}x`);
  console.log(`\nExtremes:`);
  console.log(`  Largest Win:          $${largestWin.toFixed(2)}`);
  console.log(`  Largest Loss:         $${largestLoss.toFixed(2)}`);

  // Per-pair analysis
  const pairSymbols = [...new Set(allPositions.map(p => p.symbol))].sort();
  const pairStats: PairStats[] = [];

  console.log('\n\n📈 PERFORMANCE BY TRADING PAIR');
  console.log('─'.repeat(80));

  for (const symbol of pairSymbols) {
    const pairPositions = allPositions.filter(p => p.symbol === symbol);
    const pairClosed = pairPositions.filter(p => p.status === 'CLOSED');
    const pairOpen = pairPositions.filter(p => p.status === 'OPEN');

    const pairWinners = pairClosed.filter(p => (p.realizedPnl || 0) > 0);
    const pairLosers = pairClosed.filter(p => (p.realizedPnl || 0) < 0);

    const pairTotalPnl = pairClosed.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
    const pairOpenPnl = pairOpen.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

    const pairWinRate = pairClosed.length > 0 ? (pairWinners.length / pairClosed.length * 100) : 0;

    const pairAvgWin = pairWinners.length > 0
      ? pairWinners.reduce((sum, p) => sum + (p.realizedPnl || 0), 0) / pairWinners.length
      : 0;
    const pairAvgLoss = pairLosers.length > 0
      ? pairLosers.reduce((sum, p) => sum + (p.realizedPnl || 0), 0) / pairLosers.length
      : 0;

    const pairProfitFactor = Math.abs(pairAvgLoss) > 0 ? Math.abs(pairAvgWin / pairAvgLoss) : 0;

    const pairLargestWin = pairWinners.length > 0
      ? Math.max(...pairWinners.map(p => p.realizedPnl || 0))
      : 0;
    const pairLargestLoss = pairLosers.length > 0
      ? Math.min(...pairLosers.map(p => p.realizedPnl || 0))
      : 0;

    pairStats.push({
      symbol,
      totalTrades: pairClosed.length,
      winners: pairWinners.length,
      losers: pairLosers.length,
      winRate: pairWinRate,
      totalPnl: pairTotalPnl + pairOpenPnl,
      avgPnl: pairClosed.length > 0 ? pairTotalPnl / pairClosed.length : 0,
      avgWin: pairAvgWin,
      avgLoss: pairAvgLoss,
      profitFactor: pairProfitFactor,
      largestWin: pairLargestWin,
      largestLoss: pairLargestLoss
    });

    const statusEmoji = pairTotalPnl + pairOpenPnl > 0 ? '✅' : '❌';
    console.log(`\n${statusEmoji} ${symbol}`);
    console.log(`  Trades: ${pairClosed.length} closed, ${pairOpen.length} open`);
    console.log(`  Win Rate: ${pairWinRate.toFixed(1)}% (${pairWinners.length}W/${pairLosers.length}L)`);
    console.log(`  Total P&L: $${(pairTotalPnl + pairOpenPnl).toFixed(2)} (Realized: $${pairTotalPnl.toFixed(2)}, Unrealized: $${pairOpenPnl.toFixed(2)})`);
    console.log(`  Avg Win: $${pairAvgWin.toFixed(2)} | Avg Loss: $${pairAvgLoss.toFixed(2)}`);
    console.log(`  Profit Factor: ${pairProfitFactor.toFixed(2)}x`);
    console.log(`  Best/Worst: $${pairLargestWin.toFixed(2)} / $${pairLargestLoss.toFixed(2)}`);
  }

  // Top performers
  console.log('\n\n🏆 TOP PERFORMING PAIRS (by Total P&L)');
  console.log('─'.repeat(80));
  const topPerformers = [...pairStats].sort((a, b) => b.totalPnl - a.totalPnl).slice(0, 5);
  topPerformers.forEach((stats, i) => {
    console.log(`${i + 1}. ${stats.symbol}: $${stats.totalPnl.toFixed(2)} | ${stats.winRate.toFixed(1)}% WR | ${stats.totalTrades} trades`);
  });

  // Worst performers
  console.log('\n\n⚠️  WORST PERFORMING PAIRS (by Total P&L)');
  console.log('─'.repeat(80));
  const worstPerformers = [...pairStats].sort((a, b) => a.totalPnl - b.totalPnl).slice(0, 5);
  worstPerformers.forEach((stats, i) => {
    console.log(`${i + 1}. ${stats.symbol}: $${stats.totalPnl.toFixed(2)} | ${stats.winRate.toFixed(1)}% WR | ${stats.totalTrades} trades`);
  });

  // Win rate analysis
  console.log('\n\n📊 WIN RATE ANALYSIS');
  console.log('─'.repeat(80));
  const highWinRate = pairStats.filter(s => s.winRate >= 60 && s.totalTrades >= 5);
  const mediumWinRate = pairStats.filter(s => s.winRate >= 40 && s.winRate < 60 && s.totalTrades >= 5);
  const lowWinRate = pairStats.filter(s => s.winRate < 40 && s.totalTrades >= 5);

  console.log(`High Win Rate (≥60%):     ${highWinRate.length} pairs`);
  highWinRate.forEach(s => console.log(`  ${s.symbol}: ${s.winRate.toFixed(1)}%`));

  console.log(`\nMedium Win Rate (40-60%): ${mediumWinRate.length} pairs`);
  mediumWinRate.forEach(s => console.log(`  ${s.symbol}: ${s.winRate.toFixed(1)}%`));

  console.log(`\nLow Win Rate (<40%):      ${lowWinRate.length} pairs`);
  lowWinRate.forEach(s => console.log(`  ${s.symbol}: ${s.winRate.toFixed(1)}% - NEEDS REVIEW`));

  // Position sizing analysis
  console.log('\n\n💰 POSITION SIZING ANALYSIS');
  console.log('─'.repeat(80));
  const avgPositionSize = closedPositions.reduce((sum, p) => sum + p.positionSize, 0) / closedPositions.length;
  const smallPositions = closedPositions.filter(p => p.positionSize < avgPositionSize * 0.5);
  const mediumPositions = closedPositions.filter(p => p.positionSize >= avgPositionSize * 0.5 && p.positionSize <= avgPositionSize * 1.5);
  const largePositions = closedPositions.filter(p => p.positionSize > avgPositionSize * 1.5);

  const smallPnl = smallPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
  const mediumPnl = mediumPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
  const largePnl = largePositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);

  console.log(`Average Position Size: $${avgPositionSize.toFixed(2)}`);
  console.log(`\nSmall Positions (<50% avg): ${smallPositions.length} trades, $${smallPnl.toFixed(2)} P&L`);
  console.log(`Medium Positions (50-150% avg): ${mediumPositions.length} trades, $${mediumPnl.toFixed(2)} P&L`);
  console.log(`Large Positions (>150% avg): ${largePositions.length} trades, $${largePnl.toFixed(2)} P&L`);

  // Time analysis
  console.log('\n\n⏱️  HOLDING TIME ANALYSIS');
  console.log('─'.repeat(80));
  const holdingTimes = closedPositions
    .filter(p => p.exitTime)
    .map(p => {
      const entry = new Date(p.entryTime).getTime();
      const exit = new Date(p.exitTime!).getTime();
      return (exit - entry) / (1000 * 60 * 60); // hours
    });

  if (holdingTimes.length > 0) {
    const avgHoldingTime = holdingTimes.reduce((sum, t) => sum + t, 0) / holdingTimes.length;
    const minHoldingTime = Math.min(...holdingTimes);
    const maxHoldingTime = Math.max(...holdingTimes);

    console.log(`Average Holding Time: ${avgHoldingTime.toFixed(2)} hours (${(avgHoldingTime / 24).toFixed(2)} days)`);
    console.log(`Min Holding Time: ${minHoldingTime.toFixed(2)} hours`);
    console.log(`Max Holding Time: ${maxHoldingTime.toFixed(2)} hours (${(maxHoldingTime / 24).toFixed(2)} days)`);

    // Quick exits vs long holds
    const quickExits = closedPositions.filter(p => {
      if (!p.exitTime) return false;
      const hours = (new Date(p.exitTime).getTime() - new Date(p.entryTime).getTime()) / (1000 * 60 * 60);
      return hours < 24;
    });
    const longHolds = closedPositions.filter(p => {
      if (!p.exitTime) return false;
      const hours = (new Date(p.exitTime).getTime() - new Date(p.entryTime).getTime()) / (1000 * 60 * 60);
      return hours >= 24;
    });

    const quickExitPnl = quickExits.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
    const longHoldPnl = longHolds.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);

    console.log(`\nQuick Exits (<24h): ${quickExits.length} trades, $${quickExitPnl.toFixed(2)} P&L`);
    console.log(`Long Holds (≥24h): ${longHolds.length} trades, $${longHoldPnl.toFixed(2)} P&L`);
  }

  console.log('\n\n' + '═'.repeat(80));
  console.log('📝 RECOMMENDATIONS & MATHEMATICAL ADJUSTMENTS');
  console.log('═'.repeat(80));

  // Generate recommendations
  if (winRate < 50) {
    console.log('\n⚠️  Win Rate Below 50% - CRITICAL');
    console.log('   Recommendation: Increase conviction threshold from 24.8% to 30-35%');
    console.log('   Rationale: Higher threshold reduces false signals');
  } else if (winRate > 70) {
    console.log('\n✅ Win Rate Above 70% - EXCELLENT');
    console.log('   Recommendation: Consider lowering conviction threshold to 20-22%');
    console.log('   Rationale: Capture more opportunities while maintaining quality');
  }

  if (profitFactor < 1.5) {
    console.log('\n⚠️  Profit Factor Below 1.5x');
    console.log('   Recommendation: Tighten stop losses and/or increase profit targets');
    console.log('   Current Avg Win: $' + avgWin.toFixed(2) + ' | Avg Loss: $' + avgLoss.toFixed(2));
  }

  if (lowWinRate.length > 0) {
    console.log('\n⚠️  Pairs with Low Win Rates (<40%)');
    console.log('   Recommendation: Consider blocking or reducing position size:');
    lowWinRate.forEach(s => {
      console.log(`   - ${s.symbol}: ${s.winRate.toFixed(1)}% WR, $${s.totalPnl.toFixed(2)} P&L`);
    });
  }

  if (Math.abs(avgLoss) > Math.abs(avgWin) * 1.5) {
    console.log('\n⚠️  Average Loss Too Large Relative to Average Win');
    console.log('   Recommendation: Implement tighter stop loss (reduce from current levels)');
    console.log('   Target: Avg Loss should be ≤1.2x Avg Win for optimal risk/reward');
  }

  console.log('\n' + '═'.repeat(80) + '\n');

  await prisma.$disconnect();
}

analyzePerformance().catch((error) => {
  console.error('Error analyzing performance:', error);
  process.exit(1);
});
