/**
 * Production Futures Trading - Isolated System
 * Reuses AI signals from spot system for perpetual contract trading
 * Completely separate balance and position management ($100 test capital)
 */

import { getKrakenFuturesClient, FuturesPosition } from './src/lib/kraken-futures-client';
import { unifiedTensorCoordinator } from './src/lib/unified-tensor-coordinator';
import { sharedMarketDataCache } from './src/lib/shared-market-data-cache';
import { adaptiveProfitBrain } from './src/lib/adaptive-profit-brain';
import * as fs from 'fs';
import * as path from 'path';

// Logging setup
const LOG_DIR = '/tmp/signalcartel-logs';
const LOG_FILE = path.join(LOG_DIR, 'futures-trading.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, logEntry);
}

interface FuturesTradeRecord {
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  size: number;
  leverage: number;
  confidence: number;
  entryTime: Date;
}

class FuturesTradingEngine {
  private client = getKrakenFuturesClient(process.env.FUTURES_DEMO_MODE === 'true');
  private isRunning = false;
  private cycleCount = 0;
  private openTrades = new Map<string, FuturesTradeRecord>();

  // Configuration from environment
  private readonly MAX_CAPITAL = parseFloat(process.env.FUTURES_MAX_CAPITAL || '100');
  private readonly MAX_LEVERAGE = parseFloat(process.env.FUTURES_MAX_LEVERAGE || '2');
  private readonly MIN_CONFIDENCE = parseFloat(process.env.FUTURES_MIN_CONFIDENCE || '20');
  private readonly POSITION_SIZE_PCT = parseFloat(process.env.FUTURES_POSITION_SIZE_PCT || '10');

  // Perpetual contract symbols (Kraken uses 'PF_' prefix)
  private readonly PERPETUALS = [
    'PF_XBTUSD',   // Bitcoin
    'PF_ETHUSD',   // Ethereum
    'PF_SOLUSD',   // Solana
    'PF_XRPUSD',   // XRP
    'PF_ADAUSD',   // Cardano
    'PF_DOTUSD',   // Polkadot
    'PF_AVAXUSD',  // Avalanche
    'PF_MATICUSD'  // Polygon
  ];

  async start() {
    if (this.isRunning) {
      log('⚠️ Futures trading engine already running');
      return;
    }

    log('🚀 KRAKEN FUTURES TRADING ENGINE - STARTING');
    log('================================================');
    log(`💰 Capital: $${this.MAX_CAPITAL} | Leverage: ${this.MAX_LEVERAGE}x | Position Size: ${this.POSITION_SIZE_PCT}%`);
    log(`🎯 Min Confidence: ${this.MIN_CONFIDENCE}% | Demo Mode: ${process.env.FUTURES_DEMO_MODE === 'true'}`);

    // Health check
    const isHealthy = await this.client.healthCheck();
    if (!isHealthy) {
      log('❌ Futures API health check failed - cannot start trading');
      return;
    }

    log('✅ Futures API connection verified');

    // Get initial balance
    const balances = await this.client.getBalance();
    for (const bal of balances) {
      log(`💰 ${bal.currency}: $${bal.available.toFixed(2)} available, $${bal.marginBalance.toFixed(2)} margin`);
    }

    // Sync existing positions
    await this.syncExistingPositions();

    this.isRunning = true;
    this.runTradingCycle();
  }

  async stop() {
    log('🛑 Stopping futures trading engine...');
    this.isRunning = false;
  }

  private async syncExistingPositions() {
    try {
      const positions = await this.client.getOpenPositions();

      if (positions.length === 0) {
        log('📊 No existing futures positions');
        return;
      }

      log(`📊 Found ${positions.length} existing positions:`);
      for (const pos of positions) {
        log(`   ${pos.symbol}: ${pos.side.toUpperCase()} ${pos.size} @ $${pos.entryPrice} | P&L: $${pos.unrealizedPnl.toFixed(2)}`);

        this.openTrades.set(pos.symbol, {
          symbol: pos.symbol,
          side: pos.side,
          entryPrice: pos.entryPrice,
          size: pos.size,
          leverage: pos.leverage,
          confidence: 0, // Unknown for existing positions
          entryTime: new Date() // Approximate
        });
      }
    } catch (error: any) {
      log(`❌ Failed to sync positions: ${error.message}`);
    }
  }

