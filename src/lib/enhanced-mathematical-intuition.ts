/**
 * Enhanced Mathematical Intuition Engine with Intelligent Pair Adaptation
 * 
 * Integrates learned pair characteristics with mathematical intuition
 * for commission-aware, pair-specific trading decisions
 */

import { MathematicalIntuitionEngine } from './mathematical-intuition-engine';
import { getIntelligentPairAdapter, TradingDecision } from './intelligent-pair-adapter';
import { getAvailableBalanceCalculator, AvailableBalanceResult } from './available-balance-calculator';
import { gpuService } from './gpu-acceleration-service';

export interface EnhancedIntuitiveAnalysis {
  // Original intuition data
  originalIntuition: number;
  flowField: number;
  patternResonance: number;
  
  // Enhanced with pair learning
  pairAdaptedConfidence: number;
  commissionAwareThreshold: number;
  intelligentDecision: TradingDecision;
  
  // Final recommendation
  shouldTrade: boolean;
  confidence: number;
  positionSize: number;
  reason: string;
  
  // Risk management
  takeProfit: number;
  stopLoss: number;
  expectedProfit: number;
  commissionCost: number;
  netExpectedReturn: number;
}

export interface PredictionAccuracy {
  symbol: string;
  confidence: number;
  predictedMove: number;
  actualMove?: number;
  accuracy?: number;
  timestamp: Date;
}

export class EnhancedMathematicalIntuition {
  private static instance: EnhancedMathematicalIntuition;
  private baseEngine: MathematicalIntuitionEngine;
  private pairAdapter: ReturnType<typeof getIntelligentPairAdapter>;
  private predictionHistory: Map<string, PredictionAccuracy[]> = new Map();
  
  static getInstance(): EnhancedMathematicalIntuition {
    if (!EnhancedMathematicalIntuition.instance) {
      EnhancedMathematicalIntuition.instance = new EnhancedMathematicalIntuition();
    }
    return EnhancedMathematicalIntuition.instance;
  }
  
  constructor() {
    this.baseEngine = MathematicalIntuitionEngine.getInstance();
    this.pairAdapter = getIntelligentPairAdapter();
  }

