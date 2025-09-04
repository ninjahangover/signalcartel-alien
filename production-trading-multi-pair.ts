/**
 * Production Trading with Position Management
 * Uses the full position management system with QUANTUM FORGE™ phase integration
 */

// Initialize telemetry first
import { initProductionTelemetry, getTelemetry } from './src/lib/telemetry/production-telemetry';
const telemetry = initProductionTelemetry({
  serviceName: 'quantum-forge-production-trading',
  environment: 'production',
  externalMonitoringServer: 'http://174.72.187.118:3301'
});

import { PositionManager } from './src/lib/position-management/position-manager';
import { phaseManager } from './src/lib/quantum-forge-phase-config';
import { EnhancedMarkovPredictor } from './src/lib/enhanced-markov-predictor';
import { MathematicalIntuitionEngine } from './src/lib/mathematical-intuition-engine';
import { enhancedMathematicalIntuition } from './src/lib/enhanced-mathematical-intuition';
import { getIntelligentPairAdapter } from './src/lib/intelligent-pair-adapter';
import { adaptiveSignalLearning } from './src/lib/adaptive-signal-learning';
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
  private enhancedIntuition: typeof enhancedMathematicalIntuition;
  private pairAdapter: ReturnType<typeof getIntelligentPairAdapter>;
  
  // 🎯 PRE-VALIDATION PRICE CACHE SYSTEM
  private priceCache = new Map<string, { price: number; timestamp: Date; isValid: boolean }>();
  private priceHistoryCache = new Map<string, number[]>(); // For velocity/AI analysis
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
    this.enhancedIntuition = enhancedMathematicalIntuition;
    this.pairAdapter = getIntelligentPairAdapter();
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
   * Get current price for a symbol using REAL KRAKEN DATA ONLY
   */
  private async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      // For open positions, use Kraken API for maximum accuracy
      const openPositions = await this.positionManager.getOpenPositions();
      const hasOpenPosition = openPositions.some(pos => pos.symbol === symbol);
      
      if (hasOpenPosition) {
        // Use Kraken for open position symbols (most accurate)
        try {
          const { krakenPositionPriceFetcher } = await import('./src/lib/kraken-position-price-fetcher');
          const krakenResult = await krakenPositionPriceFetcher.getPositionPrice(symbol);
          
          if (krakenResult.success && krakenResult.price > 0) {
            log(`🔵 KRAKEN REAL: ${symbol}: $${krakenResult.price.toLocaleString()}`);
            return krakenResult.price;
          } else {
            log(`❌ Kraken failed for open position ${symbol}: ${krakenResult.error}`);
          }
        } catch (krakenError) {
          log(`⚠️ Kraken API error for ${symbol}: ${krakenError.message}`);
        }
      }
      
      // Fallback to real-time price fetcher (still real data, multiple sources)
      const { realTimePriceFetcher } = await import('./src/lib/real-time-price-fetcher');
      const priceData = await realTimePriceFetcher.getCurrentPrice(symbol);
      
      if (priceData.success && priceData.price > 0) {
        log(`🔄 REAL-TIME: ${symbol}: $${priceData.price.toLocaleString()} (${priceData.source})`);
        return priceData.price;
      } else {
        log(`❌ Real-time price fetch failed for ${symbol}: ${priceData.error || 'Unknown error'}`);
        return null;
      }
    } catch (error) {
      log(`❌ Get current price failed for ${symbol}: ${error.message}`);
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
      
      // 🎆 AI-DRIVEN OPPORTUNITY SELECTION - NO RESTRICTIONS!
      // Let the AI choose the absolute best opportunities regardless of pair
      const topScoringPairs = opportunities
        .filter(opp => opp.score >= 70) // 70%+ scoring threshold
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, 20) // Top 20 opportunities (expanded from 15)
        .map(opp => opp.symbol);
        
      // Also include good opportunities for diversification
      const goodScoringPairs = opportunities
        .filter(opp => opp.score >= 50 && opp.score < 70)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10) // Top 10 good opportunities
        .map(opp => opp.symbol);
        
      const allOpportunityPairs = [...topScoringPairs, ...goodScoringPairs];
      
      // Update dynamic pairs with AI-selected best opportunities
      if (allOpportunityPairs.length > 0) {
        const previousDynamic = [...this.dynamicPairs];
        this.dynamicPairs = allOpportunityPairs;
        
        log(`🎆 AI OPPORTUNITY SELECTION: ${topScoringPairs.length} top + ${goodScoringPairs.length} good scoring pairs`);
        log(`   Top-Scoring (70%+): ${topScoringPairs.join(', ')}`);
        if (goodScoringPairs.length > 0) {
          log(`   Good-Scoring (50-69%): ${goodScoringPairs.join(', ')}`);
        }
        
        // Log changes
        const added = allOpportunityPairs.filter(pair => !previousDynamic.includes(pair));
        const removed = previousDynamic.filter(pair => !allOpportunityPairs.includes(pair));
        
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
        // CRITICAL FIX: Always assign enhancedSignal, even for HOLD signals
        enhancedSignal = pineSignal; // All signals need to be passed to Enhanced Intelligence
        
        if (pineSignal.action !== 'HOLD') {
          confidence = pineSignal.confidence; // Start with Pine Script confidence
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
        
        // Don't overwrite Pine Script signal - preserve it for Enhanced Intelligence
        // enhancedSignal = baseSignal; // REMOVED - would overwrite Pine Script confidence
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
          // Don't overwrite Pine Script signal for Enhanced Intelligence
          // enhancedSignal = sentimentResult; // REMOVED - preserve Pine Script confidence
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
            const sentimentEnhancedSignal = await universalSentimentEnhancer.enhanceSignal(baseSignal, {
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
          
          // Don't overwrite Pine Script signal for Enhanced Intelligence
          // enhancedSignal = workingSignal; // REMOVED - preserve Pine Script confidence
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
          // Don't overwrite Pine Script signal for Enhanced Intelligence
          // enhancedSignal = multiLayerResult; // REMOVED - preserve Pine Script confidence
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

      // 🧠 ENHANCED MATHEMATICAL INTUITION WITH COMMISSION AWARENESS
      let enhancedAnalysis = null;
      let finalShouldTrade = false;
      let finalConfidence = confidence;
      
      try {
        // Get enhanced analysis with commission awareness and pair intelligence
        const signalToUse = enhancedSignal || baseSignal;
        // Production deployment - debug logging removed
        
        enhancedAnalysis = await this.enhancedIntuition.analyzeWithPairIntelligence(
          marketData.symbol,
          marketData.price,
          signalToUse,
          { sentiment: marketData, price: marketData.price },
          10000 // Account balance - should be dynamic in real implementation
        );
        
        finalShouldTrade = enhancedAnalysis.shouldTrade;
        finalConfidence = enhancedAnalysis.confidence / 100; // Convert back to 0-1 scale
        
        if (finalShouldTrade) {
          log(`📈 ✅ ENHANCED TRADE SIGNAL: ${marketData.symbol} @ $${marketData.price} (${enhancedAnalysis.confidence.toFixed(1)}% confidence)`);
          log(`🤖 AI Systems: [${aiSystemsUsed.join(', ')}] + Enhanced Intelligence`);
          log(`💰 ${this.enhancedIntuition.getAnalysisSummary(enhancedAnalysis)}`);
          
          // Track AI system performance in telemetry
          telemetry.trackAI({
            system: 'enhanced-mathematical-intuition',
            responseTime: enhancedAnalysis.processingTime || 0,
            confidence: finalConfidence,
            prediction: 'TRADE',
            success: true
          });
        } else {
          log(`📉 ❌ Enhanced Intelligence BLOCKED: ${enhancedAnalysis.reason}`);
          
          // Track blocked signals too
          telemetry.trackAI({
            system: 'enhanced-mathematical-intuition',
            responseTime: enhancedAnalysis.processingTime || 0,
            confidence: finalConfidence,
            prediction: 'HOLD',
            success: true
          });
        }
      } catch (enhancedError) {
        log(`⚠️ Enhanced analysis failed, falling back to basic: ${enhancedError.message}`);
        
        // Fallback to original logic
        finalShouldTrade = confidence >= phase.features.confidenceThreshold;
        finalConfidence = confidence;
        
        if (finalShouldTrade) {
          log(`📈 ✅ TRADE SIGNAL: ${marketData.symbol} @ $${marketData.price} (${(confidence * 100).toFixed(1)}% confidence)`);
          log(`🤖 AI Systems: [${aiSystemsUsed.join(', ')}]`);
        } else {
          log(`📉 ❌ Signal below threshold: ${(confidence * 100).toFixed(1)}% < ${(phase.features.confidenceThreshold * 100).toFixed(1)}%`);
        }
      }

      return {
        shouldTrade: finalShouldTrade,
        confidence: finalConfidence,
        signal: enhancedSignal || baseSignal,
        aiSystems: aiSystemsUsed,
        enhancedAnalysis // Pass through for position sizing
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
        const candlesHeld = Math.floor(ageMinutes / 5); // 5-minute candles
        
        // Get real current price for this position
        const price = await this.getCurrentPrice(positionSymbol);
        if (!price) {
          log(`⚠️ No price for ${positionSymbol}, skipping`);
          continue;
        }
        
        // Calculate P&L and price momentum
        const priceChange = (price - entryPrice) / entryPrice;
        const grossPnl = side === 'long' ? priceChange * 100 : -priceChange * 100;
        
        // 💰 COMMISSION COST SIMULATION - Real Trading Ready
        // Typical crypto exchange commission: 0.1-0.25% per trade (entry + exit = 2x)
        const commissionRate = 0.002; // 0.2% total (0.1% entry + 0.1% exit)
        const positionValue = metadata?.positionSize || 0.001; // Get position size from metadata
        const commissionCost = positionValue * commissionRate * 100; // Convert to percentage
        const pnl = grossPnl - commissionCost;
        
        log(`💰 COMMISSION SIM: Gross P&L ${grossPnl.toFixed(2)}% - Commission ${commissionCost.toFixed(3)}% = Net ${pnl.toFixed(2)}%`);
        
        // 🔮 PREDICTIVE MARKET ANALYSIS - ANTICIPATE, DON'T REACT!
        const recentPrices = this.priceHistoryCache.get(positionSymbol) || [];
        
        // Build price history for pattern analysis (need at least 5 data points)
        if (recentPrices.length < 5) {
          if (!recentPrices.includes(price)) {
            recentPrices.push(price);
            this.priceHistoryCache.set(positionSymbol, recentPrices);
          }
        }
        
        // Calculate velocity (rate of change) and acceleration (change in velocity)
        let velocity = 0;      // Current rate of price change
        let acceleration = 0;  // Is price change speeding up or slowing down?
        let pattern = 'unknown';
        let predictedMove = 0;
        
        if (recentPrices.length >= 3) {
          // Calculate first and second derivatives
          const prices = [...recentPrices.slice(-3), price];
          const velocities = [];
          
          for (let i = 1; i < prices.length; i++) {
            velocities.push((prices[i] - prices[i-1]) / prices[i-1] * 100);
          }
          
          velocity = velocities[velocities.length - 1] || 0;
          
          if (velocities.length >= 2) {
            acceleration = velocities[velocities.length - 1] - velocities[velocities.length - 2];
          }
          
          // 🎯 PATTERN RECOGNITION - What's about to happen?
          if (velocity > 0 && acceleration < 0) {
            pattern = 'topping';  // Price rising but slowing - TOP FORMING
            predictedMove = -1.5; // Expect reversal down
          } else if (velocity < 0 && acceleration > 0) {
            pattern = 'bottoming'; // Price falling but slowing - BOTTOM FORMING
            predictedMove = 1.5;   // Expect reversal up
          } else if (velocity > 0 && acceleration > 0) {
            pattern = 'accelerating_up'; // Strong uptrend building
            predictedMove = velocity * 1.5; // Momentum will continue
          } else if (velocity < 0 && acceleration < 0) {
            pattern = 'accelerating_down'; // Strong downtrend building
            predictedMove = velocity * 1.5; // Momentum will continue
          } else if (Math.abs(velocity) < 0.1 && Math.abs(acceleration) < 0.05) {
            pattern = 'consolidating'; // Price stalled - breakout imminent
            predictedMove = 0; // Direction unknown but move coming
          }
        }
        
        log(`🔮 ${positionSymbol}: P&L ${pnl.toFixed(2)}% | Pattern: ${pattern} | Velocity: ${velocity.toFixed(2)}%/tick | Accel: ${acceleration.toFixed(3)} | Predicted: ${predictedMove.toFixed(1)}%`);
        
        // 🔮 PREDICTIVE EXIT LOGIC - EXIT BEFORE THE MOVE, NOT AFTER!
        let shouldExit = false;
        let reason = '';
        
        // 💰 COMMISSION-AWARE PROFIT TAKING - Minimum thresholds to cover trading costs
        const minProfitForCommission = 0.3; // 0.3% minimum to cover 0.2% commission + spread
        
        if (pnl > minProfitForCommission) {
          // TOPPING PATTERN: Price is about to reverse down - GET OUT NOW!
          if (pattern === 'topping' && pnl >= minProfitForCommission) {
            shouldExit = true;
            reason = `predicted_top_${pnl.toFixed(1)}pct`;
            log(`🔮 COMMISSION-AWARE TOP: Taking ${pnl.toFixed(2)}% (>${minProfitForCommission}%) BEFORE reversal!`);
          }
          // DECELERATION: Momentum dying - exit before it reverses
          else if (acceleration < -0.1 && pnl >= 0.5) {
            shouldExit = true;
            reason = `deceleration_exit_${pnl.toFixed(1)}pct`;
            log(`📉 COMMISSION-AWARE DECEL: Taking ${pnl.toFixed(2)}% - momentum dying`);
          }
          // CONSOLIDATION BREAKOUT: Price stalled - take profit before breakdown
          else if (pattern === 'consolidating' && pnl >= 0.8) {
            shouldExit = true;
            reason = `consolidation_exit_${pnl.toFixed(1)}pct`;
            log(`⚠️ COMMISSION-AWARE CONSOL: Taking ${pnl.toFixed(2)}% - covers commission`);
          }
          // VELOCITY PEAK: Speed maxed out - reversal imminent
          else if (Math.abs(velocity) > 2.0 && pnl >= 0.6) {
            shouldExit = true;
            reason = `velocity_peak_${pnl.toFixed(1)}pct`;
            log(`🚀 COMMISSION-AWARE VELOCITY: Taking ${pnl.toFixed(2)}% - covers costs`);
          }
        }
        
        // 🛡️ PREDICTIVE LOSS PREVENTION - Exit BEFORE it gets worse
        if (!shouldExit) {
          // WRONG SIDE OF PATTERN: We're long but pattern says down
          if (side === 'long' && pattern === 'accelerating_down' && pnl < 0.5) {
            shouldExit = true;
            reason = `wrong_pattern_${pnl.toFixed(1)}pct`;
            log(`❌ WRONG PATTERN: Exiting ${pnl.toFixed(2)}% - pattern predicts MORE downside`);
          }
          else if (side === 'short' && pattern === 'accelerating_up' && pnl < 0.5) {
            shouldExit = true;
            reason = `wrong_pattern_${pnl.toFixed(1)}pct`;
            log(`❌ WRONG PATTERN: Exiting ${pnl.toFixed(2)}% - pattern predicts MORE upside`);
          }
          // ACCELERATION AGAINST US: Losses accelerating
          else if (pnl < -0.5 && acceleration < -0.05 && side === 'long') {
            shouldExit = true;
            reason = `accelerating_loss_${pnl.toFixed(1)}pct`;
            log(`🚨 ACCELERATING LOSS: Cutting at ${pnl.toFixed(2)}% - getting worse fast!`);
          }
          // BOTTOMING PATTERN WHILE SHORT: Market about to bounce
          else if (side === 'short' && pattern === 'bottoming' && pnl < 1.0) {
            shouldExit = true;
            reason = `predicted_bottom_${pnl.toFixed(1)}pct`;
            log(`🔮 BOTTOM PREDICTED: Exiting short at ${pnl.toFixed(2)}% BEFORE the bounce!`);
          }
        }
        
        // 🧠 ADAPTIVE EXIT STRATEGY - Market Condition Aware
        // Detect market condition: trending vs sideways
        const volatility = Math.abs(velocity) * 100; // Convert to volatility metric
        const marketCondition = this.detectMarketCondition(pattern, velocity, acceleration, volatility);
        
        if (!shouldExit) {
          // SIDEWAYS MARKET: Quick scalping mode
          if (marketCondition === 'sideways' || marketCondition === 'consolidating') {
            // Take ANY profit after 1 candle in sideways market
            if (candlesHeld >= 1 && pnl > 0.1) {
              shouldExit = true;
              reason = `sideways_scalp_${pnl.toFixed(1)}pct`;
              log(`📊 SIDEWAYS SCALP: Taking ${pnl.toFixed(2)}% - market consolidating`);
            }
            // Max 2 candles in sideways market
            else if (candlesHeld >= 2) {
              shouldExit = true;
              reason = `sideways_timeout_${candlesHeld}_candles`;
              log(`⏱️ SIDEWAYS EXIT: ${candlesHeld} candles held - no momentum`);
            }
          }
          // TRENDING MARKET: Hold for bigger moves
          else if (marketCondition === 'trending_up' || marketCondition === 'trending_down') {
            const trendAligned = (marketCondition === 'trending_up' && side === 'long') ||
                                (marketCondition === 'trending_down' && side === 'short');
            
            if (trendAligned) {
              // Hold winners longer in strong trends (up to 5 candles)
              if (candlesHeld >= 5 && pnl > 2.0) {
                shouldExit = true;
                reason = `trend_target_${pnl.toFixed(1)}pct`;
                log(`🎯 TREND TARGET: Taking ${pnl.toFixed(2)}% after riding trend`);
              }
              // Let profits run in trends
              else if (pnl > 0 && velocity < 0) {
                // Trend reversing - exit
                shouldExit = true;
                reason = `trend_reversal_${pnl.toFixed(1)}pct`;
                log(`🔄 TREND REVERSAL: Taking ${pnl.toFixed(2)}% - momentum shifting`);
              }
            } else {
              // Wrong side of trend - exit quickly
              if (candlesHeld >= 1 || pnl < -0.5) {
                shouldExit = true;
                reason = `against_trend_${pnl.toFixed(1)}pct`;
                log(`❌ AGAINST TREND: Exiting ${pnl.toFixed(2)}% - fighting the trend`);
              }
            }
          }
          // BREAKOUT/BREAKDOWN: Position for big moves
          else if (marketCondition === 'breakout' || marketCondition === 'breakdown') {
            const breakoutAligned = (marketCondition === 'breakout' && side === 'long') ||
                                   (marketCondition === 'breakdown' && side === 'short');
            
            if (breakoutAligned) {
              // Hold for breakout completion (up to 8 candles)
              if (candlesHeld >= 8 || pnl > 5.0) {
                shouldExit = true;
                reason = `breakout_complete_${pnl.toFixed(1)}pct`;
                log(`🚀 BREAKOUT COMPLETE: Taking ${pnl.toFixed(2)}% - target reached`);
              }
            } else {
              // Wrong side of breakout - exit immediately
              shouldExit = true;
              reason = `wrong_breakout_side_${pnl.toFixed(1)}pct`;
              log(`⚠️ WRONG SIDE: Exiting ${pnl.toFixed(2)}% - caught on wrong side of breakout`);
            }
          }
        }
        
        // Emergency exits (reduced from 60 to 15 minutes = 3 candles)
        if (!shouldExit && (ageMinutes > 15 || Math.abs(pnl) > 5.0)) {
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
          
          // 🧠 ADVANCED MATHEMATICAL PREDICTION MODELS
          if (!shouldExit) {
            try {
              const marketData = { symbol: positionSymbol, price, timestamp: new Date() };
              
              // Load your advanced prediction services
              const { enhancedMarkovPredictor } = await import('./src/lib/enhanced-markov-predictor');
              const { bayesianProbabilityEngine } = await import('./src/lib/bayesian-probability-engine');
              const { marketCorrelationAnalyzer } = await import('./src/lib/market-correlation-analyzer');
              
              // Build market data for predictions
              const currentMarketData = {
                symbol: positionSymbol,
                open: entryPrice,
                high: Math.max(price, entryPrice),
                low: Math.min(price, entryPrice),
                close: price,
                volume: 1000, // placeholder
                timestamp: new Date()
              };
              
              // Get market intelligence (simplified)
              const marketIntelligence = {
                patterns: [],
                momentum: velocity,
                regime: pattern === 'accelerating_up' ? 'BULLISH' : pattern === 'accelerating_down' ? 'BEARISH' : 'NEUTRAL',
                volatility: Math.abs(velocity) * 2,
                support: price * 0.98,
                resistance: price * 1.02
              };
              
              // 🔮 PREDICTIVE AI INTEGRATION
              let expectedValue = 0;
              let probabilityOfProfit = 0.5;
              let correlationSignal = 0;
              let predictionScore = 0;
              
              try {
                // MARKOV CHAIN PREDICTION - Process market data for state transitions
                const cachedPrices = this.priceHistoryCache.get(positionSymbol) || [];
                const markovPrediction = enhancedMarkovPredictor.processMarketData(
                  positionSymbol,
                  currentMarketData,
                  marketIntelligence,
                  cachedPrices.map(p => ({
                    symbol: positionSymbol,
                    open: p,
                    high: p,
                    low: p,
                    close: p,
                    volume: 1000,
                    timestamp: new Date()
                  }))
                );
                
                // BAYESIAN PROBABILITY - Calculate profit probability  
                const evidence = {
                  priceChange: velocity,
                  volumeRatio: 1.0,
                  rsiValue: 50 + (velocity * 10), // Rough RSI approximation from velocity
                  sentimentScore: 0.5,
                  volatility: Math.abs(velocity) * 2,
                  trendStrength: Math.abs(velocity),
                  orderBookImbalance: velocity > 0 ? 0.1 : -0.1
                };
                
                const bayesianProb = await bayesianProbabilityEngine.generateSignal(
                  positionSymbol,
                  evidence,
                  price
                );
                
                // CORRELATION ANALYSIS - Get cross-market signals
                const crossMarketState = marketCorrelationAnalyzer.analyzeCrossMarketState(positionSymbol);
                const correlations = {
                  aggregateScore: crossMarketState?.overallStrength || 0
                };
                
                // LAW OF LARGE NUMBERS - Statistical convergence prediction
                expectedValue = markovPrediction.expectedReturn || 0;
                probabilityOfProfit = side === 'long' ? bayesianProb.bullishProbability : bayesianProb.bearishProbability;
                correlationSignal = correlations.aggregateScore || 0;
                
                // COMPOSITE PREDICTION SCORE
                predictionScore = (expectedValue * 0.4) + (probabilityOfProfit * 0.3) + (correlationSignal * 0.3);
                
                log(`🔮 AI PREDICTION: ${positionSymbol} - Score: ${predictionScore.toFixed(3)}, Expected: ${expectedValue.toFixed(2)}%, Prob: ${(probabilityOfProfit*100).toFixed(1)}%`);
              } catch (aiError: any) {
                log(`⚠️ AI analysis unavailable: ${aiError.message}`);
              }
              
              log(`🧮 MATH PREDICTION: Markov EV: ${expectedValue.toFixed(2)}% | Bayesian P: ${(probabilityOfProfit*100).toFixed(1)}% | Corr: ${correlationSignal.toFixed(2)} | Score: ${predictionScore.toFixed(2)}`);
              
              // EXIT BASED ON MATHEMATICAL PREDICTIONS
              if (pnl > 0) {
                // Markov predicts negative expected value - GET OUT
                if (expectedValue < -0.5) {
                  shouldExit = true;
                  reason = `markov_negative_ev_${pnl.toFixed(1)}pct`;
                  log(`📊 MARKOV EXIT: Taking ${pnl.toFixed(2)}% - Expected Value turning negative (${expectedValue.toFixed(2)}%)`);
                }
                // Bayesian probability drops below 40% - EXIT
                else if (probabilityOfProfit < 0.4) {
                  shouldExit = true;
                  reason = `bayesian_low_prob_${pnl.toFixed(1)}pct`;
                  log(`📉 BAYESIAN EXIT: Taking ${pnl.toFixed(2)}% - Profit probability only ${(probabilityOfProfit*100).toFixed(1)}%`);
                }
                // Correlation breakdown - market dynamics changed
                else if (Math.abs(correlationSignal) > 2 && correlationSignal * (side === 'long' ? 1 : -1) < 0) {
                  shouldExit = true;
                  reason = `correlation_breakdown_${pnl.toFixed(1)}pct`;
                  log(`🔄 CORRELATION EXIT: Taking ${pnl.toFixed(2)}% - Correlated markets moving against us`);
                }
              }
              
              // PREDICTIVE LOSS PREVENTION
              if (!shouldExit && pnl < 0.5) {
                // Composite score strongly negative - mathematical consensus to exit
                if (predictionScore < -1.0) {
                  shouldExit = true;
                  reason = `math_consensus_exit_${pnl.toFixed(1)}pct`;
                  log(`🧮 MATHEMATICAL CONSENSUS: Exiting at ${pnl.toFixed(2)}% - All models predict further losses`);
                }
              }
              
              // Now also run the Mathematical Intuition analysis
              const analysis = await this.shouldTrade(marketData, phase);
              const mathAnalysis = await this.mathEngine.analyzeIntuitively(analysis.signal || {}, marketData);
              
              if (mathAnalysis) {
                const currentConfidence = analysis.confidence || 0.5;
                const intuitionScore = mathAnalysis.overallFeeling || 0;
                const confidenceChange = (currentConfidence - entryConfidence) / entryConfidence * 100;
                
                // 🎯 OPPORTUNITY EXIT: AI sees opposite trade opportunity
                if (mathAnalysis.recommendation === 'SELL' && side === 'long' && pnl > 0) {
                  shouldExit = true;
                  reason = `ai_reversal_signal_${pnl.toFixed(1)}pct`;
                  log(`🔄 AI REVERSAL: Taking ${pnl.toFixed(2)}% profit - AI wants to go SHORT!`);
                }
                else if (mathAnalysis.recommendation === 'BUY' && side === 'short' && pnl > 0) {
                  shouldExit = true;
                  reason = `ai_reversal_signal_${pnl.toFixed(1)}pct`;
                  log(`🔄 AI REVERSAL: Taking ${pnl.toFixed(2)}% profit - AI wants to go LONG!`);
                }
                // 📉 CONFIDENCE EROSION: Exit if confidence dropping
                else if (confidenceChange < -20 && pnl > 0.5) {
                  shouldExit = true;
                  reason = `confidence_erosion_${pnl.toFixed(1)}pct`;
                  log(`📉 CONFIDENCE EROSION: Taking ${pnl.toFixed(2)}% - confidence dropped ${Math.abs(confidenceChange).toFixed(1)}%`);
                }
                // 🚨 INTUITION WARNING: Low intuition = get out
                else if (intuitionScore < 0.4 && pnl > 0) {
                  shouldExit = true;
                  reason = `intuition_warning_${pnl.toFixed(1)}pct`;
                  log(`🚨 INTUITION WARNING: Taking ${pnl.toFixed(2)}% - intuition only ${(intuitionScore*100).toFixed(1)}%`);
                }
                // ⚠️ DANGER ZONE: Negative confidence/intuition with any profit
                else if ((currentConfidence < 0.3 || intuitionScore < 0.2) && pnl > -0.5) {
                  shouldExit = true;
                  reason = `ai_danger_exit_${pnl.toFixed(1)}pct`;
                  log(`⚠️ AI DANGER: Exiting at ${pnl.toFixed(2)}% - confidence critically low!`);
                }
                
                // Log AI thinking for monitoring
                if (!shouldExit && pnl > 0) {
                  log(`🤔 AI HOLDING: Conf ${(currentConfidence*100).toFixed(1)}% (${confidenceChange > 0 ? '+' : ''}${confidenceChange.toFixed(1)}%), Intuition ${(intuitionScore*100).toFixed(1)}%, Rec: ${mathAnalysis.recommendation}`);
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
            
            // Track position closure in telemetry
            telemetry.trackTrade({
              strategy: position.strategy || 'unknown',
              symbol: position.symbol,
              side: side === 'long' ? 'SELL' : 'BUY', // Opposite of entry
              amount: Math.abs(position.quantity),
              price: price,
              success: true,
              pnl: result.pnl
            });
            
            // 🧠 ADAPTIVE LEARNING FEEDBACK - Record signal outcome for learning
            try {
              const entryPrice = position.entryPrice;
              const exitPrice = price;
              const priceMovement = (exitPrice - entryPrice) / entryPrice * 100;
              
              // Determine what we predicted vs actual market movement
              const originalDirection = side.toUpperCase() as 'LONG' | 'SHORT';
              const predictedMove = originalDirection === 'LONG' ? 'UP' : 'DOWN';
              const actualMove = priceMovement > 0 ? 'UP' : 'DOWN';
              
              // Calculate volatility for risk assessment
              const volatility = Math.abs(priceMovement);
              
              // Record the learning data
              adaptiveSignalLearning.recordSignalOutcome(
                position.symbol,
                originalDirection,
                predictedMove,
                actualMove,
                result.pnl,
                volatility,
                100000 // Default volume - could be enhanced with real volume data
              );
              
              log(`📊 ADAPTIVE FEEDBACK: ${position.symbol} ${originalDirection} - Predicted: ${predictedMove}, Actual: ${actualMove}, P&L: $${result.pnl.toFixed(2)}, Volatility: ${volatility.toFixed(2)}%`);
            } catch (learningError) {
              log(`⚠️ Adaptive learning error: ${learningError.message}`);
            }
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
      
      // 🎯 ADAPTIVE PAIR FILTERING - Focus on high performers, avoid consistent losers
      try {
        const { AdaptivePairFilter } = await import('./src/lib/adaptive-pair-filter');
        const pairFilter = new AdaptivePairFilter(this.prisma);
        
        const filteredPairs = [];
        for (const data of marketData) {
          const isAllowed = await pairFilter.shouldAllowPair(data.symbol);
          if (isAllowed) {
            filteredPairs.push(data);
          } else {
            log(`🚫 BLOCKED: ${data.symbol} - Poor historical performance`);
          }
        }
        
        marketData = filteredPairs;
        log(`🎯 FILTERED: ${marketData.length} high-performing pairs selected: ${marketData.map(d => d.symbol).join(', ')}`);
        
        // Prioritize profit predator opportunities (sort by profit potential)
        marketData.sort((a, b) => {
          // Prioritize pairs found by profit predator (if available)
          return (b.predatorScore || 0) - (a.predatorScore || 0);
        });
        
      } catch (error) {
        log(`⚠️ Adaptive pair filtering failed: ${error.message}`);
      }
      
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
          // 🧠 ADAPTIVE LEARNING SYSTEM - Check signal recommendation before proceeding
          const signal = aiAnalysis.signal || {};
          const adaptiveRecommendation = adaptiveSignalLearning.getSignalRecommendation(
            data.symbol, 
            signal.action || 'BUY'
          );
          
          if (!adaptiveRecommendation.shouldTrade) {
            log(`🚫 ADAPTIVE LEARNING BLOCKED: ${data.symbol} - ${adaptiveRecommendation.reason}`);
            continue; // Skip this pair and move to next
          }
          
          // Log adaptive learning insights
          if (adaptiveRecommendation.recommendedDirection && 
              adaptiveRecommendation.recommendedDirection !== (signal.action === 'BUY' ? 'LONG' : 'SHORT')) {
            log(`🔄 ADAPTIVE PIVOT: ${data.symbol} - Switching from ${signal.action} to ${adaptiveRecommendation.recommendedDirection} (Confidence: ${(adaptiveRecommendation.confidence * 100).toFixed(1)}%)`);
            // Override the signal action based on adaptive learning
            signal.action = adaptiveRecommendation.recommendedDirection === 'LONG' ? 'BUY' : 'SELL';
          } else {
            log(`✅ ADAPTIVE APPROVED: ${data.symbol} ${signal.action} - ${adaptiveRecommendation.reason} (Confidence: ${(adaptiveRecommendation.confidence * 100).toFixed(1)}%)`);
          }
          
          // CRITICAL FIX: Correct directional trading based on AI market analysis
          // BUY signal = Market going UP = Open LONG position (profit when price rises)
          // SELL signal = Market going DOWN = Open SHORT position (profit when price falls)
          const side = signal.action === 'BUY' ? 'long' : 'short';
          
          // 🧠 ENHANCED MATHEMATICAL INTUITION DYNAMIC POSITION SIZING
          let quantity = 0;
          let adjustedTakeProfit = 0;
          let adjustedStopLoss = 0;
          
          if (aiAnalysis.enhancedAnalysis) {
            log(`📊 Enhanced analysis received: positionSize=$${aiAnalysis.enhancedAnalysis.positionSize?.toFixed(2) || 'undefined'}, shouldTrade=${aiAnalysis.enhancedAnalysis.shouldTrade}`);
          }
          
          if (aiAnalysis.enhancedAnalysis && aiAnalysis.enhancedAnalysis.positionSize > 0) {
            // Use commission-aware position sizing from enhanced analysis
            quantity = aiAnalysis.enhancedAnalysis.positionSize;
            adjustedTakeProfit = aiAnalysis.enhancedAnalysis.takeProfit / 100;
            adjustedStopLoss = aiAnalysis.enhancedAnalysis.stopLoss / 100;
            
            log(`🧠 ENHANCED SIZING: $${quantity.toFixed(2)} | TP: ${aiAnalysis.enhancedAnalysis.takeProfit.toFixed(2)}% SL: ${aiAnalysis.enhancedAnalysis.stopLoss.toFixed(2)}% | Expected: $${aiAnalysis.enhancedAnalysis.netExpectedReturn.toFixed(4)}`);
          } else {
            // 🚀 ENHANCED POSITION SIZING SYSTEM - 67-333x improvement target
            try {
              const { EnhancedPositionSizing } = await import('./src/lib/enhanced-position-sizing');
              const positionSizer = new EnhancedPositionSizing(this.prisma);
              
              const sizingResult = await positionSizer.calculateOptimalSize({
                symbol: data.symbol,
                confidence: aiAnalysis.confidence,
                currentPrice: data.price,
                action: data.action,
                accountBalance: 10000 // $10K starting balance
              });
              
              quantity = sizingResult.finalPositionSize;
              
              log(`🚀 ENHANCED SIZING: $${quantity.toFixed(2)} (${sizingResult.confidenceMultiplier.toFixed(1)}x conf × ${sizingResult.pairPerformanceMultiplier.toFixed(1)}x pair × ${sizingResult.winStreakMultiplier.toFixed(1)}x streak)`);
              log(`💡 Reasoning: ${sizingResult.reasoning.join(', ')}`);
              log(`🎯 Expected: $${sizingResult.expectedProfit.toFixed(4)} | Risk: ${sizingResult.riskLevel}`);
              
            } catch (error) {
              log(`⚠️ Enhanced sizing failed, using fallback: ${error.message}`);
              
              // Fallback with improved multipliers based on your requirements
              const accountBalance = 10000;
              const baseSize = accountBalance * 0.01; // $100 base
              
              // Enhanced confidence multipliers (Priority #1)
              let confidenceMultiplier = 1;
              if (aiAnalysis.confidence >= 0.88) {
                confidenceMultiplier = 10;  // 88%+ → 10x size
              } else if (aiAnalysis.confidence >= 0.70) {
                confidenceMultiplier = 5;   // 70-87% → 5x size
              } else if (aiAnalysis.confidence >= 0.50) {
                confidenceMultiplier = 2;   // 50-69% → 2x size
              }
              
              quantity = baseSize * confidenceMultiplier;
              
              // Ensure minimum viable position
              const minimumPosition = accountBalance * 0.001; // 0.1% minimum ($10)
              quantity = Math.max(quantity, minimumPosition);
              
              log(`🎯 FALLBACK SIZING: Base $${baseSize} × ${confidenceMultiplier}x (${(aiAnalysis.confidence * 100).toFixed(1)}% conf) = $${quantity.toFixed(2)}`);
            }
          }
          
          // 🎯 ENHANCED RISK MANAGEMENT
          let stopLoss = 0;
          let takeProfit = 0;
          
          if (!aiAnalysis.enhancedAnalysis) {
            // Fallback to original risk management
            const stopLossPercent = currentPhase.features.stopLossPercent / 100;
            const takeProfitPercent = currentPhase.features.takeProfitPercent / 100;
            const aiSystemCount = aiAnalysis.aiSystems ? aiAnalysis.aiSystems.length : 1;
            const multiAIRiskBonus = Math.min(aiSystemCount * 0.1, 0.4);
            const confidenceAdjustment = (aiAnalysis.confidence * 0.3) + multiAIRiskBonus;
            adjustedStopLoss = stopLossPercent * (1 - confidenceAdjustment * 0.5);
            adjustedTakeProfit = takeProfitPercent * (1 + confidenceAdjustment * 1.5);
            
            log(`🎯 FALLBACK RISK: Stop ${(adjustedStopLoss*100).toFixed(1)}% | Profit ${(adjustedTakeProfit*100).toFixed(1)}%`);
          }
          
          stopLoss = data.price * (side === 'long' ? (1 - adjustedStopLoss) : (1 + adjustedStopLoss));
          takeProfit = data.price * (side === 'long' ? (1 + adjustedTakeProfit) : (1 - adjustedTakeProfit));
          
          // CRITICAL FIX: Convert dollar amount to units based on asset price
          const positionSizeInDollars = quantity;
          const actualQuantity = positionSizeInDollars / data.price;
          
          log(`💰 Position Sizing: $${positionSizeInDollars.toFixed(2)} = ${actualQuantity.toFixed(6)} ${data.symbol} @ $${data.price.toFixed(2)}`);
          
          try {
            // Use production position management system with AI strategy name
            const strategyName = `phase-${currentPhase.phase}-ai-${aiAnalysis.aiSystems?.[0] || 'basic'}`;
            log(`📝 Attempting to save position: ${data.symbol} ${side} ${actualQuantity.toFixed(6)} @ $${data.price}`);
            
            const result = await this.positionManager.openPosition({
              symbol: data.symbol,
              side,
              quantity: actualQuantity,
              price: data.price,
              strategy: strategyName,
              timestamp: data.timestamp,
              metadata: {
                confidence: aiAnalysis.confidence,
                aiSystems: aiAnalysis.aiSystems,
                phase: currentPhase.phase
              }
            });
            
            log(`✅ POSITION OPENED: ${result.position.id} | ${side.toUpperCase()} ${actualQuantity.toFixed(6)} ${data.symbol} @ $${data.price} | Confidence: ${(aiAnalysis.confidence * 100).toFixed(1)}%`);
            
            // Track trade in telemetry
            telemetry.trackTrade({
              strategy: strategyName,
              symbol: data.symbol,
              side: side.toUpperCase() as 'BUY' | 'SELL',
              amount: actualQuantity,
              price: data.price,
              success: true,
              confidence: aiAnalysis.confidence
            });
            
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
          
          // 🧠 ADAPTIVE LEARNING PERFORMANCE SUMMARY (every 10 cycles)
          const learningReport = adaptiveSignalLearning.getPerformanceSummary();
          if (learningReport.includes('Priority Pairs') && learningReport.length > 100) {
            log('\n' + learningReport);
          }
          
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
      
      // Track system performance every 10 cycles
      if (this.cycleCount % 10 === 0) {
        const openPositions = await this.positionManager.getOpenPositions();
        const memUsage = process.memoryUsage();
        const memPercent = (memUsage.rss / 1024 / 1024 / 1024) * 100; // Convert to GB percentage
        
        telemetry.trackSystem({
          memory: memPercent,
          cpu: 0, // CPU tracking would require additional package
          activeStrategies: currentPhase.features.sentiment ? 3 : 2, // Estimate based on phase
          openPositions: openPositions.length
        });
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
  
  /**
   * 🧠 MARKET CONDITION DETECTOR
   * Uses existing AI levels to determine market state for adaptive trading
   */
  private detectMarketCondition(pattern: string, velocity: number, acceleration: number, volatility: number): string {
    const absVelocity = Math.abs(velocity);
    const absAcceleration = Math.abs(acceleration);
    
    // TRENDING MARKETS: Strong directional movement
    if (absVelocity > 0.5 && absAcceleration > 0.02) {
      return velocity > 0 ? 'trending_up' : 'trending_down';
    }
    
    // BREAKOUT/BREAKDOWN: Sudden acceleration
    if (absAcceleration > 0.08 && volatility > 1.0) {
      return velocity > 0 ? 'breakout' : 'breakdown';
    }
    
    // SIDEWAYS/CONSOLIDATING: Low velocity, low acceleration
    if (absVelocity < 0.2 && absAcceleration < 0.01) {
      return 'sideways';
    }
    
    // DEFAULT: Consolidating pattern
    return 'consolidating';
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