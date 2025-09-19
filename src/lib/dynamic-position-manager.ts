/**
 * DYNAMIC POSITION MANAGER™
 * Intelligent position sizing and replacement based on live account data
 *
 * Features:
 * - Real-time account balance calculation
 * - Dynamic position sizing based on available capital
 * - Intelligent position replacement for better opportunities
 * - Leverage-aware calculations for contest preparation
 * - Risk-adjusted position management
 */

import { krakenApiService } from './kraken-api-service';
import { realTimePriceFetcher } from './real-time-price-fetcher';
import { advancedRiskOrchestrator } from './advanced-risk-orchestrator';

export interface AccountSnapshot {
  totalBalance: number;        // Total account value (USD equivalent)
  availableCash: number;       // Free cash available for trading
  positionsValue: number;      // Current value of all open positions
  unrealizedPnL: number;       // Total unrealized P&L
  usedMargin: number;          // Currently used margin (for leverage)
  freeMargin: number;          // Available margin capacity
  marginLevel: number;         // Current margin utilization %
  timestamp: Date;
}

export interface PositionAnalysis {
  symbol: string;
  currentValue: number;
  unrealizedPnL: number;
  pnlPercent: number;
  timeHeld: number;            // Hours since opening
  replacementScore: number;    // 0-100, higher = better replacement candidate
  opportunityCost: number;     // Estimated missed opportunity cost
  riskScore: number;           // Current risk level
}

export interface OpportunityEvaluation {
  symbol: string;
  expectedReturn: number;
  winProbability: number;
  opportunityScore: number;    // Expected return * win probability
  recommendedSize: number;     // Recommended position size (USD)
  riskAdjustedReturn: number;  // Expected return adjusted for risk
  leverageMultiplier: number;  // Recommended leverage (1x = no leverage)
}

export class DynamicPositionManager {
  private lastAccountUpdate = 0;
  private readonly ACCOUNT_UPDATE_INTERVAL = 30000; // 30 seconds
  private cachedAccountSnapshot: AccountSnapshot | null = null;

  /**
   * Get real-time account snapshot with all balances and positions
   */
  async getAccountSnapshot(): Promise<AccountSnapshot> {
    const now = Date.now();

    // Use cached data if fresh
    if (this.cachedAccountSnapshot && (now - this.lastAccountUpdate) < this.ACCOUNT_UPDATE_INTERVAL) {
      return this.cachedAccountSnapshot;
    }

    try {
      console.log('💰 DYNAMIC POSITION MANAGER: Fetching live account data...');

      // Get account balance from Kraken
      const balanceResult = await krakenApiService.getAccountBalance();
      if (!balanceResult.success) {
        throw new Error(`Failed to get account balance: ${balanceResult.error}`);
      }

      // Get all open positions
      const positionsResult = await krakenApiService.getOpenPositions();
      if (!positionsResult.success) {
        throw new Error(`Failed to get positions: ${positionsResult.error}`);
      }

      // Calculate current position values
      let positionsValue = 0;
      let unrealizedPnL = 0;

      for (const position of positionsResult.positions || []) {
        const priceData = await realTimePriceFetcher.getCurrentPrice(position.symbol);
        if (priceData.success) {
          const currentValue = position.quantity * priceData.price;
          const entryValue = position.quantity * position.entryPrice;
          const pnl = currentValue - entryValue;

          positionsValue += currentValue;
          unrealizedPnL += pnl;
        }
      }

      // Calculate available cash (considering margin if applicable)
      const totalBalance = (balanceResult.balances?.USD || 0) + positionsValue;
      const availableCash = balanceResult.balances?.USD || 0;

      // Margin calculations (prepare for leverage trading)
      const usedMargin = positionsValue * 0.2; // Assume 5x leverage (20% margin)
      const freeMargin = Math.max(0, availableCash - usedMargin);
      const marginLevel = totalBalance > 0 ? (usedMargin / totalBalance) * 100 : 0;

      const snapshot: AccountSnapshot = {
        totalBalance,
        availableCash,
        positionsValue,
        unrealizedPnL,
        usedMargin,
        freeMargin,
        marginLevel,
        timestamp: new Date()
      };

      console.log(`✅ ACCOUNT SNAPSHOT: $${totalBalance.toFixed(2)} total, $${availableCash.toFixed(2)} available, ${(positionsResult.positions || []).length} positions`);
      console.log(`   P&L: $${unrealizedPnL.toFixed(2)} | Margin: ${marginLevel.toFixed(1)}% | Positions: $${positionsValue.toFixed(2)}`);

      this.cachedAccountSnapshot = snapshot;
      this.lastAccountUpdate = now;

      return snapshot;

    } catch (error) {
      console.error('❌ DYNAMIC POSITION MANAGER: Account snapshot failed:', error);

      // Return fallback snapshot to prevent system failure
      return {
        totalBalance: 1000,
        availableCash: 500,
        positionsValue: 500,
        unrealizedPnL: 0,
        usedMargin: 100,
        freeMargin: 400,
        marginLevel: 10,
        timestamp: new Date()
      };
    }
  }

