/**
 * 🎯 V3.14.27 PROACTIVE MARKET ENTRY VALIDATOR
 *
 * PROBLEM: System enters trades reactively when AI signals appear, leading to:
 * - BTC: 11.4% win rate (should be 45%+)
 * - DOT: 5.6% win rate
 * - Most pairs: 0% accuracy
 * - Price targets show as $0.00 (no real targets)
 *
 * SOLUTION: Validate market conditions BEFORE entry:
 * 1. Market momentum must align with expected direction
 * 2. Calculate specific price targets (entry, stop, take profit)
 * 3. Timing must be optimal (not too early/late in the move)
 * 4. Minimum 2:1 risk-reward ratio required
 *
 * PHILOSOPHY: Don't jump into positions reactively - ensure market is primed for profit
 */

export interface PriceTarget {
  entry: number;           // Optimal entry price
  stop: number;            // Stop loss price
  takeProfit: number;      // Take profit price
  riskRewardRatio: number; // R:R ratio (must be >= 2.0)
  reasoning: string;       // Why these levels
}

export interface MomentumCheck {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number;        // 0-100 (>60 = strong)
  priceAlignment: boolean; // Price moving in expected direction
  volumeAlignment: boolean; // Volume supporting the move
  volatilityOk: boolean;   // Volatility in acceptable range
  reasoning: string;
}

export interface TimingCheck {
  isOptimal: boolean;      // Is NOW the right time to enter?
  phase: 'TOO_EARLY' | 'OPTIMAL' | 'TOO_LATE' | 'MISS';
  confidence: number;      // 0-100 (>70 = good timing)
  reasoning: string;
}

export interface ProactiveEntryValidation {
  shouldEnter: boolean;
  confidence: number;       // 0-100 overall confidence
  priceTargets: PriceTarget;
  momentum: MomentumCheck;
  timing: TimingCheck;
  blockers: string[];       // Reasons NOT to enter (if any)
  summary: string;
}

export class ProactiveEntryValidator {

