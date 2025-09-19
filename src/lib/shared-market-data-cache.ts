/**
 * Shared Market Data Cache
 * Provides validated market data to all trading systems
 * Prevents API rate limiting while ensuring data consistency
 */

export interface CachedMarketData {
  symbol: string;
  price: number;
  volume24h?: number;
  change24h?: number;
  timestamp: Date;
  isValid: boolean;
}

export interface MarketDataCache {
  [symbol: string]: CachedMarketData;
}

class SharedMarketDataCache {
  private static instance: SharedMarketDataCache;
  private cache = new Map<string, CachedMarketData>();
  private readonly CACHE_TTL = 60000; // 1 minute TTL

  private constructor() {}

  static getInstance(): SharedMarketDataCache {
    if (!SharedMarketDataCache.instance) {
      SharedMarketDataCache.instance = new SharedMarketDataCache();
    }
    return SharedMarketDataCache.instance;
  }

  /**
   * Update market data from main trading system
   */
  updatePriceData(symbol: string, price: number, additionalData?: {
    volume24h?: number;
    change24h?: number;
  }) {
    this.cache.set(symbol, {
      symbol,
      price,
      volume24h: additionalData?.volume24h || 1000000, // Default volume
      change24h: additionalData?.change24h || 0,
      timestamp: new Date(),
      isValid: true
    });
  }

  /**
   * Get cached market data for a symbol
   */
  getMarketData(symbol: string): CachedMarketData | null {
    const cached = this.cache.get(symbol);
    if (!cached) return null;

    // Check if data is still valid
    const age = Date.now() - cached.timestamp.getTime();
    if (age > this.CACHE_TTL) {
      this.cache.delete(symbol);
      return null;
    }

    return cached;
  }

  /**
   * Get all cached market data (for Profit Predator)
   */
  getAllMarketData(): MarketDataCache {
    const result: MarketDataCache = {};
    const now = Date.now();

    for (const [symbol, data] of this.cache.entries()) {
      const age = now - data.timestamp.getTime();
      if (age <= this.CACHE_TTL) {
        result[symbol] = data;
      } else {
        // Cleanup expired data
        this.cache.delete(symbol);
      }
    }

    return result;
  }

  /**
   * Get available symbols with fresh data
   */
  getAvailableSymbols(): string[] {
    const now = Date.now();
    const availableSymbols: string[] = [];

    for (const [symbol, data] of this.cache.entries()) {
      const age = now - data.timestamp.getTime();
      if (age <= this.CACHE_TTL) {
        availableSymbols.push(symbol);
      } else {
        this.cache.delete(symbol);
      }
    }

    return availableSymbols;
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    totalSymbols: number;
    validSymbols: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const now = Date.now();
    let validCount = 0;
    let oldestTime = now;
    let newestTime = 0;

    for (const data of this.cache.values()) {
      const entryTime = data.timestamp.getTime();
      const age = now - entryTime;

      if (age <= this.CACHE_TTL) {
        validCount++;
        if (entryTime < oldestTime) oldestTime = entryTime;
        if (entryTime > newestTime) newestTime = entryTime;
      }
    }

    return {
      totalSymbols: this.cache.size,
      validSymbols: validCount,
      oldestEntry: validCount > 0 ? now - oldestTime : 0,
      newestEntry: validCount > 0 ? now - newestTime : 0
    };
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [symbol, data] of this.cache.entries()) {
      const age = now - data.timestamp.getTime();
      if (age > this.CACHE_TTL) {
        this.cache.delete(symbol);
      }
    }
  }
}

// Export singleton instance
export const sharedMarketDataCache = SharedMarketDataCache.getInstance();