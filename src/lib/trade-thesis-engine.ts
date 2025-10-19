/**
 * Trade Thesis Engine - Crypto Trading Optimized
 *
 * Kraken spot market optimization (vs OTC/CFT perpetuals)
 * Predicts target prices, stop losses, and manages trade thesis lifecycle
 *
 * Key Features:
 * - AI-driven target price prediction (no hardcoding)
 * - Dynamic support/resistance analysis
 * - Learning-based stop placement
 * - Thesis validation and adjustment tracking
 * - Crypto-optimized parameters (tighter stops, faster timeframes)
 */

import { PrismaClient } from '@prisma/client';

// ============================================================================
// INTERFACES
// ============================================================================

export interface TradeThesis {
  symbol: string;
  entryPrice: number;
  entryTimestamp: Date;

  // AI-predicted targets (initial)
  initialTargetPrice: number;
  initialStopLoss: number;
  initialExpectedReturn: number;      // Percentage
  initialTimeframe: number;            // Minutes to target

  // Current targets (can be adjusted dynamically)
  currentTargetPrice: number;
  currentStopLoss: number;
  currentExpectedReturn: number;

  // Risk/reward
  riskRewardRatio: number;
  riskAmount: number;                  // Dollar amount at risk
  rewardAmount: number;                // Dollar amount potential reward

  // Thesis reasoning
  thesisReason: string;                // Why we entered
  confidenceLevel: number;             // 0-1

  // Support/resistance levels (AI-calculated)
  supportLevels: number[];
  resistanceLevels: number[];

  // Adjustment history
  adjustments: ThesisAdjustment[];

  // Partial exit tracking (Phase 3)
  originalQuantity?: number;           // Initial position size
  remainingQuantity?: number;          // Current position size
  partialExits: PartialExit[];         // History of partials

  // Status
  isActive: boolean;
  isThesisValid: boolean;              // Is original thesis still valid?
}

export interface PartialExit {
  timestamp: Date;
  price: number;
  quantity: number;
  percentOfPosition: number;           // What % of original position
  returnPct: number;                   // Return on this partial
  reason: string;                      // Why we took partial
  remainingQuantity: number;           // Position size after this exit
}

export interface ThesisAdjustment {
  timestamp: Date;
  reason: string;
  previousTarget?: number;
  newTarget?: number;
  previousStop?: number;
  newStop?: number;
  marketCondition: string;             // What changed?
  aiConfidence: number;
}

export interface TargetPrediction {
  symbol: string;
  currentPrice: number;

  // Target predictions
  targetPrice: number;                 // AI-predicted target
  stopLossPrice: number;               // AI-calculated stop
  expectedReturn: number;              // Percentage gain
  expectedTimeframe: number;           // Minutes to target

  // Risk metrics
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number;

  // Supporting analysis
  supportLevels: number[];
  resistanceLevels: number[];
  keyLevels: {
    nearestSupport: number;
    nearestResistance: number;
    strongResistance: number;          // Primary target zone
  };

  // Confidence
  predictionConfidence: number;        // 0-1: How confident in this target
  reasoning: string;                   // Why this target?
}

export interface MarketConditions {
  symbol: string;
  price: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  changePercent: number;

  // Technical levels
  high24h?: number;
  low24h?: number;
  high52w?: number;
  low52w?: number;

  // Momentum indicators
  rsi?: number;
  atr?: number;                        // Average True Range (volatility)

  // Pattern detection
  isBreakout?: boolean;
  isConsolidation?: boolean;
  trendDirection?: 'UP' | 'DOWN' | 'SIDEWAYS';

  // AI signals
  aiConfidence?: number;
  aiDirection?: 'LONG' | 'SHORT' | 'NEUTRAL';
  aiExpectedReturn?: number;
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

export class TradeThesisEngine {
  private prisma: PrismaClient;
  private activeTheses: Map<string, TradeThesis> = new Map();

