/**
 * KRAKEN PAIR VALIDATOR
 * Dynamic validation and mapping of trading pairs using Kraken's AssetPairs API
 * Solves hardcoded mapping issues and keeps up with Kraken's pair changes
 */

interface KrakenAssetPair {
  altname: string;
  wsname: string;
  base: string;
  quote: string;
  status: string;
  leverage_buy: number[];
  leverage_sell: number[];
}

interface KrakenAssetPairsResponse {
  error: string[];
  result: Record<string, KrakenAssetPair>;
}

class KrakenPairValidator {
  private validPairs = new Map<string, string>(); // symbol -> krakenPair
  private reverseMap = new Map<string, string>(); // krakenPair -> symbol
  private lastUpdate = 0;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  constructor() {
    console.log('🔍 Kraken Pair Validator initialized');
  }

  /**
   * Get Kraken pair name for a symbol with dynamic validation
   */
  async getKrakenPair(symbol: string): Promise<string | null> {
    await this.ensureValidPairs();

    const krakenPair = this.validPairs.get(symbol);
    if (!krakenPair) {
      console.warn(`⚠️ Cannot map ${symbol} to Kraken pair - not available`);
      return null;
    }

    return krakenPair;
  }

  /**
   * Get our symbol format from Kraken pair name
   */
  async getSymbolFromKrakenPair(krakenPair: string): Promise<string | null> {
    await this.ensureValidPairs();
    return this.reverseMap.get(krakenPair) || null;
  }

  /**
   * Check if a symbol is valid and tradeable on Kraken
   */
  async isValidSymbol(symbol: string): Promise<boolean> {
    await this.ensureValidPairs();
    return this.validPairs.has(symbol);
  }

  /**
   * Get all valid USD trading pairs
   */
  async getValidUsdPairs(): Promise<string[]> {
    await this.ensureValidPairs();
    return Array.from(this.validPairs.keys()).filter(symbol =>
      symbol.endsWith('USD') || symbol.endsWith('USDT') || symbol.endsWith('USDC')
    );
  }

  /**
   * Get pairs with leverage support
   */
  async getLeveragedPairs(): Promise<Map<string, number>> {
    await this.ensureValidPairs();

    const leveragedPairs = new Map<string, number>();

    try {
      const response = await fetch('https://api.kraken.com/0/public/AssetPairs');
      const data: KrakenAssetPairsResponse = await response.json();

      if (data.error && data.error.length > 0) {
        throw new Error(`Kraken API error: ${data.error.join(', ')}`);
      }

      for (const [krakenPair, pairData] of Object.entries(data.result)) {
        const symbol = this.reverseMap.get(krakenPair);
        if (symbol && pairData.status === 'online') {
          const maxLeverage = Math.max(
            ...(pairData.leverage_buy || [1]),
            ...(pairData.leverage_sell || [1])
          );
          if (maxLeverage > 1) {
            leveragedPairs.set(symbol, maxLeverage);
          }
        }
      }

      console.log(`📊 Found ${leveragedPairs.size} pairs with leverage support`);
      return leveragedPairs;

    } catch (error) {
      console.error('❌ Failed to fetch leverage data:', error);
      return new Map();
    }
  }

  /**
   * Refresh pairs cache from Kraken API
   */
  private async ensureValidPairs(): Promise<void> {
    const now = Date.now();

    if (this.validPairs.size > 0 && (now - this.lastUpdate) < this.CACHE_DURATION) {
      return; // Cache is still valid
    }

    console.log('🔄 Refreshing Kraken pairs cache...');

    try {
      const response = await fetch('https://api.kraken.com/0/public/AssetPairs', {
        headers: {
          'User-Agent': 'SignalCartel-Trading-Bot/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: KrakenAssetPairsResponse = await response.json();

      if (data.error && data.error.length > 0) {
        throw new Error(`Kraken API error: ${data.error.join(', ')}`);
      }

      this.validPairs.clear();
      this.reverseMap.clear();

      // Process all pairs and create mappings
      for (const [krakenPair, pairData] of Object.entries(data.result)) {
        if (pairData.status !== 'online') {
          continue; // Skip inactive pairs
        }

        // Create symbol from altname (preferred) or construct from base/quote
        let symbol = pairData.altname;

        // Special handling for common crypto pairs that use different naming
        if (krakenPair === 'XXBTZUSD') {
          symbol = 'BTCUSD';
        } else if (krakenPair === 'XETHZUSD') {
          symbol = 'ETHUSD';
        } else if (krakenPair === 'XXRPZUSD') {
          symbol = 'XRPUSD';
        } else if (krakenPair === 'XLTCZUSD') {
          symbol = 'LTCUSD';
        } else if (!symbol.match(/(USD|USDT|USDC)$/)) {
          // If altname doesn't end with USD/USDT/USDC, construct it
          const quote = pairData.quote.replace(/^[XZ]/, ''); // Remove X/Z prefixes
          const base = pairData.base.replace(/^[XZ]/, '');

          if (quote === 'USD' || quote === 'USDT' || quote === 'USDC') {
            symbol = `${base}${quote}`;
          } else {
            continue; // Skip non-USD pairs
          }
        }

        this.validPairs.set(symbol, krakenPair);
        this.reverseMap.set(krakenPair, symbol);
      }

      this.lastUpdate = now;

      console.log(`✅ Loaded ${this.validPairs.size} valid Kraken USD pairs`);
      console.log(`🔄 Cache valid for ${this.CACHE_DURATION / 60000} minutes`);

    } catch (error) {
      console.error('❌ Failed to fetch Kraken pairs:', error);

      // If we have no cached data and fetch fails, create minimal fallback
      if (this.validPairs.size === 0) {
        this.createFallbackMapping();
      }
    }
  }

  /**
   * Create minimal fallback mapping for critical pairs
   */
  private createFallbackMapping(): void {
    console.warn('⚠️ Using fallback pair mapping - limited functionality');

    const fallbackPairs = [
      ['BTCUSD', 'XXBTZUSD'],
      ['ETHUSD', 'XETHZUSD'],
      ['SOLUSD', 'SOLUSD'],
      ['ADAUSD', 'ADAUSD'],
      ['AVAXUSD', 'AVAXUSD'],
      ['XRPUSD', 'XXRPZUSD'],
      ['DOTUSD', 'DOTUSD'],
      ['LINKUSD', 'LINKUSD'],
      ['ATOMUSD', 'ATOMUSD'],
      ['AAVEUSD', 'AAVEUSD'],
      ['BCHUSD', 'BCHUSD'],
      ['LTCUSD', 'XLTCZUSD']
    ];

    for (const [symbol, krakenPair] of fallbackPairs) {
      this.validPairs.set(symbol, krakenPair);
      this.reverseMap.set(krakenPair, symbol);
    }
  }

  /**
   * Force refresh the pairs cache
   */
  async forceRefresh(): Promise<void> {
    this.lastUpdate = 0;
    await this.ensureValidPairs();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; lastUpdate: Date; validFor: number } {
    return {
      size: this.validPairs.size,
      lastUpdate: new Date(this.lastUpdate),
      validFor: Math.max(0, this.CACHE_DURATION - (Date.now() - this.lastUpdate))
    };
  }
}

// Export singleton instance
export const krakenPairValidator = new KrakenPairValidator();

// Export class for testing
export { KrakenPairValidator };