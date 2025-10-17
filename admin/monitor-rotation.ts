#!/usr/bin/env npx tsx
/**
 * V3.14.24 Capital Rotation Monitor
 * Real-time dashboard for tracking position rotations and system performance
 */

import { prisma } from '../src/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PositionData {
  symbol: string;
  side: string;
  entryPrice: number;
  currentPrice: number;
  pnlPercent: number;
  pnlUsd: number;
  ageMinutes: number;
  entryTime: Date;
  status: string;
}

interface OpportunityData {
  symbol: string;
  expectedReturn: number;
  winProb: number;
}

async function getCurrentPrice(symbol: string): Promise<number> {
  // Get from shared cache or return entryPrice
  return 0; // Placeholder
}

async function getOpenPositions(): Promise<PositionData[]> {
  try {
    const positions = await prisma.livePosition.findMany({
      where: { status: 'open' },
      orderBy: { entryTime: 'desc' }
    });

    return await Promise.all(positions.map(async pos => {
      const current = parseFloat(pos.currentPrice?.toString() || pos.entryPrice.toString());
      const entry = parseFloat(pos.entryPrice.toString());
      const pnlPercent = pos.side === 'long'
        ? ((current - entry) / entry) * 100
        : ((entry - current) / entry) * 100;
      const pnlUsd = parseFloat(pos.unrealizedPnL?.toString() || '0');
      const ageMinutes = (Date.now() - pos.entryTime.getTime()) / (1000 * 60);

      return {
        symbol: pos.symbol,
        side: pos.side,
        entryPrice: entry,
        currentPrice: current,
        pnlPercent,
        pnlUsd,
        ageMinutes,
        entryTime: pos.entryTime,
        status: pos.status
      };
    }));
  } catch (error) {
    console.error('Failed to get positions:', error.message);
    return [];
  }
}

