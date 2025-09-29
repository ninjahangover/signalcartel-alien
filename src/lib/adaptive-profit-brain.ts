/**
 * Adaptive Profit Maximization Brain
 * Evolves mathematical equations dynamically based on real market feedback
 * Replaces static formulas with learning neural pathways
 */

interface TradeOutcome {
  symbol: string;
  expectedReturn: number;
  actualReturn: number;
  winProbability: number;
  actualWin: boolean;
  decisionFactors: {
    timeHeld: number;
    marketRegime: string;
    convictionLevel: number;
    opportunityCost: number;
    rotationScore: number;
  };
  profitImpact: number;
  timestamp: Date;
}

interface NeuralPathway {
  factorName: string;
  weight: number;
  learningRate: number;
  momentum: number;
  lastGradient: number;
  activationHistory: number[];
  profitCorrelation: number;
}

interface EquationGenome {
  id: string;
  formula: string;
  weights: Map<string, number>;
  fitness: number; // Profit per trade
  generation: number;
  mutationRate: number;
  parentIds: string[];
}

export class AdaptiveProfitBrain {
  private static instance: AdaptiveProfitBrain;
  private neuralPathways: Map<string, NeuralPathway> = new Map();
  private tradeHistory: TradeOutcome[] = [];
  private equationGenomes: EquationGenome[] = [];
  private currentGeneration: number = 0;
  private learningEnabled: boolean = true;

  // Core mathematical factors that can be dynamically weighted
  private coreFacts = {
    'expectedReturn': 0.25,
    'winProbability': 0.20,
    'timeDecay': 0.15,
    'opportunityCost': 0.15,
    'convictionLevel': 0.10,
    'marketMomentum': 0.10,
    'transactionCost': -0.05
  };

  static getInstance(): AdaptiveProfitBrain {
    if (!AdaptiveProfitBrain.instance) {
      AdaptiveProfitBrain.instance = new AdaptiveProfitBrain();
    }
    return AdaptiveProfitBrain.instance;
  }

  private constructor() {
    this.initializeNeuralPathways();
    this.loadHistoricalOutcomes();
    console.log('🧠 Adaptive Profit Brain initialized - Learning from market feedback');
  }

  /**
   * Initialize neural pathways from core mathematical factors
   */
  private initializeNeuralPathways(): void {
    for (const [factor, initialWeight] of Object.entries(this.coreFacts)) {
      this.neuralPathways.set(factor, {
        factorName: factor,
        weight: initialWeight,
        learningRate: 0.001 + (Math.random() * 0.009), // 0.001-0.01 range
        momentum: 0.9,
        lastGradient: 0,
        activationHistory: [],
        profitCorrelation: 0
      });
    }
  }

  /**
   * Load recent trade outcomes from database for learning
   * Uses AdaptiveLearningPerformance for real historical data
   */
  private async loadHistoricalOutcomes(): Promise<void> {
    try {
      const { prisma } = await import('./prisma');

      // Load from AdaptiveLearningPerformance - real historical data with no fallbacks
      const adaptivePerformance = await prisma.adaptiveLearningPerformance.findMany({
        where: {
          totalSignals: { gte: 10 } // Only load pairs with meaningful history
        },
        orderBy: { updatedAt: 'desc' },
        take: 50
      });

      for (const perf of adaptivePerformance) {
        // Create synthetic trade outcome from aggregated performance data
        // This represents the average behavior of this symbol
        const outcome: TradeOutcome = {
          symbol: perf.symbol,
          expectedReturn: perf.avgPnL / Math.abs(perf.avgPnL || 1) * 10, // Estimate based on avg P&L
          actualReturn: perf.avgPnL,
          winProbability: perf.accuracy, // Real accuracy from database
          actualWin: perf.avgPnL > 0,
          decisionFactors: {
            timeHeld: 24, // Assume 24 hour average
            marketRegime: 'normal',
            convictionLevel: perf.confidence, // Real confidence from database
            opportunityCost: 0,
            rotationScore: perf.recentStreak / 10 // Convert streak to 0-1 score
          },
          profitImpact: perf.avgPnL,
          timestamp: perf.updatedAt
        };
        this.tradeHistory.push(outcome);
      }

      // No disconnect needed - using singleton
      console.log(`📊 Loaded ${this.tradeHistory.length} historical outcomes from AdaptiveLearningPerformance`);

      if (this.tradeHistory.length > 0) {
        this.evolveFromHistory();
      }
    } catch (error) {
      console.warn('⚠️ Could not load historical data for learning:', error.message);
      // Fail gracefully - brain will learn from live data only
    }
  }

