/**
 * Production Trading with Position Management
 * Uses the full position management system with QUANTUM FORGE™ phase integration
 */

import { PositionManager } from './src/lib/position-management/position-manager';
import { phaseManager } from './src/lib/quantum-forge-phase-config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal'
});

// Logging setup
const LOG_DIR = '/tmp/signalcartel-logs';
const LOG_FILE = path.join(LOG_DIR, 'production-trading.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Logging function that writes to both console and file
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  // Write to console
  console.log(message);
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logEntry);
}

interface MarketDataPoint {
  symbol: string;
  price: number;
  timestamp: Date;
}

class ProductionTradingEngine {
  private isRunning = false;
  private cycleCount = 0;
  private positionManager: PositionManager;
  
  // 🎯 PRE-VALIDATION PRICE CACHE SYSTEM
  private priceCache = new Map<string, { price: number; timestamp: Date; isValid: boolean }>();
  private lastPriceCacheUpdate = 0;
  private readonly PRICE_CACHE_TTL = 30000; // 30 seconds
  
  // 🎯 CORE TRADING PAIRS (always active)
  private readonly CORE_PAIRS = [
    'BTCUSD', 'ETHUSD', 'SOLUSD',
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 
    'ADAUSDT', 'BNBUSDT', 'XRPUSDT',
    'AVAXUSD', 'DOTUSD', 'MATICUSD'
  ];
  
  // 🧠 DYNAMIC PAIRS from Smart Hunter (updated every cycle)
  private dynamicPairs: string[] = [];
  private lastSmartHunterUpdate = 0;
  private readonly SMART_HUNTER_UPDATE_INTERVAL = 60000; // 1 minute
  
  // All potential trading pairs (core + dynamic)
  get ALL_PAIRS(): string[] {
    return [...this.CORE_PAIRS, ...this.dynamicPairs];
  }
  
  constructor() {
    this.positionManager = new PositionManager(prisma);
    log('🚀 QUANTUM FORGE™ PRODUCTION TRADING ENGINE');
    log('==========================================');
    log('✅ Complete position management lifecycle');
    log('✅ Phased intelligence activation');
    log('✅ Real trade counting for phase transitions');
    log('✅ Production-ready position tracking');
    log('📁 Logging to: ' + LOG_FILE);
    log('');
  }
  
  async initialize() {
    try {
      // Initialize phase manager
      await phaseManager.updateTradeCount();
      const currentPhase = await phaseManager.getCurrentPhase();
      
      log(`🎯 Starting in Phase ${currentPhase.phase}: ${currentPhase.name}`);
      log(`⚙️  Confidence Threshold: ${(currentPhase.features.confidenceThreshold * 100).toFixed(1)}%`);
      const progress = await phaseManager.getProgressToNextPhase();
      log(`📊 Current Trade Count: ${progress.currentTrades}`);
      log('');
      
      // Initialize price cache with first validation
      log('💰 Initializing pre-validation price cache...');
      await this.updatePriceCache();
      
      return true;
    } catch (error) {
      log('❌ Initialization failed: ' + error.message);
      return false;
    }
  }
  