  /**
   * GPU-accelerated batch analysis for multiple symbols
   * Processes mathematical intuition across multiple symbols in parallel using GPU acceleration
   */
  async batchAnalyzeWithGPUAcceleration(
    symbolBatch: Array<{
      symbol: string;
      currentPrice: number;
      signal: any;
      marketData: any;
      positionManager: any;
    }>
  ): Promise<Array<{ symbol: string; analysis: EnhancedIntuitiveAnalysis }>> {
    console.log(`🧠 GPU MATHEMATICAL INTUITION: Batch analyzing ${symbolBatch.length} symbols`);
    
    try {
      // Check if GPU acceleration is available and beneficial (3+ symbols)
      if (symbolBatch.length >= 3 && process.env.ENABLE_GPU_STRATEGIES === 'true') {
        console.log(`🔥 Using GPU acceleration for ${symbolBatch.length} symbol batch analysis`);
        
        // Prepare batch for GPU processing
        const gpuBatch = await Promise.all(symbolBatch.map(async (item) => {
          // Get historical data for volatility calculation
          let historicalPrices: number[] = [];
          try {
            // Try to get some market history if available
            if (item.marketData && item.marketData.prices) {
              historicalPrices = item.marketData.prices.slice(-20); // Last 20 prices
            }
          } catch (error) {
            // Historical data optional, continue without it
          }
          
          return {
            symbol: item.symbol,
            currentPrice: item.currentPrice,
            signal: item.signal,
            marketData: item.marketData,
            historicalPrices,
            volume24h: item.marketData?.volume24h || 1000000
          };
        }));
        
        // Execute GPU batch processing
        const gpuResults = await gpuService.batchProcessMathematicalIntuition(gpuBatch);
        
        // Convert GPU results to full Enhanced Intuitive Analysis format
        const finalResults = await Promise.all(gpuResults.map(async (gpuResult) => {
          const originalItem = symbolBatch.find(item => item.symbol === gpuResult.symbol);
          if (!originalItem) {
            console.warn(`⚠️ GPU result for ${gpuResult.symbol} has no matching input item`);
            return null;
          }
          
          // Get available balance info
          const availableBalanceCalculator = getAvailableBalanceCalculator(originalItem.positionManager);
          const balanceInfo: AvailableBalanceResult = await availableBalanceCalculator.calculateAvailableBalance(gpuResult.symbol);
          
          // Initialize pair characteristics
          await this.initializeBasicPairCharacteristics(gpuResult.symbol, originalItem.currentPrice);
          
          // Get intelligent trading decision
          const intelligentDecision = this.pairAdapter.calculateCommissionAwareDecision(
            gpuResult.symbol,
            gpuResult.pairAdaptedConfidence + balanceInfo.confidenceThresholdAdjustment,
            gpuResult.predictedMove,
            originalItem.currentPrice,
            balanceInfo.availableBalance
          );
          
          // Get intelligent exit thresholds
          const exitThresholds = this.pairAdapter.getIntelligentExitThresholds(gpuResult.symbol);
          
          // Calculate commission costs with dynamic position sizing
          const finalPositionSize = intelligentDecision.positionSize > 0 ? intelligentDecision.positionSize :
            availableBalanceCalculator.calculateDynamicPositionSize(
              balanceInfo.availableBalance,
              gpuResult.pairAdaptedConfidence + balanceInfo.confidenceThresholdAdjustment,
              gpuResult.predictedMove,
              balanceInfo.availableBalance / Math.max(balanceInfo.totalBalance, 1),
              balanceInfo.totalBalance
            );
          
          const commissionCost = finalPositionSize * 0.0026 * 2; // Round-trip taker fee
          const expectedProfit = finalPositionSize * (Math.abs(gpuResult.predictedMove) / 100);
          const netExpectedReturn = expectedProfit - commissionCost;
          
          // Store prediction for accuracy tracking
          this.storePrediction(gpuResult.symbol, gpuResult.pairAdaptedConfidence, gpuResult.predictedMove);
          
          // Handle TENSOR_MODE vs STANDALONE_MODE decisions
          const isTensorMode = process.env.TENSOR_MODE === 'true';
          let finalShouldTrade: boolean;
          let finalReason: string;
          
          if (isTensorMode) {
            // TENSOR_MODE: Always approve - Tensor Fusion makes ALL decisions
            finalShouldTrade = true;
            finalReason = `TENSOR_MODE: Mathematical variable only - decision delegated to Tensor Fusion engine`;
          } else {
            // STANDALONE_MODE: Use GPU-calculated decision
            finalShouldTrade = gpuResult.shouldTrade;
            finalReason = finalShouldTrade 
              ? `GPU Enhanced confidence: ${gpuResult.pairAdaptedConfidence.toFixed(1)}%, predicted move: ${gpuResult.predictedMove.toFixed(3)}%`
              : `GPU Insufficient edge: confidence ${gpuResult.pairAdaptedConfidence.toFixed(1)}% or move ${Math.abs(gpuResult.predictedMove).toFixed(3)}%`;
          }
          
          const analysis: EnhancedIntuitiveAnalysis = {
            originalIntuition: gpuResult.originalIntuition,
            flowField: gpuResult.flowField,
            patternResonance: gpuResult.patternResonance,
            pairAdaptedConfidence: gpuResult.pairAdaptedConfidence,
            commissionAwareThreshold: intelligentDecision.commissionBreakeven,
            intelligentDecision,
            shouldTrade: finalShouldTrade,
            confidence: gpuResult.pairAdaptedConfidence,
            positionSize: finalPositionSize,
            reason: finalReason,
            takeProfit: exitThresholds.takeProfit,
            stopLoss: exitThresholds.stopLoss,
            expectedProfit: expectedProfit,
            commissionCost: commissionCost,
            netExpectedReturn: netExpectedReturn
          };
          
          return { symbol: gpuResult.symbol, analysis };
        }));
        
        // Filter out null results and log summary
        const validResults = finalResults.filter(result => result !== null) as Array<{ symbol: string; analysis: EnhancedIntuitiveAnalysis }>;
        const tradableCount = validResults.filter(r => r.analysis.shouldTrade).length;
        
        console.log(`🎯 GPU MATHEMATICAL INTUITION: Processed ${validResults.length} symbols, ${tradableCount} tradable opportunities found`);
        
        return validResults;
      }
    } catch (error) {
      console.warn(`⚠️ GPU batch analysis failed, falling back to sequential processing:`, error.message);
    }
    
    // Fallback to sequential processing
    console.log(`📱 Using sequential CPU processing for ${symbolBatch.length} symbols`);
    const results = [];
    
    for (const item of symbolBatch) {
      try {
        const analysis = await this.analyzeWithPairIntelligence(
          item.symbol,
          item.currentPrice,
          item.signal,
          item.marketData,
          item.positionManager
        );
        results.push({ symbol: item.symbol, analysis });
      } catch (error) {
        console.error(`❌ Sequential analysis failed for ${item.symbol}:`, error.message);
      }
    }
    
    return results;
  }

