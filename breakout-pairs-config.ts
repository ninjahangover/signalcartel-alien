/**
 * Breakout Prop Firm Trading Pairs Configuration
 * Includes leverage, position limits, and trading rules
 */

export interface BreakoutPair {
  symbol: string;
  leverage: number;
  maxOrderSize: number;  // In base currency
  tradingFee: number;     // 0.035% for all
  financingFee: number;   // 0.09% daily
  allowLong: boolean;
  allowShort: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const BREAKOUT_PAIRS: BreakoutPair[] = [
  // HIGH PRIORITY - Major pairs with 5x leverage
  {
    symbol: 'BTCUSD',
    leverage: 5,
    maxOrderSize: 10,  // 10 BTC max
    tradingFee: 0.00035,
    financingFee: 0.0009,
    allowLong: true,
    allowShort: true,
    priority: 'HIGH'
  },
  {
    symbol: 'ETHUSD',
    leverage: 5,
    maxOrderSize: 540,  // 540 ETH max
    tradingFee: 0.00035,
    financingFee: 0.0009,
    allowLong: true,
    allowShort: true,
    priority: 'HIGH'
  },

  // MEDIUM PRIORITY - Popular alts with 2x leverage
  {
    symbol: 'XRPUSD',
    leverage: 2,
    maxOrderSize: 1000000,  // Estimated
    tradingFee: 0.00035,
    financingFee: 0.0009,
    allowLong: true,
    allowShort: true,
    priority: 'MEDIUM'
  },
  {
    symbol: 'ADAUSD',
    leverage: 2,
    maxOrderSize: 400000,
    tradingFee: 0.00035,
    financingFee: 0.0009,
    allowLong: true,
    allowShort: true,
    priority: 'MEDIUM'
  },
  {
    symbol: 'DOGEUSD',
    leverage: 2,
    maxOrderSize: 1000000,  // Estimated
    tradingFee: 0.00035,
    financingFee: 0.0009,
    allowLong: true,
    allowShort: true,
    priority: 'MEDIUM'
  },
  {
    symbol: 'SOLUSD',
    leverage: 2,
    maxOrderSize: 10000,  // Estimated
    tradingFee: 0.00035,
    financingFee: 0.0009,
    allowLong: true,
    allowShort: true,
    priority: 'MEDIUM'
  },
  {
    symbol: 'AVAXUSD',
    leverage: 2,
    maxOrderSize: 20000,  // Estimated
    tradingFee: 0.00035,
    financingFee: 0.0009,
    allowLong: true,
    allowShort: true,
    priority: 'MEDIUM'
  },
  {
    symbol: 'MATICUSD',
    leverage: 2,
    maxOrderSize: 100000,  // Estimated
    tradingFee: 0.00035,
    financingFee: 0.0009,
    allowLong: true,
    allowShort: true,
    priority: 'MEDIUM'
  },

  // LOW PRIORITY - Other available pairs
  {
    symbol: 'SHIBUSD',
    leverage: 2,
    maxOrderSize: 1000000000,  // Estimated
    tradingFee: 0.00035,
    financingFee: 0.0009,
    allowLong: true,
    allowShort: true,
    priority: 'LOW'
  },
  {
    symbol: 'DOTUSD',
    leverage: 2,
    maxOrderSize: 20000,  // Estimated
    tradingFee: 0.00035,
    financingFee: 0.0009,
    allowLong: true,
    allowShort: true,
    priority: 'LOW'
  },
  {
    symbol: 'LINKUSD',
    leverage: 2,
    maxOrderSize: 20000,  // Estimated
    tradingFee: 0.00035,
    financingFee: 0.0009,
    allowLong: true,
    allowShort: true,
    priority: 'LOW'
  },
  {
    symbol: 'UNIUSD',
    leverage: 2,
    maxOrderSize: 20000,  // Estimated
    tradingFee: 0.00035,
    financingFee: 0.0009,
    allowLong: true,
    allowShort: true,
    priority: 'LOW'
  }
];

// Position sizing calculator for Breakout
export class BreakoutPositionCalculator {
  private accountSize: number;
  private maxRiskPerTrade: number;

  constructor(accountSize: number = 5000, maxRiskPerTrade: number = 0.01) {
    this.accountSize = accountSize;
    this.maxRiskPerTrade = maxRiskPerTrade;  // 1% risk per trade
  }

