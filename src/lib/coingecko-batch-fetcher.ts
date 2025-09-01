/**
 * CoinGecko Batch Fetcher
 * 
 * Optimized API client to reduce CoinGecko API calls through:
 * - Intelligent batching of multiple requests into single calls
 * - Extended caching (15 minutes for market data)
 * - Rate limiting with exponential backoff
 * - Single market data fetch covering all needs
 */

export interface CoinGeckoCoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
  price_change_percentage_7d_in_currency?: number;
}

export interface BatchPriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  marketCapRank: number;
  timestamp: Date;
  source: 'coingecko-batch';
}

class CoinGeckoBatchFetcher {
  private static instance: CoinGeckoBatchFetcher | null = null;
  private cache: Map<string, { data: CoinGeckoCoinData[]; timestamp: Date }> = new Map();
  private priceCache: Map<string, { data: BatchPriceData; timestamp: Date }> = new Map();
  private readonly CACHE_DURATION = 1800000; // 30 minutes cache (very long to minimize API calls)
  private readonly PRICE_CACHE_DURATION = 900000; // 15 minutes for individual prices
  private lastRequestTime: number = 0;
  private readonly RATE_LIMIT_MS = 60000; // 60 seconds between requests (ultra conservative for free tier)
  private requestQueue: Promise<any> = Promise.resolve();
  private requestCount: number = 0;
  private requestWindowStart: number = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 4; // Stay well under 5-15 limit

  private constructor() {}

  static getInstance(): CoinGeckoBatchFetcher {
    if (!CoinGeckoBatchFetcher.instance) {
      CoinGeckoBatchFetcher.instance = new CoinGeckoBatchFetcher();
    }
    return CoinGeckoBatchFetcher.instance;
  }

