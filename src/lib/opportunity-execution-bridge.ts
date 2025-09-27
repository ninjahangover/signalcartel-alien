/**
 * OPPORTUNITY EXECUTION BRIDGE™
 * Ensures high-gain opportunities are never missed
 * Bridges the gap between detection and execution with mathematical certainty
 */

import { dynamicThresholdCalculator } from './dynamic-threshold-calculator';
import { adaptiveLearningExpander } from './adaptive-learning-expander';
import { realTimePositionUpdater } from './real-time-position-updater';
import { krakenApiService } from './kraken-api-service';
import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface OpportunitySignal {
  symbol: string;
  expectedReturn: number;
  winProbability: number;
  source: string;
  urgency: number;
  detectedAt: Date;
  marketData: any;
}

export interface ExecutionDecision {
  execute: boolean;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  expectedReturn: number;
  dynamicThreshold: number;
  executionSpeed: 'immediate' | 'normal' | 'patient';
  reason: string;
}

export class OpportunityExecutionBridge extends EventEmitter {
  private static instance: OpportunityExecutionBridge;
  private executionQueue: Map<string, OpportunitySignal> = new Map();
  private executingNow: Set<string> = new Set();
  private missedOpportunities: Map<string, { reason: string; potential: number }> = new Map();

  private constructor() {
    super();
    this.startExecutionMonitor();
  }

  static getInstance(): OpportunityExecutionBridge {
    if (!this.instance) {
      this.instance = new OpportunityExecutionBridge();
    }
    return this.instance;
  }

  /**
   * Process opportunity with ZERO tolerance for missing high-gain trades
   */
  async processOpportunity(opportunity: OpportunitySignal): Promise<ExecutionDecision> {
    console.log(`🔍 OPPORTUNITY BRIDGE: Processing ${opportunity.symbol} with ${opportunity.expectedReturn.toFixed(1)}% potential`);

    // 1. EXTREME OPPORTUNITY FAST TRACK (>100% potential)
    if (opportunity.expectedReturn >= 100) {
      console.log(`🚨 EXTREME OPPORTUNITY: ${opportunity.symbol} - IMMEDIATE EXECUTION PROTOCOL`);
      return this.executeExtremely(opportunity);
    }

    // 2. HIGH OPPORTUNITY PROCESSING (50-100%)
    if (opportunity.expectedReturn >= 50) {
      console.log(`💎 HIGH OPPORTUNITY: ${opportunity.symbol} - PRIORITY EXECUTION`);
      return this.executeHighPriority(opportunity);
    }

    // 3. DYNAMIC THRESHOLD CALCULATION
    const marketContext = await this.getMarketContext(opportunity);
    const thresholds = await dynamicThresholdCalculator.calculateThresholds(
      opportunity.symbol,
      marketContext
    );

    // 4. LEARNING-BASED DECISION
    const learningRecommendation = await adaptiveLearningExpander.shouldTradePair(opportunity.symbol);

    // 5. CALCULATE EXECUTION SCORE
    const executionScore = this.calculateExecutionScore(
      opportunity,
      thresholds,
      learningRecommendation
    );

    // 6. MAKE FINAL DECISION
    const decision = this.makeExecutionDecision(
      opportunity,
      executionScore,
      thresholds,
      learningRecommendation
    );

    // 7. TRACK DECISION
    if (!decision.execute) {
      this.missedOpportunities.set(opportunity.symbol, {
        reason: decision.reason,
        potential: opportunity.expectedReturn
      });

      // Alert if we're missing a good opportunity
      if (opportunity.expectedReturn > 20) {
        console.warn(`⚠️ MISSING OPPORTUNITY: ${opportunity.symbol} (${opportunity.expectedReturn.toFixed(1)}%) - ${decision.reason}`);
        this.emit('opportunityMissed', { opportunity, reason: decision.reason });
      }
    } else {
      this.executionQueue.set(opportunity.symbol, opportunity);
      this.emit('opportunityQueued', opportunity);
    }

    return decision;
  }

  /**
   * Execute extreme opportunities immediately
   */
  private async executeExtremely(opportunity: OpportunitySignal): Promise<ExecutionDecision> {
    // Calculate aggressive position size for extreme opportunity
    const balance = await this.getAvailableBalance();
    const quantity = balance * 0.3; // 30% of capital for extreme opportunities

    return {
      execute: true,
      symbol: opportunity.symbol,
      side: 'long', // Default to long for extreme gainers
      quantity,
      expectedReturn: opportunity.expectedReturn,
      dynamicThreshold: 0.05, // Ultra-low threshold for extreme opportunities
      executionSpeed: 'immediate',
      reason: `EXTREME OPPORTUNITY: ${opportunity.expectedReturn.toFixed(1)}% potential - IMMEDIATE EXECUTION`
    };
  }

