/**
 * Rate Limited Market Data Service
 * 
 * Fixes 429 errors by implementing proper rate limiting and using Alpaca as primary source
 */

import { alpacaPaperTradingService } from './alpaca-paper-trading-service';
import GPUAcceleratedQueueManager, { RequestPriority } from './gpu-accelerated-queue-manager';

interface RateLimiter {
  lastRequest: number;
  requestCount: number;
  resetTime: number;
}

export interface MarketDataPoint {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  source: string;
  high: number;
  low: number;
  open: number;
  close: number;
}

class RateLimitedMarketDataService {
  private static instance: RateLimitedMarketDataService;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private cache: Map<string, { data: MarketDataPoint; expiry: number }> = new Map();
  private gpuQueueManager: GPUAcceleratedQueueManager;
  
  // Rate limits for different APIs
  private readonly RATE_LIMITS = {
    'kraken-public': { requests: 30, windowMs: 60000 }, // 30 per minute (extra conservative for startup)
    coingecko: { requests: 10, windowMs: 60000 }, // 10 per minute (conservative)
    binance: { requests: 1200, windowMs: 60000 }, // 1200 per minute
    fallback: { requests: 5, windowMs: 60000 } // Very conservative fallback
  };
  
  private readonly CACHE_DURATION = 60000; // 60 seconds for better startup stability
  
  static getInstance(): RateLimitedMarketDataService {
    if (!RateLimitedMarketDataService.instance) {
      RateLimitedMarketDataService.instance = new RateLimitedMarketDataService();
    }
    return RateLimitedMarketDataService.instance;
  }

  constructor() {
    this.gpuQueueManager = GPUAcceleratedQueueManager.getInstance();
    console.log('🚀 Market Data Service connected to GPU Queue Manager');
  }
  
  /**
   * Get market data with proper rate limiting
   */
  async getMarketData(symbol: string): Promise<MarketDataPoint | null> {
    console.log(`📊 Fetching market data for ${symbol} with rate limiting...`);
    
    // Check cache first
    const cached = this.cache.get(symbol);
    if (cached && Date.now() < cached.expiry) {
      console.log(`✅ Using cached data for ${symbol}`);
      return cached.data;
    }
    
    // Try sources in order of preference and rate limit availability
    // Updated: Use Kraken public first (working), then fallback
    const sources = ['kraken-public', 'fallback'];
    
    for (const source of sources) {
      if (this.canMakeRequest(source)) {
        console.log(`🔄 Trying ${source} for ${symbol}...`);
        
        const data = await this.fetchFromSource(source, symbol);
        if (data) {
          // Cache successful result
          this.cache.set(symbol, {
            data,
            expiry: Date.now() + this.CACHE_DURATION
          });
          
          this.recordRequest(source);
          console.log(`✅ Got ${symbol} data from ${source}: $${data.price.toLocaleString()}`);
          return data;
        }
      } else {
        console.log(`⏳ Rate limit exceeded for ${source}, trying next...`);
      }
    }
    
    console.log(`❌ Failed to get data for ${symbol} from all sources`);
    return null;
  }
  
  /**
   * Check if we can make a request to this source
   */
  private canMakeRequest(source: string): boolean {
    const limiter = this.rateLimiters.get(source);
    const limit = this.RATE_LIMITS[source] || this.RATE_LIMITS.fallback;
    const now = Date.now();
    
    if (!limiter) {
      // First request for this source
      this.rateLimiters.set(source, {
        lastRequest: now,
        requestCount: 0,
        resetTime: now + limit.windowMs
      });
      return true;
    }
    
    // Reset counter if window has passed
    if (now >= limiter.resetTime) {
      limiter.requestCount = 0;
      limiter.resetTime = now + limit.windowMs;
    }
    
    return limiter.requestCount < limit.requests;
  }
  
  /**
   * Record a request for rate limiting
   */
  private recordRequest(source: string): void {
    const limiter = this.rateLimiters.get(source);
    if (limiter) {
      limiter.requestCount++;
      limiter.lastRequest = Date.now();
    }
  }
  