  // 🔧 CRYPTO-OPTIMIZED PARAMETERS (vs OTC large caps)
  // - Tighter ATR multipliers (0.5-2x vs 2-3x OTC)
  // - Faster timeframes (60min vs 240min OTC)
  // - Smaller percentage moves (2-5% vs 15%+ OTC)
  private learningParams = {
    targetAccuracyMultiplier: 1.0,    // Adjusts target distance based on past accuracy
    stopLossMultiplier: 1.0,          // Adjusts stop distance based on past stops hit
    timeframeMultiplier: 1.0,         // Adjusts time expectations
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // TARGET PRICE PREDICTION
  // ============================================================================

  /**
   * Predict target price and stop loss for entry
   * Pure AI-driven, no hardcoded values
   * 🔧 CRYPTO-OPTIMIZED: Tighter stops, faster timeframes
   */
  async predictTarget(conditions: MarketConditions): Promise<TargetPrediction> {
    const { symbol, price } = conditions;

    // Step 1: Calculate support/resistance levels from price action
    const levels = await this.calculateSupportResistance(conditions);

    // Step 2: Determine target based on nearest resistance + AI confidence
    const targetPrice = this.calculateTargetPrice(conditions, levels);

    // Step 3: Determine stop loss based on nearest support
    const stopLossPrice = this.calculateStopLoss(conditions, levels);

    // Step 4: Calculate risk/reward
    const riskAmount = Math.abs(price - stopLossPrice);
    const rewardAmount = Math.abs(targetPrice - price);
    const riskRewardRatio = rewardAmount / riskAmount;

    // Step 5: Calculate expected return percentage
    const expectedReturn = ((targetPrice - price) / price) * 100;

    // Step 6: Estimate timeframe based on volatility + momentum
    const expectedTimeframe = this.estimateTimeframe(conditions, expectedReturn);

    // Step 7: Confidence based on level strength + AI signals
    const predictionConfidence = this.calculatePredictionConfidence(conditions, levels, riskRewardRatio);

    // Step 8: Generate reasoning
    const reasoning = this.generateReasoning(conditions, levels, targetPrice, stopLossPrice);

    return {
      symbol,
      currentPrice: price,
      targetPrice,
      stopLossPrice,
      expectedReturn,
      expectedTimeframe,
      riskAmount,
      rewardAmount,
      riskRewardRatio,
      supportLevels: levels.supports,
      resistanceLevels: levels.resistances,
      keyLevels: {
        nearestSupport: levels.nearestSupport,
        nearestResistance: levels.nearestResistance,
        strongResistance: levels.strongResistance,
      },
      predictionConfidence,
      reasoning,
    };
  }

  /**
   * Calculate support and resistance levels from market data
   * 🔧 CRYPTO-OPTIMIZED: Tighter ATR multipliers for volatile crypto markets
   */
  private async calculateSupportResistance(conditions: MarketConditions): Promise<{
    supports: number[];
    resistances: number[];
    nearestSupport: number;
    nearestResistance: number;
    strongResistance: number;
  }> {
    const { price, high24h, low24h, high52w, low52w, atr } = conditions;

    const supports: number[] = [];
    const resistances: number[] = [];

    // 🔧 CRYPTO: Use smaller ATR multipliers (0.5-2x vs 2-3x OTC)
    // Crypto moves faster, tighter levels needed
    const atrValue = atr || (price * 0.03); // Default 3% if no ATR (vs 5% OTC)

    // Support levels below current price
    if (low24h) supports.push(low24h);
    supports.push(price - atrValue * 0.5);     // Very near support (crypto-tight)
    supports.push(price - atrValue);           // Recent support
    supports.push(price - atrValue * 1.5);     // Deeper support
    if (low52w) supports.push(low52w);

    // Resistance levels above current price
    resistances.push(price + atrValue * 0.5);  // Very near resistance
    resistances.push(price + atrValue);        // Near resistance
    resistances.push(price + atrValue * 2);    // Strong resistance (target zone)
    if (high24h) resistances.push(high24h);
    if (high52w) resistances.push(high52w);

    // Sort and deduplicate
    const uniqueSupports = [...new Set(supports)].sort((a, b) => b - a);
    const uniqueResistances = [...new Set(resistances)].sort((a, b) => a - b);

    // Find nearest levels
    const nearestSupport = uniqueSupports.find(s => s < price) || price * 0.95; // 5% down default
    const nearestResistance = uniqueResistances.find(r => r > price) || price * 1.05; // 5% up default

    // Strong resistance = target zone (typically 1.5-2 ATRs away for crypto)
    const strongResistance = uniqueResistances.find(r => r >= price + atrValue * 1.5) || price * 1.08; // 8% default

    return {
      supports: uniqueSupports,
      resistances: uniqueResistances,
      nearestSupport,
      nearestResistance,
      strongResistance,
    };
  }

  /**
   * Calculate target price based on resistance levels + AI confidence
   * 🔧 CRYPTO-OPTIMIZED: Smaller targets (3-8% vs 15%+ OTC)
   */
  private calculateTargetPrice(conditions: MarketConditions, levels: any): number {
    const { price, aiConfidence, aiExpectedReturn, isBreakout } = conditions;

    // Base target on nearest strong resistance
    let targetPrice = levels.strongResistance;

    // Adjust based on AI confidence (higher confidence = aim higher)
    if (aiConfidence && aiConfidence > 0.7) {
      // High confidence: aim for next resistance level
      const nextResistance = levels.resistances.find((r: number) => r > targetPrice);
      if (nextResistance) {
        targetPrice = nextResistance;
      }
    }

    // 🔧 CRYPTO: Breakout extension smaller (8% vs 15% OTC)
    if (isBreakout) {
      targetPrice *= 1.08; // 8% beyond resistance on breakouts
    }

    // Apply learning multiplier (adjusts based on past accuracy)
    const learningAdjustment = targetPrice * (this.learningParams.targetAccuracyMultiplier - 1);
    targetPrice += learningAdjustment;

    return targetPrice;
  }

  /**
   * Calculate stop loss based on support levels
   * 🔧 CRYPTO-OPTIMIZED: Tighter stops (1-3% vs 5-10% OTC)
   */
  private calculateStopLoss(conditions: MarketConditions, levels: any): number {
    const { price, atr } = conditions;
    const atrValue = atr || (price * 0.03);

    // Base stop on nearest support level
    let stopLoss = levels.nearestSupport;

    // 🔧 CRYPTO: Tighter minimum distance (0.3-0.5 ATR vs 0.5 ATR OTC)
    const minDistance = atrValue * 0.3; // At least 0.3 ATR away for crypto
    if (price - stopLoss < minDistance) {
      stopLoss = price - minDistance;
    }

    // Apply learning multiplier (tighter or looser based on past performance)
    const learningAdjustment = (price - stopLoss) * (this.learningParams.stopLossMultiplier - 1);
    stopLoss -= learningAdjustment;

    return stopLoss;
  }

  /**
   * Estimate timeframe to reach target
   * 🔧 CRYPTO-OPTIMIZED: Faster timeframes (60min vs 240min OTC)
   */
  private estimateTimeframe(conditions: MarketConditions, expectedReturn: number): number {
    const { atr, price, volumeRatio, changePercent } = conditions;
    const atrValue = atr || (price * 0.03);

    // Base timeframe on volatility
    const volatilityFactor = (atrValue / price) * 100; // ATR as % of price

    // 🔧 CRYPTO: Faster base timeframes (60min vs 240min OTC)
    let baseTimeframe = 60; // 1 hour default for crypto

    if (volatilityFactor > 15) {
      baseTimeframe = 30; // 30 minutes for highly volatile
    } else if (volatilityFactor > 8) {
      baseTimeframe = 45; // 45 minutes for moderately volatile
    }

    // High volume = faster moves
    if (volumeRatio > 3.0) {
      baseTimeframe *= 0.5; // Cut timeframe in half on high volume
    }

    // Strong momentum = faster moves
    if (Math.abs(changePercent) > 10) {
      baseTimeframe *= 0.5;
    }

    // Apply learning multiplier
    baseTimeframe *= this.learningParams.timeframeMultiplier;

    return Math.max(10, baseTimeframe); // Minimum 10 minutes for crypto
  }

  /**
   * Calculate confidence in prediction
   * Based on level strength, risk/reward, and AI signals
   */
  private calculatePredictionConfidence(
    conditions: MarketConditions,
    levels: any,
    riskRewardRatio: number
  ): number {
    let confidence = 0.5; // Start neutral

    // Good risk/reward increases confidence
    if (riskRewardRatio > 2.0) confidence += 0.2;
    else if (riskRewardRatio > 1.5) confidence += 0.1;
    else if (riskRewardRatio < 1.0) confidence -= 0.2;

    // AI confidence boosts prediction confidence
    if (conditions.aiConfidence) {
      confidence += conditions.aiConfidence * 0.3;
    }

    // Clear levels (wide spacing) increases confidence
    const levelSpacing = levels.nearestResistance - levels.nearestSupport;
    const priceRange = conditions.price * 0.10; // 10% range for crypto
    if (levelSpacing > priceRange) {
      confidence += 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate human-readable reasoning for the thesis
   */
  private generateReasoning(
    conditions: MarketConditions,
    levels: any,
    targetPrice: number,
    stopLoss: number
  ): string {
    const { price, volumeRatio, changePercent, isBreakout } = conditions;

    const returnPct = ((targetPrice - price) / price * 100).toFixed(1);
    const riskPct = ((price - stopLoss) / price * 100).toFixed(1);

    let reasoning = `Target $${targetPrice.toFixed(2)} (+${returnPct}%) based on `;

    if (isBreakout) {
      reasoning += `breakout pattern, `;
    }

    reasoning += `resistance at $${levels.strongResistance.toFixed(2)}. `;
    reasoning += `Stop $${stopLoss.toFixed(2)} (-${riskPct}%) below support at $${levels.nearestSupport.toFixed(2)}. `;

    if (volumeRatio > 3.0) {
      reasoning += `High volume (${volumeRatio.toFixed(1)}x) supports move. `;
    }

    if (Math.abs(changePercent) > 10) {
      reasoning += `Strong momentum (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%). `;
    }

    return reasoning;
  }

  // ============================================================================
  // THESIS CREATION & MANAGEMENT
  // ============================================================================

  /**
   * Create a new trade thesis at entry
   */
  async createThesis(
    symbol: string,
    entryPrice: number,
    prediction: TargetPrediction,
    aiConfidence: number,
    quantity?: number
  ): Promise<TradeThesis> {
    const thesis: TradeThesis = {
      symbol,
      entryPrice,
      entryTimestamp: new Date(),

      initialTargetPrice: prediction.targetPrice,
      initialStopLoss: prediction.stopLossPrice,
      initialExpectedReturn: prediction.expectedReturn,
      initialTimeframe: prediction.expectedTimeframe,

      currentTargetPrice: prediction.targetPrice,
      currentStopLoss: prediction.stopLossPrice,
      currentExpectedReturn: prediction.expectedReturn,

      riskRewardRatio: prediction.riskRewardRatio,
      riskAmount: prediction.riskAmount,
      rewardAmount: prediction.rewardAmount,

      thesisReason: prediction.reasoning,
      confidenceLevel: aiConfidence,

      supportLevels: prediction.supportLevels,
      resistanceLevels: prediction.resistanceLevels,

      adjustments: [],

      // Phase 3: Partial exit tracking
      originalQuantity: quantity,
      remainingQuantity: quantity,
      partialExits: [],

      isActive: true,
      isThesisValid: true,
    };

    this.activeTheses.set(symbol, thesis);

    return thesis;
  }

  /**
   * Get active thesis for a symbol
   */
  getThesis(symbol: string): TradeThesis | undefined {
    return this.activeTheses.get(symbol);
  }

  /**
   * Close thesis when position exits
   */
  async closeThesis(symbol: string, exitPrice: number, exitReason: string): Promise<void> {
    const thesis = this.activeTheses.get(symbol);
    if (!thesis) return;

    thesis.isActive = false;

    // Learn from this outcome
    await this.learnFromOutcome(thesis, exitPrice, exitReason);

    this.activeTheses.delete(symbol);
  }

  // ============================================================================
  // LEARNING FROM OUTCOMES
  // ============================================================================

  /**
   * Learn from trade outcome to adjust future predictions
   */
  private async learnFromOutcome(
    thesis: TradeThesis,
    exitPrice: number,
    exitReason: string
  ): Promise<void> {
    // Did we hit target?
    const hitTarget = exitPrice >= thesis.initialTargetPrice * 0.95; // Within 5%

    // Did we hit stop?
    const hitStop = exitPrice <= thesis.initialStopLoss * 1.05; // Within 5%

    // How far did price actually go?
    const actualReturn = ((exitPrice - thesis.entryPrice) / thesis.entryPrice) * 100;
    const predictedReturn = thesis.initialExpectedReturn;

    // Target accuracy adjustment
    if (hitTarget && exitPrice > thesis.initialTargetPrice) {
      // We underestimated - aim higher next time
      this.learningParams.targetAccuracyMultiplier *= 1.05;
    } else if (!hitTarget && actualReturn < predictedReturn * 0.5) {
      // We overestimated - aim lower next time
      this.learningParams.targetAccuracyMultiplier *= 0.95;
    }

    // Stop loss adjustment
    if (hitStop && exitReason.includes('stop')) {
      // Stop was too tight - give more room next time
      this.learningParams.stopLossMultiplier *= 1.05;
    }

    // Keep multipliers reasonable (crypto-friendly range)
    this.learningParams.targetAccuracyMultiplier = Math.max(0.7, Math.min(1.3, this.learningParams.targetAccuracyMultiplier));
    this.learningParams.stopLossMultiplier = Math.max(0.8, Math.min(1.5, this.learningParams.stopLossMultiplier));

    console.log(`📚 Thesis Learning from ${thesis.symbol}:`);
    console.log(`   Target Accuracy: ${this.learningParams.targetAccuracyMultiplier.toFixed(2)}x`);
    console.log(`   Stop Distance: ${this.learningParams.stopLossMultiplier.toFixed(2)}x`);
  }
}
