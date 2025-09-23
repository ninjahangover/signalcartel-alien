/**
 * Breakout Prop Firm Drawdown Calculator
 * Implements exact drawdown rules per Breakout's evaluation requirements
 */

import { PrismaClient } from '@prisma/client';
import { BREAKOUT_CONFIG } from '../../breakout-config';
import chalk from 'chalk';

// Initialize Prisma with breakout_eval schema
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

export interface DrawdownStatus {
  // Account Info
  startingBalance: number;
  currentBalance: number;
  currentEquity: number;  // Balance + floating P&L

  // Daily Loss (resets at 00:30 UTC)
  dailyStartBalance: number;  // Balance at 00:30 UTC
  dailyLossLimit: number;     // 4% of dailyStartBalance
  dailyLossThreshold: number;  // dailyStartBalance - dailyLossLimit
  currentDailyPnL: number;
  dailyLossRemaining: number;
  isDailyLossBreached: boolean;

  // Maximum Drawdown (Static for 1-Step)
  maxDrawdownLimit: number;    // 6% of starting balance
  maxDrawdownThreshold: number; // startingBalance - maxDrawdownLimit
  currentDrawdown: number;
  maxDrawdownRemaining: number;
  isMaxDrawdownBreached: boolean;

  // Status
  canTrade: boolean;
  breachType: 'NONE' | 'DAILY_LOSS' | 'MAX_DRAWDOWN' | 'BOTH';
  lastResetTime: Date;
  nextResetTime: Date;
}

export class BreakoutDrawdownCalculator {
  private startingBalance: number;
  private dailyStartBalance: number;
  private lastResetTime: Date;

  constructor() {
    this.startingBalance = BREAKOUT_CONFIG.ACCOUNT_SIZE;
    this.dailyStartBalance = BREAKOUT_CONFIG.ACCOUNT_SIZE;
    this.lastResetTime = this.getLastResetTime();
  }

  /**
   * Calculate current drawdown status based on EQUITY (not balance)
   * Equity = Balance + Floating P&L of open positions
   */
  async calculateDrawdownStatus(): Promise<DrawdownStatus> {
    // Get current balance and open positions
    const { balance, floatingPnL } = await this.getCurrentEquity();
    const currentEquity = balance + floatingPnL;

    // Check if we need to reset daily limits (00:30 UTC)
    this.checkDailyReset(balance);

    // Calculate daily loss
    const dailyLossLimit = this.dailyStartBalance * 0.04;  // 4% of balance at reset
    const dailyLossThreshold = this.dailyStartBalance - dailyLossLimit;
    const currentDailyPnL = currentEquity - this.dailyStartBalance;
    const dailyLossRemaining = currentEquity - dailyLossThreshold;
    const isDailyLossBreached = currentEquity <= dailyLossThreshold;

    // Calculate max drawdown (STATIC for 1-Step)
    const maxDrawdownLimit = this.startingBalance * 0.06;  // 6% of starting balance
    const maxDrawdownThreshold = this.startingBalance - maxDrawdownLimit;
    const currentDrawdown = this.startingBalance - currentEquity;
    const maxDrawdownRemaining = currentEquity - maxDrawdownThreshold;
    const isMaxDrawdownBreached = currentEquity <= maxDrawdownThreshold;

    // Determine breach type
    let breachType: DrawdownStatus['breachType'] = 'NONE';
    if (isDailyLossBreached && isMaxDrawdownBreached) {
      breachType = 'BOTH';
    } else if (isDailyLossBreached) {
      breachType = 'DAILY_LOSS';
    } else if (isMaxDrawdownBreached) {
      breachType = 'MAX_DRAWDOWN';
    }

    const status: DrawdownStatus = {
      // Account Info
      startingBalance: this.startingBalance,
      currentBalance: balance,
      currentEquity,

      // Daily Loss
      dailyStartBalance: this.dailyStartBalance,
      dailyLossLimit,
      dailyLossThreshold,
      currentDailyPnL,
      dailyLossRemaining,
      isDailyLossBreached,

      // Max Drawdown
      maxDrawdownLimit,
      maxDrawdownThreshold,
      currentDrawdown,
      maxDrawdownRemaining,
      isMaxDrawdownBreached,

      // Status
      canTrade: !isDailyLossBreached && !isMaxDrawdownBreached,
      breachType,
      lastResetTime: this.lastResetTime,
      nextResetTime: this.getNextResetTime()
    };

    // Log critical warnings
    if (breachType !== 'NONE') {
      this.logBreach(status);
    } else if (dailyLossRemaining < 50 || maxDrawdownRemaining < 50) {
      this.logWarning(status);
    }

    return status;
  }

  /**
   * Get current account equity (balance + floating P&L)
   */
  private async getCurrentEquity(): Promise<{ balance: number; floatingPnL: number }> {
    try {
      // Get all closed positions to calculate balance
      const closedPositions = await prisma.position.findMany({
        where: { status: 'CLOSED' },
        select: { realizedPnL: true }
      });

      let totalRealizedPnL = 0;
      for (const pos of closedPositions) {
        totalRealizedPnL += parseFloat(pos.realizedPnL?.toString() || '0');
      }

      const balance = this.startingBalance + totalRealizedPnL;

      // Get open positions for floating P&L
      const openPositions = await prisma.position.findMany({
        where: { status: 'OPEN' },
        select: { unrealizedPnL: true }
      });

      let floatingPnL = 0;
      for (const pos of openPositions) {
        floatingPnL += parseFloat(pos.unrealizedPnL?.toString() || '0');
      }

      return { balance, floatingPnL };

    } catch (error) {
      console.error('Error calculating equity:', error);
      return { balance: this.startingBalance, floatingPnL: 0 };
    }
  }

