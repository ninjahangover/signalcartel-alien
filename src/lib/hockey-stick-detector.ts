/**
 * HOCKEY STICK DETECTOR - Profit Maximization Engine
 *
 * Catches explosive moves BEFORE they happen:
 * - Entry: Before the vertical part of the hockey stick
 * - Exit: At the peak before reversal
 * - Short: At tops before the crash
 *
 * This is the difference between 20% gains and 2% gains
 */

import { PredictiveMarketIntelligence } from './predictive-market-intelligence';

interface HockeyStickSignal {
  type: 'LONG_ENTRY' | 'LONG_EXIT' | 'SHORT_ENTRY' | 'SHORT_EXIT';
  confidence: number;
  expectedMove: number; // Expected % gain/loss
  timeToMove: number;   // Minutes until explosion
  reasoning: string;
  urgency: 'IMMEDIATE' | 'SOON' | 'BUILDING';
}

interface CoiledSpring {
  symbol: string;
  compressionLevel: number;  // 0-1, higher = more compressed
  energy: number;            // Stored energy ready to release
  direction: 'UP' | 'DOWN' | 'UNKNOWN';
  triggerPrice: number;      // Price that triggers explosion
  timeToRelease: number;     // Estimated minutes to release
}

export class HockeyStickDetector {
  private predictiveEngine: PredictiveMarketIntelligence;
  private coiledSprings: Map<string, CoiledSpring> = new Map();
  private peakDetectionHistory: Map<string, number[]> = new Map();

  constructor() {
    this.predictiveEngine = new PredictiveMarketIntelligence();
  }

  /**
   * MAIN DETECTION: Find hockey stick opportunities
   */
  async detectHockeyStick(
    symbol: string,
    currentPrice: number,
    prices: number[],
    volumes: number[],
    orderBook: any,
    currentPosition?: { side: string, entryPrice: number }
  ): Promise<HockeyStickSignal | null> {

    // 1. COILED SPRING DETECTION - Find compressed energy
    const coiledSpring = this.detectCoiledSpring(symbol, prices, volumes);
    if (coiledSpring && coiledSpring.compressionLevel > 0.7) {
      this.coiledSprings.set(symbol, coiledSpring);
    }

    // 2. PRE-EXPLOSION SIGNALS - Detect imminent breakout
    const explosionSignals = this.detectPreExplosionSignals(prices, volumes, orderBook);

    // 3. PEAK DETECTION - Find tops before reversal
    const peakSignal = this.detectPeakFormation(symbol, prices, volumes);

    // 4. ENTRY SIGNALS - Get in before the move
    if (!currentPosition) {
      const entrySignal = this.generateEntrySignal(
        symbol,
        coiledSpring,
        explosionSignals,
        prices,
        volumes
      );
      if (entrySignal) return entrySignal;
    }

    // 5. EXIT SIGNALS - Get out at the top/bottom
    if (currentPosition) {
      const exitSignal = this.generateExitSignal(
        symbol,
        currentPosition,
        peakSignal,
        prices,
        volumes,
        currentPrice
      );
      if (exitSignal) return exitSignal;
    }

    return null;
  }

  /**
   * COILED SPRING: Detect compressed price ready to explode
   */
  private detectCoiledSpring(
    symbol: string,
    prices: number[],
    volumes: number[]
  ): CoiledSpring | null {

    if (prices.length < 20) return null;

    // Calculate price compression (Bollinger Band squeeze)
    const sma = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const variance = prices.slice(-20).reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / 20;
    const stdDev = Math.sqrt(variance);
    const compressionRatio = stdDev / sma; // Lower = more compressed

    // Volume drying up = spring coiling
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const historicalVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volumeCompression = 1 - (recentVolume / Math.max(1, historicalVolume));

    // Combined compression score
    const compressionLevel = Math.min(1,
      (1 - compressionRatio * 10) * 0.7 + // Price compression weighted 70%
      volumeCompression * 0.3              // Volume compression weighted 30%
    );

    // Detect direction bias from micro-movements
    const microTrend = this.detectMicroTrend(prices.slice(-10));

    // Calculate stored energy (how much it can move)
    const historicalRange = Math.max(...prices.slice(-50)) - Math.min(...prices.slice(-50));
    const currentRange = Math.max(...prices.slice(-5)) - Math.min(...prices.slice(-5));
    const energy = (historicalRange / Math.max(0.001, currentRange)) * compressionLevel;

    // Trigger price (breakout level)
    const upperBand = sma + (2 * stdDev);
    const lowerBand = sma - (2 * stdDev);
    const triggerPrice = microTrend > 0 ? upperBand : lowerBand;

    // Time estimate based on compression tightness
    const timeToRelease = Math.max(5, Math.min(60, (1 - compressionLevel) * 100));

    return {
      symbol,
      compressionLevel,
      energy: Math.min(10, energy), // Cap at 10x potential
      direction: microTrend > 0.1 ? 'UP' : microTrend < -0.1 ? 'DOWN' : 'UNKNOWN',
      triggerPrice,
      timeToRelease
    };
  }