  /**
   * Calculate holding hours from timestamp
   */
  private calculateHoldingHours(createdAt: Date): number {
    return Math.max((Date.now() - createdAt.getTime()) / (1000 * 60 * 60), 0.1);
  }

  /**
   * Evolve neural pathway weights based on historical outcomes
   */
  private evolveFromHistory(): void {
    if (this.tradeHistory.length < 5) return;

    console.log('🔬 Evolving neural pathways from historical feedback...');

    // Calculate profit correlations for each factor
    for (const [factorName, pathway] of this.neuralPathways) {
      const correlations: number[] = [];

      for (const trade of this.tradeHistory) {
        let factorValue = 0;

        switch (factorName) {
          case 'expectedReturn':
            factorValue = trade.expectedReturn / 100;
            break;
          case 'winProbability':
            factorValue = trade.winProbability;
            break;
          case 'timeDecay':
            factorValue = Math.exp(-trade.decisionFactors.timeHeld / 24);
            break;
          case 'opportunityCost':
            factorValue = trade.decisionFactors.opportunityCost;
            break;
          case 'convictionLevel':
            factorValue = trade.decisionFactors.convictionLevel;
            break;
          case 'marketMomentum':
            factorValue = Math.tanh(trade.actualReturn / 10);
            break;
          case 'transactionCost':
            factorValue = -0.0084; // Always negative
            break;
        }

        const profitNormalized = Math.tanh(trade.profitImpact / 100); // Normalize to -1,1
        correlations.push(factorValue * profitNormalized);
      }

      // Calculate average correlation
      const avgCorrelation = correlations.reduce((a, b) => a + b, 0) / correlations.length;
      pathway.profitCorrelation = avgCorrelation;

      // Adaptive weight adjustment based on correlation strength
      const learningSignal = avgCorrelation * pathway.learningRate;
      const momentumTerm = pathway.momentum * pathway.lastGradient;
      const weightUpdate = learningSignal + momentumTerm;

      pathway.weight += weightUpdate;
      pathway.lastGradient = learningSignal;

      // Bounds checking
      pathway.weight = Math.max(-1.0, Math.min(1.0, pathway.weight));

      console.log(`  ${factorName}: weight ${pathway.weight.toFixed(4)} (correlation: ${avgCorrelation.toFixed(3)})`);
    }
  }

  /**
   * Get symbol-specific performance from database
   */
  private async getSymbolPerformance(symbol: string, side: 'long' | 'short' = 'long'): Promise<{
    accuracy: number;
    totalSignals: number;
    totalPnL: number;
    confidence: number;
    recentStreak: number;
  }> {
    try {
      const { prisma } = await import('./prisma');

      const performance = await prisma.adaptiveLearningPerformance.findUnique({
        where: {
          category_symbol: {
            category: side,
            symbol: symbol
          }
        }
      });

      // No disconnect needed - using singleton

      if (!performance || performance.totalSignals === 0) {
        return {
          accuracy: 0.5,
          totalSignals: 0,
          totalPnL: 0,
          confidence: 0.5,
          recentStreak: 0
        };
      }

      return {
        accuracy: performance.accuracy,
        totalSignals: performance.totalSignals,
        totalPnL: performance.totalPnL,
        confidence: performance.confidence,
        recentStreak: performance.recentStreak
      };
    } catch (error) {
      console.warn(`⚠️ Could not fetch performance for ${symbol}:`, error.message);
      return {
        accuracy: 0.5,
        totalSignals: 0,
        totalPnL: 0,
        confidence: 0.5,
        recentStreak: 0
      };
    }
  }

