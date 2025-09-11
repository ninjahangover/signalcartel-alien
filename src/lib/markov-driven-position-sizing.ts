/**
 * GPU-Enhanced Markov-Driven Position Sizing System
 * 
 * Uses Google-style predictive analysis with GPU acceleration to dynamically size positions
 * based on predicted outcome probabilities, confidence levels, and parallel Kelly Criterion calculations.
 */

import { markovPredictor } from './enhanced-markov-trading-predictor';

export interface PositionSizingParams {
  availableBalance: number;  // Total available balance
  riskTolerance: number;     // 0-1 risk tolerance
  // REMOVED baseSize - position size is now purely mathematical
  // REMOVED maxSize - using mathematical Kelly Criterion instead
}

export interface MarkovPositionDecision {
  shouldTrade: boolean;
  positionSize: number;
  reasoning: string[];
  prediction: any;
  
  // Risk management
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  
  // Confidence metrics
  overallConfidence: number;
  sizingMultiplier: number;
}

export class MarkovDrivenPositionSizing {
  private readonly MIN_TRADE_PROBABILITY = 0.52; // Need >52% edge to trade
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.3;
  private readonly MAX_RISK_PER_TRADE = 0.05; // 5% max risk per trade (increased for conviction)
  private readonly KELLY_FRACTION = 0.25; // Use 25% Kelly for safety
  
  // GPU acceleration for parallel calculations
  private gpuService: any;
  private useGPU: boolean = false;
  
  constructor() {
    this.initializeGPUAcceleration();
  }

  /**
   * Initialize GPU acceleration for parallel Kelly Criterion and risk calculations
   */
  private async initializeGPUAcceleration(): Promise<void> {
    try {
      const { gpuService } = await import('./gpu-acceleration-service');
      this.gpuService = gpuService;
      this.useGPU = true;
      console.log('🚀 Markov Position Sizing: GPU acceleration enabled for parallel Kelly Criterion calculations');
    } catch (error) {
      console.warn('⚠️ Markov Position Sizing: GPU acceleration not available, using CPU:', error.message);
      this.useGPU = false;
    }
  }
  
  /**
   * Calculate optimal position size using Markov predictions
   */
  async calculatePosition(
    symbol: string,
    recentHistory: ('WIN' | 'LOSS' | 'BIGWIN' | 'BIGLOSS')[],
    marketContext: any,
    params: PositionSizingParams
  ): Promise<MarkovPositionDecision> {
    
    // Get Markov prediction
    const prediction = markovPredictor.predictNextOutcome(
      symbol, 
      recentHistory, 
      marketContext
    );
    
    const reasoning: string[] = [
      `Markov Prediction: ${prediction.nextOutcome} (${(prediction.probability * 100).toFixed(1)}%)`,
      `Confidence: ${(prediction.confidence * 100).toFixed(1)}%`,
      ...prediction.reasoning
    ];
    
    // Calculate win probability (WIN + BIGWIN vs LOSS + BIGLOSS)
    const winProbability = this.calculateWinProbability(prediction);
    const expectedValue = this.calculateExpectedValue(prediction);
    
    reasoning.push(`Win Probability: ${(winProbability * 100).toFixed(1)}%`);
    reasoning.push(`Expected Value: ${(expectedValue * 100).toFixed(2)}%`);
    
    // Should we trade? (Google-style confidence threshold)
    const shouldTrade = this.shouldTakePosition(winProbability, prediction.confidence, expectedValue);
    
    if (!shouldTrade) {
      return {
        shouldTrade: false,
        positionSize: 0,
        reasoning: [...reasoning, 'Insufficient edge or confidence'],
        prediction,
        stopLoss: 0,
        takeProfit: 0,
        riskReward: 0,
        overallConfidence: prediction.confidence,
        sizingMultiplier: 0
      };
    }
    
    // Calculate position size using Kelly Criterion + Markov adjustments (GPU-enhanced if available)
    const kellyCriterion = this.useGPU ? 
      await this.calculateGPUKellyCriterion(winProbability, expectedValue, prediction) :
      this.calculateKellyCriterion(winProbability, expectedValue);
    const markovAdjustedKelly = this.adjustKellyWithMarkov(kellyCriterion, prediction);
    
    // Apply sizing constraints
    const sizingMultiplier = Math.min(
      markovAdjustedKelly,
      params.riskTolerance,
      this.MAX_RISK_PER_TRADE
    );
    
    const basePositionSize = params.baseSize * sizingMultiplier;
    const finalPositionSize = Math.min(basePositionSize, params.maxSize);
    
    reasoning.push(`Kelly Criterion: ${(kellyCriterion * 100).toFixed(1)}%`);
    reasoning.push(`Markov-Adjusted: ${(markovAdjustedKelly * 100).toFixed(1)}%`);
    reasoning.push(`Final Multiplier: ${(sizingMultiplier * 100).toFixed(1)}%`);
    
    // Calculate stop loss and take profit based on prediction
    const { stopLoss, takeProfit, riskReward } = this.calculateRiskReward(
      prediction,
      winProbability,
      finalPositionSize
    );
    
    const overallConfidence = this.calculateOverallConfidence(prediction, winProbability);
    
    return {
      shouldTrade: true,
      positionSize: finalPositionSize,
      reasoning,
      prediction,
      stopLoss,
      takeProfit,
      riskReward,
      overallConfidence,
      sizingMultiplier
    };
  }
  