  /**
   * Enhanced analysis that combines mathematical intuition with pair intelligence
   */
  async analyzeWithPairIntelligence(
    symbol: string,
    currentPrice: number,
    signal: any,
    marketData: any,
    positionManager: any
  ): Promise<EnhancedIntuitiveAnalysis> {
    console.log(`🧠 Enhanced Mathematical Intuition analyzing ${symbol} at $${currentPrice}`);
    
    // Calculate real available balance accounting for open positions (pass symbol for caching logic)
    const availableBalanceCalculator = getAvailableBalanceCalculator(positionManager);
    const balanceInfo: AvailableBalanceResult = await availableBalanceCalculator.calculateAvailableBalance(symbol);
    
    console.log(`💰 REAL AVAILABLE BALANCE: $${balanceInfo.availableBalance.toFixed(2)} (${balanceInfo.openPositionsCount} positions, +${balanceInfo.confidenceThresholdAdjustment}% confidence requirement)`);
    
    // Initialize basic pair characteristics if they don't exist
    await this.initializeBasicPairCharacteristics(symbol, currentPrice);
    
    // Get base mathematical intuition (if available)
    let originalIntuition = 0;
    let flowField = 0;
    let patternResonance = 0;
    
    try {
      // Use existing mathematical intuition engine with correct method
      const baseAnalysis = await this.baseEngine.runParallelAnalysis(signal, marketData);
      
      if (baseAnalysis?.intuitive) {
        originalIntuition = baseAnalysis.intuitive.overallFeeling || 0.5;
        flowField = baseAnalysis.intuitive.flowField || 0.5;
        patternResonance = baseAnalysis.intuitive.patternResonance || 0.5;
      }
    } catch (error) {
      console.log(`⚠️ Base intuition unavailable for ${symbol}, using enhanced-only analysis`);
    }
    
    // Predict expected move based on signals and confidence
    const predictedMove = this.calculatePredictedMove(symbol, signal, originalIntuition, currentPrice);
    
    // Get intelligent trading decision with commission awareness
    const intelligentDecision = this.pairAdapter.calculateCommissionAwareDecision(
      symbol,
      originalIntuition * 100 + balanceInfo.confidenceThresholdAdjustment, // Add cash preservation boost
      predictedMove,
      currentPrice,
      balanceInfo.availableBalance
    );
    
    // Get intelligent exit thresholds
    const exitThresholds = this.pairAdapter.getIntelligentExitThresholds(symbol);
    
    // Calculate commission costs
    const positionValue = intelligentDecision.positionSize;
    const commissionCost = positionValue * 0.0026 * 2; // Round-trip taker fee
    
    // Calculate expected returns
    const expectedProfit = positionValue * (Math.abs(predictedMove) / 100);
    const netExpectedReturn = expectedProfit - commissionCost;
    
    // Enhanced confidence combining multiple factors
    // Use the Pine Script confidence after decimal conversion instead of intelligent adapter confidence
    // Look for converted percentage confidence in the debugging logs
    let signalConfidence = originalIntuition * 100; // Default fallback
    
    // Extract the converted confidence from our earlier conversion logic
    if (signal?.confidence) {
      let tempConfidence = signal.confidence;
      // Apply the same conversion logic we used earlier
      if (tempConfidence > 0 && tempConfidence <= 1) {
        tempConfidence *= 100; // Convert decimal to percentage
      }
      if (tempConfidence > 0) { // Changed condition: any positive confidence should be used
        signalConfidence = tempConfidence;
      }
    }
    
    console.log(`🔧 Using signal confidence: ${signalConfidence.toFixed(2)}% (vs intelligent: ${intelligentDecision.confidence.toFixed(2)}%)`);
    // Production deployment - debug logging removed
    
    const pairAdaptedConfidence = this.calculateEnhancedConfidence(
      symbol,
      originalIntuition,
      predictedMove,
      signalConfidence
    );
    
    // Store prediction for accuracy tracking
    this.storePrediction(symbol, pairAdaptedConfidence, predictedMove);
    
    // 🚀 PROACTIVE TENSOR PREDICTIONS: Leverage mathematical prediction strength
    // Enable worthwhile risk-taking when tensor mathematics shows strong signals
    let moveThreshold = 0.2; // Base 0.2% minimum move
    let confidenceThreshold = 25; // Base confidence threshold
    
    // BREAKTHROUGH: Lower thresholds for high-quality mathematical predictions
    if (pairAdaptedConfidence > 60) {
      // Strong mathematical confidence - be more aggressive
      moveThreshold *= 0.6; // Reduce to 0.12% for high-confidence predictions
      confidenceThreshold = 20; // Lower confidence requirement
    } else if (pairAdaptedConfidence > 45) {
      // Moderate confidence - somewhat more aggressive
      moveThreshold *= 0.8; // Reduce to 0.16% for moderate-confidence predictions
      confidenceThreshold = 22;
    }
    
    // 🚨 CRITICAL FIX: In TENSOR_MODE, Enhanced Mathematical Intuition is a MATHEMATICAL VARIABLE only, NOT a decision maker
    const isTensorMode = process.env.TENSOR_MODE === 'true';
    
    let correctedShouldTrade: boolean;
    let correctedReason: string;
    
    if (isTensorMode) {
      // TENSOR_MODE: Always approve - Tensor Fusion makes ALL decisions
      correctedShouldTrade = true;
      correctedReason = `TENSOR_MODE: Mathematical variable only - decision delegated to Tensor Fusion engine`;
      console.log(`🧠 V₂ Mathematical Intuition: Providing tensor variable (conf: ${pairAdaptedConfidence.toFixed(1)}%, move: ${predictedMove.toFixed(3)}%) - Tensor Fusion decides`);
    } else {
      // STANDALONE_MODE: Make independent decisions as before
      correctedShouldTrade = pairAdaptedConfidence > confidenceThreshold && Math.abs(predictedMove) >= moveThreshold;
      correctedReason = correctedShouldTrade 
        ? `Enhanced confidence: ${pairAdaptedConfidence.toFixed(1)}%, predicted move: ${predictedMove.toFixed(3)}%`
        : `Insufficient edge: confidence ${pairAdaptedConfidence.toFixed(1)}% or move ${Math.abs(predictedMove).toFixed(3)}% < required ${moveThreshold.toFixed(1)}%`;
      console.log(`🔧 Trade decision: ${correctedShouldTrade ? 'TRADE' : 'SKIP'} - ${correctedReason}`);
    }
    
    // Calculate dynamic position size using available balance calculator
    let finalPositionSize = intelligentDecision.positionSize;
    if (correctedShouldTrade && finalPositionSize === 0) {
      // Use dynamic position sizing based on available cash and cash preservation
      const cashRatio = balanceInfo.availableBalance / Math.max(balanceInfo.totalBalance, 1);
      finalPositionSize = availableBalanceCalculator.calculateDynamicPositionSize(
        balanceInfo.availableBalance,
        pairAdaptedConfidence + balanceInfo.confidenceThresholdAdjustment,
        predictedMove,
        cashRatio,
        balanceInfo.totalBalance
      );
      
      console.log(`💰 Dynamic position size calculated: $${finalPositionSize.toFixed(2)} (available: $${balanceInfo.availableBalance.toFixed(2)}, cash ratio: ${(cashRatio * 100).toFixed(1)}%)`);
    }
    
    // Recalculate commission costs with the final position size
    const finalCommissionCost = finalPositionSize * 0.0026 * 2; // Round-trip taker fee
    const finalExpectedProfit = finalPositionSize * (Math.abs(predictedMove) / 100);
    const finalNetExpectedReturn = finalExpectedProfit - finalCommissionCost;
    
    const analysis: EnhancedIntuitiveAnalysis = {
      originalIntuition,
      flowField,
      patternResonance,
      pairAdaptedConfidence,
      commissionAwareThreshold: intelligentDecision.commissionBreakeven,
      intelligentDecision,
      shouldTrade: correctedShouldTrade,
      confidence: pairAdaptedConfidence,
      positionSize: finalPositionSize,
      reason: correctedReason,
      takeProfit: exitThresholds.takeProfit,
      stopLoss: exitThresholds.stopLoss,
      expectedProfit: finalExpectedProfit,
      commissionCost: finalCommissionCost,
      netExpectedReturn: finalNetExpectedReturn
    };
    
    console.log(`🎯 ${symbol} Enhanced Analysis: ${analysis.shouldTrade ? '✅ TRADE' : '❌ SKIP'} - Confidence: ${pairAdaptedConfidence.toFixed(1)}%, Net Expected: ${netExpectedReturn > 0 ? '+' : ''}$${netExpectedReturn.toFixed(4)}`);
    
    return analysis;
  }

