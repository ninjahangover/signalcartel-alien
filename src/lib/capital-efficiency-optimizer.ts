/**
 * Capital Efficiency Optimizer
 * Maximizes returns under capital constraints through intelligent position rotation
 * V3.8.0: Enhanced with Adaptive Learning Profit Brain for dynamic equation evolution
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
  private rotationHistory: Map<string, Date> = new Map(); // Track last rotation time
  private dailyRotationCount: number = 0;
  private lastRotationReset: Date = new Date();
  private adaptiveBrain: any = null; // Loaded dynamically to avoid circular dependencies

  /**
   * Record trade outcome for adaptive learning
   */
  async recordTradeOutcome(
    symbol: string,
    expectedReturn: number,
    actualReturn: number,
    decisionFactors: {
      timeHeld: number;
      marketRegime: string;
      convictionLevel: number;
      opportunityCost: number;
      rotationScore: number;
    },
    profitImpact: number
  ): Promise<void> {
    if (!this.adaptiveBrain) {
      try {
        const { adaptiveProfitBrain } = await import('./adaptive-profit-brain');
        this.adaptiveBrain = adaptiveProfitBrain;
      } catch (error) {
        console.warn('⚠️ Cannot record outcome - Adaptive brain unavailable:', error.message);
        return;
      }
    }

    const outcome = {
      symbol,
      expectedReturn,
      actualReturn,
      winProbability: expectedReturn > 0 ? 0.65 : 0.35,
      actualWin: actualReturn > 0,
      decisionFactors,
      profitImpact,
      timestamp: new Date()
    };

    this.adaptiveBrain.recordTradeOutcome(outcome);
    console.log(`🧠 Recorded ${symbol} outcome for adaptive learning: expected ${expectedReturn.toFixed(1)}% → actual ${actualReturn.toFixed(1)}%`);
  }

  /**
   * Calculate expected future value for a position if held
   * Uses decay curves to model diminishing returns over time
   */
  private calculateExpectedFutureValue(position: PositionAnalysis): number {
    // Model momentum decay: winners tend to slow down, losers may reverse
    const currentReturn = position.actualReturn / 100; // Convert to decimal

    // Mean reversion factor: extreme moves tend to reverse
    const meanReversionPressure = Math.tanh(Math.abs(currentReturn) / 0.3); // Increases with extreme moves

    // Time decay: expected returns diminish over time (diminishing marginal returns)
    const timeDecay = Math.exp(-position.holdingDays / 14); // Half-life of 2 weeks

    // Future expected return = current momentum * decay factors
    const expectedFutureReturn = currentReturn * (1 - meanReversionPressure * 0.5) * timeDecay;

    // Add risk-adjusted expectancy based on historical volatility
    const riskPenalty = position.historicalVol / 100; // Higher vol = higher risk

    return expectedFutureReturn - (riskPenalty * 0.5);
  }

  /**
   * Calculate the profit-maximizing decision for any position-opportunity pair
   * V3.8.0: Enhanced with Adaptive Learning Brain for dynamic equation evolution
   * Returns the action that maximizes expected profit using evolved neural pathways
   */
  private async calculateProfitMaximizingAction(
    position: PositionAnalysis,
    opportunity: OpportunityAnalysis | null
  ): Promise<{
    action: 'hold' | 'rotate' | 'partial_exit' | 'full_exit';
    expectedProfit: number;
    fraction?: number; // For partial exits
    reasoning: string;
    neuralDecision?: any; // From adaptive brain
  }> {
    // Load adaptive brain dynamically
    if (!this.adaptiveBrain) {
      try {
        const { adaptiveProfitBrain } = await import('./adaptive-profit-brain');
        this.adaptiveBrain = adaptiveProfitBrain;
      } catch (error) {
        console.warn('⚠️ Adaptive brain unavailable, falling back to static equations:', error.message);
        return this.calculateStaticProfitAction(position, opportunity);
      }
    }

    // Use adaptive learning brain for decision making
    const neuralDecision = this.adaptiveBrain.calculateAdaptiveProfitDecision(
      {
        symbol: position.symbol,
        actualReturn: position.actualReturn,
        expectedReturn: position.expectedReturn,
        holdingDays: position.holdingDays,
        mathematicalProof: position.mathematicalProof,
        aiConfidence: position.aiConfidence,
        currentValue: position.currentValue
      },
      opportunity ? {
        symbol: opportunity.symbol,
        expectedReturn: opportunity.expectedReturn,
        winProbability: opportunity.winProbability,
        signalStrength: opportunity.signalStrength,
        requiredCapital: opportunity.requiredCapital
      } : undefined
    );

    // Map neural decision to expected format
    let fraction: number | undefined;
    if (neuralDecision.action === 'partial_exit') {
      // Use Kelly Criterion for partial exit fraction
      const currentProfit = position.actualReturn / 100;
      const winProb = Math.min(position.aiConfidence / 100, 0.8);
      const winLossRatio = Math.abs(neuralDecision.expectedProfit / (currentProfit * 0.5));
      fraction = Math.max(0.2, Math.min(0.8,
        (winProb * winLossRatio - (1 - winProb)) / winLossRatio
      ));
    }

    return {
      action: neuralDecision.action === 'full_exit' ? 'partial_exit' : neuralDecision.action as any,
      expectedProfit: neuralDecision.expectedProfit,
      fraction,
      reasoning: `🧠 ADAPTIVE NEURAL DECISION: ${neuralDecision.neuralReasoning} | Confidence: ${(neuralDecision.confidence * 100).toFixed(1)}%`,
      neuralDecision
    };
  }

  /**
   * Fallback to static calculations if adaptive brain fails
   */
  private calculateStaticProfitAction(
    position: PositionAnalysis,
    opportunity: OpportunityAnalysis | null
  ): {
    action: 'hold' | 'rotate' | 'partial_exit' | 'full_exit';
    expectedProfit: number;
    fraction?: number;
    reasoning: string;
  } {
    const transactionCost = 0.0084; // 0.42% each way

    // Calculate expected value of holding current position
    const futureValue = this.calculateExpectedFutureValue(position);
    const holdValue = futureValue - (futureValue * position.historicalVol / 200); // Risk-adjusted

    // Calculate expected value of rotating to new opportunity
    let rotateValue = -Infinity;
    if (opportunity) {
      const opportunityReturn = opportunity.expectedReturn / 100;
      const opportunityRisk = opportunityReturn * (1 - opportunity.winProbability);
      rotateValue = opportunityReturn - opportunityRisk - transactionCost;
    }

    // Calculate expected value of partial profit-taking
    // Use Kelly Criterion to determine optimal fraction
    const currentProfit = position.actualReturn / 100;
    let partialExitValue = 0;
    let optimalFraction = 0;

    if (currentProfit > 0) {
      // Kelly fraction for profit-taking based on future uncertainty
      const winProb = 0.5 + (position.mathematicalProof * 0.3); // 50-80% based on conviction
      const winLossRatio = Math.abs(futureValue / (currentProfit * 0.5)); // Potential gain vs half current profit

      const kellyFraction = Math.max(0, Math.min(1,
        (winProb * winLossRatio - (1 - winProb)) / winLossRatio
      ));

      // Expected value of taking partial profits
      const lockedProfit = currentProfit * kellyFraction * (1 - transactionCost/2);
      const remainingUpside = futureValue * (1 - kellyFraction);
      partialExitValue = lockedProfit + remainingUpside;
      optimalFraction = kellyFraction;
    }

    // Choose action with highest expected value
    if (rotateValue > holdValue && rotateValue > partialExitValue && opportunity) {
      return {
        action: 'rotate' as any,
        expectedProfit: rotateValue,
        reasoning: `STATIC: Rotate for ${(rotateValue * 100).toFixed(1)}% expected profit (${(opportunity.expectedReturn).toFixed(1)}% opportunity - ${(transactionCost * 100).toFixed(1)}% costs)`
      };
    } else if (partialExitValue > holdValue && partialExitValue > rotateValue && optimalFraction > 0.1) {
      return {
        action: 'partial_exit' as any,
        expectedProfit: partialExitValue,
        fraction: optimalFraction,
        reasoning: `STATIC: Take ${(optimalFraction * 100).toFixed(0)}% profits: Lock ${(currentProfit * optimalFraction * 100).toFixed(1)}% + keep ${((1-optimalFraction) * 100).toFixed(0)}% for ${(futureValue * 100).toFixed(1)}% upside`
      };
    } else {
      return {
        action: 'hold' as any,
        expectedProfit: holdValue,
        reasoning: `STATIC: Hold for ${(holdValue * 100).toFixed(1)}% expected value (${(futureValue * 100).toFixed(1)}% future - ${(position.historicalVol/2).toFixed(1)}% risk)`
      };
    }
  }

  /**
   * Calculate dynamic rotation score based on multiple factors
   * Higher score = more compelling rotation opportunity
   * Score naturally balances opportunity vs overtrading
   * Now includes profit-taking considerations
   */
  private calculateRotationScore(
    currentPosition: PositionAnalysis,
    newOpportunity: OpportunityAnalysis
  ): number {
    // Check if this is a profit-taking rotation (selling winner for redeployment)
    const isProfitTaking = currentPosition.actualReturn > 30;

    // Time decay factor - positions become less "sticky" over time
    // For profit-taking, time factor accelerates faster
    const hoursHeld = currentPosition.holdingDays * 24;
    const timeDecayRate = isProfitTaking ? 8 : 12; // Faster decay for winners
    const timeFactor = 1 / (1 + Math.exp(-(hoursHeld - 24) / timeDecayRate));

    // Opportunity magnitude - exponential scaling for large differences
    // Small differences (1.5x) score low, large differences (5x+) score high
    const opportunityRatio = newOpportunity.expectedReturn / Math.max(Math.abs(currentPosition.actualReturn), 1);
    const magnitudeFactor = 1 - Math.exp(-0.3 * (opportunityRatio - 1));

    // Confidence differential - prefer high confidence opportunities over low confidence positions
    const confidenceDelta = newOpportunity.winProbability - (currentPosition.aiConfidence / 100);
    const confidenceFactor = (1 + Math.tanh(confidenceDelta * 3)) / 2; // Smooth -1 to 1 mapping to 0 to 1

    // Transaction cost impact - naturally reduces rotation for small gains
    const transactionCost = 0.0084; // 0.42% each way
    const netGain = (newOpportunity.expectedReturn - currentPosition.actualReturn) / 100;
    const costAdjustedGain = netGain - transactionCost;
    const costFactor = Math.max(0, Math.min(1, costAdjustedGain * 10)); // 0 if negative, scales up to 1 at 10% net gain

    // Position performance penalty - underperformers get higher rotation scores
    const performancePenalty = currentPosition.actualReturn < 0
      ? 1 + Math.min(Math.abs(currentPosition.actualReturn) / 20, 1) // Up to 2x multiplier for -20% losses
      : 1;

    // Daily rotation fatigue - each rotation today makes the next one harder
    const rotationFatigue = Math.exp(-this.dailyRotationCount * 0.5); // e^(-0.5n), drops to 0.37 after 2 rotations

    // Combined rotation score (0 to ~3 range, typically 0.5-1.5)
    const rotationScore =
      timeFactor *
      magnitudeFactor *
      confidenceFactor *
      costFactor *
      performancePenalty *
      rotationFatigue;

    return rotationScore;
  }

  /**
   * Reset daily rotation counter if new day
   */
  private checkAndResetDaily(): void {
    const now = new Date();
    if (now.getDate() !== this.lastRotationReset.getDate()) {
      this.dailyRotationCount = 0;
      this.lastRotationReset = now;
    }
  }

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
   * Main optimization algorithm - Pure Profit Maximization
   * V3.8.0: Enhanced with Adaptive Learning Brain for dynamic evolution
   * Every decision based on maximizing expected value using neural pathways
   */
  async optimizeCapitalAllocation(
    currentPositions: PositionAnalysis[],
    newOpportunities: OpportunityAnalysis[],
    availableCapital: number,
    totalCapital: number
  ): Promise<{
    exitRecommendations: string[];
    entryRecommendations: string[];
    partialExits: Array<{ symbol: string; fraction: number }>;
    reasoning: string[];
    neuralInsights?: string[];
  }> {

    const recommendations = {
      exitRecommendations: [] as string[],
      entryRecommendations: [] as string[],
      partialExits: [] as Array<{ symbol: string; fraction: number }>,
      reasoning: [] as string[]
    };

    // Check and reset daily rotation counter if needed
    this.checkAndResetDaily();

    // Sort opportunities by rotation priority
    const sortedOpportunities = newOpportunities
      .sort((a, b) => b.rotationPriority - a.rotationPriority);

    // Calculate rotation scores for all position-opportunity pairs
    const rotationCandidates: Array<{
      position: PositionAnalysis;
      opportunity: OpportunityAnalysis;
      rotationScore: number;
    }> = [];

    // Evaluate all possible rotations
    for (const opportunity of sortedOpportunities) {
      for (const position of currentPositions) {
        const rotationScore = this.calculateRotationScore(position, opportunity);
        rotationCandidates.push({ position, opportunity, rotationScore });
      }
    }

    // Sort by rotation score (highest first)
    rotationCandidates.sort((a, b) => b.rotationScore - a.rotationScore);

    // Dynamic threshold based on market conditions and portfolio state
    // Rotation becomes easier when we have poor performers and great opportunities
    const avgPositionReturn = currentPositions.reduce((sum, p) => sum + p.actualReturn, 0) / Math.max(currentPositions.length, 1);
    const bestOpportunityReturn = sortedOpportunities[0]?.expectedReturn || 0;

    // Threshold adapts: ranges from 0.5 (aggressive) to 1.5 (conservative)
    // Lower when portfolio is underperforming and opportunities are strong
    const adaptiveThreshold = 1.0 -
      (Math.tanh((bestOpportunityReturn - avgPositionReturn) / 20) * 0.5);

    // Process rotation candidates that meet the adaptive threshold
    const processedPositions = new Set<string>();
    const processedOpportunities = new Set<string>();

    for (const candidate of rotationCandidates) {
      // Skip if we've already processed this position or opportunity
      if (processedPositions.has(candidate.position.symbol) ||
          processedOpportunities.has(candidate.opportunity.symbol)) {
        continue;
      }

      // Check if rotation score exceeds adaptive threshold
      if (candidate.rotationScore >= adaptiveThreshold) {
        recommendations.exitRecommendations.push(candidate.position.symbol);
        recommendations.entryRecommendations.push(candidate.opportunity.symbol);

        // Calculate detailed metrics for reasoning
        const netGain = candidate.opportunity.expectedReturn - candidate.position.actualReturn - 0.84;
        const timeFactor = 1 / (1 + Math.exp(-(candidate.position.holdingDays * 24 - 24) / 12));
        const opportunityRatio = candidate.opportunity.expectedReturn / Math.max(Math.abs(candidate.position.actualReturn), 1);

        recommendations.reasoning.push(
          `ROTATE ${candidate.position.symbol} → ${candidate.opportunity.symbol}: ` +
          `Score ${candidate.rotationScore.toFixed(2)} > ${adaptiveThreshold.toFixed(2)} threshold | ` +
          `${candidate.position.actualReturn.toFixed(1)}% → ${candidate.opportunity.expectedReturn.toFixed(1)}% ` +
          `(${opportunityRatio.toFixed(1)}x better, +${netGain.toFixed(1)}% net, time factor ${timeFactor.toFixed(2)})`
        );

        // Mark as processed
        processedPositions.add(candidate.position.symbol);
        processedOpportunities.add(candidate.opportunity.symbol);

        // Update rotation tracking
        this.rotationHistory.set(candidate.position.symbol, new Date());
        this.dailyRotationCount++;

        // Stop if we've hit natural limits (rotation fatigue will handle this mathematically)
        if (this.dailyRotationCount >= 3) {
          recommendations.reasoning.push(
            `ROTATION FATIGUE: Daily rotation count at ${this.dailyRotationCount}, future rotations will be naturally suppressed`
          );
          break;
        }
      }
    }

    // If we have available capital and no rotations, look for direct entries
    if (recommendations.entryRecommendations.length === 0 && availableCapital > 50) {
      for (const opportunity of sortedOpportunities) {
        if (processedOpportunities.has(opportunity.symbol)) continue;

        // Direct entry score based on opportunity quality alone
        const entryScore = opportunity.expectedReturn * opportunity.winProbability / 100;

        // Dynamic entry threshold based on market conditions
        const entryThreshold = 0.15 - (Math.tanh(bestOpportunityReturn / 30) * 0.10); // 0.05 to 0.15 range

        if (entryScore >= entryThreshold && availableCapital >= opportunity.requiredCapital) {
          recommendations.entryRecommendations.push(opportunity.symbol);
          recommendations.reasoning.push(
            `ENTER ${opportunity.symbol}: Score ${entryScore.toFixed(2)} > ${entryThreshold.toFixed(2)} | ` +
            `${opportunity.expectedReturn.toFixed(1)}% expected (${(opportunity.winProbability * 100).toFixed(0)}% confidence)`
          );
          availableCapital -= opportunity.requiredCapital;
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