/**
 * Temporal Threshold Evolution System
 * 
 * Tracks how optimal thresholds change over time and adapts to:
 * - Market regime changes
 * - Seasonal patterns
 * - Volatility shifts
 * - Pair-specific evolution
 */

export interface ThresholdSnapshot {
  timestamp: Date;
  thresholds: {
    information: number;
    consensus: number;
    confidence: number;
    minProfit: number;
  };
  performance: {
    winRate: number;
    avgReturn: number;
    tradeCount: number;
  };
  marketContext: {
    volatility: number;
    trend: 'bull' | 'bear' | 'sideways';
    volume: number;
  };
}

export interface EvolvingThresholds {
  symbol: string;
  
  // Current best thresholds
  current: ThresholdSnapshot;
  
  // Historical evolution
  history: ThresholdSnapshot[];
  
  // Time-weighted moving averages
  shortTermMA: ThresholdSnapshot;  // Last 24 hours
  mediumTermMA: ThresholdSnapshot; // Last 7 days
  longTermMA: ThresholdSnapshot;   // Last 30 days
  
  // Rate of change
  momentum: {
    information: number;  // How fast is this threshold changing?
    consensus: number;
    confidence: number;
    minProfit: number;
  };
  
  // Stability metrics
  volatilityOfThresholds: number;  // How stable are the thresholds?
  convergenceRate: number;          // Are we converging to optimal?
}

export class TemporalThresholdEvolution {
  private evolvingThresholds: Map<string, EvolvingThresholds> = new Map();
  private readonly MAX_HISTORY_LENGTH = 1000;
  private readonly ADAPTATION_RATES = {
    fast: 0.2,    // For recent data (last hour)
    medium: 0.1,   // For medium-term data (last day)
    slow: 0.05     // For long-term data (last week)
  };
  
  /**
   * Update thresholds with new performance data
   */
  updateThresholds(
    symbol: string,
    currentPerformance: {
      winRate: number;
      avgReturn: number;
      trades: any[];
    },
    marketContext: {
      volatility: number;
      trend: 'bull' | 'bear' | 'sideways';
      volume: number;
    }
  ): void {
    if (!this.evolvingThresholds.has(symbol)) {
      this.initializeEvolution(symbol);
    }
    
    const evolution = this.evolvingThresholds.get(symbol)!;
    const trades = currentPerformance.trades;
    
    // Calculate new optimal thresholds based on recent performance
    const newThresholds = this.calculateOptimalThresholds(trades);
    
    // Apply temporal smoothing - don't jump too quickly
    const smoothedThresholds = this.applyTemporalSmoothing(
      evolution.current.thresholds,
      newThresholds,
      currentPerformance.winRate
    );
    
    // Create new snapshot
    const snapshot: ThresholdSnapshot = {
      timestamp: new Date(),
      thresholds: smoothedThresholds,
      performance: {
        winRate: currentPerformance.winRate,
        avgReturn: currentPerformance.avgReturn,
        tradeCount: trades.length
      },
      marketContext
    };
    
    // Update evolution tracking
    this.updateEvolution(evolution, snapshot);
    
    // Detect regime changes and adapt faster if needed
    this.detectAndAdaptToRegimeChange(evolution, marketContext);
    
    // Log evolution progress
    this.logEvolutionProgress(symbol, evolution);
  }
  