async function getProfitPredatorOpportunities(): Promise<OpportunityData[]> {
  try {
    // Parse latest Profit Predator log output
    const { stdout } = await execAsync('tail -n 50 /tmp/signalcartel-logs/profit-predator.log | grep "JSON_OPPORTUNITIES"');
    const lines = stdout.trim().split('\n');

    if (lines.length > 0 && lines[lines.length - 1].includes('JSON_OPPORTUNITIES')) {
      const jsonMatch = lines[lines.length - 1].match(/JSON_OPPORTUNITIES: (\[.*\])/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
    }
  } catch (error) {
    // No opportunities found or error parsing
  }
  return [];
}

async function getAccountBalance(): Promise<{ total: number; available: number; inPositions: number }> {
  try {
    const { stdout } = await execAsync('tail -n 100 /tmp/signalcartel-logs/production-trading.log | grep "ACCOUNT SNAPSHOT"');
    const lines = stdout.trim().split('\n');

    if (lines.length > 0) {
      const last = lines[lines.length - 1];
      const totalMatch = last.match(/Total \$([0-9.]+)/);
      const availableMatch = last.match(/Available \$([0-9.]+)/);
      const positionsMatch = last.match(/Positions \$([0-9.]+)/);

      if (totalMatch && availableMatch && positionsMatch) {
        return {
          total: parseFloat(totalMatch[1]),
          available: parseFloat(availableMatch[1]),
          inPositions: parseFloat(positionsMatch[1])
        };
      }
    }
  } catch (error) {
    // Fallback to empty
  }
  return { total: 0, available: 0, inPositions: 0 };
}

async function getRecentRotationEvents(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('tail -n 100 /tmp/signalcartel-logs/production-trading.log | grep -E "(FLAT POSITION|SWAP|ROTATION|CAPITAL ROTATION)"');
    return stdout.trim().split('\n').filter(line => line.length > 0).slice(-10);
  } catch (error) {
    return [];
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.floor(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function colorize(value: number, text: string): string {
  // ANSI color codes
  if (value > 2) return `\x1b[92m${text}\x1b[0m`; // Bright green
  if (value > 0) return `\x1b[32m${text}\x1b[0m`; // Green
  if (value < -2) return `\x1b[91m${text}\x1b[0m`; // Bright red
  if (value < 0) return `\x1b[31m${text}\x1b[0m`; // Red
  return `\x1b[33m${text}\x1b[0m`; // Yellow (flat)
}

async function renderDashboard() {
  console.clear();
  console.log('\x1b[1m\x1b[36m╔════════════════════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[1m\x1b[36m║          QUANTUM FORGE™ V3.14.24 CAPITAL ROTATION MONITOR                  ║\x1b[0m');
  console.log('\x1b[1m\x1b[36m╚════════════════════════════════════════════════════════════════════════════╝\x1b[0m');
  console.log('');

  const [positions, opportunities, balance] = await Promise.all([
    getOpenPositions(),
    getProfitPredatorOpportunities(),
    getAccountBalance()
  ]);

  // Account Summary
  console.log('\x1b[1m\x1b[33m📊 ACCOUNT SNAPSHOT\x1b[0m');
  console.log(`   Total Value:     $${balance.total.toFixed(2)}`);
  console.log(`   Available:       $${balance.available.toFixed(2)}`);
  console.log(`   In Positions:    $${balance.inPositions.toFixed(2)} (${((balance.inPositions / balance.total) * 100).toFixed(1)}%)`);
  console.log('');

  // Open Positions
  console.log('\x1b[1m\x1b[35m🎯 OPEN POSITIONS (${positions.length}/6)\x1b[0m');
  if (positions.length === 0) {
    console.log('   \x1b[90mNo open positions\x1b[0m');
  } else {
    console.log('   ┌─────────────┬──────┬─────────┬─────────┬────────────┬──────────┐');
    console.log('   │ Symbol      │ Side │ P&L %   │ P&L $   │ Age        │ Status   │');
    console.log('   ├─────────────┼──────┼─────────┼─────────┼────────────┼──────────┤');

    // Sort by P&L (worst first for rotation visibility)
    const sorted = [...positions].sort((a, b) => a.pnlPercent - b.pnlPercent);

    sorted.forEach(pos => {
      const pnlPct = formatPercent(pos.pnlPercent);
      const pnlUsd = `$${pos.pnlUsd >= 0 ? '+' : ''}${pos.pnlUsd.toFixed(2)}`;
      const age = formatDuration(pos.ageMinutes);

      // Rotation flag logic
      let rotationFlag = '';
      if (pos.pnlPercent < -0.3 && pos.ageMinutes > 10) {
        rotationFlag = '\x1b[91m🔴 KILL\x1b[0m'; // Negative, >10min -> kill candidate
      } else if (pos.pnlPercent < 1.0 && pos.ageMinutes > 15) {
        rotationFlag = '\x1b[93m🟡 FLAT\x1b[0m'; // Flat, >15min -> rotation candidate
      } else if (pos.pnlPercent < 2.0 && pos.ageMinutes > 15) {
        rotationFlag = '\x1b[94m🔵 STALE\x1b[0m'; // Stale candidate
      } else {
        rotationFlag = '\x1b[92m🟢 HOLD\x1b[0m'; // Good position
      }

      console.log(`   │ ${pos.symbol.padEnd(11)} │ ${pos.side.toUpperCase().padEnd(4)} │ ${colorize(pos.pnlPercent, pnlPct.padEnd(7))} │ ${colorize(pos.pnlUsd, pnlUsd.padEnd(7))} │ ${age.padEnd(10)} │ ${rotationFlag} │`);
    });

    console.log('   └─────────────┴──────┴─────────┴─────────┴────────────┴──────────┘');
  }
  console.log('');

  // Waiting Opportunities
  console.log('\x1b[1m\x1b[32m🔥 PROFIT PREDATOR OPPORTUNITIES (${opportunities.length})\x1b[0m');
  if (opportunities.length === 0) {
    console.log('   \x1b[90mNo opportunities detected\x1b[0m');
  } else {
    console.log('   ┌─────────────┬───────────────┬──────────┐');
    console.log('   │ Symbol      │ Expected %    │ Win Prob │');
    console.log('   ├─────────────┼───────────────┼──────────┤');

    opportunities.slice(0, 10).forEach(opp => {
      const expectedPct = `+${opp.expectedReturn.toFixed(2)}%`;
      const winProb = `${opp.winProb.toFixed(1)}%`;
      console.log(`   │ ${opp.symbol.padEnd(11)} │ ${expectedPct.padEnd(13)} │ ${winProb.padEnd(8)} │`);
    });

    console.log('   └─────────────┴───────────────┴──────────┘');
  }
  console.log('');

  // Rotation Events
  const rotationEvents = await getRecentRotationEvents();
  console.log('\x1b[1m\x1b[36m🔄 RECENT ROTATION EVENTS\x1b[0m');
  if (rotationEvents.length === 0) {
    console.log('   \x1b[90mNo rotation events yet\x1b[0m');
  } else {
    rotationEvents.forEach(event => {
      // Extract just the relevant part
      const parts = event.split(']');
      if (parts.length > 1) {
        console.log(`   ${parts[1].trim()}`);
      }
    });
  }
  console.log('');

  // Legend
  console.log('\x1b[1m\x1b[90m═══════════════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[90mRotation Flags:\x1b[0m');
  console.log('\x1b[90m  🔴 KILL - Negative position >10min (immediate rotation target)\x1b[0m');
  console.log('\x1b[90m  🟡 FLAT - <1% profit >15min (rotation if 2+ opportunities)\x1b[0m');
  console.log('\x1b[90m  🔵 STALE - <2% profit >15min (swap if exceptional opportunities)\x1b[0m');
  console.log('\x1b[90m  🟢 HOLD - Good position or too young to rotate\x1b[0m');
  console.log('\x1b[1m\x1b[90m═══════════════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('');
  console.log('\x1b[90mPress Ctrl+C to exit. Refreshing every 10 seconds...\x1b[0m');
}

// Main loop
async function main() {
  console.log('Starting V3.14.24 Capital Rotation Monitor...\n');

  // Initial render
  await renderDashboard();

  // Refresh every 10 seconds
  setInterval(async () => {
    await renderDashboard();
  }, 10000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n\x1b[33mShutting down monitor...\x1b[0m');
  process.exit(0);
});

main().catch(error => {
  console.error('Monitor error:', error);
  process.exit(1);
});
