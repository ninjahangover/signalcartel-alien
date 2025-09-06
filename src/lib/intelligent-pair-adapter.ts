/**
 * Intelligent Per-Pair Trading Adapter
 * 
 * Learns unique characteristics of each trading pair and adapts strategy accordingly.
 * Commission-aware thresholds ensure we only trade when profit potential exceeds costs.
 */

export interface PairCharacteristics {
  symbol: string;
  volatility: number;          // Average price movement %
  averageMove: number;         // Typical profitable move size
  winRate: number;             // Historical win rate for this pair
  avgProfitableMove: number;   // Average size of profitable moves
  avgLossMove: number;         // Average size of losing moves
  bestTimeframes: string[];    // Most profitable timeframes
  priceRange: { min: number; max: number }; // Normal trading range
  volume: number;              // Average volume
  lastAnalyzed: Date;
  sampleSize: number;          // Number of trades analyzed
}

export interface CommissionProfile {
  maker: number;    // Maker commission rate (e.g., 0.001 = 0.1%)
  taker: number;    // Taker commission rate
  fixed: number;    // Fixed commission per trade
  minimum: number;  // Minimum commission per trade
}

export interface TradingDecision {
  shouldTrade: boolean;
  confidence: number;
  minProfitTarget: number;    // Minimum profit needed to overcome commission
  positionSize: number;       // Optimized position size
  reason: string;
  commissionBreakeven: number; // Breakeven point including commission
  aiOverride: boolean;        // Flag for AI consultation on borderline cases
}

class IntelligentPairAdapter {
  private pairCharacteristics: Map<string, PairCharacteristics> = new Map();
  private commissionProfile: CommissionProfile;
  
  constructor(commissionProfile?: CommissionProfile) {
    this.commissionProfile = commissionProfile || {
      maker: 0.0016,   // 0.16% Kraken maker fee
      taker: 0.0026,   // 0.26% Kraken taker fee  
      fixed: 0,
      minimum: 0
    };
    
    console.log(`🧠 Intelligent Pair Adapter initialized with commission: Maker ${(this.commissionProfile.maker*100).toFixed(3)}%, Taker ${(this.commissionProfile.taker*100).toFixed(3)}%`);
  }

  /**
   * Analyze and learn characteristics of a trading pair from historical data
   */
  async learnPairCharacteristics(
    symbol: string, 
    historicalTrades: Array<{
      entryPrice: number;
      exitPrice: number;
      pnl: number;
      duration: number;
      success: boolean;
    }>,
    currentPrice: number,
    volume: number
  ): Promise<PairCharacteristics> {
    const profitable = historicalTrades.filter(t => t.success);
    const losses = historicalTrades.filter(t => !t.success);
    
    // Calculate volatility (average price movement)
    const priceMovements = historicalTrades.map(t => 
      Math.abs(t.exitPrice - t.entryPrice) / t.entryPrice * 100
    );
    const volatility = priceMovements.reduce((a, b) => a + b, 0) / priceMovements.length || 0;
    
    // Calculate average moves
    const avgProfitableMove = profitable.length > 0 
      ? profitable.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / profitable.length 
      : 0;
    
    const avgLossMove = losses.length > 0
      ? losses.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / losses.length
      : 0;
    
    // Determine price range
    const allPrices = historicalTrades.flatMap(t => [t.entryPrice, t.exitPrice]);
    const priceRange = {
      min: Math.min(...allPrices, currentPrice),
      max: Math.max(...allPrices, currentPrice)
    };
    
    const characteristics: PairCharacteristics = {
      symbol,
      volatility,
      averageMove: volatility,
      winRate: profitable.length / historicalTrades.length,
      avgProfitableMove,
      avgLossMove,
      bestTimeframes: ['5m', '15m', '1h'], // Default - could be learned
      priceRange,
      volume,
      lastAnalyzed: new Date(),
      sampleSize: historicalTrades.length
    };
    
    this.pairCharacteristics.set(symbol, characteristics);
    
    console.log(`📊 Learned ${symbol} characteristics: ${volatility.toFixed(2)}% volatility, ${(characteristics.winRate*100).toFixed(1)}% win rate, avg profit $${avgProfitableMove.toFixed(4)}`);
    
    return characteristics;
  }

