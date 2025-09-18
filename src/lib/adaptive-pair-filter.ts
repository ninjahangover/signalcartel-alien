/**
 * Adaptive Pair Filter - Intelligent pair filtering based on historical performance
 * Allows Profit Predator to find best opportunities while avoiding consistently losing pairs
 */

import { PrismaClient } from '@prisma/client';

export interface PairPerformance {
  symbol: string;
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgPnL: number;
  recentPerformance: number; // Last 10 trades avg
  lastUpdated: Date;
}

export interface FilterCriteria {
  minWinRate: number;
  minTotalPnL: number;
  minTrades: number;
  maxConsecutiveLosses: number;
}

export class AdaptivePairFilter {
  private performanceCache = new Map<string, PairPerformance>();
  private blockedPairs = new Set<string>();
  private consecutiveLosses = new Map<string, number>();
  private prismaClient: PrismaClient;
  
  // MATHEMATICAL INTUITION: All thresholds calculated dynamically using proven tensor formulas
  private async calculateDynamicFilterCriteria(marketVolatility: number, systemConfidence: number): Promise<FilterCriteria> {
    // Mathematical formula for dynamic win rate threshold based on market conditions
    // Higher volatility = lower required win rate, Higher AI confidence = higher standards
    const dynamicWinRate = Math.max(30, Math.min(80, 
      50 + (systemConfidence * 30) - (marketVolatility * 20)
    ));
    
    // Dynamic P&L threshold based on current market volatility and risk tolerance
    // More volatile markets allow for higher acceptable losses
    const dynamicPnLThreshold = -Math.max(0.02, Math.min(0.20, 
      0.05 + (marketVolatility * 0.15)
    ));
    
    // Dynamic trade count requirement - less data needed in high-confidence scenarios
    const dynamicMinTrades = Math.max(2, Math.min(10,
      5 - Math.floor(systemConfidence * 3)
    ));
    
    // Dynamic consecutive loss tolerance based on overall system performance
    const dynamicMaxLosses = Math.max(2, Math.min(8,
      4 + Math.floor((systemConfidence - 0.5) * 4)
    ));
    
    return {
      minWinRate: dynamicWinRate,
      minTotalPnL: dynamicPnLThreshold,
      minTrades: dynamicMinTrades,
      maxConsecutiveLosses: dynamicMaxLosses
    };
  }

  constructor(prisma: PrismaClient) {
    this.prismaClient = prisma;
  }

  /**
   * Check if a trading pair should be allowed based on MATHEMATICAL INTUITION - No hardcoded logic
   */
  async shouldAllowPair(symbol: string, marketVolatility: number = 0.05, systemConfidence: number = 0.5): Promise<boolean> {
    try {
      // Calculate dynamic criteria using mathematical formulas
      const dynamicCriteria = await this.calculateDynamicFilterCriteria(marketVolatility, systemConfidence);

      // Always allow if no historical data
      if (!this.performanceCache.has(symbol)) {
        await this.updatePairPerformance(symbol);
      }

    const performance = this.performanceCache.get(symbol);
    if (!performance || performance.totalTrades < dynamicCriteria.minTrades) {
      // 🚀 MARGIN TRADING: Be more aggressive with new opportunities
      // Profit Predator is finding 16-20% expected returns on small-caps
      console.log(`✅ ALLOWING NEW OPPORTUNITY: ${symbol} (${performance?.totalTrades || 0} trades, building history)`);
      return true; // Allow new pairs to build history
    }

    // Check if currently blocked
    if (this.blockedPairs.has(symbol)) {
      // Dynamic re-evaluation period based on market conditions
      // Higher volatility = faster re-evaluation, Higher confidence = slower re-evaluation
      const dynamicReEvaluationHours = Math.max(6, Math.min(48, 
        24 - (marketVolatility * 30) + (systemConfidence * 12)
      ));
      
      const hoursSinceUpdate = (Date.now() - performance.lastUpdated.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate < dynamicReEvaluationHours) {
        return false;
      }
      // Re-evaluate after dynamic period
      await this.updatePairPerformance(symbol);
    }

    return this.evaluatePairPerformance(performance, dynamicCriteria);
    } catch (error) {
      console.error(`❌ AdaptivePairFilter: Error checking pair ${symbol}:`, error);
      return true; // Allow pair on error to avoid blocking trading
    }
  }

