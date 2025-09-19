/**
 * QUANTUM FORGE™ PROFIT PREDATOR TRADING ENGINE
 * The ultimate profit hunting system that dynamically scans ALL 564 pairs
 * for the most profitable opportunities using AI, sentiment, order book analysis
 */

import { PositionManager } from './src/lib/position-management/position-manager';
import { phaseManager } from './src/lib/quantum-forge-phase-config';
import { opportunityScanner } from './src/lib/quantum-forge-opportunity-scanner';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal'
});

// Logging setup
const LOG_DIR = '/tmp/signalcartel-logs';
const LOG_FILE = path.join(LOG_DIR, 'profit-predator.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Logging function
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  console.log(message);
  fs.appendFileSync(LOG_FILE, logEntry);
}

interface ProfitOpportunity {
  symbol: string;
  score: number;
  price: number;
  recommendation: string;
  estimatedProfit: number;
  reasons: string[];
}

class ProfitPredatorEngine {
  private isRunning = false;
  private cycleCount = 0;
  private positionManager: PositionManager;
  private currentTargets: ProfitOpportunity[] = [];
  
  constructor() {
    this.positionManager = new PositionManager(prisma);
    log('🐅 QUANTUM FORGE™ PROFIT PREDATOR ENGINE');
    log('=====================================');
    log('✅ 564-pair opportunity scanning');
    log('✅ AI-driven profit hunting');
    log('✅ Dynamic pair selection');
    log('✅ Real-time sentiment & order book analysis');
    log('✅ Maximum profit extraction');
    log('📁 Logging to: ' + LOG_FILE);
    log('');
  }
  
  async initialize() {
    try {
      // Initialize phase manager
      await phaseManager.updateTradeCount();
      const currentPhase = await phaseManager.getCurrentPhase();
      
      log(`🎯 Starting Profit Predator in Phase ${currentPhase.phase}: ${currentPhase.name}`);
      log(`⚙️  Confidence Threshold: ${(currentPhase.features.confidenceThreshold * 100).toFixed(1)}%`);
      log(`💰 Maximum profit hunting mode activated`);
      log('');
      
      // Start the opportunity scanner
      log('🔍 Starting 564-pair opportunity scanner...');
      opportunityScanner.startScanning(5000); // Scan every 5 seconds
      log('✅ Opportunity scanner active - hunting across all pairs!');
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
    log('🟢 PROFIT PREDATOR ENGINE STARTED!');
    log('🐅 Hunting for profits across 564 trading pairs...');
    log('');

    // Main hunting loop
    while (this.isRunning) {
      try {
        await this.executeProfitHunt();
        await this.sleep(3000); // 3-second cycles for rapid opportunities
      } catch (error) {
        log('❌ Error in profit hunt cycle: ' + error.message);
        await this.sleep(5000);
      }
    }
  }
  
  private async executeProfitHunt() {
    this.cycleCount++;
    const currentPhase = await phaseManager.getCurrentPhase();
    
    log(`🔄 Profit Hunt Cycle ${this.cycleCount} - Phase ${currentPhase.phase}`);
    
    // 1. GET TOP OPPORTUNITIES
    const opportunities = opportunityScanner.getTopOpportunities(20);
    
    if (opportunities.length === 0) {
      log('⏳ No opportunities detected yet, scanner still analyzing...');
      return;
    }
    
    log(`🎯 Found ${opportunities.length} opportunities:`);
    
    // Display top opportunities
    opportunities.slice(0, 5).forEach((opp, i) => {
      log(`   ${i+1}. ${opp.symbol}: ${opp.score.toFixed(1)}% score, ${opp.recommendation}, Est: ${opp.estimatedProfit.toFixed(1)}%`);
      if (opp.reasons.length > 0) {
        log(`      → ${opp.reasons[0]}`);
      }
    });
    
    // 2. HUNT THE BEST OPPORTUNITIES
    const huntTargets = opportunities.filter(opp => 
      opp.score >= (currentPhase.features.confidenceThreshold * 100) &&
      (opp.recommendation === 'STRONG_BUY' || opp.recommendation === 'BUY')
    );
    
    log(`🐅 Hunting ${huntTargets.length} high-score targets...`);
    
    // 3. EXECUTE TRADES ON BEST OPPORTUNITIES
    for (const target of huntTargets.slice(0, 3)) { // Max 3 simultaneous hunts
      await this.huntOpportunity(target, currentPhase);
    }
    
    // 4. CHECK POSITION EXITS
    await this.checkPositionExits();
    
    log(`📊 Hunt cycle ${this.cycleCount} complete - Continuing predator search...`);
  }
  
  private async huntOpportunity(opportunity: any, phase: any) {
    try {
      log(`🐅 HUNTING: ${opportunity.symbol} (Score: ${opportunity.score.toFixed(1)}%)`);
      log(`   💡 Reasons: ${opportunity.reasons.join(', ')}`);
      
      // Get current price
      const { realTimePriceFetcher } = await import('./src/lib/real-time-price-fetcher');
      const priceResult = await realTimePriceFetcher.getCurrentPrice(opportunity.symbol);
      
      if (!priceResult.success) {
        log(`   ❌ Cannot get price for ${opportunity.symbol}: ${priceResult.error}`);
        return;
      }
      
      const price = priceResult.price;
      log(`   📊 Current price: $${price.toFixed(4)}`);
      
      // Create enhanced trading signal
      const signal = {
        action: opportunity.recommendation === 'STRONG_BUY' ? 'BUY' : 
                opportunity.recommendation === 'BUY' ? 'BUY' : 'SELL',
        symbol: opportunity.symbol,
        price: price,
        confidence: opportunity.score / 100, // Convert to 0-1
        timestamp: new Date(),
        source: 'profit-predator',
        strategy: `profit-predator-${opportunity.score.toFixed(0)}`,
        reason: `Profit predator hunt: ${opportunity.reasons.join(', ')}`,
        estimatedProfit: opportunity.estimatedProfit,
        riskLevel: opportunity.riskLevel,
        opportunityScore: opportunity.score
      };
      
      // Execute the hunt
      const result = await this.positionManager.executeSignal(signal);
      
      if (result.action === 'opened') {
        log(`   ✅ HUNT SUCCESSFUL: ${result.position.side} ${result.position.quantity} ${opportunity.symbol} @ $${price.toFixed(4)}`);
        log(`   🎯 Expected profit: ${opportunity.estimatedProfit.toFixed(1)}%, Risk: ${opportunity.riskLevel}`);
      } else {
        log(`   📊 Hunt result: ${result.action}`);
      }
      
    } catch (error) {
      log(`   ❌ Hunt failed for ${opportunity.symbol}: ${error.message}`);
    }
  }
  
  private async checkPositionExits() {
    // Check if any positions should be closed
    const exitResults = await this.positionManager.checkPositionExits();
    
    if (exitResults.length > 0) {
      exitResults.forEach(exit => {
        const pnl = exit.pnl || 0;
        const status = pnl > 0 ? '🟢 WIN' : '🔴 LOSS';
        log(`💰 HUNT COMPLETED: ${exit.position.symbol} | P&L: $${pnl.toFixed(2)} | ${status}`);
      });
    }
  }
  
  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  stop() {
    this.isRunning = false;
    opportunityScanner.stopScanning();
    log('🛑 PROFIT PREDATOR ENGINE STOPPED');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Profit Predator Engine...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Profit Predator Engine...');
  process.exit(0);
});

// Start the engine
const engine = new ProfitPredatorEngine();
engine.start().catch(error => {
  console.error('💥 Fatal error in Profit Predator Engine:', error);
  process.exit(1);
});