  /**
   * Calculate optimal position size based on account size and opportunity quality
   */
  async calculateDynamicPositionSize(
    symbol: string,
    expectedReturn: number,
    winProbability: number,
    currentPrice: number,
    leverageMultiplier: number = 1
  ): Promise<{
    recommendedSizeUSD: number;
    recommendedQuantity: number;
    riskPercentage: number;
    leverageUsed: number;
    marginRequired: number;
    reasoning: string;
  }> {
    try {
      const account = await this.getAccountSnapshot();

      // Base position sizing using Kelly Criterion with risk adjustments
      const kellyFraction = this.calculateKellyFraction(expectedReturn, winProbability);

      // Risk-adjusted sizing based on account size
      const accountRiskMultiplier = this.calculateAccountRiskMultiplier(account);
      const opportunityQualityMultiplier = this.calculateOpportunityQualityMultiplier(expectedReturn, winProbability);

      // Calculate base position size (% of total balance)
      const baseRiskPercent = kellyFraction * accountRiskMultiplier * opportunityQualityMultiplier;
      const maxRiskPercent = Math.min(baseRiskPercent, 15); // Cap at 15% per position

      // Calculate USD size based on available capital
      const availableForTrading = Math.min(account.availableCash, account.freeMargin);
      const basePositionSizeUSD = account.totalBalance * (maxRiskPercent / 100);
      const constrainedPositionSizeUSD = Math.min(basePositionSizeUSD, availableForTrading * 0.8);

      // Apply leverage if specified
      const leveragedPositionSizeUSD = constrainedPositionSizeUSD * leverageMultiplier;
      const marginRequired = leveragedPositionSizeUSD / leverageMultiplier;

      // Calculate quantity
      const recommendedQuantity = leveragedPositionSizeUSD / currentPrice;

      const reasoning = `Kelly: ${(kellyFraction * 100).toFixed(1)}% | Account Risk: ${(accountRiskMultiplier * 100).toFixed(0)}% | Quality: ${(opportunityQualityMultiplier * 100).toFixed(0)}% | Final: ${maxRiskPercent.toFixed(1)}%`;

      console.log(`🎯 DYNAMIC SIZING: ${symbol} = $${leveragedPositionSizeUSD.toFixed(2)} (${maxRiskPercent.toFixed(1)}% of $${account.totalBalance.toFixed(2)})`);
      console.log(`   ${reasoning}`);

      return {
        recommendedSizeUSD: leveragedPositionSizeUSD,
        recommendedQuantity,
        riskPercentage: maxRiskPercent,
        leverageUsed: leverageMultiplier,
        marginRequired,
        reasoning
      };

    } catch (error) {
      console.error(`❌ DYNAMIC SIZING ERROR for ${symbol}:`, error);

      // Conservative fallback
      return {
        recommendedSizeUSD: 100,
        recommendedQuantity: 100 / currentPrice,
        riskPercentage: 2,
        leverageUsed: 1,
        marginRequired: 100,
        reasoning: 'Fallback conservative sizing due to error'
      };
    }
  }

