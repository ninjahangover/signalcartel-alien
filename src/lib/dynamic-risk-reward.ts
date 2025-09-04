/**
 * Dynamic Risk-Reward Optimization
 * Fixes the current issue: avg loss (6.6¢) is 2x bigger than avg win (3.2¢)
 * Target: Make avg wins 2-3x bigger than avg losses
 */

import { PrismaClient } from '@prisma/client';

export interface RiskRewardConfig {
  // Target ratios
  targetWinLossRatio: number;        // Target: 2.5 (wins 2.5x bigger than losses)
  maxStopLossPercent: number;        // Tighter stops: 1.0% max
  baseTakeProfitPercent: number;     // Base take profit: 2.5%
  
  // Dynamic adjustments based on pair performance
  pairAdjustments: {
    highWinRate: {          // 90%+ win rate pairs (DOGEUSD)
      stopLossMultiplier: number;    // Tighter stops
      takeProfitMultiplier: number;  // Wider targets
    };
    mediumWinRate: {        // 80-89% win rate pairs
      stopLossMultiplier: number;
      takeProfitMultiplier: number;
    };
    lowWinRate: {           // 70-79% win rate pairs
      stopLossMultiplier: number;
      takeProfitMultiplier: number;
    };
  };
  
  // Confidence-based adjustments
  confidenceAdjustments: {
    high: {                 // 88%+ confidence
      takeProfitMultiplier: number;
    };
    medium: {               // 70-87% confidence
      takeProfitMultiplier: number;
    };
    low: {                  // 50-69% confidence
      takeProfitMultiplier: number;
    };
  };
}

export interface RiskRewardResult {
  stopLossPrice: number;
  takeProfitPrice: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  expectedWinAmount: number;
  expectedLossAmount: number;
  winLossRatio: number;
  reasoning: string[];
  riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
}

export interface PairRiskMetrics {
  symbol: string;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  currentRatio: number;
  volatility: number;
  recommendedAdjustment: string;
}

export class DynamicRiskReward {
  private config: RiskRewardConfig;
  private pairMetrics = new Map<string, PairRiskMetrics>();

  constructor(
    private prisma: PrismaClient,
    config?: Partial<RiskRewardConfig>
  ) {
    this.config = {
      targetWinLossRatio: 2.5,    // Wins should be 2.5x bigger than losses
      maxStopLossPercent: 1.0,    // Max 1% stop loss (tighter than current)
      baseTakeProfitPercent: 2.5, // Base 2.5% take profit
      
      pairAdjustments: {
        highWinRate: {              // 90%+ win rate (DOGEUSD: 100% win rate)
          stopLossMultiplier: 0.7,  // 30% tighter stops (0.7% instead of 1%)
          takeProfitMultiplier: 1.5 // 50% wider targets (3.75% instead of 2.5%)
        },
        mediumWinRate: {            // 80-89% win rate (AVAXUSD, XRPUSD)
          stopLossMultiplier: 0.8,  // 20% tighter stops
          takeProfitMultiplier: 1.3 // 30% wider targets
        },
        lowWinRate: {               // 70-79% win rate
          stopLossMultiplier: 0.9,  // 10% tighter stops
          takeProfitMultiplier: 1.1 // 10% wider targets
        }
      },
      
      confidenceAdjustments: {
        high: {                     // 88%+ confidence
          takeProfitMultiplier: 1.4 // 40% wider targets when very confident
        },
        medium: {                   // 70-87% confidence
          takeProfitMultiplier: 1.2 // 20% wider targets
        },
        low: {                      // 50-69% confidence
          takeProfitMultiplier: 1.0 // No adjustment
        }
      },
      
      ...config
    };
  }

