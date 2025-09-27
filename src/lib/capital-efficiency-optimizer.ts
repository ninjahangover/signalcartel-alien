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

    // Opportunity cost factor (normalized 0-1)
    const opportunityCost = newOpportunity.expectedReturn > position.expectedReturn
      ? Math.min((newOpportunity.expectedReturn - position.expectedReturn) / 100, 1.0) // Cap at 100% difference
      : 0;

    // Time decay factor (0-1, accelerating after 7 days)
    const timeFactor = Math.min(Math.pow(position.holdingDays / 7, 1.5) / 4, 1.0);

    // Momentum deterioration (0-1, negative momentum increases exit pressure)
    const momentumScore = position.recentVelocity < 0
      ? Math.min(Math.abs(position.recentVelocity) / Math.max(position.historicalVol, 0.01), 1.0)
      : 0;

    // Position underperformance (0-1)
    const underperformance = position.currentReturn < 0
      ? Math.min(Math.abs(position.currentReturn) / 20, 1.0) // 20% loss = max score
      : position.currentReturn < position.expectedReturn * 0.5
      ? 0.3 // Underperforming expectations
      : 0;

    // Hold conviction reduction (0-1, inverse of confidence)
    const convictionReduction = 1.0 - Math.min((position.aiConfidence / 100) * position.mathProof, 1.0);

    // Weighted exit score calculation (0-1 range)
    const exitScore = (
      opportunityCost * 0.30 +      // 30% weight on opportunity cost
      timeFactor * 0.20 +            // 20% weight on time held
      momentumScore * 0.20 +         // 20% weight on negative momentum
      underperformance * 0.20 +      // 20% weight on underperformance
      convictionReduction * 0.10     // 10% weight on low conviction
    );

    // Ensure score is bounded 0-1
    return Math.max(0, Math.min(exitScore, 1.0));
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

    // Analyze current positions for exits (lowered threshold for dynamic rotation)
    const exitCandidates = currentPositions
      .filter(pos => pos.exitScore > 0.65) // Lowered from 1.5 to 0.65 for more dynamic rotation
      .sort((a, b) => b.exitScore - a.exitScore);

    // Capital efficiency threshold with minimum rotation gain
    const efficiencyThreshold = 3.0; // New opportunities should be 3x better
    const minimumRotationGain = 5.0; // Minimum 5% improvement required for rotation

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
        const rotationGain = opportunity.expectedReturn - exitCandidate.actualReturn;

        // Check both efficiency threshold AND minimum rotation gain
        if (efficiencyGain >= efficiencyThreshold &&
            rotationGain >= minimumRotationGain &&
            exitCandidate.currentValue >= opportunity.requiredCapital) {
          recommendations.exitRecommendations.push(exitCandidate.symbol);
          recommendations.entryRecommendations.push(opportunity.symbol);
          recommendations.reasoning.push(
            `ROTATE ${exitCandidate.symbol} → ${opportunity.symbol}: ` +
            `${exitCandidate.actualReturn.toFixed(1)}% → ${opportunity.expectedReturn.toFixed(1)}% ` +
            `(${efficiencyGain.toFixed(1)}x efficiency, +${rotationGain.toFixed(1)}% gain)`
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

    // Conservative Kelly (25% of full Kelly)
    const conservativeKelly = kellyFraction * 0.25;

    // Dynamic scaling based on conviction
    // High conviction (>80% win prob + >20% expected return) = up to 35% position
    // Medium conviction = 20% max
    // Low conviction = 10% max
    let dynamicCap = riskTolerance;
    if (opportunity.winProbability > 0.8 && opportunity.expectedReturn > 20) {
      dynamicCap = 0.35; // Allow larger position for exceptional opportunities
    } else if (opportunity.winProbability > 0.6 && opportunity.expectedReturn > 15) {
      dynamicCap = 0.25;
    } else {
      dynamicCap = 0.15; // Conservative for lower conviction
    }

    // Apply dynamic cap with mathematical backing
    const optimalSize = Math.min(conservativeKelly, dynamicCap);

    return totalCapital * Math.max(optimalSize, 0.01); // Minimum 1% position
  }
}

export const capitalEfficiencyOptimizer = new CapitalEfficiencyOptimizer();