  /**
   * Calculate predicted move based on various signal strengths
   */
  private calculatePredictedMove(symbol: string, signal: any, intuition: number, currentPrice?: number): number {
    // Debug: Log signal structure
    console.log(`🔍 Signal structure for ${symbol}:`, JSON.stringify(signal, null, 2));
    
    // Base prediction from signal strength
    let predictedMove = 0;
    
    // Handle multiple signal formats
    let signalConfidence = 0;
    let signalAction = 'HOLD';
    
    // Try different confidence extraction methods
    if (typeof signal === 'object' && signal !== null) {
      // Method 1: Direct confidence property
      if (signal.confidence) {
        signalConfidence = signal.confidence;
        signalAction = signal.action || signal.recommendation || 'HOLD';
      }
      // Method 2: Pine script signal format
      else if (signal.signal && signal.signal.confidence) {
        signalConfidence = signal.signal.confidence;
        signalAction = signal.signal.action || signal.signal.recommendation || 'HOLD';
      }
      // Method 3: Nested signal format
      else if (signal.finalDecision) {
        signalConfidence = signal.confidence || signal.finalDecision.confidence || 0;
        signalAction = signal.action || signal.finalDecision.action || 'HOLD';
      }
      // Method 4: Look for any confidence-like properties
      else {
        const confidenceKeys = Object.keys(signal).filter(key => 
          key.toLowerCase().includes('confidence') || 
          key.toLowerCase().includes('strength')
        );
        if (confidenceKeys.length > 0) {
          signalConfidence = signal[confidenceKeys[0]];
        }
        
        const actionKeys = Object.keys(signal).filter(key => 
          key.toLowerCase().includes('action') || 
          key.toLowerCase().includes('recommendation')
        );
        if (actionKeys.length > 0) {
          signalAction = signal[actionKeys[0]];
        }
      }
    }
    
    // Auto-detect if confidence is in decimal (0-1) or percentage (0-100) format
    if (signalConfidence > 0 && signalConfidence <= 1) {
      // Convert decimal format (0.8531) to percentage (85.31%)
      signalConfidence *= 100;
      console.log(`🔄 Converted decimal confidence to percentage: ${signalConfidence}% for ${symbol}`);
    }
    
    // If we still don't have confidence, use a reasonable default based on intuition
    if (signalConfidence <= 0 && intuition > 0) {
      signalConfidence = intuition * 80; // Convert 0-1 to 0-80%
      console.log(`📊 Using intuition-based confidence: ${signalConfidence}% for ${symbol}`);
    }
    
    if (signalConfidence > 0) {
      // Scale prediction based on signal confidence and type
      const baseMove = (signalConfidence / 100) * 3; // Up to 3% for 100% confidence (more aggressive)
      
      // Direction based on signal
      let direction = signalAction === 'BUY' ? 1 : signalAction === 'SELL' ? -1 : 0;
      
      // Special handling for HOLD signals with decent confidence
      // Convert HOLD to a small directional move based on confidence
      if (direction === 0 && signalConfidence >= 35) {
        // Use intuition to suggest direction for confident HOLD signals
        direction = intuition >= 0.5 ? 1 : -1; // Bullish or bearish lean
        console.log(`🔄 Converting HOLD with ${signalConfidence}% confidence to ${direction > 0 ? 'BUY' : 'SELL'} lean (intuition: ${(intuition*100).toFixed(1)}%)`);
      }
      
      predictedMove = baseMove * direction;
      
      console.log(`📈 ${symbol} predicted move calculation: confidence=${signalConfidence}%, action=${signalAction}, baseMove=${baseMove.toFixed(3)}%, predicted=${predictedMove.toFixed(3)}%`);
    } else {
      console.log(`⚠️ No confidence found in signal for ${symbol}, using minimal move`);
      predictedMove = 0.001; // Minimal move as fallback
    }
    
    // Enhance with intuition
    if (intuition > 0.7) {
      predictedMove *= 1.5; // Boost for high intuition
      console.log(`🧠 High intuition boost: ${predictedMove.toFixed(3)}%`);
    } else if (intuition < 0.3) {
      predictedMove *= 0.7; // Reduce for low intuition
      console.log(`🧠 Low intuition reduction: ${predictedMove.toFixed(3)}%`);
    }
    
    // Apply pair-specific volatility adjustment
    const pairParams = this.pairAdapter.getPairParameters(symbol);
    const volatilityAdjustment = Math.max(0.5, Math.min(2.0, pairParams.riskReward / 2));
    predictedMove *= volatilityAdjustment;
    
    console.log(`🎯 Final predicted move for ${symbol}: ${predictedMove.toFixed(3)}% (volatility adj: ${volatilityAdjustment.toFixed(2)}x)`);
    
    return predictedMove;
  }

