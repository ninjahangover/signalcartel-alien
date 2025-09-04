/**
 * Enhanced Position Sizing System
 * Transforms 82.5% win rate into maximum profits through intelligent position sizing
 */

import { PrismaClient } from '@prisma/client';

export interface PositionSizingConfig {
  basePositionSize: number;
  confidenceMultipliers: {
    highConfidence: number;    // 88%+ confidence
    mediumConfidence: number;  // 70-87% confidence  
    lowConfidence: number;     // 50-69% confidence
  };
  winStreakMultipliers: {
    [streak: number]: number;
  };
  pairPerformanceMultipliers: {
    winRate90Plus: number;     // 90%+ win rate pairs
    winRate80Plus: number;     // 80-89% win rate pairs
    winRate70Plus: number;     // 70-79% win rate pairs
  };
  profitCompounding: {
    enabled: boolean;
    reinvestmentRate: number;  // % of profits to reinvest
    maxCompoundingMultiplier: number;
  };
}

export interface PairPerformanceData {
  symbol: string;
  winRate: number;
  totalPnL: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  consecutiveWins: number;
  lastTrades: number[]; // Recent P&L values
}

export interface PositionSizingResult {
  finalPositionSize: number;
  baseSize: number;
  confidenceMultiplier: number;
  winStreakMultiplier: number;
  pairPerformanceMultiplier: number;
  compoundingMultiplier: number;
  reasoning: string[];
  expectedProfit: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class EnhancedPositionSizing {
  private config: PositionSizingConfig;
  private winStreakTracker = new Map<string, number>();
  private pairPerformanceCache = new Map<string, PairPerformanceData>();
  private totalProfits = 0;
  private lastCompoundingUpdate = Date.now();

  constructor(
    private prisma: PrismaClient,
    config?: Partial<PositionSizingConfig>
  ) {
    this.config = {
      basePositionSize: 350, // $350 base (current average)
      confidenceMultipliers: {
        highConfidence: 10,    // 88%+ confidence → 10x size ($3,500)
        mediumConfidence: 5,   // 70-87% confidence → 5x size ($1,750)
        lowConfidence: 2       // 50-69% confidence → 2x size ($700)
      },
      winStreakMultipliers: {
        3: 1.5,  // 1.5x size after 3 consecutive wins
        5: 2.0,  // 2x size after 5 consecutive wins  
        10: 3.0, // 3x size after 10 consecutive wins
        15: 4.0  // 4x size after 15 consecutive wins
      },
      pairPerformanceMultipliers: {
        winRate90Plus: 3.0,    // 3x size for 90%+ win rate pairs (DOGEUSD)
        winRate80Plus: 2.0,    // 2x size for 80-89% win rate pairs (AVAXUSD, XRPUSD)
        winRate70Plus: 1.5     // 1.5x size for 70-79% win rate pairs
      },
      profitCompounding: {
        enabled: true,
        reinvestmentRate: 0.15, // 15% of profits reinvested
        maxCompoundingMultiplier: 5.0
      },
      ...config
    };
  }

  /**
   * Calculate optimal position size based on all factors
   */
  async calculatePositionSize(
    symbol: string,
    confidence: number,
    currentBalance: number
  ): Promise<PositionSizingResult> {
    const reasoning: string[] = [];
    let baseSize = this.config.basePositionSize;
    
    // 1. CONFIDENCE-BASED MULTIPLIER
    const confidenceMultiplier = this.getConfidenceMultiplier(confidence);
    reasoning.push(`Confidence ${(confidence * 100).toFixed(1)}% → ${confidenceMultiplier}x multiplier`);

    // 2. WIN STREAK MULTIPLIER
    const winStreakMultiplier = await this.getWinStreakMultiplier(symbol);
    if (winStreakMultiplier > 1) {
      reasoning.push(`Win streak → ${winStreakMultiplier}x multiplier`);
    }

    // 3. PAIR PERFORMANCE MULTIPLIER
    const pairPerformanceMultiplier = await this.getPairPerformanceMultiplier(symbol);
    if (pairPerformanceMultiplier > 1) {
      const pairData = this.pairPerformanceCache.get(symbol);
      reasoning.push(`${symbol} ${pairData?.winRate.toFixed(1)}% win rate → ${pairPerformanceMultiplier}x multiplier`);
    }

    // 4. PROFIT COMPOUNDING MULTIPLIER
    const compoundingMultiplier = await this.getCompoundingMultiplier();
    if (compoundingMultiplier > 1) {
      reasoning.push(`Profit compounding → ${compoundingMultiplier.toFixed(2)}x multiplier`);
    }

    // 5. CALCULATE FINAL SIZE
    const finalPositionSize = Math.min(
      baseSize * confidenceMultiplier * winStreakMultiplier * pairPerformanceMultiplier * compoundingMultiplier,
      currentBalance * 0.15 // Max 15% of balance per trade
    );

    // 6. EXPECTED PROFIT CALCULATION
    const pairData = this.pairPerformanceCache.get(symbol);
    const expectedWinRate = pairData?.winRate || 82.5; // Default to system average
    const expectedWin = pairData?.avgWin || 0.032; // Default to system average
    const expectedLoss = Math.abs(pairData?.avgLoss || -0.066); // Default to system average
    
    const expectedProfit = (expectedWinRate / 100) * (finalPositionSize * expectedWin) - 
                          ((100 - expectedWinRate) / 100) * (finalPositionSize * expectedLoss);

    // 7. RISK LEVEL ASSESSMENT
    const riskLevel = this.assessRiskLevel(finalPositionSize, currentBalance, pairData);

    return {
      finalPositionSize: Math.round(finalPositionSize),
      baseSize,
      confidenceMultiplier,
      winStreakMultiplier,
      pairPerformanceMultiplier,
      compoundingMultiplier,
      reasoning,
      expectedProfit: Math.round(expectedProfit * 100) / 100,
      riskLevel
    };
  }

  /**
   * Get confidence-based multiplier
   */
  private getConfidenceMultiplier(confidence: number): number {
    const confidencePercent = confidence * 100;
    
    if (confidencePercent >= 88) {
      return this.config.confidenceMultipliers.highConfidence;
    } else if (confidencePercent >= 70) {
      return this.config.confidenceMultipliers.mediumConfidence;
    } else {
      return this.config.confidenceMultipliers.lowConfidence;
    }
  }

  /**
   * Get win streak multiplier for a symbol
   */
  private async getWinStreakMultiplier(symbol: string): Promise<number> {
    if (!this.winStreakTracker.has(symbol)) {
      await this.updateWinStreak(symbol);
    }

    const currentStreak = this.winStreakTracker.get(symbol) || 0;
    
    // Find the highest applicable multiplier
    let multiplier = 1.0;
    for (const [streak, mult] of Object.entries(this.config.winStreakMultipliers)) {
      if (currentStreak >= parseInt(streak) && mult > multiplier) {
        multiplier = mult;
      }
    }

    return multiplier;
  }

  /**
   * Get pair performance-based multiplier
   */
  private async getPairPerformanceMultiplier(symbol: string): Promise<number> {
    if (!this.pairPerformanceCache.has(symbol)) {
      await this.updatePairPerformance(symbol);
    }

    const pairData = this.pairPerformanceCache.get(symbol);
    if (!pairData || pairData.totalTrades < 3) {
      return 1.0; // No multiplier for new pairs
    }

    const winRate = pairData.winRate;
    
    if (winRate >= 90) {
      return this.config.pairPerformanceMultipliers.winRate90Plus;
    } else if (winRate >= 80) {
      return this.config.pairPerformanceMultipliers.winRate80Plus;
    } else if (winRate >= 70) {
      return this.config.pairPerformanceMultipliers.winRate70Plus;
    }

    return 1.0;
  }

  /**
   * Get profit compounding multiplier
   */
  private async getCompoundingMultiplier(): Promise<number> {
    if (!this.config.profitCompounding.enabled) {
      return 1.0;
    }

    // Update total profits every hour
    const now = Date.now();
    if (now - this.lastCompoundingUpdate > 60 * 60 * 1000) {
      await this.updateTotalProfits();
      this.lastCompoundingUpdate = now;
    }

    if (this.totalProfits <= 0) {
      return 1.0;
    }

    // Calculate compounding based on reinvestment rate
    const compoundingBonus = 1 + (this.totalProfits * this.config.profitCompounding.reinvestmentRate / 100);
    
    return Math.min(compoundingBonus, this.config.profitCompounding.maxCompoundingMultiplier);
  }

  /**
   * Update win streak for a symbol
   */
  private async updateWinStreak(symbol: string): Promise<void> {
    try {
      const recentTrades = await this.prisma.managedPosition.findMany({
        where: {
          symbol,
          status: 'closed',
          realizedPnL: { not: null }
        },
        select: {
          realizedPnL: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20 // Look at last 20 trades
      });

      let winStreak = 0;
      for (const trade of recentTrades) {
        if (trade.realizedPnL! > 0) {
          winStreak++;
        } else {
          break; // Stop at first loss
        }
      }

      this.winStreakTracker.set(symbol, winStreak);
    } catch (error) {
      console.error(`Error updating win streak for ${symbol}:`, error);
      this.winStreakTracker.set(symbol, 0);
    }
  }

  /**
   * Update pair performance data
   */
  private async updatePairPerformance(symbol: string): Promise<void> {
    try {
      const positions = await this.prisma.managedPosition.findMany({
        where: {
          symbol,
          status: 'closed',
          realizedPnL: { not: null }
        },
        select: {
          realizedPnL: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (positions.length === 0) {
        return;
      }

      const totalTrades = positions.length;
      const winningTrades = positions.filter(p => p.realizedPnL! > 0);
      const losingTrades = positions.filter(p => p.realizedPnL! < 0);
      
      const winRate = (winningTrades.length / totalTrades) * 100;
      const totalPnL = positions.reduce((sum, p) => sum + (p.realizedPnL || 0), 0);
      
      const avgWin = winningTrades.length > 0 
        ? winningTrades.reduce((sum, p) => sum + p.realizedPnL!, 0) / winningTrades.length 
        : 0;
      
      const avgLoss = losingTrades.length > 0 
        ? losingTrades.reduce((sum, p) => sum + p.realizedPnL!, 0) / losingTrades.length 
        : 0;

      // Calculate current consecutive wins
      let consecutiveWins = 0;
      for (const position of positions) {
        if (position.realizedPnL! > 0) {
          consecutiveWins++;
        } else {
          break;
        }
      }

      this.pairPerformanceCache.set(symbol, {
        symbol,
        winRate,
        totalPnL,
        totalTrades,
        avgWin,
        avgLoss,
        consecutiveWins,
        lastTrades: positions.slice(0, 10).map(p => p.realizedPnL!).reverse()
      });

    } catch (error) {
      console.error(`Error updating pair performance for ${symbol}:`, error);
    }
  }

  /**
   * Update total profits for compounding
   */
  private async updateTotalProfits(): Promise<void> {
    try {
      const totalPnLResult = await this.prisma.managedPosition.aggregate({
        where: {
          status: 'closed',
          realizedPnL: { not: null }
        },
        _sum: {
          realizedPnL: true
        }
      });

      this.totalProfits = totalPnLResult._sum.realizedPnL || 0;
    } catch (error) {
      console.error('Error updating total profits:', error);
      this.totalProfits = 0;
    }
  }

  /**
   * Assess risk level
   */
  private assessRiskLevel(
    positionSize: number, 
    balance: number, 
    pairData?: PairPerformanceData
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    const balanceRatio = positionSize / balance;
    const winRate = pairData?.winRate || 82.5;

    if (balanceRatio > 0.1 || winRate < 70) {
      return 'HIGH';
    } else if (balanceRatio > 0.05 || winRate < 80) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  /**
   * Record trade result for adaptive learning
   */
  async recordTradeResult(symbol: string, pnl: number): Promise<void> {
    // Update win streak
    const currentStreak = this.winStreakTracker.get(symbol) || 0;
    if (pnl > 0) {
      this.winStreakTracker.set(symbol, currentStreak + 1);
    } else {
      this.winStreakTracker.set(symbol, 0); // Reset streak on loss
    }

    // Update pair performance cache
    await this.updatePairPerformance(symbol);
    
    // Update total profits for compounding
    this.totalProfits += pnl;
  }

  /**
   * Get performance summary for monitoring
   */
  async getPerformanceSummary(): Promise<{
    totalProfits: number;
    topPerformingPairs: Array<{ symbol: string; winRate: number; totalPnL: number }>;
    winStreaks: Array<{ symbol: string; streak: number }>;
  }> {
    await this.updateTotalProfits();
    
    const topPairs = Array.from(this.pairPerformanceCache.values())
      .filter(p => p.totalTrades >= 3)
      .sort((a, b) => b.totalPnL - a.totalPnL)
      .slice(0, 5)
      .map(p => ({
        symbol: p.symbol,
        winRate: p.winRate,
        totalPnL: p.totalPnL
      }));

    const winStreaks = Array.from(this.winStreakTracker.entries())
      .filter(([_, streak]) => streak > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symbol, streak]) => ({ symbol, streak }));

    return {
      totalProfits: this.totalProfits,
      topPerformingPairs: topPairs,
      winStreaks
    };
  }

  /**
   * Optimize configuration based on performance
   */
  async optimizeConfiguration(): Promise<void> {
    const summary = await this.getPerformanceSummary();
    
    // If total profits are high, we can be more aggressive
    if (summary.totalProfits > 50) {
      this.config.basePositionSize = Math.min(500, this.config.basePositionSize * 1.1);
      console.log(`📈 Optimizing: Increased base position size to $${this.config.basePositionSize}`);
    }
    
    // If we have consistent high performers, boost their multipliers
    const highPerformers = summary.topPerformingPairs.filter(p => p.winRate > 95);
    if (highPerformers.length > 0) {
      this.config.pairPerformanceMultipliers.winRate90Plus = Math.min(4.0, this.config.pairPerformanceMultipliers.winRate90Plus * 1.1);
      console.log(`🚀 Optimizing: Boosted 90%+ win rate multiplier to ${this.config.pairPerformanceMultipliers.winRate90Plus}x`);
    }
  }
}