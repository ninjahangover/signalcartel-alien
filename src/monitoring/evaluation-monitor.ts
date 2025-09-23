import { PrismaClient } from '@prisma/client';
import { BREAKOUT_CONFIG, RISK_LIMITS } from '../../breakout-config';
import chalk from 'chalk';
import fs from 'fs';

const prisma = new PrismaClient();

interface EvaluationMetrics {
  currentBalance: number;
  startBalance: number;
  peakBalance: number;
  currentDrawdown: number;
  maxDrawdownAllowed: number;
  dailyPnL: number;
  maxDailyLossAllowed: number;
  totalPnL: number;
  profitTarget: number;
  winRate: number;
  tradingDays: number;
  daysRemaining: number;
  progressToTarget: number;
  riskStatus: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BREACHED';
}

class BreakoutEvaluationMonitor {
  private metrics: EvaluationMetrics;
  private evaluationStart: Date;
  private lastDailyReset: Date;

  constructor() {
    this.evaluationStart = new Date();
    this.lastDailyReset = new Date();

    this.metrics = {
      currentBalance: BREAKOUT_CONFIG.ACCOUNT_SIZE,
      startBalance: BREAKOUT_CONFIG.ACCOUNT_SIZE,
      peakBalance: BREAKOUT_CONFIG.ACCOUNT_SIZE,
      currentDrawdown: 0,
      maxDrawdownAllowed: BREAKOUT_CONFIG.MAX_DRAWDOWN,
      dailyPnL: 0,
      maxDailyLossAllowed: BREAKOUT_CONFIG.MAX_DAILY_LOSS,
      totalPnL: 0,
      profitTarget: BREAKOUT_CONFIG.PROFIT_TARGET,
      winRate: 0,
      tradingDays: 0,
      daysRemaining: 30,
      progressToTarget: 0,
      riskStatus: 'SAFE'
    };
  }

  async initialize() {
    console.log(chalk.cyan('📊 Breakout Evaluation Monitor Started'));
    console.log(chalk.dim('Monitoring drawdown and daily loss limits...'));

    // Load existing evaluation data if resuming
    await this.loadEvaluationData();

    // Start monitoring loop
    this.startMonitoring();

    // Daily reset scheduler
    this.scheduleDailyReset();
  }

  private async loadEvaluationData() {
    try {
      // Check for existing evaluation file
      const evalFile = '/tmp/breakout-logs/evaluation-state.json';
      if (fs.existsSync(evalFile)) {
        const data = JSON.parse(fs.readFileSync(evalFile, 'utf8'));
        this.evaluationStart = new Date(data.startDate);
        this.metrics.tradingDays = data.tradingDays || 0;
        console.log(chalk.yellow(`Resuming evaluation from day ${this.metrics.tradingDays}`));
      }
    } catch (error) {
      console.log(chalk.yellow('Starting fresh evaluation'));
    }
  }

  private startMonitoring() {
    // Monitor every 10 seconds
    setInterval(async () => {
      await this.updateMetrics();
      this.checkRiskStatus();
      this.displayStatus();
      this.saveState();
    }, 10000);
  }

