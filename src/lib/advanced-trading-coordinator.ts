/**
 * Advanced Trading Coordinator - Next Level Optimization
 * Integrates capital efficiency optimization with real-time trading decisions
 */

import { capitalEfficiencyOptimizer, PositionAnalysis, OpportunityAnalysis } from './capital-efficiency-optimizer';

export interface TradingContext {
  currentPositions: PositionAnalysis[];
  newOpportunities: OpportunityAnalysis[];
  availableCapital: number;
  totalPortfolio: number;
  marketRegime: 'BULL' | 'BEAR' | 'RANGING' | 'VOLATILE';
  riskTolerance: number;
}

export interface TradingDecision {
  action: 'BUY' | 'SELL' | 'HOLD' | 'ROTATE';
  symbol: string;
  size: number;
  reasoning: string;
  priority: number;
  expectedReturn: number;
  confidence: number;
}

export class AdvancedTradingCoordinator {
  private opportunityThreshold = 12.0; // Minimum 12% expected return
  private rotationThreshold = 3.0; // 3x efficiency gain required for rotation
  private maxPositions = 6; // Maximum concurrent positions
  private minPositionSize = 15; // Minimum $15 position size

  /**
   * Main coordination logic - integrates all optimization strategies
   */
  coordinateTrading(context: TradingContext): TradingDecision[] {
    const decisions: TradingDecision[] = [];

    console.log('🎯 ADVANCED TRADING COORDINATOR ACTIVATED');
    console.log('=========================================');

    // Step 1: Analyze current portfolio efficiency
    const portfolioAnalysis = this.analyzePortfolioEfficiency(context);
    console.log(`📊 Portfolio Efficiency: ${portfolioAnalysis.efficiency.toFixed(2)}x`);

    // Step 2: Identify high-priority opportunities
    const prioritizedOpportunities = this.prioritizeOpportunities(context.newOpportunities);
    console.log(`🚀 Top Opportunities: ${prioritizedOpportunities.length} identified`);

    // Step 3: Check for immediate deployment of available capital
    const deploymentDecisions = this.deployAvailableCapital(context, prioritizedOpportunities);
    decisions.push(...deploymentDecisions);

    // Step 4: Evaluate rotation opportunities
    const rotationDecisions = this.evaluateRotationOpportunities(context, prioritizedOpportunities);
    decisions.push(...rotationDecisions);

    // Step 5: Apply market regime adjustments
    const adjustedDecisions = this.applyMarketRegimeFilters(decisions, context.marketRegime);

    // Step 6: Final risk and sizing optimization
    const finalDecisions = this.optimizePositionSizing(adjustedDecisions, context);

    this.logDecisionSummary(finalDecisions);
    return finalDecisions;
  }

  /**
   * Analyze current portfolio efficiency
   */
  private analyzePortfolioEfficiency(context: TradingContext): {
    efficiency: number;
    underperformers: PositionAnalysis[];
    totalReturn: number;
  } {
    const totalReturn = context.currentPositions.reduce((sum, pos) =>
      sum + (pos.actualReturn * pos.currentValue), 0
    ) / Math.max(context.totalPortfolio, 1);

    const avgOpportunityReturn = context.newOpportunities.length > 0
      ? context.newOpportunities.reduce((sum, opp) => sum + opp.expectedReturn, 0) / context.newOpportunities.length
      : 0;

    const efficiency = avgOpportunityReturn > 0 ? avgOpportunityReturn / Math.max(totalReturn, 0.1) : 1.0;

    const underperformers = context.currentPositions.filter(pos =>
      pos.exitScore > 1.5 || pos.actualReturn < this.opportunityThreshold / 2
    );

    return { efficiency, underperformers, totalReturn };
  }

  /**
   * Prioritize opportunities by multiple factors
   */
  private prioritizeOpportunities(opportunities: OpportunityAnalysis[]): OpportunityAnalysis[] {
    return opportunities
      .filter(opp => opp.expectedReturn >= this.opportunityThreshold)
      .sort((a, b) => {
        // Multi-factor priority scoring
        const scoreA = (a.expectedReturn * a.winProbability * a.signalStrength) / a.requiredCapital;
        const scoreB = (b.expectedReturn * b.winProbability * b.signalStrength) / b.requiredCapital;
        return scoreB - scoreA;
      })
      .slice(0, this.maxPositions); // Limit to max positions
  }

