/**
 * Production Integration for Tensor AI Fusion Engine
 * 
 * Bridges existing AI systems with the new tensor-based fusion approach
 */

import { tensorAIFusion, AISystemOutput, FusedDecision } from './tensor-ai-fusion-engine';
import { advancedTensorIntegration, AdvancedStrategyBundle } from './advanced-tensor-strategy-integration';
import { MathematicalIntuitionEngine } from './mathematical-intuition-engine';
import { enhancedMathematicalIntuition } from './enhanced-mathematical-intuition';
import { EnhancedMarkovPredictor } from './enhanced-markov-predictor';
import { adaptiveSignalLearning } from './adaptive-signal-learning';

export interface ProductionAIBundle {
  symbol: string;
  currentPrice: number;
  
  // Basic AI outputs (legacy)
  pineScriptResult?: any;
  mathematicalIntuition?: any;
  markovPrediction?: any;
  adaptiveLearning?: any;
  sentimentAnalysis?: any;
  
  // ADVANCED AI outputs (high priority)
  gpuNeuralResult?: any;
  quantumSupremacyResult?: any;
  orderBookAIResult?: any;
  quantumOscillatorResult?: any;
  profitOptimizerResult?: any;
  evolutionEngineResult?: any;
  
  // Market context
  marketData?: any;
  phase: number;
  timestamp: Date;
}

export interface TensorTradingDecision {
  shouldTrade: boolean;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  expectedMove: number;
  positionSize: number;
  expectedPnL: number;
  
  // Mathematical details
  fusedDecision: FusedDecision;
  aiSystemsUsed: string[];
  
  // Comparison with old system
  oldSystemDecision?: {
    wouldTrade: boolean;
    confidence: number;
    reason: string;
  };
}

export class ProductionTensorIntegration {
  
  /**
   * Convert existing AI outputs to standardized tensor format
   * PRIORITY: Advanced strategies first, basic strategies as fallback
   */
  async convertToTensorInputs(bundle: ProductionAIBundle): Promise<AISystemOutput[]> {
    const outputs: AISystemOutput[] = [];
    
    // FIRST: Process advanced strategies (high priority)
    console.log(`🚀 Processing ADVANCED AI strategies for ${bundle.symbol}`);
    
    const advancedBundle: AdvancedStrategyBundle = {
      symbol: bundle.symbol,
      currentPrice: bundle.currentPrice,
      marketData: bundle.marketData,
      gpuNeuralResult: bundle.gpuNeuralResult,
      quantumSupremacyResult: bundle.quantumSupremacyResult,
      orderBookAIResult: bundle.orderBookAIResult,
      quantumOscillatorResult: bundle.quantumOscillatorResult,
      profitOptimizerResult: bundle.profitOptimizerResult,
      evolutionEngineResult: bundle.evolutionEngineResult,
      phase: bundle.phase,
      timestamp: bundle.timestamp
    };
    
    // Get advanced strategy outputs
    const advancedOutputs = await advancedTensorIntegration.convertAdvancedStrategiesToTensors(advancedBundle);
    outputs.push(...advancedOutputs);
    
    // SECOND: Process basic strategies (legacy fallback)
    console.log(`📊 Processing basic AI strategies for ${bundle.symbol}`);
    
    // Pine Script conversion (basic)
    if (bundle.pineScriptResult) {
      const pineOutput: AISystemOutput = {
        systemId: 'pine-script',
        confidence: this.extractPineScriptConfidence(bundle.pineScriptResult),
        direction: this.extractPineScriptDirection(bundle.pineScriptResult),
        magnitude: this.estimatePineScriptMagnitude(bundle.pineScriptResult, bundle.currentPrice),
        reliability: this.getPineScriptReliability(bundle.symbol),
        timestamp: bundle.timestamp
      };
      outputs.push(pineOutput);
    }
    
    // Mathematical Intuition conversion
    if (bundle.mathematicalIntuition) {
      const mathOutput: AISystemOutput = {
        systemId: 'mathematical-intuition',
        confidence: bundle.mathematicalIntuition.originalIntuition || 0,
        direction: this.extractMathIntuitionDirection(bundle.mathematicalIntuition),
        magnitude: Math.abs(bundle.mathematicalIntuition.flowField || 0.01),
        reliability: 0.80, // Historical performance
        timestamp: bundle.timestamp,
        additionalData: {
          flowField: bundle.mathematicalIntuition.flowField,
          patternResonance: bundle.mathematicalIntuition.patternResonance
        }
      };
      outputs.push(mathOutput);
    }
    
    // Markov Chain conversion
    if (bundle.markovPrediction) {
      const markovOutput: AISystemOutput = {
        systemId: 'markov-chain',
        confidence: bundle.markovPrediction.confidence || 0,
        direction: bundle.markovPrediction.expectedReturn > 0 ? 1 : -1,
        magnitude: Math.abs(bundle.markovPrediction.expectedReturn || 0.01),
        reliability: 0.75, // Historical performance
        timestamp: bundle.timestamp,
        additionalData: {
          currentState: bundle.markovPrediction.currentState,
          nextStateProbabilities: bundle.markovPrediction.nextStateProbabilities
        }
      };
      outputs.push(markovOutput);
    }
    
    // Adaptive Learning conversion
    if (bundle.adaptiveLearning) {
      const adaptiveData = await this.getAdaptiveLearningData(bundle.symbol);
      if (adaptiveData) {
        const adaptiveOutput: AISystemOutput = {
          systemId: 'adaptive-learning',
          confidence: adaptiveData.confidence,
          direction: adaptiveData.recommendedDirection,
          magnitude: adaptiveData.avgSuccessfulMove,
          reliability: adaptiveData.winRate,
          timestamp: bundle.timestamp,
          additionalData: {
            totalTrades: adaptiveData.totalTrades,
            recentAccuracy: adaptiveData.recentAccuracy
          }
        };
        outputs.push(adaptiveOutput);
      }
    }
    
    // Sentiment Analysis conversion (if available)
    if (bundle.sentimentAnalysis) {
      const sentimentOutput: AISystemOutput = {
        systemId: 'sentiment-analysis',
        confidence: bundle.sentimentAnalysis.confidence || 0,
        direction: bundle.sentimentAnalysis.bullishScore > 0.5 ? 1 : -1,
        magnitude: Math.abs(bundle.sentimentAnalysis.bullishScore - 0.5) * 0.04, // Scale to 0-2%
        reliability: 0.65, // Sentiment is less reliable
        timestamp: bundle.timestamp,
        additionalData: {
          sources: bundle.sentimentAnalysis.sources,
          volume: bundle.sentimentAnalysis.volume
        }
      };
      outputs.push(sentimentOutput);
    }
    
    return outputs;
  }
  