  /**
   * 🎯 COMPREHENSIVE PRE-ENTRY VALIDATION
   * Checks market momentum, timing, and price targets BEFORE allowing entry
   */
  async validateEntry(
    symbol: string,
    expectedDirection: 'BUY' | 'SELL',
    currentPrice: number,
    priceHistory: number[],      // Recent prices (OHLC data)
    volumeHistory: number[],      // Recent volumes
    aiConfidence: number,         // AI system confidence (0-1)
    aiExpectedReturn: number,     // AI expected return % (0-1)
    orderBookData?: any           // Order book if available
  ): Promise<ProactiveEntryValidation> {

    const blockers: string[] = [];

    // ============================================
    // STEP 0: GREEN CANDLE GATE (V3.14.27.3)
    // ============================================
    // 🎯 V3.14.27.3 FIX: "Always enter when price action is green"
    // PROBLEM: Every trade starts negative - entering on red candles or stale signals
    // SOLUTION: Require CURRENT price movement in expected direction
    if (priceHistory && priceHistory.length >= 3) {
      const currentPrice = priceHistory[priceHistory.length - 1];
      const priceOneMinuteAgo = priceHistory[priceHistory.length - 2];
      const priceTwoMinutesAgo = priceHistory[priceHistory.length - 3];

      const immediateChange = ((currentPrice - priceOneMinuteAgo) / priceOneMinuteAgo) * 100;
      const shortTermChange = ((currentPrice - priceTwoMinutesAgo) / priceTwoMinutesAgo) * 100;

      // Check if price is moving in expected direction RIGHT NOW
      const isGreenForBuy = immediateChange > 0.05; // Price up >0.05% in last candle
      const isRedForSell = immediateChange < -0.05; // Price down >0.05% in last candle

      // Require short-term momentum alignment (last 2 candles)
      const shortTermAligned = (expectedDirection === 'BUY' && shortTermChange > 0) ||
                               (expectedDirection === 'SELL' && shortTermChange < 0);

      if (expectedDirection === 'BUY' && !isGreenForBuy) {
        blockers.push(`Price not green - immediate change ${immediateChange.toFixed(3)}% (need +0.05%)`);
      } else if (expectedDirection === 'SELL' && !isRedForSell) {
        blockers.push(`Price not red - immediate change ${immediateChange.toFixed(3)}% (need -0.05%)`);
      } else if (!shortTermAligned) {
        blockers.push(`Short-term momentum not aligned (${shortTermChange.toFixed(2)}% over 2 candles)`);
      }
    }

    // ============================================
    // STEP 1: CALCULATE PRICE TARGETS
    // ============================================
    const priceTargets = this.calculatePriceTargets(
      symbol,
      expectedDirection,
      currentPrice,
      priceHistory,
      aiExpectedReturn
    );

    // BLOCKER: Risk-reward must be >= 2:1
    if (priceTargets.riskRewardRatio < 2.0) {
      blockers.push(`Poor R:R ${priceTargets.riskRewardRatio.toFixed(2)}:1 (need 2:1+)`);
    }

    // BLOCKER: Price targets must be realistic (not $0.00)
    if (priceTargets.entry === 0 || priceTargets.stop === 0 || priceTargets.takeProfit === 0) {
      blockers.push(`Invalid price targets calculated (zeros detected)`);
    }

    // ============================================
    // STEP 2: VALIDATE MARKET MOMENTUM
    // ============================================
    const momentum = this.checkMarketMomentum(
      expectedDirection,
      currentPrice,
      priceHistory,
      volumeHistory
    );

    // 🔧 V3.14.27.2 FIX: Allow NEUTRAL momentum if direction doesn't conflict
    // PROBLEM: 40+ momentum + direction match was TOO STRICT (blocked 100% of trades)
    // SOLUTION: Only block if momentum ACTIVELY CONFLICTS (e.g., BUY signal with BEARISH momentum)
    const directionConflict = (
      (expectedDirection === 'BUY' && momentum.direction === 'BEARISH') ||
      (expectedDirection === 'SELL' && momentum.direction === 'BULLISH')
    );

    if (directionConflict) {
      blockers.push(`Momentum ${momentum.direction} conflicts with ${expectedDirection} signal`);
    }

    // 🔧 V3.14.27.2 FIX: Lower momentum requirement from 40 to 25
    // RATIONALE: 40+ was blocking good opportunities in ranging markets
    // 25+ allows entry in neutral markets IF other factors (R:R, timing, AI) are strong
    if (momentum.strength < 25) {
      blockers.push(`Weak momentum ${momentum.strength.toFixed(0)}/100 (need 25+)`);
    }

    // ============================================
    // STEP 3: VALIDATE ENTRY TIMING
    // ============================================
    const timing = this.checkEntryTiming(
      expectedDirection,
      currentPrice,
      priceHistory,
      volumeHistory,
      priceTargets
    );

    // 🔧 V3.14.27.2 FIX: Only block TOO_LATE and MISS phases
    // PROBLEM: TOO_EARLY was blocking entries that could still be profitable
    // SOLUTION: Allow TOO_EARLY if other factors strong (AI knows something we don't from OHLC)
    if (timing.phase === 'TOO_LATE') {
      blockers.push(`Entry too late - ${timing.reasoning}`);
    } else if (timing.phase === 'MISS') {
      blockers.push(`Missed entry opportunity - ${timing.reasoning}`);
    }

    // 🔧 V3.14.27.2 FIX: Lower timing confidence from 50% to 35%
    // RATIONALE: Timing is inherently uncertain, trust AI if confidence is reasonable
    if (timing.confidence < 35) {
      blockers.push(`Low timing confidence ${timing.confidence.toFixed(0)}% (need 35+)`);
    }

    // ============================================
    // STEP 4: CALCULATE OVERALL CONFIDENCE
    // ============================================

    // Combine all factors
    const momentumScore = momentum.strength; // 0-100
    const timingScore = timing.confidence;   // 0-100
    const aiScore = aiConfidence * 100;      // 0-100
    const rrScore = Math.min(100, (priceTargets.riskRewardRatio / 4.0) * 100); // 2:1 = 50, 4:1 = 100

    // Weighted average
    const overallConfidence = (
      (momentumScore * 0.35) +  // 35% momentum
      (timingScore * 0.30) +     // 30% timing
      (aiScore * 0.20) +         // 20% AI confidence
      (rrScore * 0.15)           // 15% risk-reward
    );

    // ============================================
    // STEP 5: FINAL DECISION
    // ============================================

    // 🔧 V3.14.27.2 FIX: Lower overall confidence from 60% to 50%
    // RATIONALE: With stricter blocker checks (R:R 2:1+, illiquid filter), 50% is sufficient
    const shouldEnter = blockers.length === 0 && overallConfidence >= 50;

    const summary = shouldEnter
      ? `✅ ENTRY APPROVED: ${symbol} ${expectedDirection} @ $${currentPrice.toFixed(6)} | Target: $${priceTargets.takeProfit.toFixed(6)} | Stop: $${priceTargets.stop.toFixed(6)} | R:R ${priceTargets.riskRewardRatio.toFixed(1)}:1 | Momentum: ${momentum.strength}/100 | Timing: ${timing.phase}`
      : `🚫 ENTRY BLOCKED: ${symbol} ${expectedDirection} - ${blockers.join(', ')}`;

    return {
      shouldEnter,
      confidence: overallConfidence,
      priceTargets,
      momentum,
      timing,
      blockers,
      summary
    };
  }

