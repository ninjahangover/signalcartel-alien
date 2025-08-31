/**
 * QUANTUM FORGE™ Multi-Layer AI Enhancement Engine
 * 
 * Professional-grade multi-layer AI system that combines:
 * - Layer 1: Technical Analysis (Strategy signals)
 * - Layer 2: Sentiment Intelligence (Market psychology)
 * - Layer 3: Order Book AI (Market microstructure) 
 * - Layer 4: Final Fusion Engine (Cross-validation & decision)
 * 
 * This architecture matches institutional trading systems used by prop trading firms
 */

import { BaseStrategySignal, SentimentEnhancedSignal, UniversalSentimentEnhancer } from './sentiment/universal-sentiment-enhancer';
import { quantumForgeOrderBookAI, OrderBookAISignal } from './quantum-forge-orderbook-ai';
import consolidatedDataService from './consolidated-ai-data-service.js';
import { marketRegimeFilter } from './quantum-forge-market-regime-filter';
import { tradingWindowManager } from './quantum-forge-trading-windows';

export interface MultiLayerAISignal {
  // Original Strategy Signal (Layer 1)
  originalSignal: BaseStrategySignal;
  
  // Sentiment Intelligence (Layer 2)
  sentimentAnalysis: {
    score: number;
    confidence: number;
    conflict: boolean;
    boost: number;
    sources: string[];
  };
  
  // Order Book AI (Layer 3)  
  orderBookAnalysis: {
    microstructureScore: number;
    liquidityQuality: string;
    executionRisk: string;
    aiBoost: number;
    whaleActivity: number;
    optimalOrderSize: number;
  };
  
  // Final Fusion Decision (Layer 4)
  finalDecision: {
    action: 'BUY' | 'SELL' | 'HOLD' | 'SKIP';
    confidence: number;
    totalBoost: number;
    shouldExecute: boolean;
    positionSizing: number;
    executionStrategy: string;
    timeframe: string;
  };
  
  // Cross-Layer Analysis
  layerAgreement: {
    sentimentOrderBookAlignment: number; // -100 to 100
    conflictDetected: boolean;
    consensusStrength: number; // 0 to 100
    riskLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  };
  
  // AI Transparency & Explainability
  decisionExplanation: {
    primaryFactors: string[];
    riskFactors: string[];
    opportunityFactors: string[];
    layerContributions: {
      technical: number;
      sentiment: number;
      orderBook: number;
    };
  };
  
  // Meta Information
  processingTime: number;
  layersProcessed: number;
  dataQuality: number;
  timestamp: Date;
  version: string;
}

export interface MultiLayerConfig {
  // Layer Weights (must sum to 1.0)
  technicalWeight: number;
  sentimentWeight: number;
  orderBookWeight: number;
  
  // Risk Management
  maxPositionSize: number;
  minConsensus: number;        // Minimum agreement between layers
  skipOnConflict: boolean;     // Skip if layers strongly disagree
  
  // Execution Preferences
  preferLimitOrders: boolean;
  maxSlippageTolerance: number;
  
  // AI Tuning
  conservativeMode: boolean;   // More cautious decision making
  enableCrossValidation: boolean;
}

export class QuantumForgeMultiLayerAI {
  private sentimentEnhancer: UniversalSentimentEnhancer;
  private readonly AI_VERSION = '2.0.0-MULTI_LAYER';
  
  private readonly defaultConfig: MultiLayerConfig = {
    technicalWeight: 0.4,     // 40% weight to technical analysis
    sentimentWeight: 0.35,    // 35% weight to sentiment
    orderBookWeight: 0.25,    // 25% weight to order book AI
    
    maxPositionSize: 1.0,
    minConsensus: 60,         // Require 60% consensus
    skipOnConflict: true,
    
    preferLimitOrders: true,
    maxSlippageTolerance: 0.5, // 0.5% max slippage
    
    conservativeMode: false,
    enableCrossValidation: true
  };
  
  constructor() {
    this.sentimentEnhancer = new UniversalSentimentEnhancer();
  }
  
