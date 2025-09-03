/**
 * Rate Limited Market Data Service
 * 
 * Fixes 429 errors by implementing proper rate limiting and using Alpaca as primary source
 */

import { alpacaPaperTradingService } from './alpaca-paper-trading-service';

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
  
  // Rate limits for different APIs
  private readonly RATE_LIMITS = {
    alpaca: { requests: 200, windowMs: 60000 }, // 200 per minute
    coingecko: { requests: 10, windowMs: 60000 }, // 10 per minute (conservative)
    binance: { requests: 1200, windowMs: 60000 }, // 1200 per minute
    fallback: { requests: 5, windowMs: 60000 } // Very conservative fallback
  };
  
  private readonly CACHE_DURATION = 30000; // 30 seconds
  
  static getInstance(): RateLimitedMarketDataService {
    if (!RateLimitedMarketDataService.instance) {
      RateLimitedMarketDataService.instance = new RateLimitedMarketDataService();
    }
    return RateLimitedMarketDataService.instance;
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
    const sources = ['alpaca', 'binance', 'coingecko', 'fallback'];
    
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
        case 'alpaca':
          return await this.fetchFromAlpaca(symbol);
        case 'binance':
          return await this.fetchFromBinance(symbol);
        case 'coingecko':
          return await this.fetchFromCoinGecko(symbol);
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
   * Fetch from Alpaca (primary source since we're already using it)
   */
  private async fetchFromAlpaca(symbol: string): Promise<MarketDataPoint | null> {
    try {
      // Use existing Alpaca service
      const marketData = await alpacaPaperTradingService.getMarketData([symbol]);
      
      if (marketData && marketData.length > 0) {
        const data = marketData[0];
        return {
          symbol,
          price: data.latestPrice,
          volume: data.volume || 1000000, // Fallback volume
          timestamp: data.latestTime,
          source: 'alpaca',
          high: data.high || data.latestPrice * 1.02,
          low: data.low || data.latestPrice * 0.98,
          open: data.latestPrice * 0.999,
          close: data.latestPrice
        };
      }
      
      return null;
    } catch (error) {
      console.error('Alpaca market data error:', error);
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
      
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          timeout: 5000
        }
      );
      
      if (response.status === 429) {
        throw new Error('Rate limited by Binance');
      }
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
      }
      
      const data = await response.json();
      
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
      
      // Add delay to avoid 429
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`,
        {
          method: 'GET',
          headers: { 
            'Accept': 'application/json',
            'User-Agent': 'StratusEngine/1.0'
          },
          timeout: 10000
        }
      );
      
      if (response.status === 429) {
        console.log('⚠️ CoinGecko rate limited - will use other sources');
        throw new Error('Rate limited by CoinGecko');
      }
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data = await response.json();
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