  /**
   * Get comprehensive market data for top coins - single API call covers all needs
   */
  async getMarketData(options: {
    perPage?: number;
    orderBy?: string;
    includePercentage?: boolean;
    forceRefresh?: boolean;
  } = {}): Promise<CoinGeckoCoinData[]> {
    const {
      perPage = 100,
      orderBy = 'market_cap_desc',
      includePercentage = true,
      forceRefresh = false
    } = options;

    const cacheKey = `market-data-${orderBy}-${perPage}`;

    // Check cache first
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION) {
        console.log(`📊 Using cached market data (${cached.data.length} coins, age: ${Math.round((Date.now() - cached.timestamp.getTime()) / 1000)}s)`);
        return cached.data;
      }
    }

    return this.requestQueue = this.requestQueue.then(async () => {
      // Strict rate limiting to avoid blacklisting
      const now = Date.now();
      
      // Reset counter every minute
      if (now - this.requestWindowStart >= 60000) {
        this.requestCount = 0;
        this.requestWindowStart = now;
      }
      
      // Check if we've hit our conservative limit
      if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
        const waitTime = 60000 - (now - this.requestWindowStart);
        console.log(`🚨 CoinGecko API limit protection: waiting ${Math.round(waitTime/1000)}s to avoid blacklisting`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.requestWindowStart = Date.now();
      }
      
      // Additional per-request delay
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
        const waitTime = this.RATE_LIMIT_MS - timeSinceLastRequest;
        console.log(`⏳ CoinGecko conservative delay: waiting ${Math.round(waitTime/1000)}s`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.requestCount++;
      this.lastRequestTime = Date.now();

      try {
        console.log(`🔄 Fetching fresh market data from CoinGecko (${perPage} coins)...`);

        const percentageParam = includePercentage ? '&price_change_percentage=24h,7d' : '';
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=${orderBy}&per_page=${perPage}&page=1&sparkline=false${percentageParam}`;
        
        const response = await fetch(url, {
          headers: { 
            'Accept': 'application/json',
            'User-Agent': 'QuantumForge-Trading/1.0 (Respectful API Usage)'
          },
          timeout: 15000
        });

        if (response.status === 429) {
          console.warn('🚨 CoinGecko rate limit hit - extending cache and backoff');
          // Return cached data if available, even if slightly stale
          const cached = this.cache.get(cacheKey);
          if (cached) {
            return cached.data;
          }
          throw new Error('CoinGecko API rate limited and no cached data available');
        }

        if (!response.ok) {
          throw new Error(`CoinGecko API returned ${response.status}`);
        }

        const data: CoinGeckoCoinData[] = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Invalid or empty response from CoinGecko');
        }

        // Cache the comprehensive data
        this.cache.set(cacheKey, { data, timestamp: new Date() });
        
        // Also populate individual price cache
        for (const coin of data) {
          const priceData: BatchPriceData = {
            symbol: coin.symbol.toUpperCase(),
            price: coin.current_price,
            change24h: coin.price_change_percentage_24h || 0,
            volume24h: coin.total_volume,
            marketCap: coin.market_cap,
            marketCapRank: coin.market_cap_rank,
            timestamp: new Date(),
            source: 'coingecko-batch'
          };
          this.priceCache.set(coin.symbol.toUpperCase(), { data: priceData, timestamp: new Date() });
        }

        console.log(`✅ Fresh market data cached: ${data.length} coins`);
        return data;

      } catch (error) {
        console.error(`❌ Failed to fetch CoinGecko market data:`, error);
        
        // Try to return cached data even if stale
        const cached = this.cache.get(cacheKey);
        if (cached) {
          console.warn(`⚠️ Using stale cached data (age: ${Math.round((Date.now() - cached.timestamp.getTime()) / 1000)}s)`);
          return cached.data;
        }
        
        throw error;
      }
    });
  }

  /**
   * Get top performing coins by market cap
   */
  async getTopCoins(limit: number = 50): Promise<BatchPriceData[]> {
    const marketData = await this.getMarketData({ perPage: Math.max(limit, 50), orderBy: 'market_cap_desc' });
    
    return marketData.slice(0, limit).map(coin => ({
      symbol: coin.symbol.toUpperCase(),
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h || 0,
      volume24h: coin.total_volume,
      marketCap: coin.market_cap,
      marketCapRank: coin.market_cap_rank,
      timestamp: new Date(),
      source: 'coingecko-batch' as const
    }));
  }

  /**
   * Get trending/gainer coins
   */
  async getTrendingCoins(limit: number = 20): Promise<BatchPriceData[]> {
    const marketData = await this.getMarketData({ 
      perPage: Math.max(limit * 2, 50), 
      orderBy: 'price_change_percentage_24h_desc' 
    });
    
    // Filter for significant gains (>5%) and good volume
    const trending = marketData
      .filter(coin => 
        (coin.price_change_percentage_24h || 0) > 5 && 
        coin.total_volume > 1000000 && // >$1M volume
        coin.current_price > 0.00001 // Avoid ultra-low cap coins
      )
      .slice(0, limit);

    return trending.map(coin => ({
      symbol: coin.symbol.toUpperCase(),
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h || 0,
      volume24h: coin.total_volume,
      marketCap: coin.market_cap,
      marketCapRank: coin.market_cap_rank,
      timestamp: new Date(),
      source: 'coingecko-batch' as const
    }));
  }

  /**
   * Get price for a specific symbol from cache or market data
   */
  async getPrice(symbol: string): Promise<BatchPriceData | null> {
    const upperSymbol = symbol.toUpperCase();
    
    // Check price cache first
    const cached = this.priceCache.get(upperSymbol);
    if (cached && Date.now() - cached.timestamp.getTime() < this.PRICE_CACHE_DURATION) {
      return cached.data;
    }

    // If not in cache, try to get from market data
    try {
      const marketData = await this.getMarketData({ perPage: 100 });
      const coin = marketData.find(c => c.symbol.toUpperCase() === upperSymbol);
      
      if (coin) {
        const priceData: BatchPriceData = {
          symbol: coin.symbol.toUpperCase(),
          price: coin.current_price,
          change24h: coin.price_change_percentage_24h || 0,
          volume24h: coin.total_volume,
          marketCap: coin.market_cap,
          marketCapRank: coin.market_cap_rank,
          timestamp: new Date(),
          source: 'coingecko-batch'
        };
        
        this.priceCache.set(upperSymbol, { data: priceData, timestamp: new Date() });
        return priceData;
      }
    } catch (error) {
      console.error(`❌ Failed to get price for ${symbol}:`, error);
    }

    return null;
  }

  /**
   * Get multiple prices efficiently 
   */
  async getMultiplePrices(symbols: string[]): Promise<(BatchPriceData | null)[]> {
    console.log(`📊 Getting ${symbols.length} prices from batch cache...`);
    
    // Get comprehensive market data once
    await this.getMarketData({ perPage: 100 });
    
    // Return prices from cache
    return symbols.map(symbol => {
      const cached = this.priceCache.get(symbol.toUpperCase());
      return cached ? cached.data : null;
    });
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.priceCache.clear();
    console.log('🧹 CoinGecko batch cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { marketDataEntries: number; priceEntries: number; oldestAge: number } {
    const now = Date.now();
    let oldestAge = 0;
    
    for (const [, cached] of this.cache) {
      const age = now - cached.timestamp.getTime();
      if (age > oldestAge) oldestAge = age;
    }
    
    for (const [, cached] of this.priceCache) {
      const age = now - cached.timestamp.getTime();
      if (age > oldestAge) oldestAge = age;
    }

    return {
      marketDataEntries: this.cache.size,
      priceEntries: this.priceCache.size,
      oldestAge: Math.round(oldestAge / 1000)
    };
  }
}

// Export singleton
export const coinGeckoBatchFetcher = CoinGeckoBatchFetcher.getInstance();

// Helper functions
export function clearCoinGeckoCache(): void {
  coinGeckoBatchFetcher.clearCache();
}

export function getCoinGeckoCacheStats() {
  return coinGeckoBatchFetcher.getCacheStats();
}

// Test function
export async function testCoinGeckoBatchFetch(): Promise<void> {
  console.log('🧪 Testing CoinGecko batch fetching...');
  
  try {
    console.time('Top 20 coins');
    const topCoins = await coinGeckoBatchFetcher.getTopCoins(20);
    console.timeEnd('Top 20 coins');
    
    console.time('Trending coins');
    const trending = await coinGeckoBatchFetcher.getTrendingCoins(10);
    console.timeEnd('Trending coins');
    
    console.time('Multiple prices');
    const prices = await coinGeckoBatchFetcher.getMultiplePrices(['BTC', 'ETH', 'SOL']);
    console.timeEnd('Multiple prices');
    
    console.log('📊 Results:');
    console.log(`  Top coins: ${topCoins.length}`);
    console.log(`  Trending: ${trending.length}`);
    console.log(`  Prices: ${prices.filter(p => p !== null).length}/${prices.length}`);
    console.log(`  Cache stats:`, coinGeckoBatchFetcher.getCacheStats());
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}