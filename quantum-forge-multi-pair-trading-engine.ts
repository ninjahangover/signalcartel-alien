/**
 * QUANTUM FORGE™ Multi-Pair Opportunistic Trading Engine
 * 
 * This is the exponential wealth generation system that:
 * 1. Scans ALL available pairs for opportunities using advanced AI
 * 2. Dynamically allocates capital to the best opportunities
 * 3. Uses Bayesian inference, Markov chains, order book AI, and sentiment analysis
 * 4. Automatically adjusts position sizes based on opportunity scores
 * 5. Maximizes profit through intelligent pair selection and timing
 * 
 * Key Innovation: Instead of trading fixed pairs, we hunt the entire market
 * for the best opportunities and strike when conditions are optimal.
 */

import { PrismaClient } from '@prisma/client';
import { pairOpportunityScanner, PairOpportunity } from './src/lib/quantum-forge-pair-opportunity-scanner';
import { phaseManager } from './src/lib/quantum-forge-phase-config';
import { PositionService } from './src/lib/position-management/position-service';
import consolidatedDataService from './src/lib/consolidated-ai-data-service.js';
import { SERVICE_DEFAULTS } from './src/lib/crypto-trading-pairs';

interface TradingSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  totalOpportunities: number;
  tradesExecuted: number;
  totalPnL: number;
  winRate: number;
  bestOpportunity: string;
  worstOpportunity: string;
  capitalAllocation: Record<string, number>;
}

interface OpportunityExecution {
  opportunity: PairOpportunity;
  positionSize: number;
  executionPrice: number;
  reasoning: string[];
  confidence: number;
  expectedReturn: number;
}

export class QuantumForgeMultiPairTradingEngine {
  private prisma: PrismaClient;
  private positionService: PositionService;
  private currentSession: TradingSession | null = null;
  private maxConcurrentPositions = 8;
  private totalCapital = 10000; // $10,000 starting capital
  private isActive = false;

  constructor() {
    this.prisma = new PrismaClient();
    this.positionService = new PositionService();
  }

  /**
   * MAIN ENGINE: Start opportunistic multi-pair trading
   */
  async startOpportunisticTrading(): Promise<void> {
    if (this.isActive) {
      console.log('🔄 Trading engine already active');
      return;
    }

    this.isActive = true;
    console.log('🚀 QUANTUM FORGE™ Multi-Pair Opportunistic Trading Engine - STARTING');
    console.log('💰 Hunting for exponential wealth opportunities across ALL pairs');
    
    await this.initializeSession();
    
    try {
      while (this.isActive) {
        await this.executeTradingCycle();
        await new Promise(resolve => setTimeout(resolve, 300000)); // 5-minute cycles
      }
    } catch (error) {
      console.error('❌ Trading engine error:', error);
    } finally {
      await this.finalizeSession();
      this.isActive = false;
    }
  }

  /**
   * Execute one complete trading cycle
   */
  private async executeTradingCycle(): Promise<void> {
    const cycleStart = Date.now();
    console.log('\\n🔍 OPPORTUNITY SCAN CYCLE - Searching for exponential wealth opportunities');

    try {
      // STEP 1: Scan all pairs for opportunities
      const opportunities = await pairOpportunityScanner.scanAllPairs();
      console.log(`📊 Found ${opportunities.length} market opportunities`);

      if (!this.currentSession) return;
      this.currentSession.totalOpportunities = opportunities.length;

      // STEP 2: Filter for actionable opportunities
      const actionableOpportunities = await this.filterActionableOpportunities(opportunities);
      console.log(`⚡ ${actionableOpportunities.length} actionable opportunities identified`);

      // STEP 3: Execute trades on best opportunities
      if (actionableOpportunities.length > 0) {
        await this.executeOpportunityTrades(actionableOpportunities);
      }

      // STEP 4: Manage existing positions
      await this.manageExistingPositions();

      // STEP 5: Log cycle performance
      const cycleTime = ((Date.now() - cycleStart) / 1000).toFixed(1);
      console.log(`✅ Cycle complete in ${cycleTime}s`);
      console.log(`💼 Portfolio Status: ${await this.getPortfolioSummary()}`);

    } catch (error) {
      console.error('❌ Trading cycle error:', error);
    }
  }

