/**
 * CFT Compliance Monitor
 * Ensures all trading activities comply with Crypto Fund Trader rules and policies
 * Based on official FAQ: https://cryptofundtrader.com/faq/
 */

export interface TradeRecord {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  timestamp: Date;
  price: number;
  quantity: number;
  value: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface ComplianceCheck {
  isCompliant: boolean;
  violations: string[];
  warnings: string[];
}

export class CFTComplianceMonitor {
  private tradeHistory: TradeRecord[] = [];
  private dailyProfits: Map<string, number> = new Map(); // date -> profit
  private lastTradeBySymbol: Map<string, TradeRecord> = new Map();

  // CFT Compliance Rules
  private readonly REVERSE_TRADING_WINDOW = 60000; // 60 seconds in milliseconds
  private readonly MAX_DAILY_PROFIT = 10000; // $10,000 max daily profit
  private readonly MAX_TRADE_RISK_PERCENT = 2; // 2% max risk per trade
  private readonly ACCOUNT_SIZE = 10000; // $10K account
  private readonly MAX_TRADE_RISK_VALUE = this.ACCOUNT_SIZE * (this.MAX_TRADE_RISK_PERCENT / 100); // $200

  /**
   * Check if a proposed trade complies with CFT rules
   */
  checkTradeCompliance(proposedTrade: Omit<TradeRecord, 'id'>): ComplianceCheck {
    const violations: string[] = [];
    const warnings: string[] = [];

    // 1. Check reverse trading rule (60-second window)
    const reverseTradeViolation = this.checkReverseTradingRule(proposedTrade);
    if (reverseTradeViolation) {
      violations.push(reverseTradeViolation);
    }

    // 2. Check mandatory stop-loss requirement
    if (!proposedTrade.stopLoss) {
      violations.push('All trades must have a stop-loss order');
    }

    // 3. Check 2% per-trade risk limit
    const riskViolation = this.checkTradeRiskLimit(proposedTrade);
    if (riskViolation) {
      violations.push(riskViolation);
    }

    // 4. Check daily profit cap
    const dailyProfitViolation = this.checkDailyProfitCap(proposedTrade);
    if (dailyProfitViolation) {
      violations.push(dailyProfitViolation);
    }

    // 5. Check for prohibited strategies
    const strategyViolations = this.checkProhibitedStrategies(proposedTrade);
    violations.push(...strategyViolations);

    // 6. Generate warnings for best practices
    const bestPracticeWarnings = this.checkBestPractices(proposedTrade);
    warnings.push(...bestPracticeWarnings);

    return {
      isCompliant: violations.length === 0,
      violations,
      warnings
    };
  }

  /**
   * Check reverse trading rule - no reverse trades within 60 seconds on same pair
   */
  private checkReverseTradingRule(proposedTrade: Omit<TradeRecord, 'id'>): string | null {
    const lastTrade = this.lastTradeBySymbol.get(proposedTrade.symbol);

    if (!lastTrade) {
      return null; // No previous trade on this symbol
    }

    const timeSinceLastTrade = proposedTrade.timestamp.getTime() - lastTrade.timestamp.getTime();

    // Check if this would be a reverse trade within 60 seconds
    if (timeSinceLastTrade < this.REVERSE_TRADING_WINDOW &&
        lastTrade.side !== proposedTrade.side) {
      return `Reverse trading prohibited: Cannot ${proposedTrade.side} ${proposedTrade.symbol} within 60 seconds of ${lastTrade.side} trade`;
    }

    return null;
  }

  /**
   * Check 2% per-trade risk limit
   */
  private checkTradeRiskLimit(proposedTrade: Omit<TradeRecord, 'id'>): string | null {
    if (proposedTrade.value > this.MAX_TRADE_RISK_VALUE) {
      return `Trade value $${proposedTrade.value.toFixed(2)} exceeds 2% risk limit of $${this.MAX_TRADE_RISK_VALUE.toFixed(2)}`;
    }

    // Also check if stop-loss gives more than 2% risk
    if (proposedTrade.stopLoss) {
      const potentialLoss = Math.abs(proposedTrade.price - proposedTrade.stopLoss) * proposedTrade.quantity;
      if (potentialLoss > this.MAX_TRADE_RISK_VALUE) {
        return `Stop-loss risk $${potentialLoss.toFixed(2)} exceeds 2% limit of $${this.MAX_TRADE_RISK_VALUE.toFixed(2)}`;
      }
    }

    return null;
  }

