/**
 * Pair Reputation and Dynamic Blacklist Manager
 * 
 * Tracks pair performance over time and implements intelligent blacklisting
 * with recovery mechanisms based on actual trading performance.
 */

export interface PairTradingHistory {
  symbol: string;
  trades: Array<{
    timestamp: Date;
    profitable: boolean;
    return: number;
    volume: number;
    confidence: number;
  }>;
  
  // Performance metrics
  metrics: {
    totalTrades: number;
    consecutiveLosses: number;
    consecutiveWins: number;
    recentWinRate: number;      // Last 10 trades
    allTimeWinRate: number;      // All trades
    avgVolume: number;
    avgReturn: number;
    worstDrawdown: number;
    lastTradeTime: Date;
  };
  
  // Reputation score (0-100)
  reputation: number;
  
  // Blacklist status
  blacklist: {
    isBlacklisted: boolean;
    reason: string;
    severity: 'temporary' | 'extended' | 'permanent';
    blacklistedAt: Date;
    eligibleForReviewAt: Date;
    blacklistCount: number;  // How many times blacklisted
  };
  
  // Recovery tracking
  recovery: {
    isInRecovery: boolean;
    probationStarted: Date;
    probationTrades: number;
    probationPerformance: number;
  };
}

export interface BlacklistRule {
  name: string;
  condition: (history: PairTradingHistory) => boolean;
  severity: 'temporary' | 'extended' | 'permanent';
  duration: number; // milliseconds
  reason: string;
}

export class PairReputationBlacklistManager {
  private pairHistories: Map<string, PairTradingHistory> = new Map();
  private blacklistRules: BlacklistRule[] = [];
  private readonly REPUTATION_DECAY_RATE = 0.95; // Reputation decays without trading
  private readonly REPUTATION_RECOVERY_RATE = 1.05; // Reputation recovers with good trades
  
  constructor() {
    this.initializeBlacklistRules();
    this.startPeriodicReview();
  }
  