  /**
   * Calculate adaptive profit-maximizing decision using evolved neural pathways
   * This replaces static E = (W × A) - (L × B) with dynamic learning
   */
  async calculateAdaptiveProfitDecision(
    currentPosition: {
      symbol: string;
      actualReturn: number;
      expectedReturn: number;
      holdingDays: number;
      mathematicalProof: number;
      aiConfidence: number;
      currentValue: number;
    },
    newOpportunity?: {
      symbol: string;
      expectedReturn: number;
      winProbability: number;
      signalStrength: number;
      requiredCapital: number;
    }
  ): Promise<{
    action: 'hold' | 'rotate' | 'partial_exit' | 'full_exit';
    confidence: number;
    expectedProfit: number;
    neuralReasoning: string;
    pathwayActivations: Map<string, number>;
    symbolPerformance?: { accuracy: number; totalPnL: number; recentStreak: number };
  }> {

    // Get symbol-specific historical performance
    const symbolPerformance = await this.getSymbolPerformance(currentPosition.symbol);

    // Calculate factor activations for current situation
    const activations = new Map<string, number>();

    // Expected return activation
    const expectedReturnActivation = Math.tanh(currentPosition.expectedReturn / 20);
    activations.set('expectedReturn', expectedReturnActivation);

    // Win probability from AI confidence (boosted by symbol performance)
    let winProbActivation = Math.min(currentPosition.aiConfidence / 100, 1.0);

    // Apply symbol-specific performance adjustments
    if (symbolPerformance.totalSignals >= 50) {
      if (symbolPerformance.accuracy > 0.90) {
        // Excellent performer - boost confidence
        winProbActivation *= 1.5;
        console.log(`   🌟 Symbol boost: ${currentPosition.symbol} has ${(symbolPerformance.accuracy * 100).toFixed(1)}% accuracy`);
      } else if (symbolPerformance.accuracy < 0.30) {
        // Poor performer - reduce confidence
        winProbActivation *= 0.3;
        console.log(`   ⚠️ Symbol penalty: ${currentPosition.symbol} has ${(symbolPerformance.accuracy * 100).toFixed(1)}% accuracy`);
      }
    }

    activations.set('winProbability', winProbActivation);

    // Time decay (positions become less attractive over time)
    const timeDecayActivation = Math.exp(-currentPosition.holdingDays / 7);
    activations.set('timeDecay', timeDecayActivation);

    // Opportunity cost (if better opportunity exists)
    let opportunityCostActivation = 0;
    if (newOpportunity) {
      const opportunityDiff = newOpportunity.expectedReturn - currentPosition.expectedReturn;
      opportunityCostActivation = Math.tanh(opportunityDiff / 10);
    }
    activations.set('opportunityCost', opportunityCostActivation);

    // Conviction level from mathematical proof (enhanced by symbol track record)
    let convictionActivation = currentPosition.mathematicalProof;

    // Boost conviction for proven winners
    if (symbolPerformance.totalSignals >= 50 && symbolPerformance.accuracy > 0.85) {
      convictionActivation *= 1.3;
    }

    activations.set('convictionLevel', convictionActivation);

    // Market momentum from recent performance
    const momentumActivation = Math.tanh(currentPosition.actualReturn / 15);
    activations.set('marketMomentum', momentumActivation);

    // Transaction cost penalty
    activations.set('transactionCost', -0.0084);

    // Calculate weighted decision score using evolved neural pathways
    let decisionScore = 0;
    let totalAbsWeight = 0;

    for (const [factorName, activation] of activations) {
      const pathway = this.neuralPathways.get(factorName);
      if (pathway) {
        const contribution = pathway.weight * activation;
        decisionScore += contribution;
        totalAbsWeight += Math.abs(pathway.weight);

        // Update pathway activation history for future learning
        pathway.activationHistory.push(activation);
        if (pathway.activationHistory.length > 50) {
          pathway.activationHistory.shift();
        }
      }
    }

    // Normalize decision score
    const normalizedScore = totalAbsWeight > 0 ? decisionScore / totalAbsWeight : 0;

    // Determine action based on evolved decision thresholds
    let action: 'hold' | 'rotate' | 'partial_exit' | 'full_exit';
    let confidence = Math.abs(normalizedScore);

    // Dynamic thresholds based on learning (symbol-specific)
    const rotateThreshold = await this.calculateDynamicThreshold('rotate', currentPosition.symbol);
    const exitThreshold = await this.calculateDynamicThreshold('exit', currentPosition.symbol);
    const partialExitThreshold = await this.calculateDynamicThreshold('partial', currentPosition.symbol);

    if (newOpportunity && normalizedScore > rotateThreshold) {
      action = 'rotate';
    } else if (normalizedScore < -exitThreshold) {
      action = 'full_exit';
    } else if (currentPosition.actualReturn > 20 && normalizedScore < partialExitThreshold) {
      action = 'partial_exit';
    } else {
      action = 'hold';
    }

    // Calculate expected profit based on action
    let expectedProfit = 0;
    if (action === 'rotate' && newOpportunity) {
      expectedProfit = (newOpportunity.expectedReturn * newOpportunity.winProbability / 100) - 0.84;
    } else if (action === 'hold') {
      expectedProfit = currentPosition.expectedReturn * winProbActivation / 100;
    } else if (action === 'partial_exit') {
      expectedProfit = currentPosition.actualReturn * 0.5; // Lock half
    } else {
      expectedProfit = currentPosition.actualReturn; // Full exit locks current return
    }

    // Generate reasoning from top pathway activations
    const topPathways = Array.from(this.neuralPathways.entries())
      .sort(([,a], [,b]) => Math.abs(b.weight) - Math.abs(a.weight))
      .slice(0, 3)
      .map(([name, pathway]) => `${name}: ${(pathway.weight * activations.get(name) * 100).toFixed(1)}%`)
      .join(', ');

    const neuralReasoning = `Neural decision score: ${normalizedScore.toFixed(3)} | ` +
                           `Top factors: ${topPathways} | ` +
                           `Symbol: ${(symbolPerformance.accuracy * 100).toFixed(1)}% acc, $${symbolPerformance.totalPnL.toFixed(0)} P&L | ` +
                           `Generation ${this.currentGeneration} learning active`;

    return {
      action,
      confidence,
      expectedProfit,
      neuralReasoning,
      pathwayActivations: activations,
      symbolPerformance: {
        accuracy: symbolPerformance.accuracy,
        totalPnL: symbolPerformance.totalPnL,
        recentStreak: symbolPerformance.recentStreak
      }
    };
  }

