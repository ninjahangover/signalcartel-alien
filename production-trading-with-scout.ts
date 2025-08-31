/**
 * QUANTUM FORGE™ DUAL-SYSTEM ARCHITECTURE
 * Main Trading Engine + Opportunity Scout Integration
 */

import { PositionManager } from './src/lib/position-management/position-manager';
import { phaseManager } from './src/lib/quantum-forge-phase-config';
import { opportunityAlertSystem } from './src/lib/opportunity-alert-system';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal'
});

// Logging setup
const LOG_DIR = '/tmp/signalcartel-logs';
const LOG_FILE = path.join(LOG_DIR, 'dual-system-trading.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  console.log(message);
  fs.appendFileSync(LOG_FILE, logEntry);
}

class DualSystemTradingEngine {
  private isRunning = false;
  private cycleCount = 0;
  private positionManager: PositionManager;
  
  // Core trading pairs (proven profitable)
  private readonly CORE_PAIRS = [
    'BTCUSD', 'ETHUSD', 'SOLUSD',
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT',
    'ADAUSDT', 'BNBUSDT', 'XRPUSDT',
    'AVAXUSD', 'DOTUSD', 'MATICUSD',
    'LINKUSD', 'UNIUSD', 'AAVEUSD'
  ];
  
  // Dynamic pairs from scout alerts
  private alertPairs: Set<string> = new Set();
  private lastAlertCheck = 0;
  
