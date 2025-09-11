/**
 * 🧠 PERFORMANCE-WEIGHTED TENSOR ENHANCEMENT V3.0
 * 
 * Dynamic risk weighting system that influences but doesn't override mathematical conviction.
 * The system maintains full autonomy while being "aware" of historical performance patterns.
 * 
 * KEY PRINCIPLE: High-risk symbols don't get blocked, they get weighted.
 * The tensor equation becomes: T(t) = Σ(Wi × Vi × Pi)
 * Where Pi = Performance weight for symbol i (0.1 to 2.0)
 */

import { PrismaClient } from '@prisma/client';

export interface SymbolPerformanceMetrics {
  symbol: string;
  winRate: number;
  avgPnL: number;
  totalTrades: number;
  totalPnL: number;
  riskScore: number; // 0.0 (best) to 1.0 (worst)
  performanceWeight: number; // 0.1 (high risk) to 2.0 (champion)
  category: 'CHAMPION' | 'PROVEN' | 'NEUTRAL' | 'CAUTION' | 'HIGH_RISK';
}

export class PerformanceWeightedTensor {
  private prisma: PrismaClient;
  private performanceCache: Map<string, SymbolPerformanceMetrics> = new Map();
  private lastUpdate: Date = new Date(0);
  private updateInterval = 300000; // 5 minutes
  
  // Dynamic thresholds based on actual performance
  private readonly CHAMPION_WIN_RATE = 0.90; // 90%+ win rate
  private readonly PROVEN_WIN_RATE = 0.75;   // 75%+ win rate
  private readonly NEUTRAL_WIN_RATE = 0.60;  // 60%+ win rate
  private readonly CAUTION_WIN_RATE = 0.40;  // 40%+ win rate
  // Below 40% = HIGH_RISK
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
  
  /**
   * Get performance weight for a symbol to influence tensor decision
   * This doesn't block trades, it influences conviction requirements
   */
  public async getPerformanceWeight(symbol: string): Promise<number> {
    await this.updatePerformanceMetrics();
    
    const metrics = this.performanceCache.get(symbol);
    if (!metrics) {
      // Unknown symbol gets neutral weight
      return 1.0;
    }
    
    return metrics.performanceWeight;
  }
  
  /**
   * Get detailed risk assessment for logging/debugging
   */
  public async getSymbolRiskAssessment(symbol: string): Promise<SymbolPerformanceMetrics | null> {
    await this.updatePerformanceMetrics();
    return this.performanceCache.get(symbol) || null;
  }
  
  /**
   * Calculate conviction adjustment based on performance
   * High-risk symbols need STRONGER mathematical conviction to trade
   */
  public calculateConvictionAdjustment(
    baseConviction: number,
    symbol: string,
    performanceWeight: number
  ): {
    adjustedConviction: number;
    requiresStrongerProof: boolean;
    reasoning: string;
  } {
    let adjustedConviction = baseConviction;
    let requiresStrongerProof = false;
    let reasoning = '';
    
    if (performanceWeight < 0.5) {
      // HIGH RISK: Requires much stronger conviction
      adjustedConviction = baseConviction * performanceWeight;
      requiresStrongerProof = true;
      reasoning = `⚠️ HIGH RISK ${symbol}: Conviction reduced from ${(baseConviction * 100).toFixed(1)}% to ${(adjustedConviction * 100).toFixed(1)}% due to poor historical performance`;
    } else if (performanceWeight < 1.0) {
      // CAUTION: Slightly reduced conviction
      adjustedConviction = baseConviction * performanceWeight;
      reasoning = `⚡ CAUTION ${symbol}: Conviction adjusted from ${(baseConviction * 100).toFixed(1)}% to ${(adjustedConviction * 100).toFixed(1)}% based on mixed performance`;
    } else if (performanceWeight > 1.5) {
      // CHAMPION: Boost conviction for proven winners
      adjustedConviction = Math.min(1.0, baseConviction * performanceWeight);
      reasoning = `🏆 CHAMPION ${symbol}: Conviction boosted from ${(baseConviction * 100).toFixed(1)}% to ${(adjustedConviction * 100).toFixed(1)}% due to excellent track record`;
    } else {
      // NEUTRAL/PROVEN: Standard conviction
      reasoning = `✅ ${symbol}: Standard conviction ${(baseConviction * 100).toFixed(1)}% - solid performance history`;
    }
    
    return {
      adjustedConviction,
      requiresStrongerProof,
      reasoning
    };
  }
  
