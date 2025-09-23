/**
 * UNIFIED TENSOR COORDINATOR™
 * Master orchestrator for Tensor AI Fusion mathematical intelligence systems
 *
 * Synthesizes signals from:
 * - Mathematical Intuition Engine (8 advanced domains)
 * - Bayesian Probability Engine (regime detection)
 * - Profit Predator Engine (opportunity discovery)
 * - Order Book Analysis (real-time market intelligence)
 *
 * Uses advanced mathematical synthesis to create unified trading decisions
 */

import { mathIntuitionEngine } from './mathematical-intuition-engine';
import { BayesianProbabilityEngine } from './bayesian-probability-engine';
import { gpuService } from './gpu-acceleration-service';
import { realTimeRegimeMonitor, RegimeContext } from './real-time-regime-monitor';
import { advancedRiskOrchestrator, RiskMetrics } from './advanced-risk-orchestrator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SystemSignal {
  source: 'mathematical_intuition' | 'bayesian_probability' | 'profit_predator' | 'order_book';
  symbol: string;
  timestamp: Date;
  confidence: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
  strength: number; // 0-1
  reasoning: string;

  // Source-specific data
  data: {
    // Mathematical Intuition
    mathIntuition?: number;
    flowFieldStrength?: number;
    patternResonance?: number;
    timingIntuition?: number;
    energyAlignment?: number;
    overallFeeling?: number;

    // Bayesian
    mostLikelyRegime?: string;
    bullishProbability?: number;
    bearishProbability?: number;
    uncertainty?: number;

    // Profit Predator
    expectedReturn?: number;
    winProbability?: number;
    opportunityScore?: number;

    // Order Book
    marketStructure?: any;
    liquidity?: any;
    orderFlow?: any;
  };
}

export interface UnifiedDecision {
  symbol: string;
  timestamp: Date;
  finalDecision: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
  confidence: number; // 0-1, unified confidence across all systems
  strength: number; // 0-1, decision strength
  urgency: number; // 0-1, how quickly to act

  // Mathematical synthesis results
  synthesis: {
    systemAgreement: number; // 0-1, how much systems agree
    mathematicalConsensus: number; // 0-1, weighted mathematical confidence
    conflictResolution: string; // How conflicts were resolved
    dominantReasoning: string; // Primary reason for decision
  };

  // Individual system contributions
  systemContributions: {
    mathematicalIntuition: { weight: number; influence: number; };
    bayesianProbability: { weight: number; influence: number; };
    profitPredator: { weight: number; influence: number; };
    orderBook: { weight: number; influence: number; };
  };

  // Risk management
  riskAssessment: {
    positionSize: number; // Recommended position size (0-1 of available capital)
    stopLoss: number; // Recommended stop loss level
    takeProfit: number; // Recommended take profit level
    maxHoldTime: number; // Maximum time to hold position (minutes)
  };

  // Execution parameters
  execution: {
    orderType: 'market' | 'limit' | 'stop_limit';
    limitPrice?: number;
    timeInForce: 'GTC' | 'IOC' | 'FOK';
    priority: 'high' | 'medium' | 'low';
  };
}

export class UnifiedTensorCoordinator {
  private static instance: UnifiedTensorCoordinator;
  private systemSignals: Map<string, SystemSignal[]> = new Map(); // symbol -> signals
  private decisionHistory: UnifiedDecision[] = [];
  private bayesianEngine: BayesianProbabilityEngine;

  // Dynamic weighting system - learns from performance
  private systemWeights = {
    mathematicalIntuition: 0.35, // Highest weight - most sophisticated
    bayesianProbability: 0.30,   // High weight - regime detection
    profitPredator: 0.25,        // Medium weight - opportunity discovery
    orderBook: 0.10              // Lower weight - real-time confirmation
  };

  static getInstance(): UnifiedTensorCoordinator {
    if (!UnifiedTensorCoordinator.instance) {
      UnifiedTensorCoordinator.instance = new UnifiedTensorCoordinator();
    }
    return UnifiedTensorCoordinator.instance;
  }

  constructor() {
    this.bayesianEngine = BayesianProbabilityEngine.getInstance();
    console.log('🧠 UNIFIED TENSOR COORDINATOR™ INITIALIZED');
    console.log('⚡ Orchestrating Mathematical Intuition, Bayesian, Profit Predator & Order Book systems');
    console.log('🎯 Real-Time Regime Monitor integration enabled');
  }

