/**
 * Dynamic Pair Filter
 * Automatically filters trading pairs based on real-time performance metrics
 * from AdaptiveLearningPerformance database
 *
 * Prevents trading on historically poor-performing pairs without hardcoding
 */

import { prisma } from './prisma';

export interface PairFilterResult {
  allowed: boolean;
  reason: string;
  performance?: {
    accuracy: number;
    totalSignals: number;
    totalPnL: number;
    confidence: number;
    recentStreak: number;
  };
  category?: 'excellent' | 'good' | 'acceptable' | 'poor' | 'blocked';
}

export interface FilterThresholds {
  minAccuracy: number;          // Minimum accuracy % (0-1)
  minSignalsForEvaluation: number; // Minimum signals before filtering kicks in
  blockedAccuracyThreshold: number; // Below this = blocked
  poorAccuracyThreshold: number;    // Poor performance warning
  minConfidence: number;         // Minimum confidence level
  negativeStreakLimit: number;   // Max consecutive losses before blocking
  maxNegativePnL: number;        // Maximum allowed negative P&L
}

export class DynamicPairFilter {
  private static instance: DynamicPairFilter;
  private performanceCache: Map<string, { data: PairFilterResult; timestamp: number }> = new Map();
  private cacheLifetimeMs = 60000; // 1 minute cache

  // Default thresholds (can be adjusted dynamically)
  private thresholds: FilterThresholds = {
    minAccuracy: 0.30,              // 30% minimum accuracy
    minSignalsForEvaluation: 50,     // Need 50+ signals before filtering
    blockedAccuracyThreshold: 0.10,  // <10% accuracy = blocked
    poorAccuracyThreshold: 0.30,     // <30% accuracy = poor
    minConfidence: 0.30,             // 30% minimum confidence
    negativeStreakLimit: -5,         // 5 consecutive losses = warning
    maxNegativePnL: -500.0           // More than $500 loss = blocked
  };

  static getInstance(): DynamicPairFilter {
    if (!DynamicPairFilter.instance) {
      DynamicPairFilter.instance = new DynamicPairFilter();
    }
    return DynamicPairFilter.instance;
  }

  private constructor() {
    console.log('🔍 Dynamic Pair Filter initialized');
    console.log(`   Thresholds: ${(this.thresholds.blockedAccuracyThreshold * 100).toFixed(0)}% blocked, ${(this.thresholds.minAccuracy * 100).toFixed(0)}% minimum accuracy`);
    console.log(`   Evaluation: ${this.thresholds.minSignalsForEvaluation}+ signals required`);
  }

  /**
   * Check if a trading pair should be allowed based on performance
   */
  async shouldAllowPair(symbol: string, side: 'long' | 'short' = 'long'): Promise<PairFilterResult> {
    // Check cache first
    const cacheKey = `${symbol}_${side}`;
    const cached = this.performanceCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheLifetimeMs) {
      return cached.data;
    }