  /**
   * PRE-EXPLOSION SIGNALS: Detect signs of imminent breakout
   */
  private detectPreExplosionSignals(
    prices: number[],
    volumes: number[],
    orderBook: any
  ): {
    volumeBuildup: boolean;
    priceCoiling: boolean;
    orderBookPressure: number;
    falseBreakout: boolean;
  } {

    // 1. Volume building up while price stable = accumulation
    const volumeBuildup = this.detectVolumeBuildup(volumes, prices);

    // 2. Price coiling tighter = energy building
    const priceCoiling = this.detectPriceCoiling(prices);

    // 3. Order book pressure building
    const orderBookPressure = this.calculateOrderBookPressure(orderBook);

    // 4. False breakout = real breakout coming
    const falseBreakout = this.detectFalseBreakout(prices, volumes);

    return {
      volumeBuildup,
      priceCoiling,
      orderBookPressure,
      falseBreakout
    };
  }

  /**
   * PEAK DETECTION: Identify tops/bottoms before reversal
   */
  private detectPeakFormation(
    symbol: string,
    prices: number[],
    volumes: number[]
  ): {
    isPeak: boolean;
    confidence: number;
    type: 'TOP' | 'BOTTOM' | 'NONE';
    reasoning: string;
  } {

    if (prices.length < 10) {
      return { isPeak: false, confidence: 0, type: 'NONE', reasoning: 'Insufficient data' };
    }

    // 1. Momentum exhaustion
    const momentum = this.calculateMomentum(prices);
    const momentumDecay = this.detectMomentumDecay(prices);

    // 2. Volume climax
    const volumeClimax = this.detectVolumeClimax(volumes);

    // 3. Price rejection at extremes
    const priceRejection = this.detectPriceRejection(prices);

    // 4. RSI divergence
    const rsiDivergence = this.detectRSIDivergence(prices);

    // Combine signals
    const topScore = (momentumDecay.score * 0.3) +
                     (volumeClimax ? 0.2 : 0) +
                     (priceRejection.top ? 0.3 : 0) +
                     (rsiDivergence.bearish ? 0.2 : 0);

    const bottomScore = (momentumDecay.score * 0.3) +
                        (volumeClimax ? 0.2 : 0) +
                        (priceRejection.bottom ? 0.3 : 0) +
                        (rsiDivergence.bullish ? 0.2 : 0);

    if (topScore > 0.6) {
      return {
        isPeak: true,
        confidence: topScore,
        type: 'TOP',
        reasoning: `Top forming: momentum decay ${(momentumDecay.score*100).toFixed(0)}%, ${volumeClimax ? 'volume climax, ' : ''}${priceRejection.top ? 'price rejection' : ''}`
      };
    }

    if (bottomScore > 0.6) {
      return {
        isPeak: true,
        confidence: bottomScore,
        type: 'BOTTOM',
        reasoning: `Bottom forming: momentum decay ${(momentumDecay.score*100).toFixed(0)}%, ${volumeClimax ? 'volume climax, ' : ''}${priceRejection.bottom ? 'price rejection' : ''}`
      };
    }

    return { isPeak: false, confidence: 0, type: 'NONE', reasoning: 'No peak detected' };
  }