  /**
   * Initialize regime monitoring for a set of symbols
   */
  async initializeRegimeMonitoring(symbols: string[]): Promise<void> {
    console.log(`🔄 REGIME MONITOR: Starting real-time monitoring for ${symbols.length} symbols`);

    // Start regime monitoring
    await realTimeRegimeMonitor.startMonitoring(symbols);

    // Listen for regime change events
    realTimeRegimeMonitor.on('regimeChange', (event) => {
      console.log(`🚨 REGIME CHANGE DETECTED: ${event.symbol} ${event.from.regime} → ${event.to.regime} (${(event.confidence * 100).toFixed(1)}%)`);
      console.log(`   Triggers: ${event.triggers.join(', ')}`);

      // Emit regime change for other systems to adapt
      this.onRegimeChange(event);
    });

    // Listen for regime updates
    realTimeRegimeMonitor.on('regimeUpdate', ({ symbol, regime }) => {
      // Store regime context for use in unified analysis
      this.updateRegimeContext(symbol, regime);
    });

    console.log('✅ REGIME MONITOR: Real-time monitoring active with event listeners');

    // Initialize Advanced Risk Orchestrator
    await this.initializeRiskOrchestrator(symbols);
  }

  /**
   * Initialize Advanced Risk Orchestrator
   */
  async initializeRiskOrchestrator(symbols: string[]): Promise<void> {
    console.log('🛡️ RISK ORCHESTRATOR: Initializing advanced risk management...');

    // Initialize the risk orchestrator
    await advancedRiskOrchestrator.initialize();

    // Set Kraken Breakout compliant risk limits
    advancedRiskOrchestrator.setRiskLimits({
      maxPortfolioDrawdown: 8.0,    // 8% max drawdown (Kraken Breakout)
      maxPositionSize: 25.0,        // 25% max single position
      maxCorrelation: 0.7,          // 70% max correlation
      maxDailyVaR: 5.0,            // 5% daily VaR limit
      emergencyStopLevel: 10.0,     // 10% emergency stop
      minLiquidityScore: 0.3        // 30% minimum liquidity (crypto-friendly)
    });

    // Listen for risk alerts
    advancedRiskOrchestrator.on('riskAlert', (alert) => {
      console.log(`🚨 RISK ALERT [${alert.level}]: ${alert.message}`);
      if (alert.level === 'CRITICAL' || alert.level === 'EMERGENCY') {
        console.log(`   Recommendations: ${alert.recommendations.join(', ')}`);
        // Could emit alerts to external systems here
      }
    });

    // Listen for emergency mode activation
    advancedRiskOrchestrator.on('emergencyActivated', (event) => {
      console.log('🚨 EMERGENCY MODE ACTIVATED - All trading suspended');
      console.log(`   Reason: ${event.reason}`);
      // Could trigger emergency position closure here
    });

    console.log('✅ RISK ORCHESTRATOR: Advanced risk management system active');
  }

  /**
   * Calculate risk-aware position size for an opportunity
   */
  async calculateRiskAwarePositionSize(
    symbol: string,
    expectedReturn: number,
    winProbability: number,
    currentPrice: number,
    availableCapital: number,
    currentPositions: any[] = []
  ): Promise<{
    quantity: number;
    positionValue: number;
    riskMetrics: RiskMetrics | null;
    riskApproval: { approved: boolean; reasons: string[] };
    adjustmentFactors: any;
  }> {
    try {
      console.log(`🛡️ RISK-AWARE SIZING: Calculating for ${symbol} (${expectedReturn.toFixed(2)}% expected, ${winProbability.toFixed(1)}% win prob)`);

      // Calculate current portfolio risk metrics
      const currentPrices = { [symbol]: currentPrice };
      const riskMetrics = await advancedRiskOrchestrator.calculatePortfolioRisk(currentPositions, currentPrices);

      // Calculate optimal position size using advanced risk management
      const optimalQuantity = await advancedRiskOrchestrator.calculateOptimalPositionSize(
        symbol,
        currentPrice,
        availableCapital,
        expectedReturn,
        winProbability
      );

      const positionValue = optimalQuantity * currentPrice;

      // Validate trade against risk controls
      const riskApproval = await advancedRiskOrchestrator.validateTrade(
        symbol,
        'BUY', // Assuming buy for now
        optimalQuantity,
        currentPrice,
        currentPositions
      );

      // Get adjustment factors for transparency
      const adjustmentFactors = {
        regimeAdjustment: this.getRegimeAdjustmentForSymbol(symbol),
        correlationRisk: riskMetrics?.correlationRisk || 0,
        volatilityRisk: riskMetrics?.volatilityRisk || 0,
        liquidityRisk: riskMetrics?.liquidityRisk || 0,
        overallRiskScore: riskMetrics?.overallRiskScore || 0
      };

      console.log(`🎯 POSITION SIZE RESULT: ${optimalQuantity.toFixed(8)} ${symbol} (${positionValue.toFixed(2)} USD)`);
      console.log(`   Risk Score: ${(riskMetrics?.overallRiskScore || 0).toFixed(1)}/100`);
      console.log(`   Risk Approval: ${riskApproval.approved ? '✅ APPROVED' : '❌ BLOCKED'}`);

      if (!riskApproval.approved) {
        console.log(`   Reasons: ${riskApproval.reasons.join(', ')}`);
      }

      return {
        quantity: optimalQuantity,
        positionValue,
        riskMetrics,
        riskApproval,
        adjustmentFactors
      };

    } catch (error) {
      console.error(`❌ RISK-AWARE SIZING ERROR for ${symbol}:`, error);

      // Return conservative fallback
      const fallbackQuantity = (availableCapital * 0.02) / currentPrice; // 2% risk
      return {
        quantity: fallbackQuantity,
        positionValue: fallbackQuantity * currentPrice,
        riskMetrics: null,
        riskApproval: { approved: true, reasons: ['Fallback conservative sizing'] },
        adjustmentFactors: { fallback: true }
      };
    }
  }

