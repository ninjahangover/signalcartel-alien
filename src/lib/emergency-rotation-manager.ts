/**
 * V3.14.28: EMERGENCY ROTATION MANAGER
 *
 * Problem: 98.6% of capital locked in 3 flat positions for 6+ hours.
 * Only $3.38 available, can't enter new trades (need $50 minimum).
 *
 * Solution: Automatically detect capital lockup and force rotation
 * of worst-performing positions to free capital for better opportunities.
 *
 * Philosophy: A flat position for 6 hours is WORSE than a small loss.
 * Opportunity cost of missing quality signals > commission cost of rotation.
 */

export interface Position {
  symbol: string;
  side: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  entryValue: number;
  unrealizedPnL: number;
  pnlPercent: number;
  entryTime: Date;
  holdMinutes: number;
}

export interface EmergencyRotationDecision {
  shouldRotate: boolean;
  reason: string;
  positionToClose: Position | null;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  metrics: {
    capitalUtilization: number;
    availableCapital: number;
    totalCapital: number;
    avgHoldTime: number;
    opportunityCount: number;
  };
}

export class EmergencyRotationManager {
  // Thresholds for emergency rotation triggers
  private readonly CRITICAL_CAPITAL_UTILIZATION = 0.95; // 95%+ locked = critical
  private readonly HIGH_CAPITAL_UTILIZATION = 0.90; // 90%+ locked = high urgency
  private readonly MEDIUM_CAPITAL_UTILIZATION = 0.80; // 80%+ locked = medium urgency

  private readonly MIN_AVAILABLE_CAPITAL = 20; // Need at least $20 to trade
  private readonly IDEAL_AVAILABLE_CAPITAL = 100; // Ideal to have $100+ available

  private readonly FLAT_POSITION_TIMEOUT = 30; // >30min flat = candidate for rotation
  private readonly LONG_HOLD_TIMEOUT = 60; // >60min = too long without profit

  /**
   * Evaluate if emergency rotation is needed
   */
  public evaluateEmergencyRotation(
    openPositions: Position[],
    availableCapital: number,
    totalCapital: number,
    opportunityCount: number
  ): EmergencyRotationDecision {
    // Calculate capital utilization
    const lockedCapital = totalCapital - availableCapital;
    const capitalUtilization = totalCapital > 0 ? lockedCapital / totalCapital : 0;

    // Calculate average hold time
    const avgHoldTime = openPositions.length > 0
      ? openPositions.reduce((sum, p) => sum + p.holdMinutes, 0) / openPositions.length
      : 0;

    const metrics = {
      capitalUtilization,
      availableCapital,
      totalCapital,
      avgHoldTime,
      opportunityCount
    };

    // CRITICAL: >95% locked AND <$20 available AND opportunities exist
    if (
      capitalUtilization > this.CRITICAL_CAPITAL_UTILIZATION &&
      availableCapital < this.MIN_AVAILABLE_CAPITAL &&
      opportunityCount > 0
    ) {
      const worstPosition = this.findWorstPosition(openPositions);
      return {
        shouldRotate: true,
        reason: `CRITICAL: ${(capitalUtilization * 100).toFixed(1)}% capital locked, only $${availableCapital.toFixed(2)} available, ${opportunityCount} opportunities waiting`,
        positionToClose: worstPosition,
        urgency: 'critical',
        metrics
      };
    }

    // HIGH: >90% locked AND positions held >30min AND opportunities exist
    if (
      capitalUtilization > this.HIGH_CAPITAL_UTILIZATION &&
      avgHoldTime > this.FLAT_POSITION_TIMEOUT &&
      opportunityCount >= 2
    ) {
      // Find flat positions (< 1% profit)
      const flatPositions = openPositions.filter(p => p.pnlPercent < 1.0);

      if (flatPositions.length > 0) {
        const worstFlat = this.findWorstPosition(flatPositions);
        return {
          shouldRotate: true,
          reason: `HIGH: ${(capitalUtilization * 100).toFixed(1)}% locked, ${flatPositions.length} flat positions held ${avgHoldTime.toFixed(0)}min, ${opportunityCount} better opportunities`,
          positionToClose: worstFlat,
          urgency: 'high',
          metrics
        };
      }
    }

    // MEDIUM: >80% locked AND long hold times (>60min) AND opportunities exist
    if (
      capitalUtilization > this.MEDIUM_CAPITAL_UTILIZATION &&
      avgHoldTime > this.LONG_HOLD_TIMEOUT &&
      opportunityCount >= 3
    ) {
      const stalePositions = openPositions.filter(
        p => p.holdMinutes > this.LONG_HOLD_TIMEOUT && p.pnlPercent < 2.0
      );

      if (stalePositions.length > 0) {
        const worstStale = this.findWorstPosition(stalePositions);
        return {
          shouldRotate: true,
          reason: `MEDIUM: ${stalePositions.length} positions held >${this.LONG_HOLD_TIMEOUT}min with <2% profit, ${opportunityCount} better opportunities available`,
          positionToClose: worstStale,
          urgency: 'medium',
          metrics
        };
      }
    }

    // LOW: Available capital below ideal AND flat positions exist
    if (
      availableCapital < this.IDEAL_AVAILABLE_CAPITAL &&
      opportunityCount >= 4
    ) {
      const flatPositions = openPositions.filter(
        p => p.pnlPercent < 0.5 && p.holdMinutes > 15
      );

      if (flatPositions.length > 0) {
        const worstFlat = this.findWorstPosition(flatPositions);
        return {
          shouldRotate: true,
          reason: `LOW: Only $${availableCapital.toFixed(2)} available, ${flatPositions.length} near-flat positions, ${opportunityCount} exceptional opportunities`,
          positionToClose: worstFlat,
          urgency: 'low',
          metrics
        };
      }
    }

    // No rotation needed
    return {
      shouldRotate: false,
      reason: `No emergency rotation needed: ${(capitalUtilization * 100).toFixed(1)}% utilization, $${availableCapital.toFixed(2)} available`,
      positionToClose: null,
      urgency: 'low',
      metrics
    };
  }