  /**
   * Calculate position size based on Breakout rules and available equity
   */
  calculatePositionSize(
    pair: BreakoutPair,
    currentPrice: number,
    availableEquity: number,
    stopLossPercentage: number = 0.02
  ): {
    baseSize: number;      // Size in base currency (e.g., BTC)
    usdValue: number;      // Position value in USD
    leveragedValue: number; // Total exposure with leverage
    riskAmount: number;    // Amount at risk
    marginRequired: number; // Margin needed
  } {
    // Risk-based position sizing
    const riskAmount = Math.min(
      availableEquity * this.maxRiskPerTrade,
      50  // Max $50 risk per trade for $5000 account
    );

    // Calculate base position size
    let baseSize = riskAmount / (currentPrice * stopLossPercentage);

    // Apply max order size limit
    baseSize = Math.min(baseSize, pair.maxOrderSize);

    // Calculate USD value without leverage
    const usdValue = baseSize * currentPrice;

    // Apply leverage
    const leveragedValue = usdValue * pair.leverage;

    // Calculate margin required
    const marginRequired = usdValue;  // 1:1 margin for unleveraged value

    // Ensure we don't exceed available equity
    if (marginRequired > availableEquity * 0.2) {  // Max 20% of equity per position
      const scaleFactor = (availableEquity * 0.2) / marginRequired;
      baseSize *= scaleFactor;
    }

    return {
      baseSize: parseFloat(baseSize.toFixed(8)),
      usdValue: baseSize * currentPrice,
      leveragedValue: baseSize * currentPrice * pair.leverage,
      riskAmount: baseSize * currentPrice * stopLossPercentage,
      marginRequired: baseSize * currentPrice
    };
  }

  /**
   * Get recommended pairs based on current market conditions
   */
  getRecommendedPairs(
    marketCondition: 'TRENDING' | 'RANGING' | 'VOLATILE'
  ): BreakoutPair[] {
    switch (marketCondition) {
      case 'TRENDING':
        // Focus on high leverage pairs for trends
        return BREAKOUT_PAIRS.filter(p => p.leverage === 5);

      case 'RANGING':
        // Medium priority pairs for range trading
        return BREAKOUT_PAIRS.filter(p => p.priority === 'MEDIUM');

      case 'VOLATILE':
        // Lower leverage pairs for volatile markets
        return BREAKOUT_PAIRS.filter(p => p.leverage === 2 && p.priority !== 'LOW');

      default:
        return BREAKOUT_PAIRS.filter(p => p.priority !== 'LOW');
    }
  }

  /**
   * Calculate financing costs for holding positions
   */
  calculateFinancingCost(
    positionValue: number,
    holdingDays: number,
    financingFee: number = 0.0009
  ): number {
    return positionValue * financingFee * holdingDays;
  }

  /**
   * Check if trade meets Breakout requirements
   */
  validateTrade(
    pair: BreakoutPair,
    baseSize: number,
    direction: 'LONG' | 'SHORT',
    availableEquity: number
  ): {
    isValid: boolean;
    reason?: string;
  } {
    // Check direction allowed
    if (direction === 'LONG' && !pair.allowLong) {
      return { isValid: false, reason: 'Long positions not allowed for this pair' };
    }
    if (direction === 'SHORT' && !pair.allowShort) {
      return { isValid: false, reason: 'Short positions not allowed for this pair' };
    }

    // Check max order size
    if (baseSize > pair.maxOrderSize) {
      return { isValid: false, reason: `Exceeds max order size of ${pair.maxOrderSize}` };
    }

    // Check equity requirements
    const marginRequired = baseSize * availableEquity;
    if (marginRequired > availableEquity) {
      return { isValid: false, reason: 'Insufficient equity for position' };
    }

    return { isValid: true };
  }
}

// Export configured instance
export const positionCalculator = new BreakoutPositionCalculator(5000, 0.01);

// Helper to get pair configuration
export function getBreakoutPair(symbol: string): BreakoutPair | undefined {
  return BREAKOUT_PAIRS.find(p => p.symbol === symbol);
}

// Get high priority pairs for focus
export function getHighPriorityPairs(): BreakoutPair[] {
  return BREAKOUT_PAIRS.filter(p => p.priority === 'HIGH');
}

// Calculate total fees for a round trip trade
export function calculateTotalFees(
  positionValue: number,
  holdingDays: number = 1,
  pair: BreakoutPair
): {
  tradingFees: number;
  financingFees: number;
  totalFees: number;
} {
  const tradingFees = positionValue * pair.tradingFee * 2;  // Entry + Exit
  const financingFees = positionValue * pair.financingFee * holdingDays;

  return {
    tradingFees,
    financingFees,
    totalFees: tradingFees + financingFees
  };
}