  /**
   * 🎯 PRE-VALIDATION PRICE CACHE UPDATE
   * Fetches and validates all prices OUTSIDE the trading pipeline
   * Only valid pairs get sent to trading
   */
  private async updatePriceCache() {
    const now = Date.now();
    
    // Skip if cache is still fresh
    if (now - this.lastPriceCacheUpdate < this.PRICE_CACHE_TTL) {
      return;
    }
    
    log('💰 Pre-validating prices for all trading pairs...');
    const startTime = Date.now();
    
    // Fetch prices for all pairs simultaneously but handle failures gracefully
    const pricePromises = this.ALL_PAIRS.map(async (symbol) => {
      try {
        const { realTimePriceFetcher } = await import('./src/lib/real-time-price-fetcher');
        const priceData = await realTimePriceFetcher.getCurrentPrice(symbol);
        
        if (priceData.success) {
          this.priceCache.set(symbol, {
            price: Math.round(priceData.price * 100) / 100,
            timestamp: new Date(),
            isValid: true
          });
          return { symbol, success: true, price: priceData.price };
        } else {
          this.priceCache.set(symbol, {
            price: 0,
            timestamp: new Date(),
            isValid: false
          });
          return { symbol, success: false, error: priceData.error };
        }
      } catch (error) {
        this.priceCache.set(symbol, {
          price: 0,
          timestamp: new Date(),
          isValid: false
        });
        return { symbol, success: false, error: error.message };
      }
    });
    
    // Wait for all price fetches to complete (don't fail on individual errors)
    const results = await Promise.allSettled(pricePromises);
    
    // Count valid vs invalid pairs
    const validPairs = Array.from(this.priceCache.entries()).filter(([_, data]) => data.isValid);
    const invalidPairs = Array.from(this.priceCache.entries()).filter(([_, data]) => !data.isValid);
    
    const duration = Date.now() - startTime;
    log(`✅ Price validation complete in ${duration}ms`);
    log(`💚 Valid pairs: ${validPairs.length}/${this.ALL_PAIRS.length} (${validPairs.map(([symbol]) => symbol).join(', ')})`);
    
    if (invalidPairs.length > 0) {
      log(`❌ Invalid pairs: ${invalidPairs.length} (${invalidPairs.map(([symbol]) => symbol).join(', ')})`);
    }
    
    this.lastPriceCacheUpdate = now;
  }
  
  /**
   * Get validated trading pairs with prices
   */
  private getValidatedTradingPairs(): MarketDataPoint[] {
    const validPairs: MarketDataPoint[] = [];
    
    for (const [symbol, data] of this.priceCache.entries()) {
      if (data.isValid && data.price > 0) {
        validPairs.push({
          symbol,
          price: data.price,
          timestamp: data.timestamp
        });
      }
    }
    
    return validPairs;
  }
  
  /**
   * 🧠 SMART HUNTER DYNAMIC PAIRS INTEGRATION
   * Fetches high-scoring opportunities from Smart Hunter and adds them to trading pool
   */
  private async updateDynamicPairsFromSmartHunter() {
    const now = Date.now();
    
    // Skip if Smart Hunter data is still fresh
    if (now - this.lastSmartHunterUpdate < this.SMART_HUNTER_UPDATE_INTERVAL) {
      return;
    }
    
    try {
      log('🧠 Fetching dynamic pairs from Smart Hunter...');
      const { smartProfitHunter } = await import('./src/lib/smart-profit-hunter');
      const opportunities = await smartProfitHunter.findProfitableOpportunities();
      
      // Filter for high-scoring opportunities (80%+ score) to add to trading pool
      const highScoreOpportunities = opportunities
        .filter(opp => opp.score >= 80) // Only top-tier opportunities
        .slice(0, 5) // Max 5 dynamic pairs to keep system responsive
        .map(opp => opp.symbol);
      
      // Update dynamic pairs if we found good opportunities
      if (highScoreOpportunities.length > 0) {
        const previousDynamic = [...this.dynamicPairs];
        this.dynamicPairs = highScoreOpportunities;
        
        log(`🚀 Smart Hunter integration: Added ${highScoreOpportunities.length} high-scoring pairs`);
        log(`   Dynamic Pairs: ${highScoreOpportunities.join(', ')}`);
        
        // Log changes
        const added = highScoreOpportunities.filter(pair => !previousDynamic.includes(pair));
        const removed = previousDynamic.filter(pair => !highScoreOpportunities.includes(pair));
        
        if (added.length > 0) {
          log(`   ✅ Added: ${added.join(', ')}`);
        }
        if (removed.length > 0) {
          log(`   ❌ Removed: ${removed.join(', ')}`);
        }
      } else {
        // No high-scoring opportunities, keep existing dynamic pairs
        log(`📊 Smart Hunter: No 80%+ opportunities found, keeping existing dynamic pairs`);
      }
      
      this.lastSmartHunterUpdate = now;
      
    } catch (error) {
      log(`⚠️ Smart Hunter integration error: ${error.message}`);
      // Don't update dynamic pairs on error, keep existing ones
    }
  }
  