  /**
   * Calculate optimal stop loss and take profit levels
   */
  async calculateRiskReward(
    symbol: string,
    entryPrice: number,
    side: 'LONG' | 'SHORT',
    confidence: number,
    positionSize: number
  ): Promise<RiskRewardResult> {
    const reasoning: string[] = [];
    
    // 1. Update pair metrics
    await this.updatePairMetrics(symbol);
    const pairMetrics = this.pairMetrics.get(symbol);
    
    // 2. Base stop loss and take profit percentages
    let stopLossPercent = this.config.maxStopLossPercent;
    let takeProfitPercent = this.config.baseTakeProfitPercent;
    
    // 3. Adjust based on pair performance
    if (pairMetrics) {
      const pairAdjustment = this.getPairAdjustment(pairMetrics.winRate);
      stopLossPercent *= pairAdjustment.stopLossMultiplier;
      takeProfitPercent *= pairAdjustment.takeProfitMultiplier;
      
      reasoning.push(
        `${symbol} ${pairMetrics.winRate.toFixed(1)}% win rate → ` +
        `SL ${pairAdjustment.stopLossMultiplier}x, TP ${pairAdjustment.takeProfitMultiplier}x`
      );
    }
    
    // 4. Adjust based on confidence
    const confidenceAdjustment = this.getConfidenceAdjustment(confidence);
    takeProfitPercent *= confidenceAdjustment.takeProfitMultiplier;
    
    reasoning.push(
      `${(confidence * 100).toFixed(1)}% confidence → TP ${confidenceAdjustment.takeProfitMultiplier}x`
    );
    
    // 5. Calculate actual prices
    let stopLossPrice: number;
    let takeProfitPrice: number;
    
    if (side === 'LONG') {
      stopLossPrice = entryPrice * (1 - stopLossPercent / 100);
      takeProfitPrice = entryPrice * (1 + takeProfitPercent / 100);
    } else {
      stopLossPrice = entryPrice * (1 + stopLossPercent / 100);
      takeProfitPrice = entryPrice * (1 - takeProfitPercent / 100);
    }
    
    // 6. Calculate expected amounts
    const expectedLossAmount = positionSize * (stopLossPercent / 100);
    const expectedWinAmount = positionSize * (takeProfitPercent / 100);
    const winLossRatio = expectedWinAmount / expectedLossAmount;
    
    // 7. Validate against target ratio
    if (winLossRatio < this.config.targetWinLossRatio) {
      // Increase take profit to meet target ratio
      const adjustedTakeProfitPercent = stopLossPercent * this.config.targetWinLossRatio;
      takeProfitPercent = adjustedTakeProfitPercent;
      
      if (side === 'LONG') {
        takeProfitPrice = entryPrice * (1 + takeProfitPercent / 100);
      } else {
        takeProfitPrice = entryPrice * (1 - takeProfitPercent / 100);
      }
      
      reasoning.push(
        `Adjusted TP to ${takeProfitPercent.toFixed(2)}% to achieve ${this.config.targetWinLossRatio}x win/loss ratio`
      );
    }
    
    // 8. Determine risk level
    const riskLevel = this.assessRiskLevel(stopLossPercent, takeProfitPercent, pairMetrics);
    
    // 9. Final calculations
    const finalExpectedLoss = positionSize * (stopLossPercent / 100);
    const finalExpectedWin = positionSize * (takeProfitPercent / 100);
    const finalWinLossRatio = finalExpectedWin / finalExpectedLoss;
    
    reasoning.push(
      `Final: SL ${stopLossPercent.toFixed(2)}% (-$${finalExpectedLoss.toFixed(2)}) | ` +
      `TP ${takeProfitPercent.toFixed(2)}% (+$${finalExpectedWin.toFixed(2)}) | ` +
      `Ratio: ${finalWinLossRatio.toFixed(2)}x`
    );
    
    return {
      stopLossPrice: Math.round(stopLossPrice * 100) / 100,
      takeProfitPrice: Math.round(takeProfitPrice * 100) / 100,
      stopLossPercent: Math.round(stopLossPercent * 100) / 100,
      takeProfitPercent: Math.round(takeProfitPercent * 100) / 100,
      expectedWinAmount: Math.round(finalExpectedWin * 100) / 100,
      expectedLossAmount: Math.round(finalExpectedLoss * 100) / 100,
      winLossRatio: Math.round(finalWinLossRatio * 100) / 100,
      reasoning,
      riskLevel
    };
  }

  /**
   * Get pair-specific adjustment multipliers
   */
  private getPairAdjustment(winRate: number): { stopLossMultiplier: number; takeProfitMultiplier: number } {
    if (winRate >= 90) {
      return this.config.pairAdjustments.highWinRate;
    } else if (winRate >= 80) {
      return this.config.pairAdjustments.mediumWinRate;
    } else {
      return this.config.pairAdjustments.lowWinRate;
    }
  }

  /**
   * Get confidence-based adjustment multipliers
   */
  private getConfidenceAdjustment(confidence: number): { takeProfitMultiplier: number } {
    const confidencePercent = confidence * 100;
    
    if (confidencePercent >= 88) {
      return this.config.confidenceAdjustments.high;
    } else if (confidencePercent >= 70) {
      return this.config.confidenceAdjustments.medium;
    } else {
      return this.config.confidenceAdjustments.low;
    }
  }