  /**
   * 💰 CALCULATE REALISTIC PRICE TARGETS
   * Uses support/resistance, volatility, and AI predictions
   */
  private calculatePriceTargets(
    symbol: string,
    direction: 'BUY' | 'SELL',
    currentPrice: number,
    priceHistory: number[],
    aiExpectedReturn: number
  ): PriceTarget {

    if (!priceHistory || priceHistory.length < 20) {
      // Not enough data - use conservative estimates
      return this.getConservativePriceTargets(direction, currentPrice, aiExpectedReturn);
    }

    // Calculate recent volatility (ATR proxy)
    const recentPrices = priceHistory.slice(-20);
    const priceRanges = [];
    for (let i = 1; i < recentPrices.length; i++) {
      priceRanges.push(Math.abs(recentPrices[i] - recentPrices[i-1]));
    }
    const avgRange = priceRanges.reduce((a, b) => a + b, 0) / priceRanges.length;
    const volatilityPct = (avgRange / currentPrice) * 100;

    // 🔧 V3.14.27.2 FIX: Detect illiquid/flat markets (avgRange near zero)
    // PROBLEM: DUCKUSD, SLAYUSD, etc. have identical OHLC → avgRange = $0.00 → stop = entry → R:R 0:1
    // SOLUTION: If avgRange < 0.1% of price, use conservative fallback (minimum 1.5% stop/target)
    if (avgRange < currentPrice * 0.001) {
      // Illiquid/flat market - use conservative targets
      return this.getConservativePriceTargets(direction, currentPrice, aiExpectedReturn);
    }

    // Find support/resistance levels
    const support = Math.min(...recentPrices);
    const resistance = Math.max(...recentPrices);

    let entry: number;
    let stop: number;
    let takeProfit: number;
    let reasoning: string;

    if (direction === 'BUY') {
      // LONG position
      entry = currentPrice;

      // Stop loss: Below recent support or 1.5x ATR, whichever is closer
      const atrStop = currentPrice - (avgRange * 1.5);
      const supportStop = support * 0.995; // Slightly below support
      stop = Math.max(atrStop, supportStop);

      // 🔧 V3.14.27.2 FIX: Ensure stop is meaningfully below entry (minimum 0.5%)
      // PROBLEM: In tight ranges, stop could equal entry → R:R = 0:1
      // SOLUTION: Force minimum 0.5% distance
      const minStopDistance = currentPrice * 0.005; // 0.5% minimum
      if (currentPrice - stop < minStopDistance) {
        stop = currentPrice - minStopDistance;
      }

      // Take profit: AI target or resistance, adjusted for volatility
      const aiTarget = currentPrice * (1 + aiExpectedReturn);
      const resistanceTarget = resistance * 1.005; // Slightly below resistance

      // Use whichever is more conservative but still profitable
      if (aiTarget > currentPrice && aiTarget < resistanceTarget) {
        takeProfit = aiTarget;
        reasoning = `Target $${takeProfit.toFixed(6)} based on AI prediction (+${(aiExpectedReturn*100).toFixed(1)}%). Stop $${stop.toFixed(6)} below support at $${support.toFixed(6)}.`;
      } else if (resistanceTarget > currentPrice) {
        takeProfit = resistanceTarget;
        reasoning = `Target $${takeProfit.toFixed(6)} based on resistance at $${resistance.toFixed(6)}. Stop $${stop.toFixed(6)} below support at $${support.toFixed(6)}.`;
      } else {
        // No good resistance level, use volatility-based target
        takeProfit = currentPrice + (avgRange * 3);
        reasoning = `Target $${takeProfit.toFixed(6)} (+${volatilityPct.toFixed(1)}% volatility). Stop $${stop.toFixed(6)} at 1.5x ATR.`;
      }

    } else {
      // SHORT position
      entry = currentPrice;

      // Stop loss: Above recent resistance or 1.5x ATR
      const atrStop = currentPrice + (avgRange * 1.5);
      const resistanceStop = resistance * 1.005; // Slightly above resistance
      stop = Math.min(atrStop, resistanceStop);

      // 🔧 V3.14.27.2 FIX: Ensure stop is meaningfully above entry (minimum 0.5%)
      const minStopDistance = currentPrice * 0.005; // 0.5% minimum
      if (stop - currentPrice < minStopDistance) {
        stop = currentPrice + minStopDistance;
      }

      // Take profit: AI target or support
      const aiTarget = currentPrice * (1 - aiExpectedReturn);
      const supportTarget = support * 0.995; // Slightly above support

      if (aiTarget < currentPrice && aiTarget > supportTarget) {
        takeProfit = aiTarget;
        reasoning = `Target $${takeProfit.toFixed(6)} based on AI prediction (-${(aiExpectedReturn*100).toFixed(1)}%). Stop $${stop.toFixed(6)} above resistance at $${resistance.toFixed(6)}.`;
      } else if (supportTarget < currentPrice) {
        takeProfit = supportTarget;
        reasoning = `Target $${takeProfit.toFixed(6)} based on support at $${support.toFixed(6)}. Stop $${stop.toFixed(6)} above resistance at $${resistance.toFixed(6)}.`;
      } else {
        takeProfit = currentPrice - (avgRange * 3);
        reasoning = `Target $${takeProfit.toFixed(6)} (-${volatilityPct.toFixed(1)}% volatility). Stop $${stop.toFixed(6)} at 1.5x ATR.`;
      }
    }

    // Calculate risk-reward ratio
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(takeProfit - entry);
    const riskRewardRatio = risk > 0 ? reward / risk : 0;

    return {
      entry,
      stop,
      takeProfit,
      riskRewardRatio,
      reasoning
    };
  }

