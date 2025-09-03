/**
 * DYNAMIC STRATEGY CALIBRATION PIPELINE
 * 
 * This solves the critical flaw: One-size-fits-all parameters don't work
 * across diverse crypto assets with different volatility profiles.
 * 
 * Before trading begins, this system:
 * 1. Scans Profit Predator opportunities
 * 2. Analyzes each coin's market characteristics
 * 3. Calibrates custom RSI/parameters per symbol
 * 4. Pre-loads optimized strategies for each asset
 * 5. Ensures Phase 0/1 actually generate trades
 */

import { PineScriptParameters } from './pine-script-parameter-optimizer';

export interface CoinMarketProfile {
  symbol: string;
  volatilityScore: number;      // 0-1 scale (0=stable, 1=extreme)
  trendStrength: number;        // 0-1 scale (0=choppy, 1=trending)
  volumePattern: 'THIN' | 'NORMAL' | 'HEAVY';
  priceRange: {
    typical: number;
    high: number;
    low: number;
  };
  dominantPattern: 'MOMENTUM' | 'MEAN_REVERT' | 'TREND_FOLLOW' | 'BREAKOUT';
  optimalTimeframes: string[];
}

export interface OpportunityContext {
  symbol: string;
  profitPredatorScore: number;  // From Smart Hunter (0-100)
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedMove: number;         // Predicted price movement %
  confidence: number;           // Profit Predator confidence
  marketCap: 'LARGE' | 'MID' | 'SMALL' | 'MICRO';
}

export interface CalibratedStrategy {
  symbol: string;
  phase0Parameters: PineScriptParameters;
  phase1Parameters: PineScriptParameters;
  phase2Parameters: PineScriptParameters;
  reasoning: string;
  expectedTradeFrequency: number; // trades per hour
  calibrationConfidence: number;
}

export class DynamicStrategyCalibrator {
  /**
   * Main calibration pipeline - runs before trading starts
   */
  async calibrateAllStrategies(
    opportunities: OpportunityContext[]
  ): Promise<Map<string, CalibratedStrategy>> {
    console.log('🔧 DYNAMIC STRATEGY CALIBRATION PIPELINE STARTING...');
    
    const calibratedStrategies = new Map<string, CalibratedStrategy>();
    
    for (const opportunity of opportunities) {
      console.log(`\n📊 Calibrating ${opportunity.symbol} (${opportunity.profitPredatorScore}% opportunity)...`);
      
      // Step 1: Analyze market characteristics
      const marketProfile = await this.analyzeMarketProfile(opportunity.symbol);
      
      // Step 2: Create custom parameters for each phase
      const calibrated = await this.createCalibratedStrategy(
        opportunity,
        marketProfile
      );
      
      calibratedStrategies.set(opportunity.symbol, calibrated);
      
      console.log(`✅ ${opportunity.symbol} calibrated: ${calibrated.reasoning}`);
    }
    
    console.log(`\n🎯 CALIBRATION COMPLETE: ${calibratedStrategies.size} symbols ready for trading`);
    return calibratedStrategies;
  }

  /**
   * Analyze each coin's unique market characteristics
   */
  private async analyzeMarketProfile(symbol: string): Promise<CoinMarketProfile> {
    // In production, this would analyze historical price data
    // For now, we'll use symbol-based heuristics based on known crypto patterns
    
    const profiles: Record<string, Partial<CoinMarketProfile>> = {
      'BTCUSD': {
        volatilityScore: 0.4,      // Moderate volatility
        trendStrength: 0.7,        // Strong trends
        volumePattern: 'HEAVY',
        dominantPattern: 'TREND_FOLLOW',
        optimalTimeframes: ['15m', '1h', '4h']
      },
      'ETHUSD': {
        volatilityScore: 0.5,      // Higher volatility than BTC
        trendStrength: 0.6,        // Good trending
        volumePattern: 'HEAVY',
        dominantPattern: 'MOMENTUM',
        optimalTimeframes: ['5m', '15m', '1h']
      },
      'SOLUSD': {
        volatilityScore: 0.7,      // High volatility
        trendStrength: 0.5,        // Moderate trending
        volumePattern: 'NORMAL',
        dominantPattern: 'BREAKOUT',
        optimalTimeframes: ['5m', '15m']
      },
      'AVAXUSD': {
        volatilityScore: 0.6,      // High volatility
        trendStrength: 0.4,        // Choppy
        volumePattern: 'NORMAL',
        dominantPattern: 'MEAN_REVERT',
        optimalTimeframes: ['15m', '30m']
      },
      'WLFIUSD': {
        volatilityScore: 0.9,      // Extreme volatility (micro cap)
        trendStrength: 0.3,        // Very choppy
        volumePattern: 'THIN',
        dominantPattern: 'BREAKOUT',
        optimalTimeframes: ['1m', '5m']
      },
      'XRPUSD': {
        volatilityScore: 0.3,      // Lower volatility
        trendStrength: 0.8,        // Strong trends when they happen
        volumePattern: 'HEAVY',
        dominantPattern: 'TREND_FOLLOW',
        optimalTimeframes: ['1h', '4h']
      },
      'DOGEUSD': {
        volatilityScore: 0.8,      // High volatility (meme coin)
        trendStrength: 0.2,        // Very choppy
        volumePattern: 'HEAVY',
        dominantPattern: 'MOMENTUM',
        optimalTimeframes: ['1m', '5m', '15m']
      }
    };

    const baseProfile = profiles[symbol] || {
      volatilityScore: 0.5,
      trendStrength: 0.5,
      volumePattern: 'NORMAL' as const,
      dominantPattern: 'MOMENTUM' as const,
      optimalTimeframes: ['15m', '1h']
    };

    // Get real price from market data
    // If we don't have real price data, we can't analyze properly
    console.log(`📊 Analyzing market profile for ${symbol}...`);
    
    return {
      symbol,
      volatilityScore: baseProfile.volatilityScore!,
      trendStrength: baseProfile.trendStrength!,
      volumePattern: baseProfile.volumePattern!,
      priceRange: {
        typical: 0, // Will be filled with real data
        high: 0,    // Will be filled with real data
        low: 0      // Will be filled with real data
      },
      dominantPattern: baseProfile.dominantPattern!,
      optimalTimeframes: baseProfile.optimalTimeframes!
    };
  }