  /**
   * Check if daily reset is needed (00:30 UTC)
   */
  private checkDailyReset(currentBalance: number) {
    const now = new Date();
    const resetTime = this.getLastResetTime();

    // Check if we've passed a reset time
    if (now > this.getNextResetTime() && now.getTime() - this.lastResetTime.getTime() > 86400000) {
      console.log(chalk.blue('📅 Daily loss limit reset at 00:30 UTC'));
      this.dailyStartBalance = currentBalance;
      this.lastResetTime = resetTime;
    }
  }

  /**
   * Get the last reset time (00:30 UTC)
   */
  private getLastResetTime(): Date {
    const now = new Date();
    const reset = new Date(now);
    reset.setUTCHours(0, 30, 0, 0);

    // If we're past today's reset, use today's
    if (now >= reset) {
      return reset;
    }

    // Otherwise use yesterday's
    reset.setDate(reset.getDate() - 1);
    return reset;
  }

  /**
   * Get the next reset time (00:30 UTC)
   */
  private getNextResetTime(): Date {
    const next = new Date(this.lastResetTime);
    next.setDate(next.getDate() + 1);
    return next;
  }

  /**
   * Log breach event
   */
  private logBreach(status: DrawdownStatus) {
    console.log(chalk.red.bold('\n═══════════════════════════════════════'));
    console.log(chalk.red.bold('🚨 EVALUATION BREACH - ACCOUNT FAILED 🚨'));
    console.log(chalk.red.bold('═══════════════════════════════════════'));

    if (status.isDailyLossBreached) {
      console.log(chalk.red(`Daily Loss Breached: Equity $${status.currentEquity.toFixed(2)} <= Limit $${status.dailyLossThreshold.toFixed(2)}`));
    }

    if (status.isMaxDrawdownBreached) {
      console.log(chalk.red(`Max Drawdown Breached: Equity $${status.currentEquity.toFixed(2)} <= Limit $${status.maxDrawdownThreshold.toFixed(2)}`));
    }

    console.log(chalk.red.bold('═══════════════════════════════════════\n'));
  }

  /**
   * Log warning when approaching limits
   */
  private logWarning(status: DrawdownStatus) {
    if (status.dailyLossRemaining < 50) {
      console.log(chalk.yellow(`⚠️  WARNING: Only $${status.dailyLossRemaining.toFixed(2)} until daily loss limit!`));
    }

    if (status.maxDrawdownRemaining < 50) {
      console.log(chalk.yellow(`⚠️  WARNING: Only $${status.maxDrawdownRemaining.toFixed(2)} until max drawdown!`));
    }
  }

  /**
   * Format status for display
   */
  formatStatus(status: DrawdownStatus): string {
    const lines = [
      chalk.cyan('BREAKOUT DRAWDOWN STATUS'),
      chalk.gray('─'.repeat(40)),
      '',
      chalk.white('EQUITY: ') + this.formatMoney(status.currentEquity),
      chalk.white('Balance: ') + this.formatMoney(status.currentBalance),
      chalk.white('Floating P&L: ') + this.formatPnL(status.currentEquity - status.currentBalance),
      '',
      chalk.yellow('DAILY LOSS (Resets 00:30 UTC):'),
      `  Limit: -$${status.dailyLossLimit.toFixed(2)} from $${status.dailyStartBalance.toFixed(2)}`,
      `  Current: ${this.formatPnL(status.currentDailyPnL)}`,
      `  Remaining: ${this.formatRisk(status.dailyLossRemaining)}`,
      `  Next Reset: ${status.nextResetTime.toUTCString()}`,
      '',
      chalk.yellow('MAX DRAWDOWN (Static):'),
      `  Limit: -$${status.maxDrawdownLimit.toFixed(2)} from $${status.startingBalance.toFixed(2)}`,
      `  Current: -$${status.currentDrawdown.toFixed(2)}`,
      `  Remaining: ${this.formatRisk(status.maxDrawdownRemaining)}`,
      '',
      status.canTrade ? chalk.green('✅ TRADING ALLOWED') : chalk.red('🚫 TRADING SUSPENDED')
    ];

    return lines.join('\n');
  }

  private formatMoney(amount: number): string {
    return amount >= this.startingBalance ?
      chalk.green(`$${amount.toFixed(2)}`) :
      chalk.red(`$${amount.toFixed(2)}`);
  }

  private formatPnL(amount: number): string {
    const color = amount >= 0 ? chalk.green : chalk.red;
    const symbol = amount >= 0 ? '+' : '';
    return color(`${symbol}$${amount.toFixed(2)}`);
  }

  private formatRisk(amount: number): string {
    if (amount < 0) return chalk.red.bold('BREACHED');
    if (amount < 50) return chalk.red(`$${amount.toFixed(2)}`);
    if (amount < 100) return chalk.yellow(`$${amount.toFixed(2)}`);
    return chalk.green(`$${amount.toFixed(2)}`);
  }
}

// Export singleton instance
export const drawdownCalculator = new BreakoutDrawdownCalculator();