  /**
   * Update performance metrics from database
   */
  private async updatePerformanceMetrics(): Promise<void> {
    const now = new Date();
    if (now.getTime() - this.lastUpdate.getTime() < this.updateInterval) {
      return; // Use cached data
    }
    
    try {
      // Get performance data for all symbols
      const performanceData = await this.prisma.managedPosition.groupBy({
        by: ['symbol'],
        where: {
          status: 'closed',
          realizedPnL: { not: null }
        },
        _count: {
          _all: true
        },
        _sum: {
          realizedPnL: true
        },
        _avg: {
          realizedPnL: true
        }
      });
      
      // Get win/loss counts for each symbol
      for (const data of performanceData) {
        const winCount = await this.prisma.managedPosition.count({
          where: {
            symbol: data.symbol,
            status: 'closed',
            realizedPnL: { gt: 0 }
          }
        });
        
        const totalTrades = data._count._all;
        const winRate = totalTrades > 0 ? winCount / totalTrades : 0;
        const avgPnL = data._avg.realizedPnL || 0;
        const totalPnL = data._sum.realizedPnL || 0;
        
        // Calculate risk score (0.0 best to 1.0 worst)
        let riskScore = 0.0;
        if (winRate < 0.4) riskScore = 1.0;
        else if (winRate < 0.6) riskScore = 0.7;
        else if (winRate < 0.75) riskScore = 0.5;
        else if (winRate < 0.9) riskScore = 0.3;
        else riskScore = 0.1;
        
        // Adjust risk score based on total P&L
        if (totalPnL < -100) riskScore = Math.min(1.0, riskScore + 0.3);
        else if (totalPnL < -50) riskScore = Math.min(1.0, riskScore + 0.2);
        else if (totalPnL > 50) riskScore = Math.max(0.0, riskScore - 0.1);
        else if (totalPnL > 100) riskScore = Math.max(0.0, riskScore - 0.2);
        
        // Calculate performance weight (inverse of risk)
        // 0.1 (high risk) to 2.0 (champion)
        let performanceWeight = 1.0;
        let category: SymbolPerformanceMetrics['category'] = 'NEUTRAL';
        
        if (riskScore >= 0.8) {
          performanceWeight = 0.1; // HIGH RISK - Severely reduce conviction
          category = 'HIGH_RISK';
        } else if (riskScore >= 0.6) {
          performanceWeight = 0.5; // CAUTION - Moderately reduce conviction
          category = 'CAUTION';
        } else if (riskScore >= 0.4) {
          performanceWeight = 1.0; // NEUTRAL - No adjustment
          category = 'NEUTRAL';
        } else if (riskScore >= 0.2) {
          performanceWeight = 1.5; // PROVEN - Boost conviction
          category = 'PROVEN';
        } else {
          performanceWeight = 2.0; // CHAMPION - Maximum boost
          category = 'CHAMPION';
        }
        
        // Special case for DOTUSD based on your data
        if (data.symbol === 'DOTUSD' && totalPnL < -200) {
          performanceWeight = 0.05; // Almost impossible to trade
          category = 'HIGH_RISK';
          riskScore = 1.0;
        }
        
        const metrics: SymbolPerformanceMetrics = {
          symbol: data.symbol,
          winRate,
          avgPnL,
          totalTrades,
          totalPnL,
          riskScore,
          performanceWeight,
          category
        };
        
        this.performanceCache.set(data.symbol, metrics);
        
        // Log significant risk symbols
        if (category === 'HIGH_RISK' || category === 'CHAMPION') {
          console.log(`📊 PERFORMANCE WEIGHT: ${data.symbol} = ${category} (Weight: ${performanceWeight}x, Win Rate: ${(winRate * 100).toFixed(1)}%, Total P&L: $${totalPnL.toFixed(2)})`);
        }
      }
      
      this.lastUpdate = now;
      
    } catch (error) {
      console.error('⚠️ Failed to update performance metrics:', error);
    }
  }
  
