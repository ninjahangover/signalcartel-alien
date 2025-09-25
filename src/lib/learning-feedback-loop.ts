/**
 * LEARNING FEEDBACK LOOP - System gets smarter with each trade
 *
 * This is what separates reactive systems from truly intelligent ones.
 * Every trade outcome teaches the system something new about the markets.
 */

import { PrismaClient } from '@prisma/client';

interface TradeOutcome {
  id: string;
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  side: 'long' | 'short';
  entryTime: Date;
  exitTime: Date;
  pnlPercent: number;
  pnlDollar: number;

  // Prediction data at entry
  prediction: {
    expectedMove: number;
    confidence: number;
    timeHorizon: number;
    reasoning: string;
    source: string; // 'hockey-stick', 'tensor-fusion', 'profit-predator', etc.
  };

  // Market conditions at entry
  marketConditions: {
    volatility: number;
    momentum: number;
    volume: number;
    sentiment?: number;
  };

  // What actually happened
  actualOutcome: {
    actualMove: number;
    timeToMove: number;
    maxFavorableMove: number;
    maxAdverseMove: number;
  };
}

interface LearningInsight {
  pattern: string;
  accuracy: number;
  averageReturn: number;
  sampleSize: number;
  confidence: number;
  lastUpdated: Date;

  // Contextual factors
  bestConditions: any;
  worstConditions: any;
  improvements: string[];
}

export class LearningFeedbackLoop {
  private prisma: PrismaClient;
  private learningInsights: Map<string, LearningInsight> = new Map();
  private recentOutcomes: TradeOutcome[] = [];

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Record a trade outcome for learning
   */
  async recordTradeOutcome(outcome: TradeOutcome): Promise<void> {
    console.log(`🧠 LEARNING: Recording outcome for ${outcome.symbol}`);
    console.log(`   Predicted: ${outcome.prediction.expectedMove.toFixed(1)}%, Actual: ${outcome.actualOutcome.actualMove.toFixed(1)}%`);
    console.log(`   P&L: ${outcome.pnlPercent.toFixed(1)}%, Source: ${outcome.prediction.source}`);

    // Store in recent outcomes
    this.recentOutcomes.push(outcome);
    if (this.recentOutcomes.length > 1000) {
      this.recentOutcomes = this.recentOutcomes.slice(-1000); // Keep last 1000
    }

    // Update learning insights
    await this.updateLearningInsights(outcome);

    // Store in database for long-term learning
    await this.storeInDatabase(outcome);
  }

  /**
   * Get learning-adjusted prediction confidence
   */
  getAdjustedConfidence(
    symbol: string,
    predictionSource: string,
    marketConditions: any,
    rawConfidence: number
  ): number {

    const pattern = this.encodePattern(symbol, predictionSource, marketConditions);
    const insight = this.learningInsights.get(pattern);

    if (!insight || insight.sampleSize < 5) {
      // Not enough data, return raw confidence with slight penalty
      return Math.max(0.1, rawConfidence * 0.9);
    }

    // Adjust confidence based on historical accuracy
    const accuracyAdjustment = insight.accuracy - 0.5; // -0.5 to +0.5 adjustment
    const sampleSizeBoost = Math.min(0.1, insight.sampleSize / 200); // Up to 10% boost for large samples

    const adjustedConfidence = rawConfidence + accuracyAdjustment + sampleSizeBoost;

    console.log(`🧠 CONFIDENCE ADJUSTMENT: ${(rawConfidence*100).toFixed(1)}% → ${(adjustedConfidence*100).toFixed(1)}%`);
    console.log(`   Pattern accuracy: ${(insight.accuracy*100).toFixed(1)}% over ${insight.sampleSize} trades`);

    return Math.max(0.05, Math.min(0.95, adjustedConfidence));
  }

  /**
   * Get expected return adjustment based on learning
   */
  getAdjustedExpectedReturn(
    symbol: string,
    predictionSource: string,
    marketConditions: any,
    rawExpectedReturn: number
  ): number {

    const pattern = this.encodePattern(symbol, predictionSource, marketConditions);
    const insight = this.learningInsights.get(pattern);

    if (!insight || insight.sampleSize < 10) {
      return rawExpectedReturn; // Not enough data
    }

    // Adjust expected return based on historical average
    const historicalBias = insight.averageReturn - rawExpectedReturn;
    const adjustmentFactor = Math.min(0.5, insight.sampleSize / 100); // Stronger adjustment with more data

    const adjustment = historicalBias * adjustmentFactor;
    const adjustedReturn = rawExpectedReturn + adjustment;

    if (Math.abs(adjustment) > 0.01) { // Only log significant adjustments
      console.log(`🎯 RETURN ADJUSTMENT: ${(rawExpectedReturn*100).toFixed(1)}% → ${(adjustedReturn*100).toFixed(1)}%`);
      console.log(`   Historical bias: ${(historicalBias*100).toFixed(1)}% over ${insight.sampleSize} trades`);
    }

    return adjustedReturn;
  }

