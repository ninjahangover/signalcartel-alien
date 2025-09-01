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
  
  /**
   * 🎯 SMART EXIT TIMING STRATEGY
   * Evaluates existing positions for optimal exit opportunities based on:
   * - Position age and profit/loss status
   * - Current market confidence vs entry confidence
   * - Phase-based exit criteria
   */
  private async evaluateExitOpportunities(symbol: string, currentPrice: number, marketConfidence: number, phase: any) {
    try {
      // ✅ FIX: Check ALL open positions on every cycle, not just current symbol
      const openPositions = await this.positionManager.getOpenPositions();
      
      log(`🔍 Smart Exit Check: ALL POSITIONS - Found ${openPositions.length} open positions to evaluate`);
      
      for (const position of openPositions) {
        const entryPrice = position.entryPrice;
        const side = position.side;
        const positionSymbol = position.symbol;
        const entryConfidence = position.metadata?.confidence || 0.5;
        const positionAgeMs = Date.now() - new Date(position.openTime).getTime();
        const positionAgeMinutes = positionAgeMs / (1000 * 60);
        
        // ✅ FIX: Get current price for THIS position's symbol, not the analysis symbol
        const positionCurrentPrice = await this.getCurrentPrice(positionSymbol);
        if (!positionCurrentPrice) {
          log(`⚠️ Cannot get current price for ${positionSymbol} - skipping exit evaluation`);
          continue;
        }
        
        // Calculate current P&L using correct current price
        const priceChange = (positionCurrentPrice - entryPrice) / entryPrice;
        const pnlPercent = side === 'long' ? priceChange * 100 : -priceChange * 100;
        
        log(`📊 ${positionSymbol}: Entry $${entryPrice} → Current $${positionCurrentPrice} = ${pnlPercent.toFixed(2)}% (${positionAgeMinutes.toFixed(1)}min)`);
        
        // 🎯 CALIBRATED STRATEGY EXIT CONDITIONS
        // Use each Pine Script's optimized take profit and stop loss percentages
        let shouldExit = false;
        let exitReason = '';
        
        // Get calibrated parameters for this specific symbol/strategy
        const optimizedParams = await this.getOptimizedPineScriptParameters(positionSymbol);
        // ENHANCED TARGETS: Higher take profit allows AI to optimize earlier exits
        const TAKE_PROFIT_PERCENT = Math.min(optimizedParams.takeProfitPercent || 5.5, 5.5);  // Max 5.5% take profit
        const STOP_LOSS_PERCENT = Math.min(optimizedParams.stopLossPercent || 3.5, 3.5);     // Max 3.5% stop loss
        
        log(`📋 ${positionSymbol} Exit Targets: Take Profit ${TAKE_PROFIT_PERCENT}%, Stop Loss ${STOP_LOSS_PERCENT}%`);
        
        // Check percentage-based exits using calibrated strategy parameters
        if (pnlPercent >= TAKE_PROFIT_PERCENT) {
          shouldExit = true;
          exitReason = `calibrated_take_profit_${TAKE_PROFIT_PERCENT}pct`;
          log(`🎯 CALIBRATED TAKE PROFIT: ${positionSymbol} profit ${pnlPercent.toFixed(2)}% ≥ ${TAKE_PROFIT_PERCENT}%`);
        }
        else if (pnlPercent <= -STOP_LOSS_PERCENT) {
          shouldExit = true;
          exitReason = `calibrated_stop_loss_${STOP_LOSS_PERCENT}pct`;
          log(`🚨 CALIBRATED STOP LOSS: ${positionSymbol} loss ${pnlPercent.toFixed(2)}% ≤ -${STOP_LOSS_PERCENT}%`);
        }
        
        // BACKUP: Legacy stop loss/take profit price checks (if set)
        else if (position.stopLoss && ((side === 'long' && positionCurrentPrice <= position.stopLoss) || (side === 'short' && positionCurrentPrice >= position.stopLoss))) {
          shouldExit = true;
          exitReason = 'legacy_stop_loss_hit';
          log(`🚨 LEGACY STOP LOSS: ${positionSymbol} ${positionCurrentPrice} ${side === 'long' ? '≤' : '≥'} ${position.stopLoss}`);
        }
        else if (position.takeProfit && ((side === 'long' && positionCurrentPrice >= position.takeProfit) || (side === 'short' && positionCurrentPrice <= position.takeProfit))) {
          shouldExit = true;
          exitReason = 'legacy_take_profit_hit';
          log(`🎯 LEGACY TAKE PROFIT: ${positionSymbol} ${positionCurrentPrice} ${side === 'long' ? '≥' : '≤'} ${position.takeProfit}`);
        }
        
        // Skip AI analysis if stop loss or take profit already triggered
        if (shouldExit) {
          try {
            const closedPosition = await this.positionManager.closePosition(
              position.id,
              positionCurrentPrice,
              exitReason
            );
            
            const winLoss = closedPosition.pnl > 0 ? '🟢 WIN' : '🔴 LOSS';
            log(`🎯 IMMEDIATE EXIT: ${closedPosition.position.id} | ${exitReason.toUpperCase()} | P&L: $${closedPosition.pnl.toFixed(2)} | ${winLoss}`);
            
          } catch (exitError) {
            log(`❌ Immediate exit failed for ${position.id}: ${exitError.message}`);
          }
          continue; // Move to next position
        }
        
        // 🎯 MATHEMATICAL INTUITION AI EXIT VALIDATION
        // Use E = (W × A) - (L × B) equation for maximum profit optimization  
        const currentMarketData = { symbol: positionSymbol, price: positionCurrentPrice, timestamp: new Date() };
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
          const marketData = { symbol: positionSymbol, timestamp: new Date(), open: positionCurrentPrice, high: positionCurrentPrice, low: positionCurrentPrice, close: positionCurrentPrice, volume: 1000 };
          // Create minimal MarketIntelligenceData for exit analysis
          const exitIntelligenceData = {
            symbol: positionSymbol,
            captureStartTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
            captureEndTime: new Date(),
            dataPoints: [{...marketData, price: marketData.close}],
            patterns: [],
            momentum: {
              symbol,
              timeframe: '1h' as const,
              momentum: 0,
              volume_trend: 'stable' as const,
              price_velocity: 0,
              volatility: 0.1,
              support_level: marketData.close * 0.98,
              resistance_level: marketData.close * 1.02,
              trend_strength: 50
            },
            regime: {
              regime: 'sideways' as const,
              confidence: 0.5,
              duration_hours: 1,
              key_levels: {
                support: [marketData.close * 0.98],
                resistance: [marketData.close * 1.02],
                pivot: marketData.close
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
          
          markovPrediction = await this.enhancedMarkovPredictor2.processMarketData(
            positionSymbol, 
            marketData, 
            exitIntelligenceData,
            [marketData] // recentHistory array
          );
          log(`🔮 MARKOV CHAIN: Current state ${markovPrediction.currentState}, confidence ${(markovPrediction.confidence * 100).toFixed(1)}%`);
        } catch (error) {
          log(`⚠️ Markov Chain predictor unavailable: ${error.message}`);
          markovPrediction = null;
        }
        
        // 🎯 AI-ENHANCED EXIT DECISIONS: Pine Script + Percentage Guarantees
        // AI can make smarter exits within our guaranteed percentage bounds
        // This provides both safety (guaranteed exits) and optimization (AI timing)
        if (!shouldExit) { // Only run AI analysis if percentage limits haven't triggered
          try {
            const { quantumForgeSignalGenerator } = await import('./src/lib/quantum-forge-signal-generator');
            const pineExitSignal = await quantumForgeSignalGenerator.generateTechnicalSignal(positionSymbol, positionCurrentPrice);
            
            log(`🎯 PINE SCRIPT EXIT SIGNAL: ${pineExitSignal.action} (${(pineExitSignal.confidence * 100).toFixed(1)}% confidence)`);
          log(`📊 Pine Strategy: ${pineExitSignal.strategy} | Reason: ${pineExitSignal.reason}`);
          
          // FAST EXIT TRIGGER: ANY strategy can trigger exit at 50% confidence
          if (pineExitSignal.action === 'SELL' && side === 'long' && pineExitSignal.confidence > 0.5) {
            shouldExit = true;
            exitReason = `fast_exit_${pineExitSignal.strategy}`;
            log(`⚡ FAST EXIT TRIGGER: ${pineExitSignal.strategy} SELL signal at ${(pineExitSignal.confidence * 100).toFixed(1)}%`);
          }
          else if (pineExitSignal.action === 'BUY' && side === 'short' && pineExitSignal.confidence > 0.5) {
            shouldExit = true;
            exitReason = `fast_exit_${pineExitSignal.strategy}`;
            log(`⚡ FAST EXIT TRIGGER: ${pineExitSignal.strategy} BUY signal at ${(pineExitSignal.confidence * 100).toFixed(1)}%`);
          }
          
          // INDEPENDENT AI EXIT: Markov can trigger exit independently at 60% confidence
          if (!shouldExit && markovPrediction && markovPrediction.confidence > 0.6) {
            const expectedReturn = markovPrediction.expectedReturn || 0;
            const mostLikelyState = markovPrediction.mostLikelyNextState;
            
            log(`🧠 AI VALIDATION: Markov expects ${(expectedReturn * 100).toFixed(2)}% return, next state: ${mostLikelyState}`);
            
            // AI can independently trigger exit
            if ((side === 'long' && mostLikelyState.includes('DOWN')) || 
                (side === 'short' && mostLikelyState.includes('UP'))) {
              shouldExit = true;
              exitReason = 'fast_exit_markov_ai';
              log(`⚡ FAST AI EXIT: Markov detected reversal at ${(markovPrediction.confidence * 100).toFixed(1)}% confidence`);
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
      
      // 🐅 UPDATE PROFIT PREDATOR™ DYNAMIC PAIRS (every 1 minute, non-blocking)
      await this.updateDynamicPairsFromProfitPredator();
      
      // 🎯 GET PRE-VALIDATED TRADING PAIRS (NO API CALLS IN PIPELINE!)
      const marketData = this.getValidatedTradingPairs();
      
      if (marketData.length === 0) {
        log('⚠️  No valid trading pairs available (all price fetches failed)');
        return;
      }
      
      log(`✅ Trading with ${marketData.length} validated pairs: ${marketData.map(d => d.symbol).join(', ')}`);
      
      // 🚀 OPPORTUNITY CAPTURE - maximize profitable trading
      const openPositions = await this.positionManager.getOpenPositions();
      const maxPositions = currentPhase.phase === 0 ? 25 : 35; // 🤠 LET THE BULL RUN! Full position capacity
      
      if (openPositions.length >= maxPositions) {
        log(`🛑 Position limit reached: ${openPositions.length}/${maxPositions} positions open`);
        return;
      }
      
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
      }
      
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