  /**
   * Main multi-layer AI enhancement function
   */
  async enhanceSignalWithMultiLayerAI(
    signal: BaseStrategySignal,
    config: Partial<MultiLayerConfig> = {}
  ): Promise<MultiLayerAISignal> {
    
    const startTime = performance.now();
    const effectiveConfig = { ...this.defaultConfig, ...config };
    
    console.log(`🚀 QUANTUM FORGE™ Multi-Layer AI: Processing ${signal.action} signal for ${signal.symbol}...`);
    
    try {
      // LAYER 1: Technical Analysis (already done - the input signal)
      console.log(`   Layer 1 ✅ Technical Analysis: ${signal.strategy} - ${(signal.confidence * 100).toFixed(1)}%`);
      
      // LAYER 2: Sentiment Intelligence
      console.log(`   Layer 2 🧠 Processing Sentiment Intelligence...`);
      const sentimentSignal = await this.sentimentEnhancer.enhanceSignal(signal, {
        enableOrderBookValidation: false // We'll do this separately in Layer 3
      });
      
      console.log(`   Layer 2 ✅ Sentiment: ${sentimentSignal.sentimentScore.toFixed(3)} score, ${(sentimentSignal.confidenceModifier * 100).toFixed(1)}% boost`);
      
      // LAYER 2.5: Mathematical Intuition Engine
      console.log(`   Layer 2.5 🧠 Processing Mathematical Intuition Engine...`);
      const { mathIntuitionEngine } = await import('./mathematical-intuition-engine');
      const mathematicalResult = await mathIntuitionEngine.runParallelAnalysis(sentimentSignal, signal);
      
      // Extract intuitive insights for integration
      const intuitiveConfidence = mathematicalResult.execution?.confidenceLevel || 0.5;
      const intuitiveDecision = mathematicalResult.execution?.finalDecision || 'HOLD';
      const agreementLevel = mathematicalResult.execution?.agreementLevel || 0.5;
      
      // NEW LAYER 2.6: Trading Window Analysis (Dev1 Experimental)
      console.log(`   Layer 2.6 ⏰ Checking Trading Windows...`);
      const windowStatus = tradingWindowManager.isTradingAllowed();
      const windowParams = tradingWindowManager.getWindowParameters();
      tradingWindowManager.logWindowStatus();
      
      // Apply trading window restrictions
      if (!windowStatus.allowed) {
        console.log(`   ❌ Trading blocked: ${windowStatus.reason}`);
        return this.createSkipSignal(signal, windowStatus.reason);
      }
      
      // NEW LAYER 2.7: Market Regime & Technical Pattern Analysis (Dev1 Experimental)
      console.log(`   Layer 2.7 📊 Analyzing Market Regime & Technical Patterns...`);
      
      // Get market conditions from various sources
      const marketConditions = {
        rsi: 52, // TODO: Get from technical indicators
        macd: { value: 0.012, signal: 0.009, histogram: 0.003 },
        volume: { current: 1000000, average: 850000, ratio: 1.18 },
        volatility: 0.035,
        trend: 'neutral' as 'bullish' | 'bearish' | 'neutral',
        orderBookPressure: 0.72, // Will get from order book layer
        sentimentScore: sentimentSignal.sentimentScore
      };
      
      const marketScore = await marketRegimeFilter.calculateMarketScore(marketConditions);
      
      // Get current open positions (TODO: integrate with position service)
      const currentPositions = 3; // Placeholder - will get from position service
      
      // Check if we should allow trading based on market regime
      const patterns: any[] = []; // TODO: Detect actual patterns
      const regimeDecision = await marketRegimeFilter.shouldAllowTrading(
        marketScore,
        currentPositions,
        patterns
      );
      
      if (!regimeDecision.allowed) {
        console.log(`   ❌ Market regime filter: ${regimeDecision.reason}`);
        return this.createSkipSignal(signal, regimeDecision.reason);
      }
      
      // Apply position limits from both window and regime
      const maxPositions = Math.min(
        windowParams.maxPositions,
        marketRegimeFilter.getPositionLimit(marketScore)
      );
      
      console.log(`   ✅ Market Regime: Score ${marketScore.toFixed(1)}%, Max positions: ${maxPositions}`);
      const overallFeeling = mathematicalResult.intuitive?.overallFeeling || 0.5;
      
      // Calculate intuitive boost based on alignment and confidence
      const intuitiveBoost = this.calculateIntuitiveBoost(intuitiveConfidence, agreementLevel, overallFeeling);
      
      console.log(`   Layer 2.5 ✅ Mathematical Intuition: ${intuitiveDecision} (feeling: ${overallFeeling.toFixed(3)}, boost: ${(intuitiveBoost * 100).toFixed(1)}%)`);
      console.log(`🧠 INTUITION INTEGRATION: Agreement ${(agreementLevel * 100).toFixed(0)}%, Confidence ${(intuitiveConfidence * 100).toFixed(0)}%`);
      
      // LAYER 3: Order Book AI
      console.log(`   Layer 3 🔬 Processing Order Book AI...`);
      const orderBookSignal = await quantumForgeOrderBookAI.enhanceSignalWithOrderBookAI(signal);
      
      console.log(`   Layer 3 ✅ Order Book: ${(orderBookSignal.microstructureScore || 0).toFixed(1)} microstructure, ${orderBookSignal.liquidityQuality || 'unknown'} liquidity`);
      
      // CROSS-SITE DATA ENHANCEMENT: Multi-Instance Intelligence
      console.log(`   🌐 CROSS-SITE ENHANCEMENT: Leveraging multi-instance data...`);
      const crossSiteEnhancement = await this.enhanceWithCrossSiteData(signal);
      console.log(`   🌐 Cross-Site ✅ AI Performance: ${(crossSiteEnhancement.aiPerformanceBoost || 1).toFixed(1)}x, Strategy Win Rate: ${((crossSiteEnhancement.strategyWinRate || 0.5) * 100).toFixed(1)}%`);
      
      // LAYER 4: Final Fusion Engine
      console.log(`   Layer 4 ⚡ Running Final Fusion Engine with Mathematical Intuition + Cross-Site Intelligence...`);
      const finalDecision = this.runFusionEngine(signal, sentimentSignal, orderBookSignal, crossSiteEnhancement, effectiveConfig, {
        intuitiveBoost,
        intuitiveDecision,
        intuitiveConfidence,
        agreementLevel,
        overallFeeling
      });
      
      // Cross-Layer Analysis
      const layerAgreement = this.analyzeLeyerAgreement(sentimentSignal, orderBookSignal);
      
      // Generate AI Explanation
      const decisionExplanation = this.generateDecisionExplanation(
        signal, sentimentSignal, orderBookSignal, finalDecision, layerAgreement
      );
      
      const processingTime = performance.now() - startTime;
      
      const multiLayerSignal: MultiLayerAISignal = {
        originalSignal: signal,
        
        sentimentAnalysis: {
          score: sentimentSignal.sentimentScore,
          confidence: sentimentSignal.sentimentConfidence,
          conflict: sentimentSignal.sentimentConflict,
          boost: sentimentSignal.confidenceModifier,
          sources: ['Fear&Greed', 'Reddit', 'News', 'OnChain']
        },
        
        orderBookAnalysis: {
          microstructureScore: orderBookSignal.microstructureScore,
          liquidityQuality: orderBookSignal.liquidityQuality,
          executionRisk: orderBookSignal.executionRisk,
          aiBoost: orderBookSignal.aiConfidenceBoost,
          whaleActivity: orderBookSignal.whaleActivityThreat,
          optimalOrderSize: orderBookSignal.optimalOrderSize
        },
        
        finalDecision,
        layerAgreement,
        decisionExplanation,
        
        processingTime,
        layersProcessed: 4,
        dataQuality: Math.min(100, (orderBookSignal.dataConfidence + sentimentSignal.sentimentConfidence * 100) / 2),
        timestamp: new Date(),
        version: this.AI_VERSION
      };
      
      console.log(`🎯 QUANTUM FORGE™ Multi-Layer AI Complete: ${finalDecision.action} (${(finalDecision.confidence * 100).toFixed(1)}% confidence) in ${processingTime.toFixed(0)}ms`);
      
      return multiLayerSignal;
      
    } catch (error) {
      console.error(`❌ QUANTUM FORGE™ Multi-Layer AI failed:`, error);
      throw error;
    }
  }
  