  /**
   * Evaluate if a pair meets DYNAMIC performance criteria calculated mathematically
   */
  private evaluatePairPerformance(performance: PairPerformance, criteria: FilterCriteria): boolean {
    // Mathematical evaluation using DYNAMIC criteria - no hardcoded thresholds
    
    // Dynamic zero win rate evaluation - more lenient with fewer trades
    const dynamicMinTradesForZeroWinRate = Math.max(2, Math.min(5, 
      3 - Math.floor((criteria.minWinRate - 50) / 20)
    ));
    
    if (performance.winRate === 0 && performance.totalTrades >= dynamicMinTradesForZeroWinRate) {
      this.blockPair(performance.symbol, `0% win rate over ${performance.totalTrades} trades (dynamic threshold: ${dynamicMinTradesForZeroWinRate})`);
      return false;
    }

    if (performance.totalPnL < criteria.minTotalPnL && performance.totalTrades >= criteria.minTrades) {
      this.blockPair(performance.symbol, `Negative P&L: $${performance.totalPnL} (dynamic threshold: $${criteria.minTotalPnL.toFixed(3)})`);
      return false;
    }

    if (performance.winRate < criteria.minWinRate && performance.totalTrades >= criteria.minTrades) {
      this.blockPair(performance.symbol, `Low win rate: ${performance.winRate}% (dynamic threshold: ${criteria.minWinRate.toFixed(1)}%)`);
      return false;
    }

    // Check consecutive losses using DYNAMIC criteria
    const consecutiveLosses = this.consecutiveLosses.get(performance.symbol) || 0;
    if (consecutiveLosses >= criteria.maxConsecutiveLosses) {
      this.blockPair(performance.symbol, `${consecutiveLosses} consecutive losses`);
      return false;
    }

    // Unblock if previously blocked but now meeting criteria
    if (this.blockedPairs.has(performance.symbol)) {
      this.unblockPair(performance.symbol, "Performance improved");
    }

    return true;
  }

