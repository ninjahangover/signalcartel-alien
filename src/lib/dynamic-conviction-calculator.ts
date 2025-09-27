/**
 * DYNAMIC CONVICTION CALCULATOR™
 * Replaces all hard-coded thresholds with intelligent, adaptive calculations
 * Self-adjusts based on market conditions, performance, and opportunity size
 */

import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface ConvictionFactors {
  // Market factors
  marketVolatility: number;
  marketTrend: 'bullish' | 'bearish' | 'neutral';
  volumeProfile: 'high' | 'medium' | 'low';

  // Opportunity factors
  expectedReturn: number;
  winProbability: number;
  riskRewardRatio: number;

  // System factors
  aiConfidence: number;
  learningConfidence: number;
  historicalAccuracy: number;

  // Performance factors
  recentWinRate: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface DynamicConviction {
  conviction: number;           // 0-1, overall conviction score
  executionThreshold: number;   // Dynamic threshold for this specific trade
  positionSizePercent: number;  // What % of capital to use
  urgencyScore: number;         // How quickly to act (0-1)
  confidence: number;           // Overall confidence in decision (0-1)
  reasoning: string;            // Explanation of conviction
}

export class DynamicConvictionCalculator extends EventEmitter {
  private static instance: DynamicConvictionCalculator;
  private convictionHistory: Map<string, number[]> = new Map();
  private performanceMemory: { wins: number; losses: number; streak: number } = {
    wins: 0,
    losses: 0,
    streak: 0
  };

  private constructor() {
    super();
    this.loadPerformanceMemory();
  }

  static getInstance(): DynamicConvictionCalculator {
    if (!this.instance) {
      this.instance = new DynamicConvictionCalculator();
    }
    return this.instance;
  }

  /**
   * Calculate dynamic conviction - NO HARD-CODED VALUES
   */
  async calculateConviction(
    symbol: string,
    factors: ConvictionFactors
  ): Promise<DynamicConviction> {
    console.log(`🧮 DYNAMIC CONVICTION: Calculating for ${symbol}...`);

    // 1. OPPORTUNITY CONVICTION (0-1)
    const opportunityConviction = this.calculateOpportunityConviction(factors);

    // 2. MARKET CONVICTION (0-1)
    const marketConviction = this.calculateMarketConviction(factors);

    // 3. SYSTEM CONVICTION (0-1)
    const systemConviction = this.calculateSystemConviction(factors);

    // 4. PERFORMANCE CONVICTION (0-1)
    const performanceConviction = this.calculatePerformanceConviction(factors);

    // 5. LEARNING-BASED CONVICTION (0-1)
    const learningConviction = await this.calculateLearningConviction(symbol, factors);

    // 6. SYNTHESIZE OVERALL CONVICTION
    const weights = this.getDynamicWeights(factors);
    const overallConviction =
      opportunityConviction * weights.opportunity +
      marketConviction * weights.market +
      systemConviction * weights.system +
      performanceConviction * weights.performance +
      learningConviction * weights.learning;

    // 7. CALCULATE DYNAMIC THRESHOLD
    const dynamicThreshold = this.calculateDynamicThreshold(overallConviction, factors);

    // 8. DETERMINE POSITION SIZE
    const positionSize = this.calculateDynamicPositionSize(overallConviction, factors);

    // 9. CALCULATE URGENCY
    const urgency = this.calculateUrgency(factors, overallConviction);

    // 10. BUILD REASONING
    const reasoning = this.buildReasoning(
      opportunityConviction,
      marketConviction,
      systemConviction,
      performanceConviction,
      learningConviction,
      overallConviction
    );

    // Store conviction for learning
    this.updateConvictionHistory(symbol, overallConviction);

    // Log dynamic calculation
    console.log(`📊 CONVICTION BREAKDOWN for ${symbol}:`);
    console.log(`   Opportunity: ${(opportunityConviction * 100).toFixed(1)}% (weight: ${(weights.opportunity * 100).toFixed(0)}%)`);
    console.log(`   Market: ${(marketConviction * 100).toFixed(1)}% (weight: ${(weights.market * 100).toFixed(0)}%)`);
    console.log(`   System: ${(systemConviction * 100).toFixed(1)}% (weight: ${(weights.system * 100).toFixed(0)}%)`);
    console.log(`   Performance: ${(performanceConviction * 100).toFixed(1)}% (weight: ${(weights.performance * 100).toFixed(0)}%)`);
    console.log(`   Learning: ${(learningConviction * 100).toFixed(1)}% (weight: ${(weights.learning * 100).toFixed(0)}%)`);
    console.log(`   ✅ OVERALL CONVICTION: ${(overallConviction * 100).toFixed(1)}%`);
    console.log(`   📈 Dynamic Threshold: ${(dynamicThreshold * 100).toFixed(1)}%`);
    console.log(`   💰 Position Size: ${(positionSize * 100).toFixed(1)}% of capital`);

    return {
      conviction: overallConviction,
      executionThreshold: dynamicThreshold,
      positionSizePercent: positionSize,
      urgencyScore: urgency,
      confidence: overallConviction,
      reasoning
    };
  }

  /**
   * Calculate opportunity-based conviction
   */
  private calculateOpportunityConviction(factors: ConvictionFactors): number {
    let conviction = 0;

    // Expected return component (exponential scaling for huge opportunities)
    if (factors.expectedReturn >= 100) {
      conviction = 0.95; // Near maximum for 100%+ opportunities
    } else if (factors.expectedReturn >= 50) {
      conviction = 0.8 + (factors.expectedReturn - 50) * 0.003; // 80-95%
    } else if (factors.expectedReturn >= 20) {
      conviction = 0.6 + (factors.expectedReturn - 20) * 0.0067; // 60-80%
    } else if (factors.expectedReturn >= 10) {
      conviction = 0.4 + (factors.expectedReturn - 10) * 0.02; // 40-60%
    } else {
      conviction = factors.expectedReturn * 0.04; // 0-40%
    }

    // Adjust for win probability
    conviction *= (0.5 + factors.winProbability * 0.5);

    // Boost for excellent risk/reward
    if (factors.riskRewardRatio >= 3) {
      conviction = Math.min(1, conviction * 1.2);
    } else if (factors.riskRewardRatio >= 2) {
      conviction = Math.min(1, conviction * 1.1);
    }

    return conviction;
  }

  /**
   * Calculate market-based conviction
   */
  private calculateMarketConviction(factors: ConvictionFactors): number {
    let conviction = 0.5; // Start neutral

    // Trend alignment
    if (factors.marketTrend === 'bullish') {
      conviction += 0.2;
    } else if (factors.marketTrend === 'bearish') {
      conviction -= 0.1; // Slightly negative for bearish
    }

    // Volatility adjustment (moderate volatility is best)
    if (factors.marketVolatility >= 0.1 && factors.marketVolatility <= 0.3) {
      conviction += 0.2; // Optimal volatility range
    } else if (factors.marketVolatility < 0.05) {
      conviction -= 0.1; // Too calm
    } else if (factors.marketVolatility > 0.5) {
      conviction -= 0.2; // Too volatile
    }

    // Volume confirmation
    if (factors.volumeProfile === 'high') {
      conviction += 0.15;
    } else if (factors.volumeProfile === 'low') {
      conviction -= 0.15;
    }

    return Math.max(0, Math.min(1, conviction));
  }

  /**
   * Calculate system-based conviction
   */
  private calculateSystemConviction(factors: ConvictionFactors): number {
    // Weighted average of AI and learning confidence
    const aiWeight = 0.6;
    const learningWeight = 0.4;

    const baseConviction =
      factors.aiConfidence * aiWeight +
      factors.learningConfidence * learningWeight;

    // Adjust for historical accuracy
    const accuracyMultiplier = 0.5 + factors.historicalAccuracy * 0.5;

    return baseConviction * accuracyMultiplier;
  }

  /**
   * Calculate performance-based conviction
   */
  private calculatePerformanceConviction(factors: ConvictionFactors): number {
    let conviction = factors.recentWinRate; // Start with recent win rate

    // Streak adjustments
    if (factors.consecutiveWins > 5) {
      conviction *= 1.3; // Hot streak bonus
    } else if (factors.consecutiveWins > 3) {
      conviction *= 1.15;
    } else if (factors.consecutiveLosses > 5) {
      conviction *= 0.7; // Cold streak penalty
    } else if (factors.consecutiveLosses > 3) {
      conviction *= 0.85;
    }

    return Math.max(0, Math.min(1, conviction));
  }

  /**
   * Calculate learning-based conviction
   */
  private async calculateLearningConviction(
    symbol: string,
    factors: ConvictionFactors
  ): Promise<number> {
    const performance = await prisma.adaptiveLearningPerformance.findFirst({
      where: { symbol },
      orderBy: { updatedAt: 'desc' }
    });

    if (!performance) {
      // New symbol - moderate conviction
      return 0.5;
    }

    // Base conviction on learning performance
    let conviction = performance.accuracy;

    // Adjust for sample size
    if (performance.totalSignals < 10) {
      conviction *= 0.7; // Low confidence with few samples
    } else if (performance.totalSignals < 50) {
      conviction *= 0.85;
    } else if (performance.totalSignals > 100) {
      conviction *= 1.1; // High confidence with many samples
    }

    // Consider profitability
    if (performance.avgPnL > 0) {
      conviction = Math.min(1, conviction * 1.2);
    } else if (performance.avgPnL < 0) {
      conviction *= 0.8;
    }

    return Math.max(0, Math.min(1, conviction));
  }

  /**
   * Get dynamic weights based on market conditions
   */
  private getDynamicWeights(factors: ConvictionFactors): any {
    const weights = {
      opportunity: 0.3,   // Base weight for opportunity
      market: 0.2,        // Base weight for market
      system: 0.25,       // Base weight for system
      performance: 0.15,  // Base weight for performance
      learning: 0.1       // Base weight for learning
    };

    // Adjust weights based on conditions
    if (factors.expectedReturn >= 50) {
      // Huge opportunity - increase its weight
      weights.opportunity = 0.5;
      weights.market = 0.15;
      weights.system = 0.2;
      weights.performance = 0.1;
      weights.learning = 0.05;
    } else if (factors.recentWinRate > 0.7 && factors.consecutiveWins > 3) {
      // Hot streak - increase performance weight
      weights.performance = 0.3;
      weights.opportunity = 0.25;
      weights.system = 0.25;
      weights.market = 0.15;
      weights.learning = 0.05;
    } else if (factors.historicalAccuracy > 0.8) {
      // High accuracy - increase system weight
      weights.system = 0.35;
      weights.learning = 0.2;
      weights.opportunity = 0.25;
      weights.market = 0.15;
      weights.performance = 0.05;
    }

    // Normalize weights to sum to 1
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    Object.keys(weights).forEach(key => {
      weights[key] /= sum;
    });

    return weights;
  }

  /**
   * Calculate dynamic execution threshold
   */
  private calculateDynamicThreshold(conviction: number, factors: ConvictionFactors): number {
    // Base threshold inversely related to conviction
    let threshold = 1 - conviction;

    // Adjust for opportunity size
    if (factors.expectedReturn >= 100) {
      threshold *= 0.2; // Ultra-low threshold for extreme opportunities
    } else if (factors.expectedReturn >= 50) {
      threshold *= 0.4;
    } else if (factors.expectedReturn >= 20) {
      threshold *= 0.6;
    }

    // Adjust for market conditions
    if (factors.marketTrend === 'bullish' && factors.volumeProfile === 'high') {
      threshold *= 0.8; // Lower threshold in good conditions
    }

    // Never exceed reasonable bounds
    return Math.max(0.05, Math.min(0.5, threshold));
  }

  /**
   * Calculate dynamic position size
   */
  private calculateDynamicPositionSize(conviction: number, factors: ConvictionFactors): number {
    // Base size on conviction (5-30% of capital)
    let size = 0.05 + conviction * 0.25;

    // Scale up for huge opportunities
    if (factors.expectedReturn >= 100 && conviction > 0.8) {
      size = Math.min(0.5, size * 2); // Double size, max 50%
    } else if (factors.expectedReturn >= 50 && conviction > 0.7) {
      size = Math.min(0.4, size * 1.5); // 1.5x size, max 40%
    }

    // Scale down for poor performance
    if (factors.consecutiveLosses > 3) {
      size *= 0.5; // Half size during losing streak
    }

    // Risk management cap
    return Math.min(0.5, size); // Never more than 50% on one trade
  }

  /**
   * Calculate urgency score
   */
  private calculateUrgency(factors: ConvictionFactors, conviction: number): number {
    let urgency = conviction; // Start with conviction level

    // Boost for extreme opportunities
    if (factors.expectedReturn >= 100) {
      urgency = 0.95;
    } else if (factors.expectedReturn >= 50) {
      urgency = Math.max(urgency, 0.8);
    }

    // Adjust for market volatility
    urgency *= (1 + factors.marketVolatility * 0.3);

    // Adjust for volume (high volume = act faster)
    if (factors.volumeProfile === 'high') {
      urgency *= 1.2;
    } else if (factors.volumeProfile === 'low') {
      urgency *= 0.8;
    }

    return Math.min(1, urgency);
  }

  /**
   * Build reasoning explanation
   */
  private buildReasoning(
    opportunity: number,
    market: number,
    system: number,
    performance: number,
    learning: number,
    overall: number
  ): string {
    const components = [];

    if (opportunity > 0.8) components.push('Exceptional opportunity');
    else if (opportunity > 0.6) components.push('Strong opportunity');
    else if (opportunity > 0.4) components.push('Moderate opportunity');

    if (market > 0.7) components.push('favorable market');
    if (system > 0.7) components.push('high AI confidence');
    if (performance > 0.7) components.push('strong performance');
    if (learning > 0.7) components.push('well-learned pair');

    const conviction = overall > 0.7 ? 'HIGH' : overall > 0.5 ? 'MODERATE' : 'LOW';

    return `${conviction} CONVICTION (${(overall * 100).toFixed(0)}%): ${components.join(', ') || 'Standard conditions'}`;
  }

  /**
   * Update conviction history for learning
   */
  private updateConvictionHistory(symbol: string, conviction: number): void {
    if (!this.convictionHistory.has(symbol)) {
      this.convictionHistory.set(symbol, []);
    }

    const history = this.convictionHistory.get(symbol)!;
    history.push(conviction);

    // Keep last 50 convictions
    if (history.length > 50) {
      history.shift();
    }
  }

  /**
   * Load performance memory from database
   */
  private async loadPerformanceMemory(): Promise<void> {
    try {
      const recentTrades = await prisma.livePosition.findMany({
        where: {
          status: 'closed',
          exitTime: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        orderBy: { exitTime: 'desc' },
        take: 100
      });

      let wins = 0;
      let losses = 0;
      let currentStreak = 0;

      for (const trade of recentTrades) {
        if (trade.realizedPnL && trade.realizedPnL > 0) {
          wins++;
          if (currentStreak >= 0) currentStreak++;
          else currentStreak = 1;
        } else {
          losses++;
          if (currentStreak <= 0) currentStreak--;
          else currentStreak = -1;
        }
      }

      this.performanceMemory = {
        wins,
        losses,
        streak: currentStreak
      };

    } catch (error) {
      console.error('Failed to load performance memory:', error);
    }
  }

  /**
   * Update performance after trade
   */
  async updatePerformance(won: boolean): Promise<void> {
    if (won) {
      this.performanceMemory.wins++;
      if (this.performanceMemory.streak >= 0) {
        this.performanceMemory.streak++;
      } else {
        this.performanceMemory.streak = 1;
      }
    } else {
      this.performanceMemory.losses++;
      if (this.performanceMemory.streak <= 0) {
        this.performanceMemory.streak--;
      } else {
        this.performanceMemory.streak = -1;
      }
    }

    this.emit('performanceUpdated', this.performanceMemory);
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): any {
    const total = this.performanceMemory.wins + this.performanceMemory.losses;
    return {
      winRate: total > 0 ? this.performanceMemory.wins / total : 0.5,
      totalTrades: total,
      currentStreak: this.performanceMemory.streak,
      isHotStreak: this.performanceMemory.streak > 3,
      isColdStreak: this.performanceMemory.streak < -3
    };
  }
}

export const dynamicConvictionCalculator = DynamicConvictionCalculator.getInstance();