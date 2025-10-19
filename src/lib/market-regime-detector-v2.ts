/**
 * V3.14.28: MARKET REGIME DETECTION ENGINE V2
 *
 * Detects current market conditions based on BTC PRICE ACTION (not performance history):
 * - BULL: Strong uptrend, high confidence in direction
 * - BEAR: Strong downtrend, defensive positioning needed
 * - CHOPPY: Low directional conviction, tight ranges
 * - CRASH: Extreme volatility, capital preservation mode
 *
 * Philosophy: Historical win rates from BEAR markets don't apply in BULL markets.
 * Reset blacklists and adapt thresholds when regime changes.
 *
 * Key Difference from V1: V1 used performance history (backward-looking).
 * V2 uses BTC price action (forward-looking market context).
 */

export type MarketRegimeType = 'bull' | 'bear' | 'choppy' | 'crash';

export interface MarketRegime {
  type: MarketRegimeType;
  confidence: number; // 0-1, how confident we are in this classification
  trendStrength: number; // 0-1, strength of directional movement
  trendDirection: number; // -1 to +1, negative = bearish, positive = bullish
  volatility: number; // Percentage, e.g., 2.5 = 2.5% average volatility
  timestamp: Date;
  reason: string; // Human-readable explanation
}

export interface PriceCandle {
  close: number;
  high: number;
  low: number;
  volume: number;
  timestamp: Date;
}

export class MarketRegimeDetectorV2 {
  private lastRegime: MarketRegime | null = null;
  private regimeChangeThreshold = 0.6; // Need 60% confidence to declare regime change

  /**
   * Detect current market regime based on BTC price action
   * BTC is the market leader - when BTC trends, alts follow
   */
  public detectRegime(priceHistory: PriceCandle[]): MarketRegime {
    if (priceHistory.length < 20) {
      throw new Error('Need at least 20 candles for regime detection');
    }

    // Calculate technical indicators
    const trend = this.calculateTrend(priceHistory, 20);
    const volatility = this.calculateVolatility(priceHistory, 20);
    const volumeTrend = this.calculateVolumeTrend(priceHistory, 10);

    // Classify regime based on conditions
    let regime: MarketRegime;

    // CRASH: Extreme volatility (>5%) regardless of direction
    if (volatility > 5.0) {
      regime = {
        type: 'crash',
        confidence: Math.min(volatility / 10, 1.0), // Higher volatility = higher confidence
        trendStrength: trend.strength,
        trendDirection: trend.direction,
        volatility,
        timestamp: new Date(),
        reason: `Extreme volatility ${volatility.toFixed(2)}% - capital preservation mode`
      };
    }
    // BULL: Strong uptrend (strength >0.7, direction >0.5)
    else if (trend.strength > 0.7 && trend.direction > 0.5) {
      regime = {
        type: 'bull',
        confidence: trend.strength,
        trendStrength: trend.strength,
        trendDirection: trend.direction,
        volatility,
        timestamp: new Date(),
        reason: `Strong uptrend: ${(trend.direction * 100).toFixed(0)}% directional bias, ${(trend.strength * 100).toFixed(0)}% strength`
      };
    }
    // BEAR: Strong downtrend (strength >0.7, direction <-0.5)
    else if (trend.strength > 0.7 && trend.direction < -0.5) {
      regime = {
        type: 'bear',
        confidence: trend.strength,
        trendStrength: trend.strength,
        trendDirection: trend.direction,
        volatility,
        timestamp: new Date(),
        reason: `Strong downtrend: ${(trend.direction * 100).toFixed(0)}% directional bias, ${(trend.strength * 100).toFixed(0)}% strength`
      };
    }
    // CHOPPY: Low directional conviction (strength <0.4 OR volatility <1.5%)
    else if (trend.strength < 0.4 || volatility < 1.5) {
      regime = {
        type: 'choppy',
        confidence: 1.0 - trend.strength, // Higher confidence when trend is weaker
        trendStrength: trend.strength,
        trendDirection: trend.direction,
        volatility,
        timestamp: new Date(),
        reason: `Low conviction: ${(trend.strength * 100).toFixed(0)}% trend strength, ${volatility.toFixed(2)}% volatility`
      };
    }
    // TRANSITIONAL: Moderate trend but unclear direction
    else {
      // Default to choppy with lower confidence
      regime = {
        type: 'choppy',
        confidence: 0.5,
        trendStrength: trend.strength,
        trendDirection: trend.direction,
        volatility,
        timestamp: new Date(),
        reason: `Transitional: ${(trend.strength * 100).toFixed(0)}% strength, ${(trend.direction * 100).toFixed(0)}% direction`
      };
    }

    return regime;
  }

  /**
   * Calculate trend strength and direction using linear regression
   */
  private calculateTrend(candles: PriceCandle[], period: number): { strength: number; direction: number } {
    const recentCandles = candles.slice(-period);
    const prices = recentCandles.map(c => c.close);

    // Linear regression: y = mx + b
    const n = prices.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = prices;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R² (coefficient of determination) as trend strength
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
    const rSquared = 1 - (ssResidual / ssTotal);

    // Normalize slope to -1 to +1 range (direction)
    const avgPrice = sumY / n;
    const normalizedSlope = slope / avgPrice * period;
    const direction = Math.max(-1, Math.min(1, normalizedSlope));

    return {
      strength: Math.max(0, Math.min(1, rSquared)), // 0-1 range
      direction // -1 to +1 range
    };
  }

