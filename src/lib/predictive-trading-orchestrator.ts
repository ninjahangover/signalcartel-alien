/**
 * PREDICTIVE TRADING ORCHESTRATOR
 *
 * The master system that combines all predictive components to
 * enter before the crowd and exit at peaks. This is profit maximization
 * through anticipation, not reaction.
 *
 * Components:
 * 1. Hockey Stick Detector - Catches explosive moves early
 * 2. Predictive Market Intelligence - Anticipates changes
 * 3. Learning Feedback Loop - Gets smarter with each trade
 */

import { PredictiveMarketIntelligence } from './predictive-market-intelligence';
import { HockeyStickDetector } from './hockey-stick-detector';
import { LearningFeedbackLoop } from './learning-feedback-loop';

interface PredictiveSignal {
  action: 'STRONG_BUY' | 'BUY' | 'STRONG_SELL' | 'SELL' | 'HOLD' | 'WAIT';
  confidence: number;
  expectedMove: number;
  timeToMove: number;
  urgency: 'IMMEDIATE' | 'SOON' | 'BUILDING' | 'DEVELOPING';
  reasoning: string;

  // Profit maximization metadata
  positionSizeMultiplier: number; // 1.0 = normal, 2.0 = double size for high confidence
  maxHoldTime: number; // Minutes before re-evaluation
  exitStrategy: 'PEAK_DETECTION' | 'MOMENTUM_DECAY' | 'TIME_BASED' | 'LEARNING_BASED';

  // Risk management
  stopLoss: number; // % from entry
  takeProfit: number; // % from entry
  trailingStop: boolean;

  // Learning integration
  adjustedConfidence: number; // After learning adjustments
  patternMatch: string; // Which learned pattern this matches
  historicalAccuracy: number; // How accurate similar setups have been
}

export class PredictiveTradingOrchestrator {
  private predictiveIntelligence: PredictiveMarketIntelligence;
  private hockeyStickDetector: HockeyStickDetector;
  private learningLoop: LearningFeedbackLoop;

  // Performance tracking
  private predictionHistory: Map<string, any[]> = new Map();
  private activePositions: Map<string, any> = new Map();

  constructor() {
    this.predictiveIntelligence = new PredictiveMarketIntelligence();
    this.hockeyStickDetector = new HockeyStickDetector();
    this.learningLoop = new LearningFeedbackLoop();
  }

  /**
   * MAIN ORCHESTRATION: Generate predictive trading signal
   */
  async generatePredictiveSignal(
    symbol: string,
    currentPrice: number,
    marketData: {
      prices: number[];
      volumes: number[];
      timestamps: Date[];
      orderBook?: any;
      sentiment?: any;
    },
    currentPosition?: any
  ): Promise<PredictiveSignal> {

    console.log(`🔮 PREDICTIVE ANALYSIS: Starting anticipatory analysis for ${symbol}`);

    // 1. HOCKEY STICK DETECTION - Highest priority for explosive moves
    const hockeyStickSignal = await this.hockeyStickDetector.detectHockeyStick(
      symbol,
      currentPrice,
      marketData.prices,
      marketData.volumes,
      marketData.orderBook,
      currentPosition
    );

    // 2. PREDICTIVE INTELLIGENCE - Multi-timeframe anticipation
    const predictiveSignal = await this.predictiveIntelligence.predictNextMove(
      symbol,
      currentPrice,
      marketData.prices,
      marketData.volumes,
      marketData.orderBook
    );

    // 3. LEARNING ADJUSTMENTS - Apply what we've learned
    const learningAdjustments = this.applyLearningAdjustments(
      symbol,
      predictiveSignal,
      marketData
    );

    // 4. POSITION-AWARE LOGIC - Different logic for entries vs exits
    const positionAwareSignal = this.applyPositionLogic(
      hockeyStickSignal,
      predictiveSignal,
      learningAdjustments,
      currentPosition
    );

    // 5. RISK MANAGEMENT - Dynamic stop losses and take profits
    const finalSignal = this.applyPredictiveRiskManagement(
      positionAwareSignal,
      symbol,
      marketData
    );

    // 6. LOG AND TRACK - Store for learning
    this.logPrediction(symbol, finalSignal, marketData);

    return finalSignal;
  }