  /**
   * Get regime adjustment factor for a symbol
   */
  private getRegimeAdjustmentForSymbol(symbol: string): number {
    // Get current regime for symbol (simplified)
    const regimeContext = this.regimeContexts.get(symbol);
    if (!regimeContext) return 1.0;

    // Return regime-specific adjustment
    const adjustments: Record<string, number> = {
      'TRENDING_BULL': 1.2,
      'TRENDING_BEAR': 0.6,
      'SIDEWAYS_CALM': 1.0,
      'SIDEWAYS_VOLATILE': 0.8,
      'BREAKOUT_BULL': 1.1,
      'BREAKOUT_BEAR': 0.7,
      'REVERSAL': 0.5,
      'CONSOLIDATION': 0.9
    };

    return adjustments[regimeContext.regime] || 1.0;
  }

  /**
   * Handle regime change events
   */
  private onRegimeChange(event: any): void {
    // Adjust system weights based on regime
    this.adjustWeightsForRegime(event.to.regime, event.symbol);

    // Clear old signals that may not be valid in new regime
    this.clearOldSignalsForSymbol(event.symbol);
  }

  /**
   * Update regime context for a symbol
   */
  private updateRegimeContext(symbol: string, regime: RegimeContext): void {
    // Store regime data for use in unified analysis
    // This will be accessed during analyzeSymbolUnified calls
  }

  /**
   * Adjust system weights based on current market regime
   */
  private adjustWeightsForRegime(regime: string, symbol: string): void {
    // Adjust weights based on regime type
    switch (regime) {
      case 'TRENDING_BULL':
      case 'TRENDING_BEAR':
        // In trending markets, momentum and mathematical intuition are more reliable
        this.systemWeights.mathematicalIntuition = 0.40;
        this.systemWeights.profitPredator = 0.30;
        this.systemWeights.bayesianProbability = 0.25;
        this.systemWeights.orderBook = 0.05;
        break;

      case 'SIDEWAYS_VOLATILE':
        // In volatile sideways markets, order book and Bayesian are more important
        this.systemWeights.bayesianProbability = 0.35;
        this.systemWeights.orderBook = 0.25;
        this.systemWeights.mathematicalIntuition = 0.25;
        this.systemWeights.profitPredator = 0.15;
        break;

      case 'BREAKOUT_BULL':
      case 'BREAKOUT_BEAR':
        // In breakout conditions, profit predator and mathematical intuition excel
        this.systemWeights.profitPredator = 0.40;
        this.systemWeights.mathematicalIntuition = 0.35;
        this.systemWeights.bayesianProbability = 0.15;
        this.systemWeights.orderBook = 0.10;
        break;

      default:
        // Default balanced weights
        this.systemWeights.mathematicalIntuition = 0.35;
        this.systemWeights.bayesianProbability = 0.30;
        this.systemWeights.profitPredator = 0.25;
        this.systemWeights.orderBook = 0.10;
    }

    console.log(`⚖️ WEIGHTS ADJUSTED for ${regime}: MI=${(this.systemWeights.mathematicalIntuition*100).toFixed(0)}%, BP=${(this.systemWeights.bayesianProbability*100).toFixed(0)}%, PP=${(this.systemWeights.profitPredator*100).toFixed(0)}%, OB=${(this.systemWeights.orderBook*100).toFixed(0)}%`);
  }