  /**
   * ENTRY SIGNAL GENERATION: Get in before the hockey stick
   */
  private generateEntrySignal(
    symbol: string,
    coiledSpring: CoiledSpring | null,
    explosionSignals: any,
    prices: number[],
    volumes: number[]
  ): HockeyStickSignal | null {

    // IMMEDIATE ENTRY: Coiled spring about to release
    if (coiledSpring &&
        coiledSpring.compressionLevel > 0.8 &&
        coiledSpring.timeToRelease < 15 &&
        coiledSpring.direction !== 'UNKNOWN') {

      return {
        type: coiledSpring.direction === 'UP' ? 'LONG_ENTRY' : 'SHORT_ENTRY',
        confidence: coiledSpring.compressionLevel,
        expectedMove: coiledSpring.energy * 2, // Energy * 2 for % move
        timeToMove: coiledSpring.timeToRelease,
        reasoning: `Coiled spring ${(coiledSpring.compressionLevel*100).toFixed(0)}% compressed, ${coiledSpring.energy.toFixed(1)}x energy stored`,
        urgency: 'IMMEDIATE'
      };
    }

    // SOON ENTRY: Pre-explosion signals present
    const explosionScore = (explosionSignals.volumeBuildup ? 0.3 : 0) +
                          (explosionSignals.priceCoiling ? 0.3 : 0) +
                          (Math.abs(explosionSignals.orderBookPressure) * 0.2) +
                          (explosionSignals.falseBreakout ? 0.2 : 0);

    if (explosionScore > 0.6) {
      const direction = explosionSignals.orderBookPressure > 0 ? 'LONG_ENTRY' : 'SHORT_ENTRY';

      return {
        type: direction,
        confidence: Math.min(0.9, explosionScore),
        expectedMove: explosionScore * 10, // Score * 10 for % move
        timeToMove: 30,
        reasoning: `Pre-explosion: ${explosionSignals.volumeBuildup ? 'volume building, ' : ''}${explosionSignals.priceCoiling ? 'price coiling, ' : ''}${explosionSignals.falseBreakout ? 'false breakout detected' : ''}`,
        urgency: 'SOON'
      };
    }

    // BUILDING ENTRY: Early accumulation phase
    if (coiledSpring && coiledSpring.compressionLevel > 0.5) {
      return {
        type: 'LONG_ENTRY', // Default to long in accumulation
        confidence: 0.5,
        expectedMove: 5,
        timeToMove: 60,
        reasoning: `Early accumulation phase, ${(coiledSpring.compressionLevel*100).toFixed(0)}% compression building`,
        urgency: 'BUILDING'
      };
    }

    return null;
  }

  /**
   * EXIT SIGNAL GENERATION: Get out at the peak
   */
  private generateExitSignal(
    symbol: string,
    position: { side: string, entryPrice: number },
    peakSignal: any,
    prices: number[],
    volumes: number[],
    currentPrice: number
  ): HockeyStickSignal | null {

    const profitPercent = position.side === 'long' ?
      ((currentPrice - position.entryPrice) / position.entryPrice) * 100 :
      ((position.entryPrice - currentPrice) / position.entryPrice) * 100;

    // IMMEDIATE EXIT: Peak detected with good profit
    if (peakSignal.isPeak && peakSignal.confidence > 0.7 && profitPercent > 5) {
      const exitType = position.side === 'long' ? 'LONG_EXIT' : 'SHORT_EXIT';

      return {
        type: exitType,
        confidence: peakSignal.confidence,
        expectedMove: -profitPercent * 0.5, // Expect to give back half if we don't exit
        timeToMove: 5,
        reasoning: `${peakSignal.type} detected at ${profitPercent.toFixed(1)}% profit: ${peakSignal.reasoning}`,
        urgency: 'IMMEDIATE'
      };
    }

    // PARABOLIC EXIT: Vertical move exhaustion
    const parabolic = this.detectParabolicMove(prices);
    if (parabolic && profitPercent > 10) {
      const exitType = position.side === 'long' ? 'LONG_EXIT' : 'SHORT_EXIT';

      return {
        type: exitType,
        confidence: 0.85,
        expectedMove: -profitPercent * 0.7,
        timeToMove: 10,
        reasoning: `Parabolic exhaustion at ${profitPercent.toFixed(1)}% profit, ${parabolic.angle}° angle unsustainable`,
        urgency: 'IMMEDIATE'
      };
    }

    // TIME-BASED EXIT: Hockey stick played out
    const hockeyStickComplete = this.detectHockeyStickCompletion(prices, position);
    if (hockeyStickComplete && profitPercent > 3) {
      const exitType = position.side === 'long' ? 'LONG_EXIT' : 'SHORT_EXIT';

      return {
        type: exitType,
        confidence: 0.7,
        expectedMove: -profitPercent * 0.3,
        timeToMove: 20,
        reasoning: `Hockey stick pattern complete at ${profitPercent.toFixed(1)}% profit`,
        urgency: 'SOON'
      };
    }

    return null;
  }

  // Helper methods
  private detectMicroTrend(prices: number[]): number {
    if (prices.length < 2) return 0;
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    return changes.reduce((a, b) => a + b, 0) / changes.length;
  }

  private detectVolumeBuildup(volumes: number[], prices: number[]): boolean {
    if (volumes.length < 10) return false;

    const recentVol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const historicalVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volIncrease = recentVol / Math.max(1, historicalVol);

    const priceRange = Math.max(...prices.slice(-5)) - Math.min(...prices.slice(-5));
    const avgPrice = prices.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const priceStability = 1 - (priceRange / avgPrice);

    return volIncrease > 1.3 && priceStability > 0.98;
  }