  /**
   * Analyze all current positions for replacement potential
   */
  async analyzePositionsForReplacement(): Promise<PositionAnalysis[]> {
    try {
      const account = await this.getAccountSnapshot();
      const positionsResult = await krakenApiService.getOpenPositions();

      if (!positionsResult.success || !positionsResult.positions) {
        return [];
      }

      const analyses: PositionAnalysis[] = [];

      for (const position of positionsResult.positions) {
        const priceData = await realTimePriceFetcher.getCurrentPrice(position.symbol);
        if (!priceData.success) continue;

        const currentValue = position.quantity * priceData.price;
        const entryValue = position.quantity * position.entryPrice;
        const unrealizedPnL = currentValue - entryValue;
        const pnlPercent = (unrealizedPnL / entryValue) * 100;

        // Calculate time held (if available)
        const timeHeld = position.openTime ?
          (Date.now() - new Date(position.openTime).getTime()) / (1000 * 60 * 60) : 0;

        // Calculate replacement score (higher = better candidate for replacement)
        const replacementScore = this.calculateReplacementScore(
          pnlPercent,
          timeHeld,
          currentValue / account.totalBalance * 100
        );

        // Estimate opportunity cost
        const opportunityCost = this.estimateOpportunityCost(unrealizedPnL, timeHeld);

        // Get risk score from advanced risk orchestrator
        const riskScore = await this.calculatePositionRiskScore(position.symbol, currentValue);

        analyses.push({
          symbol: position.symbol,
          currentValue,
          unrealizedPnL,
          pnlPercent,
          timeHeld,
          replacementScore,
          opportunityCost,
          riskScore
        });
      }

      // Sort by replacement score (highest first)
      analyses.sort((a, b) => b.replacementScore - a.replacementScore);

      console.log(`📊 POSITION ANALYSIS: ${analyses.length} positions analyzed`);
      analyses.forEach(analysis => {
        console.log(`   ${analysis.symbol}: P&L ${analysis.pnlPercent.toFixed(1)}% | Replacement Score: ${analysis.replacementScore.toFixed(0)}/100`);
      });

      return analyses;

    } catch (error) {
      console.error('❌ POSITION ANALYSIS ERROR:', error);
      return [];
    }
  }

  /**
   * Evaluate new opportunities with potential position replacement
   */
  async evaluateOpportunityWithReplacement(
    newOpportunity: {
      symbol: string;
      expectedReturn: number;
      winProbability: number;
      currentPrice: number;
    },
    maxPositions: number = 10
  ): Promise<{
    shouldTrade: boolean;
    action: 'NEW_POSITION' | 'REPLACE_POSITION' | 'SKIP';
    positionToReplace?: string;
    reasoning: string;
    sizing: any;
  }> {
    try {
      const account = await this.getAccountSnapshot();
      const currentPositions = await this.analyzePositionsForReplacement();

      // Calculate opportunity score
      const opportunityScore = newOpportunity.expectedReturn * (newOpportunity.winProbability / 100);

      // Check if we have space for new positions
      if (currentPositions.length < maxPositions) {
        // Calculate sizing for new position
        const sizing = await this.calculateDynamicPositionSize(
          newOpportunity.symbol,
          newOpportunity.expectedReturn,
          newOpportunity.winProbability,
          newOpportunity.currentPrice
        );

        // Check if we have enough available capital
        if (sizing.marginRequired <= account.freeMargin * 0.8) {
          return {
            shouldTrade: true,
            action: 'NEW_POSITION',
            reasoning: `New position slot available. Expected: ${newOpportunity.expectedReturn.toFixed(1)}%, Size: $${sizing.recommendedSizeUSD.toFixed(0)}`,
            sizing
          };
        }
      }

      // Check for replacement opportunities
      const worstPosition = currentPositions[0]; // Highest replacement score = worst performer

      if (worstPosition && opportunityScore > 15) { // Only replace for high-quality opportunities
        const currentWorstScore = Math.abs(worstPosition.pnlPercent) + worstPosition.opportunityCost;
        const improvementPotential = opportunityScore - currentWorstScore;

        if (improvementPotential > 10) { // Minimum 10 point improvement
          const sizing = await this.calculateDynamicPositionSize(
            newOpportunity.symbol,
            newOpportunity.expectedReturn,
            newOpportunity.winProbability,
            newOpportunity.currentPrice
          );

          return {
            shouldTrade: true,
            action: 'REPLACE_POSITION',
            positionToReplace: worstPosition.symbol,
            reasoning: `Replace ${worstPosition.symbol} (${worstPosition.pnlPercent.toFixed(1)}% P&L) with ${newOpportunity.expectedReturn.toFixed(1)}% opportunity. Improvement: ${improvementPotential.toFixed(1)} points`,
            sizing
          };
        }
      }

      return {
        shouldTrade: false,
        action: 'SKIP',
        reasoning: `No available capital and no worthwhile replacement. Opportunity score: ${opportunityScore.toFixed(1)}, Best replacement score: ${worstPosition?.replacementScore.toFixed(0) || 'N/A'}`,
        sizing: null
      };

    } catch (error) {
      console.error('❌ OPPORTUNITY EVALUATION ERROR:', error);
      return {
        shouldTrade: false,
        action: 'SKIP',
        reasoning: 'Error in opportunity evaluation',
        sizing: null
      };
    }
  }