  /**
   * 🎯 CONSERVATIVE PRICE TARGETS (fallback when no data)
   */
  private getConservativePriceTargets(
    direction: 'BUY' | 'SELL',
    currentPrice: number,
    aiExpectedReturn: number
  ): PriceTarget {

    // Use AI expected return but cap it
    const cappedReturn = Math.min(aiExpectedReturn, 0.08); // Max 8%
    const stopPercent = 0.015; // 1.5% stop loss

    let entry = currentPrice;
    let stop: number;
    let takeProfit: number;

    if (direction === 'BUY') {
      stop = currentPrice * (1 - stopPercent);
      takeProfit = currentPrice * (1 + cappedReturn);
    } else {
      stop = currentPrice * (1 + stopPercent);
      takeProfit = currentPrice * (1 - cappedReturn);
    }

    const risk = Math.abs(entry - stop);
    const reward = Math.abs(takeProfit - entry);
    const riskRewardRatio = risk > 0 ? reward / risk : 0;

    return {
      entry,
      stop,
      takeProfit,
      riskRewardRatio,
      reasoning: `Conservative targets (limited data): ${(cappedReturn*100).toFixed(1)}% target, 1.5% stop`
    };
  }

  /**
   * 📊 CHECK MARKET MOMENTUM ALIGNMENT
   */
  private checkMarketMomentum(
    expectedDirection: 'BUY' | 'SELL',
    currentPrice: number,
    priceHistory: number[],
    volumeHistory: number[]
  ): MomentumCheck {

    if (!priceHistory || priceHistory.length < 10) {
      return {
        direction: 'NEUTRAL',
        strength: 0,
        priceAlignment: false,
        volumeAlignment: false,
        volatilityOk: false,
        reasoning: 'Insufficient data for momentum analysis'
      };
    }

    // Price momentum (last 10 candles)
    const recentPrices = priceHistory.slice(-10);
    const priceChange = ((recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0]) * 100;

    // Short-term momentum (last 3 candles)
    const shortTermPrices = priceHistory.slice(-3);
    const shortTermChange = ((shortTermPrices[shortTermPrices.length - 1] - shortTermPrices[0]) / shortTermPrices[0]) * 100;

    // Determine direction
    let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    if (priceChange > 0.2 && shortTermChange > 0.1) {
      direction = 'BULLISH';
    } else if (priceChange < -0.2 && shortTermChange < -0.1) {
      direction = 'BEARISH';
    } else {
      direction = 'NEUTRAL';
    }

    // Price alignment
    const priceAlignment = (
      (expectedDirection === 'BUY' && direction === 'BULLISH') ||
      (expectedDirection === 'SELL' && direction === 'BEARISH')
    );

    // Volume trend (increasing = good, decreasing = bad)
    let volumeAlignment = false;
    if (volumeHistory && volumeHistory.length >= 5) {
      const recentVolumes = volumeHistory.slice(-5);
      const avgRecentVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
      const olderVolumes = volumeHistory.slice(-10, -5);
      const avgOlderVolume = olderVolumes.length > 0
        ? olderVolumes.reduce((a, b) => a + b, 0) / olderVolumes.length
        : avgRecentVolume;

      volumeAlignment = avgRecentVolume > avgOlderVolume * 0.8; // At least 80% of older volume
    }

    // Volatility check (not too high, not too low)
    const volatility = Math.abs(priceChange);
    const volatilityOk = volatility >= 0.1 && volatility <= 5.0; // Between 0.1% and 5%

    // Calculate momentum strength (0-100)
    let strength = 0;
    if (priceAlignment) strength += 40;
    if (volumeAlignment) strength += 30;
    if (volatilityOk) strength += 20;
    strength += Math.min(10, Math.abs(shortTermChange) * 2); // Bonus for strong short-term move

    const reasoning = `Price ${direction} (${priceChange.toFixed(2)}%), volume ${volumeAlignment ? 'increasing' : 'weak'}, volatility ${volatility.toFixed(1)}%`;

    return {
      direction,
      strength,
      priceAlignment,
      volumeAlignment,
      volatilityOk,
      reasoning
    };
  }

