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
   */
  private async loadHistoricalOutcomes(): Promise<void> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      const recentPositions = await prisma.position.findMany({
        where: {
          status: { in: ['CLOSED', 'FILLED'] },
          created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        orderBy: { created_at: 'desc' },
        take: 100
      });

      for (const position of recentPositions) {
        if (position.expected_return && position.unrealized_pnl !== null) {
          const outcome: TradeOutcome = {
            symbol: position.symbol,
            expectedReturn: position.expected_return,
            actualReturn: (position.unrealized_pnl / Math.max(position.current_value, 1)) * 100,
            winProbability: 0.65, // Default estimate
            actualWin: position.unrealized_pnl > 0,
            decisionFactors: {
              timeHeld: this.calculateHoldingHours(position.created_at),
              marketRegime: 'normal',
              convictionLevel: 0.7,
              opportunityCost: 0,
              rotationScore: 0
            },
            profitImpact: position.unrealized_pnl,
            timestamp: position.created_at
          };
          this.tradeHistory.push(outcome);
        }
      }

      await prisma.$disconnect();
      console.log(`📊 Loaded ${this.tradeHistory.length} historical outcomes for learning`);

      if (this.tradeHistory.length > 0) {
        this.evolveFromHistory();
      }
    } catch (error) {
      console.warn('⚠️ Could not load historical data for learning:', error.message);
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
   * Calculate adaptive profit-maximizing decision using evolved neural pathways
   * This replaces static E = (W × A) - (L × B) with dynamic learning
   */
  calculateAdaptiveProfitDecision(
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
  ): {
    action: 'hold' | 'rotate' | 'partial_exit' | 'full_exit';
    confidence: number;
    expectedProfit: number;
    neuralReasoning: string;
    pathwayActivations: Map<string, number>;
  } {

    // Calculate factor activations for current situation
    const activations = new Map<string, number>();

    // Expected return activation
    const expectedReturnActivation = Math.tanh(currentPosition.expectedReturn / 20);
    activations.set('expectedReturn', expectedReturnActivation);

    // Win probability from AI confidence
    const winProbActivation = Math.min(currentPosition.aiConfidence / 100, 1.0);
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

    // Conviction level from mathematical proof
    const convictionActivation = currentPosition.mathematicalProof;
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

    // Dynamic thresholds based on learning
    const rotateThreshold = this.calculateDynamicThreshold('rotate');
    const exitThreshold = this.calculateDynamicThreshold('exit');
    const partialExitThreshold = this.calculateDynamicThreshold('partial');

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
                           `Generation ${this.currentGeneration} learning active`;

    return {
      action,
      confidence,
      expectedProfit,
      neuralReasoning,
      pathwayActivations: activations
    };
  }

  /**
   * Calculate dynamic decision thresholds based on recent performance
   */
  private calculateDynamicThreshold(actionType: 'rotate' | 'exit' | 'partial'): number {
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

    switch (actionType) {
      case 'rotate':
        return 0.3 - (performanceMultiplier * 0.15); // More aggressive if performing well
      case 'exit':
        return -0.4 + (performanceMultiplier * 0.2); // Less likely to exit if performing well
      case 'partial':
        return -0.1 + (performanceMultiplier * 0.1);
      default:
        return 0;
    }
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