  /**
   * Final Fusion Engine - combines all layer insights
   */
  private runFusionEngine(
    originalSignal: BaseStrategySignal,
    sentimentSignal: SentimentEnhancedSignal,
    orderBookSignal: OrderBookAISignal,
    crossSiteEnhancement: any,
    config: MultiLayerConfig,
    intuitiveData?: {
      intuitiveBoost: number;
      intuitiveDecision: string;
      intuitiveConfidence: number;
      agreementLevel: number;
      overallFeeling: number;
    }
  ) {
    // Calculate weighted confidence
    const technicalConfidence = originalSignal.confidence;
    const sentimentConfidence = sentimentSignal.confidence;
    const orderBookConfidence = orderBookSignal.enhancedConfidence;
    
    const weightedConfidence = (
      technicalConfidence * config.technicalWeight +
      sentimentConfidence * config.sentimentWeight +
      orderBookConfidence * config.orderBookWeight
    );
    
    // Calculate total boost from all layers including cross-site enhancement and intuition
    const crossSiteBoost = crossSiteEnhancement.confidenceBoost || 0;
    const intuitiveBoost = intuitiveData?.intuitiveBoost || 0;
    const totalBoost = sentimentSignal.confidenceModifier + orderBookSignal.aiConfidenceBoost + crossSiteBoost + intuitiveBoost;
    
    // Apply intuitive influence on final confidence
    let enhancedConfidence = weightedConfidence + totalBoost;
    if (intuitiveData && intuitiveData.agreementLevel > 0.8) {
      // High agreement between calculation and intuition - boost confidence
      enhancedConfidence *= (1 + intuitiveData.agreementLevel * 0.1);
    } else if (intuitiveData && intuitiveData.agreementLevel < 0.3) {
      // Low agreement - reduce confidence (conflicting signals)
      enhancedConfidence *= (0.9 - (0.3 - intuitiveData.agreementLevel) * 0.2);
    }
    
    const finalConfidence = Math.min(0.95, Math.max(0.05, enhancedConfidence));
    
    // Determine final action - integrate intuitive guidance
    let finalAction: 'BUY' | 'SELL' | 'HOLD' | 'SKIP' = originalSignal.action;
    
    // Consider intuitive override if strong disagreement or high confidence
    if (intuitiveData) {
      if (intuitiveData.intuitiveConfidence > 0.8 && intuitiveData.overallFeeling > 0.7) {
        // Strong intuitive buy signal
        if (intuitiveData.intuitiveDecision === 'BUY' && finalAction !== 'BUY') {
          console.log(`🧠 INTUITIVE OVERRIDE: Strong buy feeling (${intuitiveData.overallFeeling.toFixed(3)}) overrides calculated ${finalAction}`);
          finalAction = 'BUY';
        }
      } else if (intuitiveData.intuitiveConfidence > 0.8 && intuitiveData.overallFeeling < 0.3) {
        // Strong intuitive sell/avoid signal
        if (intuitiveData.intuitiveDecision === 'SELL' || intuitiveData.intuitiveDecision === 'HOLD') {
          console.log(`🧠 INTUITIVE OVERRIDE: Strong avoid feeling (${intuitiveData.overallFeeling.toFixed(3)}) overrides calculated ${finalAction}`);
          finalAction = intuitiveData.intuitiveDecision as 'BUY' | 'SELL' | 'HOLD' | 'SKIP';
        }
      }
    }
    
    // Check for layer conflicts
    if (sentimentSignal.sentimentConflict || orderBookSignal.executionRisk === 'VERY_HIGH') {
      if (config.skipOnConflict) {
        finalAction = 'SKIP';
      }
    }
    
    // Force skip on extreme risk
    if (orderBookSignal.executionRisk === 'VERY_HIGH' && orderBookSignal.liquidityQuality === 'POOR') {
      finalAction = 'SKIP';
    }
    
    // Determine execution strategy
    let executionStrategy = 'LIMIT_TIGHT';
    if (orderBookSignal.entryStrategy) {
      executionStrategy = orderBookSignal.entryStrategy;
    } else if (config.preferLimitOrders) {
      executionStrategy = 'LIMIT_TIGHT';
    }
    
    // Position sizing based on risk and confidence
    let positionSizing = config.maxPositionSize;
    
    // Reduce size based on risks
    if (orderBookSignal.executionRisk === 'HIGH') positionSizing *= 0.7;
    if (orderBookSignal.executionRisk === 'VERY_HIGH') positionSizing *= 0.3;
    if (orderBookSignal.liquidityQuality === 'POOR') positionSizing *= 0.6;
    if (sentimentSignal.sentimentConflict) positionSizing *= 0.8;
    
    // Scale with confidence
    positionSizing *= finalConfidence;
    
    // Apply order book AI optimal sizing
    positionSizing *= orderBookSignal.optimalOrderSize;
    
    // NEW: Apply market regime position sizing (Dev1 Experimental)
    const marketScore = 75; // This will come from earlier calculation
    const baseSize = positionSizing;
    positionSizing = marketRegimeFilter.calculatePositionSize(
      baseSize,
      marketScore,
      [] // Patterns will come from earlier detection
    );
    
    // NEW: Apply trading window multiplier (Dev1 Experimental)
    const windowMultiplier = tradingWindowManager.getPositionSizeMultiplier();
    positionSizing *= windowMultiplier;
    console.log(`   📏 Position size: Base ${baseSize.toFixed(4)} → Final ${positionSizing.toFixed(4)} (window: ${windowMultiplier.toFixed(2)}x)`);
    
    // Cap position size
    positionSizing = Math.max(0.1, Math.min(config.maxPositionSize, positionSizing));
    
    return {
      action: finalAction,
      confidence: finalConfidence,
      totalBoost,
      shouldExecute: finalAction !== 'SKIP' && finalAction !== 'HOLD',
      positionSizing,
      executionStrategy,
      timeframe: orderBookSignal.preferredTimeframe || '5MIN'
    };
  }
  