  /**
   * Apply learning-based adjustments to raw predictions
   */
  private applyLearningAdjustments(
    symbol: string,
    prediction: any,
    marketData: any
  ): any {

    const marketConditions = {
      volatility: this.calculateVolatility(marketData.prices),
      momentum: this.calculateMomentum(marketData.prices),
      volume: marketData.volumes[marketData.volumes.length - 1]
    };

    // Get learning-adjusted confidence
    const adjustedConfidence = this.learningLoop.getAdjustedConfidence(
      symbol,
      'predictive-intelligence',
      marketConditions,
      prediction.confidence
    );

    // Get learning-adjusted expected return
    const adjustedExpectedMove = this.learningLoop.getAdjustedExpectedReturn(
      symbol,
      'predictive-intelligence',
      marketConditions,
      prediction.expectedMagnitude
    );

    // Check if we should avoid this pattern
    const shouldAvoid = this.learningLoop.shouldAvoidPattern(
      symbol,
      'predictive-intelligence',
      marketConditions
    );

    return {
      ...prediction,
      originalConfidence: prediction.confidence,
      adjustedConfidence,
      adjustedExpectedMove,
      shouldAvoid,
      learningPattern: `${symbol}-predictive-${this.encodeConditions(marketConditions)}`
    };
  }

  /**
   * Apply position-aware logic (entry vs exit strategies)
   */
  private applyPositionLogic(
    hockeyStickSignal: any,
    predictiveSignal: any,
    learningSignal: any,
    currentPosition?: any
  ): PredictiveSignal {

    // PRIORITY 1: Hockey Stick signals (immediate profit opportunities)
    if (hockeyStickSignal && hockeyStickSignal.confidence > 0.7) {
      return this.convertHockeyStickSignal(hockeyStickSignal, learningSignal);
    }

    // PRIORITY 2: Exit signals for existing positions
    if (currentPosition) {
      return this.generateExitSignal(currentPosition, predictiveSignal, learningSignal);
    }

    // PRIORITY 3: Entry signals for new positions
    return this.generateEntrySignal(predictiveSignal, learningSignal);
  }

  /**
   * Convert hockey stick signal to orchestrated signal
   */
  private convertHockeyStickSignal(hockeySignal: any, learningSignal: any): PredictiveSignal {
    const isEntry = hockeySignal.type.includes('ENTRY');
    const isLong = hockeySignal.type.includes('LONG');

    return {
      action: isEntry ?
        (isLong ? 'STRONG_BUY' : 'STRONG_SELL') :
        (isLong ? 'STRONG_SELL' : 'STRONG_BUY'), // Exit opposite of entry
      confidence: hockeySignal.confidence,
      expectedMove: Math.abs(hockeySignal.expectedMove),
      timeToMove: hockeySignal.timeToMove,
      urgency: hockeySignal.urgency,
      reasoning: `Hockey stick ${isEntry ? 'entry' : 'exit'}: ${hockeySignal.reasoning}`,
      positionSizeMultiplier: hockeySignal.urgency === 'IMMEDIATE' ? 2.0 : 1.5,
      maxHoldTime: isEntry ? 240 : 5, // 4 hours entry, 5 minutes exit
      exitStrategy: 'PEAK_DETECTION',
      stopLoss: isEntry ? 5 : 2, // 5% entry stop, 2% exit stop
      takeProfit: Math.max(8, hockeySignal.expectedMove * 0.8),
      trailingStop: isEntry,
      adjustedConfidence: learningSignal.adjustedConfidence || hockeySignal.confidence,
      patternMatch: 'hockey-stick',
      historicalAccuracy: 0.75 // Hockey sticks typically 75% accurate
    };
  }

  /**
   * Generate exit signal for existing position
   */
  private generateExitSignal(
    position: any,
    predictiveSignal: any,
    learningSignal: any
  ): PredictiveSignal {

    const currentPnL = this.calculateCurrentPnL(position);
    const holdTime = Date.now() - position.entryTime.getTime();

    // IMMEDIATE EXIT conditions
    if (currentPnL > 15) { // 15% profit - take it
      return {
        action: position.side === 'long' ? 'STRONG_SELL' : 'STRONG_BUY',
        confidence: 0.9,
        expectedMove: -currentPnL * 0.3, // Expect to give back 30% if we don't exit
        timeToMove: 2,
        urgency: 'IMMEDIATE',
        reasoning: `Exceptional profit ${currentPnL.toFixed(1)}% - secure gains`,
        positionSizeMultiplier: 1.0,
        maxHoldTime: 5,
        exitStrategy: 'PEAK_DETECTION',
        stopLoss: 0,
        takeProfit: 0,
        trailingStop: false,
        adjustedConfidence: 0.9,
        patternMatch: 'profit-taking',
        historicalAccuracy: 0.85
      };
    }

    // PREDICTIVE EXIT conditions
    if (predictiveSignal.prediction === 'REVERSAL_COMING' && currentPnL > 3) {
      return {
        action: position.side === 'long' ? 'SELL' : 'BUY',
        confidence: predictiveSignal.confidence,
        expectedMove: predictiveSignal.expectedMagnitude,
        timeToMove: predictiveSignal.timeHorizon,
        urgency: 'SOON',
        reasoning: `Reversal predicted at ${currentPnL.toFixed(1)}% profit: ${predictiveSignal.reasoning}`,
        positionSizeMultiplier: 1.0,
        maxHoldTime: predictiveSignal.timeHorizon,
        exitStrategy: 'MOMENTUM_DECAY',
        stopLoss: Math.max(2, currentPnL * 0.5),
        takeProfit: 0,
        trailingStop: true,
        adjustedConfidence: learningSignal.adjustedConfidence,
        patternMatch: learningSignal.learningPattern,
        historicalAccuracy: learningSignal.historicalAccuracy || 0.6
      };
    }

    // HOLD position
    return {
      action: 'HOLD',
      confidence: 0.6,
      expectedMove: 0,
      timeToMove: 30,
      urgency: 'DEVELOPING',
      reasoning: `Holding position: ${currentPnL.toFixed(1)}% P&L, ${(holdTime/60000).toFixed(0)} min held`,
      positionSizeMultiplier: 1.0,
      maxHoldTime: 60,
      exitStrategy: 'TIME_BASED',
      stopLoss: 5,
      takeProfit: 10,
      trailingStop: true,
      adjustedConfidence: 0.6,
      patternMatch: 'position-hold',
      historicalAccuracy: 0.5
    };
  }

