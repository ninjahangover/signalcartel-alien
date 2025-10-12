import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    // Get latest balance
    const balance = await prisma.accountBalance.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    // Get position summary
    const openPositions = await prisma.managedPosition.findMany({
      where: { status: 'open' },
      select: { symbol: true, unrealizedPnL: true, entryValue: true, entryPrice: true }
    });

    const closedCount = await prisma.managedPosition.count({
      where: { status: 'closed' }
    });

    // Get recent closed trades
    const recentTrades = await prisma.managedPosition.findMany({
      where: { status: 'closed', realizedPnL: { not: null } },
      orderBy: { exitTime: 'desc' },
      take: 15,
      select: { symbol: true, realizedPnL: true, entryTime: true, exitTime: true }
    });

    // Get adaptive learning performance
    const learningPerf = await prisma.adaptiveLearningPerformance.findMany({
      orderBy: { lastUpdated: 'desc' },
      take: 10
    });

    console.log('\n=== ACCOUNT BALANCE ===');
    console.log('Total: $' + (balance?.totalBalance || 'N/A'));
    console.log('Available: $' + (balance?.availableBalance || 'N/A'));
    console.log('Last Updated: ' + (balance?.timestamp || 'N/A'));

    console.log('\n=== OPEN POSITIONS ===');
    console.log('Count: ' + openPositions.length);
    let totalUnrealizedPnL = 0;
    let totalValue = 0;
    openPositions.forEach(p => {
      const pnl = parseFloat(p.unrealizedPnL || '0');
      const value = parseFloat(p.entryValue || '0');
      totalUnrealizedPnL += pnl;
      totalValue += value;
      console.log('  ' + p.symbol + ': $' + value.toFixed(2) + ' @ ' + p.entryPrice + ', P&L: $' + pnl.toFixed(2));
    });
    console.log('Total Value: $' + totalValue.toFixed(2));
    console.log('Total Unrealized P&L: $' + totalUnrealizedPnL.toFixed(2));

    console.log('\n=== CLOSED POSITIONS ===');
    console.log('Total Closed: ' + closedCount);
    console.log('\nRecent 15 Trades:');
    let winCount = 0;
    let lossCount = 0;
    let totalPnL = 0;
    recentTrades.forEach(t => {
      const pnl = parseFloat(t.realizedPnL || '0');
      totalPnL += pnl;
      if (pnl > 0) winCount++;
      if (pnl < 0) lossCount++;
      const holdTime = t.exitTime && t.entryTime
        ? ((t.exitTime.getTime() - t.entryTime.getTime()) / 60000).toFixed(1)
        : 'N/A';
      console.log('  ' + t.symbol + ': $' + pnl.toFixed(2) + ' (' + holdTime + 'min)');
    });

    if (recentTrades.length > 0) {
      console.log('\nRecent Performance:');
      console.log('  Wins: ' + winCount + ', Losses: ' + lossCount);
      console.log('  Win Rate: ' + ((winCount / recentTrades.length) * 100).toFixed(1) + '%');
      console.log('  Total P&L: $' + totalPnL.toFixed(2));
      console.log('  Avg P&L: $' + (totalPnL / recentTrades.length).toFixed(2));
    }

    console.log('\n=== ADAPTIVE LEARNING PERFORMANCE ===');
    learningPerf.forEach(lp => {
      console.log('  ' + lp.pairDirection + ': ' + lp.totalSignals + ' signals, ' +
                  lp.accuracy.toFixed(1) + '% accuracy, $' + lp.avgPnL.toFixed(2) + ' avg P&L');
    });

  } finally {
    await prisma.$disconnect();
  }
}

main();
