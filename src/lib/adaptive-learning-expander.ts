/**
 * ADAPTIVE LEARNING EXPANDER™
 * Dynamically expands learning to capture more trading pairs and opportunities
 * Focuses on high-gain potential while maintaining mathematical discipline
 */

import { PrismaClient } from '@prisma/client';
import { krakenProxyService } from './kraken-proxy-service';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface LearningOpportunity {
  symbol: string;
  currentPerformance: {
    signals: number;
    accuracy: number;
    avgPnL: number;
  };
  potentialGain: number;
  marketActivity: number;
  learningPriority: number;
}

export class AdaptiveLearningExpander extends EventEmitter {
  private static instance: AdaptiveLearningExpander;
  private learningQueue: Map<string, LearningOpportunity> = new Map();
  private activelyLearning: Set<string> = new Set();
  private performanceThresholds = {
    minSignals: 10,        // Minimum signals to consider learned
    minAccuracy: 0.5,      // Minimum accuracy to keep learning
    maxPairs: 50,          // Maximum pairs to actively learn
    expansionRate: 5       // New pairs to add per cycle
  };

  private constructor() {
    super();
  }

  static getInstance(): AdaptiveLearningExpander {
    if (!this.instance) {
      this.instance = new AdaptiveLearningExpander();
    }
    return this.instance;
  }

  /**
   * Expand learning to capture more opportunities
   */
  async expandLearning(): Promise<void> {
    console.log('🧠 ADAPTIVE LEARNING EXPANDER: Searching for new opportunities...');

    try {
      // 1. Get all available trading pairs from market
      const allPairs = await this.getAllTradingPairs();

      // 2. Get current learning status
      const currentLearning = await this.getCurrentLearningStatus();

      // 3. Identify high-potential new pairs
      const opportunities = await this.identifyOpportunities(allPairs, currentLearning);

      // 4. Prioritize by potential gain
      const prioritized = this.prioritizeOpportunities(opportunities);

      // 5. Add top opportunities to learning queue
      await this.addToLearningQueue(prioritized);

      // 6. Update learning parameters dynamically
      await this.updateLearningParameters();

      console.log(`✅ Learning expanded: ${this.activelyLearning.size} pairs actively learning`);
      console.log(`   Top opportunities: ${Array.from(this.learningQueue.keys()).slice(0, 5).join(', ')}`);

    } catch (error) {
      console.error('❌ Learning expansion error:', error);
      this.emit('expansionError', error);
    }
  }

  /**
   * Get all available trading pairs
   */
  private async getAllTradingPairs(): Promise<string[]> {
    try {
      // Get from Kraken API
      const tickers = await krakenProxyService.get24hrTickers();

      // Filter for USD pairs with good volume
      const usdPairs = tickers
        .filter(t => t.symbol.endsWith('USD') && parseFloat(t.volume) > 100000)
        .map(t => t.symbol)
        .sort((a, b) => {
          const volA = tickers.find(t => t.symbol === a)?.volume || '0';
          const volB = tickers.find(t => t.symbol === b)?.volume || '0';
          return parseFloat(volB) - parseFloat(volA);
        });

      return usdPairs;
    } catch (error) {
      console.error('Failed to get trading pairs:', error);
      return [];
    }
  }

  /**
   * Get current learning status from database
   */
  private async getCurrentLearningStatus(): Promise<Map<string, any>> {
    const performances = await prisma.adaptiveLearningPerformance.findMany();

    const statusMap = new Map();
    performances.forEach(perf => {
      statusMap.set(perf.symbol, {
        totalSignals: perf.totalSignals,
        accuracy: perf.accuracy,
        avgPnL: perf.avgPnL,
        lastUpdate: perf.updatedAt
      });
    });

    return statusMap;
  }

  /**
   * Identify high-potential opportunities
   */
  private async identifyOpportunities(
    allPairs: string[],
    currentLearning: Map<string, any>
  ): Promise<LearningOpportunity[]> {
    const opportunities: LearningOpportunity[] = [];

    for (const symbol of allPairs) {
      // Skip if already well-learned
      const existing = currentLearning.get(symbol);
      if (existing && existing.totalSignals > 100 && existing.accuracy > 0.7) {
        continue; // Already mastered this pair
      }

      try {
        // Get current market data
        const ticker = await krakenProxyService.getTicker(symbol);
        const priceChange = parseFloat(ticker.priceChangePercent || '0');
        const volume = parseFloat(ticker.volume || '0');

        // Calculate potential gain based on volatility and volume
        const volatility = Math.abs(priceChange);
        const potentialGain = volatility * Math.log10(volume / 100000 + 1);

        // Calculate market activity score
        const marketActivity = (volume / 1000000) * (1 + volatility / 10);

        // Calculate learning priority
        let learningPriority = potentialGain * marketActivity;

        // Boost priority for completely new pairs
        if (!existing) {
          learningPriority *= 2;
        }
        // Boost priority for pairs with good early results
        else if (existing.totalSignals < 50 && existing.accuracy > 0.6) {
          learningPriority *= 1.5;
        }

        // Check for extreme movers (>50% in 24h)
        if (Math.abs(priceChange) > 50) {
          learningPriority *= 3;
          console.log(`🚀 EXTREME MOVER DETECTED: ${symbol} ${priceChange.toFixed(1)}% in 24h`);
        }

        opportunities.push({
          symbol,
          currentPerformance: existing || { signals: 0, accuracy: 0, avgPnL: 0 },
          potentialGain,
          marketActivity,
          learningPriority
        });

      } catch (error) {
        // Skip pairs that fail to load
        continue;
      }
    }

    return opportunities;
  }