  /**
   * Enhanced tensor equation with performance weighting
   * T(t) = Σ(Wi × Vi × Pi) where Pi is performance weight
   */
  public applyPerformanceWeightToTensor(
    tensorComponents: Array<{
      system: string;
      weight: number;
      value: number;
    }>,
    symbol: string,
    performanceWeight: number
  ): {
    originalTensor: number;
    weightedTensor: number;
    adjustmentFactor: number;
    shouldProceed: boolean;
    reasoning: string;
  } {
    // Calculate original tensor without performance weight
    const originalTensor = tensorComponents.reduce((sum, comp) => sum + (comp.weight * comp.value), 0);
    
    // Apply performance weight to entire tensor result
    const weightedTensor = originalTensor * performanceWeight;
    
    // Determine if we should proceed with trade
    let shouldProceed = true;
    let reasoning = '';
    
    if (performanceWeight < 0.3) {
      // HIGH RISK: Need exceptional conviction (>0.8)
      shouldProceed = weightedTensor > 0.8;
      reasoning = `HIGH RISK ${symbol}: Needs exceptional conviction (>80%). Current: ${(weightedTensor * 100).toFixed(1)}%`;
    } else if (performanceWeight < 0.7) {
      // CAUTION: Need strong conviction (>0.6)
      shouldProceed = weightedTensor > 0.6;
      reasoning = `CAUTION ${symbol}: Needs strong conviction (>60%). Current: ${(weightedTensor * 100).toFixed(1)}%`;
    } else if (performanceWeight > 1.5) {
      // CHAMPION: Lower threshold (>0.3)
      shouldProceed = weightedTensor > 0.3;
      reasoning = `CHAMPION ${symbol}: Lower threshold due to proven success (>30%). Current: ${(weightedTensor * 100).toFixed(1)}%`;
    } else {
      // NEUTRAL/PROVEN: Standard threshold (>0.5)
      shouldProceed = weightedTensor > 0.5;
      reasoning = `${symbol}: Standard conviction threshold (>50%). Current: ${(weightedTensor * 100).toFixed(1)}%`;
    }
    
    return {
      originalTensor,
      weightedTensor,
      adjustmentFactor: performanceWeight,
      shouldProceed,
      reasoning
    };
  }
  
  /**
   * Get current high-risk symbols list
   */
  public async getHighRiskSymbols(): Promise<string[]> {
    await this.updatePerformanceMetrics();
    
    const highRiskSymbols: string[] = [];
    for (const [symbol, metrics] of this.performanceCache.entries()) {
      if (metrics.category === 'HIGH_RISK' || metrics.riskScore > 0.7) {
        highRiskSymbols.push(symbol);
      }
    }
    
    return highRiskSymbols;
  }
  
  /**
   * Get champion performers list
   */
  public async getChampionSymbols(): Promise<string[]> {
    await this.updatePerformanceMetrics();
    
    const championSymbols: string[] = [];
    for (const [symbol, metrics] of this.performanceCache.entries()) {
      if (metrics.category === 'CHAMPION' || metrics.category === 'PROVEN') {
        championSymbols.push(symbol);
      }
    }
    
    return championSymbols;
  }
}

/**
 * INTEGRATION EXAMPLE:
 * 
 * In your tensor-ai-fusion-engine.ts:
 * 
 * const perfWeighted = new PerformanceWeightedTensor(prisma);
 * const weight = await perfWeighted.getPerformanceWeight(symbol);
 * 
 * // Apply to tensor calculation
 * const tensorResult = perfWeighted.applyPerformanceWeightToTensor(
 *   tensorComponents,
 *   symbol,
 *   weight
 * );
 * 
 * if (!tensorResult.shouldProceed) {
 *   console.log(`🚫 PERFORMANCE WEIGHT: ${tensorResult.reasoning}`);
 *   return { action: 'SKIP', reason: tensorResult.reasoning };
 * }
 * 
 * // Continue with weighted tensor value
 * const finalConviction = tensorResult.weightedTensor;
 */