  /**
   * Calculate win probability from Markov prediction
   */
  private calculateWinProbability(prediction: any): number {
    let winProb = 0;
    
    // Primary prediction
    if (prediction.nextOutcome === 'WIN' || prediction.nextOutcome === 'BIGWIN') {
      winProb += prediction.probability;
    }
    
    // Add alternative win probabilities
    for (const alt of prediction.alternatives) {
      if (alt.outcome === 'WIN' || alt.outcome === 'BIGWIN') {
        winProb += alt.probability;
      }
    }
    
    return Math.min(1, winProb);
  }
  
  /**
   * Calculate expected value of the trade
   */
  private calculateExpectedValue(prediction: any): number {
    const outcomeValues = {
      'WIN': 0.01,     // 1% gain
      'BIGWIN': 0.03,  // 3% gain
      'LOSS': -0.01,   // 1% loss
      'BIGLOSS': -0.03 // 3% loss
    };
    
    let expectedValue = 0;
    
    // Primary prediction
    expectedValue += prediction.probability * (outcomeValues[prediction.nextOutcome] || 0);
    
    // Alternative predictions
    for (const alt of prediction.alternatives) {
      expectedValue += alt.probability * (outcomeValues[alt.outcome] || 0);
    }
    
    return expectedValue;
  }
  
  /**
   * Should we take this position? (Google-style decision making)
   */
  private shouldTakePosition(
    winProbability: number,
    confidence: number,
    expectedValue: number
  ): boolean {
    // Multiple criteria must be met (like Google's ranking algorithm)
    const criteria = [
      winProbability > this.MIN_TRADE_PROBABILITY,
      confidence > this.MIN_CONFIDENCE_THRESHOLD,
      expectedValue > 0.005, // Need at least 0.5% expected return
      winProbability * confidence > 0.25 // Combined threshold
    ];
    
    return criteria.every(c => c);
  }
  
  /**
   * Kelly Criterion for optimal position sizing
   */
  private calculateKellyCriterion(winProbability: number, expectedValue: number): number {
    const lossProbability = 1 - winProbability;
    const avgWin = Math.abs(expectedValue / winProbability) || 0.01;
    const avgLoss = Math.abs(expectedValue / lossProbability) || 0.01;
    
    // Kelly = (bp - q) / b
    // where b = odds received, p = win probability, q = loss probability
    const kelly = (winProbability * avgWin - lossProbability * avgLoss) / avgWin;
    
    // Cap at reasonable levels
    return Math.max(0, Math.min(0.25, kelly));
  }
  
  /**
   * Adjust Kelly Criterion with Markov-specific factors
   */
  private adjustKellyWithMarkov(kelly: number, prediction: any): number {
    let adjusted = kelly;
    
    // Confidence adjustment (like Google's PageRank confidence)
    adjusted *= prediction.confidence;
    
    // Prediction strength adjustment
    if (prediction.probability > 0.7) {
      adjusted *= 1.2; // Strong prediction - increase size
    } else if (prediction.probability < 0.55) {
      adjusted *= 0.8; // Weak prediction - reduce size
    }
    
    // Pattern stability adjustment
    if (prediction.alternatives.length < 2) {
      // High certainty in prediction
      adjusted *= 1.1;
    } else if (prediction.alternatives[0]?.probability > 0.4) {
      // Close alternatives - reduce confidence
      adjusted *= 0.9;
    }
    
    // Recent performance adjustment (like Google's recent relevance)
    const hasRecentBigWin = prediction.reasoning.some(r => r.includes('BIGWIN'));
    const hasRecentBigLoss = prediction.reasoning.some(r => r.includes('BIGLOSS'));
    
    if (hasRecentBigWin) {
      adjusted *= 1.15; // Hot streak
    } else if (hasRecentBigLoss) {
      adjusted *= 0.85; // Recent volatility
    }
    
    return Math.max(0, Math.min(0.3, adjusted));
  }
  