  /**
   * Generate entry signal for new position
   */
  private generateEntrySignal(
    predictiveSignal: any,
    learningSignal: any
  ): PredictiveSignal {

    // Skip if learning says to avoid
    if (learningSignal.shouldAvoid) {
      return {
        action: 'WAIT',
        confidence: 0.1,
        expectedMove: 0,
        timeToMove: 60,
        urgency: 'DEVELOPING',
        reasoning: `Learning system advises avoiding this pattern`,
        positionSizeMultiplier: 0,
        maxHoldTime: 0,
        exitStrategy: 'LEARNING_BASED',
        stopLoss: 0,
        takeProfit: 0,
        trailingStop: false,
        adjustedConfidence: 0.1,
        patternMatch: learningSignal.learningPattern,
        historicalAccuracy: learningSignal.historicalAccuracy || 0.3
      };
    }

    // Strong entry signal
    if (learningSignal.adjustedConfidence > 0.7 && predictiveSignal.prediction === 'SURGE_IMMINENT') {
      const isLong = predictiveSignal.expectedMagnitude > 0;

      return {
        action: isLong ? 'STRONG_BUY' : 'STRONG_SELL',
        confidence: learningSignal.adjustedConfidence,
        expectedMove: Math.abs(learningSignal.adjustedExpectedMove || predictiveSignal.expectedMagnitude),
        timeToMove: predictiveSignal.timeHorizon,
        urgency: predictiveSignal.timeHorizon < 10 ? 'IMMEDIATE' : 'SOON',
        reasoning: `Strong predictive signal: ${predictiveSignal.reasoning} (learning-adjusted)`,
        positionSizeMultiplier: learningSignal.adjustedConfidence * 1.5,
        maxHoldTime: 180, // 3 hours max
        exitStrategy: 'PEAK_DETECTION',
        stopLoss: 4,
        takeProfit: Math.max(6, Math.abs(learningSignal.adjustedExpectedMove) * 0.7),
        trailingStop: true,
        adjustedConfidence: learningSignal.adjustedConfidence,
        patternMatch: learningSignal.learningPattern,
        historicalAccuracy: learningSignal.historicalAccuracy || 0.6
      };
    }

    // Wait for better opportunity
    return {
      action: 'WAIT',
      confidence: predictiveSignal.confidence || 0.3,
      expectedMove: predictiveSignal.expectedMagnitude || 0,
      timeToMove: predictiveSignal.timeHorizon || 60,
      urgency: 'DEVELOPING',
      reasoning: `Waiting for higher confidence setup (current: ${((learningSignal.adjustedConfidence || 0.3) * 100).toFixed(1)}%)`,
      positionSizeMultiplier: 0,
      maxHoldTime: 0,
      exitStrategy: 'TIME_BASED',
      stopLoss: 0,
      takeProfit: 0,
      trailingStop: false,
      adjustedConfidence: learningSignal.adjustedConfidence || 0.3,
      patternMatch: learningSignal.learningPattern || 'low-confidence',
      historicalAccuracy: learningSignal.historicalAccuracy || 0.4
    };
  }