  /**
   * Analyze agreement between sentiment and order book layers
   */
  private analyzeLeyerAgreement(
    sentimentSignal: SentimentEnhancedSignal,
    orderBookSignal: OrderBookAISignal
  ) {
    // Calculate alignment between sentiment and order book direction
    let alignmentScore = 0;
    
    // Sentiment direction
    const sentimentBullish = sentimentSignal.sentimentScore > 0;
    
    // Order book direction  
    const orderBookBullish = orderBookSignal.priceDirection === 'UP' || 
                            orderBookSignal.priceDirection === 'STRONG_UP';
    
    if (sentimentBullish === orderBookBullish) {
      alignmentScore = 50 + Math.min(50, Math.abs(sentimentSignal.sentimentScore * 100));
    } else {
      alignmentScore = -50 - Math.min(50, Math.abs(sentimentSignal.sentimentScore * 100));
    }
    
    // Detect significant conflicts
    const conflictDetected = Math.abs(alignmentScore) > 60 && alignmentScore < 0;
    
    // Calculate consensus strength
    const sentimentStrength = Math.abs(sentimentSignal.sentimentScore) * sentimentSignal.sentimentConfidence;
    const orderBookStrength = orderBookSignal.directionConfidence / 100;
    const consensusStrength = alignmentScore > 0 ? 
      Math.min(100, (sentimentStrength + orderBookStrength) * 50) : 
      Math.max(0, 50 - Math.abs(alignmentScore));
    
    // Determine overall risk level
    let riskLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'MEDIUM';
    
    if (conflictDetected && orderBookSignal.executionRisk === 'VERY_HIGH') {
      riskLevel = 'EXTREME';
    } else if (conflictDetected || orderBookSignal.executionRisk === 'HIGH') {
      riskLevel = 'HIGH';
    } else if (consensusStrength > 70 && orderBookSignal.executionRisk === 'LOW') {
      riskLevel = 'LOW';
    } else if (consensusStrength > 85 && orderBookSignal.executionRisk === 'VERY_LOW') {
      riskLevel = 'VERY_LOW';
    }
    
    return {
      sentimentOrderBookAlignment: alignmentScore,
      conflictDetected,
      consensusStrength,
      riskLevel
    };
  }
  
