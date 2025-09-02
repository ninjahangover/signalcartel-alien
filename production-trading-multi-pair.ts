/**
 * Production Trading with Position Management
 * Uses the full position management system with QUANTUM FORGE™ phase integration
 */

import { PositionManager } from './src/lib/position-management/position-manager';
import { phaseManager } from './src/lib/quantum-forge-phase-config';
import { EnhancedMarkovPredictor } from './src/lib/enhanced-markov-predictor';
import { MathematicalIntuitionEngine } from './src/lib/mathematical-intuition-engine';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

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
  
  // 🐅 DYNAMIC PAIRS from PROFIT PREDATOR™ (updated every cycle)
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
   * Get current price for a symbol (FIXED: uses emergency cache)
   */
  private async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const { fixedPriceFetcher } = await import('./src/lib/fixed-price-fetcher');
      const priceData = await fixedPriceFetcher.getCurrentPrice(symbol);
      if (priceData) {
        log(`💰 ${symbol}: $${priceData.price} (${priceData.source})`);
        return priceData.price;
      }
      return null;
    } catch (error) {
      log(`⚠️ Fixed price fetch failed for ${symbol}: ${error.message}`);
      return null;
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
   * Fetches and validates prices from PROFIT PREDATOR™ opportunities
   * Only PROFIT PREDATOR™ + core pairs get cached
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
    
    for (const [symbol, data] of Array.from(this.priceCache.entries())) {
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
   * 🐅 PROFIT PREDATOR™ CATEGORY-BASED PAIR OPTIMIZATION
   * Uses CoinGecko categories (trending, volume leaders) instead of scanning all pairs
   * MUCH faster and more efficient!
   */
  private async updateDynamicPairsFromProfitPredator() {
    const now = Date.now();
    
    // Skip if PROFIT PREDATOR™ data is still fresh
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
        log(`📊 PROFIT PREDATOR™: No 80%+ opportunities found, keeping existing dynamic pairs`);
      }
      
      this.lastSmartHunterUpdate = now;
      
    } catch (error) {
      log(`⚠️ PROFIT PREDATOR™ integration error: ${error.message}`);
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
        // Create minimal MarketIntelligenceData for Markov analysis
        const intelligenceData = {
          symbol: marketData.symbol,
          captureStartTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
          captureEndTime: new Date(),
          dataPoints: [{...ohlcData, price: ohlcData.close}],
          patterns: [],
          momentum: {
            symbol: marketData.symbol,
            timeframe: '1h' as const,
            momentum: 0,
            volume_trend: 'stable' as const,
            price_velocity: 0,
            volatility: 0.1,
            support_level: marketData.price * 0.98,
            resistance_level: marketData.price * 1.02,
            trend_strength: 50
          },
          regime: {
            regime: 'sideways' as const,
            confidence: 0.5,
            duration_hours: 1,
            key_levels: {
              support: [marketData.price * 0.98],
              resistance: [marketData.price * 1.02],
              pivot: marketData.price
            },
            volume_profile: 'medium' as const,
            volatility_level: 'low' as const
          },
          predictiveSignals: {
            next_1h: 'neutral' as const,
            next_4h: 'neutral' as const,
            next_24h: 'neutral' as const,
            confidence: 0.5
          },
          confidence: 0.5,
          lastUpdated: new Date(),
          tradingAdjustments: {
            position_sizing: 1.0,
            stop_loss_adjustment: 0,
            take_profit_adjustment: 0,
            entry_timing: 'immediate' as const
          }
        };
        
        markovAnalysis = await this.enhancedMarkovPredictor2.processMarketData(
          marketData.symbol, 
          ohlcData, 
          intelligenceData,
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
            const enhancedSignal = await universalSentimentEnhancer.enhanceSignal(baseSignal, {
              conflictThreshold: phase.features.sentimentThreshold,
              minSentimentConfidence: phase.features.sentimentThreshold,
              enableOrderBookValidation: true // Enable order book in Phase 3
            });
            
            // Ensure required TechnicalSignal properties
            workingSignal = {
              ...enhancedSignal,
              timestamp: new Date(),
              source: 'sentiment-enhanced'
            };
            aiSystemsUsed.push('multi-source-sentiment');
          }

          // Order Book Intelligence
          if (phase.features.orderBookEnabled) {
            const { quantumForgeOrderBookAI } = await import('./src/lib/quantum-forge-orderbook-ai');
            const orderBookAnalysis = await quantumForgeOrderBookAI.enhanceSignalWithOrderBookAI(workingSignal);
            workingSignal = {
              ...workingSignal,
              confidence: orderBookAnalysis.enhancedConfidence
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
          
          confidence = multiLayerResult.finalDecision?.confidence || baseSignal.confidence;
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
  
  private async evaluateExitOpportunities(symbol: string, currentPrice: number, marketConfidence: number, phase: any) {
    try {
      const openPositions = await this.positionManager.getOpenPositions();
      log(`🔍 Exit evaluation: ${openPositions.length} positions to check`);
      
      for (const position of openPositions) {
        const { entryPrice, side, symbol: positionSymbol, metadata } = position;
        const entryConfidence = metadata?.confidence || 0.5;
        const positionAge = Date.now() - new Date(position.openTime).getTime();
        const ageMinutes = positionAge / (1000 * 60);
        
        // Get real current price for this position
        const price = await this.getCurrentPrice(positionSymbol);
        if (!price) {
          log(`⚠️ No price for ${positionSymbol}, skipping`);
          continue;
        }
        
        // Calculate P&L
        const priceChange = (price - entryPrice) / entryPrice;
        const pnl = side === 'long' ? priceChange * 100 : -priceChange * 100;
        
        log(`📊 ${positionSymbol}: ${pnl.toFixed(2)}% (${ageMinutes.toFixed(1)}min old)`);
        
        // Get dynamic exit thresholds from phase configuration
        const takeProfit = phase.features.takeProfitPercent || 5.5;
        const stopLoss = phase.features.stopLossPercent || 3.5;
        
        let shouldExit = false;
        let reason = '';
        
        // Check exit conditions
        if (pnl >= takeProfit) {
          shouldExit = true;
          reason = `take_profit_${takeProfit}pct`;
        } else if (pnl <= -stopLoss) {
          shouldExit = true;
          reason = `stop_loss_${stopLoss}pct`;
        } else if (ageMinutes > 120 || Math.abs(pnl) > 10.0) {
          shouldExit = true;
          reason = 'emergency_exit';
        }
        
        // AI-enhanced exit logic if basic conditions not met
        if (!shouldExit) {
          try {
            // Get Pine Script signal
            const { quantumForgeSignalGenerator } = await import('./src/lib/quantum-forge-signal-generator');
            const signal = await quantumForgeSignalGenerator.generateTechnicalSignal(positionSymbol, price);
            
            // Pine Script exit signal
            if ((signal.action === 'SELL' && side === 'long' && signal.confidence > 0.5) ||
                (signal.action === 'BUY' && side === 'short' && signal.confidence > 0.5)) {
              shouldExit = true;
              reason = `pine_exit_${signal.strategy}`;
              log(`⚡ Pine Script exit: ${signal.action} at ${(signal.confidence * 100).toFixed(1)}%`);
            }
          } catch (error) {
            log(`⚠️ Pine Script unavailable: ${error.message}`);
          }
          
          // Mathematical Intuition analysis
          if (!shouldExit) {
            try {
              const marketData = { symbol: positionSymbol, price, timestamp: new Date() };
              const analysis = await this.shouldTrade(marketData, phase);
              const mathAnalysis = await this.mathEngine.analyzeIntuitively(analysis.signal || {}, marketData);
              
              if (mathAnalysis) {
                const currentConfidence = analysis.confidence || 0.5;
                const intuitionScore = mathAnalysis.overallFeeling || 0;
                
                // Exit if confidence dropped significantly or intuition score is low
                if (currentConfidence < entryConfidence * 0.5 || intuitionScore < 0.3) {
                  shouldExit = true;
                  reason = 'ai_confidence_drop';
                  log(`🧠 AI exit: Confidence ${(currentConfidence*100).toFixed(1)}%, Intuition ${(intuitionScore*100).toFixed(1)}%`);
                }
              }
            } catch (error) {
              log(`⚠️ AI analysis unavailable: ${error.message}`);
            }
          }
        }
        
        // Execute exit
        if (shouldExit) {
          try {
            const result = await this.positionManager.closePosition(position.id, price, reason);
            const winLoss = result.pnl > 0 ? '🟢 WIN' : '🔴 LOSS';
            log(`🎯 EXIT: ${result.position.id} | ${reason} | $${result.pnl.toFixed(2)} | ${winLoss}`);
          } catch (exitError) {
            log(`❌ Exit failed for ${position.id}: ${exitError.message}`);
          }
        }
      }
    } catch (error: any) {
      log(`⚠️ Exit evaluation error: ${error.message}`);
    }
  }
  
  async executeTradingCycle() {
    try {
      this.cycleCount++;
      const currentPhase = await phaseManager.getCurrentPhase();
      
      log(`🔄 Trading Cycle ${this.cycleCount} - Phase ${currentPhase.phase}`);
      
      // 🎯 PRICE CACHE RUNS IN BACKGROUND (no blocking)
      
      // 🐅 UPDATE PROFIT PREDATOR™ DYNAMIC PAIRS (every 1 minute, non-blocking)
      await this.updateDynamicPairsFromProfitPredator();
      
      // 🎯 GET PRE-VALIDATED TRADING PAIRS (NO API CALLS IN PIPELINE!)
      const marketData = this.getValidatedTradingPairs();
      
      if (marketData.length === 0) {
        log('⚠️  No valid trading pairs available (all price fetches failed)');
        // 🚨 CRITICAL FIX: Still run exit evaluation even if no new trades possible
        log('🔍 Running exit evaluation for all open positions (no new trades)...');
        await this.evaluateExitOpportunities(
          'BTCUSD',  // dummy symbol  
          50000,     // dummy price
          0.5,       // placeholder confidence
          currentPhase
        );
        return;
      }
      
      log(`✅ Trading with ${marketData.length} validated pairs: ${marketData.map(d => d.symbol).join(', ')}`);
      
      // 🚀 OPPORTUNITY CAPTURE - maximize profitable trading
      const openPositions = await this.positionManager.getOpenPositions();
      const maxPositions = currentPhase.phase === 0 ? 5 : 10; // Conservative limits for better closure rates
      
      if (openPositions.length >= maxPositions) {
        log(`🛑 Position limit reached: ${openPositions.length}/${maxPositions} positions open`);
        log('🔍 Skipping new position creation, continuing with exit evaluation...');
      } else {
      
      // Process each market with QUANTUM FORGE™ AI analysis
      for (const data of marketData) {
        // Skip if we've hit position limits during this cycle
        const currentOpenPositions = await this.positionManager.getOpenPositions();
        if (currentOpenPositions.length >= maxPositions) {
          log(`🛑 Position limit reached during cycle: ${currentOpenPositions.length}/${maxPositions}`);
          break;
        }
        
        const aiAnalysis = await this.shouldTrade(data, currentPhase);
        
        if (aiAnalysis.shouldTrade) {
          // Use AI-enhanced signal for trade parameters
          const signal = aiAnalysis.signal || {};
          const side = signal.action === 'SELL' ? 'short' : 'long';
          
          // 🧠 MATHEMATICAL INTUITION DYNAMIC POSITION SIZING
          // Multi-AI validation + USD profit maximization
          const baseSize = currentPhase.features.positionSizing; // Phase-based base size
          
          // Multi-AI Validation Multiplier (when multiple systems agree)
          const aiSystemCount = aiAnalysis.aiSystems ? aiAnalysis.aiSystems.length : 1;
          const multiAIBonus = Math.min(aiSystemCount * 0.25, 1.0); // Max +100% for 4+ systems
          
          // Confidence-based sizing (stronger signals = larger positions)  
          const confidenceMultiplier = Math.min(aiAnalysis.confidence * 1.8, 2.5); // Max 2.5x multiplier
          
          // USD/USDT Profit Optimization: Account balance factor
          // For our current balance, optimize for meaningful returns
          const isStablecoin = data.symbol.includes('USDT') || data.symbol.includes('USDC');
          const lowPriceBoost = data.price < 10 ? 1.5 : 1.0; // Boost smaller price assets for better returns
          const stablecoinBoost = isStablecoin ? 1.2 : 1.0; // USDT pairs often have better liquidity
          const balanceOptimization = lowPriceBoost * stablecoinBoost;
          
          // Mathematical Intuition Final Sizing
          const mathIntuitionMultiplier = (1 + multiAIBonus) * confidenceMultiplier * balanceOptimization;
          const quantity = baseSize * mathIntuitionMultiplier;
          
          log(`🧠 MATH INTUITION SIZING: Base $${baseSize} × AI(${aiSystemCount}) × Conf(${(aiAnalysis.confidence * 100).toFixed(1)}%) × Balance = $${quantity.toFixed(2)}`);
          
          // 🎯 MATHEMATICAL INTUITION RISK MANAGEMENT
          // Multi-AI validation = more aggressive profit targets, tighter risk controls
          const stopLossPercent = currentPhase.features.stopLossPercent / 100;
          const takeProfitPercent = currentPhase.features.takeProfitPercent / 100;
          
          // Multi-AI Risk Optimization: More systems agreeing = tighter risk control
          const multiAIRiskBonus = Math.min(aiSystemCount * 0.1, 0.4); // Max 40% tighter risk
          const confidenceAdjustment = (aiAnalysis.confidence * 0.3) + multiAIRiskBonus; // 0-70% adjustment
          
          // USD Profit Maximization: Tighter stops, bigger profits when confident
          const adjustedStopLoss = stopLossPercent * (1 - confidenceAdjustment * 0.5); // Tighter stops when confident
          const adjustedTakeProfit = takeProfitPercent * (1 + confidenceAdjustment * 1.5); // Bigger profits when confident
          
          log(`🎯 RISK MANAGEMENT: Stop ${(adjustedStopLoss*100).toFixed(1)}% | Profit ${(adjustedTakeProfit*100).toFixed(1)}% (AI Systems: ${aiSystemCount})`);
          
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
      } // End of for loop
      } // End of else (position creation when not at limit)
      
      // 🎯 CONTINUOUS EXIT MONITORING - Run on every cycle to check all positions
      log(`🔍 Running exit evaluation for all open positions...`);
      try {
        // Run exit evaluation with a representative symbol and current phase
        // This will check ALL open positions, not just for one symbol
        if (marketData.length > 0) {
          await this.evaluateExitOpportunities(
            marketData[0].symbol, 
            marketData[0].price, 
            0.5, // placeholder confidence 
            currentPhase
          );
        }
      } catch (exitError) {
        log(`⚠️ Exit evaluation error: ${exitError.message}`);
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
        
        // Wait 30 seconds between cycles (prevent runaway trading)
        await new Promise(resolve => setTimeout(resolve, 30000));
        
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