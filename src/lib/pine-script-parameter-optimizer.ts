/**
 * PINE SCRIPT PARAMETER OPTIMIZER
 * Dynamically tunes Pine Script strategy parameters based on:
 * 1. Market conditions (regime)
 * 2. Learning objectives (need more data)
 * 3. Performance feedback (what's working)
 * 4. Risk management (protect capital)
 * 
 * This replaces forced rotation with intelligent parameter adjustment,
 * creating natural trades with real P&L tracking.
 */

export interface PineScriptParameters {
  // RSI Parameters
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  
  // Entry/Exit Thresholds
  entryConfidenceThreshold: number;
  exitSensitivity: number;
  
  // Risk Management
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopPercent?: number;
  
  // Confirmation Requirements
  confirmationBars: number;
  volumeThreshold: number;
  
  // Trend Following
  trendStrength: number;
  momentumFactor: number;
  
  // Volatility Adjustments
  volatilityMultiplier: number;
  atrPeriod: number;
}

export interface MarketContext {
  volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  trend: 'STRONG_BULL' | 'BULL' | 'NEUTRAL' | 'BEAR' | 'STRONG_BEAR';
  volume: 'THIN' | 'NORMAL' | 'HEAVY';
  timeOfDay: 'ASIAN' | 'EUROPEAN' | 'US_OPEN' | 'US_CLOSE';
}

export interface LearningObjective {
  needMoreBuyData: boolean;
  needMoreSellData: boolean;
  needMoreVolatileData: boolean;
  currentDataCount: number;
  targetDataCount: number;
  recentWinRate: number;
}

export interface PerformanceMetrics {
  last10TradesWinRate: number;
  last50TradesWinRate: number;
  recentAvgProfit: number;
  recentAvgLoss: number;
  maxDrawdown: number;
  profitFactor: number;
}

export class PineScriptParameterOptimizer {
  // Base parameters for each phase
  private readonly PHASE_DEFAULTS: Record<number, PineScriptParameters> = {
    0: { // Maximum Learning Phase
      rsiPeriod: 14,
      rsiOverbought: 65,      // Lower = more sells
      rsiOversold: 35,        // Higher = more buys
      entryConfidenceThreshold: 0.55,
      exitSensitivity: 1.2,   // Quick exits for more data
      stopLossPercent: 3.0,   // Wider stops for learning
      takeProfitPercent: 5.0,
      confirmationBars: 1,    // Minimal confirmation
      volumeThreshold: 0.8,
      trendStrength: 0.3,     // Less trend dependency
      momentumFactor: 1.0,
      volatilityMultiplier: 1.2,
      atrPeriod: 14
    },
    1: { // Basic Validation Phase
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      entryConfidenceThreshold: 0.65,
      exitSensitivity: 1.0,
      stopLossPercent: 2.5,
      takeProfitPercent: 6.0,
      confirmationBars: 2,
      volumeThreshold: 1.0,
      trendStrength: 0.5,
      momentumFactor: 1.1,
      volatilityMultiplier: 1.0,
      atrPeriod: 14
    },
    2: { // Enhanced Intelligence Phase
      rsiPeriod: 14,
      rsiOverbought: 75,
      rsiOversold: 25,
      entryConfidenceThreshold: 0.75,
      exitSensitivity: 0.9,
      stopLossPercent: 2.0,
      takeProfitPercent: 8.0,
      confirmationBars: 3,
      volumeThreshold: 1.2,
      trendStrength: 0.7,
      momentumFactor: 1.2,
      volatilityMultiplier: 0.9,
      atrPeriod: 20
    }
  };

  /**
   * Optimize parameters based on current conditions and objectives
   */
  optimizeParameters(
    phase: number,
    marketContext: MarketContext,
    learningObjective: LearningObjective,
    performance: PerformanceMetrics
  ): PineScriptParameters {
    // Start with phase defaults
    let params = { ...this.PHASE_DEFAULTS[phase] || this.PHASE_DEFAULTS[0] };

    // Apply market context adjustments
    params = this.adjustForMarketContext(params, marketContext);

    // Apply learning objective adjustments
    params = this.adjustForLearningNeeds(params, learningObjective);

    // Apply performance-based optimization
    params = this.adjustForPerformance(params, performance);

    // Apply safety limits
    params = this.applySafetyLimits(params, phase);

    return params;
  }