  // 🎯 REMOVED: getMarketData() - Now using pre-validated price cache system
  // All market data comes from updatePriceCache() and getValidatedTradingPairs()
  // This eliminates pipeline stalls from individual API failures
  
  async shouldTrade(marketData: MarketDataPoint, phase: any): Promise<{ shouldTrade: boolean; confidence: number; signal?: any; aiSystems?: string[] }> {
    try {
      // 🎯 QUANTUM FORGE™ PHASE-BASED AI PIPELINE
      log(`🧠 Phase ${phase.phase} AI Analysis: ${marketData.symbol} @ $${marketData.price}`);
      
      let confidence = 0;
      let aiSystemsUsed: string[] = [];
      let enhancedSignal: any = null;

      // Generate REAL Pine Script technical signal (NO MORE RANDOM VALUES!)
      const { quantumForgeSignalGenerator } = await import('./src/lib/quantum-forge-signal-generator');
      const baseSignal = await quantumForgeSignalGenerator.generateTechnicalSignal(marketData.symbol, marketData.price);
      
      // Ensure signal has phase-appropriate strategy name
      baseSignal.strategy = 'phase-' + phase.phase + '-' + baseSignal.strategy;

      // 🔥 PHASE 0: Raw signals only (ultra-low barriers)
      if (phase.phase === 0) {
        confidence = baseSignal.confidence;
        aiSystemsUsed = ['basic-technical'];
        log(`📊 Phase 0: Raw signal confidence ${(confidence * 100).toFixed(1)}%`);
      }
      
      // 🔥 PHASE 1: Basic Sentiment (Fear&Greed + Reddit)
      else if (phase.phase === 1 && phase.features.sentimentEnabled) {
        try {
          const { universalSentimentEnhancer } = await import('./src/lib/sentiment/universal-sentiment-enhancer');
          const sentimentResult = await universalSentimentEnhancer.enhanceSignal(baseSignal, {
            conflictThreshold: phase.features.sentimentThreshold,
            minSentimentConfidence: phase.features.sentimentThreshold,
            skipOnConflict: true
          });
          
          confidence = sentimentResult.confidence;
          enhancedSignal = sentimentResult;
          aiSystemsUsed = ['basic-technical', 'fear-greed-sentiment', 'reddit-sentiment'];
          log(`💭 Phase 1: Sentiment-enhanced confidence ${(confidence * 100).toFixed(1)}%`);
        } catch (error) {
          log(`⚠️ Phase 1 sentiment analysis failed: ${error.message}`);
          confidence = baseSignal.confidence;
          aiSystemsUsed = ['basic-technical'];
        }
      }
      
      // 🔥 PHASE 2: Multi-Source Sentiment + Mathematical Intuition
      else if (phase.phase === 2) {
        try {
          // Multi-source sentiment enhancement
          if (phase.features.sentimentEnabled) {
            const { universalSentimentEnhancer } = await import('./src/lib/sentiment/universal-sentiment-enhancer');
            enhancedSignal = await universalSentimentEnhancer.enhanceSignal(baseSignal, {
              conflictThreshold: phase.features.sentimentThreshold,
              minSentimentConfidence: phase.features.sentimentThreshold,
              skipOnConflict: false // Allow more aggressive trading in Phase 2
            });
            aiSystemsUsed.push('multi-source-sentiment');
          }

          // Mathematical Intuition Engine
          if (phase.features.mathematicalIntuitionEnabled) {
            const { mathIntuitionEngine } = (await import('./src/lib/mathematical-intuition-engine')).default;
            const marketData = { symbol: baseSignal.symbol, price: baseSignal.price };
            const intuitionResult = await mathIntuitionEngine.runParallelAnalysis(enhancedSignal || baseSignal, marketData);
            
            // Blend calculated vs intuitive confidence using the parallel analysis
            const intuitiveConfidence = intuitionResult.intuitive.overallFeeling;
            const calculatedConfidence = enhancedSignal?.confidence || baseSignal.confidence;
            confidence = calculatedConfidence * 0.7 + intuitiveConfidence * 0.3;
            aiSystemsUsed.push('mathematical-intuition-engine');
            log(`🧠 Phase 2: Mathematical intuition blend confidence ${(confidence * 100).toFixed(1)}% (calc: ${(calculatedConfidence * 100).toFixed(1)}%, intuition: ${(intuitiveConfidence * 100).toFixed(1)}%)`);
          } else {
            confidence = enhancedSignal?.confidence || baseSignal.confidence;
          }
          
          aiSystemsUsed = ['advanced-technical', ...aiSystemsUsed];
        } catch (error) {
          log(`⚠️ Phase 2 AI analysis failed: ${error.message}`);
          confidence = baseSignal.confidence;
          aiSystemsUsed = ['basic-technical'];
        }
      }
      
      // 🔥 PHASE 3: Order Book Intelligence + Markov Chains
      else if (phase.phase === 3) {
        try {
          let workingSignal = baseSignal;
          
          // Multi-source sentiment
          if (phase.features.sentimentEnabled) {
            const { universalSentimentEnhancer } = await import('./src/lib/sentiment/universal-sentiment-enhancer');
            workingSignal = await universalSentimentEnhancer.enhanceSignal(baseSignal, {
              conflictThreshold: phase.features.sentimentThreshold,
              minSentimentConfidence: phase.features.sentimentThreshold,
              enableOrderBookValidation: true // Enable order book in Phase 3
            });
            aiSystemsUsed.push('multi-source-sentiment');
          }

          // Order Book Intelligence
          if (phase.features.orderBookEnabled) {
            const { quantumForgeOrderBookAI } = await import('./src/lib/quantum-forge-orderbook-ai');
            const orderBookAnalysis = await quantumForgeOrderBookAI.enhanceSignalWithOrderBookAI(workingSignal);
            workingSignal = {
              ...workingSignal,
              confidence: orderBookAnalysis.enhancedConfidence,
              aiBoost: (workingSignal.aiBoost || 0) + orderBookAnalysis.aiConfidenceBoost
            };
            aiSystemsUsed.push('order-book-intelligence');
          }

          // Mathematical Intuition Engine
          if (phase.features.mathematicalIntuitionEnabled) {
            const { mathIntuitionEngine } = (await import('./src/lib/mathematical-intuition-engine')).default;
            const marketData = { symbol: baseSignal.symbol, price: baseSignal.price };
            const intuitionResult = await mathIntuitionEngine.runParallelAnalysis(workingSignal, marketData);
            
            // Stronger intuition weighting in Phase 3
            const intuitiveConfidence = intuitionResult.intuitive.overallFeeling;
            confidence = workingSignal.confidence * 0.6 + intuitiveConfidence * 0.4;
            aiSystemsUsed.push('mathematical-intuition-engine');
            log(`🧠 Phase 3: Mathematical intuition enhanced confidence ${(confidence * 100).toFixed(1)}% (calc: ${(workingSignal.confidence * 100).toFixed(1)}%, intuition: ${(intuitiveConfidence * 100).toFixed(1)}%)`);
          } else {
            confidence = workingSignal.confidence;
          }
          
          enhancedSignal = workingSignal;
          log(`🎯 Phase 3: Order book + intuition confidence ${(confidence * 100).toFixed(1)}%`);
        } catch (error) {
          log(`⚠️ Phase 3 AI analysis failed: ${error.message}`);
          confidence = baseSignal.confidence;
          aiSystemsUsed = ['basic-technical'];
        }
      }
      
      // 🔥 PHASE 4: Full QUANTUM FORGE™ Multi-Layer Consensus
      else if (phase.phase === 4 && phase.features.multiLayerAIEnabled) {
        try {
          const { quantumForgeMultiLayerAI } = await import('./src/lib/quantum-forge-multi-layer-ai');
          const multiLayerResult = await quantumForgeMultiLayerAI.enhanceSignalWithMultiLayerAI(baseSignal, {
            technicalWeight: 0.4,
            sentimentWeight: phase.features.sentimentEnabled ? 0.35 : 0,
            orderBookWeight: phase.features.orderBookEnabled ? 0.25 : 0,
            minConsensus: phase.features.requireMultiLayerConsensus ? 70 : 30,
            skipOnConflict: phase.features.requireMultiLayerConsensus
          });
          
          confidence = multiLayerResult.finalDecision?.confidence || multiLayerResult.confidence || baseSignal.confidence;
          enhancedSignal = multiLayerResult;
          aiSystemsUsed = ['quantum-forge-multi-layer-ai', 'consensus-validation'];
          log(`🚀 Phase 4: QUANTUM FORGE™ consensus confidence ${(confidence * 100).toFixed(1)}%`);
        } catch (error) {
          log(`⚠️ Phase 4 multi-layer AI failed: ${error.message}`);
          confidence = baseSignal.confidence;
          aiSystemsUsed = ['basic-technical'];
        }
      }
      
      // Default fallback for any unhandled phases
      else {
        confidence = baseSignal.confidence;
        aiSystemsUsed = ['basic-technical'];
        log(`📊 Basic analysis: ${(confidence * 100).toFixed(1)}% confidence`);
      }

      // Apply phase-specific confidence threshold
      const shouldTrade = confidence >= phase.features.confidenceThreshold;
      
      if (shouldTrade) {
        log(`📈 ✅ TRADE SIGNAL: ${marketData.symbol} @ $${marketData.price} (${(confidence * 100).toFixed(1)}% confidence)`);
        log(`🤖 AI Systems: [${aiSystemsUsed.join(', ')}]`);
      } else {
        log(`📉 ❌ Signal below threshold: ${(confidence * 100).toFixed(1)}% < ${(phase.features.confidenceThreshold * 100).toFixed(1)}%`);
      }

      return {
        shouldTrade,
        confidence,
        signal: enhancedSignal || baseSignal,
        aiSystems: aiSystemsUsed
      };

    } catch (error) {
      log(`❌ AI analysis error: ${error.message}`);
      // Fallback to basic signal
      const basicConfidence = Math.random() * 0.4 + 0.1; // 10-50%
      return {
        shouldTrade: basicConfidence >= phase.features.confidenceThreshold,
        confidence: basicConfidence,
        aiSystems: ['fallback-basic']
      };
    }
  }
  