  /**
   * ⏰ CHECK ENTRY TIMING
   */
  private checkEntryTiming(
    expectedDirection: 'BUY' | 'SELL',
    currentPrice: number,
    priceHistory: number[],
    volumeHistory: number[],
    priceTargets: PriceTarget
  ): TimingCheck {

    if (!priceHistory || priceHistory.length < 5) {
      return {
        isOptimal: false,
        phase: 'TOO_EARLY',
        confidence: 0,
        reasoning: 'Insufficient data to assess timing'
      };
    }

    // Calculate how much of the expected move has already happened
    const recentPrices = priceHistory.slice(-5);
    const moveStart = recentPrices[0];
    const moveCurrent = currentPrice;
    const moveTarget = priceTargets.takeProfit;

    const totalExpectedMove = Math.abs(moveTarget - moveStart);
    const moveCompleted = Math.abs(moveCurrent - moveStart);
    const percentComplete = totalExpectedMove > 0 ? (moveCompleted / totalExpectedMove) * 100 : 0;

    let phase: 'TOO_EARLY' | 'OPTIMAL' | 'TOO_LATE' | 'MISS';
    let confidence: number;
    let reasoning: string;

    if (percentComplete < 10) {
      // Move hasn't started yet - might be too early
      phase = 'TOO_EARLY';
      confidence = 40;
      reasoning = `Move hasn't confirmed yet (${percentComplete.toFixed(0)}% complete)`;

    } else if (percentComplete >= 10 && percentComplete < 40) {
      // Early in the move - OPTIMAL ENTRY
      phase = 'OPTIMAL';
      confidence = 85;
      reasoning = `Optimal entry timing (${percentComplete.toFixed(0)}% of expected move complete)`;

    } else if (percentComplete >= 40 && percentComplete < 70) {
      // Mid-move - still acceptable but not ideal
      phase = 'OPTIMAL';
      confidence = 65;
      reasoning = `Acceptable entry (${percentComplete.toFixed(0)}% complete, room to target)`;

    } else if (percentComplete >= 70 && percentComplete < 90) {
      // Late in the move - risky
      phase = 'TOO_LATE';
      confidence = 30;
      reasoning = `Late entry - ${percentComplete.toFixed(0)}% of move complete`;

    } else {
      // Move already completed - miss
      phase = 'MISS';
      confidence = 10;
      reasoning = `Missed opportunity - move ${percentComplete.toFixed(0)}% complete`;
    }

    // Adjust confidence based on volume
    if (volumeHistory && volumeHistory.length >= 3) {
      const recentVolume = volumeHistory[volumeHistory.length - 1];
      const avgVolume = volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length;

      if (recentVolume > avgVolume * 1.2) {
        confidence += 10; // Volume supporting the move
      } else if (recentVolume < avgVolume * 0.5) {
        confidence -= 10; // Weak volume
      }
    }

    confidence = Math.max(0, Math.min(100, confidence));

    return {
      isOptimal: phase === 'OPTIMAL',
      phase,
      confidence,
      reasoning
    };
  }
}