  /**
   * Initialize smart blacklisting rules
   */
  private initializeBlacklistRules(): void {
    this.blacklistRules = [
      // Consecutive losses rule
      {
        name: 'consecutive_losses',
        condition: (h) => h.metrics.consecutiveLosses >= 3,
        severity: 'temporary',
        duration: 7 * 24 * 60 * 60 * 1000, // 1 week
        reason: '3 consecutive losses'
      },
      
      // Severe consecutive losses
      {
        name: 'severe_losses',
        condition: (h) => h.metrics.consecutiveLosses >= 5,
        severity: 'extended',
        duration: 30 * 24 * 60 * 60 * 1000, // 1 month
        reason: '5+ consecutive losses - needs extended timeout'
      },
      
      // Low volume rule
      {
        name: 'low_volume',
        condition: (h) => {
          const recentTrades = h.trades.slice(-5);
          const avgRecentVolume = recentTrades.reduce((sum, t) => sum + t.volume, 0) / recentTrades.length;
          return avgRecentVolume < h.metrics.avgVolume * 0.3; // 70% volume drop
        },
        severity: 'temporary',
        duration: 3 * 24 * 60 * 60 * 1000, // 3 days
        reason: 'Volume dropped below 30% of average'
      },
      
      // Poor win rate
      {
        name: 'poor_performance',
        condition: (h) => h.metrics.recentWinRate < 0.2 && h.metrics.totalTrades >= 10,
        severity: 'temporary',
        duration: 14 * 24 * 60 * 60 * 1000, // 2 weeks
        reason: 'Win rate below 20% in recent trades'
      },
      
      // Catastrophic drawdown
      {
        name: 'catastrophic_drawdown',
        condition: (h) => h.metrics.worstDrawdown < -0.15, // -15% drawdown
        severity: 'extended',
        duration: 30 * 24 * 60 * 60 * 1000, // 1 month
        reason: 'Catastrophic drawdown exceeding -15%'
      },
      
      // Repeated blacklisting
      {
        name: 'repeat_offender',
        condition: (h) => h.blacklist.blacklistCount >= 3,
        severity: 'permanent',
        duration: Infinity,
        reason: 'Blacklisted 3+ times - permanently removed'
      },
      
      // No activity (stale pair)
      {
        name: 'stale_pair',
        condition: (h) => {
          const daysSinceLastTrade = (Date.now() - h.metrics.lastTradeTime.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceLastTrade > 7 && h.metrics.totalTrades > 0;
        },
        severity: 'temporary',
        duration: 24 * 60 * 60 * 1000, // 1 day
        reason: 'No trading activity for 7+ days'
      }
    ];
  }
  
  /**
   * Record a trade and update pair reputation
   */
  recordTrade(
    symbol: string,
    trade: {
      profitable: boolean;
      return: number;
      volume: number;
      confidence: number;
    }
  ): void {
    if (!this.pairHistories.has(symbol)) {
      this.initializePairHistory(symbol);
    }
    
    const history = this.pairHistories.get(symbol)!;
    
    // Add trade to history
    history.trades.push({
      ...trade,
      timestamp: new Date()
    });
    
    // Keep only last 1000 trades
    if (history.trades.length > 1000) {
      history.trades.shift();
    }
    
    // Update metrics
    this.updateMetrics(history);
    
    // Update reputation
    this.updateReputation(history, trade);
    
    // Check blacklist rules
    this.evaluateBlacklistRules(history);
    
    // Handle recovery if in probation
    if (history.recovery.isInRecovery) {
      this.updateRecoveryStatus(history, trade);
    }
    
    // Log significant events
    this.logSignificantEvents(history, trade);
  }
  
  /**
   * Update pair metrics
   */
  private updateMetrics(history: PairTradingHistory): void {
    const trades = history.trades;
    const metrics = history.metrics;
    
    metrics.totalTrades = trades.length;
    metrics.lastTradeTime = trades[trades.length - 1]?.timestamp || new Date();
    
    // Consecutive wins/losses
    const lastTrade = trades[trades.length - 1];
    if (lastTrade?.profitable) {
      metrics.consecutiveWins++;
      metrics.consecutiveLosses = 0;
    } else {
      metrics.consecutiveLosses++;
      metrics.consecutiveWins = 0;
    }
    
    // Recent win rate (last 10 trades)
    const recentTrades = trades.slice(-10);
    const recentWins = recentTrades.filter(t => t.profitable).length;
    metrics.recentWinRate = recentTrades.length > 0 ? recentWins / recentTrades.length : 0;
    
    // All-time win rate
    const totalWins = trades.filter(t => t.profitable).length;
    metrics.allTimeWinRate = trades.length > 0 ? totalWins / trades.length : 0;
    
    // Average volume and return
    metrics.avgVolume = trades.reduce((sum, t) => sum + t.volume, 0) / Math.max(1, trades.length);
    metrics.avgReturn = trades.reduce((sum, t) => sum + t.return, 0) / Math.max(1, trades.length);
    
    // Worst drawdown (consecutive losses)
    let currentDrawdown = 0;
    metrics.worstDrawdown = 0;
    for (const trade of trades) {
      if (trade.return < 0) {
        currentDrawdown += trade.return;
        metrics.worstDrawdown = Math.min(metrics.worstDrawdown, currentDrawdown);
      } else {
        currentDrawdown = 0;
      }
    }
  }
  
  /**
   * Update pair reputation based on trade
   */
  private updateReputation(history: PairTradingHistory, trade: any): void {
    let reputationChange = 0;
    
    if (trade.profitable) {
      // Positive reputation for profitable trades
      reputationChange = 5 * (1 + trade.return); // More profit = more reputation
      
      // Bonus for breaking losing streak
      if (history.metrics.consecutiveLosses > 0) {
        reputationChange += 10;
      }
    } else {
      // Negative reputation for losses
      reputationChange = -5 * (1 + Math.abs(trade.return)); // Bigger loss = more reputation loss
      
      // Extra penalty for consecutive losses
      reputationChange -= history.metrics.consecutiveLosses * 2;
    }
    
    // Apply confidence factor
    reputationChange *= trade.confidence;
    
    // Update reputation with bounds
    history.reputation = Math.max(0, Math.min(100, history.reputation + reputationChange));
    
    // Apply decay if not traded recently
    const hoursSinceLastTrade = (Date.now() - history.metrics.lastTradeTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastTrade > 24) {
      history.reputation *= this.REPUTATION_DECAY_RATE;
    }
  }
  
  /**
   * Evaluate blacklist rules
   */
  private evaluateBlacklistRules(history: PairTradingHistory): void {
    // Skip if already blacklisted
    if (history.blacklist.isBlacklisted) return;
    
    for (const rule of this.blacklistRules) {
      if (rule.condition(history)) {
        this.blacklistPair(history, rule);
        break; // Apply first matching rule
      }
    }
  }
  
  /**
   * Blacklist a pair
   */
  private blacklistPair(history: PairTradingHistory, rule: BlacklistRule): void {
    history.blacklist = {
      isBlacklisted: true,
      reason: rule.reason,
      severity: rule.severity,
      blacklistedAt: new Date(),
      eligibleForReviewAt: new Date(Date.now() + rule.duration),
      blacklistCount: history.blacklist.blacklistCount + 1
    };
    
    // Set reputation to 0 for blacklisted pairs
    history.reputation = 0;
    
    console.log(`🚫 BLACKLISTED ${history.symbol}: ${rule.reason} (Severity: ${rule.severity})`);
    console.log(`   Eligible for review: ${history.blacklist.eligibleForReviewAt.toLocaleDateString()}`);
    console.log(`   This is blacklist #${history.blacklist.blacklistCount} for this pair`);
  }
  
  /**
   * Check if a pair should be traded
   */
  canTradePair(symbol: string): {
    canTrade: boolean;
    reason?: string;
    reputation?: number;
  } {
    const history = this.pairHistories.get(symbol);
    
    if (!history) {
      // New pair - allow with caution
      return { canTrade: true, reason: 'New pair', reputation: 50 };
    }
    
    // Check blacklist
    if (history.blacklist.isBlacklisted) {
      const timeRemaining = history.blacklist.eligibleForReviewAt.getTime() - Date.now();
      const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
      
      return {
        canTrade: false,
        reason: `Blacklisted: ${history.blacklist.reason} (${daysRemaining} days remaining)`,
        reputation: history.reputation
      };
    }
    
    // Check if in recovery/probation
    if (history.recovery.isInRecovery) {
      // Allow trading but with reduced size/confidence requirements
      return {
        canTrade: true,
        reason: `In recovery/probation (${history.recovery.probationTrades} trades completed)`,
        reputation: history.reputation
      };
    }
    
    // Check reputation threshold
    if (history.reputation < 20) {
      return {
        canTrade: false,
        reason: `Low reputation: ${history.reputation.toFixed(1)}/100`,
        reputation: history.reputation
      };
    }
    
    return {
      canTrade: true,
      reputation: history.reputation
    };
  }
  
  /**
   * Periodic review of blacklisted pairs
   */
  private startPeriodicReview(): void {
    setInterval(() => {
      this.reviewBlacklistedPairs();
    }, 60 * 60 * 1000); // Every hour
  }
  
  /**
   * Review blacklisted pairs for potential recovery
   */
  private reviewBlacklistedPairs(): void {
    const now = Date.now();
    
    for (const [symbol, history] of this.pairHistories.entries()) {
      if (history.blacklist.isBlacklisted && 
          history.blacklist.severity !== 'permanent' &&
          now >= history.blacklist.eligibleForReviewAt.getTime()) {
        
        // Start recovery/probation period
        this.startRecovery(history);
      }
    }
  }
  
  /**
   * Start recovery period for a pair
   */
  private startRecovery(history: PairTradingHistory): void {
    history.blacklist.isBlacklisted = false;
    history.recovery = {
      isInRecovery: true,
      probationStarted: new Date(),
      probationTrades: 0,
      probationPerformance: 0
    };
    
    // Start with low reputation
    history.reputation = 25;
    
    console.log(`🔄 ${history.symbol} entering recovery period after blacklist`);
  }
  
  /**
   * Update recovery status
   */
  private updateRecoveryStatus(history: PairTradingHistory, trade: any): void {
    history.recovery.probationTrades++;
    history.recovery.probationPerformance += trade.profitable ? 1 : -1;
    
    // Graduate from recovery after 10 trades with >60% success
    if (history.recovery.probationTrades >= 10) {
      const probationWinRate = (history.recovery.probationPerformance + 10) / 20; // Normalize to 0-1
      
      if (probationWinRate >= 0.6) {
        // Successful recovery
        history.recovery.isInRecovery = false;
        history.reputation = 50; // Reset to neutral
        console.log(`✅ ${history.symbol} successfully recovered from blacklist`);
      } else {
        // Failed recovery - blacklist again with longer duration
        this.blacklistPair(history, {
          name: 'failed_recovery',
          condition: () => true,
          severity: 'extended',
          duration: 60 * 24 * 60 * 60 * 1000, // 2 months
          reason: 'Failed recovery period - poor performance'
        });
      }
    }
  }
  
  /**
   * Log significant events
   */
  private logSignificantEvents(history: PairTradingHistory, trade: any): void {
    // Log streaks
    if (history.metrics.consecutiveWins === 3) {
      console.log(`🔥 ${history.symbol} on 3-trade winning streak! Reputation: ${history.reputation.toFixed(1)}`);
    }
    
    if (history.metrics.consecutiveLosses === 2) {
      console.log(`⚠️ ${history.symbol} has 2 consecutive losses - one more triggers blacklist`);
    }
    
    // Log reputation milestones
    if (history.reputation >= 80 && history.trades.length > 1 && 
        history.trades[history.trades.length - 2]) {
      const prevRep = history.reputation - (trade.profitable ? 5 : -5);
      if (prevRep < 80) {
        console.log(`⭐ ${history.symbol} achieved excellent reputation (${history.reputation.toFixed(1)}/100)`);
      }
    }
  }
  
  /**
   * Initialize pair history
   */
  private initializePairHistory(symbol: string): void {
    this.pairHistories.set(symbol, {
      symbol,
      trades: [],
      metrics: {
        totalTrades: 0,
        consecutiveLosses: 0,
        consecutiveWins: 0,
        recentWinRate: 0,
        allTimeWinRate: 0,
        avgVolume: 0,
        avgReturn: 0,
        worstDrawdown: 0,
        lastTradeTime: new Date()
      },
      reputation: 50, // Start neutral
      blacklist: {
        isBlacklisted: false,
        reason: '',
        severity: 'temporary',
        blacklistedAt: new Date(),
        eligibleForReviewAt: new Date(),
        blacklistCount: 0
      },
      recovery: {
        isInRecovery: false,
        probationStarted: new Date(),
        probationTrades: 0,
        probationPerformance: 0
      }
    });
  }
  
  /**
   * Get reputation summary
   */
  getReputationSummary(): any {
    const pairs = Array.from(this.pairHistories.values());
    const blacklisted = pairs.filter(p => p.blacklist.isBlacklisted);
    const inRecovery = pairs.filter(p => p.recovery.isInRecovery);
    const excellent = pairs.filter(p => p.reputation >= 80);
    const poor = pairs.filter(p => p.reputation < 30 && !p.blacklist.isBlacklisted);
    
    return {
      totalPairs: pairs.length,
      blacklisted: blacklisted.map(p => ({
        symbol: p.symbol,
        reason: p.blacklist.reason,
        daysRemaining: Math.ceil((p.blacklist.eligibleForReviewAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      })),
      inRecovery: inRecovery.map(p => ({
        symbol: p.symbol,
        probationTrades: p.recovery.probationTrades,
        performance: p.recovery.probationPerformance
      })),
      topPerformers: excellent.map(p => ({
        symbol: p.symbol,
        reputation: p.reputation,
        winRate: p.metrics.allTimeWinRate
      })),
      struggling: poor.map(p => ({
        symbol: p.symbol,
        reputation: p.reputation,
        consecutiveLosses: p.metrics.consecutiveLosses
      }))
    };
  }
}

// Singleton instance
export const pairReputationManager = new PairReputationBlacklistManager();