  /**
   * Calculate commission-aware trading decision
   */
  calculateCommissionAwareDecision(
    symbol: string,
    baseConfidence: number,
    predictedMove: number,
    currentPrice: number,
    accountBalance: number
  ): TradingDecision {
    const characteristics = this.pairCharacteristics.get(symbol);
    
    if (!characteristics) {
      return {
        shouldTrade: false,
        confidence: 0,
        minProfitTarget: 0,
        positionSize: 0,
        reason: `No characteristics learned for ${symbol}`,
        commissionBreakeven: 0
      };
    }
    
    // Calculate commission costs (round trip - buy + sell)
    const estimatedCommission = this.commissionProfile.taker * 2; // Assume taker fees both ways
    const commissionBreakeven = estimatedCommission * 100; // Convert to percentage
    
    // Minimum profit target must exceed commission costs + reasonable buffer  
    const minProfitTarget = commissionBreakeven * 1.2; // 120% buffer above commission - profit over commission
    
    // Enhanced confidence calculation
    let enhancedConfidence = baseConfidence;
    
    // Boost confidence if predicted move is much larger than typical
    if (Math.abs(predictedMove) > characteristics.avgProfitableMove * 1.5) {
      enhancedConfidence *= 1.2;
      console.log(`🚀 ${symbol}: Large move predicted (${predictedMove.toFixed(4)} vs avg ${characteristics.avgProfitableMove.toFixed(4)}) - boosting confidence`);
    }
    
    // Boost confidence based on pair's historical performance
    const winRateBoost = characteristics.winRate > 0.6 ? 1.1 : characteristics.winRate > 0.4 ? 1.0 : 0.9;
    enhancedConfidence *= winRateBoost;
    
    // Reasonable commission-aware confidence threshold  
    const commissionAwareThreshold = 40 + (commissionBreakeven * 0.5); // Lower threshold for more trades
    
    // Smart trade logic with AI override capability
    let shouldTrade = (enhancedConfidence >= commissionAwareThreshold && Math.abs(predictedMove) >= minProfitTarget) ||
                     (enhancedConfidence >= 35 && Math.abs(predictedMove) >= minProfitTarget * 2) || // Lower confidence but excellent move
                     (enhancedConfidence >= 60 && Math.abs(predictedMove) >= minProfitTarget * 0.75); // High confidence with good move
    
    // AI OVERRIDE: For borderline cases, allow Mathematical Intuition engine to make final decision
    let aiOverride = false;
    if (!shouldTrade && enhancedConfidence >= 25 && Math.abs(predictedMove) >= minProfitTarget * 0.5) {
      // This is a borderline case - would normally be blocked by commission protection
      // But it has some potential, so we flag it for AI consultation in the main trading loop
      aiOverride = true;
    }
    
    // Dynamic position sizing based on confidence and expected profit
    let positionSize = 0;
    if (shouldTrade) {
      const baseSize = accountBalance * 0.01; // 1% base size
      const confidenceMultiplier = Math.min(enhancedConfidence / 100, 2.0); // Max 2x for 100% confidence
      const moveMultiplier = Math.min(Math.abs(predictedMove) / minProfitTarget, 3.0); // Max 3x for large moves
      
      positionSize = baseSize * confidenceMultiplier * moveMultiplier;
      positionSize = Math.min(positionSize, accountBalance * 0.05); // Cap at 5% of account
      
      // CRITICAL: Never exceed 90% of available balance to prevent insufficient funds
      positionSize = Math.min(positionSize, accountBalance * 0.90);
    }
    
    const reason = shouldTrade 
      ? `PROFITABLE: conf ${enhancedConfidence.toFixed(1)}% + move ${predictedMove.toFixed(3)}% > commission ${commissionBreakeven.toFixed(3)}% (min profit: ${minProfitTarget.toFixed(2)}%)`
      : `COMMISSION PROTECTION: conf ${enhancedConfidence.toFixed(1)}% or move ${Math.abs(predictedMove).toFixed(3)}% < min profit ${minProfitTarget.toFixed(2)}% after ${commissionBreakeven.toFixed(3)}% commission`;
    
    return {
      shouldTrade,
      confidence: enhancedConfidence,
      minProfitTarget,
      positionSize,
      reason: aiOverride ? `AI CONSULTATION: ${reason} [FLAGGED FOR AI OVERRIDE]` : reason,
      commissionBreakeven,
      aiOverride
    };
  }

