/**
 * Breakout Position Scaler
 * Calculates equivalent position sizes for $5,000 Breakout evaluation
 * Based on current system performance
 */

import chalk from 'chalk';

interface PositionScaling {
  currentAccountSize: number;
  breakoutAccountSize: number;
  currentPosition: number;
  breakoutEquivalent: number;
  scalingRatio: number;
  riskPercentage: number;
}

interface BreakoutTradeAnalysis {
  symbol: string;
  currentPrice: number;
  suggestedPositionUSD: number;
  suggestedQuantity: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  expectedProfit: number;
  riskRewardRatio: number;
}

export class BreakoutPositionScaler {
  private currentAccountSize: number;
  private breakoutAccountSize: number = 5000;
  private scalingRatio: number;

  // Breakout evaluation limits
  private dailyLossLimit: number = 200;  // 4% of $5,000
  private maxDrawdown: number = 300;     // 6% of $5,000
  private maxPositionPercent: number = 0.02; // 2% max per position

  constructor(currentAccountSize: number) {
    this.currentAccountSize = currentAccountSize;
    this.scalingRatio = this.breakoutAccountSize / currentAccountSize;

    console.log(chalk.cyan('📊 Breakout Position Scaler Initialized'));
    console.log(chalk.dim(`Current Account: $${currentAccountSize.toLocaleString()}`));
    console.log(chalk.dim(`Breakout Target: $${this.breakoutAccountSize.toLocaleString()}`));
    console.log(chalk.dim(`Scaling Ratio: ${this.scalingRatio.toFixed(4)}`));
  }

  /**
   * Calculate Breakout equivalent position size
   */
  calculateBreakoutPosition(currentPositionUSD: number): PositionScaling {
    const breakoutEquivalent = currentPositionUSD * this.scalingRatio;
    const riskPercentage = (currentPositionUSD / this.currentAccountSize) * 100;

    return {
      currentAccountSize: this.currentAccountSize,
      breakoutAccountSize: this.breakoutAccountSize,
      currentPosition: currentPositionUSD,
      breakoutEquivalent,
      scalingRatio: this.scalingRatio,
      riskPercentage
    };
  }

  /**
   * Analyze if current trade is suitable for Breakout evaluation
   */
  analyzeTradeForBreakout(
    symbol: string,
    currentPositionUSD: number,
    currentPrice: number,
    stopLossPrice: number,
    takeProfitPrice: number
  ): BreakoutTradeAnalysis {

    const scaling = this.calculateBreakoutPosition(currentPositionUSD);
    const breakoutPositionUSD = scaling.breakoutEquivalent;

    // Calculate quantity for Breakout
    const suggestedQuantity = breakoutPositionUSD / currentPrice;

    // Calculate risk and profit
    const stopLossDistance = Math.abs(currentPrice - stopLossPrice);
    const takeProfitDistance = Math.abs(takeProfitPrice - currentPrice);

    const riskAmount = (stopLossDistance / currentPrice) * breakoutPositionUSD;
    const expectedProfit = (takeProfitDistance / currentPrice) * breakoutPositionUSD;
    const riskRewardRatio = expectedProfit / riskAmount;

    return {
      symbol,
      currentPrice,
      suggestedPositionUSD: breakoutPositionUSD,
      suggestedQuantity,
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      riskAmount,
      expectedProfit,
      riskRewardRatio
    };
  }

  /**
   * Check if trade meets Breakout requirements
   */
  validateBreakoutTrade(analysis: BreakoutTradeAnalysis): {
    isValid: boolean;
    reasons: string[];
    warnings: string[];
  } {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let isValid = true;

    // Check position size
    const positionPercent = (analysis.suggestedPositionUSD / this.breakoutAccountSize) * 100;
    if (positionPercent > this.maxPositionPercent * 100) {
      isValid = false;
      reasons.push(`Position too large: ${positionPercent.toFixed(1)}% (max 2%)`);
    }

    // Check risk amount
    const riskPercent = (analysis.riskAmount / this.breakoutAccountSize) * 100;
    if (riskPercent > 1.0) {
      isValid = false;
      reasons.push(`Risk too high: ${riskPercent.toFixed(1)}% (max 1%)`);
    }

    // Check risk/reward ratio
    if (analysis.riskRewardRatio < 1.5) {
      warnings.push(`Low R:R ratio: ${analysis.riskRewardRatio.toFixed(2)} (prefer >1.5)`);
    }

    // Check daily loss impact
    if (analysis.riskAmount > this.dailyLossLimit * 0.25) {
      warnings.push(`High daily risk: $${analysis.riskAmount.toFixed(2)} (25% of daily limit)`);
    }

    return { isValid, reasons, warnings };
  }