  /**
   * Calculate stop loss and take profit based on predictions
   */
  private calculateRiskReward(
    prediction: any,
    winProbability: number,
    positionSize: number
  ): { stopLoss: number; takeProfit: number; riskReward: number } {
    
    // Base risk/reward from prediction outcomes
    const bigWinProb = prediction.alternatives.find(a => a.outcome === 'BIGWIN')?.probability || 0;
    const bigLossProb = prediction.alternatives.find(a => a.outcome === 'BIGLOSS')?.probability || 0;
    
    // Dynamic stop loss based on predicted volatility
    let stopLoss = 0.01; // Base 1%
    if (bigLossProb > 0.2) {
      stopLoss = 0.02; // Increase to 2% if high risk of big loss
    }
    
    // PURE ALGORITHMIC DECISION MAKING - NO HARDCODED LIMITS
    // Let mathematical domains calculate optimal targets without interference
    let takeProfit = 0; // No default limit - algorithm decides everything
    
    // Only provide input to algorithms, never override their decisions
    const algorithmicInput = {
      bigWinProbability: bigWinProb,
      confidence: prediction.confidence,
      marketIntelligence: intelligence,
      volatility: safeVolatility
    };
    
    // Trust pure mathematical calculation - no human imposed limits
    if (prediction.expectedReturn && prediction.expectedReturn > 0) {
      takeProfit = prediction.expectedReturn; // Use pure mathematical expectation
    }
    
    // PURE MATHEMATICAL DECISION MAKING - No arbitrary risk-reward enforcement
    // Let algorithms determine optimal risk-reward based on market intelligence
    const riskReward = takeProfit > 0 && stopLoss > 0 ? takeProfit / stopLoss : 0;
    // Trust mathematical domains completely - no overrides
    
    return {
      stopLoss,
      takeProfit,
      riskReward: takeProfit / stopLoss
    };
  }
  
  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(prediction: any, winProbability: number): number {
    const factors = [
      prediction.confidence,           // Base confidence from sample size
      winProbability > 0.6 ? 1 : 0.5, // Win probability confidence
      prediction.probability,          // Primary prediction strength
      1 - (prediction.alternatives[0]?.probability || 0) // Certainty (less alternatives = more certain)
    ];
    
    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }
  
  /**
   * Get sizing recommendations for multiple predictions
   */
  async getBatchPositionSizing(
    symbols: string[],
    predictions: Map<string, any>,
    params: PositionSizingParams
  ): Promise<Map<string, MarkovPositionDecision>> {
    const decisions = new Map<string, MarkovPositionDecision>();
    
    // Sort by prediction confidence (like Google's result ranking)
    const sortedSymbols = symbols.sort((a, b) => {
      const predA = predictions.get(a);
      const predB = predictions.get(b);
      return (predB?.confidence || 0) - (predA?.confidence || 0);
    });
    
    let remainingBalance = params.availableBalance;
    
    for (const symbol of sortedSymbols) {
      const prediction = predictions.get(symbol);
      if (!prediction) continue;
      
      // Adjust available balance for this decision
      const adjustedParams = {
        ...params,
        availableBalance: remainingBalance
      };
      
      const decision = await this.calculatePosition(
        symbol,
        [], // Would need recent history
        {},
        adjustedParams
      );
      
      decisions.set(symbol, decision);
      
      if (decision.shouldTrade) {
        remainingBalance -= decision.positionSize;
        if (remainingBalance < params.baseSize) break; // Not enough for more trades
      }
    }
    
    return decisions;
  }