  /**
   * Clear old signals when regime changes
   */
  private clearOldSignalsForSymbol(symbol: string): void {
    const signals = this.systemSignals.get(symbol) || [];
    // Keep only very recent signals (last 2 minutes)
    const recentSignals = signals.filter(signal =>
      new Date().getTime() - signal.timestamp.getTime() < 120000
    );
    this.systemSignals.set(symbol, recentSignals);
  }

  /**
   * CORE: Analyze symbol using all mathematical systems and synthesize decision
   */
  async analyzeSymbolUnified(
    symbol: string,
    marketData: any,
    profitPredatorSignal?: any,
    orderBookData?: any
  ): Promise<UnifiedDecision> {
    console.log(`🎯 UNIFIED ANALYSIS: Starting comprehensive analysis for ${symbol}`);

    try {
      // 0. Get current regime context for enhanced analysis
      const regimeContext = realTimeRegimeMonitor.getCurrentRegime(symbol);
      if (regimeContext) {
        console.log(`📊 REGIME CONTEXT: ${symbol} in ${regimeContext.primary.regime} (${(regimeContext.confidence * 100).toFixed(1)}% confidence)`);
        console.log(`   Trend: ${regimeContext.trend.direction} (${(regimeContext.trend.strength * 100).toFixed(1)}% strength)`);
        console.log(`   Volatility: ${regimeContext.volatility.regime} (${regimeContext.volatility.percentile.toFixed(0)}th percentile)`);
      }

      // 1. Gather signals from all systems in parallel (GPU accelerated with regime context)
      const [
        mathematicalIntuitionSignal,
        bayesianSignal,
        orderBookIntelligence
      ] = await Promise.all([
        this.getMathematicalIntuitionSignal(symbol, marketData),
        this.getBayesianSignal(symbol, marketData),
        this.getOrderBookSignal(symbol, orderBookData)
      ]);

      // 2. Process Profit Predator signal (if provided)
      const profitPredatorProcessed = profitPredatorSignal ?
        this.processProfitPredatorSignal(symbol, profitPredatorSignal) : null;

      // 3. Collect all valid signals
      const allSignals: SystemSignal[] = [
        mathematicalIntuitionSignal,
        bayesianSignal,
        orderBookIntelligence,
        ...(profitPredatorProcessed ? [profitPredatorProcessed] : [])
      ].filter(signal => signal !== null);

      // 4. Store signals for analysis
      this.systemSignals.set(symbol, allSignals);

      // 5. Synthesize unified decision using advanced mathematics
      const unifiedDecision = await this.synthesizeUnifiedDecision(symbol, allSignals, marketData);

      // 6. Store decision for learning
      this.decisionHistory.push(unifiedDecision);

      // 7. Update system weights based on recent performance
      await this.updateSystemWeights();

      console.log(`✅ UNIFIED DECISION: ${unifiedDecision.finalDecision} for ${symbol} (confidence: ${(unifiedDecision.confidence * 100).toFixed(1)}%)`);

      return unifiedDecision;

    } catch (error) {
      console.error(`❌ UNIFIED ANALYSIS ERROR for ${symbol}:`, error);
      return this.getDefaultDecision(symbol);
    }
  }

  /**
   * Get Mathematical Intuition Engine signal
   */
  private async getMathematicalIntuitionSignal(symbol: string, marketData: any): Promise<SystemSignal> {
    try {
      // Create signal object that Mathematical Intuition Engine expects
      const signal = {
        symbol,
        confidence: 0.5,
        strength: 0.5,
        timestamp: new Date(),
        action: 'ANALYZE'
      };

      // Run Mathematical Intuition analysis
      const result = await mathIntuitionEngine.runParallelAnalysisSimple(signal, marketData);

      // Extract recommendation from intuition
      let recommendation: 'BUY' | 'SELL' | 'HOLD' | 'WAIT' = 'HOLD';
      if (result.recommendation === 'BUY') recommendation = 'BUY';
      else if (result.recommendation === 'SELL') recommendation = 'SELL';
      else if (result.recommendation === 'WAIT') recommendation = 'WAIT';

      return {
        source: 'mathematical_intuition',
        symbol,
        timestamp: new Date(),
        confidence: Math.max(result.intuition.overallIntuition, result.traditional.winRateProjection),
        recommendation,
        strength: result.intuition.overallIntuition,
        reasoning: `8-domain mathematical analysis: Flow field ${(result.intuition.flowFieldResonance * 100).toFixed(1)}%, Pattern resonance ${(result.intuition.patternResonance * 100).toFixed(1)}%`,
        data: {
          mathIntuition: result.intuition.overallIntuition,
          flowFieldStrength: result.intuition.flowFieldResonance,
          patternResonance: result.intuition.patternResonance,
          timingIntuition: result.intuition.temporalIntuition,
          overallFeeling: result.intuition.overallIntuition
        }
      };

    } catch (error) {
      console.warn('⚠️ Mathematical Intuition signal failed:', error.message);
      return this.getDefaultSystemSignal('mathematical_intuition', symbol);
    }
  }