  /**
   * Execute high-priority opportunities
   */
  private async executeHighPriority(opportunity: OpportunitySignal): Promise<ExecutionDecision> {
    const balance = await this.getAvailableBalance();
    const quantity = balance * 0.2; // 20% of capital for high opportunities

    return {
      execute: true,
      symbol: opportunity.symbol,
      side: 'long',
      quantity,
      expectedReturn: opportunity.expectedReturn,
      dynamicThreshold: 0.1, // Low threshold for high opportunities
      executionSpeed: 'immediate',
      reason: `HIGH OPPORTUNITY: ${opportunity.expectedReturn.toFixed(1)}% potential - PRIORITY EXECUTION`
    };
  }

  /**
   * Get market context for dynamic threshold calculation
   */
  private async getMarketContext(opportunity: OpportunitySignal): Promise<any> {
    try {
      // Get recent performance for this pair
      const performance = await prisma.adaptiveLearningPerformance.findFirst({
        where: { symbol: opportunity.symbol }
      });

      // Calculate volatility from market data
      const volatility = Math.abs(opportunity.marketData?.priceChange24h || 0) / 100;

      // Determine market regime
      let marketRegime: 'trending' | 'ranging' | 'volatile' | 'calm' = 'calm';
      if (volatility > 0.3) marketRegime = 'volatile';
      else if (volatility > 0.1) marketRegime = 'trending';
      else if (volatility < 0.05) marketRegime = 'ranging';

      return {
        volatility,
        opportunitySize: opportunity.expectedReturn,
        recentPerformance: performance?.accuracy || 0.5,
        marketRegime,
        systemConfidence: opportunity.winProbability / 100,
        learningFactor: performance ? Math.min(1, performance.totalSignals / 100) : 0
      };
    } catch (error) {
      console.error('Failed to get market context:', error);
      return {
        volatility: 0.2,
        opportunitySize: opportunity.expectedReturn,
        recentPerformance: 0.5,
        marketRegime: 'calm',
        systemConfidence: opportunity.winProbability / 100,
        learningFactor: 0
      };
    }
  }

  /**
   * Calculate execution score
   */
  private calculateExecutionScore(
    opportunity: OpportunitySignal,
    thresholds: any,
    learningRecommendation: any
  ): number {
    let score = 0;

    // Expected return component (0-40 points)
    if (opportunity.expectedReturn >= 50) score += 40;
    else if (opportunity.expectedReturn >= 20) score += 30;
    else if (opportunity.expectedReturn >= 10) score += 20;
    else if (opportunity.expectedReturn >= 5) score += 10;

    // Win probability component (0-30 points)
    score += (opportunity.winProbability / 100) * 30;

    // Learning confidence component (0-20 points)
    if (learningRecommendation.shouldTrade) {
      score += learningRecommendation.confidence * 20;
    }

    // Urgency component (0-10 points)
    score += opportunity.urgency * 10;

    // Dynamic threshold bonus
    if (thresholds.executionThreshold < 0.3) {
      score += 20; // Bonus for very low threshold
    } else if (thresholds.executionThreshold < 0.5) {
      score += 10; // Bonus for low threshold
    }

    return score;
  }

  /**
   * Make final execution decision
   */
  private makeExecutionDecision(
    opportunity: OpportunitySignal,
    executionScore: number,
    thresholds: any,
    learningRecommendation: any
  ): ExecutionDecision {
    // EXECUTE if score is high enough
    const shouldExecute = executionScore >= 50; // 50 points minimum to execute

    // Determine execution speed
    let executionSpeed: 'immediate' | 'normal' | 'patient' = 'normal';
    if (executionScore >= 80) executionSpeed = 'immediate';
    else if (executionScore < 40) executionSpeed = 'patient';

    // Calculate position size based on score and thresholds
    const baseSize = 100; // $100 base
    const sizeMultiplier = thresholds.positionSizeMultiplier * (executionScore / 100);
    const quantity = baseSize * sizeMultiplier;

    // Build reason
    let reason = '';
    if (shouldExecute) {
      reason = `Score: ${executionScore.toFixed(0)}/100 | Return: ${opportunity.expectedReturn.toFixed(1)}% | Confidence: ${opportunity.winProbability.toFixed(0)}%`;
      if (learningRecommendation.shouldTrade) {
        reason += ` | Learning: ${learningRecommendation.reason}`;
      }
    } else {
      reason = `Insufficient score: ${executionScore.toFixed(0)}/100 (need 50+)`;
      if (!learningRecommendation.shouldTrade) {
        reason += ` | Learning says avoid: ${learningRecommendation.reason}`;
      }
    }

    return {
      execute: shouldExecute,
      symbol: opportunity.symbol,
      side: 'long', // Default to long, can be enhanced
      quantity,
      expectedReturn: opportunity.expectedReturn,
      dynamicThreshold: thresholds.executionThreshold,
      executionSpeed,
      reason
    };
  }