  /**
   * Calculate volatility as average true range (ATR) percentage
   */
  private calculateVolatility(candles: PriceCandle[], period: number): number {
    const recentCandles = candles.slice(-period);

    let sumTrueRange = 0;
    for (let i = 1; i < recentCandles.length; i++) {
      const current = recentCandles[i];
      const previous = recentCandles[i - 1];

      const trueRange = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );

      sumTrueRange += trueRange;
    }

    const atr = sumTrueRange / (recentCandles.length - 1);
    const avgPrice = recentCandles.reduce((sum, c) => sum + c.close, 0) / recentCandles.length;

    return (atr / avgPrice) * 100; // Return as percentage
  }

  /**
   * Calculate volume trend (increasing or decreasing)
   */
  private calculateVolumeTrend(candles: PriceCandle[], period: number): number {
    const recentCandles = candles.slice(-period);
    const volumes = recentCandles.map(c => c.volume);

    const firstHalf = volumes.slice(0, Math.floor(period / 2));
    const secondHalf = volumes.slice(Math.floor(period / 2));

    const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    return (avgSecondHalf - avgFirstHalf) / avgFirstHalf; // Percentage change
  }

  /**
   * Check if regime has changed significantly
   */
  public hasRegimeChanged(newRegime: MarketRegime): boolean {
    if (!this.lastRegime) {
      this.lastRegime = newRegime;
      return false; // First detection, no change
    }

    // Regime changed if:
    // 1. Type is different AND new confidence >60%
    // 2. Direction flipped significantly (e.g., bull→bear or vice versa)
    const typeChanged = this.lastRegime.type !== newRegime.type && newRegime.confidence > this.regimeChangeThreshold;
    const directionFlipped = Math.sign(this.lastRegime.trendDirection) !== Math.sign(newRegime.trendDirection) &&
                             Math.abs(newRegime.trendDirection) > 0.5;

    if (typeChanged || directionFlipped) {
      this.lastRegime = newRegime;
      return true;
    }

    // Update last regime even if no change (for tracking)
    this.lastRegime = newRegime;
    return false;
  }

  /**
   * Get recommended trading parameters based on regime
   */
  public getRegimeParameters(regime: MarketRegime) {
    switch (regime.type) {
      case 'bull':
        return {
          exitConfidenceThreshold: 0.70, // High bar to exit winners
          positionSizeMultiplier: 1.2, // Increase size in trends
          stopLossMultiplier: 1.5, // Wider stops in trending markets
          minHoldTimeMinutes: 20, // Let winners run
          rotationOpportunityCount: 4, // Need more opportunities to rotate out of winner
          flatPositionTimeoutMinutes: 20, // Longer timeout in bull market
          negativePositionTimeoutMinutes: 12, // Longer timeout for negatives
          description: 'BULL: Increase size, wider stops, let winners run'
        };

      case 'bear':
        return {
          exitConfidenceThreshold: 0.55, // Lower bar to exit losers
          positionSizeMultiplier: 0.8, // Reduce size in downtrends
          stopLossMultiplier: 1.0, // Tighter stops
          minHoldTimeMinutes: 10, // Cut losers faster
          rotationOpportunityCount: 2, // Rotate more aggressively
          flatPositionTimeoutMinutes: 10, // Faster rotation
          negativePositionTimeoutMinutes: 6, // Cut negatives fast
          description: 'BEAR: Reduce size, tight stops, rotate quickly'
        };

      case 'choppy':
        return {
          exitConfidenceThreshold: 0.50, // Medium bar, take profits faster
          positionSizeMultiplier: 0.9, // Slightly smaller size
          stopLossMultiplier: 1.2, // Moderate stops
          minHoldTimeMinutes: 8, // Quick in and out
          rotationOpportunityCount: 2, // Rotate if better opportunities exist
          flatPositionTimeoutMinutes: 8, // Fast rotation in chop
          negativePositionTimeoutMinutes: 5, // Very fast on negatives
          description: 'CHOPPY: Fast rotation, take quick profits'
        };

      case 'crash':
        return {
          exitConfidenceThreshold: 0.40, // Very low bar, exit on any negative signal
          positionSizeMultiplier: 0.5, // Half normal size
          stopLossMultiplier: 0.8, // Very tight stops
          minHoldTimeMinutes: 5, // Exit fast
          rotationOpportunityCount: 1, // Rotate on ANY opportunity
          flatPositionTimeoutMinutes: 3, // Immediate rotation
          negativePositionTimeoutMinutes: 2, // Cut immediately
          description: 'CRASH: Capital preservation, minimal risk, exit fast'
        };

      default:
        return {
          exitConfidenceThreshold: 0.65,
          positionSizeMultiplier: 1.0,
          stopLossMultiplier: 1.0,
          minHoldTimeMinutes: 15,
          rotationOpportunityCount: 3,
          flatPositionTimeoutMinutes: 15,
          negativePositionTimeoutMinutes: 10,
          description: 'DEFAULT: Balanced parameters'
        };
    }
  }

  /**
   * Get last detected regime (for persistence)
   */
  public getLastRegime(): MarketRegime | null {
    return this.lastRegime;
  }

  /**
   * Set last regime (for loading from storage)
   */
  public setLastRegime(regime: MarketRegime | null): void {
    this.lastRegime = regime;
  }
}