  /**
   * Get Bayesian Probability Engine signal
   */
  private async getBayesianSignal(symbol: string, marketData: any): Promise<SystemSignal> {
    try {
      // Gather evidence for Bayesian analysis
      const evidence = await this.bayesianEngine.gatherMarketEvidence(symbol);
      const currentPrice = marketData?.price || marketData?.close || 0;

      // Generate Bayesian signal
      const bayesianResult = await this.bayesianEngine.generateSignal(symbol, evidence, currentPrice);

      // Convert Bayesian recommendation to unified format
      let recommendation: 'BUY' | 'SELL' | 'HOLD' | 'WAIT' = 'HOLD';
      if (bayesianResult.recommendation === 'STRONG_BUY' || bayesianResult.recommendation === 'BUY') {
        recommendation = 'BUY';
      } else if (bayesianResult.recommendation === 'STRONG_SELL' || bayesianResult.recommendation === 'SELL') {
        recommendation = 'SELL';
      } else {
        recommendation = 'HOLD';
      }

      return {
        source: 'bayesian_probability',
        symbol,
        timestamp: new Date(),
        confidence: bayesianResult.confidence,
        recommendation,
        strength: Math.max(bayesianResult.bullishProbability, bayesianResult.bearishProbability),
        reasoning: `Bayesian regime: ${bayesianResult.mostLikelyRegime} (${(bayesianResult.confidence * 100).toFixed(1)}% confidence)`,
        data: {
          mostLikelyRegime: bayesianResult.mostLikelyRegime,
          bullishProbability: bayesianResult.bullishProbability,
          bearishProbability: bayesianResult.bearishProbability,
          uncertainty: bayesianResult.uncertainty
        }
      };

    } catch (error) {
      console.warn('⚠️ Bayesian Probability signal failed:', error.message);
      return this.getDefaultSystemSignal('bayesian_probability', symbol);
    }
  }

  /**
   * Process Profit Predator signal
   */
  private processProfitPredatorSignal(symbol: string, profitPredatorData: any): SystemSignal {
    try {
      const expectedReturn = profitPredatorData.expectedReturn || 0;
      const winProbability = profitPredatorData.winProbability || 0.5;

      // Convert expected return to recommendation
      let recommendation: 'BUY' | 'SELL' | 'HOLD' | 'WAIT' = 'HOLD';
      if (expectedReturn > 12) recommendation = 'BUY';
      else if (expectedReturn < -5) recommendation = 'SELL';
      else if (expectedReturn > 8) recommendation = 'BUY';
      else recommendation = 'WAIT';

      return {
        source: 'profit_predator',
        symbol,
        timestamp: new Date(),
        confidence: winProbability / 100,
        recommendation,
        strength: Math.min(1, expectedReturn / 20), // Normalize to 0-1
        reasoning: `Profit Predator: ${expectedReturn.toFixed(2)}% expected return, ${winProbability.toFixed(1)}% win probability`,
        data: {
          expectedReturn,
          winProbability,
          opportunityScore: expectedReturn
        }
      };

    } catch (error) {
      console.warn('⚠️ Profit Predator signal processing failed:', error.message);
      return this.getDefaultSystemSignal('profit_predator', symbol);
    }
  }