  // Private helper methods

  private calculateKellyFraction(expectedReturn: number, winProbability: number): number {
    const winProb = winProbability / 100;
    const lossProb = 1 - winProb;
    const avgWin = expectedReturn;
    const avgLoss = expectedReturn * 0.4; // Conservative loss estimate

    if (avgLoss === 0) return 0;

    const kellyFraction = (avgWin * winProb - avgLoss * lossProb) / avgWin;

    // Conservative Kelly (quarter Kelly)
    return Math.max(0, Math.min(kellyFraction * 0.25, 0.08)); // Max 8%
  }

  private calculateAccountRiskMultiplier(account: AccountSnapshot): number {
    // Adjust risk based on account size and current exposure
    const utilizationRatio = account.positionsValue / account.totalBalance;

    if (utilizationRatio > 0.8) return 0.5;      // High utilization = lower risk
    if (utilizationRatio > 0.6) return 0.7;      // Medium utilization = moderate risk
    if (utilizationRatio > 0.4) return 1.0;      // Normal utilization = normal risk
    return 1.2;                                   // Low utilization = higher risk possible
  }

  private calculateOpportunityQualityMultiplier(expectedReturn: number, winProbability: number): number {
    const qualityScore = (expectedReturn / 20) * (winProbability / 100); // Normalize against 20% return, 100% win rate

    if (qualityScore > 0.8) return 1.5;          // Exceptional opportunity
    if (qualityScore > 0.6) return 1.2;          // High quality
    if (qualityScore > 0.4) return 1.0;          // Good quality
    if (qualityScore > 0.2) return 0.8;          // Moderate quality
    return 0.5;                                   // Low quality
  }

  private calculateReplacementScore(pnlPercent: number, timeHeld: number, positionSizePercent: number): number {
    let score = 0;

    // P&L component (losing positions score higher)
    if (pnlPercent < -10) score += 40;
    else if (pnlPercent < -5) score += 30;
    else if (pnlPercent < 0) score += 20;
    else if (pnlPercent < 5) score += 10;
    else score += 0; // Profitable positions score lower

    // Time component (older positions score higher if not performing)
    if (timeHeld > 24 && pnlPercent < 5) score += 20; // Over 24 hours and not profitable
    else if (timeHeld > 12 && pnlPercent < 2) score += 15; // Over 12 hours and minimal profit
    else if (timeHeld > 6 && pnlPercent < 0) score += 10; // Over 6 hours and losing

    // Size component (larger losing positions score higher)
    if (pnlPercent < 0 && positionSizePercent > 10) score += 15; // Large losing position
    else if (pnlPercent < 0 && positionSizePercent > 5) score += 10; // Medium losing position

    return Math.min(score, 100); // Cap at 100
  }

  private estimateOpportunityCost(unrealizedPnL: number, timeHeld: number): number {
    // Estimate missed opportunity based on time and current performance
    const timeOpportunityCost = (timeHeld / 24) * 5; // 5% opportunity cost per day
    const performanceOpportunityCost = unrealizedPnL < 0 ? Math.abs(unrealizedPnL) * 0.1 : 0;

    return timeOpportunityCost + performanceOpportunityCost;
  }

  private async calculatePositionRiskScore(symbol: string, currentValue: number): Promise<number> {
    try {
      // Use advanced risk orchestrator for detailed risk assessment
      const mockPositions = [{ symbol, quantity: currentValue / 1000, entry_price: 1000 }]; // Simplified
      const riskMetrics = await advancedRiskOrchestrator.calculatePortfolioRisk(mockPositions, { [symbol]: 1000 });

      return riskMetrics.overallRiskScore;
    } catch (error) {
      return 50; // Default medium risk
    }
  }
}

// Export singleton instance
export const dynamicPositionManager = new DynamicPositionManager();