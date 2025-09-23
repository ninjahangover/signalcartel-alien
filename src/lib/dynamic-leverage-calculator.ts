/**
 * DYNAMIC LEVERAGE CALCULATOR
 * Mathematically determines optimal leverage (1-5x) based on:
 * - Market volatility and conditions
 * - AI confidence levels
 * - Price action strength
 * - Risk/reward ratio
 * - Regime analysis
 */

import { RegimeContext } from './real-time-regime-monitor';
import { mathIntuitionEngine } from './mathematical-intuition-engine';
import { bayesianProbabilityEngine } from './bayesian-probability-engine';

export interface LeverageFactors {
  confidence: number;           // AI confidence (0-1)
  volatility: number;          // Market volatility level
  trendStrength: number;       // Trend strength (0-1)
  priceActionQuality: number;  // Price action quality (0-1)
  riskRewardRatio: number;     // Risk/reward ratio
  regimeStability: number;     // Market regime stability
  marketStructure: number;     // Market structure quality
}

export interface LeverageDecision {
  leverage: number;            // Final leverage (1-5)
  confidence: number;          // Confidence in leverage decision
  reasoning: string[];         // Explanation of decision
  riskAdjustment: number;     // Risk adjustment factor
  maxPositionSize: number;    // Max position size with this leverage
}

export class DynamicLeverageCalculator {
  private readonly MIN_LEVERAGE = 1;
  private readonly MAX_LEVERAGE = 5;
  private readonly BASE_CONFIDENCE_THRESHOLD = 0.6;

  /**
   * Calculate optimal leverage based on mathematical analysis
   */
  async calculateOptimalLeverage(
    symbol: string,
    price: number,
    stopLoss: number,
    takeProfit: number,
    aiConfidence: number,
    regimeContext?: RegimeContext
  ): Promise<LeverageDecision> {

    // Gather all leverage factors
    const factors = await this.gatherLeverageFactors(
      symbol, price, stopLoss, takeProfit, aiConfidence, regimeContext
    );

    // Calculate base leverage from mathematical models
    const baseLeverage = this.calculateBaseLeverage(factors);

    // Apply regime-based adjustments
    const regimeAdjustedLeverage = this.applyRegimeAdjustments(baseLeverage, factors);

    // Apply risk-based limits
    const riskAdjustedLeverage = this.applyRiskLimits(regimeAdjustedLeverage, factors);

    // Final leverage (clamped to 1-5 range)
    const finalLeverage = Math.max(this.MIN_LEVERAGE, Math.min(this.MAX_LEVERAGE, riskAdjustedLeverage));

    // Calculate confidence and reasoning
    const confidence = this.calculateLeverageConfidence(factors, finalLeverage);
    const reasoning = this.generateReasoning(factors, finalLeverage);

    // Calculate max position size with this leverage
    const maxPositionSize = this.calculateMaxPositionSize(factors, finalLeverage);

    return {
      leverage: Math.round(finalLeverage * 10) / 10, // Round to 1 decimal
      confidence,
      reasoning,
      riskAdjustment: this.calculateRiskAdjustment(factors),
      maxPositionSize
    };
  }

  /**
   * Gather all factors that influence leverage decision
   */
  private async gatherLeverageFactors(
    symbol: string,
    price: number,
    stopLoss: number,
    takeProfit: number,
    aiConfidence: number,
    regimeContext?: RegimeContext
  ): Promise<LeverageFactors> {

    // Calculate risk/reward ratio
    const stopDistance = Math.abs(price - stopLoss) / price;
    const profitDistance = Math.abs(takeProfit - price) / price;
    const riskRewardRatio = profitDistance / stopDistance;

    // Get volatility from regime context or calculate
    const volatility = regimeContext?.volatility.current || this.estimateVolatility(symbol);

    // Calculate trend strength
    const trendStrength = regimeContext?.trend.strength || 0.5;

    // Assess price action quality (higher = cleaner breakouts/patterns)
    const priceActionQuality = await this.assessPriceActionQuality(symbol, price);

    // Market structure quality (support/resistance clarity)
    const marketStructure = await this.assessMarketStructure(symbol);

    // Regime stability
    const regimeStability = regimeContext?.stability || 0.5;

    return {
      confidence: aiConfidence,
      volatility,
      trendStrength,
      priceActionQuality,
      riskRewardRatio,
      regimeStability,
      marketStructure
    };
  }