  /**
   * Filter opportunities that meet execution criteria
   */
  private async filterActionableOpportunities(opportunities: PairOpportunity[]): Promise<PairOpportunity[]> {
    const phase = await phaseManager.getCurrentPhase();
    const openPositions = await this.positionService.getAllOpenPositions();
    const currentSymbols = new Set(openPositions.map(p => p.symbol));

    return opportunities.filter(opp => {
      // Must be a strong signal
      if (opp.opportunityScore < 70) return false;
      
      // Must have high confidence
      if (opp.confidence < 75) return false;
      
      // Must be actionable (BUY or STRONG_BUY)
      if (!['BUY', 'STRONG_BUY'].includes(opp.recommendation.action)) return false;
      
      // Must be urgent or high priority
      if (!['IMMEDIATE', 'HIGH', 'MEDIUM'].includes(opp.recommendation.urgency)) return false;
      
      // Don't double up on symbols we already have
      if (currentSymbols.has(opp.symbol)) return false;
      
      // Phase-based confidence threshold
      const minConfidence = phase.features.confidenceThreshold * 100;
      if (opp.confidence < minConfidence) return false;

      // Must have reasonable position size
      if (opp.recommendation.positionSize <= 0 || opp.recommendation.positionSize > 0.1) return false;

      return true;
    });
  }

  /**
   * Execute trades on the best opportunities
   */
  private async executeOpportunityTrades(opportunities: PairOpportunity[]): Promise<void> {
    const openPositions = await this.positionService.getAllOpenPositions();
    const availableSlots = Math.max(0, this.maxConcurrentPositions - openPositions.length);
    
    if (availableSlots === 0) {
      console.log('📊 Maximum concurrent positions reached, waiting for exits');
      return;
    }

    // Sort by opportunity score and take the best available slots
    const tradesToExecute = opportunities
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, availableSlots);

    console.log(`🎯 Executing ${tradesToExecute.length} opportunity trades:`);