  /**
   * Calculate enhanced confidence combining multiple intelligence layers
   */
  private calculateEnhancedConfidence(
    symbol: string,
    baseIntuition: number,
    predictedMove: number,
    intelligentConfidence: number
  ): number {
    // Start with intelligent confidence (already commission-aware)
    let enhancedConfidence = intelligentConfidence;
    
    // Boost based on prediction accuracy history
    const accuracy = this.getPredictionAccuracy(symbol);
    if (accuracy > 0.7) {
      enhancedConfidence *= 1.2;
      console.log(`🎯 ${symbol}: High accuracy history (${(accuracy*100).toFixed(1)}%) - boosting confidence`);
    } else if (accuracy < 0.4) {
      enhancedConfidence *= 0.8;
      console.log(`⚠️ ${symbol}: Low accuracy history (${(accuracy*100).toFixed(1)}%) - reducing confidence`);
    }
    
    // Alignment bonus - when multiple indicators agree
    const alignmentScore = this.calculateAlignmentScore(baseIntuition, predictedMove, intelligentConfidence);
    enhancedConfidence *= alignmentScore;
    
    // Cap confidence at reasonable levels
    return Math.max(0, Math.min(95, enhancedConfidence));
  }

  /**
   * Calculate alignment between different prediction methods
   */
  private calculateAlignmentScore(intuition: number, predictedMove: number, intelligentConf: number): number {
    // All methods pointing in same direction?
    const intuitionBullish = intuition > 0.6;
    const moveBullish = predictedMove > 0;
    const confidentEnough = intelligentConf > 60;
    
    let alignment = 1.0;
    
    // Bonus for agreement
    if ((intuitionBullish && moveBullish) || (!intuitionBullish && !moveBullish)) {
      alignment *= 1.1;
    }
    
    // Bonus for high confidence in all systems
    if (intuition > 0.7 && Math.abs(predictedMove) > 1.5 && intelligentConf > 70) {
      alignment *= 1.15;
      console.log(`🔥 Strong alignment across all prediction systems`);
    }
    
    return alignment;
  }

  /**
   * Store prediction for accuracy tracking
   */
  private storePrediction(symbol: string, confidence: number, predictedMove: number): void {
    if (!this.predictionHistory.has(symbol)) {
      this.predictionHistory.set(symbol, []);
    }
    
    const history = this.predictionHistory.get(symbol)!;
    history.push({
      symbol,
      confidence,
      predictedMove,
      timestamp: new Date()
    });
    
    // Keep only last 50 predictions per pair
    if (history.length > 50) {
      history.shift();
    }
  }

  /**
   * Get prediction accuracy for a symbol
   */
  private getPredictionAccuracy(symbol: string): number {
    const history = this.predictionHistory.get(symbol);
    if (!history || history.length < 5) return 0.5; // Neutral if insufficient data
    
    const completed = history.filter(p => p.accuracy !== undefined);
    if (completed.length === 0) return 0.5;
    
    const avgAccuracy = completed.reduce((sum, p) => sum + (p.accuracy || 0), 0) / completed.length;
    return avgAccuracy;
  }