  /**
   * Find worst-performing position for rotation
   * Score = P&L% - (holdTime * timePenalty)
   * Lower score = worse position
   */
  private findWorstPosition(positions: Position[]): Position | null {
    if (positions.length === 0) return null;

    const TIME_PENALTY = 0.05; // -0.05% per minute held

    const scoredPositions = positions.map(pos => ({
      position: pos,
      score: pos.pnlPercent - (pos.holdMinutes * TIME_PENALTY)
    }));

    // Sort by score (lowest = worst)
    scoredPositions.sort((a, b) => a.score - b.score);

    return scoredPositions[0].position;
  }

  /**
   * Calculate partial close amount to free minimum capital
   */
  public calculatePartialCloseAmount(
    position: Position,
    targetCapitalToFree: number
  ): number {
    const currentValue = Math.abs(position.quantity * position.currentPrice);

    // What percentage of position do we need to close?
    const percentToClose = Math.min(1.0, targetCapitalToFree / currentValue);

    // Always close at least 50% if doing partial close
    return Math.max(0.5, percentToClose);
  }

  /**
   * Get recommended action based on urgency
   */
  public getRecommendedAction(decision: EmergencyRotationDecision): {
    action: 'full_close' | 'partial_close' | 'wait';
    closePercent?: number;
    targetCapitalToFree?: number;
  } {
    if (!decision.shouldRotate || !decision.positionToClose) {
      return { action: 'wait' };
    }

    switch (decision.urgency) {
      case 'critical':
        // Full close to free maximum capital immediately
        return { action: 'full_close' };

      case 'high':
        // Full close if position is negative or very flat (<0.2%)
        if (decision.positionToClose.pnlPercent < 0.2) {
          return { action: 'full_close' };
        }
        // Otherwise partial close 75%
        return {
          action: 'partial_close',
          closePercent: 0.75,
          targetCapitalToFree: this.IDEAL_AVAILABLE_CAPITAL - decision.metrics.availableCapital
        };

      case 'medium':
        // Partial close 50-75% depending on P&L
        const closePercent = decision.positionToClose.pnlPercent < 0.5 ? 0.75 : 0.50;
        return {
          action: 'partial_close',
          closePercent,
          targetCapitalToFree: 50
        };

      case 'low':
        // Partial close 50% to free some capital
        return {
          action: 'partial_close',
          closePercent: 0.50,
          targetCapitalToFree: 30
        };

      default:
        return { action: 'wait' };
    }
  }

  /**
   * Format decision for logging
   */
  public formatDecision(decision: EmergencyRotationDecision): string {
    const { metrics, urgency, reason } = decision;

    let output = `🚨 EMERGENCY ROTATION [${urgency.toUpperCase()}]\n`;
    output += `   Reason: ${reason}\n`;
    output += `   Capital: $${metrics.availableCapital.toFixed(2)} / $${metrics.totalCapital.toFixed(2)} (${(metrics.capitalUtilization * 100).toFixed(1)}% utilized)\n`;
    output += `   Avg Hold Time: ${metrics.avgHoldTime.toFixed(0)}min\n`;
    output += `   Opportunities: ${metrics.opportunityCount}`;

    if (decision.positionToClose) {
      output += `\n   Position to Close: ${decision.positionToClose.symbol} (${decision.positionToClose.pnlPercent.toFixed(2)}%, ${decision.positionToClose.holdMinutes.toFixed(0)}min)`;
    }

    return output;
  }
}