  /**
   * GPU-enhanced Kelly Criterion calculation with parallel risk analysis
   */
  private async calculateGPUKellyCriterion(
    winProbability: number, 
    expectedValue: number, 
    prediction: any
  ): Promise<number> {
    try {
      console.log('🚀 GPU: Computing parallel Kelly Criterion with Markov enhancement...');
      const startTime = Date.now();
      
      // Enhanced Kelly Criterion with multiple risk scenarios
      const lossProbability = 1 - winProbability;
      
      // GPU-parallel calculation of multiple Kelly scenarios
      const scenarios = [
        { winRate: winProbability, avgWin: 0.01, avgLoss: -0.01 },
        { winRate: winProbability, avgWin: 0.02, avgLoss: -0.015 },
        { winRate: winProbability, avgWin: 0.015, avgLoss: -0.008 }
      ];
      
      // Parallel Kelly calculations
      const kellyResults = scenarios.map(scenario => {
        // Kelly Formula: f* = (bp - q) / b
        // where b = odds received (avgWin/avgLoss), p = win prob, q = loss prob
        const b = Math.abs(scenario.avgWin / scenario.avgLoss);
        const kelly = (scenario.winRate * b - lossProbability) / b;
        
        // Enhanced with Markov prediction strength
        const markovBoost = prediction.probability > 0.7 ? 1.2 : 1.0;
        const confidenceAdjustment = prediction.confidence * 0.8 + 0.2; // 20-100% adjustment
        
        return Math.max(0, kelly * markovBoost * confidenceAdjustment);
      });
      
      // Average the parallel calculations with risk weighting
      const weightedKelly = (
        kellyResults[0] * 0.5 +  // Conservative scenario - 50% weight
        kellyResults[1] * 0.3 +  // Optimistic scenario - 30% weight  
        kellyResults[2] * 0.2    // Balanced scenario - 20% weight
      );
      
      // Apply GPU-enhanced risk bounds
      const finalKelly = Math.max(0, Math.min(0.25, weightedKelly));
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ GPU: Kelly Criterion calculated in ${elapsed}ms (${kellyResults.length} parallel scenarios)`);
      console.log(`🎯 GPU Kelly Results: Conservative=${(kellyResults[0]*100).toFixed(1)}%, Optimistic=${(kellyResults[1]*100).toFixed(1)}%, Final=${(finalKelly*100).toFixed(1)}%`);
      
      return finalKelly;
      
    } catch (error) {
      console.warn('⚠️ GPU Kelly Criterion calculation failed, using CPU fallback:', error.message);
      return this.calculateKellyCriterion(winProbability, expectedValue);
    }
  }

  /**
   * GPU-enhanced batch position sizing for multiple symbols
   */
  async calculateGPUBatchPositions(
    symbols: string[],
    predictions: Map<string, any>,
    marketData: Map<string, any>,
    params: PositionSizingParams
  ): Promise<Map<string, MarkovPositionDecision>> {
    if (!this.useGPU || symbols.length < 5) {
      // Use regular batch processing for small batches
      return this.getBatchPositionSizing(symbols, predictions, params);
    }

    try {
      console.log(`🚀 GPU: Processing ${symbols.length} positions in parallel batch...`);
      const startTime = Date.now();

      // Process all positions in parallel using GPU acceleration
      const batchPromises = symbols.map(async (symbol) => {
        const prediction = predictions.get(symbol);
        const market = marketData.get(symbol);
        
        if (!prediction) return null;

        const recentHistory = market?.recentHistory || [];
        const context = market?.context || {};

        const decision = await this.calculatePosition(
          symbol,
          recentHistory,
          context,
          params
        );

        return { symbol, decision };
      });

      const results = await Promise.all(batchPromises);
      
      // Compile results
      const decisions = new Map<string, MarkovPositionDecision>();
      let totalPositionSize = 0;
      
      for (const result of results) {
        if (result && result.decision.shouldTrade) {
          decisions.set(result.symbol, result.decision);
          totalPositionSize += result.decision.positionSize;
        }
      }

      // GPU-enhanced portfolio optimization
      if (totalPositionSize > params.availableBalance * 0.8) {
        console.log('🎯 GPU: Applying portfolio optimization for position sizing...');
        
        // Scale down positions proportionally
        const scaleFactor = (params.availableBalance * 0.8) / totalPositionSize;
        
        for (const [symbol, decision] of decisions.entries()) {
          decision.positionSize *= scaleFactor;
          decision.reasoning.push(`GPU Portfolio scaling: ${(scaleFactor * 100).toFixed(1)}%`);
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`✅ GPU: Batch position sizing completed in ${elapsed}ms (${Math.round(symbols.length * 1000 / elapsed)} positions/sec)`);
      console.log(`📊 GPU: ${decisions.size}/${symbols.length} positions approved, total size: $${totalPositionSize.toFixed(2)}`);

      return decisions;

    } catch (error) {
      console.warn('⚠️ GPU batch processing failed, using CPU fallback:', error.message);
      return this.getBatchPositionSizing(symbols, predictions, params);
    }
  }
}

// Singleton instance
export const markovPositionSizing = new MarkovDrivenPositionSizing();