  /**
   * Deploy available capital to highest priority opportunities
   */
  private deployAvailableCapital(context: TradingContext, opportunities: OpportunityAnalysis[]): TradingDecision[] {
    const decisions: TradingDecision[] = [];
    let remainingCapital = context.availableCapital;

    console.log(`💰 Available Capital Deployment: $${remainingCapital.toFixed(2)}`);

    for (const opportunity of opportunities) {
      if (remainingCapital < this.minPositionSize) break;

      const optimalSize = capitalEfficiencyOptimizer.calculateOptimalPositionSize(
        opportunity,
        context.totalPortfolio,
        context.riskTolerance
      );

      const deploySize = Math.min(optimalSize, remainingCapital, opportunity.requiredCapital * 2);

      if (deploySize >= this.minPositionSize) {
        decisions.push({
          action: 'BUY',
          symbol: opportunity.symbol,
          size: deploySize,
          reasoning: `Deploy available capital: ${opportunity.expectedReturn.toFixed(1)}% expected (${opportunity.winProbability.toFixed(1)}% win prob)`,
          priority: opportunity.rotationPriority,
          expectedReturn: opportunity.expectedReturn,
          confidence: opportunity.winProbability
        });

        remainingCapital -= deploySize;
        console.log(`  ✅ DEPLOY ${opportunity.symbol}: $${deploySize.toFixed(2)} (${opportunity.expectedReturn.toFixed(1)}% expected)`);
      }
    }

    return decisions;
  }

  /**
   * Evaluate opportunities for position rotation
   */
  private evaluateRotationOpportunities(context: TradingContext, opportunities: OpportunityAnalysis[]): TradingDecision[] {
    const decisions: TradingDecision[] = [];

    console.log(`🔄 Rotation Analysis:`);

    for (const opportunity of opportunities) {
      // Find best rotation candidate
      const rotationCandidate = this.findBestRotationCandidate(context.currentPositions, opportunity);

      if (rotationCandidate) {
        const efficiencyGain = opportunity.expectedReturn / Math.max(rotationCandidate.expectedReturn, 0.1);

        if (efficiencyGain >= this.rotationThreshold) {
          // Exit current position
          decisions.push({
            action: 'SELL',
            symbol: rotationCandidate.symbol,
            size: rotationCandidate.currentValue,
            reasoning: `Rotate for ${efficiencyGain.toFixed(1)}x efficiency gain`,
            priority: efficiencyGain * 10,
            expectedReturn: rotationCandidate.actualReturn,
            confidence: 90
          });

          // Enter new position
          decisions.push({
            action: 'BUY',
            symbol: opportunity.symbol,
            size: rotationCandidate.currentValue,
            reasoning: `Rotation target: ${opportunity.expectedReturn.toFixed(1)}% expected vs ${rotationCandidate.actualReturn.toFixed(1)}% current`,
            priority: opportunity.rotationPriority,
            expectedReturn: opportunity.expectedReturn,
            confidence: opportunity.winProbability
          });

          console.log(`  🔄 ROTATE ${rotationCandidate.symbol} → ${opportunity.symbol}: ${efficiencyGain.toFixed(1)}x efficiency`);
        }
      }
    }

    return decisions;
  }

  /**
   * Find best candidate for rotation
   */
  private findBestRotationCandidate(positions: PositionAnalysis[], opportunity: OpportunityAnalysis): PositionAnalysis | null {
    return positions
      .filter(pos => {
        // Don't rotate if mathematical conviction is too high
        if (capitalEfficiencyOptimizer.shouldOverrideWithConviction(pos)) return false;

        // Position must be suitable size for the opportunity
        if (pos.currentValue < opportunity.requiredCapital * 0.8) return false;

        return true;
      })
      .sort((a, b) => b.exitScore - a.exitScore) // Highest exit score first
      [0] || null;
  }