  /**
   * Calculate optimal thresholds from recent trades
   */
  private calculateOptimalThresholds(trades: any[]): any {
    if (trades.length === 0) {
      return {
        information: 0.5,
        consensus: 0.3,
        confidence: 0.3,
        minProfit: 0.005
      };
    }
    
    // Sort by profitability
    const profitable = trades.filter(t => t.profitable);
    const unprofitable = trades.filter(t => !t.profitable);
    
    // Use Kernel Density Estimation to find optimal separation
    // For simplicity, using percentile method here
    const optimalThresholds = {
      information: 0.5,
      consensus: 0.3,
      confidence: 0.3,
      minProfit: 0.005
    };
    
    if (profitable.length > 0) {
      // Find threshold that captures most profitable trades
      const infoValues = profitable.map(t => t.informationContent).sort((a, b) => a - b);
      const consensusValues = profitable.map(t => t.consensusStrength).sort((a, b) => a - b);
      const confidenceValues = profitable.map(t => t.confidence).sort((a, b) => a - b);
      
      // Use lower quartile to capture 75% of profitable trades
      const q1Index = Math.floor(profitable.length * 0.25);
      
      optimalThresholds.information = infoValues[q1Index] || 0.5;
      optimalThresholds.consensus = consensusValues[q1Index] || 0.3;
      optimalThresholds.confidence = confidenceValues[q1Index] || 0.3;
      
      // Minimum profit based on actual profitable trades
      const returns = profitable.map(t => t.actualReturn).sort((a, b) => a - b);
      optimalThresholds.minProfit = returns[0] * 0.8 || 0.005; // 80% of minimum profitable
    }
    
    // Apply bounds
    optimalThresholds.information = Math.max(0.01, Math.min(5, optimalThresholds.information));
    optimalThresholds.consensus = Math.max(0.01, Math.min(0.95, optimalThresholds.consensus));
    optimalThresholds.confidence = Math.max(0.01, Math.min(0.95, optimalThresholds.confidence));
    optimalThresholds.minProfit = Math.max(0.0042, optimalThresholds.minProfit); // At least commission
    
    return optimalThresholds;
  }
  
  /**
   * Apply temporal smoothing to prevent erratic threshold changes
   */
  private applyTemporalSmoothing(
    current: any,
    proposed: any,
    winRate: number
  ): any {
    // Adaptation rate depends on performance
    let adaptationRate = this.ADAPTATION_RATES.medium;
    
    if (winRate > 0.6) {
      // Winning strategy - adapt slowly to preserve it
      adaptationRate = this.ADAPTATION_RATES.slow;
    } else if (winRate < 0.4) {
      // Losing strategy - adapt faster to find better thresholds
      adaptationRate = this.ADAPTATION_RATES.fast;
    }
    
    // Exponential moving average update
    return {
      information: current.information * (1 - adaptationRate) + proposed.information * adaptationRate,
      consensus: current.consensus * (1 - adaptationRate) + proposed.consensus * adaptationRate,
      confidence: current.confidence * (1 - adaptationRate) + proposed.confidence * adaptationRate,
      minProfit: current.minProfit * (1 - adaptationRate) + proposed.minProfit * adaptationRate
    };
  }
  
  /**
   * Update evolution tracking with new snapshot
   */
  private updateEvolution(evolution: EvolvingThresholds, snapshot: ThresholdSnapshot): void {
    // Add to history
    evolution.history.push(snapshot);
    if (evolution.history.length > this.MAX_HISTORY_LENGTH) {
      evolution.history.shift();
    }
    
    // Update current
    evolution.current = snapshot;
    
    // Calculate moving averages
    const now = Date.now();
    const hour24Ago = now - 24 * 60 * 60 * 1000;
    const days7Ago = now - 7 * 24 * 60 * 60 * 1000;
    const days30Ago = now - 30 * 24 * 60 * 60 * 1000;
    
    evolution.shortTermMA = this.calculateMA(evolution.history, hour24Ago);
    evolution.mediumTermMA = this.calculateMA(evolution.history, days7Ago);
    evolution.longTermMA = this.calculateMA(evolution.history, days30Ago);
    
    // Calculate momentum (rate of change)
    if (evolution.history.length > 1) {
      const prev = evolution.history[evolution.history.length - 2];
      const timeDelta = (snapshot.timestamp.getTime() - prev.timestamp.getTime()) / (1000 * 60 * 60); // Hours
      
      evolution.momentum = {
        information: (snapshot.thresholds.information - prev.thresholds.information) / timeDelta,
        consensus: (snapshot.thresholds.consensus - prev.thresholds.consensus) / timeDelta,
        confidence: (snapshot.thresholds.confidence - prev.thresholds.confidence) / timeDelta,
        minProfit: (snapshot.thresholds.minProfit - prev.thresholds.minProfit) / timeDelta
      };
    }
    
    // Calculate stability metrics
    evolution.volatilityOfThresholds = this.calculateThresholdVolatility(evolution.history);
    evolution.convergenceRate = this.calculateConvergenceRate(evolution.history);
  }
  