  /**
   * Calculate base leverage using mathematical models
   */
  private calculateBaseLeverage(factors: LeverageFactors): number {
    let baseLeverage = 1;

    // HIGH CONFIDENCE = HIGHER LEVERAGE
    if (factors.confidence > 0.8) {
      baseLeverage += 2.0; // +2x for very high confidence
    } else if (factors.confidence > 0.7) {
      baseLeverage += 1.5; // +1.5x for high confidence
    } else if (factors.confidence > 0.6) {
      baseLeverage += 1.0; // +1x for good confidence
    }

    // STRONG TRENDS = MORE LEVERAGE
    if (factors.trendStrength > 0.8) {
      baseLeverage += 1.5; // Strong trend momentum
    } else if (factors.trendStrength > 0.6) {
      baseLeverage += 1.0; // Moderate trend
    }

    // GOOD RISK/REWARD = MORE LEVERAGE
    if (factors.riskRewardRatio > 3.0) {
      baseLeverage += 1.0; // Excellent R:R
    } else if (factors.riskRewardRatio > 2.0) {
      baseLeverage += 0.5; // Good R:R
    }

    // PRICE ACTION QUALITY
    if (factors.priceActionQuality > 0.8) {
      baseLeverage += 0.5; // Clean breakouts/patterns
    }

    return baseLeverage;
  }

  /**
   * Apply regime-based adjustments
   */
  private applyRegimeAdjustments(baseLeverage: number, factors: LeverageFactors): number {
    let adjustedLeverage = baseLeverage;

    // REDUCE LEVERAGE IN UNSTABLE REGIMES
    if (factors.regimeStability < 0.4) {
      adjustedLeverage *= 0.7; // 30% reduction for unstable regimes
    } else if (factors.regimeStability < 0.6) {
      adjustedLeverage *= 0.85; // 15% reduction for moderate instability
    }

    // HIGH VOLATILITY = LOWER LEVERAGE
    if (factors.volatility > 0.8) {
      adjustedLeverage *= 0.6; // Significant reduction for high volatility
    } else if (factors.volatility > 0.6) {
      adjustedLeverage *= 0.8; // Moderate reduction
    }

    return adjustedLeverage;
  }

  /**
   * Apply final risk-based limits
   */
  private applyRiskLimits(leverage: number, factors: LeverageFactors): number {
    let finalLeverage = leverage;

    // MINIMUM CONFIDENCE THRESHOLD
    if (factors.confidence < this.BASE_CONFIDENCE_THRESHOLD) {
      finalLeverage = Math.min(finalLeverage, 2); // Max 2x for low confidence
    }

    // POOR MARKET STRUCTURE = LIMITED LEVERAGE
    if (factors.marketStructure < 0.5) {
      finalLeverage = Math.min(finalLeverage, 2.5);
    }

    // VERY HIGH VOLATILITY = MAX 2X
    if (factors.volatility > 0.9) {
      finalLeverage = Math.min(finalLeverage, 2);
    }

    return finalLeverage;
  }

