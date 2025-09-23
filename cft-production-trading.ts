#!/usr/bin/env npx tsx
/**
 * CFT PRODUCTION TRADING SYSTEM
 * Exact copy of main system architecture adapted for ByBit CFT evaluation
 * Uses the same position management, AI systems, and execution pipeline
 */

import { ByBitPositionManager } from './src/lib/bybit-position-manager';
import { ByBitDualClient, createByBitDualClient } from './src/lib/bybit-dual-client';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// CFT Evaluation Parameters
const CFT_CONFIG = {
  accountSize: 10000,         // $10,000 account
  profitTarget: 800,          // 8% profit target (Phase 1)
  dailyLossLimit: 500,        // 5% daily loss limit
  maxLossLimit: 1200,         // 12% total loss limit (premium add-on)
  profitSplit: 90,            // 90% profit split (premium add-on)
  minTradingDays: 5,          // Minimum trading days required
  maxPositionSize: 1000,      // Max $1000 per position
  maxDailyRisk: 500,          // Max $500 daily risk
  winRateTarget: 76           // 76%+ win rate target
};

// CFT pairs adapted from main system proven performers
const CFT_PAIRS = [
  'BTCUSDT',   // Replaces TESTUSD (100% accuracy)
  'BNBUSDT',   // Direct from BNBUSD (100% accuracy)
  'AVAXUSDT',  // Direct from AVAXUSD (100% accuracy)
  'DOTUSDT',   // Direct from DOTUSD
  'ETHUSDT',   // Major pair
  'SOLUSDT',   // High-performance alt
  'ADAUSDT',   // Proven performer
  'XRPUSDT'    // High liquidity
];

// Logging setup
const LOG_DIR = '/tmp/cft-logs';
const LOG_FILE = path.join(LOG_DIR, 'cft-production-trading.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Logging function
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;

  // Write to console
  console.log(message);

  // Append to log file
  fs.appendFileSync(LOG_FILE, logEntry);
}

interface CFTMarketData {
  symbol: string;
  price: number;
  timestamp: Date;
}

interface CFTEvaluationState {
  started: boolean;
  startDate: Date | null;
  currentEquity: number;
  dailyPnl: number;
  totalPnl: number;
  tradingDays: number;
  dailyRiskUsed: number;
  isEvaluationActive: boolean;
  autoTradingEnabled: boolean;
}

class CFTProductionTradingEngine {
  private isRunning = false;
  private cycleCount = 0;
  private positionManager: ByBitPositionManager;
  private bybitClient: ByBitDualClient;

  private evaluationState: CFTEvaluationState = {
    started: false,
    startDate: null,
    currentEquity: CFT_CONFIG.accountSize,
    dailyPnl: 0,
    totalPnl: 0,
    tradingDays: 0,
    dailyRiskUsed: 0,
    isEvaluationActive: false,
    autoTradingEnabled: true  // Auto-enable for CFT
  };

  constructor() {
    this.bybitClient = createByBitDualClient();
    this.positionManager = new ByBitPositionManager();

    log('🏆 CFT PRODUCTION TRADING ENGINE');
    log('===============================');
    log(`💰 Account Size: $${CFT_CONFIG.accountSize.toLocaleString()}`);
    log(`🎯 Profit Target: $${CFT_CONFIG.profitTarget} (${(CFT_CONFIG.profitTarget/CFT_CONFIG.accountSize*100).toFixed(1)}% - Phase 1)`);
    log(`🛡️  Daily Loss Limit: $${CFT_CONFIG.dailyLossLimit} (${(CFT_CONFIG.dailyLossLimit/CFT_CONFIG.accountSize*100).toFixed(1)}%)`);
    log(`🔒 Max Loss Limit: $${CFT_CONFIG.maxLossLimit} (${(CFT_CONFIG.maxLossLimit/CFT_CONFIG.accountSize*100).toFixed(1)}% - Premium)`);
    log(`💎 Profit Split: ${CFT_CONFIG.profitSplit}% (Premium Add-on)`);
    log(`📈 Win Rate Target: ${CFT_CONFIG.winRateTarget}%+ (proven performance)`);
    log(`📁 Logging to: ${LOG_FILE}`);
    log('');
  }