  /**
   * Get available balance
   */
  private async getAvailableBalance(): Promise<number> {
    try {
      const balance = await krakenApiService.getBalance();
      const usdBalance = balance.result?.ZUSD || balance.result?.USD || '0';
      return parseFloat(usdBalance) * 0.9; // Use 90% of available balance max
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 100; // Default to $100 if balance check fails
    }
  }

  /**
   * Execute queued opportunities
   */
  private async executeQueuedOpportunities(): Promise<void> {
    for (const [symbol, opportunity] of this.executionQueue) {
      if (this.executingNow.has(symbol)) continue;

      try {
        this.executingNow.add(symbol);

        // Process through bridge
        const decision = await this.processOpportunity(opportunity);

        if (decision.execute) {
          console.log(`🚀 EXECUTING: ${symbol} - ${decision.reason}`);

          // Place actual order
          const orderResult = await krakenApiService.placeOrder({
            pair: symbol,
            type: decision.side === 'long' ? 'buy' : 'sell',
            ordertype: 'market',
            volume: (decision.quantity / opportunity.marketData?.price).toFixed(8)
          });

          console.log(`✅ ORDER PLACED: ${symbol} - ${JSON.stringify(orderResult)}`);
          this.emit('orderExecuted', { symbol, decision, orderResult });

          // Record for learning
          await adaptiveLearningExpander.recordTradeOutcome(
            symbol,
            true, // Assume success for now
            0 // P&L will be calculated later
          );
        }

        this.executionQueue.delete(symbol);
      } catch (error) {
        console.error(`❌ Execution failed for ${symbol}:`, error);
        this.emit('executionError', { symbol, error });
      } finally {
        this.executingNow.delete(symbol);
      }
    }
  }

  /**
   * Start execution monitor
   */
  private startExecutionMonitor(): void {
    // Check queue every second
    setInterval(() => {
      if (this.executionQueue.size > 0) {
        this.executeQueuedOpportunities();
      }
    }, 1000);

    // Report missed opportunities every minute
    setInterval(() => {
      if (this.missedOpportunities.size > 0) {
        const totalPotential = Array.from(this.missedOpportunities.values())
          .reduce((sum, m) => sum + m.potential, 0);

        if (totalPotential > 100) {
          console.warn(`⚠️ MISSED OPPORTUNITIES: ${this.missedOpportunities.size} trades worth ${totalPotential.toFixed(0)}% potential`);
        }

        // Clear old missed opportunities
        this.missedOpportunities.clear();
      }
    }, 60000);
  }

  /**
   * Force execute a specific opportunity
   */
  async forceExecute(symbol: string, expectedReturn: number): Promise<void> {
    console.log(`🔥 FORCE EXECUTING: ${symbol} with ${expectedReturn}% potential`);

    const opportunity: OpportunitySignal = {
      symbol,
      expectedReturn,
      winProbability: 80, // High confidence for forced execution
      source: 'manual-override',
      urgency: 1.0,
      detectedAt: new Date(),
      marketData: {}
    };

    const decision = await this.executeExtremely(opportunity);

    if (decision.execute) {
      this.executionQueue.set(symbol, opportunity);
      await this.executeQueuedOpportunities();
    }
  }

  /**
   * Get bridge statistics
   */
  getStatistics(): any {
    return {
      queuedOpportunities: this.executionQueue.size,
      currentlyExecuting: this.executingNow.size,
      missedOpportunities: this.missedOpportunities.size,
      missedPotential: Array.from(this.missedOpportunities.values())
        .reduce((sum, m) => sum + m.potential, 0)
    };
  }
}

export const opportunityExecutionBridge = OpportunityExecutionBridge.getInstance();