  /**
   * Apply market regime filters
   */
  private applyMarketRegimeFilters(decisions: TradingDecision[], regime: string): TradingDecision[] {
    console.log(`🌊 Market Regime Filter: ${regime}`);

    return decisions.map(decision => {
      let adjustedDecision = { ...decision };

      switch (regime) {
        case 'VOLATILE':
          // Reduce position sizes in volatile markets
          adjustedDecision.size *= 0.75;
          adjustedDecision.reasoning += ' (volatile regime: reduced size)';
          break;

        case 'BEAR':
          // More conservative in bear markets
          if (decision.expectedReturn < 15.0) {
            adjustedDecision.action = 'HOLD';
            adjustedDecision.reasoning += ' (bear regime: higher threshold required)';
          }
          break;

        case 'BULL':
          // More aggressive in bull markets
          adjustedDecision.size *= 1.2;
          adjustedDecision.reasoning += ' (bull regime: increased size)';
          break;
      }

      return adjustedDecision;
    });
  }

  /**
   * Final position sizing optimization
   */
  private optimizePositionSizing(decisions: TradingDecision[], context: TradingContext): TradingDecision[] {
    console.log(`📐 Position Sizing Optimization:`);

    return decisions.map(decision => {
      // Ensure minimum position size
      if (decision.size < this.minPositionSize && decision.action === 'BUY') {
        decision.size = this.minPositionSize;
        decision.reasoning += ` (min size: $${this.minPositionSize})`;
      }

      // Cap maximum position size (risk management)
      const maxPositionSize = context.totalPortfolio * context.riskTolerance;
      if (decision.size > maxPositionSize) {
        decision.size = maxPositionSize;
        decision.reasoning += ` (max risk cap: ${(context.riskTolerance * 100).toFixed(0)}%)`;
      }

      return decision;
    });
  }

  /**
   * Log decision summary
   */
  private logDecisionSummary(decisions: TradingDecision[]): void {
    console.log(`\n📋 TRADING DECISIONS SUMMARY:`);
    console.log(`Total Decisions: ${decisions.length}`);

    const buyDecisions = decisions.filter(d => d.action === 'BUY');
    const sellDecisions = decisions.filter(d => d.action === 'SELL');
    const rotateDecisions = decisions.filter(d => d.action === 'ROTATE');

    console.log(`  📥 BUY Orders: ${buyDecisions.length}`);
    console.log(`  📤 SELL Orders: ${sellDecisions.length}`);
    console.log(`  🔄 ROTATE Orders: ${rotateDecisions.length}`);

    if (buyDecisions.length > 0) {
      const totalBuyAmount = buyDecisions.reduce((sum, d) => sum + d.size, 0);
      const avgExpectedReturn = buyDecisions.reduce((sum, d) => sum + d.expectedReturn, 0) / buyDecisions.length;
      console.log(`  💰 Total Buy Amount: $${totalBuyAmount.toFixed(2)}`);
      console.log(`  📈 Avg Expected Return: ${avgExpectedReturn.toFixed(1)}%`);
    }

    decisions.forEach((decision, index) => {
      console.log(`  ${index + 1}. ${decision.action} ${decision.symbol}: $${decision.size.toFixed(2)} - ${decision.reasoning}`);
    });
  }

  /**
   * Execute trading decisions (integration point with existing trading system)
   */
  async executeDecisions(decisions: TradingDecision[]): Promise<void> {
    console.log(`\n🚀 EXECUTING ${decisions.length} TRADING DECISIONS`);

    // Sort by priority (highest first)
    const sortedDecisions = decisions.sort((a, b) => b.priority - a.priority);

    for (const decision of sortedDecisions) {
      console.log(`⚡ Executing: ${decision.action} ${decision.symbol} $${decision.size.toFixed(2)}`);
      console.log(`   Reasoning: ${decision.reasoning}`);

      // Integration point: Call existing trading system execution logic
      // await this.executeTrade(decision);

      // For now, just log the decision
      console.log(`   ✅ Decision logged for execution`);
    }
  }
}

// Export singleton instance
export const advancedTradingCoordinator = new AdvancedTradingCoordinator();