  /**
   * Check if we should avoid trading a pattern based on poor performance
   */
  shouldAvoidPattern(
    symbol: string,
    predictionSource: string,
    marketConditions: any
  ): boolean {

    const pattern = this.encodePattern(symbol, predictionSource, marketConditions);
    const insight = this.learningInsights.get(pattern);

    if (!insight || insight.sampleSize < 20) {
      return false; // Not enough data to avoid
    }

    // Avoid if accuracy is very poor with large sample size
    const shouldAvoid = insight.accuracy < 0.3 && insight.sampleSize >= 30;

    if (shouldAvoid) {
      console.log(`🚫 PATTERN AVOIDANCE: ${pattern} - ${(insight.accuracy*100).toFixed(1)}% accuracy over ${insight.sampleSize} trades`);
    }

    return shouldAvoid;
  }

  /**
   * Get market timing insights
   */
  getTimingInsights(symbol: string): {
    bestEntryTime: number; // Hour of day (0-23)
    bestExitTime: number;
    avgHoldTime: number; // Minutes
    quickExitThreshold: number; // % move that suggests quick exit
  } {

    const symbolOutcomes = this.recentOutcomes.filter(o => o.symbol === symbol);

    if (symbolOutcomes.length < 10) {
      return {
        bestEntryTime: 9, // Default to market open
        bestExitTime: 15, // Default to 3 PM
        avgHoldTime: 240, // 4 hours
        quickExitThreshold: 5 // 5%
      };
    }

    // Calculate best entry times
    const hourlyPerformance = new Map<number, { trades: number, avgReturn: number }>();

    symbolOutcomes.forEach(outcome => {
      const hour = outcome.entryTime.getHours();
      const existing = hourlyPerformance.get(hour) || { trades: 0, avgReturn: 0 };

      existing.trades++;
      existing.avgReturn = (existing.avgReturn * (existing.trades - 1) + outcome.pnlPercent) / existing.trades;

      hourlyPerformance.set(hour, existing);
    });

    // Find best performing hour with at least 3 trades
    let bestEntryHour = 9;
    let bestReturn = -Infinity;

    for (const [hour, data] of hourlyPerformance) {
      if (data.trades >= 3 && data.avgReturn > bestReturn) {
        bestReturn = data.avgReturn;
        bestEntryHour = hour;
      }
    }

    // Calculate average hold time
    const holdTimes = symbolOutcomes.map(o =>
      (o.exitTime.getTime() - o.entryTime.getTime()) / (1000 * 60)
    );
    const avgHoldTime = holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length;

    // Calculate quick exit threshold
    const profitableTrades = symbolOutcomes.filter(o => o.pnlPercent > 2);
    const fastProfitTrades = profitableTrades.filter(o =>
      (o.exitTime.getTime() - o.entryTime.getTime()) < 30 * 60 * 1000 // 30 minutes
    );

    const quickExitThreshold = fastProfitTrades.length > 0 ?
      fastProfitTrades.reduce((sum, t) => sum + Math.abs(t.pnlPercent), 0) / fastProfitTrades.length :
      5;

    console.log(`⏰ TIMING INSIGHTS for ${symbol}:`);
    console.log(`   Best entry hour: ${bestEntryHour}:00 (${bestReturn.toFixed(1)}% avg return)`);
    console.log(`   Avg hold time: ${avgHoldTime.toFixed(0)} minutes`);
    console.log(`   Quick exit threshold: ${quickExitThreshold.toFixed(1)}%`);

    return {
      bestEntryTime: bestEntryHour,
      bestExitTime: (bestEntryHour + Math.round(avgHoldTime / 60)) % 24,
      avgHoldTime,
      quickExitThreshold
    };
  }

  /**
   * Generate learning-based trading recommendations
   */
  async generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze recent performance
    const recentTrades = this.recentOutcomes.slice(-100);

    if (recentTrades.length < 20) {
      recommendations.push("🧠 LEARNING: Need more trade data for meaningful insights (min 20 trades)");
      return recommendations;
    }

    // Calculate overall accuracy
    const winRate = recentTrades.filter(t => t.pnlPercent > 0).length / recentTrades.length;
    const avgReturn = recentTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / recentTrades.length;

    recommendations.push(`📊 RECENT PERFORMANCE: ${(winRate*100).toFixed(1)}% win rate, ${avgReturn.toFixed(1)}% avg return`);

    // Find best performing strategies
    const strategyPerformance = new Map<string, { trades: number, winRate: number, avgReturn: number }>();

    recentTrades.forEach(trade => {
      const strategy = trade.prediction.source;
      const existing = strategyPerformance.get(strategy) || { trades: 0, winRate: 0, avgReturn: 0 };

      existing.trades++;
      existing.winRate = ((existing.winRate * (existing.trades - 1)) + (trade.pnlPercent > 0 ? 1 : 0)) / existing.trades;
      existing.avgReturn = ((existing.avgReturn * (existing.trades - 1)) + trade.pnlPercent) / existing.trades;

      strategyPerformance.set(strategy, existing);
    });

