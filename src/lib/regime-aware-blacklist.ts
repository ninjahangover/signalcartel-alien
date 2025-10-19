/**
 * V3.14.28: REGIME-AWARE BLACKLIST MANAGER
 *
 * Problem: System learned BTC loses money during BEAR markets,
 * blacklisted it forever, now can't trade it in BULL markets.
 *
 * Solution: Tag blacklist entries with the regime they were created in.
 * When regime changes significantly, reset relevant blacklist entries.
 *
 * Philosophy: Poor performance in one regime doesn't predict poor performance in another.
 */

import { MarketRegime, MarketRegimeType } from './market-regime-detector-v2';

export interface BlacklistEntry {
  symbol: string;
  reason: string;
  accuracy: number; // Historical win rate that triggered blacklist
  tradeCount: number; // Number of trades that led to blacklist
  regime: MarketRegimeType; // Regime when blacklisted
  createdAt: Date;
  expiresAt: Date | null; // null = permanent, Date = temporary
}

export class RegimeAwareBlacklist {
  private blacklist: Map<string, BlacklistEntry> = new Map();
  private readonly MIN_TRADES_FOR_BLACKLIST = 20; // Need at least 20 trades to blacklist
  private readonly POOR_ACCURACY_THRESHOLD = 0.30; // <30% win rate = blacklist
  private readonly BLACKLIST_DURATION_DAYS = 7; // Temporary blacklist for 7 days

  /**
   * Add a symbol to the blacklist with regime context
   */
  public addToBlacklist(
    symbol: string,
    accuracy: number,
    tradeCount: number,
    currentRegime: MarketRegime,
    reason?: string
  ): void {
    // Only blacklist if we have sufficient data
    if (tradeCount < this.MIN_TRADES_FOR_BLACKLIST) {
      return; // Not enough trades to make a judgment
    }

    // Only blacklist if accuracy is genuinely poor
    if (accuracy >= this.POOR_ACCURACY_THRESHOLD) {
      return; // Performance acceptable
    }

    const entry: BlacklistEntry = {
      symbol,
      reason: reason || `Poor performance: ${(accuracy * 100).toFixed(1)}% win rate over ${tradeCount} trades`,
      accuracy,
      tradeCount,
      regime: currentRegime.type,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.BLACKLIST_DURATION_DAYS * 24 * 60 * 60 * 1000)
    };

    this.blacklist.set(symbol, entry);
  }

  /**
   * Check if a symbol is blacklisted in the current regime
   */
  public isBlacklisted(symbol: string, currentRegime: MarketRegime): boolean {
    const entry = this.blacklist.get(symbol);

    if (!entry) {
      return false; // Not blacklisted
    }

    // Check if blacklist has expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.blacklist.delete(symbol);
      return false; // Expired, removed
    }

    // If regime has changed significantly, allow re-testing
    // Example: Blacklisted in BEAR, now in BULL = give it another chance
    if (this.shouldResetForRegimeChange(entry, currentRegime)) {
      this.blacklist.delete(symbol);
      return false; // Regime changed, removed
    }

    return true; // Still blacklisted
  }

  /**
   * Determine if blacklist entry should be reset due to regime change
   */
  private shouldResetForRegimeChange(entry: BlacklistEntry, currentRegime: MarketRegime): boolean {
    // Reset if regime type changed (bear→bull, bull→choppy, etc.)
    if (entry.regime !== currentRegime.type) {
      // Only reset if new regime has high confidence (>60%)
      if (currentRegime.confidence > 0.6) {
        return true; // High confidence in new regime, reset blacklist
      }
    }

    // Reset if direction flipped dramatically
    // Example: Blacklisted during downtrend, now strong uptrend
    const regimeFlipped =
      (entry.regime === 'bear' && currentRegime.type === 'bull') ||
      (entry.regime === 'bull' && currentRegime.type === 'bear');

    if (regimeFlipped && currentRegime.confidence > 0.7) {
      return true; // Complete regime reversal
    }

    return false; // Keep blacklist entry
  }

  /**
   * Reset ALL blacklist entries when major market regime change detected
   */
  public resetForRegimeChange(oldRegime: MarketRegime, newRegime: MarketRegime): number {
    let resetCount = 0;

    for (const [symbol, entry] of this.blacklist.entries()) {
      if (this.shouldResetForRegimeChange(entry, newRegime)) {
        this.blacklist.delete(symbol);
        resetCount++;
      }
    }

    return resetCount;
  }

  /**
   * Clear blacklist entries older than N days
   */
  public clearOlderThan(days: number): number {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    let clearedCount = 0;

    for (const [symbol, entry] of this.blacklist.entries()) {
      if (entry.createdAt < cutoffDate) {
        this.blacklist.delete(symbol);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  /**
   * Get blacklist entry details for a symbol
   */
  public getEntry(symbol: string): BlacklistEntry | undefined {
    return this.blacklist.get(symbol);
  }

  /**
   * Get all blacklisted symbols
   */
  public getAllBlacklisted(): BlacklistEntry[] {
    return Array.from(this.blacklist.values());
  }

  /**
   * Get blacklist statistics
   */
  public getStats(): {
    totalBlacklisted: number;
    byRegime: Record<MarketRegimeType, number>;
    expiringSoon: number;
  } {
    const byRegime: Record<MarketRegimeType, number> = {
      bull: 0,
      bear: 0,
      choppy: 0,
      crash: 0
    };

    let expiringSoon = 0;
    const oneDay = 24 * 60 * 60 * 1000;

    for (const entry of this.blacklist.values()) {
      byRegime[entry.regime]++;

      if (entry.expiresAt && entry.expiresAt.getTime() - Date.now() < oneDay) {
        expiringSoon++;
      }
    }

    return {
      totalBlacklisted: this.blacklist.size,
      byRegime,
      expiringSoon
    };
  }

  /**
   * Remove a specific symbol from blacklist
   */
  public remove(symbol: string): boolean {
    return this.blacklist.delete(symbol);
  }

  /**
   * Clear all blacklist entries
   */
  public clearAll(): void {
    this.blacklist.clear();
  }
}
