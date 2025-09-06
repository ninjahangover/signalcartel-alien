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
  
  // Dynamic criteria that adapt based on overall system performance
  private filterCriteria: FilterCriteria = {
    minWinRate: 60,           // Block pairs with <60% win rate
    minTotalPnL: -0.05,       // Block pairs with <-$0.05 total P&L
    minTrades: 5,             // Need 5+ trades to make blocking decisions
    maxConsecutiveLosses: 4   // Block after 4 consecutive losses
  };

  constructor(prisma: PrismaClient) {
    this.prismaClient = prisma;
  }

  /**
   * Check if a trading pair should be allowed based on historical performance
   */
  async shouldAllowPair(symbol: string): Promise<boolean> {
    try {
      // Always allow if no historical data
      if (!this.performanceCache.has(symbol)) {
        await this.updatePairPerformance(symbol);
      }

    const performance = this.performanceCache.get(symbol);
    if (!performance || performance.totalTrades < this.filterCriteria.minTrades) {
      return true; // Allow new pairs to build history
    }

    // Check if currently blocked
    if (this.blockedPairs.has(symbol)) {
      // Periodically re-evaluate blocked pairs (every 24 hours)
      const hoursSinceUpdate = (Date.now() - performance.lastUpdated.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate < 24) {
        return false;
      }
      // Re-evaluate after 24 hours
      await this.updatePairPerformance(symbol);
    }

    return this.evaluatePairPerformance(performance);
    } catch (error) {
      console.error(`❌ AdaptivePairFilter: Error checking pair ${symbol}:`, error);
      return true; // Allow pair on error to avoid blocking trading
    }
  }

  /**
   * Evaluate if a pair meets performance criteria
   */
  private evaluatePairPerformance(performance: PairPerformance): boolean {
    // Automatic blocks for clear losers
    if (performance.winRate === 0 && performance.totalTrades >= 3) {
      this.blockPair(performance.symbol, `0% win rate over ${performance.totalTrades} trades`);
      return false;
    }

    if (performance.totalPnL < this.filterCriteria.minTotalPnL && performance.totalTrades >= this.filterCriteria.minTrades) {
      this.blockPair(performance.symbol, `Negative P&L: $${performance.totalPnL}`);
      return false;
    }

    if (performance.winRate < this.filterCriteria.minWinRate && performance.totalTrades >= this.filterCriteria.minTrades) {
      this.blockPair(performance.symbol, `Low win rate: ${performance.winRate}%`);
      return false;
    }

    // Check consecutive losses
    const consecutiveLosses = this.consecutiveLosses.get(performance.symbol) || 0;
    if (consecutiveLosses >= this.filterCriteria.maxConsecutiveLosses) {
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
    
    // Pre-block known losers based on current data
    const knownLosers = ['ETHUSD', 'BNBUSD']; // Based on analysis
    for (const symbol of knownLosers) {
      await this.updatePairPerformance(symbol);
      const performance = this.performanceCache.get(symbol);
      if (performance) {
        this.evaluatePairPerformance(performance);
      }
    }
    
    console.log(`🚫 Currently blocking ${this.blockedPairs.size} pairs: ${Array.from(this.blockedPairs).join(', ')}`);
  }
}