    try {
      // Query adaptive learning performance from database
      const performance = await prisma.adaptiveLearningPerformance.findUnique({
        where: {
          category_symbol: {
            category: side,
            symbol: symbol
          }
        }
      });

      // No data yet = allow (innocent until proven guilty)
      if (!performance || performance.totalSignals === 0) {
        const result: PairFilterResult = {
          allowed: true,
          reason: 'No historical data - allowing exploration',
          category: 'acceptable'
        };
        this.performanceCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      // Not enough data yet = allow
      if (performance.totalSignals < this.thresholds.minSignalsForEvaluation) {
        const result: PairFilterResult = {
          allowed: true,
          reason: `Learning phase: ${performance.totalSignals}/${this.thresholds.minSignalsForEvaluation} signals`,
          performance: {
            accuracy: performance.accuracy,
            totalSignals: performance.totalSignals,
            totalPnL: performance.totalPnL,
            confidence: performance.confidence,
            recentStreak: performance.recentStreak
          },
          category: 'acceptable'
        };
        this.performanceCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      // Evaluate performance
      const accuracy = performance.accuracy;
      const totalPnL = performance.totalPnL;
      const recentStreak = performance.recentStreak;
      const confidence = performance.confidence;

      // BLOCKED: Severe negative P&L
      if (totalPnL < this.thresholds.maxNegativePnL) {
        const result: PairFilterResult = {
          allowed: false,
          reason: `BLOCKED: Severe losses $${totalPnL.toFixed(2)} (threshold: $${this.thresholds.maxNegativePnL})`,
          performance: {
            accuracy,
            totalSignals: performance.totalSignals,
            totalPnL,
            confidence,
            recentStreak
          },
          category: 'blocked'
        };
        this.performanceCache.set(cacheKey, { data: result, timestamp: Date.now() });
        console.log(`🚫 PAIR BLOCKED: ${symbol} ${side} - ${result.reason}`);
        return result;
      }

      // BLOCKED: Extremely low accuracy with significant signals
      if (accuracy < this.thresholds.blockedAccuracyThreshold) {
        const result: PairFilterResult = {
          allowed: false,
          reason: `BLOCKED: ${(accuracy * 100).toFixed(1)}% accuracy over ${performance.totalSignals} signals (threshold: ${(this.thresholds.blockedAccuracyThreshold * 100).toFixed(0)}%)`,
          performance: {
            accuracy,
            totalSignals: performance.totalSignals,
            totalPnL,
            confidence,
            recentStreak
          },
          category: 'blocked'
        };
        this.performanceCache.set(cacheKey, { data: result, timestamp: Date.now() });
        console.log(`🚫 PAIR BLOCKED: ${symbol} ${side} - ${result.reason}`);
        return result;
      }

      // POOR: Below minimum accuracy
      if (accuracy < this.thresholds.minAccuracy) {
        const result: PairFilterResult = {
          allowed: false,
          reason: `Poor performance: ${(accuracy * 100).toFixed(1)}% accuracy, $${totalPnL.toFixed(2)} P&L over ${performance.totalSignals} signals`,
          performance: {
            accuracy,
            totalSignals: performance.totalSignals,
            totalPnL,
            confidence,
            recentStreak
          },
          category: 'poor'
        };
        this.performanceCache.set(cacheKey, { data: result, timestamp: Date.now() });
        console.log(`⚠️ PAIR FILTERED: ${symbol} ${side} - ${result.reason}`);
        return result;
      }

      // WARNING: Negative streak
      if (recentStreak < this.thresholds.negativeStreakLimit) {
        const result: PairFilterResult = {
          allowed: false,
          reason: `Recent losing streak: ${Math.abs(recentStreak)} consecutive losses`,
          performance: {
            accuracy,
            totalSignals: performance.totalSignals,
            totalPnL,
            confidence,
            recentStreak
          },
          category: 'poor'
        };
        this.performanceCache.set(cacheKey, { data: result, timestamp: Date.now() });
        console.log(`⚠️ PAIR FILTERED: ${symbol} ${side} - ${result.reason}`);
        return result;
      }

      // Categorize allowed pairs
      let category: 'excellent' | 'good' | 'acceptable';
      if (accuracy >= 0.90 && totalPnL > 100) {
        category = 'excellent';
      } else if (accuracy >= 0.70 && totalPnL > 10) {
        category = 'good';
      } else {
        category = 'acceptable';
      }

      // ALLOWED: Meets minimum standards
      const result: PairFilterResult = {
        allowed: true,
        reason: `${category.toUpperCase()}: ${(accuracy * 100).toFixed(1)}% accuracy, $${totalPnL.toFixed(2)} P&L over ${performance.totalSignals} signals`,
        performance: {
          accuracy,
          totalSignals: performance.totalSignals,
          totalPnL,
          confidence,
          recentStreak
        },
        category
      };
      this.performanceCache.set(cacheKey, { data: result, timestamp: Date.now() });

      if (category === 'excellent') {
        console.log(`✅ EXCELLENT PAIR: ${symbol} ${side} - ${result.reason}`);
      }

      return result;

    } catch (error) {
      console.error(`❌ Error checking pair filter for ${symbol}:`, error.message);
      // On error, allow trading (fail-open to avoid system lockup)
      return {
        allowed: true,
        reason: 'Filter check failed - allowing by default',
        category: 'acceptable'
      };
    }
  }

  /**
   * Get all currently blocked pairs
   */
  async getBlockedPairs(): Promise<Array<{ symbol: string; side: string; reason: string; performance: any }>> {
    try {
      const allPerformance = await prisma.adaptiveLearningPerformance.findMany({
        where: {
          totalSignals: { gte: this.thresholds.minSignalsForEvaluation }
        },
        orderBy: { totalPnL: 'asc' }
      });

      const blocked: Array<{ symbol: string; side: string; reason: string; performance: any }> = [];

      for (const perf of allPerformance) {
        if (
          perf.accuracy < this.thresholds.blockedAccuracyThreshold ||
          perf.totalPnL < this.thresholds.maxNegativePnL ||
          perf.recentStreak < this.thresholds.negativeStreakLimit
        ) {
          blocked.push({
            symbol: perf.symbol,
            side: perf.category,
            reason: `${(perf.accuracy * 100).toFixed(1)}% accuracy, $${perf.totalPnL.toFixed(2)} P&L`,
            performance: {
              accuracy: perf.accuracy,
              totalSignals: perf.totalSignals,
              totalPnL: perf.totalPnL,
              avgPnL: perf.avgPnL,
              recentStreak: perf.recentStreak
            }
          });
        }
      }

      return blocked;
    } catch (error) {
      console.error('❌ Error getting blocked pairs:', error.message);
      return [];
    }
  }

  /**
   * Get all excellent performing pairs (for priority focus)
   */
  async getExcellentPairs(): Promise<Array<{ symbol: string; side: string; performance: any }>> {
    try {
      const allPerformance = await prisma.adaptiveLearningPerformance.findMany({
        where: {
          accuracy: { gte: 0.90 },
          totalSignals: { gte: this.thresholds.minSignalsForEvaluation },
          totalPnL: { gte: 100 }
        },
        orderBy: { totalPnL: 'desc' },
        take: 10
      });

      return allPerformance.map(perf => ({
        symbol: perf.symbol,
        side: perf.category,
        performance: {
          accuracy: perf.accuracy,
          totalSignals: perf.totalSignals,
          totalPnL: perf.totalPnL,
          avgPnL: perf.avgPnL,
          recentStreak: perf.recentStreak,
          confidence: perf.confidence
        }
      }));
    } catch (error) {
      console.error('❌ Error getting excellent pairs:', error.message);
      return [];
    }
  }

  /**
   * Update filter thresholds dynamically
   */
  updateThresholds(newThresholds: Partial<FilterThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.performanceCache.clear(); // Clear cache when thresholds change
    console.log('🔄 Dynamic Pair Filter thresholds updated');
    console.log(`   New thresholds:`, this.thresholds);
  }

  /**
   * Clear performance cache (force fresh database queries)
   */
  clearCache(): void {
    this.performanceCache.clear();
    console.log('🔄 Performance cache cleared');
  }

  /**
   * Get filter statistics
   */
  async getFilterStatistics(): Promise<{
    totalPairs: number;
    excellentPairs: number;
    goodPairs: number;
    acceptablePairs: number;
    poorPairs: number;
    blockedPairs: number;
    explorationPairs: number;
  }> {
    try {
      const allPerformance = await prisma.adaptiveLearningPerformance.findMany();

      const stats = {
        totalPairs: allPerformance.length,
        excellentPairs: 0,
        goodPairs: 0,
        acceptablePairs: 0,
        poorPairs: 0,
        blockedPairs: 0,
        explorationPairs: 0
      };

      for (const perf of allPerformance) {
        if (perf.totalSignals < this.thresholds.minSignalsForEvaluation) {
          stats.explorationPairs++;
        } else if (
          perf.accuracy < this.thresholds.blockedAccuracyThreshold ||
          perf.totalPnL < this.thresholds.maxNegativePnL
        ) {
          stats.blockedPairs++;
        } else if (perf.accuracy < this.thresholds.minAccuracy) {
          stats.poorPairs++;
        } else if (perf.accuracy >= 0.90 && perf.totalPnL > 100) {
          stats.excellentPairs++;
        } else if (perf.accuracy >= 0.70 && perf.totalPnL > 10) {
          stats.goodPairs++;
        } else {
          stats.acceptablePairs++;
        }
      }

      return stats;
    } catch (error) {
      console.error('❌ Error getting filter statistics:', error.message);
      return {
        totalPairs: 0,
        excellentPairs: 0,
        goodPairs: 0,
        acceptablePairs: 0,
        poorPairs: 0,
        blockedPairs: 0,
        explorationPairs: 0
      };
    }
  }
}

export const dynamicPairFilter = DynamicPairFilter.getInstance();