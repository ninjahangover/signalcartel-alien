/**
 * Enhanced Mathematical Intuition Engine with Intelligent Pair Adaptation
 * 
 * Integrates learned pair characteristics with mathematical intuition
 * for commission-aware, pair-specific trading decisions
 */

import { MathematicalIntuitionEngine } from './mathematical-intuition-engine';
import { getIntelligentPairAdapter, TradingDecision } from './intelligent-pair-adapter';

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
   * Enhanced analysis that combines mathematical intuition with pair intelligence
   */
  async analyzeWithPairIntelligence(
    symbol: string,
    currentPrice: number,
    signal: any,
    marketData: any,
    accountBalance: number
  ): Promise<EnhancedIntuitiveAnalysis> {
    console.log(`🧠 Enhanced Mathematical Intuition analyzing ${symbol} at $${currentPrice}`);
    
    // Initialize basic pair characteristics if they don't exist
    await this.initializeBasicPairCharacteristics(symbol, currentPrice);
    
    // Get base mathematical intuition (if available)
    let originalIntuition = 0;
    let flowField = 0;
    let patternResonance = 0;
    
    try {
      // Use existing mathematical intuition engine
      const baseAnalysis = await this.baseEngine.analyzeParallel(symbol, {
        signal,
        marketData,
        crossSiteData: marketData.sentiment || {},
        flowField: marketData.flowField || 0.5,
        additionalContext: { currentPrice }
      });
      
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
      originalIntuition * 100, // Convert to percentage
      predictedMove,
      currentPrice,
      accountBalance
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
    
    // Recalculate shouldTrade based on corrected confidence and move
    const correctedShouldTrade = pairAdaptedConfidence > 0 && Math.abs(predictedMove) >= 0.780; // Commission threshold
    const correctedReason = correctedShouldTrade 
      ? `Enhanced confidence: ${pairAdaptedConfidence.toFixed(1)}%, predicted move: ${predictedMove.toFixed(3)}%`
      : `Insufficient edge: confidence ${pairAdaptedConfidence.toFixed(1)}% or move ${Math.abs(predictedMove).toFixed(3)}% < required 0.780%`;
    
    console.log(`🔧 Trade decision: ${correctedShouldTrade ? 'TRADE' : 'SKIP'} - ${correctedReason}`);
    
    const analysis: EnhancedIntuitiveAnalysis = {
      originalIntuition,
      flowField,
      patternResonance,
      pairAdaptedConfidence,
      commissionAwareThreshold: intelligentDecision.commissionBreakeven,
      intelligentDecision,
      shouldTrade: correctedShouldTrade,
      confidence: pairAdaptedConfidence,
      positionSize: intelligentDecision.positionSize,
      reason: correctedReason,
      takeProfit: exitThresholds.takeProfit,
      stopLoss: exitThresholds.stopLoss,
      expectedProfit,
      commissionCost,
      netExpectedReturn
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
}

// Export singleton instance
export const enhancedMathematicalIntuition = EnhancedMathematicalIntuition.getInstance();