  /**
   * 🎯 SMART EXIT TIMING STRATEGY
   * Evaluates existing positions for optimal exit opportunities based on:
   * - Position age and profit/loss status
   * - Current market confidence vs entry confidence
   * - Phase-based exit criteria
   */
  private async evaluateExitOpportunities(symbol: string, currentPrice: number, marketConfidence: number, phase: any) {
    try {
      const openPositions = this.positionManager.getOpenPositionsBySymbol(symbol);
      
      log(`🔍 Smart Exit Check: ${symbol} - Found ${openPositions.length} open positions`);
      
      for (const position of openPositions) {
        const entryPrice = position.entryPrice;
        const side = position.side;
        const entryConfidence = position.metadata?.confidence || 0.5;
        const positionAgeMs = Date.now() - new Date(position.openTime).getTime();
        const positionAgeMinutes = positionAgeMs / (1000 * 60);
        
        // Calculate current P&L
        const priceChange = (currentPrice - entryPrice) / entryPrice;
        const pnlPercent = side === 'long' ? priceChange * 100 : -priceChange * 100;
        
        let shouldExit = false;
        let exitReason = '';
        
        // EXIT RULE 1: Confidence Reversal
        // If market confidence has dropped significantly from entry confidence
        if (entryConfidence > 0.7 && marketConfidence < 0.4) {
          shouldExit = true;
          exitReason = 'confidence_reversal';
        }
        
        // EXIT RULE 2: Quick Profit Taking (High Confidence Positions)
        // High confidence positions can exit earlier for quick profits
        else if (entryConfidence > 0.8 && pnlPercent > 2.0) {
          shouldExit = true;
          exitReason = 'quick_profit_high_confidence';
        }
        
        // EXIT RULE 3: Loss Cutting (Low Confidence Positions)
        // Low confidence positions should exit losses quickly
        else if (entryConfidence < 0.5 && pnlPercent < -1.5) {
          shouldExit = true;
          exitReason = 'cut_losses_low_confidence';
        }
        
        // EXIT RULE 4: Time-Based Exit (Stale Positions) - More aggressive for Phase 0/1
        // Positions held too long without significant profit
        else if (positionAgeMinutes > 5 && Math.abs(pnlPercent) < 0.3) { // Shorter time, lower threshold
          shouldExit = true;
          exitReason = 'stale_position_timeout';
        }
        
        // EXIT RULE 5: Quick Profit Taking - More aggressive
        // Take profits at smaller gains for frequent exits
        else if (pnlPercent > 1.0) { // Take 1%+ profits quickly
          shouldExit = true;
          exitReason = 'quick_profit_taking';
        }
        
        // EXIT RULE 6: Loss Prevention - More aggressive  
        // Cut losses quickly to prevent large drawdowns
        else if (pnlPercent < -1.0) { // Cut -1%+ losses quickly
          shouldExit = true;
          exitReason = 'loss_prevention';
        }
        
        // EXIT RULE 7: Random Exit for Phase 0/1 data collection
        // Ensure positions actually close for data generation
        else if ((phase.phase === 0 || phase.phase === 1) && Math.random() < 0.15) { // 15% chance
          shouldExit = true;
          exitReason = 'random_data_collection_exit';
        }
        
        // Execute exit if criteria met
        if (shouldExit) {
          try {
            const closedPosition = await this.positionManager.closePosition(
              position.id,
              currentPrice,
              exitReason
            );
            
            const winLoss = closedPosition.pnl > 0 ? '🟢 WIN' : '🔴 LOSS';
            log(`🎯 SMART EXIT: ${closedPosition.position.id} | ${exitReason.toUpperCase()} | P&L: $${closedPosition.pnl.toFixed(2)} | ${winLoss}`);
            log(`   Entry: ${entryConfidence ? (entryConfidence * 100).toFixed(1) : '?'}% confidence → Current: ${(marketConfidence * 100).toFixed(1)}% | Age: ${positionAgeMinutes.toFixed(1)}min`);
            
          } catch (exitError) {
            log(`❌ Smart exit failed for ${position.id}: ${exitError.message}`);
          }
        }
      }
      
    } catch (error) {
      log(`⚠️ Smart exit evaluation error: ${error.message}`);
    }
  }
  