  /**
   * Update prediction accuracy when trade completes
   */
  async updatePredictionAccuracy(
    symbol: string, 
    entryTime: Date, 
    entryPrice: number,
    exitPrice: number,
    success: boolean
  ): Promise<void> {
    const history = this.predictionHistory.get(symbol);
    if (!history) return;
    
    // Find the prediction closest to entry time
    const timeDiffs = history.map(p => Math.abs(p.timestamp.getTime() - entryTime.getTime()));
    const closestIndex = timeDiffs.indexOf(Math.min(...timeDiffs));
    const prediction = history[closestIndex];
    
    if (prediction && !prediction.accuracy) {
      const actualMove = (exitPrice - entryPrice) / entryPrice * 100;
      prediction.actualMove = actualMove;
      
      // Calculate accuracy based on direction and magnitude
      const directionCorrect = (prediction.predictedMove > 0) === (actualMove > 0);
      const magnitudeAccuracy = 1 - Math.abs(prediction.predictedMove - actualMove) / Math.abs(prediction.predictedMove);
      
      prediction.accuracy = directionCorrect ? Math.max(0.5, magnitudeAccuracy) : Math.min(0.5, magnitudeAccuracy);
      
      console.log(`📊 ${symbol} prediction accuracy: ${(prediction.accuracy * 100).toFixed(1)}% (predicted: ${prediction.predictedMove.toFixed(3)}%, actual: ${actualMove.toFixed(3)}%)`);
      
      // Update pair learning
      this.pairAdapter.updatePairLearning(symbol, entryPrice, exitPrice, actualMove, success);
    }
  }

  /**
   * Get comprehensive analysis summary for logging/debugging
   */
  getAnalysisSummary(analysis: EnhancedIntuitiveAnalysis): string {
    const profit = analysis.netExpectedReturn > 0 ? '+' : '';
    return [
      `Confidence: ${analysis.confidence.toFixed(1)}%`,
      `Expected: ${profit}$${analysis.netExpectedReturn.toFixed(4)}`,
      `Commission: $${analysis.commissionCost.toFixed(4)}`,
      `Size: $${analysis.positionSize.toFixed(2)}`,
      `TP: ${analysis.takeProfit.toFixed(2)}% SL: ${analysis.stopLoss.toFixed(2)}%`,
      `Reason: ${analysis.reason}`
    ].join(' | ');
  }

  /**
   * Initialize basic pair characteristics for new trading pairs
   */
  private async initializeBasicPairCharacteristics(symbol: string, currentPrice: number): Promise<void> {
    try {
      // Check if characteristics already exist
      const existingChars = this.pairAdapter.getAllCharacteristics();
      if (existingChars.has(symbol)) {
        return; // Already initialized
      }

      // Create realistic default characteristics based on price range and symbol
      const isStablecoin = symbol.includes('USDT') || symbol.includes('USDC');
      const isBTC = symbol.includes('BTC');
      const isETH = symbol.includes('ETH');
      const isLowPrice = currentPrice < 1;
      const isMidPrice = currentPrice >= 1 && currentPrice < 100;
      
      // Realistic volatility based on asset type
      let volatility = 3.0; // Default 3% daily volatility
      if (isStablecoin) volatility = 0.1; // Very low volatility
      else if (isBTC) volatility = 4.0; // BTC typical volatility
      else if (isETH) volatility = 5.0; // ETH higher volatility
      else if (isLowPrice) volatility = 8.0; // Small cap higher volatility

      // Realistic profit/loss expectations
      const avgProfitableMove = volatility * 0.6; // 60% of volatility as typical profit
      const avgLossMove = volatility * 0.4; // 40% of volatility as typical loss
      const baseWinRate = 0.55; // Slight edge for good strategies

      // Create synthetic historical trades to seed the system
      const syntheticTrades = this.generateSyntheticTradeHistory(currentPrice, volatility, 20);

      // Initialize with synthetic data
      await this.pairAdapter.learnPairCharacteristics(
        symbol,
        syntheticTrades,
        currentPrice,
        1000000 // Default volume
      );

      console.log(`🔧 Initialized basic characteristics for ${symbol}: ${volatility.toFixed(1)}% volatility, ${baseWinRate * 100}% base win rate`);
    } catch (error) {
      console.error(`Failed to initialize pair characteristics for ${symbol}:`, error);
    }
  }

  /**
   * Generate realistic synthetic trade history for new pairs
   */
  private generateSyntheticTradeHistory(
    currentPrice: number, 
    volatility: number, 
    tradeCount: number
  ): Array<{
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    duration: number;
    success: boolean;
  }> {
    const trades = [];
    const avgMove = volatility / 100 * currentPrice;

    for (let i = 0; i < tradeCount; i++) {
      // Random entry price around current price
      const priceVariation = (Math.random() - 0.5) * 0.2; // ±10% variation
      const entryPrice = currentPrice * (1 + priceVariation);

      // Simulate win/loss with 55% win rate
      const isWin = Math.random() < 0.55;
      
      // Realistic price movement
      const movePercent = isWin ? 
        (Math.random() * volatility * 0.8) + (volatility * 0.2) : // 20-100% of volatility for wins
        -(Math.random() * volatility * 0.6) - (volatility * 0.1); // 10-70% of volatility for losses

      const exitPrice = entryPrice * (1 + movePercent / 100);
      const pnl = (exitPrice - entryPrice) / entryPrice * 100; // Percentage P&L
      
      trades.push({
        entryPrice,
        exitPrice,
        pnl: Math.abs(pnl), // Store absolute value as expected by interface
        duration: Math.random() * 240 + 10, // 10-250 minutes
        success: isWin
      });
    }

    return trades;
  }