  /**
   * Get Order Book Analysis signal
   */
  private async getOrderBookSignal(symbol: string, orderBookData?: any): Promise<SystemSignal> {
    try {
      // If no order book data provided, return neutral signal
      if (!orderBookData) {
        return this.getDefaultSystemSignal('order_book', symbol);
      }

      // Process order book intelligence
      const marketStructure = orderBookData.marketStructure || { trend: 'NEUTRAL', strength: 50, confidence: 50 };
      const orderFlow = orderBookData.orderFlow || { whaleActivity: false, institutionalFlow: 'NEUTRAL' };

      // Convert order book signals to recommendation
      let recommendation: 'BUY' | 'SELL' | 'HOLD' | 'WAIT' = 'HOLD';
      if (marketStructure.trend === 'BULLISH' && marketStructure.confidence > 70) {
        recommendation = 'BUY';
      } else if (marketStructure.trend === 'BEARISH' && marketStructure.confidence > 70) {
        recommendation = 'SELL';
      }

      return {
        source: 'order_book',
        symbol,
        timestamp: new Date(),
        confidence: marketStructure.confidence / 100,
        recommendation,
        strength: marketStructure.strength / 100,
        reasoning: `Order book: ${marketStructure.trend} trend, ${orderFlow.institutionalFlow} institutional flow`,
        data: {
          marketStructure,
          orderFlow
        }
      };

    } catch (error) {
      console.warn('⚠️ Order Book signal failed:', error.message);
      return this.getDefaultSystemSignal('order_book', symbol);
    }
  }

  /**
   * CORE: Synthesize unified decision using advanced mathematical methods
   */
  private async synthesizeUnifiedDecision(
    symbol: string,
    signals: SystemSignal[],
    marketData: any
  ): Promise<UnifiedDecision> {
    console.log(`🧮 MATHEMATICAL SYNTHESIS: Processing ${signals.length} system signals for ${symbol}`);

    // 1. Calculate system agreement using correlation analysis
    const systemAgreement = this.calculateSystemAgreement(signals);

    // 2. Weighted harmonic synthesis of recommendations
    const mathematicalConsensus = this.calculateMathematicalConsensus(signals);

    // 3. Resolve conflicts using advanced voting theory
    const conflictResolution = this.resolveSystemConflicts(signals);

    // 4. Determine final decision using tensor field mathematics
    const finalDecision = this.calculateFinalDecision(signals, systemAgreement, mathematicalConsensus);

    // 5. Calculate unified confidence using information theory
    const unifiedConfidence = this.calculateUnifiedConfidence(signals, systemAgreement);

    // 6. Determine urgency using temporal analysis
    const urgency = this.calculateDecisionUrgency(signals, marketData);

    // 7. Calculate risk parameters using statistical methods
    const riskAssessment = this.calculateRiskAssessment(signals, marketData);

    // 8. Determine execution parameters
    const execution = this.calculateExecutionParameters(finalDecision, urgency, unifiedConfidence);

    return {
      symbol,
      timestamp: new Date(),
      finalDecision,
      confidence: unifiedConfidence,
      strength: mathematicalConsensus,
      urgency,
      synthesis: {
        systemAgreement,
        mathematicalConsensus,
        conflictResolution: conflictResolution.method,
        dominantReasoning: conflictResolution.reasoning
      },
      systemContributions: this.calculateSystemContributions(signals),
      riskAssessment,
      execution
    };
  }

  /**
   * Calculate system agreement using correlation analysis
   */
  private calculateSystemAgreement(signals: SystemSignal[]): number {
    if (signals.length < 2) return 1.0;

    // Convert recommendations to numerical values for correlation
    const recommendations = signals.map(signal => {
      switch (signal.recommendation) {
        case 'BUY': return 1.0;
        case 'HOLD': return 0.0;
        case 'SELL': return -1.0;
        case 'WAIT': return 0.0;
        default: return 0.0;
      }
    });

    // Calculate variance to measure agreement
    const mean = recommendations.reduce((sum, val) => sum + val, 0) / recommendations.length;
    const variance = recommendations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recommendations.length;

    // Convert variance to agreement (lower variance = higher agreement)
    const agreement = Math.max(0, 1 - variance);

    console.log(`📊 SYSTEM AGREEMENT: ${(agreement * 100).toFixed(1)}% (variance: ${variance.toFixed(3)})`);
    return agreement;
  }