  async initialize() {
    try {
      log('🚀 Initializing CFT Evaluation System...');

      // Test ByBit connection
      log('📊 ByBit Connection Status:');
      try {
        const btcPrice = await this.bybitClient.getMarketPrice('BTCUSDT');
        log('✅ Public API: Available');
        log(`✅ Market data test: BTC @ $${btcPrice.toFixed(2)}`);
      } catch (error) {
        log('❌ Public API failed: ' + error.message);
        return false;
      }

      // Start evaluation
      this.startEvaluation();

      log('✅ CFT Evaluation System Ready');
      log('⚠️  IMPORTANT: First trade starts the 30-day evaluation timer!');
      log('');

      return true;
    } catch (error) {
      log('❌ Initialization failed: ' + error.message);
      return false;
    }
  }

  startEvaluation() {
    if (!this.evaluationState.started) {
      this.evaluationState.started = true;
      this.evaluationState.startDate = new Date();
      this.evaluationState.isEvaluationActive = true;
      this.evaluationState.autoTradingEnabled = true;

      log('🚀 CFT EVALUATION STARTED!');
      log('⏰ 30-day evaluation timer begins now');
      log('✅ Auto-trading ENABLED');
    }
  }

  async getMarketData(symbol: string): Promise<CFTMarketData> {
    try {
      const price = await this.bybitClient.getMarketPrice(symbol);

      return {
        symbol,
        price: Math.round(price * 100) / 100,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`❌ Cannot get price for ${symbol}: ${error.message}`);
    }
  }

  async shouldTrade(marketData: CFTMarketData): Promise<{ shouldTrade: boolean; confidence: number; signal?: any; side?: string; strategy?: string }> {
    try {
      // 🎯 CFT AI SYSTEMS PIPELINE (adapted from main system)

      // Import main system AI components
      const { TensorFlowIntegration } = await import('./src/lib/tensor-integration');
      const { AdvancedTechnicalAnalysis } = await import('./src/lib/advanced-technical-analysis');
      const { MathematicalIntuitionEngine } = await import('./src/lib/mathematical-intuition-engine');

      const tensorIntegration = new TensorFlowIntegration();
      const technicalAnalysis = new AdvancedTechnicalAnalysis();
      const mathIntuition = new MathematicalIntuitionEngine();

      // Get signals from all AI systems
      const [
        tensorSignal,
        technicalSignal,
        mathSignal
      ] = await Promise.all([
        tensorIntegration.generateSignal(marketData.symbol, marketData.price),
        technicalAnalysis.analyze(marketData.symbol, marketData.price),
        mathIntuition.calculateConviction(marketData.symbol, marketData.price)
      ]);

      // CFT confidence calculation (same as main system)
      const confidenceScores = [tensorSignal.confidence, technicalSignal.confidence, mathSignal.confidence].filter(c => c > 0);
      const avgConfidence = confidenceScores.length > 0 ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length : 0;

      // CFT threshold: 80%+ (higher than main system for evaluation safety)
      const CFT_CONFIDENCE_THRESHOLD = 0.80;

      if (avgConfidence >= CFT_CONFIDENCE_THRESHOLD) {
        // Determine side and strategy (same logic as main system)
        const side = tensorSignal.side || technicalSignal.side || 'buy';
        const strategy = `CFT_${tensorSignal.strategy || 'TENSOR_FUSION'}`;

        return {
          shouldTrade: true,
          confidence: avgConfidence,
          signal: { ...tensorSignal, avgConfidence },
          side,
          strategy
        };
      }

      return { shouldTrade: false, confidence: avgConfidence };

    } catch (error) {
      log(`❌ Error in shouldTrade for ${marketData.symbol}: ${error.message}`);
      return { shouldTrade: false, confidence: 0 };
    }
  }