  /**
   * Adjust parameters based on market conditions
   */
  private adjustForMarketContext(
    params: PineScriptParameters,
    context: MarketContext
  ): PineScriptParameters {
    const adjusted = { ...params };

    // Volatility adjustments
    switch (context.volatility) {
      case 'EXTREME':
        adjusted.stopLossPercent *= 1.5;      // Wider stops
        adjusted.takeProfitPercent *= 0.7;    // Quicker profits
        adjusted.confirmationBars += 1;       // More confirmation
        adjusted.volatilityMultiplier = 1.5;
        break;
      case 'HIGH':
        adjusted.stopLossPercent *= 1.2;
        adjusted.takeProfitPercent *= 0.85;
        adjusted.volatilityMultiplier = 1.2;
        break;
      case 'LOW':
        adjusted.stopLossPercent *= 0.8;      // Tighter stops
        adjusted.takeProfitPercent *= 1.2;    // Let winners run
        adjusted.confirmationBars = Math.max(1, adjusted.confirmationBars - 1);
        adjusted.volatilityMultiplier = 0.8;
        break;
    }

    // Trend adjustments
    switch (context.trend) {
      case 'STRONG_BULL':
        adjusted.rsiOverbought = 80;          // Can stay overbought
        adjusted.rsiOversold = 35;            // Quicker buy entries
        adjusted.trendStrength = 0.9;
        adjusted.takeProfitPercent *= 1.3;    // Ride the trend
        break;
      case 'STRONG_BEAR':
        adjusted.rsiOverbought = 65;          // Quicker sell entries
        adjusted.rsiOversold = 20;            // Can stay oversold
        adjusted.trendStrength = 0.9;
        adjusted.stopLossPercent *= 0.8;      // Tighter risk management
        break;
      case 'NEUTRAL':
        adjusted.rsiOverbought = 70;
        adjusted.rsiOversold = 30;
        adjusted.trendStrength = 0.3;         // Less trend reliance
        adjusted.exitSensitivity *= 1.1;      // Quicker exits in chop
        break;
    }

    // Volume adjustments
    if (context.volume === 'THIN') {
      adjusted.volumeThreshold *= 1.3;        // Require more volume
      adjusted.confirmationBars += 1;         // More confirmation
    } else if (context.volume === 'HEAVY') {
      adjusted.volumeThreshold *= 0.8;        // Volume already strong
      adjusted.entryConfidenceThreshold *= 0.95; // Slightly lower threshold
    }

    return adjusted;
  }

  /**
   * Adjust parameters to meet learning objectives
   */
  private adjustForLearningNeeds(
    params: PineScriptParameters,
    objective: LearningObjective
  ): PineScriptParameters {
    const adjusted = { ...params };

    // Need more data overall
    if (objective.currentDataCount < objective.targetDataCount * 0.5) {
      // Aggressive learning mode
      adjusted.entryConfidenceThreshold *= 0.85;
      adjusted.exitSensitivity *= 1.2;
      adjusted.confirmationBars = Math.max(1, adjusted.confirmationBars - 1);
    }

    // Need more buy signals
    if (objective.needMoreBuyData) {
      adjusted.rsiOversold = Math.min(40, adjusted.rsiOversold + 5);
      adjusted.entryConfidenceThreshold *= 0.9;
      // In bear trends, be more aggressive with buys
      adjusted.momentumFactor *= 0.9;
    }

    // Need more sell signals
    if (objective.needMoreSellData) {
      adjusted.rsiOverbought = Math.max(60, adjusted.rsiOverbought - 5);
      adjusted.entryConfidenceThreshold *= 0.9;
      // In bull trends, be more aggressive with sells
      adjusted.momentumFactor *= 0.9;
    }

    // Need volatile market data
    if (objective.needMoreVolatileData) {
      adjusted.volatilityMultiplier *= 1.1;
      adjusted.atrPeriod = Math.max(10, adjusted.atrPeriod - 2);
    }

    return adjusted;
  }