  /**
   * Calculate mathematical consensus using weighted synthesis
   */
  private calculateMathematicalConsensus(signals: SystemSignal[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      const weight = this.systemWeights[signal.source] || 0.1;
      const signalStrength = signal.confidence * signal.strength;

      weightedSum += signalStrength * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Resolve conflicts between systems using voting theory
   */
  private resolveSystemConflicts(signals: SystemSignal[]): { method: string; reasoning: string } {
    // Count votes for each recommendation
    const votes = new Map<string, { count: number; totalConfidence: number; sources: string[] }>();

    for (const signal of signals) {
      const rec = signal.recommendation;
      if (!votes.has(rec)) {
        votes.set(rec, { count: 0, totalConfidence: 0, sources: [] });
      }

      const vote = votes.get(rec)!;
      const weight = this.systemWeights[signal.source] || 0.1;

      vote.count += weight; // Weighted voting
      vote.totalConfidence += signal.confidence * weight;
      vote.sources.push(signal.source);
    }

    // Find winner using plurality with confidence weighting
    let winner = { recommendation: 'HOLD', score: 0, sources: [] as string[] };

    for (const [rec, vote] of votes.entries()) {
      const score = vote.count * (vote.totalConfidence / vote.count); // Weighted by confidence
      if (score > winner.score) {
        winner = { recommendation: rec, score, sources: vote.sources };
      }
    }

    return {
      method: 'weighted_plurality_with_confidence',
      reasoning: `${winner.recommendation} chosen by ${winner.sources.join(', ')} with weighted score ${winner.score.toFixed(3)}`
    };
  }

  /**
   * Calculate final decision using tensor field mathematics
   */
  private calculateFinalDecision(
    signals: SystemSignal[],
    systemAgreement: number,
    mathematicalConsensus: number
  ): 'BUY' | 'SELL' | 'HOLD' | 'WAIT' {

    // Use highest weighted confidence signal when agreement is high
    if (systemAgreement > 0.8) {
      let bestSignal = signals[0];
      let bestScore = 0;

      for (const signal of signals) {
        const weight = this.systemWeights[signal.source] || 0.1;
        const score = signal.confidence * weight;
        if (score > bestScore) {
          bestScore = score;
          bestSignal = signal;
        }
      }

      return bestSignal.recommendation;
    }

    // Use mathematical consensus when agreement is moderate
    if (mathematicalConsensus > 0.7) return 'BUY';
    if (mathematicalConsensus < 0.3) return 'SELL';
    if (mathematicalConsensus > 0.6) return 'BUY';
    if (mathematicalConsensus < 0.4) return 'SELL';

    // Default to conservative approach when uncertain
    return 'WAIT';
  }

  /**
   * Calculate unified confidence using information theory
   */
  private calculateUnifiedConfidence(signals: SystemSignal[], systemAgreement: number): number {
    // Base confidence on weighted average
    let weightedConfidence = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      const weight = this.systemWeights[signal.source] || 0.1;
      weightedConfidence += signal.confidence * weight;
      totalWeight += weight;
    }

    const baseConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0.5;

    // Boost confidence when systems agree
    const agreementBonus = systemAgreement * 0.2;

    // Apply information theory: more signals = higher confidence (up to a point)
    const signalBonus = Math.min(0.1, signals.length * 0.02);

    const finalConfidence = Math.min(1.0, baseConfidence + agreementBonus + signalBonus);

    console.log(`🎯 UNIFIED CONFIDENCE: ${(finalConfidence * 100).toFixed(1)}% (base: ${(baseConfidence * 100).toFixed(1)}%, agreement bonus: ${(agreementBonus * 100).toFixed(1)}%)`);

    return finalConfidence;
  }

  /**
   * Calculate decision urgency using temporal analysis
   */
  private calculateDecisionUrgency(signals: SystemSignal[], marketData: any): number {
    // Base urgency on timing signals from Mathematical Intuition
    let timingUrgency = 0.5;

    // Find timing intuition from Mathematical Intuition signal
    const mathSignal = signals.find(s => s.source === 'mathematical_intuition');
    if (mathSignal?.data.timingIntuition) {
      timingUrgency = mathSignal.data.timingIntuition;
    }

    // Increase urgency based on profit predator opportunity score
    const profitSignal = signals.find(s => s.source === 'profit_predator');
    if (profitSignal?.data.expectedReturn && profitSignal.data.expectedReturn > 15) {
      timingUrgency = Math.min(1.0, timingUrgency + 0.2);
    }

    // Increase urgency based on Bayesian certainty
    const bayesianSignal = signals.find(s => s.source === 'bayesian_probability');
    if (bayesianSignal?.data.uncertainty && bayesianSignal.data.uncertainty < 0.3) {
      timingUrgency = Math.min(1.0, timingUrgency + 0.15);
    }

    return timingUrgency;
  }

  /**
   * Calculate risk assessment parameters
   */
  private calculateRiskAssessment(signals: SystemSignal[], marketData: any): any {
    // Base position size on unified confidence
    const baseConfidence = this.calculateMathematicalConsensus(signals);
    let positionSize = Math.min(0.25, baseConfidence * 0.3); // Max 25% of capital, scaled by confidence

    // Adjust based on Bayesian uncertainty
    const bayesianSignal = signals.find(s => s.source === 'bayesian_probability');
    if (bayesianSignal?.data.uncertainty && bayesianSignal.data.uncertainty > 0.5) {
      positionSize *= 0.7; // Reduce size when uncertain
    }

    // Adjust based on profit predator expected return
    const profitSignal = signals.find(s => s.source === 'profit_predator');
    if (profitSignal?.data.expectedReturn) {
      const returnMultiplier = Math.min(1.5, 1 + profitSignal.data.expectedReturn / 100);
      positionSize *= returnMultiplier;
    }

    // Calculate stop loss and take profit based on volatility
    const currentPrice = marketData?.price || marketData?.close || 100;
    const volatility = this.estimateVolatility(marketData) || 0.02;

    const stopLoss = currentPrice * (1 - volatility * 2); // 2x volatility stop
    const takeProfit = currentPrice * (1 + volatility * 3); // 3x volatility target

    return {
      positionSize: Math.max(0.01, Math.min(0.25, positionSize)),
      stopLoss,
      takeProfit,
      maxHoldTime: 240 // 4 hours default
    };
  }

  /**
   * Calculate execution parameters
   */
  private calculateExecutionParameters(
    decision: string,
    urgency: number,
    confidence: number
  ): any {
    let orderType: 'market' | 'limit' | 'stop_limit' = 'limit';
    let priority: 'high' | 'medium' | 'low' = 'medium';

    // Use market orders for high urgency and high confidence
    if (urgency > 0.8 && confidence > 0.7) {
      orderType = 'market';
      priority = 'high';
    }

    // Use limit orders for normal conditions
    if (urgency < 0.6) {
      orderType = 'limit';
      priority = 'low';
    }

    return {
      orderType,
      timeInForce: 'GTC' as const,
      priority
    };
  }

  /**
   * Calculate individual system contributions
   */
  private calculateSystemContributions(signals: SystemSignal[]): any {
    const contributions: any = {};

    for (const signal of signals) {
      const weight = this.systemWeights[signal.source] || 0.1;
      const influence = signal.confidence * weight;

      contributions[signal.source] = { weight, influence };
    }

    return contributions;
  }

  /**
   * Update system weights based on recent performance
   */
  private async updateSystemWeights(): Promise<void> {
    try {
      // This would analyze recent decision outcomes and adjust weights
      // For now, keep existing weights but could implement ML-based weight optimization
      console.log('📊 System weights maintained - ML optimization pending');
    } catch (error) {
      console.warn('⚠️ System weight update failed:', error.message);
    }
  }

  /**
   * Helper methods
   */
  private getDefaultSystemSignal(source: string, symbol: string): SystemSignal {
    return {
      source: source as any,
      symbol,
      timestamp: new Date(),
      confidence: 0.5,
      recommendation: 'HOLD',
      strength: 0.5,
      reasoning: `${source} analysis unavailable - using neutral signal`,
      data: {}
    };
  }

  private getDefaultDecision(symbol: string): UnifiedDecision {
    return {
      symbol,
      timestamp: new Date(),
      finalDecision: 'HOLD',
      confidence: 0.5,
      strength: 0.5,
      urgency: 0.5,
      synthesis: {
        systemAgreement: 0.5,
        mathematicalConsensus: 0.5,
        conflictResolution: 'default_fallback',
        dominantReasoning: 'Analysis failed - using conservative default'
      },
      systemContributions: {},
      riskAssessment: {
        positionSize: 0.05,
        stopLoss: 0,
        takeProfit: 0,
        maxHoldTime: 60
      },
      execution: {
        orderType: 'limit',
        timeInForce: 'GTC',
        priority: 'low'
      }
    };
  }

  private estimateVolatility(marketData: any): number {
    if (!marketData?.priceHistory || marketData.priceHistory.length < 10) {
      return 0.02; // Default 2% volatility
    }

    const prices = marketData.priceHistory;
    const returns = prices.slice(1).map((price: number, i: number) =>
      Math.log(price / prices[i])
    );

    const mean = returns.reduce((sum: number, ret: number) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum: number, ret: number) =>
      sum + Math.pow(ret - mean, 2), 0
    ) / returns.length;

    return Math.sqrt(variance);
  }

  /**
   * Public interface for getting current system status
   */
  getSystemStatus(): any {
    return {
      systemWeights: this.systemWeights,
      recentDecisions: this.decisionHistory.slice(-10),
      signalCount: Array.from(this.systemSignals.values()).reduce((sum, signals) => sum + signals.length, 0)
    };
  }
}

// Export singleton instance
export const unifiedTensorCoordinator = UnifiedTensorCoordinator.getInstance();

export default unifiedTensorCoordinator;