  /**
   * Calculate moving average of thresholds
   */
  private calculateMA(history: ThresholdSnapshot[], since: number): ThresholdSnapshot {
    const relevant = history.filter(h => h.timestamp.getTime() >= since);
    
    if (relevant.length === 0) {
      return history[history.length - 1]; // Return latest if no history
    }
    
    const avgThresholds = {
      information: 0,
      consensus: 0,
      confidence: 0,
      minProfit: 0
    };
    
    const avgPerformance = {
      winRate: 0,
      avgReturn: 0,
      tradeCount: 0
    };
    
    for (const snapshot of relevant) {
      avgThresholds.information += snapshot.thresholds.information;
      avgThresholds.consensus += snapshot.thresholds.consensus;
      avgThresholds.confidence += snapshot.thresholds.confidence;
      avgThresholds.minProfit += snapshot.thresholds.minProfit;
      
      avgPerformance.winRate += snapshot.performance.winRate;
      avgPerformance.avgReturn += snapshot.performance.avgReturn;
      avgPerformance.tradeCount += snapshot.performance.tradeCount;
    }
    
    const n = relevant.length;
    
    return {
      timestamp: new Date(),
      thresholds: {
        information: avgThresholds.information / n,
        consensus: avgThresholds.consensus / n,
        confidence: avgThresholds.confidence / n,
        minProfit: avgThresholds.minProfit / n
      },
      performance: {
        winRate: avgPerformance.winRate / n,
        avgReturn: avgPerformance.avgReturn / n,
        tradeCount: avgPerformance.tradeCount
      },
      marketContext: relevant[relevant.length - 1].marketContext // Use latest context
    };
  }
  
  /**
   * Calculate how volatile the thresholds have been
   */
  private calculateThresholdVolatility(history: ThresholdSnapshot[]): number {
    if (history.length < 2) return 0;
    
    const recent = history.slice(-20); // Last 20 snapshots
    let variance = 0;
    
    for (let i = 1; i < recent.length; i++) {
      const delta = {
        information: recent[i].thresholds.information - recent[i-1].thresholds.information,
        consensus: recent[i].thresholds.consensus - recent[i-1].thresholds.consensus,
        confidence: recent[i].thresholds.confidence - recent[i-1].thresholds.confidence
      };
      
      variance += delta.information ** 2 + delta.consensus ** 2 + delta.confidence ** 2;
    }
    
    return Math.sqrt(variance / recent.length);
  }
  
  /**
   * Calculate if thresholds are converging to stable values
   */
  private calculateConvergenceRate(history: ThresholdSnapshot[]): number {
    if (history.length < 10) return 0;
    
    const recent = history.slice(-10);
    const older = history.slice(-20, -10);
    
    if (older.length === 0) return 0;
    
    // Compare variance of recent vs older
    const recentVol = this.calculateThresholdVolatility(recent);
    const olderVol = this.calculateThresholdVolatility(older);
    
    // Convergence rate: negative means converging (volatility decreasing)
    return (recentVol - olderVol) / olderVol;
  }
  