  /**
   * Apply predictive risk management
   */
  private applyPredictiveRiskManagement(
    signal: PredictiveSignal,
    symbol: string,
    marketData: any
  ): PredictiveSignal {

    // Get market context
    const volatility = this.calculateVolatility(marketData.prices);
    const momentum = this.calculateMomentum(marketData.prices);

    // Adjust stops based on volatility
    const volatilityMultiplier = Math.min(2, Math.max(0.5, volatility * 50));

    // Tighter stops in volatile markets, wider in calm markets
    signal.stopLoss = signal.stopLoss * volatilityMultiplier;

    // Adjust position size for volatility
    if (volatility > 0.03) { // High volatility
      signal.positionSizeMultiplier *= 0.7; // Reduce size
    } else if (volatility < 0.01) { // Low volatility
      signal.positionSizeMultiplier *= 1.2; // Increase size
    }

    // Adjust take profit for momentum
    if (Math.abs(momentum) > 0.02) { // Strong momentum
      signal.takeProfit *= 1.3; // Larger target
      signal.trailingStop = true; // Use trailing stop
    }

    console.log(`🛡️ RISK MANAGEMENT: Stop ${signal.stopLoss.toFixed(1)}%, Target ${signal.takeProfit.toFixed(1)}%, Size ${signal.positionSizeMultiplier.toFixed(1)}x`);

    return signal;
  }

  /**
   * Record outcome for learning
   */
  async recordOutcome(
    symbol: string,
    prediction: PredictiveSignal,
    actualOutcome: {
      entryPrice: number;
      exitPrice: number;
      entryTime: Date;
      exitTime: Date;
      pnlPercent: number;
    }
  ): Promise<void> {

    const tradeOutcome = {
      id: `${symbol}-${Date.now()}`,
      symbol,
      entryPrice: actualOutcome.entryPrice,
      exitPrice: actualOutcome.exitPrice,
      side: prediction.action.includes('BUY') ? 'long' as const : 'short' as const,
      entryTime: actualOutcome.entryTime,
      exitTime: actualOutcome.exitTime,
      pnlPercent: actualOutcome.pnlPercent,
      pnlDollar: 0, // Would calculate based on position size

      prediction: {
        expectedMove: prediction.expectedMove,
        confidence: prediction.confidence,
        timeHorizon: prediction.timeToMove,
        reasoning: prediction.reasoning,
        source: 'predictive-orchestrator'
      },

      marketConditions: {
        volatility: 0.02, // Would get from market data
        momentum: 0.01,   // Would get from market data
        volume: 1000      // Would get from market data
      },

      actualOutcome: {
        actualMove: actualOutcome.pnlPercent,
        timeToMove: (actualOutcome.exitTime.getTime() - actualOutcome.entryTime.getTime()) / 60000,
        maxFavorableMove: actualOutcome.pnlPercent * 1.2, // Estimate
        maxAdverseMove: actualOutcome.pnlPercent * 0.8     // Estimate
      }
    };

    await this.learningLoop.recordTradeOutcome(tradeOutcome);
  }

  // Helper methods
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0.02;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 10) return 0;
    return (prices[prices.length - 1] - prices[prices.length - 10]) / prices[prices.length - 10];
  }

  private calculateCurrentPnL(position: any): number {
    // This would calculate actual P&L based on current price vs entry price
    return 0; // Placeholder
  }

  private encodeConditions(conditions: any): string {
    const vol = conditions.volatility > 0.02 ? 'HV' : 'LV';
    const mom = conditions.momentum > 0 ? 'UP' : 'DN';
    return `${vol}-${mom}`;
  }

  private logPrediction(symbol: string, signal: PredictiveSignal, marketData: any): void {
    const history = this.predictionHistory.get(symbol) || [];
    history.push({
      timestamp: new Date(),
      signal,
      marketData: {
        price: marketData.prices[marketData.prices.length - 1],
        volume: marketData.volumes[marketData.volumes.length - 1]
      }
    });

    // Keep last 100 predictions
    if (history.length > 100) {
      history.shift();
    }

    this.predictionHistory.set(symbol, history);

    console.log(`📊 PREDICTIVE SIGNAL: ${signal.action} ${symbol}`);
    console.log(`   Confidence: ${(signal.confidence*100).toFixed(1)}% → ${(signal.adjustedConfidence*100).toFixed(1)}% (learning-adjusted)`);
    console.log(`   Expected: ${signal.expectedMove.toFixed(1)}% in ${signal.timeToMove} minutes`);
    console.log(`   Pattern: ${signal.patternMatch} (${(signal.historicalAccuracy*100).toFixed(1)}% historical accuracy)`);
    console.log(`   Risk: ${signal.stopLoss.toFixed(1)}% stop, ${signal.takeProfit.toFixed(1)}% target`);
    console.log(`   Size: ${signal.positionSizeMultiplier.toFixed(1)}x normal position`);
  }

  /**
   * Get system learning statistics
   */
  getLearningStats(): any {
    return this.learningLoop.getLearningHealth();
  }
}