  /**
   * Fetch data from specific source
   */
  private async fetchFromSource(source: string, symbol: string): Promise<MarketDataPoint | null> {
    try {
      switch (source) {
        case 'kraken-public':
          return await this.fetchFromKrakenPublic(symbol);
        case 'fallback':
          // NO FALLBACK - return null if we reached this point
          console.error(`❌ No real data available for ${symbol} - NOT using fallback`);
          return null;
        default:
          return null;
      }
    } catch (error) {
      console.error(`❌ Error fetching from ${source}:`, error.message);
      return null;
    }
  }
  
  
  /**
   * Fetch from Binance with rate limiting
   */
  private async fetchFromBinance(symbol: string): Promise<MarketDataPoint | null> {
    try {
      // Convert symbol for Binance
      const binanceSymbol = symbol.replace('USD', 'USDT');
      
      // Route through GPU Queue Manager for rate limiting
      const result = await this.gpuQueueManager.enqueueRequest(
        `binance-${binanceSymbol}`,
        'GET',
        {
          url: `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
          headers: { 'Accept': 'application/json' }
        },
        RequestPriority.MEDIUM,
        5000
      );
      
      if (result.error) {
        throw new Error(`Binance API error: ${result.error}`);
      }
      
      const data = result.data;
      
      return {
        symbol,
        price: parseFloat(data.lastPrice),
        volume: parseFloat(data.volume),
        timestamp: new Date(),
        source: 'binance',
        high: parseFloat(data.highPrice),
        low: parseFloat(data.lowPrice),
        open: parseFloat(data.openPrice),
        close: parseFloat(data.lastPrice)
      };
    } catch (error) {
      console.error('Binance API error:', error);
      return null;
    }
  }
  
  /**
   * Fetch from CoinGecko with VERY conservative rate limiting
   */
  private async fetchFromCoinGecko(symbol: string): Promise<MarketDataPoint | null> {
    try {
      // Only use for crypto symbols
      if (!['BTC', 'ETH', 'ADA', 'DOT'].includes(symbol.replace('USD', ''))) {
        return null;
      }
      
      const coinId = this.convertToCoinGeckoId(symbol);
      
      // Route through GPU Queue Manager for intelligent rate limiting
      const result = await this.gpuQueueManager.enqueueRequest(
        `coingecko-${coinId}`,
        'GET',
        {
          url: `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`,
          headers: { 
            'Accept': 'application/json',
            'User-Agent': 'StratusEngine/1.0'
          }
        },
        RequestPriority.MEDIUM,
        10000
      );
      
      if (result.error) {
        console.log('⚠️ CoinGecko rate limited - will use other sources');
        throw new Error(`Rate limited by CoinGecko: ${result.error}`);
      }
      
      const data = result.data;
      const coinData = data[coinId];
      
      if (!coinData) {
        throw new Error('No data from CoinGecko');
      }
      
      const price = coinData.usd;
      const volume = coinData.usd_24h_vol || 1000000;
      
      return {
        symbol,
        price,
        volume,
        timestamp: new Date(),
        source: 'coingecko',
        high: price * 1.02,
        low: price * 0.98,
        open: price * 0.999,
        close: price
      };
    } catch (error) {
      console.error('CoinGecko API error:', error);
      return null;
    }
  }
  
  /**
   * Fetch from Kraken Public API (Secondary source)
   */
  private async fetchFromKrakenPublic(symbol: string): Promise<MarketDataPoint | null> {
    try {
      // Convert symbol for Kraken (e.g., ETHUSD -> XETHZUSD)
      const krakenSymbol = this.convertToKrakenSymbol(symbol);
      
      const result = await this.gpuQueueManager.enqueueRequest(
        `kraken-public-${krakenSymbol}`,
        'GET',
        {
          url: `https://api.kraken.com/0/public/Ticker?pair=${krakenSymbol}`,
          headers: { 'Accept': 'application/json' }
        },
        RequestPriority.MEDIUM,
        5000
      );
      
      if (result.error) {
        throw new Error(`Kraken Public API error: ${result.error}`);
      }
      
      const data = result.data;
      if (!data.result || Object.keys(data.result).length === 0) {
        throw new Error('No data from Kraken');
      }
      
      const pairData = data.result[Object.keys(data.result)[0]];
      
      return {
        symbol,
        price: parseFloat(pairData.c[0]), // Last trade price
        volume: parseFloat(pairData.v[1]), // Volume last 24 hours
        timestamp: new Date(),
        source: 'kraken-public',
        high: parseFloat(pairData.h[1]), // High last 24 hours
        low: parseFloat(pairData.l[1]),   // Low last 24 hours
        open: parseFloat(pairData.o),     // Opening price
        close: parseFloat(pairData.c[0])  // Last trade price
      };
    } catch (error) {
      console.error('Kraken Public API error:', error);
      return null;
    }
  }
  
  /**
   * Convert symbol to Kraken format
   */
  private convertToKrakenSymbol(symbol: string): string {
    const mapping = {
      'BTCUSD': 'XXBTZUSD',
      'ETHUSD': 'XETHZUSD', 
      'ADAUSD': 'ADAUSD',
      'DOTUSD': 'DOTUSD',
      'SOLUSD': 'SOLUSD',
      'MATICUSD': 'MATICUSD',
      'AVAXUSD': 'AVAXUSD'
    };
    
    return mapping[symbol] || symbol;
  }
  
  /**
   * NO FALLBACK DATA - Real data only
   */
  private async generateFallbackData(symbol: string): Promise<MarketDataPoint | null> {
    console.error(`❌ CRITICAL: Fallback data requested for ${symbol} - NO MOCK DATA ALLOWED!`);
    
    // DO NOT GENERATE FAKE DATA
    // If we don't have real market data, we should not trade
    return null;
  }
  
  /**
   * Convert symbol to CoinGecko ID
   */
  private convertToCoinGeckoId(symbol: string): string {
    const mapping = {
      'BTCUSD': 'bitcoin',
      'ETHUSD': 'ethereum',
      'ADAUSD': 'cardano',
      'DOTUSD': 'polkadot'
    };
    
    return mapping[symbol] || symbol.toLowerCase();
  }
  
  /**
   * Get rate limiting status
   */
  getRateLimitStatus(): any {
    const status = {};
    
    for (const [source, limiter] of this.rateLimiters.entries()) {
      const limit = this.RATE_LIMITS[source] || this.RATE_LIMITS.fallback;
      const remaining = Math.max(0, limit.requests - limiter.requestCount);
      const resetIn = Math.max(0, limiter.resetTime - Date.now());
      
      status[source] = {
        requestsUsed: limiter.requestCount,
        requestsRemaining: remaining,
        resetInMs: resetIn,
        canRequest: this.canMakeRequest(source)
      };
    }
    
    return status;
  }
}

export const rateLimitedMarketData = RateLimitedMarketDataService.getInstance();
export default RateLimitedMarketDataService;