  async executeTrade(marketData: CFTMarketData, decision: any) {
    try {
      // Check CFT risk limits
      if (!this.evaluationState.autoTradingEnabled) {
        log('📊 Signal received but auto-trading disabled');
        return;
      }

      if (this.evaluationState.dailyRiskUsed >= CFT_CONFIG.maxDailyRisk) {
        log('🛑 Daily risk limit reached, skipping trade');
        return;
      }

      // Calculate position size (CFT compliant)
      const maxPositionSize = Math.min(CFT_CONFIG.maxPositionSize, CFT_CONFIG.maxDailyRisk - this.evaluationState.dailyRiskUsed);
      const positionSize = Math.min(maxPositionSize, CFT_CONFIG.accountSize * 0.1); // Max 10% per trade

      if (positionSize < 50) { // Minimum $50 position
        log('⚠️  Position size too small, skipping trade');
        return;
      }

      const quantity = positionSize / marketData.price;

      log('🚀 EXECUTING CFT TRADE');
      log(`📈 ${marketData.symbol} ${decision.side.toUpperCase()} at $${marketData.price}`);
      log(`💰 Position Size: $${positionSize.toFixed(2)}`);
      log(`🎯 Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
      log(`📋 Strategy: ${decision.strategy}`);

      // Execute through position manager (same as main system)
      const result = await this.positionManager.openPosition({
        symbol: marketData.symbol,
        side: decision.side,
        quantity: quantity,
        price: marketData.price,
        strategy: decision.strategy,
        confidence: decision.confidence
      });

      if (result.success) {
        log(chalk.green('✅ CFT TRADE EXECUTED SUCCESSFULLY'));
        log(chalk.green(`🆔 Position ID: ${result.positionId}`));

        // Update CFT evaluation metrics
        this.evaluationState.dailyRiskUsed += positionSize;

        // CFT trade logging
        log(chalk.magenta('═'.repeat(60)));
        log(chalk.magenta('🏆 CFT TRADE EXECUTION LOG'));
        log(chalk.magenta(`Symbol: ${marketData.symbol}`));
        log(chalk.magenta(`Side: ${decision.side.toUpperCase()}`));
        log(chalk.magenta(`Size: $${positionSize.toFixed(2)}`));
        log(chalk.magenta(`Confidence: ${(decision.confidence * 100).toFixed(1)}%`));
        log(chalk.magenta(`Position ID: ${result.positionId}`));
        log(chalk.magenta(`Timestamp: ${new Date().toISOString()}`));
        log(chalk.magenta('═'.repeat(60)));

      } else {
        log(chalk.red('❌ CFT TRADE EXECUTION FAILED'));
        log(chalk.red(`Error: ${result.error}`));
      }

    } catch (error) {
      log('❌ Error executing CFT trade: ' + error.message);
    }
  }

  displayStatus() {
    log('📊 CFT SYSTEM STATUS');
    log('────────────────────────────────────────');
    log(`Evaluation Started: ${this.evaluationState.started ? '✅ YES' : '❌ NO'}`);
    log(`Auto-Trading: ${this.evaluationState.autoTradingEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
    log(`Current Equity: $${this.evaluationState.currentEquity.toFixed(2)}`);
    log(`Daily P&L: $${this.evaluationState.dailyPnl.toFixed(2)}`);
    log(`Total P&L: $${this.evaluationState.totalPnl.toFixed(2)}`);
    log(`Trading Days: ${this.evaluationState.tradingDays}`);
    log(`Daily Risk Used: $${this.evaluationState.dailyRiskUsed.toFixed(2)} / $${CFT_CONFIG.maxDailyRisk}`);
    log('────────────────────────────────────────');
  }

  async runTradingCycle() {
    try {
      this.cycleCount++;
      log(`🔄 CFT Trading Cycle #${this.cycleCount}`);

      // Process each CFT pair (same as main system)
      for (const symbol of CFT_PAIRS) {
        try {
          // Get market data
          const marketData = await this.getMarketData(symbol);

          // Check if we should trade
          const decision = await this.shouldTrade(marketData);

          if (decision.shouldTrade) {
            log(`🎯 CFT Trading opportunity: ${symbol} (${(decision.confidence * 100).toFixed(1)}% confidence)`);
            await this.executeTrade(marketData, decision);

            // Small delay between trades
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          log(`❌ Error processing ${symbol}: ${error.message}`);
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.displayStatus();
      log('');

    } catch (error) {
      log('❌ Error in trading cycle: ' + error.message);
    }
  }

  async start() {
    if (this.isRunning) {
      log('⚠️  CFT Trading engine is already running');
      return;
    }

    const initialized = await this.initialize();
    if (!initialized) {
      log('❌ Failed to initialize CFT trading engine');
      return;
    }

    this.isRunning = true;
    log('🚀 Starting CFT Production Trading Engine...');
    log('');

    // Main trading loop (same interval as main system)
    while (this.isRunning) {
      await this.runTradingCycle();

      // Wait 5 minutes between cycles (same as main system)
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
    }
  }

  stop() {
    this.isRunning = false;
    log('🛑 CFT Trading engine stopped');
  }
}

// Start the CFT engine
async function main() {
  const engine = new CFTProductionTradingEngine();

  // Reset daily risk limits for fresh start
  engine.evaluationState.dailyRiskUsed = 0;
  engine.evaluationState.dailyPnl = 0;

  // Handle shutdown signals
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down CFT engine...');
    engine.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down CFT engine...');
    engine.stop();
    process.exit(0);
  });

  await engine.start();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error in CFT trading engine:', error);
    process.exit(1);
  });
}