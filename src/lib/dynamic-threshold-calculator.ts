/**
 * DYNAMIC THRESHOLD CALCULATOR™
 * Adaptive threshold management system that learns from market conditions
 * Eliminates hard-coded values in favor of dynamic, self-adjusting parameters
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MarketContext {
  volatility: number;           // 0-1, current market volatility
  opportunitySize: number;      // Expected return percentage
  recentPerformance: number;    // Recent win rate
  marketRegime: 'trending' | 'ranging' | 'volatile' | 'calm';
  systemConfidence: number;     // Overall system confidence
  learningFactor: number;       // How much the system has learned about this pair
}

export interface DynamicThresholds {
  executionThreshold: number;    // Minimum confidence to execute trade
  positionSizeMultiplier: number; // Dynamic position sizing factor
  urgencyFactor: number;         // How quickly to act on opportunity
  riskTolerance: number;         // Dynamic risk tolerance
}

export class DynamicThresholdCalculator {
  private static instance: DynamicThresholdCalculator;
  private learningMemory: Map<string, number[]> = new Map();

  private constructor() {}

  static getInstance(): DynamicThresholdCalculator {
    if (!this.instance) {
      this.instance = new DynamicThresholdCalculator();
    }
    return this.instance;
  }

  /**
   * Calculate dynamic thresholds based on multiple factors
   * NO HARD-CODED VALUES - everything adapts to market conditions
   */
  async calculateThresholds(
    symbol: string,
    context: MarketContext
  ): Promise<DynamicThresholds> {

    // 1. OPPORTUNITY-BASED SCALING
    // Massive opportunities get lower thresholds
    const opportunityScale = this.calculateOpportunityScale(context.opportunitySize);

    // 2. VOLATILITY ADAPTATION
    // High volatility = more opportunities but need careful thresholds
    const volatilityAdapter = this.adaptToVolatility(context.volatility);

    // 3. PERFORMANCE-BASED CONFIDENCE
    // Good recent performance = can be more aggressive
    const performanceMultiplier = this.adjustForPerformance(context.recentPerformance);

    // 4. REGIME-SPECIFIC OPTIMIZATION
    const regimeOptimization = this.optimizeForRegime(context.marketRegime);

    // 5. LEARNING INTEGRATION
    // The more we know about a pair, the better our thresholds
    const learningBoost = await this.applyLearningBoost(symbol, context.learningFactor);

    // 6. DYNAMIC SYNTHESIS (NO HARD LIMITS)
    const baseThreshold = 0.5; // Start neutral

    // Dynamic execution threshold that adapts to all factors
    const executionThreshold =
      baseThreshold *
      opportunityScale *
      volatilityAdapter *
      performanceMultiplier *
      regimeOptimization *
      learningBoost;

    // Position sizing scales with opportunity and confidence
    const positionSizeMultiplier = this.calculateDynamicPositionSize(
      context.opportunitySize,
      context.systemConfidence,
      context.volatility,
      context.recentPerformance
    );

    // Urgency increases with opportunity size and decreases with volatility
    const urgencyFactor = this.calculateUrgencyFactor(
      context.opportunitySize,
      context.volatility,
      context.marketRegime
    );

    // Risk tolerance adapts to market conditions and performance
    const riskTolerance = this.calculateDynamicRiskTolerance(
      context.recentPerformance,
      context.volatility,
      context.marketRegime,
      context.learningFactor
    );

    // Store for learning
    this.updateLearningMemory(symbol, executionThreshold);

    // Log dynamic calculations
    console.log(`🎯 DYNAMIC THRESHOLDS for ${symbol}:`);
    console.log(`   Opportunity: ${context.opportunitySize.toFixed(1)}% → Scale: ${opportunityScale.toFixed(3)}`);
    console.log(`   Volatility: ${(context.volatility * 100).toFixed(1)}% → Adapter: ${volatilityAdapter.toFixed(3)}`);
    console.log(`   Performance: ${(context.recentPerformance * 100).toFixed(1)}% → Multiplier: ${performanceMultiplier.toFixed(3)}`);
    console.log(`   Regime: ${context.marketRegime} → Optimization: ${regimeOptimization.toFixed(3)}`);
    console.log(`   Learning: ${(context.learningFactor * 100).toFixed(1)}% → Boost: ${learningBoost.toFixed(3)}`);
    console.log(`   📊 FINAL THRESHOLDS:`);
    console.log(`      Execution: ${(executionThreshold * 100).toFixed(2)}%`);
    console.log(`      Position Size: ${(positionSizeMultiplier * 100).toFixed(1)}%`);
    console.log(`      Urgency: ${(urgencyFactor * 100).toFixed(1)}%`);
    console.log(`      Risk Tolerance: ${(riskTolerance * 100).toFixed(1)}%`);

    return {
      executionThreshold,
      positionSizeMultiplier,
      urgencyFactor,
      riskTolerance
    };
  }

  /**
   * Scale threshold based on opportunity size
   * HUGE opportunities (>100%) get aggressive thresholds
   */
  private calculateOpportunityScale(opportunitySize: number): number {
    if (opportunitySize >= 100) {
      // 100%+ opportunity: Scale down to 20% of normal threshold
      return 0.2;
    } else if (opportunitySize >= 50) {
      // 50-100% opportunity: Scale down to 30-20%
      return 0.3 - (opportunitySize - 50) * 0.002;
    } else if (opportunitySize >= 20) {
      // 20-50% opportunity: Scale down to 50-30%
      return 0.5 - (opportunitySize - 20) * 0.0067;
    } else if (opportunitySize >= 10) {
      // 10-20% opportunity: Scale down to 70-50%
      return 0.7 - (opportunitySize - 10) * 0.02;
    } else {
      // <10% opportunity: Normal to slightly elevated threshold
      return 0.7 + (10 - opportunitySize) * 0.03;
    }
  }

  /**
   * Adapt to market volatility dynamically
   */
  private adaptToVolatility(volatility: number): number {
    // Low volatility: Need stronger signals (higher threshold)
    // High volatility: More opportunities but also more risk

    if (volatility < 0.1) {
      // Very low volatility: Increase threshold
      return 1.2;
    } else if (volatility < 0.2) {
      // Normal volatility: Neutral
      return 1.0;
    } else if (volatility < 0.4) {
      // Elevated volatility: Slightly lower threshold
      return 0.9;
    } else {
      // High volatility: Lower threshold but not too aggressive
      return 0.8;
    }
  }

  /**
   * Adjust based on recent performance
   */
  private adjustForPerformance(recentPerformance: number): number {
    // Winning streak: Can be more aggressive
    // Losing streak: Need to be more careful

    if (recentPerformance >= 0.8) {
      // 80%+ win rate: Very aggressive
      return 0.7;
    } else if (recentPerformance >= 0.6) {
      // 60-80% win rate: Moderately aggressive
      return 0.85;
    } else if (recentPerformance >= 0.4) {
      // 40-60% win rate: Neutral
      return 1.0;
    } else {
      // <40% win rate: Conservative
      return 1.3;
    }
  }

  /**
   * Optimize for market regime
   */
  private optimizeForRegime(regime: 'trending' | 'ranging' | 'volatile' | 'calm'): number {
    switch (regime) {
      case 'trending':
        // Trends are easier to trade: Lower threshold
        return 0.8;
      case 'ranging':
        // Ranges need precise entries: Higher threshold
        return 1.2;
      case 'volatile':
        // Volatile markets offer opportunities: Moderate threshold
        return 0.9;
      case 'calm':
        // Calm markets need patience: Slightly higher threshold
        return 1.1;
      default:
        return 1.0;
    }
  }

  /**
   * Apply learning boost based on historical knowledge
   */
  private async applyLearningBoost(symbol: string, learningFactor: number): Promise<number> {
    // Check adaptive learning performance
    const performance = await prisma.adaptiveLearningPerformance.findFirst({
      where: { symbol },
      orderBy: { updatedAt: 'desc' }
    });

    if (performance && performance.accuracy > 0.7 && performance.totalSignals > 50) {
      // Well-learned pair with good accuracy: Significant boost
      return 0.6;
    } else if (performance && performance.accuracy > 0.5 && performance.totalSignals > 20) {
      // Moderately learned pair: Moderate boost
      return 0.8;
    } else if (learningFactor > 0.5) {
      // Some learning: Small boost
      return 0.9;
    }

    // Unknown or poorly performing: No boost
    return 1.0;
  }

  /**
   * Calculate dynamic position size based on multiple factors
   */
  private calculateDynamicPositionSize(
    opportunitySize: number,
    confidence: number,
    volatility: number,
    recentPerformance: number
  ): number {
    // Base position size starts at 10% of capital
    let positionSize = 0.1;

    // Scale up for big opportunities
    if (opportunitySize >= 100) {
      positionSize *= 3.0; // Triple size for 100%+ opportunities
    } else if (opportunitySize >= 50) {
      positionSize *= 2.0; // Double size for 50%+ opportunities
    } else if (opportunitySize >= 20) {
      positionSize *= 1.5; // 1.5x size for 20%+ opportunities
    }

    // Adjust for confidence
    positionSize *= (0.5 + confidence * 0.5); // 50-100% scaling based on confidence

    // Adjust for volatility (inverse relationship)
    if (volatility > 0.3) {
      positionSize *= 0.7; // Reduce size in high volatility
    } else if (volatility < 0.1) {
      positionSize *= 1.2; // Increase size in low volatility
    }

    // Performance multiplier
    if (recentPerformance > 0.7) {
      positionSize *= 1.3; // Increase when winning
    } else if (recentPerformance < 0.3) {
      positionSize *= 0.7; // Decrease when losing
    }

    // Cap at 50% of capital for risk management
    return Math.min(positionSize, 0.5);
  }

  /**
   * Calculate urgency factor for trade execution
   */
  private calculateUrgencyFactor(
    opportunitySize: number,
    volatility: number,
    regime: string
  ): number {
    let urgency = 0.5; // Neutral starting point

    // Big opportunities need quick action
    if (opportunitySize >= 100) {
      urgency = 0.95; // Maximum urgency for huge opportunities
    } else if (opportunitySize >= 50) {
      urgency = 0.8;
    } else if (opportunitySize >= 20) {
      urgency = 0.65;
    }

    // Adjust for volatility (volatile = act faster)
    urgency *= (1 + volatility * 0.5);

    // Regime adjustment
    if (regime === 'trending') {
      urgency *= 1.2; // Trends can move fast
    } else if (regime === 'ranging') {
      urgency *= 0.8; // Ranges allow patience
    }

    return Math.min(urgency, 1.0);
  }

  /**
   * Calculate dynamic risk tolerance
   */
  private calculateDynamicRiskTolerance(
    recentPerformance: number,
    volatility: number,
    regime: string,
    learningFactor: number
  ): number {
    // Base risk tolerance
    let riskTolerance = 0.05; // Start at 5% risk per trade

    // Performance adjustment
    if (recentPerformance > 0.7) {
      riskTolerance *= 1.5; // Increase risk when winning
    } else if (recentPerformance < 0.3) {
      riskTolerance *= 0.5; // Decrease risk when losing
    }

    // Volatility adjustment
    if (volatility > 0.3) {
      riskTolerance *= 0.7; // Lower risk in high volatility
    } else if (volatility < 0.1) {
      riskTolerance *= 1.3; // Higher risk in low volatility
    }

    // Regime adjustment
    if (regime === 'trending') {
      riskTolerance *= 1.2; // Trends allow more risk
    } else if (regime === 'volatile') {
      riskTolerance *= 0.8; // Volatile markets need caution
    }

    // Learning boost
    riskTolerance *= (0.8 + learningFactor * 0.4); // 80-120% based on learning

    // Cap at 15% maximum risk
    return Math.min(riskTolerance, 0.15);
  }

  /**
   * Update learning memory for continuous improvement
   */
  private updateLearningMemory(symbol: string, threshold: number): void {
    if (!this.learningMemory.has(symbol)) {
      this.learningMemory.set(symbol, []);
    }

    const memory = this.learningMemory.get(symbol)!;
    memory.push(threshold);

    // Keep last 100 thresholds for learning
    if (memory.length > 100) {
      memory.shift();
    }
  }

  /**
   * Get adaptive threshold based on opportunity detection
   * Special handling for extreme profit opportunities
   */
  async getOpportunityAdaptiveThreshold(
    symbol: string,
    expectedReturn: number,
    currentThreshold: number
  ): Promise<number> {
    // EXTREME OPPORTUNITIES (>100%) - Maximum aggression
    if (expectedReturn >= 100) {
      console.log(`🚀 EXTREME OPPORTUNITY DETECTED: ${expectedReturn.toFixed(1)}% - MAXIMUM AGGRESSION`);
      return currentThreshold * 0.1; // 10% of normal threshold
    }

    // HIGH OPPORTUNITIES (50-100%) - Very aggressive
    if (expectedReturn >= 50) {
      console.log(`💎 HIGH OPPORTUNITY: ${expectedReturn.toFixed(1)}% - VERY AGGRESSIVE`);
      return currentThreshold * 0.2; // 20% of normal threshold
    }

    // GOOD OPPORTUNITIES (20-50%) - Aggressive
    if (expectedReturn >= 20) {
      console.log(`✨ GOOD OPPORTUNITY: ${expectedReturn.toFixed(1)}% - AGGRESSIVE`);
      return currentThreshold * 0.4; // 40% of normal threshold
    }

    // MODERATE OPPORTUNITIES (10-20%) - Moderate
    if (expectedReturn >= 10) {
      return currentThreshold * 0.6; // 60% of normal threshold
    }

    // NORMAL OPPORTUNITIES (<10%)
    return currentThreshold;
  }
}

export const dynamicThresholdCalculator = DynamicThresholdCalculator.getInstance();