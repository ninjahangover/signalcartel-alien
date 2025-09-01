/**
 * MARKET REGIME DETECTION SYSTEM
 * Prevents the "churn and burn" pattern by detecting when markets are unfavorable
 * 
 * Key Features:
 * 1. Performance trend analysis (sliding window)
 * 2. Win rate degradation detection
 * 3. Drawdown protection thresholds
 * 4. Market volatility assessment
 * 5. Intelligent pause/resume logic
 */

export interface MarketRegime {
  regime: 'FAVORABLE' | 'UNFAVORABLE' | 'NEUTRAL' | 'RECOVERY_OPPORTUNITY';
  confidence: number;
  reason: string;
  recommendation: 'CONTINUE' | 'PAUSE' | 'REDUCE_SIZE' | 'WAIT_FOR_OPPORTUNITY';
  metrics: {
    recentWinRate: number;
    performanceTrend: number;
    drawdown: number;
    volatilityScore: number;
    consecutiveLosses: number;
  };
}

export interface PerformanceWindow {
  trades: number;
  wins: number;
  totalPnL: number;
  avgPnL: number;
  timestamp: Date;
}

export class MarketRegimeDetector {
  private performanceHistory: PerformanceWindow[] = [];
  private readonly MAX_HISTORY_SIZE = 50;
  private readonly UNFAVORABLE_THRESHOLD = 0.40; // Win rate below 40%
  private readonly DRAWDOWN_THRESHOLD = -500; // Stop if down $500+
  private readonly CONSECUTIVE_LOSS_LIMIT = 8; // Pause after 8 consecutive losses

  /**
   * Analyze current market regime based on recent performance
   */
  analyzeRegime(currentMetrics: {
    totalTrades: number;
    winningTrades: number;
    totalPnL: number;
    recentTrades: any[];
  }): MarketRegime {
    // Update performance history
    this.updatePerformanceHistory(currentMetrics);

    // Calculate key metrics
    const recentWinRate = this.calculateRecentWinRate();
    const performanceTrend = this.calculatePerformanceTrend();
    const drawdown = this.calculateDrawdown(currentMetrics.totalPnL);
    const volatilityScore = this.calculateVolatilityScore();
    const consecutiveLosses = this.calculateConsecutiveLosses();

    const metrics = {
      recentWinRate,
      performanceTrend,
      drawdown,
      volatilityScore,
      consecutiveLosses
    };

    // Determine regime based on multiple factors
    return this.determineRegime(metrics);
  }

  private updatePerformanceHistory(currentMetrics: any): void {
    const window: PerformanceWindow = {
      trades: currentMetrics.totalTrades,
      wins: currentMetrics.winningTrades,
      totalPnL: currentMetrics.totalPnL,
      avgPnL: currentMetrics.totalTrades > 0 ? currentMetrics.totalPnL / currentMetrics.totalTrades : 0,
      timestamp: new Date()
    };

    this.performanceHistory.push(window);

    // Keep only recent history
    if (this.performanceHistory.length > this.MAX_HISTORY_SIZE) {
      this.performanceHistory.shift();
    }
  }

  private calculateRecentWinRate(): number {
    if (this.performanceHistory.length < 2) return 0.5;

    // Use last 10 windows for recent win rate
    const recentWindows = this.performanceHistory.slice(-10);
    if (recentWindows.length < 2) return 0.5;

    const recentTrades = recentWindows[recentWindows.length - 1].trades - recentWindows[0].trades;
    const recentWins = recentWindows[recentWindows.length - 1].wins - recentWindows[0].wins;

    return recentTrades > 0 ? recentWins / recentTrades : 0.5;
  }

  private calculatePerformanceTrend(): number {
    if (this.performanceHistory.length < 5) return 0;

    // Calculate trend over last 5 windows
    const recentWindows = this.performanceHistory.slice(-5);
    let trendSum = 0;

    for (let i = 1; i < recentWindows.length; i++) {
      const currentPnL = recentWindows[i].avgPnL;
      const previousPnL = recentWindows[i - 1].avgPnL;
      
      if (currentPnL > previousPnL) {
        trendSum += 1;
      } else if (currentPnL < previousPnL) {
        trendSum -= 1;
      }
    }

    return trendSum / (recentWindows.length - 1);
  }

  private calculateDrawdown(currentPnL: number): number {
    if (this.performanceHistory.length === 0) return 0;

    // Find peak PnL in history
    const peakPnL = Math.max(...this.performanceHistory.map(w => w.totalPnL), 0);
    
    return currentPnL - peakPnL;
  }

  private calculateVolatilityScore(): number {
    if (this.performanceHistory.length < 3) return 0.5;

    const recentAvgPnLs = this.performanceHistory.slice(-10).map(w => w.avgPnL);
    
    // Calculate standard deviation of recent average PnLs
    const mean = recentAvgPnLs.reduce((sum, val) => sum + val, 0) / recentAvgPnLs.length;
    const variance = recentAvgPnLs.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentAvgPnLs.length;
    const stdDev = Math.sqrt(variance);

    // Normalize to 0-1 scale (higher = more volatile)
    return Math.min(1, stdDev / 10);
  }

  private calculateConsecutiveLosses(): number {
    if (this.performanceHistory.length < 2) return 0;

    let consecutiveLosses = 0;
    
    // Count consecutive periods of negative performance trend
    for (let i = this.performanceHistory.length - 1; i > 0; i--) {
      const currentAvg = this.performanceHistory[i].avgPnL;
      const previousAvg = this.performanceHistory[i - 1].avgPnL;
      
      if (currentAvg < previousAvg) {
        consecutiveLosses++;
      } else {
        break;
      }
    }

    return consecutiveLosses;
  }

