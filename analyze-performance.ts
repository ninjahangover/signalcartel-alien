import { PrismaClient } from '@prisma/client';
import krakenApiService from './src/lib/kraken-api-service';

const prisma = new PrismaClient();

async function analyzeComprehensivePerformance() {
  try {
    console.log('🎯 TENSOR AI FUSION - COMPREHENSIVE PERFORMANCE ANALYSIS');
    console.log('=' .repeat(60));
    console.log(`Analysis Date: ${new Date().toISOString()}`);
    console.log('=' .repeat(60));

    // Get Kraken account balance
    try {
      const balance = await krakenApiService.getAccountBalance();
      const usdBalance = balance.USD || balance.ZUSD || 0;
      console.log(`\n💰 CURRENT ACCOUNT BALANCE: $${parseFloat(usdBalance).toFixed(2)}`);
    } catch (e) {
      console.log('\n💰 Balance fetch error - checking database...');
    }

    // Get all positions from database
    const allPositions = await prisma.position.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const openPositions = allPositions.filter(p => p.status === 'open');
    const closedPositions = allPositions.filter(p => p.status === 'closed');

    // Calculate overall metrics
    const totalTrades = closedPositions.length;
    const winners = closedPositions.filter(p => (p.realizedPnl || 0) > 0);
    const losers = closedPositions.filter(p => (p.realizedPnl || 0) < 0);
    const breakeven = closedPositions.filter(p => (p.realizedPnl || 0) === 0);

    const winRate = totalTrades > 0 ? (winners.length / totalTrades * 100) : 0;
    const totalPnL = closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);

    const avgWin = winners.length > 0
      ? winners.reduce((sum, p) => sum + (p.realizedPnl || 0), 0) / winners.length
      : 0;

    const avgLoss = losers.length > 0
      ? Math.abs(losers.reduce((sum, p) => sum + (p.realizedPnl || 0), 0) / losers.length)
      : 0;

    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0;
    const expectancy = totalTrades > 0
      ? totalPnL / totalTrades
      : 0;

    console.log('\n📊 OVERALL PERFORMANCE METRICS');
    console.log('-' .repeat(40));
    console.log(`Total Closed Trades: ${totalTrades}`);
    console.log(`Winners: ${winners.length} (${winRate.toFixed(2)}%)`);
    console.log(`Losers: ${losers.length} (${(losers.length/totalTrades*100).toFixed(2)}%)`);
    console.log(`Breakeven: ${breakeven.length}`);
    console.log(`\n✅ WIN RATE: ${winRate.toFixed(2)}%`);
    console.log(`💵 Total Realized P&L: $${totalPnL.toFixed(2)}`);
    console.log(`📈 Average Win: $${avgWin.toFixed(2)}`);
    console.log(`📉 Average Loss: $${avgLoss.toFixed(2)}`);
    console.log(`⚖️ Profit Factor: ${profitFactor.toFixed(2)}`);
    console.log(`🎲 Expectancy per Trade: $${expectancy.toFixed(2)}`);

    // Analyze recent performance (last 24 hours)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentClosed = closedPositions.filter(p =>
      p.closedAt && new Date(p.closedAt) > last24h
    );

    if (recentClosed.length > 0) {
      const recentWinners = recentClosed.filter(p => (p.realizedPnl || 0) > 0);
      const recentWinRate = (recentWinners.length / recentClosed.length * 100);
      const recentPnL = recentClosed.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);

      console.log('\n📈 LAST 24 HOURS PERFORMANCE');
      console.log('-' .repeat(40));
      console.log(`Trades: ${recentClosed.length}`);
      console.log(`Win Rate: ${recentWinRate.toFixed(2)}%`);
      console.log(`P&L: $${recentPnL.toFixed(2)}`);
    }

    // Show current open positions
    if (openPositions.length > 0) {
      console.log('\n🔄 CURRENT OPEN POSITIONS');
      console.log('-' .repeat(40));

      let totalUnrealizedPnL = 0;
      for (const pos of openPositions) {
        // Calculate unrealized P&L if we have current price
        const unrealizedPnL = pos.unrealizedPnl || 0;
        totalUnrealizedPnL += unrealizedPnL;

        console.log(`${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} | Unrealized: $${unrealizedPnL.toFixed(2)}`);
      }
      console.log(`Total Unrealized P&L: $${totalUnrealizedPnL.toFixed(2)}`);
    }

    // Performance by symbol
    const symbolStats: any = {};
    closedPositions.forEach(p => {
      if (!symbolStats[p.symbol]) {
        symbolStats[p.symbol] = { trades: 0, wins: 0, pnl: 0 };
      }
      symbolStats[p.symbol].trades++;
      if ((p.realizedPnl || 0) > 0) symbolStats[p.symbol].wins++;
      symbolStats[p.symbol].pnl += (p.realizedPnl || 0);
    });

    console.log('\n🏆 TOP PERFORMING SYMBOLS');
    console.log('-' .repeat(40));
    const topSymbols = Object.entries(symbolStats)
      .sort((a: any, b: any) => b[1].pnl - a[1].pnl)
      .slice(0, 5);

    topSymbols.forEach(([symbol, stats]: any) => {
      const symWinRate = (stats.wins / stats.trades * 100).toFixed(1);
      console.log(`${symbol}: ${stats.trades} trades | ${symWinRate}% win | P&L: $${stats.pnl.toFixed(2)}`);
    });

    // Contest readiness assessment
    console.log('\n🏁 CONTEST READINESS ASSESSMENT');
    console.log('-' .repeat(40));

    const meetsWinRateTarget = winRate >= 76;
    const positivePnL = totalPnL > 0;
    const goodProfitFactor = profitFactor > 1.5;

    console.log(`✅ Win Rate >= 76%: ${meetsWinRateTarget ? 'YES' : 'NO'} (${winRate.toFixed(2)}%)`);
    console.log(`✅ Positive P&L: ${positivePnL ? 'YES' : 'NO'} ($${totalPnL.toFixed(2)})`);
    console.log(`✅ Profit Factor > 1.5: ${goodProfitFactor ? 'YES' : 'NO'} (${profitFactor.toFixed(2)})`);

    const contestReady = meetsWinRateTarget && positivePnL && goodProfitFactor;
    console.log(`\n🎯 CONTEST READY: ${contestReady ? '✅ YES!' : '❌ Not Yet'}`);

    if (!contestReady) {
      console.log('\n💡 RECOMMENDATIONS FOR IMPROVEMENT:');
      if (!meetsWinRateTarget) {
        console.log('- Increase opportunity threshold to be more selective');
        console.log('- Review exit strategies for premature closures');
      }
      if (!positivePnL) {
        console.log('- Adjust position sizing to reduce risk');
        console.log('- Focus on higher probability setups');
      }
      if (!goodProfitFactor) {
        console.log('- Let winners run longer');
        console.log('- Cut losses quicker');
      }
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('Error analyzing performance:', error);
    await prisma.$disconnect();
  }
}

analyzeComprehensivePerformance();