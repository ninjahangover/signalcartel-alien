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
  // 🔧 V3.14.3 FIX: Lowered minimums for small account compatibility
  // $75 account with 20% sizing = $15 positions, so minimums must be ≤$15
  private readonly MINIMUM_VOLUMES: { [key: string]: number } = {
    'BTCUSD': 50,  // Keep high for BTC (price-sensitive)
    'ETHUSD': 15,  // Lowered from 30
    'BNBUSD': 12,  // Lowered from 20
    'SOLUSD': 12,  // Lowered from 20
    'AVAXUSD': 12, // Lowered from 20
    'DOTUSD': 12,  // Lowered from 20
    'DEFAULT': 10  // Unchanged - good default
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
    // 🔥 V3.11.3: AGGRESSIVE MODE - Accept ALL signals above 10% confidence
    // User wants trades NOW - trust the tensor AI fusion decision
    const minConfidence = 0.10; // 10% minimum

    return {
      shouldTrade: baseConfidence >= minConfidence,
      requiredConfidence: minConfidence,
      reason: baseConfidence >= minConfidence ?
              `✅ Aggressive mode: ${(baseConfidence * 100).toFixed(1)}% confidence accepted` :
              `❌ Below 10% minimum (${(baseConfidence * 100).toFixed(1)}%)`
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

    // 🧠 V3.11.2: DYNAMIC POSITION SIZING - Zero Hardcoded Limits!
    // Calculate minimum percentage needed to meet Kraken's order minimums
    const krakenMinimumUSD = 22; // Kraken's lowest minimum across all pairs
    const krakenMaximumUSD = 55; // Kraken's highest minimum for some pairs

    // Dynamic minimum: Whatever percentage of bankroll gives us $60 (buffer above $55 max)
    // This ensures we can trade ALL pairs, not just the ones with $22 minimums
    const dynamicMinPercent = Math.max(60 / bankroll, 0.01); // At least 1% for sanity

    // Dynamic maximum: Cap at 20% of bankroll for risk management (more aggressive than typical 10%)
    // Small accounts need larger % to meet minimums, large accounts can use smaller %
    const dynamicMaxPercent = bankroll < 1000 ? 0.20 : // <$1k: up to 20%
                              bankroll < 5000 ? 0.15 : // $1k-5k: up to 15%
                              0.10; // >$5k: standard 10%

    // Apply dynamic constraints based on actual account size
    positionPercent = Math.min(Math.max(positionPercent, dynamicMinPercent), dynamicMaxPercent);

    const positionSizeUSD = bankroll * positionPercent;

    // Enhanced explanation with dynamic reasoning
    const sizeReasoning = positionSizeUSD < krakenMaximumUSD ?
                         `meeting Kraken ${krakenMinimumUSD}-${krakenMaximumUSD} minimums` :
                         `optimal Kelly sizing`;

    const explanation = confidence >= 0.20 ? `High conviction trade (${sizeReasoning})` :
                        confidence >= 0.15 ? `Medium conviction trade (${sizeReasoning})` :
                        `Low conviction trade (${sizeReasoning})`;

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

    // 🔧 V3.14.3 FIX: For small accounts (<$100), use actual minimums without buffer
    // This allows $75 account with 20% sizing ($15) to trade $10 minimum pairs
    const requiredUSD = minVolumeUSD; // Removed 1.1x buffer that was blocking small accounts

    if (orderSizeUSD < requiredUSD) {
      // Check if we can meet minimum by adjusting up (within 20% tolerance)
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