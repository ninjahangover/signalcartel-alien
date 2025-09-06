/**
 * Pair-Specific Tensor Optimizer
 * 
 * Each trading pair has unique characteristics and should have its own optimized thresholds.
 * This system learns from actual performance and continuously adapts.
 */

import { databaseService } from './database-service';

export interface PairPerformanceMetrics {
  symbol: string;
  totalTrades: number;
  winRate: number;
  avgReturn: number;
  avgInformationContent: number;
  avgConsensusStrength: number;
  avgConfidence: number;
  profitableThresholds: {
    minInfo: number;
    minConsensus: number;
    minConfidence: number;
    minProfit: number;
  };
  unprofitableThresholds: {
    maxInfo: number;
    maxConsensus: number;
    maxConfidence: number;
  };
}

export interface PairOptimalThresholds {
  symbol: string;
  informationThreshold: number;
  consensusThreshold: number;
  confidenceThreshold: number;
  minProfitThreshold: number;
  
  // Confidence in these thresholds
  reliability: number;  // 0-1 based on sample size
  lastUpdated: Date;
  
  // Performance with these thresholds
  expectedWinRate: number;
  expectedReturn: number;
}

export class PairSpecificTensorOptimizer {
  private pairMetrics: Map<string, PairPerformanceMetrics> = new Map();
  private optimalThresholds: Map<string, PairOptimalThresholds> = new Map();
  private recentTrades: Map<string, any[]> = new Map();
  
  // Evaluation cycle settings
  private readonly MIN_TRADES_FOR_OPTIMIZATION = 10;
  private readonly EVALUATION_CYCLE = 20; // Evaluate every 20 trades
  private tradeCounter = 0;
  
  constructor() {
    console.log('🎯 Pair-Specific Tensor Optimizer initialized');
    this.loadHistoricalData();
  }
  
  /**
   * Load historical performance data to bootstrap learning
   */
  private async loadHistoricalData(): Promise<void> {
    try {
      const recentTrades = await databaseService.getRecentTrades(500);
      
      // Group by symbol and analyze
      for (const trade of recentTrades) {
        this.recordTradeResult(trade);
      }
      
      // Initial optimization for pairs with enough data
      this.optimizeAllPairs();
      
      console.log(`📊 Loaded historical data for ${this.pairMetrics.size} pairs`);
    } catch (error) {
      console.error('Failed to load historical data:', error);
    }
  }
  
  /**
   * Record a trade result for learning
   */
  recordTradeResult(trade: {
    symbol: string;
    informationContent: number;
    consensusStrength: number;
    confidence: number;
    expectedReturn: number;
    actualReturn: number;
    profitable: boolean;
    timestamp: Date;
  }): void {
    // Get or create pair metrics
    if (!this.pairMetrics.has(trade.symbol)) {
      this.pairMetrics.set(trade.symbol, {
        symbol: trade.symbol,
        totalTrades: 0,
        winRate: 0,
        avgReturn: 0,
        avgInformationContent: 0,
        avgConsensusStrength: 0,
        avgConfidence: 0,
        profitableThresholds: {
          minInfo: Infinity,
          minConsensus: Infinity,
          minConfidence: Infinity,
          minProfit: Infinity
        },
        unprofitableThresholds: {
          maxInfo: -Infinity,
          maxConsensus: -Infinity,
          maxConfidence: -Infinity
        }
      });
    }
    
    const metrics = this.pairMetrics.get(trade.symbol)!;
    
    // Update running averages
    const n = metrics.totalTrades;
    metrics.avgReturn = (metrics.avgReturn * n + trade.actualReturn) / (n + 1);
    metrics.avgInformationContent = (metrics.avgInformationContent * n + trade.informationContent) / (n + 1);
    metrics.avgConsensusStrength = (metrics.avgConsensusStrength * n + trade.consensusStrength) / (n + 1);
    metrics.avgConfidence = (metrics.avgConfidence * n + trade.confidence) / (n + 1);
    
    // Track profitable vs unprofitable thresholds
    if (trade.profitable) {
      metrics.profitableThresholds.minInfo = Math.min(
        metrics.profitableThresholds.minInfo,
        trade.informationContent
      );
      metrics.profitableThresholds.minConsensus = Math.min(
        metrics.profitableThresholds.minConsensus,
        trade.consensusStrength
      );
      metrics.profitableThresholds.minConfidence = Math.min(
        metrics.profitableThresholds.minConfidence,
        trade.confidence
      );
      metrics.profitableThresholds.minProfit = Math.min(
        metrics.profitableThresholds.minProfit,
        trade.actualReturn
      );
      
      metrics.winRate = (metrics.winRate * n + 1) / (n + 1);
    } else {
      metrics.unprofitableThresholds.maxInfo = Math.max(
        metrics.unprofitableThresholds.maxInfo,
        trade.informationContent
      );
      metrics.unprofitableThresholds.maxConsensus = Math.max(
        metrics.unprofitableThresholds.maxConsensus,
        trade.consensusStrength
      );
      metrics.unprofitableThresholds.maxConfidence = Math.max(
        metrics.unprofitableThresholds.maxConfidence,
        trade.confidence
      );
      
      metrics.winRate = (metrics.winRate * n) / (n + 1);
    }
    
    metrics.totalTrades++;
    
    // Store recent trades for detailed analysis
    if (!this.recentTrades.has(trade.symbol)) {
      this.recentTrades.set(trade.symbol, []);
    }
    const recent = this.recentTrades.get(trade.symbol)!;
    recent.push(trade);
    if (recent.length > 100) recent.shift(); // Keep last 100
    
    // Check if we should run optimization
    this.tradeCounter++;
    if (this.tradeCounter >= this.EVALUATION_CYCLE) {
      this.tradeCounter = 0;
      this.optimizeAllPairs();
    }
  }
  
