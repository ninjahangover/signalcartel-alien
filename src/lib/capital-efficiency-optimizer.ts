/**
 * Capital Efficiency Optimizer
 * Maximizes returns under capital constraints through intelligent position rotation
 */

export interface PositionAnalysis {
  symbol: string;
  currentValue: number;
  unrealizedPnL: number;
  actualReturn: number;
  expectedReturn: number;
  holdingDays: number;
  aiConfidence: number;
  mathematicalProof: number;
  exitScore: number;
  efficiency: number;
}

export interface OpportunityAnalysis {
  symbol: string;
  expectedReturn: number;
  winProbability: number;
  signalStrength: number;
  requiredCapital: number;
  rotationPriority: number;
}

export class CapitalEfficiencyOptimizer {

  /**
   * Calculates exit score for current positions
   */
  calculateExitScore(position: {
    symbol: string;
    currentReturn: number;
    expectedReturn: number;
    holdingDays: number;
    recentVelocity: number;
    historicalVol: number;
    aiConfidence: number;
    mathProof: number;
  }, newOpportunity: { expectedReturn: number }): number {

    // Opportunity cost factor
    const opportunityCost = newOpportunity.expectedReturn > position.expectedReturn
      ? (newOpportunity.expectedReturn - position.expectedReturn) / Math.max(position.expectedReturn, 0.01)
      : 0;

    // Time factor (positions get stale)
    const timeFactor = Math.min(position.holdingDays / 30, 2.0);

    // Momentum factor
    const momentumFactor = position.recentVelocity / Math.max(position.historicalVol, 0.01);

    // Hold conviction (AI + Mathematical proof)
    const holdConviction = (position.aiConfidence / 100) * position.mathProof;

    // Exit score calculation
    const exitScore = (opportunityCost * timeFactor * Math.abs(momentumFactor)) - holdConviction;

    return exitScore;
  }

  /**
   * Calculates rotation priority for new opportunities
   */
  calculateRotationPriority(opportunity: {
    expectedReturn: number;
    winProbability: number;
    signalStrength: number;
    requiredCapital: number;
  }): number {

    return (opportunity.expectedReturn * opportunity.winProbability * opportunity.signalStrength)
           / Math.max(opportunity.requiredCapital, 1);
  }

  /**
   * Main optimization algorithm
   */
  optimizeCapitalAllocation(
    currentPositions: PositionAnalysis[],
    newOpportunities: OpportunityAnalysis[],
    availableCapital: number,
    totalCapital: number
  ): {
    exitRecommendations: string[];
    entryRecommendations: string[];
    reasoning: string[];
  } {

    const recommendations = {
      exitRecommendations: [] as string[],
      entryRecommendations: [] as string[],
      reasoning: [] as string[]
    };

    // Sort opportunities by rotation priority
    const sortedOpportunities = newOpportunities
      .sort((a, b) => b.rotationPriority - a.rotationPriority);

    // Analyze current positions for exits
    const exitCandidates = currentPositions
      .filter(pos => pos.exitScore > 1.5)
      .sort((a, b) => b.exitScore - a.exitScore);

    // Capital efficiency threshold
    const efficiencyThreshold = 3.0; // New opportunities should be 3x better

    for (const opportunity of sortedOpportunities) {
      if (opportunity.expectedReturn < 10.0) continue; // Minimum 10% expected return

      // Check if we have capital available
      if (availableCapital >= opportunity.requiredCapital) {
        recommendations.entryRecommendations.push(opportunity.symbol);
        recommendations.reasoning.push(
          `ENTER ${opportunity.symbol}: ${opportunity.expectedReturn.toFixed(1)}% expected (${opportunity.winProbability.toFixed(1)}% win prob)`
        );
        availableCapital -= opportunity.requiredCapital;
        continue;
      }

      // Look for positions to exit for better opportunities
      for (const exitCandidate of exitCandidates) {
        const efficiencyGain = opportunity.expectedReturn / Math.max(exitCandidate.expectedReturn, 0.01);

        if (efficiencyGain >= efficiencyThreshold && exitCandidate.currentValue >= opportunity.requiredCapital) {
          recommendations.exitRecommendations.push(exitCandidate.symbol);
          recommendations.entryRecommendations.push(opportunity.symbol);
          recommendations.reasoning.push(
            `ROTATE ${exitCandidate.symbol} → ${opportunity.symbol}: ` +
            `${exitCandidate.actualReturn.toFixed(1)}% → ${opportunity.expectedReturn.toFixed(1)}% (${efficiencyGain.toFixed(1)}x efficiency)`
          );
          break;
        }
      }
    }

    return recommendations;
  }

  /**
   * Mathematical conviction override check
   */
  shouldOverrideWithConviction(position: PositionAnalysis): boolean {
    // Override rotation if mathematical conviction is extremely high
    return (position.aiConfidence > 80 && position.mathematicalProof > 0.9);
  }

  /**
   * Risk-adjusted position sizing for new opportunities
   */
  calculateOptimalPositionSize(
    opportunity: OpportunityAnalysis,
    totalCapital: number,
    riskTolerance: number = 0.20 // 20% max risk per position
  ): number {

    // Kelly Criterion optimization
    const kellyFraction = (opportunity.winProbability * (1 + opportunity.expectedReturn/100) - 1)
                         / (opportunity.expectedReturn/100);

    // Conservative Kelly with cap
    const conservativeKelly = Math.min(kellyFraction * 0.25, riskTolerance);

    return totalCapital * Math.max(conservativeKelly, 0.01); // Minimum 1% position
  }
}

export const capitalEfficiencyOptimizer = new CapitalEfficiencyOptimizer();