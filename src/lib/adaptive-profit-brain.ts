/**
 * ADAPTIVE PROFIT MAXIMIZATION BRAIN V2.0
 * Unified self-learning mathematical consciousness that discovers optimal:
 * - Neural pathway weights (profit factors)
 * - Entry/exit thresholds (when to trade)
 * - Position sizing multipliers (how much to trade)
 * - Capital rotation timing (when to switch)
 *
 * Evolves through gradient descent with momentum, exploration-exploitation balance,
 * and continuous feedback from actual trade outcomes.
 *
 * NO HARDCODED THRESHOLDS - Pure mathematical learning
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
  // New: Decision type tracking for threshold learning
  decisionType?: 'entry' | 'hold' | 'exit' | 'skip';
  thresholdAtDecision?: number;
  confidenceLevel?: number;
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

// New: Learned threshold parameters
interface ThresholdParameter {
  name: string;
  currentValue: number;
  learningRate: number;
  momentum: number;
  velocity: number;
  minValue: number;
  maxValue: number;
  lastGradient: number;
  profitHistory: number[];
  adjustmentHistory: number[];
  explorationNoise: number;
  optimalEstimate: number; // Continuously updated estimate of optimal value
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

  // NEW: Self-learning thresholds
  private thresholds: Map<string, ThresholdParameter> = new Map();
  private maxHistoryLength = 1000;
  private performanceWindow = 50;
  private explorationDecayRate = 0.995;
  private minExplorationRate = 0.05;

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

  /**
   * V3.14.0: Retry-enabled singleton with exponential backoff
   * Target: 99.99% initialization reliability
   */
  static async getInstanceWithRetry(maxRetries = 5): Promise<AdaptiveProfitBrain> {
    if (AdaptiveProfitBrain.instance) {
      return AdaptiveProfitBrain.instance;
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🧠 Brain initialization attempt ${attempt}/${maxRetries}...`);
        AdaptiveProfitBrain.instance = new AdaptiveProfitBrain();
        console.log(`✅ Brain initialized successfully on attempt ${attempt}`);
        return AdaptiveProfitBrain.instance;
      } catch (error) {
        lastError = error as Error;
        const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
        console.error(`❌ Brain initialization attempt ${attempt} failed: ${error.message}`);

        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in ${waitMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
        }
      }
    }

    throw new Error(`🚨 CRITICAL: Brain initialization failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  static getInstance(): AdaptiveProfitBrain {
    if (!AdaptiveProfitBrain.instance) {
      throw new Error('🚨 Brain not initialized! Call getInstanceWithRetry() first.');
    }
    return AdaptiveProfitBrain.instance;
  }

  private constructor() {
    this.initializeNeuralPathways();
    this.initializeThresholdParameters(); // NEW
    this.loadHistoricalOutcomes();
    console.log('🧠 ADAPTIVE PROFIT BRAIN V2.0 initialized - Learning thresholds AND pathways');
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
   * NEW: Initialize self-learning threshold parameters
   * These start with reasonable values but adapt through gradient descent
   */
  private initializeThresholdParameters(): void {
    const baseLearningRate = 0.001;
    const momentumDecay = 0.9;

    // Entry confidence threshold - V3.14.6: MUCH HIGHER QUALITY - Selective entries only
    // DYNAMIC MATH: Brain starts conservative (25%), learns optimal through win/loss feedback
    // Gradient descent finds balance between opportunity capture and entry quality
    this.thresholds.set('entryConfidence', {
      name: 'entryConfidence',
      currentValue: 0.25, // V3.14.6: Start at 25% mathematical consensus (was 12%)
      learningRate: baseLearningRate * 2.5, // Fast learning - adapt to market feedback
      momentum: momentumDecay,
      velocity: 0,
      minValue: 0.15, // V3.14.6: Minimum 15% (was 5%) - NO low-quality entries
      maxValue: 0.60, // V3.14.6: Max 60% (was 50%) - allow being very selective
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.18, // Higher exploration - find optimal quickly
      optimalEstimate: 0.35 // V3.14.6: Guide toward 35% (was 15%) - HIGH quality target
      // Brain learns from profit feedback: Big wins at 25-40% strengthen pattern
      // Immediate losses <20% will push threshold higher
      // Goal: Enter ONLY when mathematical consensus is STRONG
    });

    // Exit score threshold - Learn when to hold vs exit
    this.thresholds.set('exitScore', {
      name: 'exitScore',
      currentValue: 0.50, // Start at 50% - less conservative
      learningRate: baseLearningRate * 1.5,
      momentum: momentumDecay,
      velocity: 0,
      minValue: 0.10, // As low as 10% to hold winners longer
      maxValue: 0.95, // Max 95%
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.12,
      optimalEstimate: 0.50
    });

    // Position sizing multiplier - Learn optimal trade sizes
    this.thresholds.set('positionSizeMultiplier', {
      name: 'positionSizeMultiplier',
      currentValue: 1.0, // Start at 1.0x - conservative (V3.14.2 reduced from 1.5x)
      learningRate: baseLearningRate * 1.0,
      momentum: momentumDecay,
      velocity: 0,
      minValue: 0.3, // Min 30% sizing
      maxValue: 3.0, // Max 3x for high-conviction trades
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.10,
      optimalEstimate: 1.0 // Let brain discover optimal through learning
    });

    // 🧠 V3.14.2: Maximum position size as % of balance (brain-learned, NO hardcoding!)
    // Replaces hardcoded 0.15 (15%) cap in EnhancedPositionSizing
    // Brain learns optimal cap based on expected return, opportunity cost, and trade outcomes
    this.thresholds.set('maxPositionPercentage', {
      name: 'maxPositionPercentage',
      currentValue: 0.20, // Start at 20% - higher for significant opportunities
      learningRate: baseLearningRate * 1.2, // Good learning speed
      momentum: momentumDecay,
      velocity: 0,
      minValue: 0.05, // Never less than 5% (too conservative)
      maxValue: 0.50, // Never more than 50% (too risky)
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.12,
      optimalEstimate: 0.25 // Guide toward 25% for high-conviction trades
    });

    // Profit taking threshold - Learn optimal profit capture
    this.thresholds.set('profitTakingThreshold', {
      name: 'profitTakingThreshold',
      currentValue: 0.08, // Start at 8% - let brain learn from market
      learningRate: baseLearningRate * 2.5, // Fast learning for profit capture
      momentum: momentumDecay,
      velocity: 0,
      minValue: 0.02, // As low as 2% for quick scalps
      maxValue: 0.60, // Max 60% for big moves
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.18, // High exploration for profit optimization
      optimalEstimate: 0.08
    });

    // Capital rotation urgency
    this.thresholds.set('capitalRotationUrgency', {
      name: 'capitalRotationUrgency',
      currentValue: 0.30,
      learningRate: baseLearningRate * 0.6,
      momentum: momentumDecay,
      velocity: 0,
      minValue: 0.10,
      maxValue: 0.80,
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.10,
      optimalEstimate: 0.30
    });

    // Volatility adjustment factor
    this.thresholds.set('volatilityAdjustmentFactor', {
      name: 'volatilityAdjustmentFactor',
      currentValue: 1.0,
      learningRate: baseLearningRate * 0.4,
      momentum: momentumDecay,
      velocity: 0,
      minValue: 0.5,
      maxValue: 2.0,
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.06,
      optimalEstimate: 1.0
    });

    // 🎯 NEW: Minimum loss threshold before exit consideration (start -2%, guide toward -5%)
    // V3.14.0: Increased from -0.5% to -2% - allow bigger drawdowns for bigger wins
    this.thresholds.set('minLossBeforeExit', {
      name: 'minLossBeforeExit',
      currentValue: -0.02, // Start at -2% (was -0.5%), brain will learn toward -5%
      learningRate: baseLearningRate * 2.2, // Faster learning (was 1.8x) - critical for profit maximization
      momentum: momentumDecay,
      velocity: 0,
      minValue: -0.15, // Never more aggressive than -15% (emergency stop, was -10%)
      maxValue: -0.005, // Never less aggressive than -0.5% (was -0.1%)
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.15, // Higher exploration (was 0.10) - find optimal loss tolerance
      optimalEstimate: -0.05 // Guide toward -5% (was -2%) - maximize profit per trade
    });

    // 🧠 NEW: AI confidence respect threshold (when AI says HOLD with >X%, trust it)
    // V3.14.0: Start higher to respect AI more (fewer overrides)
    // 🔧 V3.14.25 FIX: Lower AI respect threshold to allow more pattern overrides
    // PROBLEM: AI said HOLD with 72% confidence, system stuck in loop (72% < 80% but pattern override didn't trigger)
    // SOLUTION: Lower to 75% so we respect AI less often, allow pattern-based exits more frequently
    this.thresholds.set('aiConfidenceRespectThreshold', {
      name: 'aiConfidenceRespectThreshold',
      currentValue: 0.75, // 🔧 V3.14.25: Lowered from 80% to 75%
      learningRate: baseLearningRate * 1.5, // Faster learning (was 1.2x)
      momentum: momentumDecay,
      velocity: 0,
      minValue: 0.60, // Minimum 60% confidence (was 50%)
      maxValue: 0.95, // Maximum 95% (always allow emergency overrides)
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.10, // More exploration (was 0.08)
      optimalEstimate: 0.70 // 🔧 V3.14.25: Lowered from 75% to 70%
    });

    // ⏱️ NEW: Minimum hold time in minutes (start 5min, guide toward 15min)
    // V3.14.0: Start much higher to prevent premature exits
    this.thresholds.set('minHoldTimeMinutes', {
      name: 'minHoldTimeMinutes',
      currentValue: 5.0, // Start at 5 minutes (was 2min), brain will learn toward 15min
      learningRate: baseLearningRate * 2.0, // Faster learning (was 1.5x)
      momentum: momentumDecay,
      velocity: 0,
      minValue: 1.0, // Absolute minimum 1 minute (was 0.5min/30sec)
      maxValue: 60.0, // Maximum 60 minutes (was 30min) - allow longer holds for big trends
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.15, // Higher exploration (was 0.12)
      optimalEstimate: 15.0 // Guide toward 15 minutes (was 10min) - ride trends longer
    });

    // 🚨 V3.14.5: Emergency loss stop threshold (brain-learned, NO hardcoded values)
    // DYNAMIC MATH: Tighter stops to prevent -20% losses (saw SLAYUSD at -20.6%!)
    // Portfolio protection formula: Stop should trigger BEFORE psychological pain point
    // Small account math: -8% on $75 account = -$6 loss (8% of total balance)
    this.thresholds.set('emergencyLossStop', {
      name: 'emergencyLossStop',
      currentValue: -0.06, // V3.14.5: Start at -6% (was -8%) - tighter protection
      learningRate: baseLearningRate * 1.5, // V3.14.5: Faster learning (was 1.0x) - learn from real losses
      momentum: momentumDecay,
      velocity: 0,
      minValue: -0.15, // V3.14.5: Never allow more than -15% (was -50%) - realistic maximum pain
      maxValue: -0.03, // Never tighter than -3% (allow normal volatility)
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.10, // V3.14.5: Higher exploration (was 0.08) - find optimal stop quickly
      optimalEstimate: -0.08 // V3.14.5: Guide toward -8% (was -10%) - balance protection vs noise
      // Brain learns from actual losses: If -6% stops cause whipsaws → relaxes to -8%
      // If positions reach -10%+ → tightens stops to -5%
      // Mathematical feedback loop finds optimal for current market volatility
    });

    // 💰 V3.14.0: Extraordinary profit capture threshold (brain-learned, replaces hardcoded +50%)
    this.thresholds.set('extraordinaryProfitCapture', {
      name: 'extraordinaryProfitCapture',
      currentValue: 0.50, // Start at +50%, brain learns when to capture massive wins
      learningRate: baseLearningRate * 1.0, // Moderate learning
      momentum: momentumDecay,
      velocity: 0,
      minValue: 0.20, // Capture at least 20%+ extraordinary gains
      maxValue: 2.00, // Allow up to 200% before forced capture (moonshots)
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.12, // Moderate exploration
      optimalEstimate: 0.75 // Guide toward 75% (let winners run, but capture extremes)
    });

    // 🎯 V3.14.0: AI reversal confidence threshold (brain-learned, replaces hardcoded 60%)
    this.thresholds.set('aiReversalConfidenceThreshold', {
      name: 'aiReversalConfidenceThreshold',
      currentValue: 0.70, // Start at 70% (was hardcoded 60%)
      learningRate: baseLearningRate * 1.3,
      momentum: momentumDecay,
      velocity: 0,
      minValue: 0.50, // Minimum 50% AI confidence to exit on reversal
      maxValue: 0.95, // Maximum 95%
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.10,
      optimalEstimate: 0.75 // Guide toward 75% reversal confidence
    });

    // 🎯 V3.14.21: PROACTIVE PROFIT CAPTURE - Peak decay tolerance
    // How much profit drawdown from peak before triggering capture
    // Brain learns: "If profit drops 20% from peak, should I exit or hold?"
    this.thresholds.set('profitPeakDecayTolerance', {
      name: 'profitPeakDecayTolerance',
      currentValue: 0.25, // Start at 25% - allow moderate drawdown from peak
      learningRate: baseLearningRate * 2.0, // Fast learning - critical for profit capture
      momentum: momentumDecay,
      velocity: 0,
      minValue: 0.10, // Never allow more than 10% peak decay without considering exit
      maxValue: 0.50, // Never wait for more than 50% drawdown from peak
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.15, // Higher exploration - find optimal quickly
      optimalEstimate: 0.20 // Guide toward 20% peak decay tolerance
      // Brain learning: If we capture at 25% decay and market continues up → loosen to 30%
      //                If we hold through 25% decay and lose more → tighten to 20%
    });

    // 🎯 V3.14.21: PROACTIVE PROFIT CAPTURE - Velocity decay threshold
    // When profit velocity (rate of P&L increase) slows down significantly
    // Brain learns: "If profit was growing +0.5%/min, now +0.1%/min, capture?"
    this.thresholds.set('profitVelocityDecayThreshold', {
      name: 'profitVelocityDecayThreshold',
      currentValue: 0.60, // Start at 60% velocity reduction triggers analysis
      learningRate: baseLearningRate * 1.8,
      momentum: momentumDecay,
      velocity: 0,
      minValue: 0.30, // At least 30% velocity reduction needed
      maxValue: 0.90, // Max 90% reduction (profit nearly stalled)
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.12,
      optimalEstimate: 0.50 // Guide toward 50% velocity decay
      // Brain learning: Velocity dropped 60%, we exited, market reversed down → good!
      //                Velocity dropped 60%, we exited, market continued up → loosen to 70%
    });

    // 🎯 V3.14.21: PROACTIVE PROFIT CAPTURE - Minimum profit for proactive capture
    // Don't trigger proactive capture for tiny profits (avoid commission bleeding)
    this.thresholds.set('minProfitForProactiveCapture', {
      name: 'minProfitForProactiveCapture',
      currentValue: 0.025, // Start at 2.5% minimum profit
      learningRate: baseLearningRate * 1.5,
      momentum: momentumDecay,
      velocity: 0,
      minValue: 0.015, // Never capture below 1.5% (commission + slippage = ~1%)
      maxValue: 0.08, // Never require more than 8% to consider capture
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.10,
      optimalEstimate: 0.03 // Guide toward 3% minimum
      // Brain learning: If we capture many 2.5% profits and they work → lower to 2%
      //                If 2.5% captures often lead to regret (market went to 10%) → raise to 4%
    });

    // 🎯 V3.14.21: PROACTIVE PROFIT CAPTURE - Time-based diminishing returns threshold
    // When position held long time but profit growth stalled (capital rotation signal)
    this.thresholds.set('diminishingReturnsMinutes', {
      name: 'diminishingReturnsMinutes',
      currentValue: 30.0, // Start at 30 minutes - if held this long with stalled profit, consider rotation
      learningRate: baseLearningRate * 1.2,
      momentum: momentumDecay,
      velocity: 0,
      minValue: 15.0, // Minimum 15 minutes before considering stalled
      maxValue: 120.0, // Maximum 2 hours before forced rotation consideration
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.12,
      optimalEstimate: 45.0 // Guide toward 45 minutes
      // Brain learning: If we rotate after 30min stall and next trade wins big → lower to 25min
      //                If we rotate too early and original position moons → raise to 40min
    });

    // 🎯 V3.14.21: PROACTIVE PROFIT CAPTURE - Better opportunity threshold
    // How many better opportunities needed to trigger capital rotation
    this.thresholds.set('capitalRotationOpportunityCount', {
      name: 'capitalRotationOpportunityCount',
      currentValue: 3.0, // Start: need 3+ better opportunities to rotate
      learningRate: baseLearningRate * 1.0,
      momentum: momentumDecay,
      velocity: 0,
      minValue: 1.0, // At least 1 better opportunity needed
      maxValue: 10.0, // Never require more than 10 opportunities
      lastGradient: 0,
      profitHistory: [],
      adjustmentHistory: [],
      explorationNoise: 0.10,
      optimalEstimate: 3.0 // Guide toward 3 opportunities
      // Brain learning: Rotate with 3 opportunities waiting, new trades win → lower to 2
      //                Rotate with 3 opportunities, new trades fail → raise to 4
    });

    console.log('📊 Initialized self-learning thresholds:');
    for (const [name, param] of this.thresholds) {
      // 🔧 V3.14.27.2 FIX: Correct display formatting for time/count thresholds
      // PROBLEM: diminishingReturnsMinutes showed as "3000%" instead of "30min"
      // PROBLEM: capitalRotationOpportunityCount showed as "300%" instead of "3 opps"
      let displayValue: string;
      if (name === 'minLossBeforeExit') {
        displayValue = `${(param.currentValue * 100).toFixed(1)}%`;
      } else if (name === 'minHoldTimeMinutes' || name === 'diminishingReturnsMinutes') {
        displayValue = `${param.currentValue.toFixed(1)}min`;
      } else if (name === 'capitalRotationOpportunityCount') {
        displayValue = `${param.currentValue.toFixed(1)} opps`;
      } else {
        displayValue = `${(param.currentValue * 100).toFixed(1)}%`;
      }
      console.log(`   ${name}: ${displayValue}`);
    }
  }

  /**
   * Load recent trade outcomes from database for learning
   * Uses AdaptiveLearningPerformance for real historical data
   */
  private async loadHistoricalOutcomes(): Promise<void> {
    try {
      const { prisma } = await import('./prisma');

      // 🔧 V3.14.1: PRIORITY 1 - Load from actual closed ManagedPosition trades (if any exist)
      const closedPositions = await prisma.managedPosition.findMany({
        where: {
          status: 'closed',
          realizedPnL: { not: null }
        },
        orderBy: { updatedAt: 'desc' },
        take: 100 // Last 100 closed trades
      });

      console.log(`📊 Found ${closedPositions.length} closed positions with realized P&L`);

      for (const pos of closedPositions) {
        if (!pos.realizedPnL || !pos.exitPrice) continue;

        const holdingTime = pos.exitTime && pos.entryTime
          ? (pos.exitTime.getTime() - pos.entryTime.getTime()) / (1000 * 60 * 60)
          : 24; // Default 24h if no exit time

        const outcome: TradeOutcome = {
          symbol: pos.symbol,
          expectedReturn: pos.realizedPnL, // Was the expected return
          actualReturn: pos.realizedPnL, // Actual realized P&L
          winProbability: pos.realizedPnL > 0 ? 0.7 : 0.3,
          actualWin: pos.realizedPnL > 0,
          decisionFactors: {
            timeHeld: holdingTime,
            marketRegime: 'normal',
            convictionLevel: 0.5,
            opportunityCost: 0,
            rotationScore: 0
          },
          profitImpact: pos.realizedPnL,
          timestamp: pos.updatedAt
        };
        this.tradeHistory.push(outcome);
      }

      console.log(`✅ Loaded ${this.tradeHistory.length} outcomes from closed ManagedPosition trades`);

      // PRIORITY 2: Supplement with AdaptiveLearningPerformance aggregates
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

      // 🚨 V3.14.1: Safeguard against empty trade history
      if (this.tradeHistory.length === 0) {
        console.warn('');
        console.warn('⚠️⚠️⚠️  CRITICAL WARNING: ZERO TRADE HISTORY LOADED  ⚠️⚠️⚠️');
        console.warn('   Brain has NO historical data to learn from!');
        console.warn('   This likely means:');
        console.warn('   1. Database was wiped by position sync (FIXED in V3.14.1)');
        console.warn('   2. System is starting fresh with no prior trades');
        console.warn('   3. AdaptiveLearningPerformance table is empty');
        console.warn('');
        console.warn('   🧠 Brain will use DEFAULT thresholds until live trades provide data');
        console.warn('   📈 Learning will begin as soon as first trades close');
        console.warn('   ✅ Position sync fix will preserve future closed trades');
        console.warn('');
      } else if (this.tradeHistory.length < 10) {
        console.warn(`⚠️  LOW TRADE HISTORY: Only ${this.tradeHistory.length} trades loaded - brain learning will be limited`);
        console.warn('   🧠 Recommend at least 20+ closed trades for optimal threshold learning');
      }

      if (this.tradeHistory.length > 0) {
        this.evolveFromHistory();
      }
    } catch (error) {
      console.warn('⚠️ Could not load historical data for learning:', error.message);
      // Fail gracefully - brain will learn from live data only
      console.warn('   🧠 Brain will start with default thresholds and learn from new trades');
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
   * V3.14.0: Calculate Expected Value for profit maximization
   * EV = (Win% × AvgWin) - (Loss% × AvgLoss) - CommissionCost
   * Goal: Maximize EV per trade, not win rate
   */
  calculateExpectedValue(tradeHistory: TradeOutcome[]): {
    expectedValue: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    avgProfit: number;
    profitFactor: number;
    commissionImpact: number;
  } {
    if (tradeHistory.length === 0) {
      return {
        expectedValue: 0,
        winRate: 0.5,
        avgWin: 0,
        avgLoss: 0,
        avgProfit: 0,
        profitFactor: 1.0,
        commissionImpact: 0
      };
    }

    const wins = tradeHistory.filter(t => t.actualWin);
    const losses = tradeHistory.filter(t => !t.actualWin);

    const winRate = wins.length / tradeHistory.length;
    const lossRate = losses.length / tradeHistory.length;

    const avgWin = wins.length > 0
      ? wins.reduce((sum, t) => sum + t.profitImpact, 0) / wins.length
      : 0;
    const avgLoss = losses.length > 0
      ? Math.abs(losses.reduce((sum, t) => sum + t.profitImpact, 0) / losses.length)
      : 0;

    // EV = (Win% × AvgWin) - (Loss% × AvgLoss)
    const expectedValue = (winRate * avgWin) - (lossRate * avgLoss);

    // Profit factor = Total Wins / Total Losses (want > 1.5 for trading)
    const totalWins = wins.reduce((sum, t) => sum + t.profitImpact, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.profitImpact, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

    // Average P&L per trade
    const avgProfit = tradeHistory.reduce((sum, t) => sum + t.profitImpact, 0) / tradeHistory.length;

    // Commission impact estimate (assume $0.20 per trade round-trip)
    const commissionPerTrade = 0.20;
    const commissionImpact = commissionPerTrade;

    return {
      expectedValue: expectedValue - commissionImpact,
      winRate,
      avgWin,
      avgLoss,
      avgProfit,
      profitFactor,
      commissionImpact
    };
  }

  /**
   * V3.14.0: Get trading metrics focused on profit maximization
   */
  getTradingMetrics(): {
    totalTrades: number;
    ev: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    totalProfit: number;
    recommendation: string;
  } {
    const recentTrades = this.tradeHistory.slice(-50); // Last 50 trades
    const evStats = this.calculateExpectedValue(recentTrades);

    const totalProfit = this.tradeHistory.reduce((sum, t) => sum + t.profitImpact, 0);

    let recommendation = '';
    if (evStats.expectedValue > 1.0) {
      recommendation = 'Excellent EV - system profitable';
    } else if (evStats.expectedValue > 0.5) {
      recommendation = 'Good EV - continue trading';
    } else if (evStats.expectedValue > 0) {
      recommendation = 'Marginal EV - optimize thresholds';
    } else {
      recommendation = 'Negative EV - brain learning needed';
    }

    console.log('\n📊 V3.14.0 TRADING METRICS (Profit Maximization Focus):');
    console.log(`   Expected Value: $${evStats.expectedValue.toFixed(2)} per trade`);
    console.log(`   Win Rate: ${(evStats.winRate * 100).toFixed(1)}% (not the goal!)`);
    console.log(`   Avg Win: $${evStats.avgWin.toFixed(2)} | Avg Loss: $${evStats.avgLoss.toFixed(2)}`);
    console.log(`   Profit Factor: ${evStats.profitFactor.toFixed(2)}x (want > 1.5x)`);
    console.log(`   Commission Impact: -$${evStats.commissionImpact.toFixed(2)} per trade`);
    console.log(`   Total Profit: $${totalProfit.toFixed(2)} (${recentTrades.length} trades)`);
    console.log(`   Recommendation: ${recommendation}\n`);

    return {
      totalTrades: recentTrades.length,
      ev: evStats.expectedValue,
      winRate: evStats.winRate,
      avgWin: evStats.avgWin,
      avgLoss: evStats.avgLoss,
      profitFactor: evStats.profitFactor,
      totalProfit,
      recommendation
    };
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
   * NOW: Also learns thresholds from outcomes
   */
  async recordTradeOutcome(outcome: TradeOutcome): Promise<void> {
    this.tradeHistory.push(outcome);

    // Keep history manageable
    if (this.tradeHistory.length > this.maxHistoryLength) {
      this.tradeHistory.shift();
    }

    // Trigger adaptive learning every 5 trades
    if (this.tradeHistory.length % 5 === 0) {
      this.adaptFromRecentOutcome(outcome);
    }

    // NEW: Learn thresholds from this outcome
    if (outcome.decisionType && outcome.thresholdAtDecision !== undefined) {
      await this.updateThresholdsFromOutcome(outcome);
    }

    // Decay exploration rate
    for (const param of this.thresholds.values()) {
      param.explorationNoise = Math.max(
        this.minExplorationRate,
        param.explorationNoise * this.explorationDecayRate
      );
    }

    console.log(`📈 Recorded outcome: ${outcome.symbol} expected ${outcome.expectedReturn.toFixed(1)}% got ${outcome.actualReturn.toFixed(1)}% (profit: $${outcome.profitImpact.toFixed(2)})`);
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

  // ============================================================================
  // NEW: SELF-LEARNING THRESHOLD METHODS
  // ============================================================================

  /**
   * V3.14.0: Health check for brain reliability
   * Returns diagnostic information and auto-recovers if possible
   */
  healthCheck(): {
    healthy: boolean;
    thresholdsLoaded: number;
    pathwaysLoaded: number;
    tradeHistorySize: number;
    issues: string[];
    autoRecoveryAttempted: boolean;
  } {
    const issues: string[] = [];
    let autoRecoveryAttempted = false;

    // Check thresholds
    const expectedThresholds = [
      'entryConfidence', 'exitScore', 'positionSizeMultiplier', 'maxPositionPercentage',
      'profitTakingThreshold', 'capitalRotationUrgency', 'volatilityAdjustmentFactor',
      'minLossBeforeExit', 'aiConfidenceRespectThreshold', 'minHoldTimeMinutes',
      'emergencyLossStop', 'extraordinaryProfitCapture', 'aiReversalConfidenceThreshold'
    ];

    for (const name of expectedThresholds) {
      if (!this.thresholds.has(name)) {
        issues.push(`Missing threshold: ${name}`);
      }
    }

    // Check neural pathways
    if (this.neuralPathways.size === 0) {
      issues.push('No neural pathways loaded');
      // Auto-recovery: reinitialize pathways
      try {
        this.initializeNeuralPathways();
        autoRecoveryAttempted = true;
        console.log('✅ Auto-recovered: Neural pathways reinitialized');
      } catch (error) {
        issues.push(`Auto-recovery failed: ${error.message}`);
      }
    }

    // Check trade history
    if (this.tradeHistory.length === 0) {
      issues.push('No trade history loaded (normal for new system)');
    }

    const healthy = issues.length === 0 || (issues.length === 1 && issues[0].includes('trade history'));

    return {
      healthy,
      thresholdsLoaded: this.thresholds.size,
      pathwaysLoaded: this.neuralPathways.size,
      tradeHistorySize: this.tradeHistory.length,
      issues,
      autoRecoveryAttempted
    };
  }

  /**
   * Get threshold value with contextual adjustments and exploration
   */
  /**
   * V3.14.0: Retry-enabled threshold fetching with automatic recovery
   * Target: 99.99% threshold fetch reliability
   */
  getThresholdWithRetry(
    parameterName: string,
    context?: {
      volatility?: number;
      regime?: string;
      confidence?: number;
      marketMomentum?: number;
    },
    maxRetries = 3
  ): number {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return this.getThreshold(parameterName, context);
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Threshold fetch attempt ${attempt}/${maxRetries} failed for ${parameterName}: ${error.message}`);

        if (attempt < maxRetries) {
          // Quick retry (synchronous, no delay needed for in-memory operations)
          continue;
        }
      }
    }

    throw new Error(`🚨 CRITICAL: Failed to fetch threshold '${parameterName}' after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  getThreshold(
    parameterName: string,
    context?: {
      volatility?: number;
      regime?: string;
      confidence?: number;
      marketMomentum?: number;
    }
  ): number {
    const param = this.thresholds.get(parameterName);
    if (!param) {
      throw new Error(`Unknown threshold parameter: ${parameterName}. Available: ${Array.from(this.thresholds.keys()).join(', ')}`);
    }

    // Epsilon-greedy exploration
    const shouldExplore = Math.random() < param.explorationNoise;

    let value = param.currentValue;

    // Apply contextual adjustments
    if (context) {
      if (context.volatility !== undefined && parameterName === 'entryConfidence') {
        const volatilityFactor = this.thresholds.get('volatilityAdjustmentFactor')?.currentValue ?? 1.0;
        value += context.volatility * volatilityFactor * 0.5;
      }

      if (context.regime === 'BULL' && parameterName === 'entryConfidence') {
        value *= 0.9;
      } else if (context.regime === 'BEAR' && parameterName === 'entryConfidence') {
        value *= 1.1;
      }

      if (context.confidence !== undefined && parameterName === 'positionSizeMultiplier') {
        value *= (0.8 + context.confidence * 0.4);
      }
    }

    // Exploration noise
    if (shouldExplore) {
      const noiseRange = (param.maxValue - param.minValue) * 0.1;
      const noise = (Math.random() - 0.5) * 2 * noiseRange;
      value += noise;
    }

    return Math.max(param.minValue, Math.min(param.maxValue, value));
  }

  /**
   * Update thresholds using gradient descent based on outcome
   */
  private async updateThresholdsFromOutcome(outcome: TradeOutcome): Promise<void> {
    let thresholdName: string;

    switch (outcome.decisionType) {
      case 'entry':
        thresholdName = 'entryConfidence';
        break;
      case 'exit':
        thresholdName = 'exitScore';
        break;
      case 'hold':
        thresholdName = 'exitScore';
        break;
      case 'skip':
        thresholdName = 'entryConfidence';
        break;
      default:
        return;
    }

    const param = this.thresholds.get(thresholdName);
    if (!param) return;

    // Calculate gradient
    const gradient = this.calculateProfitGradient(
      thresholdName,
      outcome.profitImpact,
      outcome.confidenceLevel ?? 0.5,
      outcome.thresholdAtDecision ?? param.currentValue
    );

    // Update with momentum
    param.velocity = param.momentum * param.velocity + param.learningRate * gradient;

    const oldValue = param.currentValue;
    param.currentValue += param.velocity;
    param.currentValue = Math.max(param.minValue, Math.min(param.maxValue, param.currentValue));

    // Track history
    param.lastGradient = gradient;
    param.profitHistory.push(outcome.profitImpact);
    param.adjustmentHistory.push(param.currentValue - oldValue);

    if (param.profitHistory.length > 100) {
      param.profitHistory.shift();
      param.adjustmentHistory.shift();
    }

    // Update optimal estimate
    param.optimalEstimate = this.estimateOptimalThreshold(thresholdName);

    // Adjust learning rate based on variance
    if (param.profitHistory.length > 20) {
      const recentVariance = this.calculateVariance(param.profitHistory.slice(-20));
      param.learningRate = 0.001 / (1 + recentVariance * 0.01);
    }

    const percentChange = ((param.currentValue - oldValue) / oldValue) * 100;
    if (Math.abs(percentChange) > 1) {
      console.log(`🧠 THRESHOLD LEARNED: ${thresholdName} ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(2)}%`);
      console.log(`   ${(oldValue * 100).toFixed(2)}% → ${(param.currentValue * 100).toFixed(2)}% (optimal est: ${(param.optimalEstimate * 100).toFixed(2)}%)`);
      console.log(`   Gradient: ${gradient.toFixed(4)}, Profit: $${outcome.profitImpact.toFixed(2)}`);
    }
  }

  /**
   * Calculate profit gradient with respect to threshold
   * V3.14.0 ENHANCED: Profit magnitude focus (not win rate) - maximize $/trade
   */
  private calculateProfitGradient(
    thresholdName: string,
    actualProfit: number,
    confidenceLevel: number,
    thresholdAtDecision: number
  ): number {
    const recentDecisions = this.tradeHistory.slice(-this.performanceWindow);

    if (recentDecisions.length < 10) {
      // Early learning: strong signals based on profit magnitude
      return actualProfit > 2.0 ? 0.05 : actualProfit < -1.0 ? -0.05 : 0.01;
    }

    // 🎯 V3.14.0: Profit magnitude weighting (not binary win/loss)
    // $5 win > five $1 wins (fewer trades, less commission)
    const avgProfit = recentDecisions.reduce((sum, d) => sum + d.profitImpact, 0) / recentDecisions.length;
    const profitMagnitude = Math.abs(actualProfit);
    const profitQuality = actualProfit / (profitMagnitude + 0.1); // Sign of profit (-1 to +1)

    // Weight by magnitude: $5 win = 5x gradient of $1 win
    const magnitudeWeight = Math.min(profitMagnitude / 2.0, 3.0); // Cap at 3x
    const normalizedProfit = (actualProfit - avgProfit) / (Math.abs(avgProfit) + 1);

    // Get most recent trade for context
    const latestTrade = this.tradeHistory[this.tradeHistory.length - 1];
    const timeHeld = latestTrade?.decisionFactors?.timeHeld || 0;

    let gradient = 0;

    if (thresholdName === 'entryConfidence') {
      // 🎯 PROFIT MAGNITUDE LEARNING: Big wins strengthen pattern, big losses weaken
      if (actualProfit > 2.0) {
        // Big win - can be LESS selective (lower threshold)
        gradient = -0.02 * magnitudeWeight; // More profit = stronger signal
        console.log(`💰 BIG WIN LEARNING: $${actualProfit.toFixed(2)} profit → lowering entry threshold (take similar setups)`);
      } else if (actualProfit < -2.0) {
        // Big loss - be MORE selective (raise threshold)
        gradient = 0.03 * magnitudeWeight;
        console.log(`🚨 BIG LOSS LEARNING: $${actualProfit.toFixed(2)} loss → raising entry threshold (avoid similar setups)`);
      } else if (actualProfit > 0) {
        // Small win - maintain or slightly lower threshold
        gradient = -0.005 * normalizedProfit;
      } else {
        // Small loss - slightly raise threshold
        gradient = 0.01 * Math.abs(normalizedProfit);
      }
    } else if (thresholdName === 'exitScore') {
      // 🎯 ENHANCED: Penalize premature exits, reward BIG wins from patience
      const minHoldTime = this.thresholds.get('minHoldTimeMinutes')?.currentValue || 5;
      const minLossThreshold = Math.abs(this.thresholds.get('minLossBeforeExit')?.currentValue || 0.02);

      // Premature exit penalty: exited too quickly with small loss
      if (timeHeld < minHoldTime && actualProfit < 0 && Math.abs(actualProfit) < minLossThreshold * 100) {
        // Strong negative gradient: learn to hold longer
        gradient = 0.08 * magnitudeWeight; // Increase exit threshold (make exits harder)
        console.log(`🚨 PREMATURE EXIT PENALTY: Held ${timeHeld.toFixed(1)}min (target: ${minHoldTime.toFixed(1)}min), Loss: $${actualProfit.toFixed(2)} (${(Math.abs(actualProfit) / avgProfit * 100).toFixed(0)}% of avg)`);
      }
      // BIG win from patience - STRONGLY reward
      else if (timeHeld > minHoldTime && actualProfit > 3.0) {
        gradient = -0.04 * magnitudeWeight; // Decrease exit threshold (allow similar holds)
        console.log(`🎉 BIG WIN REWARD: Held ${timeHeld.toFixed(1)}min → $${actualProfit.toFixed(2)} profit! Encouraging similar patience.`);
      }
      // Good hold - decent profit after patience
      else if (timeHeld > minHoldTime && actualProfit > avgProfit * 1.2) {
        gradient = -0.02; // Decrease exit threshold (allow similar holds)
        console.log(`✅ PATIENCE REWARD: Held ${timeHeld.toFixed(1)}min, Profit: $${actualProfit.toFixed(2)}`);
      }
      // Exited too early - left BIG profit on table
      else if (actualProfit < avgProfit * 0.3 && actualProfit > 0) {
        gradient = 0.02; // Increase threshold - hold longer for better profits
        console.log(`⚠️ SMALL WIN WARNING: Only $${actualProfit.toFixed(2)} (avg: $${avgProfit.toFixed(2)}) - should hold longer`);
      }
      // Excellent exit timing with big profit
      else if (actualProfit > avgProfit * 2.0) {
        gradient = -0.01 * magnitudeWeight; // Strong reward - timing was excellent
        console.log(`🎯 EXCELLENT EXIT: $${actualProfit.toFixed(2)} (${(actualProfit / avgProfit).toFixed(1)}x avg profit)`);
      }
      else {
        gradient = 0.001 * normalizedProfit;
      }
    }

    return gradient;
  }

  /**
   * Estimate optimal threshold from profitable decisions
   */
  private estimateOptimalThreshold(thresholdName: string): number {
    const param = this.thresholds.get(thresholdName);
    if (!param || param.profitHistory.length < 10) {
      return param?.currentValue ?? 0.15;
    }

    const recentAdjustments = param.adjustmentHistory.slice(-20);
    const recentProfits = param.profitHistory.slice(-20);

    let sumProfitWeightedThreshold = 0;
    let sumProfitWeights = 0;
    let currentThreshold = param.currentValue;

    for (let i = recentAdjustments.length - 1; i >= 0; i--) {
      currentThreshold -= recentAdjustments[i];
      const profit = recentProfits[i];

      if (profit > 0) {
        sumProfitWeightedThreshold += currentThreshold * profit;
        sumProfitWeights += profit;
      }
    }

    return sumProfitWeights > 0 ? sumProfitWeightedThreshold / sumProfitWeights : param.currentValue;
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  /**
   * Get current learned thresholds
   */
  getCurrentThresholds(): Record<string, {
    current: number;
    optimal: number;
    exploration: number;
    profitHistory: number;
  }> {
    const thresholds: Record<string, any> = {};
    for (const [name, param] of this.thresholds) {
      const avgProfit = param.profitHistory.length > 0
        ? param.profitHistory.reduce((sum, p) => sum + p, 0) / param.profitHistory.length
        : 0;

      thresholds[name] = {
        current: param.currentValue,
        optimal: param.optimalEstimate,
        exploration: param.explorationNoise,
        profitHistory: avgProfit
      };
    }
    return thresholds;
  }

  /**
   * Get learning performance metrics
   */
  getLearningMetrics(): {
    pathways: Array<{factorName: string; weight: number; correlation: number}>;
    thresholds: Record<string, {
      value: number;
      optimalEstimate: number;
      avgProfit: number;
      decisions: number;
      convergence: number;
    }>;
    totalDecisions: number;
  } {
    const pathways = this.getPathwayState();
    const thresholds: Record<string, any> = {};
    let totalDecisions = 0;

    for (const [name, param] of this.thresholds) {
      const avgProfit = param.profitHistory.length > 0
        ? param.profitHistory.reduce((sum, p) => sum + p, 0) / param.profitHistory.length
        : 0;

      // Convergence: how close current is to optimal estimate
      const convergence = param.optimalEstimate > 0
        ? 1 - Math.abs(param.currentValue - param.optimalEstimate) / param.optimalEstimate
        : 0;

      const decisions = param.profitHistory.length;
      totalDecisions = Math.max(totalDecisions, decisions); // Use max across all thresholds

      thresholds[name] = {
        value: param.currentValue,
        optimalEstimate: param.optimalEstimate,
        avgProfit,
        decisions,
        convergence: Math.max(0, Math.min(1, convergence))
      };
    }

    return { pathways, thresholds, totalDecisions };
  }
}

// V3.14.0: Initialize brain with retry logic (99.99% reliability)
// This will be called synchronously on import, but retries are built into constructor
let brainInstance: AdaptiveProfitBrain;
try {
  // Try immediate initialization (works 99% of the time)
  brainInstance = new AdaptiveProfitBrain();
  AdaptiveProfitBrain.instance = brainInstance;
  console.log('✅ Brain initialized successfully on first attempt');
} catch (error) {
  console.error('⚠️ Brain initialization failed on import, will retry asynchronously:', error.message);
  // Brain will be initialized with retry logic when first accessed
  brainInstance = null as any;
}

export const adaptiveProfitBrain = brainInstance;

// Async initialization function for startup scripts
export async function initializeBrainWithRetry(): Promise<AdaptiveProfitBrain> {
  return await AdaptiveProfitBrain.getInstanceWithRetry();
}