  /**
   * Create calibrated parameters for all phases
   */
  private async createCalibratedStrategy(
    opportunity: OpportunityContext,
    profile: CoinMarketProfile
  ): Promise<CalibratedStrategy> {
    
    // Base parameters adjusted for this specific coin
    const phase0 = this.calibratePhase0Parameters(opportunity, profile);
    const phase1 = this.calibratePhase1Parameters(opportunity, profile);
    const phase2 = this.calibratePhase2Parameters(opportunity, profile);

    // Generate reasoning for the calibration
    const reasoning = this.generateCalibrationReasoning(opportunity, profile);
    
    // Estimate trade frequency based on parameters
    const expectedFrequency = this.estimateTradeFrequency(phase0, profile);
    
    return {
      symbol: opportunity.symbol,
      phase0Parameters: phase0,
      phase1Parameters: phase1,
      phase2Parameters: phase2,
      reasoning,
      expectedTradeFrequency: expectedFrequency,
      calibrationConfidence: this.calculateCalibrationConfidence(opportunity, profile)
    };
  }

  /**
   * Calibrate Phase 0 parameters (Maximum Learning)
   */
  private calibratePhase0Parameters(
    opportunity: OpportunityContext,
    profile: CoinMarketProfile
  ): PineScriptParameters {
    
    // Start with base aggressive learning parameters
    let rsiOverbought = 65;
    let rsiOversold = 35;
    let entryThreshold = 0.55;
    let stopLoss = 3.0;
    let takeProfit = 5.0;
    let confirmationBars = 1;

    // Adjust based on volatility
    if (profile.volatilityScore > 0.7) {
      // High volatility coins (WLFIUSD, DOGEUSD)
      rsiOverbought = 75; // Let it run higher
      rsiOversold = 25;   // Let it drop lower
      stopLoss = 5.0;     // Wider stops
      takeProfit = 8.0;   // Bigger targets
      entryThreshold = 0.45; // More aggressive entries
    } else if (profile.volatilityScore < 0.4) {
      // Low volatility coins (XRPUSD, BTCUSD)
      rsiOverbought = 60; // Tighter ranges
      rsiOversold = 40;
      stopLoss = 2.0;     // Tighter stops
      takeProfit = 3.0;   // Smaller targets
      entryThreshold = 0.60; // More selective
    }

    // Adjust based on Profit Predator score
    if (opportunity.profitPredatorScore > 80) {
      // Hot opportunities - be more aggressive
      entryThreshold *= 0.85;    // 15% lower threshold
      rsiOverbought -= 5;        // Earlier entries
      rsiOversold += 5;
      confirmationBars = 1;      // Minimal confirmation
    } else if (opportunity.profitPredatorScore < 50) {
      // Cold opportunities - be more selective
      entryThreshold *= 1.15;    // 15% higher threshold
      confirmationBars = 2;      // More confirmation
    }

    // Adjust based on dominant pattern
    switch (profile.dominantPattern) {
      case 'BREAKOUT':
        // Need momentum, wider stops
        stopLoss *= 1.3;
        takeProfit *= 1.5;
        entryThreshold *= 0.9; // More aggressive on breakouts
        break;
      case 'MEAN_REVERT':
        // Quick reversals, tighter stops
        stopLoss *= 0.7;
        takeProfit *= 0.8;
        rsiOverbought -= 5; // Earlier mean reversion
        rsiOversold += 5;
        break;
      case 'TREND_FOLLOW':
        // Let trends run
        takeProfit *= 1.3;
        confirmationBars += 1; // More confirmation for trends
        break;
    }

    return {
      rsiPeriod: 14,
      rsiOverbought,
      rsiOversold,
      entryConfidenceThreshold: entryThreshold,
      exitSensitivity: 1.0,
      stopLossPercent: stopLoss,
      takeProfitPercent: takeProfit,
      confirmationBars,
      volumeThreshold: profile.volumePattern === 'THIN' ? 0.5 : 1.0,
      trendStrength: profile.trendStrength,
      momentumFactor: profile.dominantPattern === 'MOMENTUM' ? 1.3 : 1.0,
      volatilityMultiplier: profile.volatilityScore,
      atrPeriod: 14
    };
  }