  /**
   * Generate human-readable decision explanation
   */
  private generateDecisionExplanation(
    originalSignal: BaseStrategySignal,
    sentimentSignal: SentimentEnhancedSignal,
    orderBookSignal: OrderBookAISignal,
    finalDecision: any,
    layerAgreement: any
  ) {
    const primaryFactors: string[] = [];
    const riskFactors: string[] = [];
    const opportunityFactors: string[] = [];
    
    // Primary decision factors
    primaryFactors.push(`${originalSignal.strategy} technical signal: ${originalSignal.action} at ${(originalSignal.confidence * 100).toFixed(1)}%`);
    
    if (Math.abs(sentimentSignal.sentimentScore) > 0.1) {
      const sentimentDirection = sentimentSignal.sentimentScore > 0 ? 'bullish' : 'bearish';
      primaryFactors.push(`${sentimentDirection} sentiment (${sentimentSignal.sentimentScore.toFixed(3)}) with ${(sentimentSignal.sentimentConfidence * 100).toFixed(1)}% confidence`);
    }
    
    primaryFactors.push(`Order book microstructure score: ${orderBookSignal.microstructureScore.toFixed(1)}/100`);
    primaryFactors.push(`Market liquidity: ${orderBookSignal.liquidityQuality.toLowerCase()}`);
    
    // Risk factors
    if (sentimentSignal.sentimentConflict) {
      riskFactors.push('Sentiment conflicts with technical signal');
    }
    
    if (layerAgreement.conflictDetected) {
      riskFactors.push(`Sentiment and order book analysis disagree (${layerAgreement.sentimentOrderBookAlignment.toFixed(1)}% alignment)`);
    }
    
    if (orderBookSignal.executionRisk !== 'LOW' && orderBookSignal.executionRisk !== 'VERY_LOW') {
      riskFactors.push(`${orderBookSignal.executionRisk.toLowerCase().replace('_', ' ')} execution risk`);
    }
    
    if (orderBookSignal.whaleActivityThreat > 50) {
      riskFactors.push(`High whale activity detected (${orderBookSignal.whaleActivityThreat.toFixed(0)}% threat level)`);
    }
    
    if (orderBookSignal.slippageRisk > 0.2) {
      riskFactors.push(`Elevated slippage risk (${orderBookSignal.slippageRisk.toFixed(2)}%)`);
    }
    
    // Opportunity factors
    if (layerAgreement.consensusStrength > 70) {
      opportunityFactors.push(`Strong consensus between analysis layers (${layerAgreement.consensusStrength.toFixed(0)}%)`);
    }
    
    if (orderBookSignal.liquidityQuality === 'EXCELLENT') {
      opportunityFactors.push('Excellent market liquidity for optimal execution');
    }
    
    if (Math.abs(sentimentSignal.confidenceModifier) > 0.1) {
      const boostType = sentimentSignal.confidenceModifier > 0 ? 'boost' : 'penalty';
      opportunityFactors.push(`Sentiment provides ${(Math.abs(sentimentSignal.confidenceModifier) * 100).toFixed(1)}% confidence ${boostType}`);
    }
    
    if (orderBookSignal.aiConfidenceBoost > 0.1) {
      opportunityFactors.push(`Order book AI provides ${(orderBookSignal.aiConfidenceBoost * 100).toFixed(1)}% confidence boost`);
    }
    
    // Layer contributions
    const layerContributions = {
      technical: originalSignal.confidence * 40, // Approximate contribution percentages
      sentiment: sentimentSignal.confidenceModifier * 35,
      orderBook: orderBookSignal.aiConfidenceBoost * 25
    };
    
    return {
      primaryFactors,
      riskFactors,
      opportunityFactors,
      layerContributions
    };
  }
  