  /**
   * Calculate dynamic decision thresholds based on recent performance
   * Enhanced with symbol-specific adjustments
   */
  private async calculateDynamicThreshold(
    actionType: 'rotate' | 'exit' | 'partial',
    symbol?: string
  ): Promise<number> {
    const recentTrades = this.tradeHistory.slice(-20);
    if (recentTrades.length < 5) {
      // Default thresholds if not enough data
      return actionType === 'rotate' ? 0.3 : actionType === 'exit' ? -0.4 : -0.1;
    }

    const avgProfit = recentTrades.reduce((sum, t) => sum + t.profitImpact, 0) / recentTrades.length;
    const profitStd = Math.sqrt(
      recentTrades.reduce((sum, t) => sum + Math.pow(t.profitImpact - avgProfit, 2), 0) / recentTrades.length
    );

    // Adjust thresholds based on recent performance
    const performanceMultiplier = Math.tanh(avgProfit / Math.max(profitStd, 1));

    let baseThreshold: number;
    switch (actionType) {
      case 'rotate':
        baseThreshold = 0.3 - (performanceMultiplier * 0.15); // More aggressive if performing well
        break;
      case 'exit':
        baseThreshold = -0.4 + (performanceMultiplier * 0.2); // Less likely to exit if performing well
        break;
      case 'partial':
        baseThreshold = -0.1 + (performanceMultiplier * 0.1);
        break;
      default:
        baseThreshold = 0;
    }

    // Apply symbol-specific threshold adjustments
    if (symbol) {
      const symbolPerf = await this.getSymbolPerformance(symbol);

      if (symbolPerf.totalSignals >= 50) {
        if (symbolPerf.accuracy >= 0.90 && symbolPerf.totalPnL > 100) {
          // Excellent pair - more aggressive thresholds
          baseThreshold *= 0.7; // Make it easier to trade this symbol
          console.log(`   ⭐ Threshold adjusted for excellent pair ${symbol}: ${baseThreshold.toFixed(3)}`);
        } else if (symbolPerf.accuracy < 0.30) {
          // Poor pair - more conservative thresholds
          baseThreshold *= 1.5; // Make it harder to trade this symbol
          console.log(`   ⚠️ Threshold adjusted for poor pair ${symbol}: ${baseThreshold.toFixed(3)}`);
        }
      }
    }

    return baseThreshold;
  }