  /**
   * Optimize thresholds for all pairs with enough data
   */
  private optimizeAllPairs(): void {
    console.log('🔧 Running pair-specific threshold optimization...');
    
    for (const [symbol, metrics] of this.pairMetrics.entries()) {
      if (metrics.totalTrades >= this.MIN_TRADES_FOR_OPTIMIZATION) {
        this.optimizePairThresholds(symbol, metrics);
      }
    }
    
    // Log top performing pairs
    const topPairs = Array.from(this.optimalThresholds.values())
      .sort((a, b) => b.expectedReturn - a.expectedReturn)
      .slice(0, 5);
    
    console.log('📈 Top 5 Optimized Pairs:');
    for (const pair of topPairs) {
      console.log(`  ${pair.symbol}: Info>${pair.informationThreshold.toFixed(2)}, ` +
                  `Consensus>${(pair.consensusThreshold * 100).toFixed(1)}%, ` +
                  `Conf>${(pair.confidenceThreshold * 100).toFixed(1)}%, ` +
                  `ExpReturn: ${(pair.expectedReturn * 100).toFixed(3)}%`);
    }
  }
  
  /**
   * Optimize thresholds for a specific pair
   */
  private optimizePairThresholds(symbol: string, metrics: PairPerformanceMetrics): void {
    const recent = this.recentTrades.get(symbol) || [];
    if (recent.length < this.MIN_TRADES_FOR_OPTIMIZATION) return;
    
    // Find the threshold sweet spot between profitable and unprofitable trades
    let optimalInfo = metrics.avgInformationContent;
    let optimalConsensus = metrics.avgConsensusStrength;
    let optimalConfidence = metrics.avgConfidence;
    
    // If we have clear separation between profitable and unprofitable
    if (metrics.profitableThresholds.minInfo < Infinity && 
        metrics.unprofitableThresholds.maxInfo > -Infinity) {
      
      // Set threshold between the two regions
      if (metrics.profitableThresholds.minInfo > metrics.unprofitableThresholds.maxInfo) {
        optimalInfo = (metrics.profitableThresholds.minInfo + metrics.unprofitableThresholds.maxInfo) / 2;
      }
      
      if (metrics.profitableThresholds.minConsensus > metrics.unprofitableThresholds.maxConsensus) {
        optimalConsensus = (metrics.profitableThresholds.minConsensus + metrics.unprofitableThresholds.maxConsensus) / 2;
      }
      
      if (metrics.profitableThresholds.minConfidence > metrics.unprofitableThresholds.maxConfidence) {
        optimalConfidence = (metrics.profitableThresholds.minConfidence + metrics.unprofitableThresholds.maxConfidence) / 2;
      }
    }
    
    // Use percentile-based optimization for better robustness
    const sortedByReturn = [...recent].sort((a, b) => b.actualReturn - a.actualReturn);
    const top30Percent = sortedByReturn.slice(0, Math.floor(recent.length * 0.3));
    
    if (top30Percent.length > 0) {
      // Find minimum thresholds that capture most profitable trades
      const infoValues = top30Percent.map(t => t.informationContent).sort((a, b) => a - b);
      const consensusValues = top30Percent.map(t => t.consensusStrength).sort((a, b) => a - b);
      const confidenceValues = top30Percent.map(t => t.confidence).sort((a, b) => a - b);
      
      // Use 20th percentile of top trades as threshold
      const p20Index = Math.floor(top30Percent.length * 0.2);
      optimalInfo = infoValues[p20Index] || optimalInfo;
      optimalConsensus = consensusValues[p20Index] || optimalConsensus;
      optimalConfidence = confidenceValues[p20Index] || optimalConfidence;
    }
    
    // Calculate minimum profit threshold based on actual performance
    const profitableTrades = recent.filter(t => t.actualReturn > 0);
    const minProfitThreshold = profitableTrades.length > 0
      ? Math.min(...profitableTrades.map(t => t.actualReturn)) * 0.8  // 80% of minimum profitable return
      : 0.005;  // Default 0.5%
    
    // Calculate expected performance with these thresholds
    const tradesPassingThresholds = recent.filter(t => 
      t.informationContent >= optimalInfo &&
      t.consensusStrength >= optimalConsensus &&
      t.confidence >= optimalConfidence
    );
    
    const expectedWinRate = tradesPassingThresholds.length > 0
      ? tradesPassingThresholds.filter(t => t.profitable).length / tradesPassingThresholds.length
      : metrics.winRate;
    
    const expectedReturn = tradesPassingThresholds.length > 0
      ? tradesPassingThresholds.reduce((sum, t) => sum + t.actualReturn, 0) / tradesPassingThresholds.length
      : metrics.avgReturn;
    
    // Store optimized thresholds
    this.optimalThresholds.set(symbol, {
      symbol,
      informationThreshold: Math.max(0.01, optimalInfo),
      consensusThreshold: Math.max(0.01, Math.min(0.95, optimalConsensus)),
      confidenceThreshold: Math.max(0.01, Math.min(0.95, optimalConfidence)),
      minProfitThreshold: Math.max(0.0042, minProfitThreshold),  // At least cover commission
      
      reliability: Math.min(1, metrics.totalTrades / 100),  // Confidence based on sample size
      lastUpdated: new Date(),
      
      expectedWinRate,
      expectedReturn
    });
  }
  
