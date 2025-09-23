import { PrismaClient } from '@prisma/client';
import { BREAKOUT_CONFIG, RISK_LIMITS } from './breakout-config';
import { tradingAssistant } from './src/lib/manual-trading-assistant';
import chalk from 'chalk';

const prisma = new PrismaClient();

class BreakoutEvaluationTrader {
  private accountBalance: number = BREAKOUT_CONFIG.ACCOUNT_SIZE;
  private dailyPnL: number = 0;
  private totalPnL: number = 0;
  private peakBalance: number = BREAKOUT_CONFIG.ACCOUNT_SIZE;
  private tradingDays: Set<string> = new Set();
  private evaluationStartDate: Date = new Date();
  private isActive: boolean = true;

  constructor() {
    console.log(chalk.cyan('🎯 Breakout Evaluation System Initialized'));
    console.log(chalk.yellow(`Account: $${BREAKOUT_CONFIG.ACCOUNT_SIZE}`));
    console.log(chalk.green(`Target: $${BREAKOUT_CONFIG.PROFIT_TARGET} (${(BREAKOUT_CONFIG.PROFIT_TARGET/BREAKOUT_CONFIG.ACCOUNT_SIZE*100).toFixed(1)}%)`));
    console.log(chalk.red(`Max Daily Loss: $${BREAKOUT_CONFIG.MAX_DAILY_LOSS}`));
    console.log(chalk.red(`Max Drawdown: $${BREAKOUT_CONFIG.MAX_DRAWDOWN}`));
  }

  async initialize() {
    // Load any existing evaluation progress
    await this.loadEvaluationState();

    // Start monitoring
    this.startRiskMonitoring();

    // Start signal generation for manual trading
    await this.startSignalGeneration();
  }

