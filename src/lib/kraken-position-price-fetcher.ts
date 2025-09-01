/**
 * Kraken Position Price Fetcher
 * 
 * Specialized price fetcher that ONLY uses Kraken.com for open positions
 * This ensures price accuracy for active trades on the platform you'll use for live trading
 * 
 * The Profit Predictor and Smart Hunter can continue using multi-source price fetching
 */

import { KrakenClient, KrakenTicker } from './live-trading/kraken-client';

export interface KrakenPositionPriceData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: Date;
  source: 'kraken';
  success: boolean;
  error?: string;
  volume24h: number;
  change24h: number;
}

class KrakenPositionPriceFetcher {
  private static instance: KrakenPositionPriceFetcher | null = null;
  private krakenClient: KrakenClient;
  private cache: Map<string, { data: KrakenPositionPriceData; timestamp: Date }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute cache for position prices
  private lastRequestTime: number = 0;
  private readonly RATE_LIMIT_MS = 1000; // 1 second between requests

  private constructor() {
    // Initialize Kraken client for public data (no auth needed for prices)
    this.krakenClient = new KrakenClient({
      apiKey: '', // Not needed for public ticker data
      privateKey: '',
      isLive: true // Use live Kraken API
    });
  }

  static getInstance(): KrakenPositionPriceFetcher {
    if (!KrakenPositionPriceFetcher.instance) {
      KrakenPositionPriceFetcher.instance = new KrakenPositionPriceFetcher();
    }
    return KrakenPositionPriceFetcher.instance;
  }