  /**
   * Calculate confidence in the leverage decision
   */
  private calculateLeverageConfidence(factors: LeverageFactors, leverage: number): number {
    let confidence = 0.5;

    // Higher confidence when all factors align
    confidence += factors.confidence * 0.3;
    confidence += factors.trendStrength * 0.2;
    confidence += factors.regimeStability * 0.2;
    confidence += Math.min(factors.riskRewardRatio / 3, 1) * 0.15;
    confidence += factors.priceActionQuality * 0.1;
    confidence += factors.marketStructure * 0.05;

    // Reduce confidence for extreme leverage
    if (leverage > 4) confidence *= 0.9;
    if (leverage < 1.5) confidence *= 0.95;

    return Math.min(1, confidence);
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(factors: LeverageFactors, leverage: number): string[] {
    const reasoning: string[] = [];

    reasoning.push(`AI Confidence: ${(factors.confidence * 100).toFixed(1)}%`);
    reasoning.push(`Trend Strength: ${(factors.trendStrength * 100).toFixed(1)}%`);
    reasoning.push(`Risk/Reward: ${factors.riskRewardRatio.toFixed(2)}:1`);
    reasoning.push(`Volatility: ${(factors.volatility * 100).toFixed(1)}%`);
    reasoning.push(`Regime Stability: ${(factors.regimeStability * 100).toFixed(1)}%`);

    if (leverage >= 4) {
      reasoning.push("🚀 High leverage justified by strong signals");
    } else if (leverage >= 3) {
      reasoning.push("📈 Moderate-high leverage for good opportunity");
    } else if (leverage >= 2) {
      reasoning.push("⚖️ Balanced leverage for moderate opportunity");
    } else {
      reasoning.push("🛡️ Conservative leverage due to uncertainty");
    }

    return reasoning;
  }

  /**
   * Calculate max position size for given leverage
   */
  private calculateMaxPositionSize(factors: LeverageFactors, leverage: number): number {
    const basePosition = 1000; // Base $1000 position
    const leverageMultiplier = leverage;
    const confidenceMultiplier = Math.min(factors.confidence * 1.5, 1);

    return basePosition * leverageMultiplier * confidenceMultiplier;
  }

  /**
   * Calculate risk adjustment factor
   */
  private calculateRiskAdjustment(factors: LeverageFactors): number {
    let adjustment = 1.0;

    // Reduce risk for high volatility
    adjustment *= (1 - factors.volatility * 0.3);

    // Reduce risk for low confidence
    adjustment *= (0.5 + factors.confidence * 0.5);

    return Math.max(0.3, adjustment);
  }

  /**
   * Estimate volatility if not provided
   */
  private estimateVolatility(symbol: string): number {
    // Default volatility estimates by asset type
    const volatilityMap: Record<string, number> = {
      'BTC': 0.4,
      'ETH': 0.5,
      'SOL': 0.6,
      'AVAX': 0.6,
      'BNB': 0.5
    };

    const base = symbol.replace('USDT', '').replace('USD', '');
    return volatilityMap[base] || 0.6; // Default to moderate-high volatility
  }

  /**
   * Assess price action quality using mathematical algorithms
   */
  private async assessPriceActionQuality(symbol: string, price: number): Promise<number> {
    try {
      // Get assessment from mathematical intuition engine
      const mathAssessment = await mathIntuitionEngine.assessOpportunity({
        symbol,
        price,
        timestamp: new Date()
      });

      // Convert mathematical assessment to price action quality score
      const quality = Math.min(1, mathAssessment.strength * mathAssessment.confidence);

      console.log(`🧮 Price Action Quality for ${symbol}: ${(quality * 100).toFixed(1)}%`);
      return quality;
    } catch (error) {
      console.warn(`⚠️ Could not assess price action quality for ${symbol}:`, error.message);
      return 0.6; // Default moderate quality
    }
  }

  /**
   * Assess market structure quality using Bayesian analysis
   */
  private async assessMarketStructure(symbol: string): Promise<number> {
    try {
      // Get Bayesian probability assessment
      const bayesianAssessment = await bayesianProbabilityEngine.calculateProbabilities({
        symbol,
        price: 0, // Will be filled by the engine
        volume: 0,
        timestamp: new Date()
      });

      // Use trend probability as market structure indicator
      const structureQuality = Math.max(
        bayesianAssessment.probabilities.upTrend,
        bayesianAssessment.probabilities.downTrend
      );

      console.log(`📊 Market Structure Quality for ${symbol}: ${(structureQuality * 100).toFixed(1)}%`);
      return structureQuality;
    } catch (error) {
      console.warn(`⚠️ Could not assess market structure for ${symbol}:`, error.message);
      return 0.6; // Default moderate structure
    }
  }
}

// Global instance
export const dynamicLeverageCalculator = new DynamicLeverageCalculator();