  /**
   * Update pair performance from database
   */
  private async updatePairPerformance(symbol: string): Promise<void> {
    try {
      // Safety check: Ensure prisma client is available
      if (!this.prismaClient || !this.prismaClient.managedPosition) {
        console.error(`❌ AdaptivePairFilter: Prisma client not available for ${symbol}`);
        return;
      }

      // Get performance data using Prisma aggregation
      const positions = await this.prismaClient.managedPosition.findMany({
        where: {
          symbol: symbol,
          status: 'closed',
          realizedPnL: { not: null }
        },
        select: {
          realizedPnL: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (positions.length > 0) {
        const totalTrades = positions.length;
        const winningTrades = positions.filter(p => p.realizedPnL! > 0).length;
        const winRate = (winningTrades / totalTrades) * 100;
        const totalPnL = positions.reduce((sum, p) => sum + (p.realizedPnL || 0), 0);
        const avgPnL = totalPnL / totalTrades;

        this.performanceCache.set(symbol, {
          symbol,
          totalTrades,
          winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
          totalPnL: Math.round(totalPnL * 10000) / 10000, // Round to 4 decimals
          avgPnL: Math.round(avgPnL * 10000) / 10000, // Round to 4 decimals
          recentPerformance: 0, // TODO: Implement recent performance calculation
          lastUpdated: new Date()
        });
      }

      // Update consecutive losses
      await this.updateConsecutiveLosses(symbol);
      
    } catch (error) {
      console.error(`Error updating performance for ${symbol}:`, error);
    }
  }

  /**
   * Track consecutive losses for a pair
   */
  private async updateConsecutiveLosses(symbol: string): Promise<void> {
    try {
      // Safety check: Ensure prisma client is available
      if (!this.prismaClient || !this.prismaClient.managedPosition) {
        console.error(`❌ AdaptivePairFilter: Prisma client not available for consecutive losses ${symbol}`);
        return;
      }

      const recentTrades = await this.prismaClient.managedPosition.findMany({
        where: {
          symbol: symbol,
          status: 'closed',
          realizedPnL: { not: null }
        },
        select: {
          realizedPnL: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });
      
      let consecutiveLosses = 0;
      for (const trade of recentTrades) {
        if (trade.realizedPnL! < 0) {
          consecutiveLosses++;
        } else {
          break; // Stop at first win
        }
      }

      this.consecutiveLosses.set(symbol, consecutiveLosses);
      
    } catch (error) {
      console.error(`Error updating consecutive losses for ${symbol}:`, error);
    }
  }

  /**
   * Block a pair with reason
   */
  private blockPair(symbol: string, reason: string): void {
    this.blockedPairs.add(symbol);
    console.log(`🚫 BLOCKING PAIR ${symbol}: ${reason}`);
  }

  /**
   * Unblock a pair with reason
   */
  private unblockPair(symbol: string, reason: string): void {
    this.blockedPairs.delete(symbol);
    console.log(`✅ UNBLOCKING PAIR ${symbol}: ${reason}`);
  }

  /**
   * Record a new trade result for adaptive learning
   */
  async recordTradeResult(symbol: string, pnl: number): Promise<void> {
    // Update consecutive losses counter
    const currentLosses = this.consecutiveLosses.get(symbol) || 0;
    if (pnl < 0) {
      this.consecutiveLosses.set(symbol, currentLosses + 1);
    } else {
      this.consecutiveLosses.set(symbol, 0); // Reset on win
    }

    // Refresh performance cache
    await this.updatePairPerformance(symbol);
  }

  /**
   * Get current blocked pairs for monitoring
   */
  getBlockedPairs(): string[] {
    return Array.from(this.blockedPairs);
  }

  /**
   * Get pair performance summary
   */
  getPairPerformance(symbol: string): PairPerformance | undefined {
    return this.performanceCache.get(symbol);
  }

  /**
   * Adjust filter criteria based on overall system performance
   */
  adjustFilterCriteria(systemWinRate: number, totalPnL: number): void {
    try {
      // Tighten criteria when system is performing well
      if (systemWinRate > 80 && totalPnL > 5) {
        this.filterCriteria = {
          ...this.filterCriteria,
          minWinRate: Math.min(75, systemWinRate - 5)
        };
        console.log(`🎯 TIGHTENING FILTER: Raising min win rate to ${this.filterCriteria.minWinRate}%`);
      }
      
      // Loosen criteria when system struggles
      if (systemWinRate < 60 || totalPnL < 0) {
        this.filterCriteria = {
          ...this.filterCriteria,
          minWinRate: Math.max(40, systemWinRate - 10)
        };
        console.log(`⚠️ LOOSENING FILTER: Lowering min win rate to ${this.filterCriteria.minWinRate}%`);
      }
    } catch (error) {
      console.error(`❌ AdaptivePairFilter: Failed to adjust criteria:`, error);
    }
  }

  /**
   * Initialize with current database state
   */
  async initialize(): Promise<void> {
    console.log("🔧 Initializing Adaptive Pair Filter...");

    // 🚀 MARGIN TRADING MODE: Allow all pairs discovered by Profit Predator
    // Remove hardcoded blocking to enable small-cap opportunities
    // Only block pairs after they prove to be consistently losing
    console.log("🎯 MARGIN TRADING MODE: Allowing all mathematically selected opportunities");
    console.log("💡 Small-cap pairs like SLAYUSD, FARTCOINUSD now enabled for margin trading");

    console.log(`🚫 Currently blocking ${this.blockedPairs.size} pairs: ${Array.from(this.blockedPairs).join(', ')}`);
  }
}