  /**
   * Get current price from Kraken for an open position
   * This method should ONLY be called for symbols that have open positions
   */
  async getPositionPrice(symbol: string, forceRefresh: boolean = false): Promise<KrakenPositionPriceData> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION) {
        console.log(`📊 Kraken cached price for position ${symbol}: $${cached.data.price.toLocaleString()}`);
        return cached.data;
      }
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      const waitTime = this.RATE_LIMIT_MS - timeSinceLastRequest;
      console.log(`⏳ Kraken rate limit: waiting ${waitTime}ms for ${symbol}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();

    console.log(`🔵 Fetching LIVE position price from Kraken: ${symbol}`);

    try {
      // Convert symbol to Kraken format
      const krakenPair = this.convertToKrakenPair(symbol);
      if (!krakenPair) {
        throw new Error(`Unknown Kraken pair mapping for ${symbol}`);
      }

      // Get ticker data from Kraken (client now handles response parsing)
      const ticker: KrakenTicker = await this.krakenClient.getTicker(krakenPair);
      
      if (!ticker || !ticker.c) {
        throw new Error(`No ticker data available for ${krakenPair}`);
      }
      
      // Parse Kraken ticker data
      const price = parseFloat(ticker.c[0]); // Last trade price
      const bid = parseFloat(ticker.b[0]); // Best bid
      const ask = parseFloat(ticker.a[0]); // Best ask
      const volume24h = parseFloat(ticker.v[1]); // 24h volume
      
      // Calculate 24h change
      const openPrice = parseFloat(ticker.o);
      const change24h = ((price - openPrice) / openPrice) * 100;

      // Validate price data
      if (!price || price <= 0 || !isFinite(price)) {
        throw new Error(`Invalid price data from Kraken: ${price}`);
      }

      const priceData: KrakenPositionPriceData = {
        symbol,
        price,
        bid,
        ask,
        timestamp: new Date(),
        source: 'kraken',
        success: true,
        volume24h,
        change24h
      };

      // Cache the result
      this.cache.set(symbol, { data: priceData, timestamp: new Date() });

      console.log(`✅ Kraken position price: ${symbol} = $${price.toLocaleString()} (bid: $${bid.toLocaleString()}, ask: $${ask.toLocaleString()})`);
      return priceData;

    } catch (error) {
      console.error(`❌ Failed to get Kraken position price for ${symbol}:`, error);
      
      const errorData: KrakenPositionPriceData = {
        symbol,
        price: 0,
        bid: 0,
        ask: 0,
        timestamp: new Date(),
        source: 'kraken',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        volume24h: 0,
        change24h: 0
      };

      return errorData;
    }
  }

  /**
   * Get prices for multiple open positions
   */
  async getMultiplePositionPrices(symbols: string[]): Promise<KrakenPositionPriceData[]> {
    console.log(`🔵 Fetching ${symbols.length} position prices from Kraken:`, symbols);
    
    // Process sequentially to respect rate limits
    const results: KrakenPositionPriceData[] = [];
    for (const symbol of symbols) {
      const result = await this.getPositionPrice(symbol);
      results.push(result);
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Kraken position prices: ${successCount}/${symbols.length} successful`);
    
    return results;
  }

  /**
   * Convert standard symbol format to Kraken pair format
   */
  private convertToKrakenPair(symbol: string): string | null {
    // Map common symbols to Kraken pair names
    const mapping: Record<string, string> = {
      'BTCUSD': 'XXBTZUSD',
      'BTCUSDT': 'XBTUSDT',
      'ETHUSD': 'XETHZUSD',
      'ETHUSDT': 'ETHUSDT',
      'SOLUSD': 'SOLUSD',
      'SOLUSDT': 'SOLUSDT',
      'XRPUSD': 'XRPUSD',
      'XRPUSDT': 'XRPUSDT',
      'ADAUSD': 'ADAUSD',
      'ADAUSDT': 'ADAUSDT',
      'AVAXUSD': 'AVAXUSD',
      'AVAXUSDT': 'AVAXUSDT',
      'LINKUSD': 'LINKUSD',
      'LINKUSDT': 'LINKUSDT',
      'MATICUSD': 'MATICUSD',
      'MATICUSDT': 'MATICUSDT',
      'DOGEUSD': 'XDGUSD',
      'DOGEUSDT': 'XDGUSDT',
      'DOTUSD': 'DOTUSD',
      'DOTUSDT': 'DOTUSDT',
      'ATOMUSD': 'ATOMUSD',
      'ATOMUSDT': 'ATOMUSDT',
      'UNIUSD': 'UNIUSD',
      'UNIUSDT': 'UNIUSDT',
      'AAVEUSD': 'AAVEUSD',
      'AAVEUSDT': 'AAVEUSDT',
      'LTCUSD': 'XLTCUSD',
      'LTCUSDT': 'XLTCUSDT',
      'BCHUSD': 'BCHUSD',
      'BCHUSDT': 'BCHUSDT'
    };

    const krakenPair = mapping[symbol];
    if (!krakenPair) {
      console.warn(`⚠️ No Kraken pair mapping found for ${symbol}, trying direct mapping`);
      // Try direct mapping as fallback
      return symbol;
    }

    return krakenPair;
  }

  /**
   * Get available Kraken trading pairs
   */
  async getAvailablePairs(): Promise<string[]> {
    try {
      const pairs = await this.krakenClient.getAssetPairs();
      return Object.keys(pairs);
    } catch (error) {
      console.error('❌ Failed to get Kraken asset pairs:', error);
      return [];
    }
  }

  /**
   * Check if a symbol is available on Kraken
   */
  async isSymbolAvailable(symbol: string): Promise<boolean> {
    const krakenPair = this.convertToKrakenPair(symbol);
    if (!krakenPair) return false;

    try {
      const pairs = await this.getAvailablePairs();
      return pairs.includes(krakenPair);
    } catch {
      return false;
    }
  }

  /**
   * Clear position price cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Kraken position price cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { symbol: string; price: number; age: number }[] {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([symbol, cached]) => ({
      symbol,
      price: cached.data.price,
      age: Math.round((now - cached.timestamp.getTime()) / 1000)
    }));
  }
}

// Export singleton instance
export const krakenPositionPriceFetcher = KrakenPositionPriceFetcher.getInstance();

// Helper functions
export function clearKrakenPositionPriceCache(): void {
  krakenPositionPriceFetcher.clearCache();
}

export function getKrakenPositionPriceCacheStatus(): { symbol: string; price: number; age: number }[] {
  return krakenPositionPriceFetcher.getCacheStatus();
}

// Test function
export async function testKrakenPositionPriceFetch(symbols: string[] = ['BTCUSD', 'ETHUSD']): Promise<void> {
  console.log('🧪 Testing Kraken position price fetching...');
  
  const results = await krakenPositionPriceFetcher.getMultiplePositionPrices(symbols);
  
  console.log('📊 Kraken Position Price Test Results:');
  for (const result of results) {
    if (result.success) {
      console.log(`✅ ${result.symbol}: $${result.price.toLocaleString()} (${result.change24h > 0 ? '+' : ''}${result.change24h.toFixed(2)}%)`);
      console.log(`   Spread: $${result.bid.toLocaleString()} - $${result.ask.toLocaleString()}`);
    } else {
      console.log(`❌ ${result.symbol}: Failed - ${result.error}`);
    }
  }
}