  private async updateMetrics() {
    try {
      // Get all positions
      const positions = await prisma.position.findMany({
        where: {
          createdAt: { gte: this.evaluationStart }
        }
      });

      // Calculate metrics
      let openPnL = 0;
      let closedPnL = 0;
      let wins = 0;
      let losses = 0;

      for (const position of positions) {
        if (position.status === 'OPEN') {
          openPnL += parseFloat(position.unrealizedPnL?.toString() || '0');
        } else if (position.status === 'CLOSED') {
          const pnl = parseFloat(position.realizedPnL?.toString() || '0');
          closedPnL += pnl;
          if (pnl > 0) wins++;
          else if (pnl < 0) losses++;
        }
      }

      // Update balance
      this.metrics.totalPnL = closedPnL + openPnL;
      this.metrics.currentBalance = this.metrics.startBalance + this.metrics.totalPnL;

      // Update peak and drawdown
      if (this.metrics.currentBalance > this.metrics.peakBalance) {
        this.metrics.peakBalance = this.metrics.currentBalance;
      }
      this.metrics.currentDrawdown = this.metrics.peakBalance - this.metrics.currentBalance;

      // Calculate win rate
      const totalTrades = wins + losses;
      this.metrics.winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

      // Progress to target
      this.metrics.progressToTarget = (this.metrics.totalPnL / this.metrics.profitTarget) * 100;

      // Days remaining
      const daysPassed = Math.floor((Date.now() - this.evaluationStart.getTime()) / (1000 * 60 * 60 * 24));
      this.metrics.daysRemaining = Math.max(0, 30 - daysPassed);

      // Get today's P&L
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayPositions = await prisma.position.findMany({
        where: {
          OR: [
            { closedAt: { gte: todayStart } },
            { status: 'OPEN', createdAt: { gte: todayStart } }
          ]
        }
      });

      let todayPnL = 0;
      for (const pos of todayPositions) {
        if (pos.status === 'CLOSED' && pos.closedAt && pos.closedAt >= todayStart) {
          todayPnL += parseFloat(pos.realizedPnL?.toString() || '0');
        } else if (pos.status === 'OPEN') {
          todayPnL += parseFloat(pos.unrealizedPnL?.toString() || '0');
        }
      }

      this.metrics.dailyPnL = todayPnL;

    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  private checkRiskStatus() {
    // Determine risk status
    const drawdownPercent = (this.metrics.currentDrawdown / this.metrics.startBalance) * 100;
    const dailyLossPercent = Math.abs(this.metrics.dailyPnL < 0 ? (this.metrics.dailyPnL / this.metrics.startBalance) * 100 : 0);

    if (this.metrics.currentDrawdown >= this.metrics.maxDrawdownAllowed ||
        Math.abs(this.metrics.dailyPnL) >= this.metrics.maxDailyLossAllowed) {
      this.metrics.riskStatus = 'BREACHED';
      this.handleBreach();
    } else if (drawdownPercent >= 4 || dailyLossPercent >= 3) {
      this.metrics.riskStatus = 'CRITICAL';
    } else if (drawdownPercent >= 3 || dailyLossPercent >= 2) {
      this.metrics.riskStatus = 'WARNING';
    } else {
      this.metrics.riskStatus = 'SAFE';
    }

    // Update global risk limits
    RISK_LIMITS.currentDrawdown = this.metrics.currentDrawdown;
    RISK_LIMITS.currentDayPnL = this.metrics.dailyPnL;
  }

  private handleBreach() {
    console.log(chalk.red.bold('\n🚨 EVALUATION RULE BREACH DETECTED! 🚨'));

    if (this.metrics.currentDrawdown >= this.metrics.maxDrawdownAllowed) {
      console.log(chalk.red(`Maximum drawdown breached: $${this.metrics.currentDrawdown.toFixed(2)} / $${this.metrics.maxDrawdownAllowed}`));
    }

    if (Math.abs(this.metrics.dailyPnL) >= this.metrics.maxDailyLossAllowed) {
      console.log(chalk.red(`Daily loss limit breached: $${Math.abs(this.metrics.dailyPnL).toFixed(2)} / $${this.metrics.maxDailyLossAllowed}`));
    }

    // Set emergency stop
    RISK_LIMITS.emergencyStop = true;
    RISK_LIMITS.drawdownBreached = this.metrics.currentDrawdown >= this.metrics.maxDrawdownAllowed;
    RISK_LIMITS.dailyLossBreached = Math.abs(this.metrics.dailyPnL) >= this.metrics.maxDailyLossAllowed;

    // Save breach details
    this.saveBreach();
  }

  private displayStatus() {
    // Clear console and display formatted status
    console.clear();
    console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('       BREAKOUT EVALUATION MONITOR - $5,000 ACCOUNT       '));
    console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════'));

    // Risk Status
    const statusColor =
      this.metrics.riskStatus === 'SAFE' ? chalk.green :
      this.metrics.riskStatus === 'WARNING' ? chalk.yellow :
      this.metrics.riskStatus === 'CRITICAL' ? chalk.magenta :
      chalk.red;

    console.log(statusColor.bold(`\nRISK STATUS: ${this.metrics.riskStatus}`));

    // Account Metrics
    console.log(chalk.white('\n📊 ACCOUNT METRICS:'));
    console.log(chalk.gray('─────────────────'));
    console.log(`Current Balance: ${this.formatMoney(this.metrics.currentBalance)}`);
    console.log(`Total P&L: ${this.formatPnL(this.metrics.totalPnL)}`);
    console.log(`Peak Balance: ${this.formatMoney(this.metrics.peakBalance)}`);

    // Risk Metrics
    console.log(chalk.white('\n⚠️  RISK METRICS:'));
    console.log(chalk.gray('─────────────────'));

    const drawdownColor = this.metrics.currentDrawdown > 200 ? chalk.red :
                          this.metrics.currentDrawdown > 150 ? chalk.yellow : chalk.green;
    console.log(`Drawdown: ${drawdownColor(`$${this.metrics.currentDrawdown.toFixed(2)} / $${this.metrics.maxDrawdownAllowed}`)}`);

    const dailyColor = this.metrics.dailyPnL < -150 ? chalk.red :
                       this.metrics.dailyPnL < -100 ? chalk.yellow : chalk.green;
    console.log(`Daily P&L: ${dailyColor(`$${this.metrics.dailyPnL.toFixed(2)} / -$${this.metrics.maxDailyLossAllowed}`)}`);

    // Progress
    console.log(chalk.white('\n🎯 EVALUATION PROGRESS:'));
    console.log(chalk.gray('─────────────────────'));

    const progressBar = this.createProgressBar(this.metrics.progressToTarget);
    console.log(`Target Progress: ${progressBar} ${this.metrics.progressToTarget.toFixed(1)}%`);
    console.log(`Profit Target: $${this.metrics.totalPnL.toFixed(2)} / $${this.metrics.profitTarget}`);
    console.log(`Win Rate: ${this.metrics.winRate.toFixed(1)}%`);
    console.log(`Trading Days: ${this.metrics.tradingDays} / 5 minimum`);
    console.log(`Days Remaining: ${this.metrics.daysRemaining} / 30`);

    // Warnings
    if (this.metrics.riskStatus !== 'SAFE') {
      console.log(chalk.yellow.bold('\n⚠️  WARNINGS:'));
      if (this.metrics.currentDrawdown > 150) {
        console.log(chalk.yellow(`• Approaching max drawdown (${(this.metrics.currentDrawdown/this.metrics.maxDrawdownAllowed*100).toFixed(1)}%)`));
      }
      if (Math.abs(this.metrics.dailyPnL) > 100) {
        console.log(chalk.yellow(`• Significant daily loss (${(Math.abs(this.metrics.dailyPnL)/this.metrics.maxDailyLossAllowed*100).toFixed(1)}%)`));
      }
    }

    console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════════════'));
  }

  private formatMoney(amount: number): string {
    const color = amount >= this.metrics.startBalance ? chalk.green : chalk.red;
    return color(`$${amount.toFixed(2)}`);
  }

  private formatPnL(amount: number): string {
    const color = amount >= 0 ? chalk.green : chalk.red;
    const symbol = amount >= 0 ? '+' : '';
    return color(`${symbol}$${amount.toFixed(2)}`);
  }

  private createProgressBar(percentage: number): string {
    const filled = Math.floor(percentage / 5);
    const empty = 20 - filled;
    const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
    return percentage >= 100 ? chalk.green(bar) : chalk.yellow(bar);
  }

  private scheduleDailyReset() {
    // Check every minute for midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        // Only reset once per day
        if (now.toDateString() !== this.lastDailyReset.toDateString()) {
          this.resetDaily();
          this.lastDailyReset = now;
        }
      }
    }, 60000);
  }

  private resetDaily() {
    console.log(chalk.blue('\n📅 New Trading Day - Resetting Daily Metrics'));
    this.metrics.dailyPnL = 0;
    this.metrics.tradingDays++;
    RISK_LIMITS.currentDayPnL = 0;
    RISK_LIMITS.dailyLossBreached = false;
  }

  private saveState() {
    const state = {
      ...this.metrics,
      startDate: this.evaluationStart,
      lastUpdate: new Date(),
      tradingDays: this.metrics.tradingDays
    };

    fs.writeFileSync(
      '/tmp/breakout-logs/evaluation-state.json',
      JSON.stringify(state, null, 2)
    );
  }

  private saveBreach() {
    const breach = {
      timestamp: new Date(),
      type: this.metrics.currentDrawdown >= this.metrics.maxDrawdownAllowed ? 'DRAWDOWN' : 'DAILY_LOSS',
      metrics: { ...this.metrics }
    };

    fs.writeFileSync(
      `/tmp/breakout-logs/breach-${Date.now()}.json`,
      JSON.stringify(breach, null, 2)
    );
  }
}

// Start the monitor
const monitor = new BreakoutEvaluationMonitor();
monitor.initialize().catch(console.error);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log(chalk.yellow('Shutting down evaluation monitor...'));
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('Shutting down evaluation monitor...'));
  process.exit(0);
});