  /**
   * Get system performance metrics
   */
  getSystemMetrics(): {
    version: string;
    layersActive: number;
    averageProcessingTime?: number;
    successRate?: number;
  } {
    return {
      version: this.AI_VERSION,
      layersActive: 4,
      // Could add performance tracking here
      averageProcessingTime: undefined,
      successRate: undefined
    };
  }
  
  /**
   * Calculate boost from Mathematical Intuition Engine
   */
  /**
   * Create a skip signal when trading conditions are not favorable
   */
  private createSkipSignal(signal: BaseStrategySignal, reason: string): MultiLayerAISignal {
    return {
      originalSignal: signal,
      sentimentAnalysis: {
        score: 0,
        confidence: 0,
        conflict: false,
        boost: 0,
        sources: []
      },
      orderBookAnalysis: {
        microstructureScore: 0,
        liquidityQuality: 'POOR',
        executionRisk: 'HIGH',
        aiBoost: 0,
        whaleActivity: 0,
        optimalOrderSize: 0
      },
      finalDecision: {
        action: 'SKIP',
        confidence: 0,
        totalBoost: 0,
        shouldExecute: false,
        positionSizing: 0,
        executionStrategy: 'NONE',
        timeframe: 'N/A'
      },
      layerAgreement: {
        sentimentOrderBookAlignment: 0,
        conflictDetected: false,
        consensusStrength: 0,
        riskLevel: 'HIGH'
      },
      decisionExplanation: {
        primaryFactors: [reason],
        riskFactors: ['Trading conditions unfavorable'],
        opportunityFactors: [],
        layerContributions: {
          technical: 0,
          sentiment: 0,
          orderBook: 0
        }
      },
      processingTime: 0,
      layersProcessed: 0,
      dataQuality: 0,
      timestamp: new Date(),
      version: this.version
    };
  }