  /**
   * Update pair risk metrics from database
   */
  private async updatePairMetrics(symbol: string): Promise<void> {
    try {
      const positions = await this.prisma.managedPosition.findMany({
        where: {
          symbol,
          status: 'closed',
          realizedPnL: { not: null }
        },
        select: {
          realizedPnL: true,
          entryPrice: true,
          quantity: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50 // Last 50 trades for analysis
      });

      if (positions.length < 3) {
        return; // Need at least 3 trades for meaningful metrics
      }

      const winningTrades = positions.filter(p => p.realizedPnL! > 0);
      const losingTrades = positions.filter(p => p.realizedPnL! < 0);
      
      const winRate = (winningTrades.length / positions.length) * 100;
      
      const avgWin = winningTrades.length > 0 
        ? winningTrades.reduce((sum, p) => sum + p.realizedPnL!, 0) / winningTrades.length 
        : 0;
      
      const avgLoss = losingTrades.length > 0 
        ? Math.abs(losingTrades.reduce((sum, p) => sum + p.realizedPnL!, 0) / losingTrades.length)
        : 0;

      const currentRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
      
      // Calculate volatility based on P&L variance
      const allPnL = positions.map(p => p.realizedPnL!);
      const avgPnL = allPnL.reduce((sum, pnl) => sum + pnl, 0) / allPnL.length;
      const variance = allPnL.reduce((sum, pnl) => sum + Math.pow(pnl - avgPnL, 2), 0) / allPnL.length;
      const volatility = Math.sqrt(variance);
      
      // Recommendation based on current performance
      let recommendedAdjustment = 'MAINTAIN';
      if (currentRatio < 1.5) {
        recommendedAdjustment = 'WIDEN_TP'; // Widen take profits
      } else if (currentRatio > 3.0) {
        recommendedAdjustment = 'TIGHTEN_SL'; // Can afford tighter stops
      }

      this.pairMetrics.set(symbol, {
        symbol,
        winRate,
        avgWin,
        avgLoss,
        currentRatio,
        volatility,
        recommendedAdjustment
      });

    } catch (error) {
      console.error(`Error updating risk metrics for ${symbol}:`, error);
    }
  }

  /**
   * Assess risk level based on parameters
   */
  private assessRiskLevel(
    stopLossPercent: number, 
    takeProfitPercent: number, 
    pairMetrics?: PairRiskMetrics
  ): 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' {
    const winRate = pairMetrics?.winRate || 75;
    const ratio = takeProfitPercent / stopLossPercent;
    
    if (stopLossPercent <= 0.5 && ratio >= 3.0 && winRate >= 85) {
      return 'CONSERVATIVE'; // Tight stops, wide profits, high win rate
    } else if (stopLossPercent <= 1.0 && ratio >= 2.0 && winRate >= 75) {
      return 'MODERATE';
    } else {
      return 'AGGRESSIVE';
    }
  }

  /**
   * Get system-wide risk-reward analysis
   */
  async getSystemRiskRewardAnalysis(): Promise<{
    currentAvgWin: number;
    currentAvgLoss: number;
    currentRatio: number;
    targetRatio: number;
    improvementNeeded: number;
    topUnderperformers: PairRiskMetrics[];
    recommendations: string[];
  }> {
    // Get overall system performance
    const allPositions = await this.prisma.managedPosition.findMany({
      where: {
        status: 'closed',
        realizedPnL: { not: null }
      },
      select: {
        realizedPnL: true,
        symbol: true
      }
    });

    const winningTrades = allPositions.filter(p => p.realizedPnL! > 0);
    const losingTrades = allPositions.filter(p => p.realizedPnL! < 0);
    
    const currentAvgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, p) => sum + p.realizedPnL!, 0) / winningTrades.length 
      : 0;
    
    const currentAvgLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, p) => sum + p.realizedPnL!, 0) / losingTrades.length)
      : 0;

    const currentRatio = currentAvgLoss > 0 ? currentAvgWin / currentAvgLoss : 0;
    const improvementNeeded = this.config.targetWinLossRatio / currentRatio;

    // Update all pair metrics
    const uniqueSymbols = [...new Set(allPositions.map(p => p.symbol))];
    for (const symbol of uniqueSymbols) {
      await this.updatePairMetrics(symbol);
    }

    // Find underperformers
    const topUnderperformers = Array.from(this.pairMetrics.values())
      .filter(p => p.currentRatio < this.config.targetWinLossRatio)
      .sort((a, b) => a.currentRatio - b.currentRatio)
      .slice(0, 5);

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (currentRatio < this.config.targetWinLossRatio) {
      recommendations.push(`CRITICAL: Current win/loss ratio ${currentRatio.toFixed(2)}x is below target ${this.config.targetWinLossRatio}x`);
      recommendations.push(`Increase take profit targets by ${((improvementNeeded - 1) * 100).toFixed(0)}%`);
    }

    if (topUnderperformers.length > 0) {
      recommendations.push(`Focus on improving: ${topUnderperformers.map(p => p.symbol).join(', ')}`);
    }

    recommendations.push(`Target: $${(currentAvgLoss * this.config.targetWinLossRatio).toFixed(3)} avg wins (vs current $${currentAvgWin.toFixed(3)})`);

    return {
      currentAvgWin,
      currentAvgLoss,
      currentRatio,
      targetRatio: this.config.targetWinLossRatio,
      improvementNeeded,
      topUnderperformers,
      recommendations
    };
  }

  /**
   * Optimize configuration based on performance data
   */
  async optimizeConfiguration(): Promise<void> {
    const analysis = await this.getSystemRiskRewardAnalysis();
    
    // If we're consistently underperforming on risk-reward, adjust base settings
    if (analysis.currentRatio < this.config.targetWinLossRatio * 0.8) {
      // Increase base take profit
      this.config.baseTakeProfitPercent *= 1.2;
      // Decrease max stop loss
      this.config.maxStopLossPercent *= 0.9;
      
      console.log(`📈 Risk-Reward Optimization: Increased TP to ${this.config.baseTakeProfitPercent.toFixed(2)}%, decreased SL to ${this.config.maxStopLossPercent.toFixed(2)}%`);
    }
  }
}