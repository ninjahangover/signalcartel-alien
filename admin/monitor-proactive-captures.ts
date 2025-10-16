#!/usr/bin/env tsx
/**
 * 🎯 V3.14.21 PROACTIVE PROFIT CAPTURE MONITOR
 *
 * Real-time dashboard showing:
 * - Current position profit peaks and velocities
 * - Brain-learned thresholds (live values)
 * - Recent proactive captures with outcomes
 * - Regret analysis (good vs bad captures)
 * - Learning progress metrics
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/prisma';
import { AdaptiveProfitBrain } from '../src/lib/adaptive-profit-brain';
import * as fs from 'fs';

interface PositionMonitorData {
  symbol: string;
  side: string;
  currentPnL: number;
  peakPnL: number;
  peakDecay: number;
  velocityHistory: number[];
  recentVelocity: number;
  timeHeld: number;
  entryPrice: number;
  currentPrice: number;
  metadata?: any;
}

interface ProactiveCaptureEvent {
  symbol: string;
  capturedAt: number;
  peakWas: number;
  reason: string;
  regret?: number; // Calculated later from market movement
  timestamp: Date;
}

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
};

class ProactiveCaptureMonitor {
  private brain: AdaptiveProfitBrain;
  private recentCaptures: ProactiveCaptureEvent[] = [];
  private logFile = '/tmp/signalcartel-logs/production-trading.log';

  constructor() {
    this.brain = AdaptiveProfitBrain.getInstance();
  }

  /**
   * Main monitoring loop
   */
  async startMonitoring() {
    console.clear();
    this.printHeader();

    // Initial display
    await this.refreshDashboard();

    // Update every 30 seconds
    setInterval(async () => {
      console.clear();
      this.printHeader();
      await this.refreshDashboard();
    }, 30000);
  }

  /**
   * Print dashboard header
   */
  private printHeader() {
    console.log(`${COLORS.bright}${COLORS.cyan}╔═══════════════════════════════════════════════════════════════════════════════╗${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.cyan}║${COLORS.reset}  ${COLORS.bright}🎯 V3.14.21 PROACTIVE PROFIT CAPTURE MONITOR${COLORS.reset}                              ${COLORS.bright}${COLORS.cyan}║${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.cyan}║${COLORS.reset}  ${COLORS.dim}Real-time tracking of profit peaks, velocities, and captures${COLORS.reset}              ${COLORS.bright}${COLORS.cyan}║${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.cyan}╚═══════════════════════════════════════════════════════════════════════════════╝${COLORS.reset}\n`);
  }

  /**
   * Refresh all dashboard data
   */
  private async refreshDashboard() {
    const timestamp = new Date().toISOString();
    console.log(`${COLORS.dim}Last updated: ${timestamp}${COLORS.reset}\n`);

    // Section 1: Brain-Learned Thresholds
    this.displayBrainThresholds();

    console.log('');

    // Section 2: Current Position Monitoring
    await this.displayCurrentPositions();

    console.log('');

    // Section 3: Recent Proactive Captures
    await this.displayRecentCaptures();

    console.log('');

    // Section 4: Learning Progress
    await this.displayLearningProgress();

    console.log('');

    // Section 5: Performance Summary
    await this.displayPerformanceSummary();
  }

  /**
   * Display current brain thresholds
   */
  private displayBrainThresholds() {
    console.log(`${COLORS.bright}${COLORS.blue}┌─ 🧠 BRAIN-LEARNED THRESHOLDS ────────────────────────────────────────────┐${COLORS.reset}`);

    try {
      const thresholds = this.brain.getCurrentThresholds();

      // Proactive capture thresholds
      const peakDecay = thresholds.profitPeakDecayTolerance?.current || 0.25;
      const velocityDecay = thresholds.profitVelocityDecayThreshold?.current || 0.60;
      const minProfit = thresholds.minProfitForProactiveCapture?.current || 0.025;
      const diminishing = thresholds.diminishingReturnsMinutes?.current || 30;
      const rotation = thresholds.capitalRotationOpportunityCount?.current || 3;

      console.log(`${COLORS.cyan}  Peak Decay Tolerance:${COLORS.reset}       ${this.formatThreshold(peakDecay * 100, '%')} ${this.getTrendIndicator(peakDecay, thresholds.profitPeakDecayTolerance?.optimal || 0.20)}`);
      console.log(`${COLORS.cyan}  Velocity Decay Threshold:${COLORS.reset}   ${this.formatThreshold(velocityDecay * 100, '%')} ${this.getTrendIndicator(velocityDecay, thresholds.profitVelocityDecayThreshold?.optimal || 0.50)}`);
      console.log(`${COLORS.cyan}  Minimum Profit for Capture:${COLORS.reset} ${this.formatThreshold(minProfit * 100, '%')} ${this.getTrendIndicator(minProfit, thresholds.minProfitForProactiveCapture?.optimal || 0.03)}`);
      console.log(`${COLORS.cyan}  Diminishing Returns Time:${COLORS.reset}   ${this.formatThreshold(diminishing, 'min')} ${this.getTrendIndicator(diminishing, thresholds.diminishingReturnsMinutes?.optimal || 45)}`);
      console.log(`${COLORS.cyan}  Capital Rotation Count:${COLORS.reset}     ${this.formatThreshold(rotation, 'opps')} ${this.getTrendIndicator(rotation, thresholds.capitalRotationOpportunityCount?.optimal || 3)}`);

      // Comparison thresholds for context
      console.log(`${COLORS.dim}  ─────────────────────────────────────────────────────────────────────${COLORS.reset}`);
      console.log(`${COLORS.dim}  Emergency Loss Stop:${COLORS.reset}        ${(thresholds.emergencyLossStop?.current * 100 || -6).toFixed(1)}%`);
      console.log(`${COLORS.dim}  Extraordinary Profit:${COLORS.reset}       ${(thresholds.extraordinaryProfitCapture?.current * 100 || 50).toFixed(1)}%`);
      console.log(`${COLORS.dim}  AI Confidence Respect:${COLORS.reset}      ${(thresholds.aiConfidenceRespectThreshold?.current * 100 || 80).toFixed(1)}%`);

    } catch (error) {
      console.log(`${COLORS.red}  ❌ Error loading thresholds: ${error.message}${COLORS.reset}`);
    }

    console.log(`${COLORS.bright}${COLORS.blue}└──────────────────────────────────────────────────────────────────────────┘${COLORS.reset}`);
  }

  /**
   * Display current open positions with profit tracking
   */
  private async displayCurrentPositions() {
    console.log(`${COLORS.bright}${COLORS.green}┌─ 📊 CURRENT POSITIONS (Profit Tracking Active) ─────────────────────────┐${COLORS.reset}`);

    try {
      const positions = await prisma.managedPosition.findMany({
        where: { status: 'open' },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      if (positions.length === 0) {
        console.log(`${COLORS.dim}  No open positions currently${COLORS.reset}`);
      } else {
        console.log(`${COLORS.dim}  Symbol      Side   Current P&L    Peak P&L    Decay    Velocity    Time${COLORS.reset}`);
        console.log(`${COLORS.dim}  ────────────────────────────────────────────────────────────────────${COLORS.reset}`);

        // Fetch live prices for all positions
        const { krakenPositionPriceFetcher } = await import('../src/lib/kraken-position-price-fetcher');

        for (const pos of positions) {
          // 🔧 FIX: Fetch live price from Kraken API instead of stale database field
          let currentPrice = pos.currentPrice;
          let hasCurrentPrice = false;

          try {
            const priceResult = await krakenPositionPriceFetcher.getPositionPrice(pos.symbol);
            if (priceResult.success && priceResult.price > 0) {
              currentPrice = priceResult.price;
              hasCurrentPrice = true;
            }
          } catch (priceError) {
            // Fall back to database price if API fails
            hasCurrentPrice = pos.currentPrice !== null && pos.currentPrice !== undefined && !isNaN(pos.currentPrice);
            currentPrice = pos.currentPrice;
          }

          const currentPnL = hasCurrentPrice
            ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100 * (pos.side === 'long' ? 1 : -1)
            : 0;

          const metadata = pos.metadata as any;
          const tracking = metadata?.profitTracking;

          const peakPnL = tracking?.peak?.value || currentPnL;
          const peakDecay = peakPnL > 0 ? ((peakPnL - currentPnL) / peakPnL) * 100 : 0;

          const velocityHistory = tracking?.velocityHistory || [];
          const recentVelocity = velocityHistory.length >= 2
            ? velocityHistory.slice(-2).reduce((a: number, b: number) => a + b, 0) / 2
            : 0;

          const timeHeld = pos.entryTime
            ? ((Date.now() - pos.entryTime.getTime()) / (1000 * 60))
            : 0;

          // Color coding
          const pnlColor = !hasCurrentPrice ? COLORS.dim : (currentPnL > 0 ? COLORS.green : currentPnL < 0 ? COLORS.red : COLORS.yellow);
          const decayColor = peakDecay > 20 ? COLORS.red : peakDecay > 10 ? COLORS.yellow : COLORS.dim;
          const velocityColor = recentVelocity < 0 ? COLORS.red : recentVelocity < 0.01 ? COLORS.yellow : COLORS.green;

          // Display with "Loading..." for missing prices
          const pnlDisplay = hasCurrentPrice
            ? `${currentPnL > 0 ? '+' : ''}${currentPnL.toFixed(2)}%`
            : 'Loading...';

          const peakDisplay = hasCurrentPrice
            ? `${peakPnL > 0 ? '+' : ''}${peakPnL.toFixed(2)}%`
            : '--';

          console.log(
            `  ${pos.symbol.padEnd(10)} ` +
            `${pos.side.toUpperCase().padEnd(6)} ` +
            `${pnlColor}${pnlDisplay}${COLORS.reset}`.padEnd(20) +
            `${peakDisplay}`.padEnd(12) +
            `${decayColor}${peakDecay.toFixed(1)}%${COLORS.reset}`.padEnd(15) +
            `${velocityColor}${recentVelocity.toFixed(4)}${COLORS.reset}`.padEnd(16) +
            `${timeHeld.toFixed(0)}min`
          );
        }
      }

    } catch (error) {
      console.log(`${COLORS.red}  ❌ Error loading positions: ${error.message}${COLORS.reset}`);
    }

    console.log(`${COLORS.bright}${COLORS.green}└──────────────────────────────────────────────────────────────────────────┘${COLORS.reset}`);
  }

  /**
   * Display recent proactive captures from logs
   */
  private async displayRecentCaptures() {
    console.log(`${COLORS.bright}${COLORS.magenta}┌─ 🎯 RECENT PROACTIVE CAPTURES (Last 24h) ───────────────────────────────┐${COLORS.reset}`);

    try {
      // Parse recent captures from logs
      const captures = await this.parseRecentCaptures();

      if (captures.length === 0) {
        console.log(`${COLORS.dim}  No proactive captures yet - system learning patterns${COLORS.reset}`);
      } else {
        console.log(`${COLORS.dim}  Time       Symbol      Captured   Peak Was   Reason              Regret${COLORS.reset}`);
        console.log(`${COLORS.dim}  ────────────────────────────────────────────────────────────────────${COLORS.reset}`);

        for (const capture of captures.slice(0, 8)) {
          const time = capture.timestamp.toLocaleTimeString();
          const regretColor = capture.regret
            ? (capture.regret > 2 ? COLORS.red : capture.regret > 0 ? COLORS.yellow : COLORS.green)
            : COLORS.dim;
          const regretText = capture.regret !== undefined
            ? `${capture.regret > 0 ? '+' : ''}${capture.regret.toFixed(2)}%`
            : 'pending';

          console.log(
            `  ${time.padEnd(9)} ` +
            `${capture.symbol.padEnd(10)} ` +
            `${COLORS.green}+${capture.capturedAt.toFixed(2)}%${COLORS.reset}`.padEnd(18) +
            `+${capture.peakWas.toFixed(2)}%`.padEnd(11) +
            `${capture.reason.substring(0, 18).padEnd(20)}` +
            `${regretColor}${regretText}${COLORS.reset}`
          );
        }

        // Summary statistics
        const avgCapture = captures.reduce((sum, c) => sum + c.capturedAt, 0) / captures.length;
        const capturesWithRegret = captures.filter(c => c.regret !== undefined);
        const avgRegret = capturesWithRegret.length > 0
          ? capturesWithRegret.reduce((sum, c) => sum + (c.regret || 0), 0) / capturesWithRegret.length
          : 0;

        console.log(`${COLORS.dim}  ────────────────────────────────────────────────────────────────────${COLORS.reset}`);
        console.log(`${COLORS.cyan}  Total captures: ${captures.length} | Avg captured at: +${avgCapture.toFixed(2)}% | Avg regret: ${avgRegret > 0 ? '+' : ''}${avgRegret.toFixed(2)}%${COLORS.reset}`);
      }

    } catch (error) {
      console.log(`${COLORS.red}  ❌ Error loading captures: ${error.message}${COLORS.reset}`);
    }

    console.log(`${COLORS.bright}${COLORS.magenta}└──────────────────────────────────────────────────────────────────────────┘${COLORS.reset}`);
  }

  /**
   * Display learning progress
   */
  private async displayLearningProgress() {
    console.log(`${COLORS.bright}${COLORS.yellow}┌─ 📈 LEARNING PROGRESS ───────────────────────────────────────────────────┐${COLORS.reset}`);

    try {
      const metrics = this.brain.getLearningMetrics();

      console.log(`${COLORS.cyan}  Total decisions recorded:${COLORS.reset} ${metrics.totalDecisions}`);
      console.log(`${COLORS.cyan}  Pathways active:${COLORS.reset}          ${metrics.pathways.length}`);

      // Show top 3 most influential pathways
      const topPathways = metrics.pathways
        .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
        .slice(0, 3);

      console.log(`${COLORS.dim}  ─────────────────────────────────────────────────────────────────────${COLORS.reset}`);
      console.log(`${COLORS.cyan}  Top Influential Factors:${COLORS.reset}`);
      topPathways.forEach((pathway, i) => {
        const weightColor = pathway.weight > 0 ? COLORS.green : COLORS.red;
        console.log(`    ${i + 1}. ${pathway.factorName}: ${weightColor}${pathway.weight.toFixed(4)}${COLORS.reset} (correlation: ${pathway.correlation.toFixed(3)})`);
      });

      // Threshold convergence status
      console.log(`${COLORS.dim}  ─────────────────────────────────────────────────────────────────────${COLORS.reset}`);
      console.log(`${COLORS.cyan}  Threshold Convergence:${COLORS.reset}`);

      const proactiveThresholds = Object.entries(metrics.thresholds).filter(([name]) =>
        name.includes('profitPeak') || name.includes('profitVelocity') || name.includes('minProfitFor') ||
        name.includes('diminishing') || name.includes('capitalRotation')
      );

      for (const [name, data] of proactiveThresholds) {
        const convergence = data.convergence * 100;
        const converged = convergence > 80;
        const statusColor = converged ? COLORS.green : convergence > 50 ? COLORS.yellow : COLORS.dim;
        const statusIcon = converged ? '✅' : convergence > 50 ? '🔄' : '⏳';

        console.log(`    ${statusIcon} ${name}: ${statusColor}${convergence.toFixed(0)}%${COLORS.reset} converged`);
      }

    } catch (error) {
      console.log(`${COLORS.red}  ❌ Error loading learning metrics: ${error.message}${COLORS.reset}`);
    }

    console.log(`${COLORS.bright}${COLORS.yellow}└──────────────────────────────────────────────────────────────────────────┘${COLORS.reset}`);
  }

  /**
   * Display overall performance summary
   */
  private async displayPerformanceSummary() {
    console.log(`${COLORS.bright}${COLORS.cyan}┌─ 💰 PERFORMANCE SUMMARY ─────────────────────────────────────────────────┐${COLORS.reset}`);

    try {
      // Get closed positions from last 24 hours
      const closedPositions = await prisma.managedPosition.findMany({
        where: {
          status: 'closed',
          exitTime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { exitTime: 'desc' }
      });

      const proactiveCaptures = closedPositions.filter(p =>
        (p.metadata as any)?.exitReason?.includes('proactive_capture')
      );

      const regularExits = closedPositions.filter(p =>
        !(p.metadata as any)?.exitReason?.includes('proactive_capture')
      );

      // Calculate stats
      const proactiveAvgPnL = proactiveCaptures.length > 0
        ? proactiveCaptures.reduce((sum, p) => sum + (p.realizedPnL || 0), 0) / proactiveCaptures.length
        : 0;

      const regularAvgPnL = regularExits.length > 0
        ? regularExits.reduce((sum, p) => sum + (p.realizedPnL || 0), 0) / regularExits.length
        : 0;

      const proactiveWinRate = proactiveCaptures.length > 0
        ? (proactiveCaptures.filter(p => (p.realizedPnL || 0) > 0).length / proactiveCaptures.length) * 100
        : 0;

      const regularWinRate = regularExits.length > 0
        ? (regularExits.filter(p => (p.realizedPnL || 0) > 0).length / regularExits.length) * 100
        : 0;

      console.log(`${COLORS.cyan}  📊 Last 24 Hours:${COLORS.reset}`);
      console.log(`${COLORS.dim}  ─────────────────────────────────────────────────────────────────────${COLORS.reset}`);

      console.log(`  ${COLORS.green}Proactive Captures:${COLORS.reset}`);
      console.log(`    Count: ${proactiveCaptures.length} trades`);
      console.log(`    Avg P&L: $${proactiveAvgPnL.toFixed(2)}`);
      console.log(`    Win Rate: ${proactiveWinRate.toFixed(1)}%`);

      console.log(`  ${COLORS.dim}Regular Exits:${COLORS.reset}`);
      console.log(`    Count: ${regularExits.length} trades`);
      console.log(`    Avg P&L: $${regularAvgPnL.toFixed(2)}`);
      console.log(`    Win Rate: ${regularWinRate.toFixed(1)}%`);

      // Improvement calculation
      if (proactiveCaptures.length > 0 && regularExits.length > 0) {
        const improvement = ((proactiveAvgPnL - regularAvgPnL) / Math.abs(regularAvgPnL || 1)) * 100;
        const improvementColor = improvement > 0 ? COLORS.green : COLORS.red;
        console.log(`${COLORS.dim}  ─────────────────────────────────────────────────────────────────────${COLORS.reset}`);
        console.log(`  ${COLORS.bright}Proactive Capture Impact: ${improvementColor}${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%${COLORS.reset} vs regular exits`);
      }

    } catch (error) {
      console.log(`${COLORS.red}  ❌ Error loading performance: ${error.message}${COLORS.reset}`);
    }

    console.log(`${COLORS.bright}${COLORS.cyan}└──────────────────────────────────────────────────────────────────────────┘${COLORS.reset}`);
  }

  /**
   * Helper: Format threshold with units
   */
  private formatThreshold(value: number, unit: string): string {
    return `${value.toFixed(1)}${unit}`;
  }

  /**
   * Helper: Get trend indicator (moving toward or away from optimal)
   */
  private getTrendIndicator(current: number, optimal: number): string {
    const distance = Math.abs(current - optimal);
    const pct = (distance / optimal) * 100;

    if (pct < 5) return `${COLORS.green}✅${COLORS.reset}`;  // Very close to optimal
    if (pct < 15) return `${COLORS.yellow}🔄${COLORS.reset}`; // Converging
    return `${COLORS.dim}⏳${COLORS.reset}`;                  // Still learning
  }

  /**
   * Parse recent proactive captures from log file
   */
  private async parseRecentCaptures(): Promise<ProactiveCaptureEvent[]> {
    try {
      const logContent = fs.readFileSync(this.logFile, 'utf-8');
      const lines = logContent.split('\n').slice(-5000); // Last 5000 lines

      const captures: ProactiveCaptureEvent[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Look for proactive capture triggers
        if (line.includes('🎯 PROACTIVE PROFIT CAPTURE')) {
          const match = line.match(/🎯 PROACTIVE PROFIT CAPTURE.*?:\s*([a-z_]+)\s*-\s*Locking in\s*([\d.]+)%/);
          if (match) {
            const reason = match[1];
            const capturedAt = parseFloat(match[2]);

            // Try to find the symbol from nearby context
            const contextLines = lines.slice(Math.max(0, i - 5), i + 1);
            const symbolMatch = contextLines.join('\n').match(/([A-Z]{3,10}USD)/);
            const symbol = symbolMatch ? symbolMatch[1] : 'UNKNOWN';

            // Try to find peak from metadata
            const peakMatch = contextLines.join('\n').match(/Peak was:\s*\+?([\d.]+)%/);
            const peakWas = peakMatch ? parseFloat(peakMatch[1]) : capturedAt;

            const timestampMatch = line.match(/\[(.*?)\]/);
            const timestamp = timestampMatch ? new Date(timestampMatch[1]) : new Date();

            captures.push({
              symbol,
              capturedAt,
              peakWas,
              reason,
              timestamp
            });
          }
        }
      }

      return captures.reverse(); // Most recent first

    } catch (error) {
      return [];
    }
  }
}

// Start monitoring
const monitor = new ProactiveCaptureMonitor();
monitor.startMonitoring().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n✋ Monitoring stopped');
  process.exit(0);
});