  private calculateIntuitiveBoost(intuitiveConfidence: number, agreementLevel: number, overallFeeling: number): number {
    // Base boost from intuitive confidence
    let boost = (intuitiveConfidence - 0.5) * 0.1; // -0.05 to +0.05
    
    // Agreement bonus - when both approaches agree
    if (agreementLevel > 0.7) {
      boost += (agreementLevel - 0.7) * 0.15; // Up to +0.045 for perfect agreement
    }
    
    // Feeling strength bonus - strong intuitive feelings get more weight
    const feelingStrength = Math.abs(overallFeeling - 0.5) * 2; // 0 to 1
    if (feelingStrength > 0.6) {
      boost += (feelingStrength - 0.6) * 0.08; // Up to +0.032 for very strong feelings
    }
    
    // Cap the boost to reasonable limits
    return Math.max(-0.1, Math.min(0.15, boost));
  }
  
  /**
   * Cross-Site Data Enhancement - Multi-Instance Intelligence
   */
  private async enhanceWithCrossSiteData(signal: BaseStrategySignal): Promise<any> {
    try {
      // Get unified strategy performance across all sites
      const strategyPerformance = await consolidatedDataService.getUnifiedStrategyPerformance(
        signal.strategy || 'unknown',
        signal.symbol
      );
      
      // Get AI system comparison data
      const aiComparison = await consolidatedDataService.getAISystemComparison();
      
      // Get market condition insights
      const marketInsights = await consolidatedDataService.getMarketConditionInsights(signal.symbol);
      
      // Calculate performance boosts from consolidated data
      const strategyWinRate = strategyPerformance.length > 0 
        ? strategyPerformance.reduce((sum: number, perf: any) => sum + (perf.win_rate || 0), 0) / strategyPerformance.length
        : 0.5; // Default if no data
        
      const aiPerformanceBoost = aiComparison.length > 0
        ? Math.min(2.0, aiComparison.reduce((sum: number, ai: any) => sum + (ai.global_win_rate || 1.0), 0) / aiComparison.length)
        : 1.0; // Default multiplier
        
      const marketConditionMultiplier = marketInsights.length > 0 ? 1.1 : 1.0;
      
      // Calculate final confidence boost (0-20% boost potential)
      const confidenceBoost = Math.min(0.2, 
        (strategyWinRate > 0.6 ? 0.05 : 0) +
        (aiPerformanceBoost > 1.2 ? 0.05 : 0) +
        (marketConditionMultiplier > 1.0 ? 0.05 : 0) +
        (strategyPerformance.length > 10 ? 0.05 : 0) // Data volume bonus
      );
      
      return {
        strategyWinRate,
        aiPerformanceBoost,
        marketConditionMultiplier,
        confidenceBoost,
        dataVolume: strategyPerformance.length,
        crossSiteEnabled: true,
        enhancementLevel: 'MULTI_INSTANCE_INTELLIGENCE'
      };
      
    } catch (error) {
      console.log(`   🌐 Cross-Site Enhancement unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Return neutral enhancement if consolidation fails
      return {
        strategyWinRate: 0.5,
        aiPerformanceBoost: 1.0,
        marketConditionMultiplier: 1.0,
        confidenceBoost: 0,
        dataVolume: 0,
        crossSiteEnabled: false,
        enhancementLevel: 'STANDALONE'
      };
    }
  }
}

export const quantumForgeMultiLayerAI = new QuantumForgeMultiLayerAI();