/**
 * ByBit Market Data Service - Replaces Kraken Services
 *
 * Provides cached, rate-limited market data from ByBit
 * NO external dependencies on Kraken, CoinGecko, etc.
 * Direct ByBit integration with proper caching
 */

import axios, { AxiosInstance } from 'axios';

export interface ByBitMarketData {
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  timestamp: Date;
  source: 'bybit';
}

interface CacheEntry {
  data: ByBitMarketData;
  expiry: number;
}

class ByBitMarketDataService {
  private static instance: ByBitMarketDataService;
  private client: AxiosInstance;
  private cache: Map<string, CacheEntry> = new Map();
  private lastBatchFetch: number = 0;
  private batchCache: Map<string, ByBitMarketData> = new Map();

  // Configuration
  private readonly CACHE_DURATION = 30000; // 30 seconds cache
  private readonly BATCH_CACHE_DURATION = 60000; // 1 minute batch cache
  private readonly REQUEST_TIMEOUT = 10000; // 10 second timeout
  private readonly RATE_LIMIT_DELAY = 100; // 100ms between requests

  private constructor() {
    this.client = axios.create({
      baseURL: 'https://api.bybit.com',
      timeout: this.REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CFT-Trading-System/1.0'
      }
    });

    console.log('🔄 ByBit Market Data Service initialized');
  }

  static getInstance(): ByBitMarketDataService {
    if (!ByBitMarketDataService.instance) {
      ByBitMarketDataService.instance = new ByBitMarketDataService();
    }
    return ByBitMarketDataService.instance;
  }

  /**
   * Get current price for a single symbol
   */
  async getCurrentPrice(symbol: string): Promise<{ price: number; success: boolean; error?: string }> {
    try {
      // Check cache first
      const cached = this.cache.get(symbol);
      if (cached && Date.now() < cached.expiry) {
        return {
          price: cached.data.price,
          success: true
        };
      }

      // Check batch cache
      const batchCached = this.batchCache.get(symbol);
      if (batchCached && Date.now() - this.lastBatchFetch < this.BATCH_CACHE_DURATION) {
        return {
          price: batchCached.price,
          success: true
        };
      }

      // Fetch from ByBit
      const response = await this.client.get('/v5/market/tickers', {
        params: {
          category: 'linear',
          symbol: symbol
        }
      });

      if (response.data?.result?.list?.[0]) {
        const ticker = response.data.result.list[0];
        const marketData: ByBitMarketData = {
          symbol: ticker.symbol,
          price: parseFloat(ticker.lastPrice),
          volume24h: parseFloat(ticker.turnover24h),
          priceChange24h: parseFloat(ticker.price24hPcnt),
          high24h: parseFloat(ticker.highPrice24h),
          low24h: parseFloat(ticker.lowPrice24h),
          timestamp: new Date(),
          source: 'bybit'
        };

        // Cache the result
        this.cache.set(symbol, {
          data: marketData,
          expiry: Date.now() + this.CACHE_DURATION
        });

        return {
          price: marketData.price,
          success: true
        };
      }

      return {
        price: 0,
        success: false,
        error: 'No data received from ByBit'
      };

    } catch (error) {
      const errorMessage = error.response?.data?.retMsg || error.message || 'Unknown error';
      console.error(`❌ Error fetching price for ${symbol}:`, errorMessage);

      return {
        price: 0,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get market data for all USDT perpetual pairs (batch fetch)
   */
  async getAllMarketData(): Promise<ByBitMarketData[]> {
    try {
      // Use batch cache if recent
      if (Date.now() - this.lastBatchFetch < this.BATCH_CACHE_DURATION && this.batchCache.size > 0) {
        return Array.from(this.batchCache.values());
      }

      console.log('🔄 Fetching all USDT perpetual market data from ByBit...');

      const response = await this.client.get('/v5/market/tickers', {
        params: {
          category: 'linear' // USDT perpetuals
        }
      });

      if (!response.data?.result?.list) {
        console.log('⚠️ No market data received from ByBit');
        return [];
      }

      const marketData: ByBitMarketData[] = response.data.result.list
        .filter((ticker: any) =>
          ticker.symbol.endsWith('USDT') && // Only USDT pairs
          parseFloat(ticker.turnover24h) > 100000 // Minimum $100k volume
        )
        .map((ticker: any) => ({
          symbol: ticker.symbol,
          price: parseFloat(ticker.lastPrice),
          volume24h: parseFloat(ticker.turnover24h),
          priceChange24h: parseFloat(ticker.price24hPcnt),
          high24h: parseFloat(ticker.highPrice24h),
          low24h: parseFloat(ticker.lowPrice24h),
          timestamp: new Date(),
          source: 'bybit' as const
        }));

      // Update batch cache
      this.batchCache.clear();
      marketData.forEach(data => {
        this.batchCache.set(data.symbol, data);
      });
      this.lastBatchFetch = Date.now();

      console.log(`✅ Fetched market data for ${marketData.length} USDT perpetual pairs`);
      return marketData;

    } catch (error) {
      const errorMessage = error.response?.data?.retMsg || error.message || 'Unknown error';
      console.error('❌ Error fetching all market data:', errorMessage);

      // Return cached data if available
      if (this.batchCache.size > 0) {
        console.log(`🔄 Using cached market data (${this.batchCache.size} pairs)`);
        return Array.from(this.batchCache.values());
      }

      return [];
    }
  }

  /**
   * Get top volume pairs for hunting
   */
  async getTopVolumePairs(limit: number = 50): Promise<ByBitMarketData[]> {
    const allData = await this.getAllMarketData();

    return allData
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, limit);
  }

  /**
   * Get top movers (by price change)
   */
  async getTopMovers(limit: number = 25): Promise<ByBitMarketData[]> {
    const allData = await this.getAllMarketData();

    return allData
      .sort((a, b) => Math.abs(b.priceChange24h) - Math.abs(a.priceChange24h))
      .slice(0, limit);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.batchCache.clear();
    this.lastBatchFetch = 0;
    console.log('🗑️ ByBit market data cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { individualCache: number; batchCache: number; lastBatchAge: number } {
    return {
      individualCache: this.cache.size,
      batchCache: this.batchCache.size,
      lastBatchAge: Date.now() - this.lastBatchFetch
    };
  }
}

// Export singleton instance
export const bybitMarketDataService = ByBitMarketDataService.getInstance();