  private async runTradingCycle() {
    while (this.isRunning) {
      this.cycleCount++;

      try {
        log(`\n🔄 FUTURES CYCLE ${this.cycleCount} - ${new Date().toLocaleTimeString()}`);

        // Check all perpetual contracts
        for (const symbol of this.PERPETUALS) {
          await this.evaluateContract(symbol);
        }

        // Check existing positions for exit signals
        await this.monitorExitSignals();

      } catch (error: any) {
        log(`❌ Cycle ${this.cycleCount} error: ${error.message}`);
      }

      // Wait 60 seconds between cycles (futures are faster-moving)
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }

  private async evaluateContract(symbol: string) {
    try {
      // Skip if we already have a position
      if (this.openTrades.has(symbol)) {
        return;
      }

      // Convert futures symbol to spot equivalent for AI analysis
      // PF_XBTUSD -> BTCUSD
      const spotSymbol = symbol
        .replace('PF_', '')
        .replace('XBT', 'BTC')
        + 'USD';

      // Get AI signal from unified tensor coordinator
      const aiSignal = await unifiedTensorCoordinator.analyzePair(spotSymbol, {
        skipValidation: false,
        requireTensorProof: true
      });

      if (!aiSignal || !aiSignal.shouldTrade) {
        return;
      }

      const confidence = aiSignal.confidence || 0;
      if (confidence < this.MIN_CONFIDENCE) {
        log(`⏭️ ${symbol}: ${confidence.toFixed(1)}% confidence (need ${this.MIN_CONFIDENCE}%)`);
        return;
      }

      // Determine direction: BUY signal = LONG, SELL signal = SHORT
      const action = aiSignal.recommendation;
      if (action !== 'BUY' && action !== 'SELL') {
        return; // HOLD signal
      }

      const side: 'long' | 'short' = action === 'BUY' ? 'long' : 'short';

      log(`🎯 ${symbol}: ${action} signal (${confidence.toFixed(1)}% confidence)`);

      // Calculate position size
      const positionValue = this.MAX_CAPITAL * (this.POSITION_SIZE_PCT / 100);

      // Get current price
      const ticker = await this.client.getTicker(symbol);
      if (!ticker || !ticker.last) {
        log(`❌ ${symbol}: No ticker data available`);
        return;
      }

      const currentPrice = parseFloat(ticker.last);
      const size = positionValue / currentPrice;

      log(`💵 ${symbol}: Position size $${positionValue.toFixed(2)} = ${size.toFixed(4)} contracts @ $${currentPrice}`);

      // Place market order
      const orderSide = side === 'long' ? 'buy' : 'sell';
      const result = await this.client.placeMarketOrder(symbol, orderSide, size);

      if (result.result === 'success') {
        log(`✅ ${symbol}: ${side.toUpperCase()} position opened`);
        log(`   Order ID: ${result.orderId}`);
        log(`   Size: ${size.toFixed(4)} contracts`);
        log(`   Leverage: ${this.MAX_LEVERAGE}x`);

        // Record trade
        this.openTrades.set(symbol, {
          symbol,
          side,
          entryPrice: currentPrice,
          size,
          leverage: this.MAX_LEVERAGE,
          confidence,
          entryTime: new Date()
        });

        // Record in adaptive brain
        await adaptiveProfitBrain.recordTradeOutcome({
          symbol: spotSymbol,
          expectedReturn: aiSignal.expectedReturn || 0,
          actualReturn: 0, // Will update on exit
          winProbability: confidence / 100,
          actualWin: true, // Will update on exit
          decisionFactors: {
            timeHeld: 0,
            marketRegime: 'futures',
            convictionLevel: confidence / 100,
            opportunityCost: 0,
            rotationScore: 0
          },
          profitImpact: 0,
          timestamp: new Date(),
          decisionType: 'FUTURES_ENTRY',
          thresholdAtDecision: this.MIN_CONFIDENCE / 100,
          confidenceLevel: confidence / 100
        });

      } else {
        log(`❌ ${symbol}: Order failed - ${result.error}`);
      }

    } catch (error: any) {
      log(`❌ ${symbol}: Evaluation error - ${error.message}`);
    }
  }

  private async monitorExitSignals() {
    if (this.openTrades.size === 0) {
      return;
    }

    log(`📊 Monitoring ${this.openTrades.size} open positions...`);

    const positions = await this.client.getOpenPositions();

    for (const pos of positions) {
      const trade = this.openTrades.get(pos.symbol);
      if (!trade) continue;

      const pnlPercent = (pos.unrealizedPnl / (trade.size * trade.entryPrice)) * 100;
      const timeHeld = (Date.now() - trade.entryTime.getTime()) / 1000 / 60; // minutes

      log(`   ${pos.symbol}: ${pos.side.toUpperCase()} | P&L: $${pos.unrealizedPnl.toFixed(2)} (${pnlPercent.toFixed(2)}%) | Time: ${timeHeld.toFixed(0)}m`);

      // Exit conditions
      let shouldExit = false;
      let exitReason = '';

      // 1. Take profit at 10%
      if (pnlPercent >= 10) {
        shouldExit = true;
        exitReason = `Take profit ${pnlPercent.toFixed(2)}%`;
      }

      // 2. Stop loss at -5%
      if (pnlPercent <= -5) {
        shouldExit = true;
        exitReason = `Stop loss ${pnlPercent.toFixed(2)}%`;
      }

      // 3. Time-based exit after 4 hours with any profit
      if (timeHeld > 240 && pnlPercent > 0.5) {
        shouldExit = true;
        exitReason = `Time exit ${pnlPercent.toFixed(2)}% after ${timeHeld.toFixed(0)}m`;
      }

      if (shouldExit) {
        log(`🚪 ${pos.symbol}: Closing position - ${exitReason}`);

        const result = await this.client.closePosition(pos.symbol, pos.side, pos.size);

        if (result.result === 'success') {
          log(`✅ ${pos.symbol}: Position closed`);
          log(`   P&L: $${pos.unrealizedPnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
          log(`   Time held: ${timeHeld.toFixed(0)} minutes`);

          this.openTrades.delete(pos.symbol);

          // Update adaptive brain with actual results
          const spotSymbol = pos.symbol.replace('PF_', '').replace('XBT', 'BTC') + 'USD';
          await adaptiveProfitBrain.recordTradeOutcome({
            symbol: spotSymbol,
            expectedReturn: trade.confidence / 100,
            actualReturn: pnlPercent / 100,
            winProbability: trade.confidence / 100,
            actualWin: pnlPercent > 0,
            decisionFactors: {
              timeHeld,
              marketRegime: 'futures',
              convictionLevel: trade.confidence / 100,
              opportunityCost: 0,
              rotationScore: 0
            },
            profitImpact: pos.unrealizedPnl,
            timestamp: new Date(),
            decisionType: 'FUTURES_EXIT',
            thresholdAtDecision: this.MIN_CONFIDENCE / 100,
            confidenceLevel: trade.confidence / 100
          });

        } else {
          log(`❌ ${pos.symbol}: Failed to close - ${result.error}`);
        }
      }
    }
  }
}

// Main execution
const engine = new FuturesTradingEngine();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  log('📥 SIGTERM received - shutting down gracefully');
  await engine.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  log('📥 SIGINT received - shutting down gracefully');
  await engine.stop();
  process.exit(0);
});

// Check if futures trading is enabled
if (process.env.FUTURES_TRADING_ENABLED !== 'true') {
  log('⚠️ Futures trading is DISABLED in .env');
  log('   Set FUTURES_TRADING_ENABLED=true to enable');
  log('   Make sure you have funded your Kraken Futures account first!');
  process.exit(0);
}

// Start the engine
engine.start().catch(error => {
  log(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});