  private determineRegime(metrics: any): MarketRegime {
    const {
      recentWinRate,
      performanceTrend,
      drawdown,
      volatilityScore,
      consecutiveLosses
    } = metrics;

    // UNFAVORABLE: Multiple negative indicators
    if (
      (recentWinRate < this.UNFAVORABLE_THRESHOLD) ||
      (drawdown < this.DRAWDOWN_THRESHOLD) ||
      (consecutiveLosses >= this.CONSECUTIVE_LOSS_LIMIT) ||
      (performanceTrend < -0.6 && recentWinRate < 0.45)
    ) {
      const confidence = this.calculateUnfavorableConfidence(metrics);
      const reason = this.buildUnfavorableReason(metrics);
      
      return {
        regime: 'UNFAVORABLE',
        confidence,
        reason,
        recommendation: drawdown < this.DRAWDOWN_THRESHOLD ? 'PAUSE' : 'REDUCE_SIZE',
        metrics
      };
    }

    // RECOVERY OPPORTUNITY: Improving after bad period
    if (
      recentWinRate > 0.55 &&
      performanceTrend > 0.3 &&
      drawdown > -200 &&
      consecutiveLosses < 3
    ) {
      return {
        regime: 'RECOVERY_OPPORTUNITY',
        confidence: 0.8,
        reason: 'Improving win rate and positive trend after difficult period',
        recommendation: 'CONTINUE',
        metrics
      };
    }

    // FAVORABLE: Strong positive indicators
    if (
      recentWinRate > 0.52 &&
      performanceTrend > 0 &&
      drawdown > -100 &&
      consecutiveLosses < 2
    ) {
      return {
        regime: 'FAVORABLE',
        confidence: 0.75,
        reason: 'Good win rate, positive trend, controlled drawdown',
        recommendation: 'CONTINUE',
        metrics
      };
    }

    // NEUTRAL: Mixed signals
    return {
      regime: 'NEUTRAL',
      confidence: 0.6,
      reason: 'Mixed performance signals - proceed with caution',
      recommendation: volatilityScore > 0.7 ? 'REDUCE_SIZE' : 'CONTINUE',
      metrics
    };
  }

  private calculateUnfavorableConfidence(metrics: any): number {
    let score = 0;
    
    if (metrics.recentWinRate < 0.35) score += 0.3;
    if (metrics.drawdown < -300) score += 0.3;
    if (metrics.consecutiveLosses >= 6) score += 0.2;
    if (metrics.performanceTrend < -0.5) score += 0.2;
    
    return Math.min(0.95, Math.max(0.6, score));
  }

  private buildUnfavorableReason(metrics: any): string {
    const reasons = [];
    
    if (metrics.recentWinRate < this.UNFAVORABLE_THRESHOLD) {
      reasons.push(`Low win rate (${(metrics.recentWinRate * 100).toFixed(1)}%)`);
    }
    
    if (metrics.drawdown < this.DRAWDOWN_THRESHOLD) {
      reasons.push(`Significant drawdown ($${metrics.drawdown.toFixed(2)})`);
    }
    
    if (metrics.consecutiveLosses >= this.CONSECUTIVE_LOSS_LIMIT) {
      reasons.push(`${metrics.consecutiveLosses} consecutive losing periods`);
    }
    
    if (metrics.performanceTrend < -0.6) {
      reasons.push('Strong negative performance trend');
    }

    return reasons.join(', ');
  }

  /**
   * Get regime change recommendations
   */
  getTradeRecommendations(regime: MarketRegime): {
    shouldTrade: boolean;
    maxTradesPerHour: number;
    confidenceBoost: number;
    positionSizeMultiplier: number;
  } {
    switch (regime.recommendation) {
      case 'PAUSE':
        return {
          shouldTrade: false,
          maxTradesPerHour: 0,
          confidenceBoost: 0,
          positionSizeMultiplier: 0
        };

      case 'REDUCE_SIZE':
        return {
          shouldTrade: true,
          maxTradesPerHour: 20,
          confidenceBoost: 0.15, // Require higher confidence
          positionSizeMultiplier: 0.5 // Half position sizes
        };

      case 'WAIT_FOR_OPPORTUNITY':
        return {
          shouldTrade: true,
          maxTradesPerHour: 10,
          confidenceBoost: 0.25, // Much higher confidence needed
          positionSizeMultiplier: 0.3
        };

      case 'CONTINUE':
      default:
        return {
          shouldTrade: true,
          maxTradesPerHour: regime.regime === 'RECOVERY_OPPORTUNITY' ? 60 : 40,
          confidenceBoost: regime.regime === 'FAVORABLE' ? -0.05 : 0, // Slightly lower threshold when favorable
          positionSizeMultiplier: regime.regime === 'RECOVERY_OPPORTUNITY' ? 1.2 : 1.0
        };
    }
  }

  /**
   * Check if we should resume trading after a pause
   */
  shouldResumeTrading(regime: MarketRegime): boolean {
    return (
      regime.regime === 'RECOVERY_OPPORTUNITY' ||
      regime.regime === 'FAVORABLE' ||
      (regime.regime === 'NEUTRAL' && regime.metrics.recentWinRate > 0.48)
    );
  }
}

export const marketRegimeDetector = new MarketRegimeDetector();