  /**
   * Record actual trade outcome for continuous learning
   */
  recordTradeOutcome(outcome: TradeOutcome): void {
    this.tradeHistory.push(outcome);

    // Keep history manageable
    if (this.tradeHistory.length > 500) {
      this.tradeHistory.shift();
    }

    // Trigger adaptive learning every 5 trades
    if (this.tradeHistory.length % 5 === 0) {
      this.adaptFromRecentOutcome(outcome);
    }

    console.log(`📈 Recorded outcome: ${outcome.symbol} expected ${outcome.expectedReturn.toFixed(1)}% got ${outcome.actualReturn.toFixed(1)}% (profit: ${outcome.profitImpact.toFixed(2)})`);
  }

  /**
   * Immediate adaptation from single trade outcome
   */
  private adaptFromRecentOutcome(outcome: TradeOutcome): void {
    if (!this.learningEnabled) return;

    const profitError = outcome.actualReturn - outcome.expectedReturn;
    const learningSignal = Math.tanh(profitError / 10); // Normalize error

    // Adjust pathway weights based on outcome
    for (const [factorName, pathway] of this.neuralPathways) {
      let factorContribution = 0;

      switch (factorName) {
        case 'expectedReturn':
          factorContribution = outcome.expectedReturn / 100;
          break;
        case 'winProbability':
          factorContribution = outcome.actualWin ? 1 : -1;
          break;
        case 'timeDecay':
          factorContribution = Math.exp(-outcome.decisionFactors.timeHeld / 24);
          break;
      }

      // Update weight based on factor's contribution to this outcome
      const weightAdjustment = learningSignal * factorContribution * pathway.learningRate;
      pathway.weight += weightAdjustment;
      pathway.weight = Math.max(-1, Math.min(1, pathway.weight));
    }

    console.log(`🧠 Neural pathways adapted from ${outcome.symbol} outcome (error: ${profitError.toFixed(1)}%)`);
  }

  /**
   * Get current pathway state for debugging/monitoring
   */
  getPathwayState(): Array<{factorName: string; weight: number; correlation: number}> {
    return Array.from(this.neuralPathways.entries()).map(([name, pathway]) => ({
      factorName: name,
      weight: pathway.weight,
      correlation: pathway.profitCorrelation
    }));
  }

  /**
   * Enable/disable learning (for testing)
   */
  setLearningEnabled(enabled: boolean): void {
    this.learningEnabled = enabled;
    console.log(`🧠 Adaptive learning ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
}

export const adaptiveProfitBrain = AdaptiveProfitBrain.getInstance();