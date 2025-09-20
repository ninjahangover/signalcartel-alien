/**
 * Contest Validation Monitor
 * Tracks 24-hour performance for contest readiness
 * Goal: Maintain 76%+ win rate with positive P&L
 */

import axios from 'axios';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ValidationMetrics {
  startTime: Date;
  currentTime: Date;
  hoursElapsed: number;
  winRate: number;
  totalTrades: number;
  winners: number;
  losers: number;
  totalPnL: number;
  openPositions: number;
  unrealizedPnL: number;
  systemHealth: {
    trading: boolean;
    kraken: boolean;
    dashboard: boolean;
    profitPredator: boolean;
  };
  contestReady: boolean;
}

class ContestValidationMonitor {
  private readonly LOG_FILE = '/tmp/signalcartel-logs/contest-validation.log';
  private readonly CHECK_INTERVAL = 300000; // 5 minutes
  private readonly TARGET_WIN_RATE = 76;
  private readonly VALIDATION_HOURS = 24;

  private startTime: Date;
  private startMetrics: any = null;

  constructor() {
    this.startTime = new Date();
    console.log('🏁 CONTEST VALIDATION MONITOR STARTED');
    console.log(`📅 Start: ${this.startTime.toISOString()}`);
    console.log(`🎯 Target: ${this.TARGET_WIN_RATE}% win rate over ${this.VALIDATION_HOURS} hours`);
    console.log(`💰 Goal: Pass evaluation → Get $100-200k funded account!\n`);
  }

  async start() {
    // Capture starting metrics
    this.startMetrics = await this.captureMetrics();
    this.logMetrics(this.startMetrics);

    // Start monitoring
    setInterval(async () => {
      const metrics = await this.captureMetrics();
      this.logMetrics(metrics);
      await this.checkMilestones(metrics);
    }, this.CHECK_INTERVAL);

    console.log(`⏰ Monitoring every ${this.CHECK_INTERVAL/1000/60} minutes...`);
  }

  private async captureMetrics(): Promise<ValidationMetrics> {
    const metrics: ValidationMetrics = {
      startTime: this.startTime,
      currentTime: new Date(),
      hoursElapsed: (Date.now() - this.startTime.getTime()) / 1000 / 60 / 60,
      winRate: 0,
      totalTrades: 0,
      winners: 0,
      losers: 0,
      totalPnL: 0,
      openPositions: 0,
      unrealizedPnL: 0,
      systemHealth: {
        trading: false,
        kraken: false,
        dashboard: false,
        profitPredator: false
      },
      contestReady: false
    };

    try {
      // Get performance from dashboard
      const dashboardHtml = await axios.get('http://localhost:3004', { timeout: 5000 })
        .then(res => res.data)
        .catch(() => '');

      // Extract win rate
      const winRateMatch = dashboardHtml.match(/Win Rate:.*?>([0-9.]+)%/);
      if (winRateMatch) {
        metrics.winRate = parseFloat(winRateMatch[1]);
      }

      // Check system health
      try {
        await execAsync('pgrep -f "production-trading-multi-pair" | head -1');
        metrics.systemHealth.trading = true;
      } catch {}

      try {
        await axios.get('http://localhost:3002/health', { timeout: 2000 });
        metrics.systemHealth.kraken = true;
      } catch {}

      try {
        await axios.get('http://localhost:3004', { timeout: 2000 });
        metrics.systemHealth.dashboard = true;
      } catch {}

      try {
        await execAsync('pgrep -f "profit-predator" | head -1');
        metrics.systemHealth.profitPredator = true;
      } catch {}

      // Check if contest ready
      metrics.contestReady =
        metrics.winRate >= this.TARGET_WIN_RATE &&
        metrics.totalPnL > 0 &&
        Object.values(metrics.systemHealth).every(v => v === true);

    } catch (error) {
      console.error('Metrics capture error:', error.message);
    }

    return metrics;
  }

  private logMetrics(metrics: ValidationMetrics) {
    const output = `
===========================================
📊 CONTEST VALIDATION - Hour ${metrics.hoursElapsed.toFixed(1)}/${this.VALIDATION_HOURS}
===========================================
⏰ Time: ${metrics.currentTime.toISOString()}
📈 Win Rate: ${metrics.winRate.toFixed(1)}% ${metrics.winRate >= this.TARGET_WIN_RATE ? '✅' : '⚠️'}

🎮 System Health:
  Trading: ${metrics.systemHealth.trading ? '✅' : '❌'}
  Kraken: ${metrics.systemHealth.kraken ? '✅' : '❌'}
  Dashboard: ${metrics.systemHealth.dashboard ? '✅' : '❌'}
  Profit Predator: ${metrics.systemHealth.profitPredator ? '✅' : '❌'}

🏁 Contest Ready: ${metrics.contestReady ? '✅ YES!' : '❌ Not Yet'}
`;

    console.log(output);
    fs.appendFileSync(this.LOG_FILE, output);
  }

  private async checkMilestones(metrics: ValidationMetrics) {
    // Send alerts at key milestones
    const milestones = [6, 12, 18, 24];
    const hoursInt = Math.floor(metrics.hoursElapsed);

    if (milestones.includes(hoursInt) && metrics.hoursElapsed - hoursInt < 0.1) {
      const title = `📊 ${hoursInt}HR VALIDATION UPDATE`;
      const message = `Win Rate: ${metrics.winRate.toFixed(1)}% | Contest Ready: ${metrics.contestReady ? 'YES' : 'NO'}`;

      try {
        await execAsync(`curl -H "Title: ${title}" -d "${message}" ntfy.sh/signal-cartel`);
      } catch {}

      // Special message at 24 hours
      if (hoursInt === 24) {
        console.log('\n🎉 24-HOUR VALIDATION COMPLETE!');
        console.log('=================================');

        if (metrics.contestReady) {
          console.log('✅ CONTEST READY - System validated!');
          console.log('🎯 Ready for evaluation → $100-200k funded account!');
        } else {
          console.log('⚠️ Needs adjustment:');
          if (metrics.winRate < this.TARGET_WIN_RATE) {
            console.log(`  - Win rate ${metrics.winRate}% < ${this.TARGET_WIN_RATE}% target`);
          }
        }
      }
    }
  }
}

// Start validation monitoring
const monitor = new ContestValidationMonitor();
monitor.start().catch(console.error);

// Keep running
process.on('SIGINT', () => {
  console.log('\n📊 Validation monitoring stopped');
  process.exit(0);
});