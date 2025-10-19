#!/usr/bin/env -S npx tsx
/**
 * COMPREHENSIVE TRADING SYSTEM ANALYSIS
 *
 * Analyzes system performance across multiple dimensions:
 * 1. Trade outcomes and P&L distribution
 * 2. Entry validation effectiveness (V3.14.27 if active, otherwise current system)
 * 3. Exit timing and profit capture patterns
 * 4. Capital rotation decisions
 * 5. AI prediction accuracy vs outcomes
 * 6. Market regime identification
 * 7. Actionable recommendations
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel'
    }
  }
});

interface AnalysisReport {
  overview: any;
  symbolPerformance: any[];
  exitReasons: any[];
  pnlDistribution: any[];
  timeAnalysis: any;
  logAnalysis: any;
  recommendations: string[];
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  COMPREHENSIVE TRADING SYSTEM ANALYSIS');
  console.log('  Period: Last 7 days');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const report: AnalysisReport = {
    overview: null,
    symbolPerformance: [],
    exitReasons: [],
    pnlDistribution: [],
    timeAnalysis: null,
    logAnalysis: null,
    recommendations: []
  };

  // ============================================================================
  // 1. OVERALL PERFORMANCE OVERVIEW
  // ============================================================================
  console.log('\n📊 1. OVERALL PERFORMANCE (Last 7 Days)\n');

  const overview = await prisma.$queryRaw<any[]>`
    SELECT
      COUNT(DISTINCT id) as total_positions,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_positions,
      COUNT(CASE WHEN status = 'open' THEN 1 END) as open_positions,
      ROUND(SUM(CASE WHEN status = 'closed' THEN "realizedPnL" ELSE 0 END)::numeric, 2) as total_realized_pnl,
      ROUND(SUM(CASE WHEN status = 'open' THEN "unrealizedPnL" ELSE 0 END)::numeric, 2) as total_unrealized_pnl,
      MIN("entryTime") as first_position,
      MAX("entryTime") as last_position
    FROM "LivePosition"
    WHERE "entryTime" >= NOW() - INTERVAL '7 days'
  `;

  report.overview = overview[0];

  console.log(`Total Positions:     ${report.overview.total_positions}`);
  console.log(`Closed:              ${report.overview.closed_positions}`);
  console.log(`Open:                ${report.overview.open_positions}`);
  console.log(`Realized P&L:        $${report.overview.total_realized_pnl || '0.00'}`);
  console.log(`Unrealized P&L:      $${report.overview.total_unrealized_pnl || '0.00'}`);
  console.log(`First Trade:         ${report.overview.first_position}`);
  console.log(`Last Trade:          ${report.overview.last_position}`);

  // ============================================================================
  // 2. PER-SYMBOL PERFORMANCE BREAKDOWN
  // ============================================================================
  console.log('\n\n💰 2. PER-SYMBOL PERFORMANCE (Sorted by Total P&L)\n');

  const symbolPerf = await prisma.$queryRaw<any[]>`
    SELECT
      symbol,
      side,
      COUNT(*) as position_count,
      COUNT(CASE WHEN "realizedPnL" > 0 THEN 1 END) as wins,
      COUNT(CASE WHEN "realizedPnL" < 0 THEN 1 END) as losses,
      ROUND((COUNT(CASE WHEN "realizedPnL" > 0 THEN 1 END)::numeric /
        NULLIF(COUNT(CASE WHEN "realizedPnL" IS NOT NULL THEN 1 END), 0) * 100)::numeric, 1) as win_rate_pct,
      ROUND(AVG("realizedPnL" / "entryValue" * 100)::numeric, 3) as avg_pnl_pct,
      ROUND(SUM("realizedPnL")::numeric, 2) as total_pnl_usd,
      ROUND(MAX("realizedPnL" / "entryValue" * 100)::numeric, 3) as best_pnl_pct,
      ROUND(MIN("realizedPnL" / "entryValue" * 100)::numeric, 3) as worst_pnl_pct,
      ROUND(AVG(EXTRACT(EPOCH FROM ("exitTime" - "entryTime"))/60)::numeric, 1) as avg_hold_min,
      ROUND(AVG("totalCommissions")::numeric, 2) as avg_commission
    FROM "LivePosition"
    WHERE status = 'closed'
      AND "entryTime" >= NOW() - INTERVAL '7 days'
      AND "realizedPnL" IS NOT NULL
    GROUP BY symbol, side
    ORDER BY total_pnl_usd DESC NULLS LAST
    LIMIT 30
  `;

  report.symbolPerformance = symbolPerf;

  if (symbolPerf.length === 0) {
    console.log('⚠️  No closed positions found in last 7 days (system may be too conservative)');
  } else {
    console.log('Symbol     Side  Count  W/L    Win%   Avg P&L%  Total P&L  Best%   Worst%  Avg Hold  Avg Comm');
    console.log('─'.repeat(110));
    symbolPerf.forEach(row => {
      const winRate = row.win_rate_pct || 0;
      const avgPnl = row.avg_pnl_pct || 0;
      const status = winRate >= 50 ? '✅' : winRate >= 40 ? '🟡' : '🔴';
      console.log(
        `${status} ${row.symbol.padEnd(9)} ${row.side.padEnd(5)} ${String(row.position_count).padStart(3)}   ` +
        `${row.wins}/${row.losses}    ${String(winRate).padStart(4)}%  ${String(avgPnl).padStart(7)}%  ` +
        `$${String(row.total_pnl_usd).padStart(7)}  ${String(row.best_pnl_pct).padStart(6)}% ${String(row.worst_pnl_pct).padStart(7)}% ` +
        `${String(row.avg_hold_min).padStart(6)}m  $${row.avg_commission}`
      );
    });
  }

  // ============================================================================
  // 3. P&L DISTRIBUTION ANALYSIS
  // ============================================================================
  console.log('\n\n📈 3. P&L DISTRIBUTION (Understanding the Outcome Pattern)\n');

  const pnlDist = await prisma.$queryRaw<any[]>`
    SELECT
      CASE
        WHEN "realizedPnL" / "entryValue" * 100 >= 5 THEN '5%+'
        WHEN "realizedPnL" / "entryValue" * 100 >= 3 THEN '3-5%'
        WHEN "realizedPnL" / "entryValue" * 100 >= 1 THEN '1-3%'
        WHEN "realizedPnL" / "entryValue" * 100 >= 0 THEN '0-1%'
        WHEN "realizedPnL" / "entryValue" * 100 >= -1 THEN '0 to -1%'
        WHEN "realizedPnL" / "entryValue" * 100 >= -3 THEN '-1 to -3%'
        ELSE '-3%+'
      END as pnl_range,
      COUNT(*) as position_count,
      ROUND(SUM("realizedPnL")::numeric, 2) as total_pnl_usd,
      ROUND(AVG("realizedPnL" / "entryValue" * 100)::numeric, 3) as avg_pnl_pct
    FROM "LivePosition"
    WHERE status = 'closed'
      AND "entryTime" >= NOW() - INTERVAL '7 days'
      AND "realizedPnL" IS NOT NULL
    GROUP BY 1
    ORDER BY
      CASE
        WHEN "realizedPnL" / "entryValue" * 100 >= 5 THEN 1
        WHEN "realizedPnL" / "entryValue" * 100 >= 3 THEN 2
        WHEN "realizedPnL" / "entryValue" * 100 >= 1 THEN 3
        WHEN "realizedPnL" / "entryValue" * 100 >= 0 THEN 4
        WHEN "realizedPnL" / "entryValue" * 100 >= -1 THEN 5
        WHEN "realizedPnL" / "entryValue" * 100 >= -3 THEN 6
        ELSE 7
      END
  `;

  report.pnlDistribution = pnlDist;

  if (pnlDist.length === 0) {
    console.log('⚠️  No P&L data available');
  } else {
    console.log('P&L Range      Count  Total P&L   Avg P&L%   Impact');
    console.log('─'.repeat(65));
    pnlDist.forEach(row => {
      const bar = '█'.repeat(Math.min(Math.floor(Number(row.position_count) / 2), 40));
      console.log(
        `${row.pnl_range.padEnd(13)} ${String(row.position_count).padStart(4)}   $${String(row.total_pnl_usd).padStart(7)}   ${String(row.avg_pnl_pct).padStart(7)}%   ${bar}`
      );
    });
  }

  // ============================================================================
  // 4. EXIT REASON EFFECTIVENESS
  // ============================================================================
  console.log('\n\n🚪 4. EXIT REASON EFFECTIVENESS (What\'s Working vs What\'s Not)\n');

  const exitReasons = await prisma.$queryRaw<any[]>`
    SELECT
      COALESCE("positionNotes", 'unknown') as exit_reason,
      COUNT(*) as count,
      COUNT(CASE WHEN "realizedPnL" > 0 THEN 1 END) as wins,
      COUNT(CASE WHEN "realizedPnL" < 0 THEN 1 END) as losses,
      ROUND((COUNT(CASE WHEN "realizedPnL" > 0 THEN 1 END)::numeric / COUNT(*)::numeric * 100)::numeric, 1) as win_rate_pct,
      ROUND(AVG("realizedPnL" / "entryValue" * 100)::numeric, 3) as avg_pnl_pct,
      ROUND(SUM("realizedPnL")::numeric, 2) as total_pnl_usd,
      ROUND(AVG(EXTRACT(EPOCH FROM ("exitTime" - "entryTime"))/60)::numeric, 1) as avg_hold_min
    FROM "LivePosition"
    WHERE status = 'closed'
      AND "entryTime" >= NOW() - INTERVAL '7 days'
    GROUP BY 1
    ORDER BY count DESC
    LIMIT 20
  `;

  report.exitReasons = exitReasons;

  if (exitReasons.length === 0) {
    console.log('⚠️  No exit reason data available');
  } else {
    console.log('Exit Reason                                Count  W/L    Win%   Avg P&L%  Total $  Avg Hold');
    console.log('─'.repeat(100));
    exitReasons.forEach(row => {
      const winRate = row.win_rate_pct || 0;
      const status = winRate >= 50 ? '✅' : winRate >= 40 ? '🟡' : '🔴';
      const reason = row.exit_reason.substring(0, 40).padEnd(41);
      console.log(
        `${status} ${reason} ${String(row.count).padStart(3)}   ${row.wins}/${row.losses}   ${String(winRate).padStart(4)}%  ` +
        `${String(row.avg_pnl_pct).padStart(7)}%  $${String(row.total_pnl_usd).padStart(6)}  ${row.avg_hold_min}m`
      );
    });
  }

  // ============================================================================
  // 5. TIME-BASED ANALYSIS
  // ============================================================================
  console.log('\n\n⏰ 5. TIME-BASED PERFORMANCE ANALYSIS\n');

  const timeAnalysis = await prisma.$queryRaw<any[]>`
    SELECT
      CASE
        WHEN EXTRACT(EPOCH FROM ("exitTime" - "entryTime"))/60 < 5 THEN '0-5min'
        WHEN EXTRACT(EPOCH FROM ("exitTime" - "entryTime"))/60 < 15 THEN '5-15min'
        WHEN EXTRACT(EPOCH FROM ("exitTime" - "entryTime"))/60 < 30 THEN '15-30min'
        WHEN EXTRACT(EPOCH FROM ("exitTime" - "entryTime"))/60 < 60 THEN '30-60min'
        ELSE '60min+'
      END as hold_time_bucket,
      COUNT(*) as count,
      COUNT(CASE WHEN "realizedPnL" > 0 THEN 1 END) as wins,
      ROUND((COUNT(CASE WHEN "realizedPnL" > 0 THEN 1 END)::numeric / COUNT(*)::numeric * 100)::numeric, 1) as win_rate_pct,
      ROUND(AVG("realizedPnL" / "entryValue" * 100)::numeric, 3) as avg_pnl_pct,
      ROUND(SUM("realizedPnL")::numeric, 2) as total_pnl_usd
    FROM "LivePosition"
    WHERE status = 'closed'
      AND "entryTime" >= NOW() - INTERVAL '7 days'
      AND "realizedPnL" IS NOT NULL
    GROUP BY 1
    ORDER BY
      CASE
        WHEN EXTRACT(EPOCH FROM ("exitTime" - "entryTime"))/60 < 5 THEN 1
        WHEN EXTRACT(EPOCH FROM ("exitTime" - "entryTime"))/60 < 15 THEN 2
        WHEN EXTRACT(EPOCH FROM ("exitTime" - "entryTime"))/60 < 30 THEN 3
        WHEN EXTRACT(EPOCH FROM ("exitTime" - "entryTime"))/60 < 60 THEN 4
        ELSE 5
      END
  `;

  report.timeAnalysis = timeAnalysis;

  if (timeAnalysis.length === 0) {
    console.log('⚠️  No time-based data available');
  } else {
    console.log('Hold Time    Count  Wins  Win%   Avg P&L%  Total P&L   Insight');
    console.log('─'.repeat(85));
    timeAnalysis.forEach(row => {
      const winRate = row.win_rate_pct || 0;
      let insight = '';
      if (winRate >= 55) insight = '🎯 SWEET SPOT - Optimal timing';
      else if (winRate >= 45) insight = '✅ GOOD - Above breakeven';
      else if (winRate >= 35) insight = '🟡 MEDIOCRE - Needs improvement';
      else insight = '🔴 POOR - Avoid this timeframe';

      console.log(
        `${row.hold_time_bucket.padEnd(11)} ${String(row.count).padStart(4)}   ${String(row.wins).padStart(3)}   ` +
        `${String(winRate).padStart(4)}%  ${String(row.avg_pnl_pct).padStart(7)}%  $${String(row.total_pnl_usd).padStart(7)}   ${insight}`
      );
    });
  }

  // ============================================================================
  // 6. LOG-BASED ANALYSIS (Recent System Behavior)
  // ============================================================================
  console.log('\n\n📋 6. RECENT LOG ANALYSIS (Last 1000 lines)\n');

  try {
    const logPath = '/tmp/signalcartel-logs/production-trading.log';
    const logAnalysis: any = {
      totalCycles: 0,
      qualitySignals: 0,
      blockedEntries: 0,
      krakenOrders: 0,
      confirmedTrades: 0,
      blockReasons: {} as Record<string, number>,
      recentQualitySignals: [] as any[]
    };

    // Count trading cycles
    const cycleCount = execSync(`tail -1000 ${logPath} | grep -c "Trading Cycle" || echo 0`, { encoding: 'utf-8' });
    logAnalysis.totalCycles = parseInt(cycleCount.trim());

    // Count quality signals
    const qualityCount = execSync(`tail -1000 ${logPath} | grep -c "QUALITY:" || echo 0`, { encoding: 'utf-8' });
    logAnalysis.qualitySignals = parseInt(qualityCount.trim());

    // Count blocked entries
    const blockedCount = execSync(`tail -1000 ${logPath} | grep -c "BLOCKED:" || echo 0`, { encoding: 'utf-8' });
    logAnalysis.blockedEntries = parseInt(blockedCount.trim());

    // Count Kraken orders
    const orderCount = execSync(`tail -1000 ${logPath} | grep -c "KRAKEN API: Placing" || echo 0`, { encoding: 'utf-8' });
    logAnalysis.krakenOrders = parseInt(orderCount.trim());

    // Count confirmed trades
    const confirmCount = execSync(`tail -1000 ${logPath} | grep -c "CONFIRMED" || echo 0`, { encoding: 'utf-8' });
    logAnalysis.confirmedTrades = parseInt(confirmCount.trim());

    // Extract recent quality signals
    try {
      const recentSignals = execSync(`tail -1000 ${logPath} | grep "QUALITY:" | tail -20`, { encoding: 'utf-8' });
      logAnalysis.recentQualitySignals = recentSignals.split('\n').filter(l => l.trim());
    } catch (e) {
      logAnalysis.recentQualitySignals = [];
    }

    report.logAnalysis = logAnalysis;

    console.log(`Trading Cycles (last 1000 lines):  ${logAnalysis.totalCycles}`);
    console.log(`Quality Signals Generated:          ${logAnalysis.qualitySignals}`);
    console.log(`Entries Blocked:                    ${logAnalysis.blockedEntries}`);
    console.log(`Kraken Orders Placed:               ${logAnalysis.krakenOrders}`);
    console.log(`Confirmed Trades:                   ${logAnalysis.confirmedTrades}`);
    console.log(`\nConversion Funnel:`);
    if (logAnalysis.qualitySignals > 0) {
      const orderRate = (logAnalysis.krakenOrders / logAnalysis.qualitySignals * 100).toFixed(1);
      const confirmRate = logAnalysis.krakenOrders > 0
        ? (logAnalysis.confirmedTrades / logAnalysis.krakenOrders * 100).toFixed(1)
        : '0.0';
      console.log(`  Quality → Order:    ${orderRate}% (${logAnalysis.krakenOrders}/${logAnalysis.qualitySignals})`);
      console.log(`  Order → Confirmed:  ${confirmRate}% (${logAnalysis.confirmedTrades}/${logAnalysis.krakenOrders})`);
    }

    if (logAnalysis.recentQualitySignals.length > 0) {
      console.log('\nRecent Quality Signals (last 20):');
      logAnalysis.recentQualitySignals.slice(-10).forEach(signal => {
        console.log(`  ${signal.substring(0, 120)}`);
      });
    }
  } catch (error) {
    console.log(`⚠️  Could not analyze logs: ${error}`);
  }

  // ============================================================================
  // 7. RECOMMENDATIONS
  // ============================================================================
  console.log('\n\n🎯 7. ACTIONABLE RECOMMENDATIONS FOR V3.14.28\n');
  console.log('─'.repeat(80));

  const recommendations: string[] = [];

  // Recommendation 1: Capital protection assessment
  if (report.overview.total_realized_pnl !== null) {
    const totalPnl = parseFloat(report.overview.total_realized_pnl);
    if (totalPnl > -10 && totalPnl < 10 && report.overview.closed_positions > 10) {
      recommendations.push(
        '✅ CAPITAL PROTECTION WORKING: Minimal losses despite tough market.\n' +
        '   💡 Focus on increasing position size on highest win-rate setups\n' +
        '   💡 rather than increasing trade frequency.'
      );
    } else if (totalPnl < -20) {
      recommendations.push(
        '🔴 CAPITAL BLEEDING: System losing too much despite protection.\n' +
        '   💡 Review exit logic - may be holding losers too long\n' +
        '   💡 Consider tighter stop losses or faster rotation.'
      );
    }
  }

  // Recommendation 2: Trade frequency
  if (report.overview.closed_positions < 20 && report.logAnalysis?.qualitySignals > 50) {
    recommendations.push(
      '⚠️  LOW EXECUTION RATE: Many quality signals, few actual trades.\n' +
      '   💡 Review pre-flight checks and entry validation\n' +
      '   💡 V3.14.27 validation may be too strict - check rejection reasons\n' +
      '   💡 Consider lowering confidence thresholds in poor market conditions.'
    );
  } else if (report.overview.closed_positions === 0) {
    recommendations.push(
      '🚨 ZERO TRADES EXECUTED: System completely blocked.\n' +
      '   💡 IMMEDIATE ACTION: Check V3.14.27 validation logic\n' +
      '   💡 Check balance calculation and pre-flight checks\n' +
      '   💡 Review log blockers to identify systematic issues.'
    );
  }

  // Recommendation 3: Win rate analysis
  const winningSymbols = report.symbolPerformance.filter(s => Number(s.win_rate_pct) >= 50);
  const losingSymbols = report.symbolPerformance.filter(s => Number(s.win_rate_pct) < 40);

  if (winningSymbols.length > 0) {
    const topSymbol = winningSymbols[0];
    recommendations.push(
      `🎯 TOP PERFORMER: ${topSymbol.symbol} (${topSymbol.side}) - ${topSymbol.win_rate_pct}% win rate\n` +
      `   💡 Increase allocation to ${topSymbol.symbol} when quality signals appear\n` +
      `   💡 Analyze what makes ${topSymbol.symbol} profitable and replicate.`
    );
  }

  if (losingSymbols.length > 0) {
    const worstSymbol = losingSymbols[0];
    recommendations.push(
      `🔴 WORST PERFORMER: ${worstSymbol.symbol} (${worstSymbol.side}) - ${worstSymbol.win_rate_pct}% win rate\n` +
      `   💡 Add ${worstSymbol.symbol} to blacklist or reduce position size by 50%\n` +
      `   💡 Current market regime may not favor this symbol.`
    );
  }

  // Recommendation 4: Hold time optimization
  if (report.timeAnalysis && report.timeAnalysis.length > 0) {
    const bestTime = report.timeAnalysis.reduce((prev, curr) =>
      Number(curr.win_rate_pct) > Number(prev.win_rate_pct) ? curr : prev
    );

    recommendations.push(
      `⏰ OPTIMAL HOLD TIME: ${bestTime.hold_time_bucket} (${bestTime.win_rate_pct}% win rate)\n` +
      `   💡 Implement time-based exit after ${bestTime.hold_time_bucket}\n` +
      `   💡 If position not profitable in optimal window, rotate capital.`
    );
  }

  // Recommendation 5: Market regime consideration
  recommendations.push(
    '🌍 MARKET REGIME ADAPTATION:\n' +
    '   💡 In choppy/bearish markets: Reduce position size, tighten stops\n' +
    '   💡 In trending markets: Increase position size, wider stops\n' +
    '   💡 Consider implementing market regime detection (VIX, trend strength).'
  );

  // Recommendation 6: V3.14.28 specific improvements
  recommendations.push(
    '🔧 V3.14.28 IMPROVEMENTS TO IMPLEMENT:\n' +
    '   💡 1. Dynamic entry validation based on market regime\n' +
    '   💡 2. Symbol-specific win rate tracking and auto-blacklisting\n' +
    '   💡 3. Time-aware exit logic (exit after optimal hold period)\n' +
    '   💡 4. Position size scaling based on symbol historical performance\n' +
    '   💡 5. Market volatility filter (skip trading during extreme conditions).'
  );

  report.recommendations = recommendations;

  recommendations.forEach((rec, idx) => {
    console.log(`\n${idx + 1}. ${rec}`);
  });

  // ============================================================================
  // 8. SUMMARY
  // ============================================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('  ANALYSIS COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (report.overview.closed_positions === 0) {
    console.log('⚠️  CRITICAL: No trades executed in last 7 days.');
    console.log('    Review system logs and entry validation immediately.');
  } else if (report.overview.total_realized_pnl !== null && parseFloat(report.overview.total_realized_pnl) < -50) {
    console.log('⚠️  WARNING: Significant capital loss detected.');
    console.log('    Review exit logic and position sizing immediately.');
  } else {
    console.log('✅ System operational. Review recommendations above to optimize.');
  }

  console.log('\nNext Steps:');
  console.log('  1. Review detailed analysis above');
  console.log('  2. Identify highest-impact improvements');
  console.log('  3. Implement V3.14.28 changes based on data');
  console.log('  4. Re-run this analysis after 24-48 hours to measure impact\n');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Analysis failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