  private startRiskMonitoring() {
    // Check risk limits every minute
    setInterval(() => {
      this.checkRiskLimits();
    }, 60000);

    // Reset daily P&L at midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        console.log(chalk.blue('📅 New trading day - resetting daily P&L'));
        this.dailyPnL = 0;
        RISK_LIMITS.currentDayPnL = 0;
        RISK_LIMITS.dailyLossBreached = false;
      }
    }, 60000);
  }

  private checkRiskLimits() {
    // Check daily loss
    if (this.dailyPnL <= -BREAKOUT_CONFIG.MAX_DAILY_LOSS) {
      console.log(chalk.red('⚠️ DAILY LOSS LIMIT BREACHED!'));
      RISK_LIMITS.dailyLossBreached = true;
      this.emergencyStop('Daily loss limit breached');
    }

    // Check total drawdown
    const currentDrawdown = this.peakBalance - this.accountBalance;
    if (currentDrawdown >= BREAKOUT_CONFIG.MAX_DRAWDOWN) {
      console.log(chalk.red('🛑 MAX DRAWDOWN BREACHED!'));
      RISK_LIMITS.drawdownBreached = true;
      this.emergencyStop('Maximum drawdown breached');
    }

    // Check profit target
    if (this.totalPnL >= BREAKOUT_CONFIG.PROFIT_TARGET) {
      console.log(chalk.green('🎯 PROFIT TARGET ACHIEVED!'));
      this.evaluationPassed();
    }

    // Update peak balance
    if (this.accountBalance > this.peakBalance) {
      this.peakBalance = this.accountBalance;
    }
  }

  private async loadEvaluationState() {
    try {
      // Load positions and calculate current state
      const positions = await prisma.position.findMany({
        where: {
          status: { in: ['OPEN', 'PARTIAL'] }
        }
      });

      // Calculate current P&L
      let openPnL = 0;
      for (const position of positions) {
        openPnL += parseFloat(position.unrealizedPnL?.toString() || '0');
      }

      this.accountBalance = BREAKOUT_CONFIG.ACCOUNT_SIZE + this.totalPnL + openPnL;
      console.log(chalk.cyan(`Current Balance: $${this.accountBalance.toFixed(2)}`));
      console.log(chalk.cyan(`Open P&L: $${openPnL.toFixed(2)}`));
    } catch (error) {
      console.error('Error loading evaluation state:', error);
    }
  }

  private async startSignalGeneration() {
    console.log(chalk.green('🚀 Starting Breakout signal generation...'));
    console.log(chalk.yellow('💡 Manual trading mode - Execute signals manually on Breakout platform'));

    // Start the trading assistant signal generation
    await tradingAssistant.startSignalGeneration();

    // Display instructions
    setInterval(() => {
      this.displayTradingInstructions();
    }, 300000); // Every 5 minutes
  }

  private displayTradingInstructions() {
    console.log(chalk.cyan('\n📋 MANUAL TRADING INSTRUCTIONS'));
    console.log(chalk.white('═'.repeat(50)));
    console.log(chalk.white('1. Watch for signals above (🚨 NEW TRADING SIGNAL 🚨)'));
    console.log(chalk.white('2. Log into your Breakout platform: portal.breakoutprop.com'));
    console.log(chalk.white('3. Execute the recommended trades manually'));
    console.log(chalk.white('4. Use suggested position sizes and stop losses'));
    console.log(chalk.white('5. Monitor your account equity vs our dashboard'));
    console.log(chalk.yellow('⚠️  CRITICAL: Stay within $200 daily loss / $300 max drawdown'));
    console.log(chalk.white('═'.repeat(50)));
  }

  // Method to record manual trades for tracking
  async recordManualTrade(
    symbol: string,
    side: 'BUY' | 'SELL',
    size: number,
    price: number
  ) {
    try {
      await tradingAssistant.recordTrade(symbol, side, size, price);
      console.log(chalk.green(`✅ Manual trade recorded for tracking`));
    } catch (error) {
      console.error('Error recording trade:', error);
    }
  }

  private emergencyStop(reason: string) {
    console.log(chalk.red(`🛑 EMERGENCY STOP: ${reason}`));
    this.isActive = false;
    RISK_LIMITS.emergencyStop = true;

    // Close all positions
    this.closeAllPositions();

    // Save evaluation state
    this.saveEvaluationState('FAILED', reason);
  }

  private evaluationPassed() {
    console.log(chalk.green('✅ EVALUATION PASSED!'));
    console.log(chalk.green(`Final Balance: $${this.accountBalance.toFixed(2)}`));
    console.log(chalk.green(`Total Profit: $${this.totalPnL.toFixed(2)}`));
    console.log(chalk.green(`Trading Days: ${this.tradingDays.size}`));

    this.isActive = false;
    this.saveEvaluationState('PASSED', 'Profit target achieved');
  }

  private async closeAllPositions() {
    try {
      const positions = await prisma.position.findMany({
        where: { status: 'OPEN' }
      });

      for (const position of positions) {
        console.log(chalk.yellow(`Closing position: ${position.symbol}`));
        // Close position logic here
      }
    } catch (error) {
      console.error('Error closing positions:', error);
    }
  }

  private async saveEvaluationState(status: string, reason: string) {
    const state = {
      status,
      reason,
      finalBalance: this.accountBalance,
      totalPnL: this.totalPnL,
      tradingDays: this.tradingDays.size,
      duration: Math.floor((Date.now() - this.evaluationStartDate.getTime()) / (1000 * 60 * 60 * 24)),
      timestamp: new Date()
    };

    console.log(chalk.cyan('Evaluation Summary:'), state);

    // Save to database or file
    // Implementation here
  }

  async updatePnL(pnl: number) {
    this.dailyPnL += pnl;
    this.totalPnL += pnl;
    this.accountBalance += pnl;

    RISK_LIMITS.currentDayPnL = this.dailyPnL;

    console.log(chalk.cyan(`P&L Update: $${pnl.toFixed(2)}`));
    console.log(chalk.dim(`Daily: $${this.dailyPnL.toFixed(2)} | Total: $${this.totalPnL.toFixed(2)}`));

    this.checkRiskLimits();
  }
}

// Start the evaluation trader
const trader = new BreakoutEvaluationTrader();
trader.initialize().catch(console.error);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log(chalk.yellow('Shutting down Breakout trader...'));
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('Shutting down Breakout trader...'));
  process.exit(0);
});