  /**
   * Prioritize opportunities by potential
   */
  private prioritizeOpportunities(opportunities: LearningOpportunity[]): LearningOpportunity[] {
    // Sort by learning priority (highest first)
    return opportunities
      .sort((a, b) => b.learningPriority - a.learningPriority)
      .slice(0, this.performanceThresholds.maxPairs);
  }

  /**
   * Add opportunities to learning queue
   */
  private async addToLearningQueue(opportunities: LearningOpportunity[]): Promise<void> {
    // Clear old queue
    this.learningQueue.clear();

    // Add all opportunities to queue
    opportunities.forEach(opp => {
      this.learningQueue.set(opp.symbol, opp);
    });

    // Select top N for active learning
    const topOpportunities = opportunities.slice(0, this.performanceThresholds.expansionRate);

    for (const opp of topOpportunities) {
      if (!this.activelyLearning.has(opp.symbol)) {
        this.activelyLearning.add(opp.symbol);

        // Initialize learning record if new
        const existing = await prisma.adaptiveLearningPerformance.findFirst({
          where: { symbol: opp.symbol }
        });

        if (!existing) {
          await prisma.adaptiveLearningPerformance.create({
            data: {
              symbol: opp.symbol,
              category: 'long', // Start with long, can expand to short later
              totalSignals: 0,
              correctSignals: 0,
              accuracy: 0,
              totalPnL: 0,
              avgPnL: 0,
              confidence: 0.5
            }
          });

          console.log(`🆕 Added ${opp.symbol} to adaptive learning (Priority: ${opp.learningPriority.toFixed(2)})`);
          this.emit('newPairAdded', opp.symbol);
        }
      }
    }
  }

  /**
   * Update learning parameters based on performance
   */
  private async updateLearningParameters(): Promise<void> {
    // Get overall system performance
    const performances = await prisma.adaptiveLearningPerformance.findMany();

    if (performances.length === 0) return;

    // Calculate system-wide metrics
    const totalAccuracy = performances.reduce((sum, p) => sum + p.accuracy, 0) / performances.length;
    const profitablePairs = performances.filter(p => p.avgPnL > 0).length;
    const profitRatio = profitablePairs / performances.length;

    // Dynamically adjust parameters based on performance
    if (totalAccuracy > 0.7 && profitRatio > 0.6) {
      // System performing well - be more aggressive
      this.performanceThresholds.expansionRate = Math.min(10, this.performanceThresholds.expansionRate + 1);
      this.performanceThresholds.maxPairs = Math.min(100, this.performanceThresholds.maxPairs + 10);
      console.log(`📈 Performance excellent - expanding learning capacity`);
    } else if (totalAccuracy < 0.4 || profitRatio < 0.3) {
      // System struggling - be more conservative
      this.performanceThresholds.expansionRate = Math.max(2, this.performanceThresholds.expansionRate - 1);
      this.performanceThresholds.maxPairs = Math.max(20, this.performanceThresholds.maxPairs - 5);
      console.log(`📉 Performance poor - focusing on fewer pairs`);
    }

    // Remove underperforming pairs from active learning
    for (const perf of performances) {
      if (perf.totalSignals > 50 && perf.accuracy < 0.3) {
        this.activelyLearning.delete(perf.symbol);
        console.log(`❌ Removed ${perf.symbol} from learning (accuracy: ${(perf.accuracy * 100).toFixed(1)}%)`);
        this.emit('pairRemoved', perf.symbol);
      }
    }
  }

  /**
   * Get recommended pairs for trading based on learning
   */
  async getRecommendedPairs(): Promise<string[]> {
    const performances = await prisma.adaptiveLearningPerformance.findMany({
      where: {
        totalSignals: { gte: this.performanceThresholds.minSignals },
        accuracy: { gte: this.performanceThresholds.minAccuracy }
      },
      orderBy: [
        { avgPnL: 'desc' },
        { accuracy: 'desc' }
      ],
      take: 20
    });

    return performances.map(p => p.symbol);
  }