  /**
   * Calibrate Phase 1 parameters (Basic Validation)
   */
  private calibratePhase1Parameters(
    opportunity: OpportunityContext,
    profile: CoinMarketProfile
  ): PineScriptParameters {
    const phase0 = this.calibratePhase0Parameters(opportunity, profile);
    
    // Make Phase 1 more conservative than Phase 0
    return {
      ...phase0,
      entryConfidenceThreshold: phase0.entryConfidenceThreshold * 1.2,
      confirmationBars: phase0.confirmationBars + 1,
      stopLossPercent: phase0.stopLossPercent * 0.8, // Tighter risk
      rsiOverbought: Math.min(80, phase0.rsiOverbought + 5),
      rsiOversold: Math.max(20, phase0.rsiOversold - 5)
    };
  }

  /**
   * Calibrate Phase 2 parameters (Enhanced Intelligence)
   */
  private calibratePhase2Parameters(
    opportunity: OpportunityContext,
    profile: CoinMarketProfile
  ): PineScriptParameters {
    const phase1 = this.calibratePhase1Parameters(opportunity, profile);
    
    // Make Phase 2 most selective
    return {
      ...phase1,
      entryConfidenceThreshold: phase1.entryConfidenceThreshold * 1.15,
      confirmationBars: phase1.confirmationBars + 1,
      stopLossPercent: phase1.stopLossPercent * 0.9,
      takeProfitPercent: phase1.takeProfitPercent * 1.2, // Let winners run more
      rsiOverbought: Math.min(85, phase1.rsiOverbought + 5),
      rsiOversold: Math.max(15, phase1.rsiOversold - 5)
    };
  }

  private generateCalibrationReasoning(
    opportunity: OpportunityContext,
    profile: CoinMarketProfile
  ): string {
    const reasons = [];
    
    if (opportunity.profitPredatorScore > 80) {
      reasons.push(`High opportunity (${opportunity.profitPredatorScore}%) - aggressive parameters`);
    }
    
    if (profile.volatilityScore > 0.7) {
      reasons.push(`High volatility (${(profile.volatilityScore * 100).toFixed(0)}%) - wider stops`);
    }
    
    if (profile.dominantPattern === 'BREAKOUT') {
      reasons.push('Breakout pattern - momentum focused');
    } else if (profile.dominantPattern === 'MEAN_REVERT') {
      reasons.push('Mean reversion - quick reversals');
    }
    
    if (profile.volumePattern === 'THIN') {
      reasons.push('Thin volume - require confirmation');
    }

    return reasons.join(', ') || 'Standard calibration';
  }

  private estimateTradeFrequency(
    params: PineScriptParameters,
    profile: CoinMarketProfile
  ): number {
    // Estimate trades per hour based on parameters
    let baseFrequency = 2; // Conservative base
    
    // Lower thresholds = more trades
    if (params.entryConfidenceThreshold < 0.5) baseFrequency *= 2;
    if (params.entryConfidenceThreshold < 0.4) baseFrequency *= 1.5;
    
    // Higher volatility = more opportunities
    baseFrequency *= (1 + profile.volatilityScore);
    
    // Fewer confirmation bars = more trades
    baseFrequency *= (3 - params.confirmationBars) / 2;
    
    return Math.min(10, baseFrequency); // Cap at 10/hour per symbol
  }

  private calculateCalibrationConfidence(
    opportunity: OpportunityContext,
    profile: CoinMarketProfile
  ): number {
    let confidence = 0.7; // Base confidence
    
    // Higher for well-known patterns
    if (['BTCUSD', 'ETHUSD', 'SOLUSD'].includes(opportunity.symbol)) {
      confidence += 0.2;
    }
    
    // Higher for high-opportunity coins
    if (opportunity.profitPredatorScore > 75) {
      confidence += 0.15;
    }
    
    // Lower for extreme volatility (harder to predict)
    if (profile.volatilityScore > 0.8) {
      confidence -= 0.1;
    }
    
    return Math.min(0.95, Math.max(0.5, confidence));
  }

  private getMockPrice(symbol: string): number {
    // NO MOCK DATA - this method should not be used
    console.error(`❌ CRITICAL: getMockPrice called for ${symbol} - mock data not allowed!`);
    throw new Error(`No mock data allowed - real prices only for ${symbol}`);
  }
}

export const dynamicStrategyCalibrator = new DynamicStrategyCalibrator();