    for (const opportunity of tradesToExecute) {
      try {
        await this.executeOpportunityTrade(opportunity);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between executions
      } catch (error) {
        console.error(`❌ Failed to execute ${opportunity.symbol}:`, error.message);
      }
    }
  }

  /**
   * Execute a single opportunity trade
   */
  private async executeOpportunityTrade(opportunity: PairOpportunity): Promise<void> {
    const marketData = await this.getMarketData(opportunity.symbol);
    if (!marketData) {
      console.log(`⚠️ No market data for ${opportunity.symbol}`);
      return;
    }

    // Calculate position size based on opportunity score and risk
    const basePositionSize = opportunity.recommendation.positionSize;
    const riskAdjustment = (100 - opportunity.risk) / 100;
    const confidenceBoost = opportunity.confidence / 100;
    
    const adjustedPositionSize = basePositionSize * riskAdjustment * confidenceBoost;
    const dollarAmount = this.totalCapital * adjustedPositionSize;
    const quantity = dollarAmount / marketData.price;

    // Create position using our position management system
    const result = await this.positionService.openPosition({
      symbol: opportunity.symbol,
      side: 'BUY',
      quantity: quantity,
      price: marketData.price,
      strategy: 'quantum-forge-opportunity-hunter',
      metadata: {
        opportunityScore: opportunity.opportunityScore,
        confidence: opportunity.confidence,
        risk: opportunity.risk,
        reasoning: opportunity.llmAssessment.reasoning,
        opportunityType: opportunity.llmAssessment.opportunityType,
        urgency: opportunity.recommendation.urgency
      }
    });

    if (result.success && result.position) {
      console.log(`✅ OPPORTUNITY EXECUTED: ${opportunity.symbol}`);
      console.log(`   💰 Score: ${opportunity.opportunityScore.toFixed(1)} | Confidence: ${opportunity.confidence.toFixed(1)}%`);
      console.log(`   📈 Position: $${dollarAmount.toFixed(0)} (${quantity.toFixed(6)} @ $${marketData.price.toFixed(2)})`);
      console.log(`   🎯 Type: ${opportunity.llmAssessment.opportunityType} | Urgency: ${opportunity.recommendation.urgency}`);
      console.log(`   🧠 Reasoning: ${opportunity.llmAssessment.reasoning[0] || 'AI-detected opportunity'}`);

      // Update session stats
      if (this.currentSession) {
        this.currentSession.tradesExecuted++;
        if (!this.currentSession.capitalAllocation[opportunity.symbol]) {
          this.currentSession.capitalAllocation[opportunity.symbol] = 0;
        }
        this.currentSession.capitalAllocation[opportunity.symbol] += dollarAmount;
      }

      // Store opportunity in database for analysis
      await this.storeOpportunityExecution({
        opportunity,
        positionSize: adjustedPositionSize,
        executionPrice: marketData.price,
        reasoning: opportunity.llmAssessment.reasoning,
        confidence: opportunity.confidence,
        expectedReturn: opportunity.recommendation.takeProfit
      });

    } else {
      console.log(`❌ Failed to execute ${opportunity.symbol}: ${result.error}`);
    }
  }

  /**
   * Manage existing positions - check for exits
   */
  private async manageExistingPositions(): Promise<void> {
    const openPositions = await this.positionService.getAllOpenPositions();
    
    if (openPositions.length === 0) return;
    
    console.log(`🔧 Managing ${openPositions.length} open positions`);

    for (const position of openPositions) {
      try {
        const currentPrice = await this.getCurrentPrice(position.symbol);
        if (!currentPrice) continue;

        const pnl = (currentPrice - position.entryPrice) * position.quantity * (position.side === 'BUY' ? 1 : -1);
        const pnlPercent = (pnl / (position.entryPrice * position.quantity)) * 100;

        // Exit conditions
        let shouldExit = false;
        let exitReason = '';

        // Take profit
        if (pnlPercent > 8) {
          shouldExit = true;
          exitReason = `Take profit: ${pnlPercent.toFixed(1)}%`;
        }
        // Stop loss
        else if (pnlPercent < -3) {
          shouldExit = true;
          exitReason = `Stop loss: ${pnlPercent.toFixed(1)}%`;
        }
        // Time-based exit (24 hours max hold)
        else if (Date.now() - position.createdAt.getTime() > 24 * 60 * 60 * 1000) {
          shouldExit = true;
          exitReason = `Time limit reached: ${pnlPercent.toFixed(1)}%`;
        }

        if (shouldExit) {
          const result = await this.positionService.closePosition({
            positionId: position.id,
            price: currentPrice,
            reason: exitReason
          });

          if (result.success) {
            console.log(`🔴 POSITION CLOSED: ${position.symbol} | ${exitReason} | P&L: $${pnl.toFixed(2)}`);
            
            // Update session stats
            if (this.currentSession) {
              this.currentSession.totalPnL += pnl;
              if (pnl > 0) {
                // Track as winning trade (simplified)
              }
            }
          }
        } else {
          console.log(`   📊 ${position.symbol}: $${currentPrice.toFixed(2)} (${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(1)}%)`);
        }

      } catch (error) {
        console.error(`❌ Error managing position ${position.symbol}:`, error.message);
      }
    }
  }

  /**
   * Initialize a new trading session
   */
  private async initializeSession(): Promise<void> {
    this.currentSession = {
      sessionId: `session-${Date.now()}`,
      startTime: new Date(),
      totalOpportunities: 0,
      tradesExecuted: 0,
      totalPnL: 0,
      winRate: 0,
      bestOpportunity: '',
      worstOpportunity: '',
      capitalAllocation: {}
    };

    console.log(`📋 Session initialized: ${this.currentSession.sessionId}`);
  }

  /**
   * Finalize the trading session
   */
  private async finalizeSession(): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.endTime = new Date();
    
    const duration = this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();
    const hours = (duration / (1000 * 60 * 60)).toFixed(1);

    console.log('\\n📊 SESSION COMPLETE:');
    console.log(`   ⏱️  Duration: ${hours} hours`);
    console.log(`   🔍 Opportunities Scanned: ${this.currentSession.totalOpportunities}`);
    console.log(`   ⚡ Trades Executed: ${this.currentSession.tradesExecuted}`);
    console.log(`   💰 Total P&L: $${this.currentSession.totalPnL.toFixed(2)}`);
    console.log(`   🏆 Win Rate: ${this.currentSession.winRate.toFixed(1)}%`);

    // Store session in database for analysis
    // (Would implement session storage here)
  }

  /**
   * Utility functions
   */
  private async getMarketData(symbol: string) {
    try {
      const data = await this.prisma.marketDataCollection.findFirst({
        where: { symbol },
        orderBy: { newestData: 'desc' }
      });
      
      if (!data) return null;
      
      // Get actual price from market data
      const priceData = await this.prisma.marketData.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' }
      });

      return {
        price: priceData?.close || 50000, // Fallback price
        volume: priceData?.volume || 1000000,
        change24h: Math.random() * 10 - 5 // Placeholder
      };
    } catch (error) {
      return null;
    }
  }

  private async getCurrentPrice(symbol: string): Promise<number | null> {
    const data = await this.getMarketData(symbol);
    return data?.price || null;
  }

  private async storeOpportunityExecution(execution: OpportunityExecution): Promise<void> {
    try {
      await this.prisma.pairOpportunity.upsert({
        where: { symbol: execution.opportunity.symbol },
        update: {
          opportunityScore: execution.opportunity.opportunityScore,
          confidence: execution.opportunity.confidence,
          risk: execution.opportunity.risk,
          orderBookAnalysis: JSON.stringify(execution.opportunity.orderBookAnalysis),
          markovAnalysis: JSON.stringify(execution.opportunity.markovAnalysis),
          sentimentAnalysis: JSON.stringify(execution.opportunity.sentimentAnalysis),
          bayesianInference: JSON.stringify(execution.opportunity.bayesianInference),
          llmAssessment: JSON.stringify(execution.opportunity.llmAssessment),
          recommendedAction: execution.opportunity.recommendation.action,
          positionSize: execution.positionSize,
          urgency: execution.opportunity.recommendation.urgency,
          stopLoss: execution.opportunity.recommendation.stopLoss,
          takeProfit: execution.opportunity.recommendation.takeProfit,
          dataQuality: execution.opportunity.dataQuality,
          analysisVersion: execution.opportunity.analysisVersion,
          updatedAt: new Date()
        },
        create: {
          symbol: execution.opportunity.symbol,
          baseAsset: execution.opportunity.baseAsset,
          quoteAsset: execution.opportunity.quoteAsset,
          opportunityScore: execution.opportunity.opportunityScore,
          confidence: execution.opportunity.confidence,
          risk: execution.opportunity.risk,
          orderBookAnalysis: JSON.stringify(execution.opportunity.orderBookAnalysis),
          markovAnalysis: JSON.stringify(execution.opportunity.markovAnalysis),
          sentimentAnalysis: JSON.stringify(execution.opportunity.sentimentAnalysis),
          bayesianInference: JSON.stringify(execution.opportunity.bayesianInference),
          llmAssessment: JSON.stringify(execution.opportunity.llmAssessment),
          recommendedAction: execution.opportunity.recommendation.action,
          positionSize: execution.positionSize,
          urgency: execution.opportunity.recommendation.urgency,
          stopLoss: execution.opportunity.recommendation.stopLoss,
          takeProfit: execution.opportunity.recommendation.takeProfit,
          dataQuality: execution.opportunity.dataQuality,
          analysisVersion: execution.opportunity.analysisVersion
        }
      });
    } catch (error) {
      console.log(`⚠️ Could not store opportunity execution: ${error.message}`);
    }
  }

  private async getPortfolioSummary(): Promise<string> {
    const openPositions = await this.positionService.getAllOpenPositions();
    const totalValue = openPositions.length * 1000; // Simplified calculation
    return `${openPositions.length} positions, ~$${totalValue.toFixed(0)} deployed`;
  }

  /**
   * Stop the trading engine gracefully
   */
  async stopTrading(): Promise<void> {
    console.log('🛑 Stopping opportunistic trading engine...');
    this.isActive = false;
  }

  /**
   * Get current engine status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      currentSession: this.currentSession,
      maxConcurrentPositions: this.maxConcurrentPositions,
      totalCapital: this.totalCapital
    };
  }

  /**
   * Emergency stop - closes all positions immediately
   */
  async emergencyStop(): Promise<void> {
    console.log('🚨 EMERGENCY STOP - Closing all positions');
    this.isActive = false;
    
    try {
      const openPositions = await this.positionService.getAllOpenPositions();
      
      for (const position of openPositions) {
        const currentPrice = await this.getCurrentPrice(position.symbol);
        if (currentPrice) {
          await this.positionService.closePosition({
            positionId: position.id,
            price: currentPrice,
            reason: 'Emergency stop'
          });
        }
      }
      
      console.log('✅ All positions closed');
    } catch (error) {
      console.error('❌ Emergency stop error:', error);
    }
  }
}

// Create and export singleton instance
export const multiPairTradingEngine = new QuantumForgeMultiPairTradingEngine();

// Main execution if run directly
if (require.main === module) {
  async function main() {
    console.log('🚀 Starting QUANTUM FORGE™ Multi-Pair Opportunistic Trading Engine');
    console.log('💎 This system hunts for exponential wealth opportunities across ALL crypto pairs');
    console.log('🎯 Using advanced AI: Order Book Intelligence, Markov Chains, Bayesian Inference, Sentiment Analysis');
    
    try {
      await multiPairTradingEngine.startOpportunisticTrading();
    } catch (error) {
      console.error('❌ Engine failed:', error);
    }
  }

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\\n⚠️  Received SIGINT, shutting down gracefully...');
    await multiPairTradingEngine.stopTrading();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\\n⚠️  Received SIGTERM, shutting down gracefully...');
    await multiPairTradingEngine.stopTrading();
    process.exit(0);
  });

  main().catch(console.error);
}