  /**
   * Check if a pair should be traded based on learning
   */
  async shouldTradePair(symbol: string): Promise<{ shouldTrade: boolean; confidence: number; reason: string }> {
    const performance = await prisma.adaptiveLearningPerformance.findFirst({
      where: { symbol }
    });

    if (!performance) {
      // New pair - trade with caution
      return {
        shouldTrade: true,
        confidence: 0.5,
        reason: 'New pair - exploratory trading'
      };
    }

    // Well-learned profitable pair
    if (performance.totalSignals > 50 && performance.accuracy > 0.7 && performance.avgPnL > 0) {
      return {
        shouldTrade: true,
        confidence: performance.accuracy,
        reason: `Well-learned: ${performance.totalSignals} signals, ${(performance.accuracy * 100).toFixed(1)}% accuracy`
      };
    }

    // Learning phase - trade to gather data
    if (performance.totalSignals < 20) {
      return {
        shouldTrade: true,
        confidence: 0.6,
        reason: `Learning phase: ${performance.totalSignals} signals so far`
      };
    }

    // Poor performer - avoid
    if (performance.accuracy < 0.3 && performance.totalSignals > 30) {
      return {
        shouldTrade: false,
        confidence: 0.2,
        reason: `Poor performance: ${(performance.accuracy * 100).toFixed(1)}% accuracy over ${performance.totalSignals} signals`
      };
    }

    // Default - trade with moderate confidence
    return {
      shouldTrade: true,
      confidence: performance.accuracy || 0.5,
      reason: `Standard trading: ${(performance.accuracy * 100).toFixed(1)}% accuracy`
    };
  }

  /**
   * Record trade outcome for learning
   */
  async recordTradeOutcome(
    symbol: string,
    wasCorrect: boolean,
    pnl: number
  ): Promise<void> {
    try {
      const performance = await prisma.adaptiveLearningPerformance.findFirst({
        where: { symbol }
      });

      if (!performance) {
        // Create new record
        await prisma.adaptiveLearningPerformance.create({
          data: {
            symbol,
            category: 'long',
            totalSignals: 1,
            correctSignals: wasCorrect ? 1 : 0,
            accuracy: wasCorrect ? 1 : 0,
            totalPnL: pnl,
            avgPnL: pnl,
            confidence: 0.5,
            lastSignalTime: new Date(),
            lastOutcome: wasCorrect ? 'correct' : 'incorrect',
            lastPnL: pnl
          }
        });
      } else {
        // Update existing record
        const newTotal = performance.totalSignals + 1;
        const newCorrect = performance.correctSignals + (wasCorrect ? 1 : 0);
        const newAccuracy = newCorrect / newTotal;
        const newTotalPnL = performance.totalPnL + pnl;
        const newAvgPnL = newTotalPnL / newTotal;

        // Update confidence based on recent performance
        const recentWeight = 0.3;
        const newConfidence = (performance.confidence * (1 - recentWeight)) + (wasCorrect ? recentWeight : 0);

        await prisma.adaptiveLearningPerformance.update({
          where: { id: performance.id },
          data: {
            totalSignals: newTotal,
            correctSignals: newCorrect,
            accuracy: newAccuracy,
            totalPnL: newTotalPnL,
            avgPnL: newAvgPnL,
            confidence: newConfidence,
            lastSignalTime: new Date(),
            lastOutcome: wasCorrect ? 'correct' : 'incorrect',
            lastPnL: pnl,
            recentStreak: wasCorrect
              ? Math.max(0, performance.recentStreak + 1)
              : Math.min(0, performance.recentStreak - 1)
          }
        });

        // Emit learning event
        this.emit('learningUpdate', {
          symbol,
          accuracy: newAccuracy,
          avgPnL: newAvgPnL,
          totalSignals: newTotal
        });

        // Check for exceptional performance
        if (newAccuracy > 0.8 && newTotal > 20) {
          console.log(`⭐ STAR PERFORMER: ${symbol} - ${(newAccuracy * 100).toFixed(1)}% accuracy over ${newTotal} trades`);
          this.emit('starPerformer', { symbol, accuracy: newAccuracy, avgPnL: newAvgPnL });
        }
      }
    } catch (error) {
      console.error(`Failed to record trade outcome for ${symbol}:`, error);
    }
  }

  /**
   * Get learning statistics
   */
  async getLearningStatistics(): Promise<any> {
    const performances = await prisma.adaptiveLearningPerformance.findMany();

    const stats = {
      totalPairsLearned: performances.length,
      activelyLearning: this.activelyLearning.size,
      inQueue: this.learningQueue.size,
      starPerformers: performances.filter(p => p.accuracy > 0.7 && p.totalSignals > 50).length,
      poorPerformers: performances.filter(p => p.accuracy < 0.3 && p.totalSignals > 30).length,
      averageAccuracy: performances.reduce((sum, p) => sum + p.accuracy, 0) / performances.length,
      profitablePairs: performances.filter(p => p.avgPnL > 0).length,
      totalPnL: performances.reduce((sum, p) => sum + p.totalPnL, 0)
    };

    return stats;
  }
}

export const adaptiveLearningExpander = AdaptiveLearningExpander.getInstance();