  /**
   * Get optimal thresholds for a pair
   */
  getOptimalThresholds(symbol: string): PairOptimalThresholds | null {
    // If we have optimized thresholds, return them
    if (this.optimalThresholds.has(symbol)) {
      return this.optimalThresholds.get(symbol)!;
    }
    
    // Otherwise, return conservative defaults
    return {
      symbol,
      informationThreshold: 0.5,
      consensusThreshold: 0.3,
      confidenceThreshold: 0.3,
      minProfitThreshold: 0.005,
      
      reliability: 0,  // No confidence yet
      lastUpdated: new Date(),
      
      expectedWinRate: 0.5,
      expectedReturn: 0
    };
  }
  
  /**
   * Get performance summary
   */
  getPerformanceSummary(): any {
    const pairs = Array.from(this.pairMetrics.values());
    const optimized = Array.from(this.optimalThresholds.values());
    
    return {
      totalPairs: pairs.length,
      optimizedPairs: optimized.length,
      averageWinRate: pairs.reduce((sum, p) => sum + p.winRate, 0) / pairs.length,
      topPerformers: optimized
        .sort((a, b) => b.expectedReturn - a.expectedReturn)
        .slice(0, 10)
        .map(p => ({
          symbol: p.symbol,
          expectedReturn: p.expectedReturn,
          expectedWinRate: p.expectedWinRate,
          thresholds: {
            info: p.informationThreshold,
            consensus: p.consensusThreshold,
            confidence: p.confidenceThreshold
          }
        }))
    };
  }
}

// Singleton instance
export const pairOptimizer = new PairSpecificTensorOptimizer();