  /**
   * Detect market regime changes and adapt faster
   */
  private detectAndAdaptToRegimeChange(
    evolution: EvolvingThresholds,
    currentContext: any
  ): void {
    if (evolution.history.length < 2) return;
    
    const prevContext = evolution.history[evolution.history.length - 2].marketContext;
    
    // Check for regime change
    const regimeChanged = 
      prevContext.trend !== currentContext.trend ||
      Math.abs(prevContext.volatility - currentContext.volatility) > 0.3;
    
    if (regimeChanged) {
      console.log(`🔄 Regime change detected for ${evolution.symbol}: ${prevContext.trend} → ${currentContext.trend}`);
      
      // Increase adaptation rate temporarily
      // This is handled in applyTemporalSmoothing based on performance
      
      // Could also reset to more neutral thresholds
      if (currentContext.volatility > prevContext.volatility * 1.5) {
        // High volatility - be more conservative
        evolution.current.thresholds.confidence *= 1.1;
        evolution.current.thresholds.minProfit *= 1.2;
      }
    }
  }
  
  /**
   * Initialize evolution tracking for a symbol
   */
  private initializeEvolution(symbol: string): void {
    const initial: ThresholdSnapshot = {
      timestamp: new Date(),
      thresholds: {
        information: 0.5,
        consensus: 0.3,
        confidence: 0.3,
        minProfit: 0.005
      },
      performance: {
        winRate: 0.5,
        avgReturn: 0,
        tradeCount: 0
      },
      marketContext: {
        volatility: 0.5,
        trend: 'sideways',
        volume: 1000000
      }
    };
    
    this.evolvingThresholds.set(symbol, {
      symbol,
      current: initial,
      history: [initial],
      shortTermMA: initial,
      mediumTermMA: initial,
      longTermMA: initial,
      momentum: {
        information: 0,
        consensus: 0,
        confidence: 0,
        minProfit: 0
      },
      volatilityOfThresholds: 0,
      convergenceRate: 0
    });
  }
  
  /**
   * Log evolution progress
   */
  private logEvolutionProgress(symbol: string, evolution: EvolvingThresholds): void {
    const current = evolution.current.thresholds;
    const performance = evolution.current.performance;
    
    console.log(`📈 ${symbol} Threshold Evolution:
      Current: Info=${current.information.toFixed(2)}, Consensus=${(current.consensus * 100).toFixed(1)}%, Conf=${(current.confidence * 100).toFixed(1)}%
      Performance: WinRate=${(performance.winRate * 100).toFixed(1)}%, AvgReturn=${(performance.avgReturn * 100).toFixed(3)}%
      Momentum: Info=${evolution.momentum.information.toFixed(4)}/hr
      Stability: Volatility=${evolution.volatilityOfThresholds.toFixed(4)}, Convergence=${evolution.convergenceRate.toFixed(3)}
      ${evolution.convergenceRate < 0 ? '✅ Converging' : '⚠️ Diverging'}`);
  }
  
  /**
   * Get current evolved thresholds for a symbol
   */
  getEvolvedThresholds(symbol: string): any {
    const evolution = this.evolvingThresholds.get(symbol);
    
    if (!evolution) {
      return {
        information: 0.5,
        consensus: 0.3,
        confidence: 0.3,
        minProfit: 0.005
      };
    }
    
    // Use weighted average of current and moving averages
    // More weight on recent data if performing well
    const weight = evolution.current.performance.winRate > 0.5 ? 0.7 : 0.5;
    
    return {
      information: evolution.current.thresholds.information * weight + 
                   evolution.shortTermMA.thresholds.information * (1 - weight),
      consensus: evolution.current.thresholds.consensus * weight + 
                 evolution.shortTermMA.thresholds.consensus * (1 - weight),
      confidence: evolution.current.thresholds.confidence * weight + 
                  evolution.shortTermMA.thresholds.confidence * (1 - weight),
      minProfit: evolution.current.thresholds.minProfit * weight + 
                 evolution.shortTermMA.thresholds.minProfit * (1 - weight)
    };
  }
}

// Singleton instance
export const thresholdEvolution = new TemporalThresholdEvolution();