  /**
   * Check daily profit cap of $10,000
   */
  private checkDailyProfitCap(proposedTrade: Omit<TradeRecord, 'id'>): string | null {
    const today = this.getDateKey(proposedTrade.timestamp);
    const currentDailyProfit = this.dailyProfits.get(today) || 0;

    // Estimate potential profit from this trade (conservative estimate)
    const estimatedProfit = proposedTrade.value * 0.02; // Assume 2% profit potential

    if (currentDailyProfit + estimatedProfit > this.MAX_DAILY_PROFIT) {
      return `Potential daily profit would exceed $${this.MAX_DAILY_PROFIT} limit (current: $${currentDailyProfit.toFixed(2)})`;
    }

    return null;
  }

  /**
   * Check for prohibited strategies
   */
  private checkProhibitedStrategies(proposedTrade: Omit<TradeRecord, 'id'>): string[] {
    const violations: string[] = [];

    // Check for gambling-style trading (entire account in one trade)
    const accountPercentage = (proposedTrade.value / this.ACCOUNT_SIZE) * 100;
    if (accountPercentage > 50) {
      violations.push(`Trade uses ${accountPercentage.toFixed(1)}% of account - gambling-style trading prohibited`);
    }

    // Check for tick scalping (very small profit targets)
    if (proposedTrade.takeProfit) {
      const profitTarget = Math.abs(proposedTrade.takeProfit - proposedTrade.price);
      const profitPercent = (profitTarget / proposedTrade.price) * 100;
      if (profitPercent < 0.1) {
        violations.push('Tick scalping prohibited - profit target too small (<0.1%)');
      }
    }

    return violations;
  }

  /**
   * Check best practices and generate warnings
   */
  private checkBestPractices(proposedTrade: Omit<TradeRecord, 'id'>): string[] {
    const warnings: string[] = [];

    // Warn if no take-profit set
    if (!proposedTrade.takeProfit) {
      warnings.push('Consider setting a take-profit target for better risk management');
    }

    // Warn if trade size is very large
    const accountPercentage = (proposedTrade.value / this.ACCOUNT_SIZE) * 100;
    if (accountPercentage > 10) {
      warnings.push(`Large trade size: ${accountPercentage.toFixed(1)}% of account`);
    }

    // Warn if stop-loss is very far
    if (proposedTrade.stopLoss) {
      const stopLossDistance = Math.abs(proposedTrade.price - proposedTrade.stopLoss);
      const stopLossPercent = (stopLossDistance / proposedTrade.price) * 100;
      if (stopLossPercent > 5) {
        warnings.push(`Stop-loss is ${stopLossPercent.toFixed(1)}% away - consider tighter risk management`);
      }
    }

    return warnings;
  }

  /**
   * Record a completed trade
   */
  recordTrade(trade: TradeRecord) {
    this.tradeHistory.push(trade);
    this.lastTradeBySymbol.set(trade.symbol, trade);

    // Update daily profits (this would be calculated from closed positions)
    const dateKey = this.getDateKey(trade.timestamp);
    if (!this.dailyProfits.has(dateKey)) {
      this.dailyProfits.set(dateKey, 0);
    }
  }

  /**
   * Update daily profit for tracking
   */
  updateDailyProfit(date: Date, profit: number) {
    const dateKey = this.getDateKey(date);
    this.dailyProfits.set(dateKey, profit);
  }

  /**
   * Get compliance statistics
   */
  getComplianceStats() {
    const today = this.getDateKey(new Date());
    const todaysTrades = this.tradeHistory.filter(trade =>
      this.getDateKey(trade.timestamp) === today
    );

    return {
      totalTrades: this.tradeHistory.length,
      todaysTrades: todaysTrades.length,
      dailyProfit: this.dailyProfits.get(today) || 0,
      tradingDays: this.dailyProfits.size,
      lastTradeTime: this.tradeHistory.length > 0 ?
        this.tradeHistory[this.tradeHistory.length - 1].timestamp : null
    };
  }

  /**
   * Check if ready for scholarship request (15+ trading days)
   */
  isReadyForScholarship(): boolean {
    return this.dailyProfits.size >= 15;
  }

  /**
   * Get violations summary for reporting
   */
  getViolationsSummary(): {
    reverseTradingViolations: number;
    riskLimitViolations: number;
    profitCapViolations: number;
    stopLossViolations: number;
  } {
    // This would track violations over time in a real implementation
    return {
      reverseTradingViolations: 0,
      riskLimitViolations: 0,
      profitCapViolations: 0,
      stopLossViolations: 0
    };
  }

  /**
   * Clear old data (for memory management)
   */
  clearOldData(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.tradeHistory = this.tradeHistory.filter(trade =>
      trade.timestamp >= cutoffDate
    );

    // Keep daily profits for analysis
    const cutoffKey = this.getDateKey(cutoffDate);
    for (const [dateKey] of this.dailyProfits) {
      if (dateKey < cutoffKey) {
        this.dailyProfits.delete(dateKey);
      }
    }
  }

  /**
   * Helper to get date key for grouping
   */
  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

// Export singleton instance
export const cftComplianceMonitor = new CFTComplianceMonitor();