  /**
   * Get intelligent exit thresholds based on pair characteristics
   */
  getIntelligentExitThresholds(symbol: string): { takeProfit: number; stopLoss: number } {
    const characteristics = this.pairCharacteristics.get(symbol);
    
    if (!characteristics) {
      return { takeProfit: 2.0, stopLoss: 1.0 }; // Default conservative
    }
    
    // Set take profit based on average profitable moves
    const takeProfit = Math.max(
      characteristics.avgProfitableMove * 0.8, // 80% of average profitable move
      this.commissionProfile.taker * 200 * 1.5 // At least 1.5x commission cost
    );
    
    // Set stop loss based on average losses but tighter to preserve capital
    const stopLoss = Math.min(
      characteristics.avgLossMove * 0.6, // 60% of average loss (cut losses earlier)
      takeProfit * 0.5 // Risk-reward ratio of at least 1:2
    );
    
    return { takeProfit, stopLoss };
  }

  /**
   * Update pair characteristics based on recent trade outcome
   */
  updatePairLearning(
    symbol: string, 
    entryPrice: number, 
    exitPrice: number, 
    pnl: number, 
    success: boolean
  ): void {
    const characteristics = this.pairCharacteristics.get(symbol);
    if (!characteristics) return;
    
    // Update running averages (exponential moving average for recent bias)
    const alpha = 0.1; // Learning rate
    
    const moveSize = Math.abs(exitPrice - entryPrice) / entryPrice * 100;
    characteristics.volatility = characteristics.volatility * (1 - alpha) + moveSize * alpha;
    
    if (success) {
      characteristics.avgProfitableMove = characteristics.avgProfitableMove * (1 - alpha) + Math.abs(pnl) * alpha;
    } else {
      characteristics.avgLossMove = characteristics.avgLossMove * (1 - alpha) + Math.abs(pnl) * alpha;
    }
    
    // Update win rate
    const newWinRate = characteristics.winRate * (1 - alpha) + (success ? 1 : 0) * alpha;
    characteristics.winRate = newWinRate;
    
    characteristics.sampleSize += 1;
    characteristics.lastAnalyzed = new Date();
    
    console.log(`📈 Updated ${symbol} learning: Win rate ${(newWinRate*100).toFixed(1)}%, Volatility ${characteristics.volatility.toFixed(2)}%`);
  }

  /**
   * Get pair-specific trading parameters
   */
  getPairParameters(symbol: string): {
    confidenceThreshold: number;
    maxPositionSize: number;
    preferredTimeframe: string;
    riskReward: number;
  } {
    const characteristics = this.pairCharacteristics.get(symbol);
    
    if (!characteristics) {
      return {
        confidenceThreshold: 60,
        maxPositionSize: 0.01,
        preferredTimeframe: '15m',
        riskReward: 2.0
      };
    }
    
    // Higher threshold for pairs with poor performance
    const confidenceThreshold = characteristics.winRate > 0.6 ? 45 : 
                                characteristics.winRate > 0.4 ? 55 : 65;
    
    // Larger position sizes for consistent winners
    const maxPositionSize = characteristics.winRate > 0.7 ? 0.03 :
                           characteristics.winRate > 0.5 ? 0.02 : 0.01;
    
    // Risk-reward based on historical performance
    const riskReward = characteristics.avgProfitableMove / Math.max(characteristics.avgLossMove, 0.1);
    
    return {
      confidenceThreshold,
      maxPositionSize,
      preferredTimeframe: characteristics.bestTimeframes[0] || '15m',
      riskReward: Math.max(riskReward, 1.5) // Minimum 1.5:1 risk reward
    };
  }

  /**
   * Get all learned characteristics for analysis
   */
  getAllCharacteristics(): Map<string, PairCharacteristics> {
    return new Map(this.pairCharacteristics);
  }

  /**
   * Export characteristics for persistence
   */
  exportCharacteristics(): string {
    const data = Array.from(this.pairCharacteristics.entries());
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import characteristics from persistence
   */
  importCharacteristics(data: string): void {
    try {
      const parsed = JSON.parse(data) as Array<[string, PairCharacteristics]>;
      this.pairCharacteristics = new Map(parsed);
      console.log(`📥 Imported characteristics for ${parsed.length} pairs`);
    } catch (error) {
      console.error('Failed to import characteristics:', error);
    }
  }
}

// Singleton instance
let intelligentPairAdapter: IntelligentPairAdapter | null = null;

export function getIntelligentPairAdapter(): IntelligentPairAdapter {
  if (!intelligentPairAdapter) {
    intelligentPairAdapter = new IntelligentPairAdapter();
  }
  return intelligentPairAdapter;
}

export { IntelligentPairAdapter };