  /**
   * Optimize based on recent performance
   */
  private adjustForPerformance(
    params: PineScriptParameters,
    performance: PerformanceMetrics
  ): PineScriptParameters {
    const adjusted = { ...params };

    // Poor recent performance - tighten up
    if (performance.last10TradesWinRate < 0.35) {
      adjusted.entryConfidenceThreshold *= 1.15;  // Be more selective
      adjusted.confirmationBars += 1;              // More confirmation
      adjusted.stopLossPercent *= 0.9;             // Tighter stops
    }

    // Excellent recent performance - press advantage
    if (performance.last10TradesWinRate > 0.65) {
      adjusted.entryConfidenceThreshold *= 0.95;  // Slightly more aggressive
      adjusted.takeProfitPercent *= 1.2;           // Let winners run
    }

    // Adjust risk based on profit factor
    if (performance.profitFactor < 1.0) {
      // Losing money - reduce risk
      adjusted.stopLossPercent = Math.min(adjusted.stopLossPercent, 2.0);
      adjusted.exitSensitivity *= 1.1;             // Quicker exits
    } else if (performance.profitFactor > 1.5) {
      // Making good money - can take more risk
      adjusted.takeProfitPercent *= 1.1;
      adjusted.trailingStopPercent = adjusted.stopLossPercent * 0.7;
    }

    // Drawdown protection
    if (performance.maxDrawdown < -500) {
      adjusted.entryConfidenceThreshold *= 1.2;   // Much more selective
      adjusted.stopLossPercent *= 0.7;             // Very tight stops
      adjusted.confirmationBars += 2;              // Much more confirmation
    }

    return adjusted;
  }

  /**
   * Apply safety limits to prevent extreme parameters
   */
  private applySafetyLimits(
    params: PineScriptParameters,
    phase: number
  ): PineScriptParameters {
    const limited = { ...params };

    // RSI limits
    limited.rsiOverbought = Math.min(85, Math.max(60, limited.rsiOverbought));
    limited.rsiOversold = Math.max(15, Math.min(40, limited.rsiOversold));

    // Risk limits
    limited.stopLossPercent = Math.min(5.0, Math.max(0.5, limited.stopLossPercent));
    limited.takeProfitPercent = Math.min(20.0, Math.max(1.0, limited.takeProfitPercent));

    // Confidence limits
    limited.entryConfidenceThreshold = Math.min(0.95, Math.max(0.3, limited.entryConfidenceThreshold));

    // Confirmation limits based on phase
    const maxConfirmation = phase === 0 ? 2 : phase === 1 ? 3 : 4;
    limited.confirmationBars = Math.min(maxConfirmation, Math.max(1, limited.confirmationBars));

    // Sensitivity limits
    limited.exitSensitivity = Math.min(2.0, Math.max(0.5, limited.exitSensitivity));
    limited.volatilityMultiplier = Math.min(2.0, Math.max(0.5, limited.volatilityMultiplier));

    return limited;
  }

  /**
   * Generate parameter explanation for logging
   */
  explainParameters(params: PineScriptParameters): string {
    const aggressive = params.entryConfidenceThreshold < 0.6;
    const conservative = params.entryConfidenceThreshold > 0.75;
    
    const descriptions = [];
    
    if (aggressive) {
      descriptions.push('AGGRESSIVE: Lower entry thresholds for more trades');
    } else if (conservative) {
      descriptions.push('CONSERVATIVE: Higher entry thresholds for quality');
    } else {
      descriptions.push('BALANCED: Standard entry thresholds');
    }

    if (params.rsiOverbought < 70) {
      descriptions.push(`RSI Overbought: ${params.rsiOverbought} (more sells)`);
    }
    if (params.rsiOversold > 30) {
      descriptions.push(`RSI Oversold: ${params.rsiOversold} (more buys)`);
    }

    descriptions.push(`Risk: ${params.stopLossPercent.toFixed(1)}% stop, ${params.takeProfitPercent.toFixed(1)}% target`);
    descriptions.push(`Confirmation: ${params.confirmationBars} bars`);

    return descriptions.join(' | ');
  }
}

export const pineScriptOptimizer = new PineScriptParameterOptimizer();