  constructor() {
    this.positionManager = new PositionManager(prisma);
    log('🚀 QUANTUM FORGE™ DUAL-SYSTEM TRADING ENGINE');
    log('============================================');
    log('🎯 Core System: 15 proven profitable pairs');
    log('🔍 Scout System: Dynamic opportunity detection');
    log('⚡ Integration: Hot pairs added to pipeline');
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
      
      // Start opportunity scout in background
      log('🔍 Starting Opportunity Scout System...');
      setTimeout(() => {
        opportunityAlertSystem.startScouting(30000); // 30-second scout cycles
      }, 5000);
      
      log('✅ Dual systems initialized successfully');
      log('');
      
      return true;
    } catch (error) {
      log('❌ Initialization failed: ' + error.message);
      return false;
    }
  }
  
  async start() {
    const initialized = await this.initialize();
    if (!initialized) {
      return;
    }

    this.isRunning = true;
    log('🟢 DUAL-SYSTEM TRADING ENGINE STARTED!');
    log('🎯 Core pairs: Continuous profitable trading');
    log('🔍 Scout system: Hunting for hot opportunities');
    log('');

    // Main trading loop
    while (this.isRunning) {
      try {
        await this.executeTradingCycle();
        await this.sleep(5000); // 5-second main cycles
      } catch (error) {
        log('❌ Error in trading cycle: ' + error.message);
        await this.sleep(10000);
      }
    }
  }
  
  private async executeTradingCycle() {
    this.cycleCount++;
    const currentPhase = await phaseManager.getCurrentPhase();
    
    log(`🔄 Trading Cycle ${this.cycleCount} - Phase ${currentPhase.phase}`);
    
    // 1. CHECK FOR SCOUT ALERTS
    await this.checkScoutAlerts();
    
    // 2. GET ACTIVE TRADING PAIRS
    const activePairs = this.getActiveTradingPairs();
    log(`📊 Active pairs: ${activePairs.length} (Core: ${this.CORE_PAIRS.length}, Scout: ${this.alertPairs.size})`);
    
    // 3. TRADE CORE PAIRS
    await this.tradePairs(activePairs.slice(0, 5), 'CORE', currentPhase); // Max 5 simultaneous
    
    // 4. TRADE SCOUT PAIRS (if any)
    if (this.alertPairs.size > 0) {
      const scoutPairs = Array.from(this.alertPairs).slice(0, 3); // Max 3 scout pairs
      await this.tradePairs(scoutPairs, 'SCOUT', currentPhase);
    }
    
    // 5. CHECK POSITION EXITS
    await this.checkPositionExits();
    
    log(`📊 Cycle ${this.cycleCount} complete - continuing dual-system operation`);
    log('');
  }
  
  private async checkScoutAlerts() {
    const now = Date.now();
    
    // Check alerts every 30 seconds to avoid spam
    if (now - this.lastAlertCheck < 30000) {
      return;
    }
    
    this.lastAlertCheck = now;
    
    try {
      const alerts = opportunityAlertSystem.getActiveAlerts();
      
      if (alerts.length > 0) {
        log(`🚨 Scout found ${alerts.length} hot opportunities!`);
        
        // Add high-urgency pairs to alert pairs
        const newAlerts = alerts
          .filter(alert => alert.urgency === 'HIGH' || alert.urgency === 'CRITICAL')
          .filter(alert => alert.score >= 80)
          .slice(0, 5); // Max 5 scout pairs at once
        
        newAlerts.forEach(alert => {
          if (!this.alertPairs.has(alert.symbol)) {
            this.alertPairs.add(alert.symbol);
            log(`🎯 Added scout pair: ${alert.symbol} (Score: ${alert.score.toFixed(1)}%, ${alert.urgency})`);
          }
        });
        
        // Remove old alert pairs after 10 minutes
        setTimeout(() => {
          newAlerts.forEach(alert => {
            this.alertPairs.delete(alert.symbol);
            log(`⏰ Removed scout pair: ${alert.symbol} (timeout)`);
          });
        }, 600000);
        
      } else {
        log('🔍 Scout: No urgent opportunities detected');
      }
    } catch (error) {
      log(`❌ Scout alert check failed: ${error.message}`);
    }
  }
  
  private getActiveTradingPairs(): string[] {
    // Combine core pairs with scout alerts
    const allPairs = [...this.CORE_PAIRS, ...Array.from(this.alertPairs)];
    
    // Shuffle to vary trading order
    return allPairs.sort(() => Math.random() - 0.5);
  }
  
  private async tradePairs(pairs: string[], source: 'CORE' | 'SCOUT', phase: any) {
    for (let i = 0; i < Math.min(pairs.length, 3); i++) {
      const symbol = pairs[i];
      
      try {
        // Get current market data
        const marketData = await this.getMarketData(symbol);
        
        // Determine if we should trade
        const tradingDecision = await this.shouldTrade(marketData, phase);
        
        if (tradingDecision.shouldTrade) {
          log(`🎯 ${source}: Trading signal for ${symbol} - confidence ${(tradingDecision.confidence * 100).toFixed(1)}%`);
          
          const signal = {
            action: tradingDecision.signal.action,
            symbol: symbol,
            price: marketData.price,
            confidence: tradingDecision.confidence,
            timestamp: new Date(),
            source: source.toLowerCase(),
            strategy: `dual-system-${source.toLowerCase()}`,
            reason: `${source} trading system: ${tradingDecision.signal.reason || 'Standard signal'}`
          };
          
          const result = await this.positionManager.executeSignal(signal);
          
          if (result.action === 'opened') {
            log(`   ✅ ${source} POSITION: ${result.position.side} ${result.position.quantity} ${symbol} @ $${marketData.price.toFixed(4)}`);
          } else {
            log(`   📊 ${source} result: ${result.action}`);
          }
        }
        
      } catch (error) {
        log(`   ❌ ${source} trading failed for ${symbol}: ${error.message}`);
      }
    }
  }
  
  private async getMarketData(symbol: string) {
    const { realTimePriceFetcher } = await import('./src/lib/real-time-price-fetcher');
    const priceData = await realTimePriceFetcher.getCurrentPrice(symbol);
    
    if (!priceData.success) {
      throw new Error(`Cannot get price for ${symbol}: ${priceData.error}`);
    }
    
    return {
      symbol,
      price: priceData.price,
      timestamp: new Date()
    };
  }
  
  private async shouldTrade(marketData: any, phase: any) {
    try {
      // Basic signal generation (Phase 0 style)
      const { quantumForgeSignalGenerator } = await import('./src/lib/quantum-forge-signal-generator');
      const baseSignal = await quantumForgeSignalGenerator.generateTechnicalSignal(marketData.symbol, marketData.price);
      
      let confidence = baseSignal.confidence;
      
      // Apply phase-appropriate enhancements
      if (phase.phase >= 1 && phase.features.sentimentEnabled) {
        try {
          const { quantumForgeSentimentAI } = await import('./src/lib/quantum-forge-sentiment-ai');
          const sentimentResult = await quantumForgeSentimentAI.enhanceSignalWithSentiment(baseSignal);
          confidence = sentimentResult.confidence;
        } catch (error) {
          // Continue with base signal on sentiment errors
        }
      }
      
      // Check against phase confidence threshold
      const shouldTrade = confidence >= phase.features.confidenceThreshold;
      
      return {
        shouldTrade,
        confidence,
        signal: baseSignal,
        aiSystems: ['technical-analysis']
      };
      
    } catch (error) {
      log(`❌ Trading decision error for ${marketData.symbol}: ${error.message}`);
      return { shouldTrade: false, confidence: 0 };
    }
  }
  
  private async checkPositionExits() {
    const exitResults = await this.positionManager.checkPositionExits();
    
    if (exitResults.length > 0) {
      exitResults.forEach(exit => {
        const pnl = exit.pnl || 0;
        const status = pnl > 0 ? '🟢 WIN' : '🔴 LOSS';
        const source = exit.position.strategy?.includes('scout') ? 'SCOUT' : 'CORE';
        log(`💰 ${source} CLOSED: ${exit.position.symbol} | P&L: $${pnl.toFixed(2)} | ${status}`);
      });
    }
  }
  
  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  stop() {
    this.isRunning = false;
    opportunityAlertSystem.stopScouting();
    log('🛑 DUAL-SYSTEM TRADING ENGINE STOPPED');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Dual-System Trading Engine...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Dual-System Trading Engine...');
  process.exit(0);
});

// Start the dual system
const engine = new DualSystemTradingEngine();
engine.start().catch(error => {
  console.error('💥 Fatal error in Dual-System Trading Engine:', error);
  process.exit(1);
});