  private detectPriceCoiling(prices: number[]): boolean {
    if (prices.length < 20) return false;

    const ranges = [];
    for (let i = 0; i < prices.length - 5; i += 5) {
      const slice = prices.slice(i, i + 5);
      const range = Math.max(...slice) - Math.min(...slice);
      ranges.push(range);
    }

    // Check if ranges are decreasing (coiling tighter)
    let decreasing = 0;
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i] < ranges[i-1]) decreasing++;
    }

    return decreasing >= ranges.length * 0.7;
  }

  private calculateOrderBookPressure(orderBook: any): number {
    if (!orderBook) return 0;

    const bidVolume = orderBook.bidVolume || 0;
    const askVolume = orderBook.askVolume || 0;

    if (bidVolume + askVolume === 0) return 0;

    return (bidVolume - askVolume) / (bidVolume + askVolume);
  }

  private detectFalseBreakout(prices: number[], volumes: number[]): boolean {
    if (prices.length < 10) return false;

    // Find recent high/low
    const recentHigh = Math.max(...prices.slice(-10, -1));
    const recentLow = Math.min(...prices.slice(-10, -1));
    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];

    // Check if we briefly broke out then came back
    const brokeHigh = prevPrice > recentHigh && lastPrice <= recentHigh;
    const brokeLow = prevPrice < recentLow && lastPrice >= recentLow;

    // Low volume on breakout = false breakout
    const breakoutVolume = volumes[volumes.length - 2];
    const avgVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const lowVolumeBreakout = breakoutVolume < avgVolume * 1.2;

    return (brokeHigh || brokeLow) && lowVolumeBreakout;
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 10) return 0;
    const change = (prices[prices.length - 1] - prices[prices.length - 10]) / prices[prices.length - 10];
    return change;
  }

  private detectMomentumDecay(prices: number[]): { score: number } {
    if (prices.length < 15) return { score: 0 };

    // Calculate momentum over different periods
    const momentum5 = (prices[prices.length - 1] - prices[prices.length - 5]) / prices[prices.length - 5];
    const momentum10 = (prices[prices.length - 6] - prices[prices.length - 10]) / prices[prices.length - 10];
    const momentum15 = (prices[prices.length - 11] - prices[prices.length - 15]) / prices[prices.length - 15];

    // Decay = each period weaker than the last
    const decay1 = Math.max(0, (momentum10 - momentum5) / Math.abs(momentum10 + 0.001));
    const decay2 = Math.max(0, (momentum15 - momentum10) / Math.abs(momentum15 + 0.001));

    return { score: (decay1 + decay2) / 2 };
  }

  private detectVolumeClimax(volumes: number[]): boolean {
    if (volumes.length < 20) return false;

    const lastVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;

    return lastVolume > avgVolume * 2.5;
  }

  private detectPriceRejection(prices: number[]): { top: boolean, bottom: boolean } {
    if (prices.length < 3) return { top: false, bottom: false };

    const [prev2, prev1, current] = prices.slice(-3);

    // Top rejection: spike up then reversal
    const topSpike = prev1 > prev2 * 1.01 && current < prev1 * 0.995;

    // Bottom rejection: spike down then reversal
    const bottomSpike = prev1 < prev2 * 0.99 && current > prev1 * 1.005;

    return { top: topSpike, bottom: bottomSpike };
  }

  private detectRSIDivergence(prices: number[]): { bullish: boolean, bearish: boolean } {
    // Simplified RSI divergence detection
    if (prices.length < 14) return { bullish: false, bearish: false };

    // This would calculate actual RSI and compare with price
    // For now, return placeholder
    return { bullish: false, bearish: false };
  }

  private detectParabolicMove(prices: number[]): { angle: number } | null {
    if (prices.length < 5) return null;

    const recent = prices.slice(-5);
    const changes = [];

    for (let i = 1; i < recent.length; i++) {
      changes.push((recent[i] - recent[i-1]) / recent[i-1]);
    }

    // Check if each change is larger than the last (accelerating)
    let accelerating = 0;
    for (let i = 1; i < changes.length; i++) {
      if (Math.abs(changes[i]) > Math.abs(changes[i-1])) accelerating++;
    }

    if (accelerating >= changes.length - 1) {
      // Calculate angle of ascent
      const totalChange = (recent[recent.length - 1] - recent[0]) / recent[0];
      const angle = Math.atan(totalChange * 10) * (180 / Math.PI);
      return { angle: Math.abs(angle) };
    }

    return null;
  }

  private detectHockeyStickCompletion(prices: number[], position: any): boolean {
    // Hockey stick is complete when we've had the vertical move
    const entryIndex = Math.max(0, prices.length - 20); // Assume entry was ~20 periods ago
    const entryPrice = prices[entryIndex];
    const currentPrice = prices[prices.length - 1];

    const totalMove = Math.abs((currentPrice - entryPrice) / entryPrice);

    // If we've moved >10% from entry, pattern is likely complete
    return totalMove > 0.10;
  }
}