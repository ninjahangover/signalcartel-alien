/**
 * Phase 2 Mathematical Optimizer
 *
 * Fixes critical mathematical issues:
 * 1. Unrealistic expected move calculations (40%+ -> 0.5-3%)
 * 2. Dynamic pair filtering based on performance
 * 3. Conviction-based position sizing (1-10% range)
 * 4. Volume validation before execution
 * 5. Immediate signal execution
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class Phase2MathematicalOptimizer {
  private pairPerformanceCache: Map<string, PairPerformance> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Exchange minimum volumes (in USD)
  private readonly MINIMUM_VOLUMES: { [key: string]: number } = {
    'BTCUSD': 50,
    'ETHUSD': 30,
    'BNBUSD': 20,
    'SOLUSD': 20,
    'AVAXUSD': 20,
    'DOTUSD': 20,
    'DEFAULT': 10
  };

  /**
   * FIX #1: Calculate realistic expected move (0.5-3% range instead of 40%+)
   */
  calculateRealisticExpectedMove(
    confidence: number,
    volatility: number,
    timeframeMinutes: number = 5
  ): number {
    // Use square root of time for Brownian motion (realistic market movement)
    const timeFactor = Math.sqrt(timeframeMinutes / 1440); // Daily normalization

    // Confidence should dampen expected move, not amplify it
    const confidenceFactor = Math.sqrt(confidence); // Square root dampening

    // Base volatility adjustment (crypto typically 2-5% daily)
    const adjustedVolatility = Math.min(volatility, 0.05); // Cap at 5% daily

    // Realistic expectation: 0.1% - 3% for crypto in 5-minute timeframe
    const expectedMove = adjustedVolatility * timeFactor * confidenceFactor;

    // Hard cap at 3% to prevent unrealistic expectations
    return Math.min(Math.max(expectedMove, 0.001), 0.03);
  }

  /**
   * FIX #2: Dynamic pair filtering based on historical performance
   */
  async shouldTradePair(
    symbol: string,
    baseConfidence: number
  ): Promise<{ shouldTrade: boolean; requiredConfidence: number; reason?: string }> {
    // Update cache if stale
    await this.updatePerformanceCache();

    const performance = this.pairPerformanceCache.get(symbol);
    if (!performance) {
      // No history - require higher confidence for unknown pairs
      return {
        shouldTrade: baseConfidence > 0.20,
        requiredConfidence: 0.20,
        reason: 'Unknown pair - requires 20% confidence'
      };
    }

    // Blacklist terrible performers (below 20% accuracy)
    if (performance.accuracy < 0.20 && performance.totalSignals > 10) {
      return {
        shouldTrade: false,
        requiredConfidence: 1.0, // Impossible threshold
        reason: `Blacklisted - ${(performance.accuracy * 100).toFixed(1)}% accuracy`
      };
    }

    // Require higher confidence for poor performers (20-40% accuracy)
    if (performance.accuracy < 0.40 && performance.totalSignals > 5) {
      const multiplier = 2.0 - performance.accuracy; // 1.6x - 1.8x multiplier
      const requiredConfidence = Math.min(0.12 * multiplier, 0.25);

      return {
        shouldTrade: baseConfidence >= requiredConfidence,
        requiredConfidence,
        reason: `Poor performer - requires ${(requiredConfidence * 100).toFixed(1)}% confidence`
      };
    }

    // Good performers - standard or reduced threshold
    if (performance.accuracy > 0.70 && performance.totalSignals > 20) {
      const requiredConfidence = 0.10; // Reduced threshold for proven winners
      return {
        shouldTrade: baseConfidence >= requiredConfidence,
        requiredConfidence,
        reason: `Strong performer - only needs ${(requiredConfidence * 100).toFixed(1)}% confidence`
      };
    }

    // Standard threshold for average performers
    return {
      shouldTrade: baseConfidence >= 0.12,
      requiredConfidence: 0.12,
      reason: 'Standard threshold'
    };
  }

  /**
   * FIX #3: Conviction-based position sizing (1-10% range instead of flat 5%)
   */
  calculateDynamicPositionSize(
    confidence: number,
    bankroll: number,
    symbol: string,
    winRate: number = 0.5,
    avgWinLossRatio: number = 1.5
  ): {
    positionSizePercent: number;
    positionSizeUSD: number;
    kellyCriterion: number;
    explanation: string;
  } {
    // Kelly Criterion calculation
    const p = winRate; // Probability of winning
    const q = 1 - p; // Probability of losing
    const b = avgWinLossRatio; // Win/loss ratio

    // Kelly fraction: (p * b - q) / b
    let kellyFraction = (p * b - q) / b;

    // Apply safety factor (use 25% of Kelly for crypto due to high volatility)
    kellyFraction = Math.max(0, kellyFraction * 0.25);

    // Scale position size based on confidence above threshold
    const threshold = 0.12;
    const confidenceMultiplier = Math.max(0, (confidence - threshold) / (1 - threshold));

    // Calculate position size as percentage of bankroll
    let positionPercent = kellyFraction * confidenceMultiplier;

    // Apply dynamic range based on confidence levels
    if (confidence >= 0.25) {
      // Very high conviction: 6-10% of bankroll
      positionPercent = 0.06 + (0.04 * confidenceMultiplier);
    } else if (confidence >= 0.20) {
      // High conviction: 4-6% of bankroll
      positionPercent = 0.04 + (0.02 * confidenceMultiplier);
    } else if (confidence >= 0.15) {
      // Medium conviction: 2-4% of bankroll
      positionPercent = 0.02 + (0.02 * confidenceMultiplier);
    } else {
      // Low conviction: 1-2% of bankroll
      positionPercent = 0.01 + (0.01 * confidenceMultiplier);
    }

    // Apply pair-specific adjustments
    const performance = this.pairPerformanceCache.get(symbol);
    if (performance) {
      if (performance.accuracy > 0.80 && performance.avgPnL > 0) {
        // Boost size for proven winners
        positionPercent *= 1.25;
      } else if (performance.accuracy < 0.30) {
        // Reduce size for poor performers
        positionPercent *= 0.5;
      }
    }

    // Apply min/max constraints
    positionPercent = Math.min(Math.max(positionPercent, 0.01), 0.10); // 1-10% range

    const positionSizeUSD = bankroll * positionPercent;

    const explanation = confidence >= 0.20 ? 'High conviction trade' :
                        confidence >= 0.15 ? 'Medium conviction trade' :
                        'Low conviction trade';

    return {
      positionSizePercent: positionPercent,
      positionSizeUSD,
      kellyCriterion: kellyFraction,
      explanation
    };
  }

  /**
   * FIX #4: Volume validation before order execution
   */
  validateOrderVolume(
    symbol: string,
    orderSizeUSD: number,
    currentPrice: number
  ): {
    isValid: boolean;
    adjustedSizeUSD?: number;
    adjustedVolume?: number;
    reason?: string;
  } {
    // Get minimum volume requirement
    const minVolumeUSD = this.MINIMUM_VOLUMES[symbol] || this.MINIMUM_VOLUMES.DEFAULT;

    // Add 10% buffer to avoid edge cases
    const requiredUSD = minVolumeUSD * 1.1;

    if (orderSizeUSD < requiredUSD) {
      // Check if we can meet minimum by adjusting up
      if (orderSizeUSD > minVolumeUSD * 0.8) {
        // Close enough - adjust up to minimum
        return {
          isValid: true,
          adjustedSizeUSD: requiredUSD,
          adjustedVolume: requiredUSD / currentPrice,
          reason: `Adjusted up to minimum: $${requiredUSD.toFixed(2)}`
        };
      } else {
        // Too small - skip trade
        return {
          isValid: false,
          reason: `Order size $${orderSizeUSD.toFixed(2)} below minimum $${requiredUSD.toFixed(2)}`
        };
      }
    }

    // Volume is valid
    return {
      isValid: true,
      adjustedSizeUSD: orderSizeUSD,
      adjustedVolume: orderSizeUSD / currentPrice,
      reason: 'Volume requirements met'
    };
  }

  /**
   * FIX #5: Signal decay function for immediate execution
   */
  calculateSignalStrength(
    baseConfidence: number,
    minutesSinceSignal: number
  ): {
    currentStrength: number;
    shouldExecute: boolean;
    urgency: 'immediate' | 'normal' | 'stale';
  } {
    // Exponential decay with lambda = 0.1 (half-life ~7 minutes)
    const lambda = 0.1;
    const decayFactor = Math.exp(-lambda * minutesSinceSignal);

    const currentStrength = baseConfidence * decayFactor;

    // Determine urgency based on time
    let urgency: 'immediate' | 'normal' | 'stale';
    if (minutesSinceSignal < 1) {
      urgency = 'immediate';
    } else if (minutesSinceSignal < 5) {
      urgency = 'normal';
    } else {
      urgency = 'stale';
    }

    // Execute immediately if confidence is above threshold and signal is fresh
    const shouldExecute = currentStrength > 0.12 && urgency !== 'stale';

    return {
      currentStrength,
      shouldExecute,
      urgency
    };
  }

  /**
   * Update performance cache from database
   */
  private async updatePerformanceCache(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate < this.CACHE_DURATION) {
      return; // Cache is still fresh
    }

    try {
      const performances = await prisma.adaptiveLearningPerformance.findMany({
        where: {
          totalSignals: { gt: 0 }
        }
      });

      this.pairPerformanceCache.clear();
      for (const perf of performances) {
        this.pairPerformanceCache.set(perf.symbol, {
          accuracy: Number(perf.accuracy),
          totalSignals: perf.totalSignals,
          avgPnL: Number(perf.avgPnL)
        });
      }

      this.lastCacheUpdate = now;
    } catch (error) {
      console.error('Failed to update performance cache:', error);
    }
  }

  /**
   * Integrated decision enhancement
   */
  async enhanceDecision(
    symbol: string,
    rawConfidence: number,
    volatility: number,
    bankroll: number,
    currentPrice: number,
    signalAge: number = 0
  ): Promise<EnhancedDecision> {
    // 1. Fix expected move calculation
    const expectedMove = this.calculateRealisticExpectedMove(
      rawConfidence,
      volatility,
      5 // 5-minute timeframe
    );

    // 2. Check if pair should be traded
    const pairFilter = await this.shouldTradePair(symbol, rawConfidence);

    // 3. Calculate signal strength with decay
    const signalStrength = this.calculateSignalStrength(rawConfidence, signalAge);

    // 4. Calculate dynamic position size
    const positionSizing = this.calculateDynamicPositionSize(
      signalStrength.currentStrength,
      bankroll,
      symbol
    );

    // 5. Validate volume requirements
    const volumeValidation = this.validateOrderVolume(
      symbol,
      positionSizing.positionSizeUSD,
      currentPrice
    );

    // Final decision
    const shouldTrade = pairFilter.shouldTrade &&
                       signalStrength.shouldExecute &&
                       volumeValidation.isValid;

    return {
      shouldTrade,
      expectedMove,
      confidence: signalStrength.currentStrength,
      positionSizePercent: positionSizing.positionSizePercent,
      positionSizeUSD: volumeValidation.adjustedSizeUSD || positionSizing.positionSizeUSD,
      volume: volumeValidation.adjustedVolume || (positionSizing.positionSizeUSD / currentPrice),
      reasons: {
        pairFilter: pairFilter.reason || '',
        signalUrgency: signalStrength.urgency,
        positionExplanation: positionSizing.explanation,
        volumeStatus: volumeValidation.reason || ''
      }
    };
  }
}

// Type definitions
interface PairPerformance {
  accuracy: number;
  totalSignals: number;
  avgPnL: number;
}

interface EnhancedDecision {
  shouldTrade: boolean;
  expectedMove: number;
  confidence: number;
  positionSizePercent: number;
  positionSizeUSD: number;
  volume: number;
  reasons: {
    pairFilter: string;
    signalUrgency: 'immediate' | 'normal' | 'stale';
    positionExplanation: string;
    volumeStatus: string;
  };
}

// Export singleton instance
export const phase2Optimizer = new Phase2MathematicalOptimizer();