  /**
   * Display comprehensive trade analysis
   */
  displayTradeAnalysis(analysis: BreakoutTradeAnalysis): void {
    const validation = this.validateBreakoutTrade(analysis);

    console.log(chalk.cyan('\n🎯 BREAKOUT TRADE ANALYSIS'));
    console.log(chalk.white('═'.repeat(50)));

    console.log(chalk.white(`Symbol: ${analysis.symbol}`));
    console.log(chalk.white(`Current Price: $${analysis.currentPrice.toFixed(2)}`));
    console.log(chalk.white(`Position Size: $${analysis.suggestedPositionUSD.toFixed(2)}`));
    console.log(chalk.white(`Quantity: ${analysis.suggestedQuantity.toFixed(6)}`));
    console.log(chalk.white(`Stop Loss: $${analysis.stopLoss.toFixed(2)}`));
    console.log(chalk.white(`Take Profit: $${analysis.takeProfit.toFixed(2)}`));

    console.log(chalk.yellow(`\nRisk Analysis:`));
    console.log(chalk.white(`Risk Amount: $${analysis.riskAmount.toFixed(2)} (${((analysis.riskAmount/this.breakoutAccountSize)*100).toFixed(2)}%)`));
    console.log(chalk.white(`Expected Profit: $${analysis.expectedProfit.toFixed(2)}`));
    console.log(chalk.white(`Risk:Reward Ratio: ${analysis.riskRewardRatio.toFixed(2)}:1`));

    // Validation results
    if (validation.isValid) {
      console.log(chalk.green('\n✅ TRADE APPROVED FOR BREAKOUT'));
    } else {
      console.log(chalk.red('\n❌ TRADE REJECTED FOR BREAKOUT'));
      validation.reasons.forEach(reason => {
        console.log(chalk.red(`  • ${reason}`));
      });
    }

    // Warnings
    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  WARNINGS:'));
      validation.warnings.forEach(warning => {
        console.log(chalk.yellow(`  • ${warning}`));
      });
    }

    console.log(chalk.white('═'.repeat(50)));
  }

  /**
   * Calculate daily tracking metrics
   */
  calculateDailyMetrics(trades: BreakoutTradeAnalysis[]): {
    totalRisk: number;
    totalPotentialProfit: number;
    averageRiskReward: number;
    dailyRiskPercentage: number;
    recommendedMaxTrades: number;
  } {
    const totalRisk = trades.reduce((sum, trade) => sum + trade.riskAmount, 0);
    const totalPotentialProfit = trades.reduce((sum, trade) => sum + trade.expectedProfit, 0);
    const averageRiskReward = trades.length > 0 ?
      trades.reduce((sum, trade) => sum + trade.riskRewardRatio, 0) / trades.length : 0;

    const dailyRiskPercentage = (totalRisk / this.dailyLossLimit) * 100;
    const recommendedMaxTrades = Math.floor(this.dailyLossLimit / 50); // $50 avg risk per trade

    return {
      totalRisk,
      totalPotentialProfit,
      averageRiskReward,
      dailyRiskPercentage,
      recommendedMaxTrades
    };
  }

  /**
   * Get current account status for Breakout
   */
  getBreakoutAccountStatus(currentEquity: number, dailyPnL: number): {
    breakoutEquity: number;
    breakoutDailyPnL: number;
    dailyLossRemaining: number;
    drawdownFromPeak: number;
    canTrade: boolean;
    riskLevel: string;
  } {
    // Scale current performance to Breakout equivalent
    const breakoutEquity = currentEquity * this.scalingRatio;
    const breakoutDailyPnL = dailyPnL * this.scalingRatio;

    const dailyLossRemaining = this.dailyLossLimit + breakoutDailyPnL; // dailyPnL is negative for loss
    const drawdownFromPeak = Math.max(0, this.breakoutAccountSize - breakoutEquity);

    const canTrade = dailyLossRemaining > 0 && drawdownFromPeak < this.maxDrawdown;

    let riskLevel = 'SAFE';
    if (drawdownFromPeak > this.maxDrawdown * 0.8 || dailyLossRemaining < this.dailyLossLimit * 0.2) {
      riskLevel = 'CRITICAL';
    } else if (drawdownFromPeak > this.maxDrawdown * 0.6 || dailyLossRemaining < this.dailyLossLimit * 0.4) {
      riskLevel = 'WARNING';
    }

    return {
      breakoutEquity,
      breakoutDailyPnL,
      dailyLossRemaining,
      drawdownFromPeak,
      canTrade,
      riskLevel
    };
  }
}

// Example usage and testing
async function testBreakoutScaler() {
  console.log(chalk.cyan('🧪 Testing Breakout Position Scaler\n'));

  // Assuming current account size (adjust based on your actual account)
  const scaler = new BreakoutPositionScaler(50000); // $50k current account

  // Example trade analysis
  const tradeAnalysis = scaler.analyzeTradeForBreakout(
    'BTCUSD',
    500,    // $500 current position
    50000,  // BTC at $50,000
    48000,  // Stop loss at $48,000
    52000   // Take profit at $52,000
  );

  scaler.displayTradeAnalysis(tradeAnalysis);

  // Daily metrics example
  const dailyTrades = [tradeAnalysis];
  const dailyMetrics = scaler.calculateDailyMetrics(dailyTrades);

  console.log(chalk.cyan('\n📊 DAILY METRICS'));
  console.log(chalk.white('─'.repeat(30)));
  console.log(chalk.white(`Total Risk: $${dailyMetrics.totalRisk.toFixed(2)}`));
  console.log(chalk.white(`Total Potential: $${dailyMetrics.totalPotentialProfit.toFixed(2)}`));
  console.log(chalk.white(`Avg R:R: ${dailyMetrics.averageRiskReward.toFixed(2)}:1`));
  console.log(chalk.white(`Daily Risk: ${dailyMetrics.dailyRiskPercentage.toFixed(1)}%`));
  console.log(chalk.white(`Max Trades: ${dailyMetrics.recommendedMaxTrades}`));
}

if (require.main === module) {
  testBreakoutScaler();
}