  /**
   * Main tensor-based trading decision
   */
  async makeDecision(bundle: ProductionAIBundle): Promise<TensorTradingDecision> {
    console.log(`🧮 Tensor Integration: Analyzing ${bundle.symbol} at $${bundle.currentPrice}`);
    
    // Convert existing AI outputs to tensor format
    const aiOutputs = await this.convertToTensorInputs(bundle);
    
    if (aiOutputs.length === 0) {
      throw new Error('No AI systems provided valid outputs for tensor fusion');
    }
    
    console.log(`🎯 Tensor Fusion: Using ${aiOutputs.length} AI systems: ${aiOutputs.map(ai => ai.systemId).join(', ')}`);
    
    // Apply strategy priority weights
    const priorityWeights = this.getStrategyPriorityWeights();
    const weightedOutputs = aiOutputs.map(output => {
      const priorityWeight = priorityWeights.get(output.systemId) || 0.1; // Default low weight for unknown
      return {
        ...output,
        confidence: output.confidence * priorityWeight, // Weight confidence by strategy sophistication
        additionalData: {
          ...output.additionalData,
          priorityWeight,
          originalConfidence: output.confidence
        }
      };
    });
    
    console.log(`⚖️ Applied priority weights: Advanced strategies get 2-3x more influence`);
    
    // Perform tensor fusion with weighted outputs
    const fusedDecision = tensorAIFusion.fuseAIOutputs(weightedOutputs, bundle.currentPrice, bundle.marketData);
    
    // Create production-ready decision
    const decision: TensorTradingDecision = {
      shouldTrade: fusedDecision.shouldTrade,
      direction: this.mapDirectionToString(fusedDecision.fusedDirection),
      confidence: fusedDecision.fusedConfidence,
      expectedMove: fusedDecision.fusedMagnitude,
      positionSize: fusedDecision.positionSize,
      expectedPnL: fusedDecision.expectedReturn,
      
      fusedDecision,
      aiSystemsUsed: aiOutputs.map(ai => ai.systemId)
    };
    
    console.log(`🚀 TENSOR DECISION: ${decision.shouldTrade ? 'TRADE' : 'SKIP'} ${decision.direction}`);
    console.log(`   Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
    console.log(`   Expected Move: ${(decision.expectedMove * 100).toFixed(2)}%`);
    console.log(`   Expected PnL: ${(decision.expectedPnL * 100).toFixed(2)}%`);
    console.log(`   Position Size: ${(decision.positionSize * 100).toFixed(1)}% of account`);
    console.log(`   Reason: ${fusedDecision.reason}`);
    
    return decision;
  }
  
  /**
   * Record trade outcome for learning
   */
  recordOutcome(
    decision: TensorTradingDecision,
    actualDirection: number,
    actualMagnitude: number,
    actualPnL: number
  ): void {
    tensorAIFusion.recordTradeOutcome(
      decision.fusedDecision,
      actualDirection,
      actualMagnitude,
      actualPnL
    );
  }
  
  // Helper methods for extracting data from existing systems
  
  private extractPineScriptConfidence(pineResult: any): number {
    if (pineResult.confidence !== undefined) {
      return Math.max(0, Math.min(1, pineResult.confidence / 100));
    }
    
    // Try to extract from other fields
    if (pineResult.signal && pineResult.signal.confidence) {
      return Math.max(0, Math.min(1, pineResult.signal.confidence / 100));
    }
    
    return 0.5; // Default neutral confidence
  }
  
  private extractPineScriptDirection(pineResult: any): number {
    if (pineResult.action) {
      switch (pineResult.action.toUpperCase()) {
        case 'BUY': return 1;
        case 'SELL': return -1;
        case 'HOLD': return 0;
        default: return 0;
      }
    }
    
    if (pineResult.signal && pineResult.signal.action) {
      switch (pineResult.signal.action.toUpperCase()) {
        case 'BUY': return 1;
        case 'SELL': return -1;
        case 'HOLD': return 0;
        default: return 0;
      }
    }
    
    return 0;
  }
  
  private estimatePineScriptMagnitude(pineResult: any, currentPrice: number): number {
    if (pineResult.predictedMove) {
      return Math.abs(pineResult.predictedMove / 100); // Convert percentage to decimal
    }
    
    // Estimate based on technical indicators
    if (pineResult.rsi !== undefined) {
      if (pineResult.rsi > 80 || pineResult.rsi < 20) {
        return 0.02; // 2% move expected for extreme RSI
      }
      if (pineResult.rsi > 70 || pineResult.rsi < 30) {
        return 0.015; // 1.5% move expected for high RSI
      }
    }
    
    return 0.01; // Default 1% expected move
  }
  
  private extractMathIntuitionDirection(mathIntuition: any): number {
    if (mathIntuition.flowField !== undefined) {
      return mathIntuition.flowField > 0 ? 1 : -1;
    }
    
    return 0;
  }
  
  private getPineScriptReliability(symbol: string): number {
    // This could be enhanced to look up historical performance
    // For now, return a conservative estimate
    return 0.75;
  }
  
  private async getAdaptiveLearningData(symbol: string): Promise<any> {
    try {
      // Get recent performance data for this symbol
      const performance = adaptiveSignalLearning.getPairPerformance(symbol);
      
      if (performance && performance.totalSignals > 5) {
        return {
          confidence: performance.accuracy,
          recommendedDirection: performance.avgPnL > 0 ? 1 : -1,
          avgSuccessfulMove: Math.abs(performance.avgPnL) / 60, // Convert dollar PnL to percentage
          winRate: performance.accuracy,
          totalTrades: performance.totalSignals,
          recentAccuracy: performance.accuracy
        };
      }
    } catch (error) {
      console.warn(`⚠️ Could not get adaptive learning data for ${symbol}:`, error.message);
    }
    
    return null;
  }
  
  private mapDirectionToString(direction: number): 'BUY' | 'SELL' | 'HOLD' {
    if (direction > 0.1) return 'BUY';
    if (direction < -0.1) return 'SELL';
    return 'HOLD';
  }
  
  /**
   * Get strategy priority weights (advanced strategies get higher influence)
   */
  private getStrategyPriorityWeights(): Map<string, number> {
    return new Map([
      // ADVANCED STRATEGIES (high priority)
      ['gpu-neural-strategy', 3.0],         // Highest - deep learning
      ['quantum-supremacy-engine', 2.8],    // Multi-dimensional analysis  
      ['order-book-ai', 2.5],               // Market microstructure
      ['enhanced-markov-predictor', 2.2],   // State prediction
      ['profit-optimizer', 2.0],            // Profit maximization
      ['evolution-engine', 1.8],            // Self-improving
      
      // BASIC STRATEGIES (fallback)
      ['mathematical-intuition', 1.5],      // Mathematical analysis
      ['adaptive-learning', 1.3],           // Historical performance
      ['sentiment-analysis', 1.0],          // Market sentiment
      ['pine-script', 0.8],                 // Basic technical analysis
      
      // DEFAULT
      ['unknown', 0.1]                      // Unknown strategies get minimal weight
    ]);
  }
  
  /**
   * Get system performance metrics
   */
  getPerformanceMetrics(): any {
    const baseMetrics = tensorAIFusion.getSystemStatus();
    const priorityWeights = this.getStrategyPriorityWeights();
    
    return {
      ...baseMetrics,
      priorityWeights: Array.from(priorityWeights.entries()),
      advancedStrategiesAvailable: advancedTensorIntegration.getAvailableStrategies(),
      integrationVersion: 'advanced-v2.0'
    };
  }
}

// Export singleton
export const productionTensorIntegration = new ProductionTensorIntegration();