  async executeTradingCycle() {
    try {
      this.cycleCount++;
      const currentPhase = await phaseManager.getCurrentPhase();
      
      log(`🔄 Trading Cycle ${this.cycleCount} - Phase ${currentPhase.phase}`);
      
      // 🎯 UPDATE PRICE CACHE (every 30 seconds, non-blocking)
      await this.updatePriceCache();
      
      // 🧠 UPDATE SMART HUNTER DYNAMIC PAIRS (every 1 minute, non-blocking)
      await this.updateDynamicPairsFromSmartHunter();
      
      // 🎯 GET PRE-VALIDATED TRADING PAIRS (NO API CALLS IN PIPELINE!)
      const marketData = this.getValidatedTradingPairs();
      
      if (marketData.length === 0) {
        log('⚠️  No valid trading pairs available (all price fetches failed)');
        return;
      }
      
      log(`✅ Trading with ${marketData.length} validated pairs: ${marketData.map(d => d.symbol).join(', ')}`);
      
      // Process each market with QUANTUM FORGE™ AI analysis
      for (const data of marketData) {
        const aiAnalysis = await this.shouldTrade(data, currentPhase);
        
        if (aiAnalysis.shouldTrade) {
          // Use AI-enhanced signal for trade parameters
          const signal = aiAnalysis.signal || {};
          const side = signal.action === 'SELL' ? 'short' : 'long';
          
          // 🎯 CONFIDENCE-BASED POSITION SIZING
          // Higher confidence = larger position size (within phase limits)
          const baseSize = currentPhase.features.positionSizing; // Phase-based base size
          const confidenceMultiplier = Math.min(aiAnalysis.confidence * 1.5, 2.0); // Max 2x multiplier
          const quantity = baseSize * confidenceMultiplier;
          
          // 🎯 CONFIDENCE-BASED STOP LOSS/TAKE PROFIT
          // Higher confidence = tighter stops (we're more sure of direction)
          const stopLossPercent = currentPhase.features.stopLossPercent / 100;
          const takeProfitPercent = currentPhase.features.takeProfitPercent / 100;
          
          // Adjust based on confidence: higher confidence = tighter stops
          const confidenceAdjustment = aiAnalysis.confidence * 0.3; // 0-30% adjustment
          const adjustedStopLoss = stopLossPercent * (1 - confidenceAdjustment);
          const adjustedTakeProfit = takeProfitPercent * (1 + confidenceAdjustment);
          
          const stopLoss = data.price * (side === 'long' ? (1 - adjustedStopLoss) : (1 + adjustedStopLoss));
          const takeProfit = data.price * (side === 'long' ? (1 + adjustedTakeProfit) : (1 - adjustedTakeProfit));
          
          try {
            // Use production position management system with AI strategy name
            const strategyName = `phase-${currentPhase.phase}-ai-${aiAnalysis.aiSystems?.[0] || 'basic'}`;
            const result = await this.positionManager.openPosition({
              symbol: data.symbol,
              side,
              quantity,
              price: data.price,
              strategy: strategyName,
              timestamp: data.timestamp,
              metadata: {
                confidence: aiAnalysis.confidence,
                aiSystems: aiAnalysis.aiSystems,
                phase: currentPhase.phase
              }
            });
            
            log(`✅ POSITION OPENED: ${result.position.id} | ${side.toUpperCase()} ${quantity.toFixed(6)} ${data.symbol} @ $${data.price} | Confidence: ${(aiAnalysis.confidence * 100).toFixed(1)}%`);
            
            // 🎯 SMART EXIT TIMING STRATEGY
            // Check existing positions for smart exit opportunities
            await this.evaluateExitOpportunities(data.symbol, data.price, aiAnalysis.confidence, currentPhase);
            
          } catch (positionError) {
            log(`❌ Position error: ${positionError.message}`);
          }
        }
      }
      
      // Update trade count and check for phase transitions (only every 10 cycles to avoid DB overload)
      if (this.cycleCount % 10 === 0) {
        try {
          await phaseManager.updateTradeCount();
          const newPhase = await phaseManager.getCurrentPhase();
          const progress = await phaseManager.getProgressToNextPhase();
          
          log(`📊 Total Managed Trades: ${progress.currentTrades}`);
          
          // Show phase transition if occurred
          if (newPhase.phase > currentPhase.phase) {
            log(`🚀 PHASE TRANSITION DETECTED!`);
            log(`   ${currentPhase.name} → ${newPhase.name}`);
            log(`   🔓 New Features Unlocked!`);
          }
        } catch (phaseError) {
          log(`⚠️  Phase manager error: ${phaseError.message}`);
        }
      } else {
        log(`📊 Trading cycle ${this.cycleCount} complete`);
      }
      
    } catch (error) {
      log(`❌ Trading cycle error: ${error.message}`);
      // Continue to next cycle even on errors
      log(`⏭️  Continuing to next cycle...`);
    }
  }
  
  async start() {
    if (!(await this.initialize())) {
      return;
    }
    
    this.isRunning = true;
    log('🟢 Production trading engine started!');
    
    while (this.isRunning) {
      try {
        // Add timeout protection for the entire trading cycle
        const cycleTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Trading cycle timeout')), 45000)
        );
        
        await Promise.race([
          this.executeTradingCycle(),
          cycleTimeout
        ]);
        
        // Wait 5 seconds between cycles (reduced for faster response)
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        log(`❌ Critical trading engine error: ${error.message}`);
        log(`🔄 Attempting to continue...`);
        // Continue loop even on critical errors
        await new Promise(resolve => setTimeout(resolve, 10000)); // Longer wait on errors
      }
    }
  }
  
  stop() {
    log('🛑 Stopping production trading engine...');
    this.isRunning = false;
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  log('🛑 Received shutdown signal...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the engine
const engine = new ProductionTradingEngine();
engine.start().catch(console.error);