  /**
   * Learn from historical trades to improve future predictions
   */
  async learnFromHistoricalTrades(symbol: string): Promise<void> {
    try {
      // This would fetch from database in real implementation
      // For now, we'll use the pair adapter's learning mechanism
      console.log(`🎓 Learning historical patterns for ${symbol}...`);
      
      // The learning happens automatically through updatePredictionAccuracy calls
      // and the pair adapter's updatePairLearning method
    } catch (error) {
      console.error(`Failed to learn from historical trades for ${symbol}:`, error);
    }
  }

  /**
   * 🧠 DYNAMIC EXIT INTELLIGENCE
   * Scales exit thresholds based on confidence, expected move, and time
   */
  public shouldExitDynamically(
    position: any, 
    currentPnL: number, 
    probabilityOfProfit: number, 
    positionAge: number,
    originalConfidence: number,
    predictedMove: number
  ): boolean {
    // 🎯 Dynamic Bayesian threshold based on confidence
    let bayesianThreshold = 0.4; // Base threshold
    
    // High confidence trades get more patience (lower threshold = harder to exit)
    if (originalConfidence >= 0.90) {
      bayesianThreshold = 0.15; // Very patient - let 90%+ confidence trades develop
    } else if (originalConfidence >= 0.85) {
      bayesianThreshold = 0.25; // Patient - let 85%+ confidence trades develop  
    } else if (originalConfidence >= 0.70) {
      bayesianThreshold = 0.35; // Moderate patience
    }

    // ⏱️ Time-based intelligence - Give trades at least 30 seconds to develop
    const minHoldTime = 30000; // 30 seconds
    if (positionAge < minHoldTime && currentPnL > -0.5) {
      return false; // Don't exit too early unless losing badly
    }

    // 📈 Expected move targeting - Don't exit until closer to target
    const moveProgress = Math.abs(currentPnL) / Math.abs(predictedMove);
    
    // If we predicted a 2% move and we're only at 0.1%, be more patient
    if (predictedMove !== 0 && moveProgress < 0.2 && currentPnL > 0) {
      // We've achieved <20% of predicted move, but we're profitable
      // Increase threshold to be more patient
      bayesianThreshold *= 0.7;
    }

    // 💰 Profit scaling - Don't exit tiny profits on high-confidence trades
    if (currentPnL > 0 && currentPnL < 0.5 && originalConfidence >= 0.85) {
      // High confidence trade with tiny profit - be very patient
      bayesianThreshold = Math.min(bayesianThreshold, 0.2);
    }

    return probabilityOfProfit < bayesianThreshold;
  }

  /**
   * Get detailed exit information for logging
   */
  public getDynamicExitInfo(
    position: any,
    currentPnL: number,
    probabilityOfProfit: number,
    positionAge: number,
    originalConfidence: number,
    predictedMove: number
  ): { reason: string; logMessage: string } {
    const moveProgress = predictedMove !== 0 ? Math.abs(currentPnL) / Math.abs(predictedMove) : 0;
    const ageInSeconds = Math.round(positionAge / 1000);
    
    return {
      reason: `dynamic_exit_${currentPnL.toFixed(1)}pct`,
      logMessage: `DYNAMIC EXIT: Taking ${currentPnL.toFixed(2)}% | Confidence: ${(originalConfidence * 100).toFixed(1)}% | Age: ${ageInSeconds}s | Move Progress: ${(moveProgress * 100).toFixed(0)}% | Bayesian: ${(probabilityOfProfit * 100).toFixed(1)}%`
    };
  }

  /**
   * 🏃‍♂️ TRAILING STOP SYSTEM for High-Confidence Trades
   * Dynamically adjusts stop loss to lock in profits as price moves favorably
   */
  private trailingStops = new Map<string, {
    initialStopLoss: number;
    currentStopLoss: number;
    highWaterMark: number; // Best P&L achieved
    trailingDistance: number; // % to trail behind
    lastUpdate: number;
  }>();

  public initializeTrailingStop(
    positionId: string,
    initialPrice: number,
    side: 'LONG' | 'SHORT',
    originalConfidence: number,
    predictedMove: number
  ): void {
    // Only use trailing stops for high-confidence trades (85%+)
    if (originalConfidence < 0.85) {
      return;
    }

    // Calculate initial stop loss (1.5% default)
    const initialStopLossPercent = 1.5;
    let initialStopLoss: number;
    
    if (side === 'LONG') {
      initialStopLoss = initialPrice * (1 - initialStopLossPercent / 100);
    } else {
      initialStopLoss = initialPrice * (1 + initialStopLossPercent / 100);
    }

    // Trailing distance based on confidence and predicted move
    let trailingDistance = 0.5; // Base 0.5% trailing distance
    
    if (originalConfidence >= 0.95) {
      trailingDistance = 0.3; // Tighter trailing for ultra-high confidence
    } else if (originalConfidence >= 0.90) {
      trailingDistance = 0.4; // Medium trailing for very high confidence
    }

    // Adjust trailing distance based on predicted move size
    if (Math.abs(predictedMove) > 2.0) {
      trailingDistance *= 1.2; // Give more room for large predicted moves
    }

    this.trailingStops.set(positionId, {
      initialStopLoss,
      currentStopLoss: initialStopLoss,
      highWaterMark: 0,
      trailingDistance,
      lastUpdate: Date.now()
    });

    console.log(`🏃‍♂️ TRAILING STOP INITIALIZED: ${positionId} | ${side} | Confidence: ${(originalConfidence * 100).toFixed(1)}% | Trailing: ${trailingDistance}%`);
  }

