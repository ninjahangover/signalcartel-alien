/**
 * Production Trading with Position Management
 * Uses the full position management system with QUANTUM FORGE™ phase integration
 */

import { PositionManager } from './src/lib/position-management/position-manager';
import { phaseManager } from './src/lib/quantum-forge-phase-config';
import { EnhancedMarkovPredictor } from './src/lib/enhanced-markov-predictor';
import { MathematicalIntuitionEngine } from './src/lib/mathematical-intuition-engine';
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
  private enhancedMarkovPredictor2: EnhancedMarkovPredictor;
  private mathEngine: MathematicalIntuitionEngine;
  
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
    this.enhancedMarkovPredictor2 = new EnhancedMarkovPredictor();
    this.mathEngine = new MathematicalIntuitionEngine();
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
      
      // Start background cache updater (non-blocking)
      log('💰 Starting background price cache updater...');
      this.startBackgroundCacheUpdater();
      
      return true;
    } catch (error) {
      log('❌ Initialization failed: ' + error.message);
      return false;
    }
  }
  
  /**
   * 🎯 BACKGROUND CACHE UPDATER (NON-BLOCKING)
   * Runs in parallel to trading pipeline
   */
  private startBackgroundCacheUpdater() {
    // Start immediately and then every 2 minutes
    this.updatePriceCacheBackground();
    setInterval(() => {
      this.updatePriceCacheBackground();
    }, 120000); // 2 minutes
    log('📡 Background cache updater started (updates every 2 minutes)');
  }
  
  /**
   * 🎯 BACKGROUND PRICE CACHE UPDATE
   * Fetches and validates prices from Smart Hunter opportunities
   * Only Smart Hunter + core pairs get cached
   */
  private async updatePriceCacheBackground() {
    const now = Date.now();
    
    // Skip if cache is still fresh
    if (now - this.lastPriceCacheUpdate < this.PRICE_CACHE_TTL) {
      return;
    }
    
    log('💰 Updating cached prices for category-optimized pairs...');
    const startTime = Date.now();
    
    // Fetch prices for ALL_PAIRS sequentially with delays to avoid rate limits
    const { realTimePriceFetcher } = await import('./src/lib/real-time-price-fetcher');
    const results = [];
    
    for (let i = 0; i < this.ALL_PAIRS.length; i++) {
      const symbol = this.ALL_PAIRS[i];
      
      try {
        // Add delay between requests to avoid rate limiting (2 seconds per request)
        if (i > 0) {
          log(`⏳ Rate limit protection: waiting 2000ms before request for ${symbol}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        const priceData = await realTimePriceFetcher.getCurrentPrice(symbol);
        
        if (priceData.success) {
          this.priceCache.set(symbol, {
            price: Math.round(priceData.price * 100) / 100,
            timestamp: new Date(),
            isValid: true
          });
          results.push({ status: 'fulfilled', value: { symbol, success: true, price: priceData.price } });
        } else {
          this.priceCache.set(symbol, {
            price: 0,
            timestamp: new Date(),
            isValid: false
          });
          results.push({ status: 'fulfilled', value: { symbol, success: false, error: priceData.error } });
        }
      } catch (error) {
        this.priceCache.set(symbol, {
          price: 0,
          timestamp: new Date(),
          isValid: false
        });
        results.push({ status: 'rejected', reason: error, value: { symbol, success: false, error: error.message } });
      }
    }
    
    // Count valid vs invalid pairs
    const validPairs = Array.from(this.priceCache.entries()).filter(([_, data]) => data.isValid);
    const invalidPairs = Array.from(this.priceCache.entries()).filter(([_, data]) => !data.isValid);
    
    const duration = Date.now() - startTime;
    log(`✅ Price validation complete in ${duration}ms`);
    log(`💚 Valid pairs: ${validPairs.length}/${this.ALL_PAIRS.length} category-optimized (${validPairs.map(([symbol]) => symbol).join(', ')})`);
    
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
   * 🧠 SMART HUNTER CATEGORY-BASED PAIR OPTIMIZATION
   * Uses CoinGecko categories (trending, volume leaders) instead of scanning all pairs
   * MUCH faster and more efficient!
   */
  private async updateDynamicPairsFromSmartHunter() {
    const now = Date.now();
    
    // Skip if Smart Hunter data is still fresh
    if (now - this.lastSmartHunterUpdate < this.SMART_HUNTER_UPDATE_INTERVAL) {
      return;
    }
    
    try {
      log('🧠 Category-based opportunity scanning (trending/volume/gainers)...');
      const { smartProfitHunter } = await import('./src/lib/smart-profit-hunter');
      const opportunities = await smartProfitHunter.findProfitableOpportunities();
      
      // Filter for HIGH-SCORING opportunities from category queries (80%+)
      // These come from CoinGecko trending/volume/gainers - no timeout risk!
      const highScoringPairs = opportunities
        .filter(opp => opp.score >= 80) // High-scoring from categories only
        .slice(0, 10) // Top 10 high-scoring from categories
        .map(opp => opp.symbol);
        
      // Also include medium-scoring pairs for broader coverage
      const mediumScoringPairs = opportunities
        .filter(opp => opp.score >= 60 && opp.score < 80)
        .slice(0, 5) // Top 5 medium-scoring
        .map(opp => opp.symbol);
        
      const allCategoryPairs = [...highScoringPairs, ...mediumScoringPairs];
      
      // Update dynamic pairs with category-optimized high-scoring selection
      if (allCategoryPairs.length > 0) {
        const previousDynamic = [...this.dynamicPairs];
        this.dynamicPairs = allCategoryPairs;
        
        log(`🚀 Category-derived scoring: ${highScoringPairs.length} high + ${mediumScoringPairs.length} medium scoring pairs`);
        log(`   High-Scoring (80%+): ${highScoringPairs.join(', ')}`);
        if (mediumScoringPairs.length > 0) {
          log(`   Medium-Scoring (60-79%): ${mediumScoringPairs.join(', ')}`);
        }
        
        // Log changes
        const added = allCategoryPairs.filter(pair => !previousDynamic.includes(pair));
        const removed = previousDynamic.filter(pair => !allCategoryPairs.includes(pair));
        
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
      // 🎯 PRIMARY ENTRY LOGIC: PINE SCRIPT STRATEGY TECHNICAL SIGNALS
      // Pine Script strategy with optimized inputs is the FOUNDATION
      // AI systems optimize and validate these decisions for better wins and max profit
      log(`🧠 Phase ${phase.phase} QUANTUM FORGE™ Analysis: ${marketData.symbol} @ $${marketData.price}`);
      
      let confidence = 0;
      let aiSystemsUsed: string[] = [];
      let enhancedSignal: any = null;
      
      // 🎯 PINE SCRIPT FOUNDATION: Get technical signal from Pine Script strategies
      try {
        const { quantumForgeSignalGenerator } = await import('./src/lib/quantum-forge-signal-generator');
        const pineSignal = await quantumForgeSignalGenerator.generateTechnicalSignal(marketData.symbol, marketData.price);
        
        log(`🎯 PINE SCRIPT ENTRY SIGNAL: ${pineSignal.action} (${(pineSignal.confidence * 100).toFixed(1)}% confidence)`);
        log(`📊 Pine Strategy: ${pineSignal.strategy} | Reason: ${pineSignal.reason}`);
        
        // Pine Script provides the BASE confidence
        if (pineSignal.action !== 'HOLD') {
          confidence = pineSignal.confidence; // Start with Pine Script confidence
          enhancedSignal = pineSignal;
          aiSystemsUsed.push(pineSignal.strategy);
          log(`🎯 PINE SCRIPT BASE: ${(confidence * 100).toFixed(1)}% confidence from ${pineSignal.strategy}`);
        } else {
          log(`🎯 PINE SCRIPT: HOLD signal - checking AI for enhancement opportunities`);
        }
      } catch (error) {
        log(`⚠️ Pine Script signal unavailable: ${error.message} - using AI fallback`);
      }
      
      // 🧠 AI OPTIMIZATION 1: Enhanced Markov Chain Analysis
      // AI enhances Pine Script decisions for better market timing
      let markovAnalysis: any = null;
      try {
        // Use fresh instance
        const ohlcData = { 
          symbol: marketData.symbol, 
          timestamp: marketData.timestamp, 
          open: marketData.price, 
          high: marketData.price, 
          low: marketData.price, 
          close: marketData.price, 
          volume: 1000 
        };
        markovAnalysis = await this.enhancedMarkovPredictor2.processMarketData(
          marketData.symbol, 
          ohlcData, 
          {}, // intelligence (empty for now)
          [ohlcData] // recentHistory array
        );
        log(`🔮 MARKOV ENTRY: State ${markovAnalysis.currentState}, Expected Return: ${(markovAnalysis.expectedReturn * 100).toFixed(2)}%`);
        
        // AI ENHANCEMENT: Boost Pine Script confidence if Markov confirms direction
        if (confidence > 0 && markovAnalysis.expectedReturn > 0) {
          const markovBoost = Math.min(0.2, markovAnalysis.confidence * markovAnalysis.expectedReturn * 2); // Max 20% boost
          confidence += markovBoost;
          log(`🚀 AI BOOST: Markov chains CONFIRM Pine Script - boosting confidence by ${(markovBoost * 100).toFixed(1)}%`);
          aiSystemsUsed.push('quantum-markov-chains');
        } else if (confidence === 0 && markovAnalysis.expectedReturn > 0.01) {
          // Fallback: Strong Markov signal when Pine Script shows HOLD
          confidence = Math.min(0.3, markovAnalysis.confidence * markovAnalysis.expectedReturn * 10);
          log(`🧠 AI FALLBACK: Strong Markov signal (${(confidence * 100).toFixed(1)}%) when Pine Script = HOLD`);
          aiSystemsUsed.push('quantum-markov-fallback');
        }
      } catch (error) {
        log(`⚠️ Markov Chain analysis failed: ${error.message}`);
      }
      
      // 🧠 QUANTUM FORGE™ COMPONENT 2: Mathematical Intuition Engine  
      let mathIntuitionAnalysis: any = null;
      try {
        const { MathematicalIntuitionEngine } = await import('./src/lib/mathematical-intuition-engine');
        // Use fresh instance
        
        // Generate base signal first
        const { quantumForgeSignalGenerator } = await import('./src/lib/quantum-forge-signal-generator');
        const baseSignal = await quantumForgeSignalGenerator.generateTechnicalSignal(marketData.symbol, marketData.price);
        
        mathIntuitionAnalysis = await this.mathEngine.analyzeIntuitively(baseSignal, marketData);
        log(`🎭 MATHEMATICAL INTUITION: Overall ${(mathIntuitionAnalysis.mathIntuition * 100).toFixed(1)}%, Flow Field ${mathIntuitionAnalysis.flowFieldStrength.toFixed(4)}`);
        
        // Mathematical Intuition confidence contribution
        const intuitionScore = mathIntuitionAnalysis.mathIntuition;
        const patternResonance = Math.max(0, mathIntuitionAnalysis.patternResonance);
        const mathConfidence = (intuitionScore * 0.5) + (patternResonance * 0.5);
        confidence += Math.max(0, Math.min(0.4, mathConfidence)); // Max 40% from Math Intuition
        aiSystemsUsed.push('mathematical-intuition');
        
        enhancedSignal = baseSignal;
      } catch (error) {
        log(`⚠️ Mathematical Intuition analysis failed: ${error.message}`);
      }

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
            // Use already imported mathIntuitionEngine
            const marketData = { symbol: baseSignal.symbol, price: baseSignal.price };
            const intuitionResult = await this.mathEngine.runParallelAnalysis(enhancedSignal || baseSignal, marketData);
            
            // Blend calculated vs intuitive confidence using the parallel analysis
            const intuitiveConfidence = intuitionResult.intuitive?.mathIntuition || 0;
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
            // Use already imported mathIntuitionEngine
            const marketData = { symbol: baseSignal.symbol, price: baseSignal.price };
            const intuitionResult = await this.mathEngine.runParallelAnalysis(workingSignal, marketData);
            
            // Stronger intuition weighting in Phase 3
            const intuitiveConfidence = intuitionResult.intuitive?.mathIntuition || 0.5;
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
      // Fallback to conservative signal based on phase threshold
      const basicConfidence = phase.features.confidenceThreshold * 0.8; // 80% of phase threshold
      return {
        shouldTrade: false, // Conservative: don't trade on AI errors
        confidence: basicConfidence,
        aiSystems: ['fallback-conservative']
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
        
        // 🎯 MATHEMATICAL INTUITION AI EXIT VALIDATION
        // Use E = (W × A) - (L × B) equation for maximum profit optimization
        const currentMarketData = { symbol, price: currentPrice, timestamp: new Date() };
        const exitAnalysis = await this.shouldTrade(currentMarketData, phase);
        
        // 🚀 QUANTUM FORGE™ COGNITIVE CORE ACTIVATION
        // Get Mathematical Intuition analysis
        let mathIntuitionAnalysis: any;
        try {
          const { MathematicalIntuitionEngine } = await import('./src/lib/mathematical-intuition-engine');
          // Use fresh instance
          mathIntuitionAnalysis = await this.mathEngine.analyzeIntuitively(exitAnalysis.signal || {}, currentMarketData);
        } catch (error) {
          log(`⚠️ Mathematical Intuition unavailable: ${error.message}`);
          mathIntuitionAnalysis = null;
        }

        // Get Enhanced Markov Chain predictions with LLN confidence
        let markovPrediction: any;
        try {
          // Use fresh instance
          const marketData = { symbol, timestamp: new Date(), open: currentPrice, high: currentPrice, low: currentPrice, close: currentPrice, volume: 1000 };
          markovPrediction = await this.enhancedMarkovPredictor2.processMarketData(
            symbol, 
            marketData, 
            {}, // intelligence (empty for now)
            [marketData] // recentHistory array
          );
          log(`🔮 MARKOV CHAIN: Current state ${markovPrediction.currentState}, confidence ${(markovPrediction.confidence * 100).toFixed(1)}%`);
        } catch (error) {
          log(`⚠️ Markov Chain predictor unavailable: ${error.message}`);
          markovPrediction = null;
        }
        
        let shouldExit = false;
        let exitReason = '';
        
        // 🎯 PRIMARY EXIT LOGIC: PINE SCRIPT STRATEGY TECHNICAL SIGNALS
        // The Pine Script strategy with optimized inputs is the FOUNDATION
        // AI systems optimize, improve and validate these decisions
        try {
          const { quantumForgeSignalGenerator } = await import('./src/lib/quantum-forge-signal-generator');
          const pineExitSignal = await quantumForgeSignalGenerator.generateTechnicalSignal(symbol, currentPrice);
          
          log(`🎯 PINE SCRIPT EXIT SIGNAL: ${pineExitSignal.action} (${(pineExitSignal.confidence * 100).toFixed(1)}% confidence)`);
          log(`📊 Pine Strategy: ${pineExitSignal.strategy} | Reason: ${pineExitSignal.reason}`);
          
          // PRIMARY EXIT DECISION: Based on Pine Script Strategy
          if (pineExitSignal.action === 'SELL' && side === 'long' && pineExitSignal.confidence > 0.5) {
            shouldExit = true;
            exitReason = `pine_script_sell_signal_${pineExitSignal.strategy}`;
            log(`🎯 PINE SCRIPT EXIT: SELL signal for LONG position - ${pineExitSignal.reason}`);
          }
          else if (pineExitSignal.action === 'BUY' && side === 'short' && pineExitSignal.confidence > 0.5) {
            shouldExit = true;
            exitReason = `pine_script_buy_signal_${pineExitSignal.strategy}`;
            log(`🎯 PINE SCRIPT EXIT: BUY signal for SHORT position - ${pineExitSignal.reason}`);
          }
          
          // AI VALIDATION: Use Markov Chain to validate Pine Script decision
          if (shouldExit && markovPrediction && markovPrediction.confidence > 0.7) {
            const expectedReturn = markovPrediction.expectedReturn || 0;
            const mostLikelyState = markovPrediction.mostLikelyNextState;
            
            log(`🧠 AI VALIDATION: Markov expects ${(expectedReturn * 100).toFixed(2)}% return, next state: ${mostLikelyState}`);
            
            // AI confirms Pine Script exit signal
            if ((side === 'long' && mostLikelyState.includes('DOWN')) || 
                (side === 'short' && mostLikelyState.includes('UP'))) {
              log(`✅ AI CONFIRMATION: Markov chains CONFIRM Pine Script exit signal`);
              exitReason += '_ai_confirmed';
            } else {
              log(`⚠️ AI DIVERGENCE: Markov chains suggest different direction than Pine Script`);
            }
          }
          
        } catch (error) {
          log(`⚠️ Pine Script exit signal unavailable: ${error.message}`);
          
          // FALLBACK: Use AI-only exit logic if Pine Script fails
          if (markovPrediction && markovPrediction.confidence > 0.8) {
            const expectedReturn = markovPrediction.expectedReturn || 0;
            const mostLikelyState = markovPrediction.mostLikelyNextState;
            
            log(`🧠 AI FALLBACK EXIT: Expected return ${(expectedReturn * 100).toFixed(2)}%, next state: ${mostLikelyState}`);
            
            // Strong AI signal for exit as fallback
            if (expectedReturn < -0.01 && markovPrediction.confidence > 0.85) {
              shouldExit = true;
              exitReason = 'ai_fallback_strong_negative_expectation';
            }
            else if (side === 'long' && mostLikelyState.includes('DOWN') && markovPrediction.confidence > 0.8) {
              shouldExit = true;
              exitReason = 'ai_fallback_bearish_transition';
            }
            else if (side === 'short' && mostLikelyState.includes('UP') && markovPrediction.confidence > 0.8) {
              shouldExit = true;
              exitReason = 'ai_fallback_bullish_transition';
            }
          }
        }
        
        // 🧠 AI OPTIMIZATION: Mathematical Intuition can enhance Pine Script decisions
        // Use Mathematical Intuition to optimize position sizing for remaining time
        if (!shouldExit && mathIntuitionAnalysis && mathIntuitionAnalysis.traditional) {
          const currentExpectancy = mathIntuitionAnalysis.traditional.expectancyScore;
          const currentWinRate = mathIntuitionAnalysis.traditional.winRateProjection;
          const riskRewardRatio = mathIntuitionAnalysis.traditional.riskRewardRatio;
          
          // Calculate expected value for continuing vs exiting
          const avgWin = Math.abs(pnlPercent) > 0 ? Math.abs(pnlPercent) : 1.5; // Use current P&L or default
          const avgLoss = avgWin / riskRewardRatio;
          const continueExpectancy = (currentWinRate * avgWin) - ((1 - currentWinRate) * avgLoss);
          
          log(`📊 E = (W × A) - (L × B): (${(currentWinRate*100).toFixed(1)}% × ${avgWin.toFixed(2)}%) - (${((1-currentWinRate)*100).toFixed(1)}% × ${avgLoss.toFixed(2)}%) = ${continueExpectancy.toFixed(4)}`);
          
          // AI OPTIMIZATION: Warn about deteriorating expectancy but Pine Script still decides
          if (continueExpectancy < 0) {
            log(`⚠️ AI WARNING: Mathematical expectancy turned negative (${continueExpectancy.toFixed(4)}) - Pine Script will decide exit`);
          }
          else if (continueExpectancy < entryConfidence * 0.3) {
            log(`⚠️ AI WARNING: Expectancy deteriorated from entry confidence - Pine Script will decide exit`);
          }
        }
        
        // 🛡️ EMERGENCY RISK MANAGEMENT: Safety override regardless of Pine Script
        // Only for extreme situations that require immediate action
        if (positionAgeMinutes > 120 || Math.abs(pnlPercent) > 10.0) { // Increased thresholds
          shouldExit = true;
          exitReason = 'emergency_risk_management_override';
          log(`🚨 EMERGENCY EXIT: Position age ${positionAgeMinutes}min, P&L ${pnlPercent.toFixed(2)}% - OVERRIDING Pine Script`);
        }
        
        // 📈 PROFIT PROTECTION: Secure gains when Pine Script doesn't exit but profit is high
        else if (pnlPercent > 3.0 && positionAgeMinutes > 30) {
          log(`💰 PROFIT PROTECTION: ${pnlPercent.toFixed(2)}% profit available - Pine Script will decide`);
          // Let Pine Script decide - only log the opportunity
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
      
      // 🎯 PRICE CACHE RUNS IN BACKGROUND (no blocking)
      
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