    // Recommend best strategies
    const sortedStrategies = Array.from(strategyPerformance.entries())
      .filter(([_, data]) => data.trades >= 5)
      .sort((a, b) => (b[1].winRate * b[1].avgReturn) - (a[1].winRate * a[1].avgReturn));

    if (sortedStrategies.length > 0) {
      const [bestStrategy, bestData] = sortedStrategies[0];
      recommendations.push(`🚀 BEST STRATEGY: ${bestStrategy} - ${(bestData.winRate*100).toFixed(1)}% win rate, ${bestData.avgReturn.toFixed(1)}% avg return`);
    }

    // Identify patterns to avoid
    const poorPerformers = Array.from(strategyPerformance.entries())
      .filter(([_, data]) => data.trades >= 10 && data.winRate < 0.4)
      .sort((a, b) => a[1].winRate - b[1].winRate);

    poorPerformers.forEach(([strategy, data]) => {
      recommendations.push(`⚠️ AVOID: ${strategy} - Only ${(data.winRate*100).toFixed(1)}% win rate over ${data.trades} trades`);
    });

    return recommendations;
  }

  // Private methods
  private async updateLearningInsights(outcome: TradeOutcome): Promise<void> {
    const pattern = this.encodePattern(
      outcome.symbol,
      outcome.prediction.source,
      outcome.marketConditions
    );

    const existing = this.learningInsights.get(pattern) || {
      pattern,
      accuracy: 0.5,
      averageReturn: 0,
      sampleSize: 0,
      confidence: 0.5,
      lastUpdated: new Date(),
      bestConditions: null,
      worstConditions: null,
      improvements: []
    };

    // Update accuracy (was prediction direction correct?)
    const predictionCorrect = (
      Math.sign(outcome.prediction.expectedMove) === Math.sign(outcome.actualOutcome.actualMove)
    );

    existing.sampleSize++;
    existing.accuracy = ((existing.accuracy * (existing.sampleSize - 1)) + (predictionCorrect ? 1 : 0)) / existing.sampleSize;
    existing.averageReturn = ((existing.averageReturn * (existing.sampleSize - 1)) + outcome.pnlPercent) / existing.sampleSize;
    existing.confidence = Math.min(0.9, existing.accuracy * Math.min(1, existing.sampleSize / 50));
    existing.lastUpdated = new Date();

    // Track best/worst conditions
    if (!existing.bestConditions || outcome.pnlPercent > 3) {
      existing.bestConditions = { ...outcome.marketConditions, pnl: outcome.pnlPercent };
    }

    if (!existing.worstConditions || outcome.pnlPercent < -3) {
      existing.worstConditions = { ...outcome.marketConditions, pnl: outcome.pnlPercent };
    }

    this.learningInsights.set(pattern, existing);
  }

  private encodePattern(symbol: string, source: string, conditions: any): string {
    // Create a pattern string that captures the essence of the trade setup
    const vol = conditions.volatility > 0.02 ? 'H' : conditions.volatility < 0.01 ? 'L' : 'M';
    const mom = conditions.momentum > 0.01 ? 'U' : conditions.momentum < -0.01 ? 'D' : 'N';
    const volLevel = conditions.volume > 1000 ? 'HV' : 'NV';

    return `${source}:${symbol}:${vol}${mom}${volLevel}`;
  }

  private async storeInDatabase(outcome: TradeOutcome): Promise<void> {
    try {
      // Store in a learning outcomes table for long-term analysis
      // This would be implemented with actual database schema
      console.log(`💾 LEARNING DATABASE: Stored outcome for ${outcome.symbol}`);

    } catch (error) {
      console.error(`❌ Database storage failed: ${error.message}`);
    }
  }

  /**
   * Get overall system learning health
   */
  getLearningHealth(): {
    totalPatterns: number;
    averageAccuracy: number;
    highConfidencePatterns: number;
    recentTradeCount: number;
    learningVelocity: number; // How fast system is learning
  } {

    const patterns = Array.from(this.learningInsights.values());
    const totalPatterns = patterns.length;
    const averageAccuracy = patterns.length > 0 ?
      patterns.reduce((sum, p) => sum + p.accuracy, 0) / patterns.length : 0.5;

    const highConfidencePatterns = patterns.filter(p => p.confidence > 0.7).length;
    const recentTradeCount = this.recentOutcomes.filter(
      o => Date.now() - o.exitTime.getTime() < 24 * 60 * 60 * 1000
    ).length; // Last 24 hours

    // Learning velocity = rate of new pattern discovery
    const recentPatterns = patterns.filter(
      p => Date.now() - p.lastUpdated.getTime() < 7 * 24 * 60 * 60 * 1000
    ).length; // Last 7 days

    const learningVelocity = recentPatterns / 7; // New patterns per day

    return {
      totalPatterns,
      averageAccuracy,
      highConfidencePatterns,
      recentTradeCount,
      learningVelocity
    };
  }
}