  public updateTrailingStop(
    positionId: string,
    currentPrice: number,
    currentPnL: number,
    side: 'LONG' | 'SHORT'
  ): { shouldExit: boolean; reason: string; newStopLoss?: number } {
    const trailingStop = this.trailingStops.get(positionId);
    if (!trailingStop) {
      return { shouldExit: false, reason: 'no_trailing_stop' };
    }

    // Update high water mark (best P&L achieved)
    if (currentPnL > trailingStop.highWaterMark) {
      trailingStop.highWaterMark = currentPnL;
      
      // Only move trailing stop in profitable direction
      if (currentPnL > 0.5) { // Only start trailing after 0.5% profit
        const trailingPercent = trailingStop.trailingDistance;
        
        if (side === 'LONG') {
          // For long positions, move stop loss up as price rises
          const newStopLoss = currentPrice * (1 - trailingPercent / 100);
          if (newStopLoss > trailingStop.currentStopLoss) {
            trailingStop.currentStopLoss = newStopLoss;
            trailingStop.lastUpdate = Date.now();
            console.log(`🏃‍♂️ TRAILING STOP UPDATED: ${positionId} | New Stop: $${newStopLoss.toFixed(2)} | High Water: ${trailingStop.highWaterMark.toFixed(2)}%`);
          }
        } else {
          // For short positions, move stop loss down as price falls
          const newStopLoss = currentPrice * (1 + trailingPercent / 100);
          if (newStopLoss < trailingStop.currentStopLoss) {
            trailingStop.currentStopLoss = newStopLoss;
            trailingStop.lastUpdate = Date.now();
            console.log(`🏃‍♂️ TRAILING STOP UPDATED: ${positionId} | New Stop: $${newStopLoss.toFixed(2)} | High Water: ${trailingStop.highWaterMark.toFixed(2)}%`);
          }
        }
      }
    }

    // Check if current price has hit the trailing stop
    let shouldExit = false;
    let reason = 'trailing_stop';

    if (side === 'LONG' && currentPrice <= trailingStop.currentStopLoss) {
      shouldExit = true;
      reason = `trailing_stop_hit_${currentPnL.toFixed(1)}pct`;
    } else if (side === 'SHORT' && currentPrice >= trailingStop.currentStopLoss) {
      shouldExit = true;
      reason = `trailing_stop_hit_${currentPnL.toFixed(1)}pct`;
    }

    return { 
      shouldExit, 
      reason, 
      newStopLoss: shouldExit ? trailingStop.currentStopLoss : undefined 
    };
  }

  public removeTrailingStop(positionId: string): void {
    this.trailingStops.delete(positionId);
  }

  public hasTrailingStop(positionId: string): boolean {
    return this.trailingStops.has(positionId);
  }

  /**
   * Enhanced dynamic exit that includes trailing stops
   */
  public shouldExitDynamicallyWithTrailing(
    position: any,
    currentPrice: number,
    currentPnL: number,
    probabilityOfProfit: number,
    positionAge: number,
    originalConfidence: number,
    predictedMove: number,
    side: 'LONG' | 'SHORT'
  ): { shouldExit: boolean; reason: string; exitType: 'dynamic' | 'trailing' } {
    const positionId = position.id || position.identifier || 'unknown';

    // First check trailing stops for high-confidence trades
    if (this.hasTrailingStop(positionId)) {
      const trailingResult = this.updateTrailingStop(positionId, currentPrice, currentPnL, side);
      if (trailingResult.shouldExit) {
        this.removeTrailingStop(positionId);
        return { 
          shouldExit: true, 
          reason: trailingResult.reason, 
          exitType: 'trailing' 
        };
      }
    } else if (originalConfidence >= 0.85 && positionAge > 5000) {
      // Initialize trailing stop for high-confidence trades after 5 seconds
      this.initializeTrailingStop(positionId, currentPrice / (1 + currentPnL / 100), side, originalConfidence, predictedMove);
    }

    // Fallback to regular dynamic exit logic
    const shouldExitDynamic = this.shouldExitDynamically(
      position, currentPnL, probabilityOfProfit, positionAge, originalConfidence, predictedMove
    );

    if (shouldExitDynamic) {
      // Clean up trailing stop since we're exiting
      this.removeTrailingStop(positionId);
      return { 
        shouldExit: true, 
        reason: this.getDynamicExitInfo(position, currentPnL, probabilityOfProfit, positionAge, originalConfidence, predictedMove).reason, 
        exitType: 'dynamic' 
      };
    }

    return { shouldExit: false, reason: 'holding', exitType: 'dynamic' };
  }
}

// Export singleton instance
export const enhancedMathematicalIntuition = EnhancedMathematicalIntuition.getInstance();