/**
 * External API Proxy Service
 * Handles rate limiting and proper API access for all external data sources
 * Ensures CFT compliance while maintaining full AI functionality
 */

import axios, { AxiosInstance } from 'axios';
import chalk from 'chalk';

interface PriceData {
  symbol: string;
  price: number;
  volume?: number;
  change24h?: number;
  timestamp: number;
}

interface SentimentData {
  symbol: string;
  sentiment: number;
  confidence: number;
  keywords: string[];
  socialTrend: 'bullish' | 'bearish' | 'neutral';
  timestamp: number;
}

class RateLimiter {
  private lastCall: number = 0;
  private minInterval: number;

  constructor(requestsPerSecond: number) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCall;

    if (elapsed < this.minInterval) {
      const delay = this.minInterval - elapsed;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastCall = Date.now();
  }
}

export class ExternalAPIProxy {
  private binanceClient: AxiosInstance;
  private coinGeckoClient: AxiosInstance;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 30000; // 30 seconds cache

  // Rate limiters for different APIs
  private binanceRateLimit = new RateLimiter(10); // 10 req/sec for Binance
  private coinGeckoRateLimit = new RateLimiter(0.5); // 0.5 req/sec for CoinGecko

  constructor() {
    // Binance API client
    this.binanceClient = axios.create({
      baseURL: 'https://api.binance.com/api/v3',
      timeout: 5000,
      headers: {
        'User-Agent': 'CFT-SignalCartel-Proxy/1.0'
      }
    });

    // CoinGecko API client
    this.coinGeckoClient = axios.create({
      baseURL: 'https://api.coingecko.com/api/v3',
      timeout: 10000,
      headers: {
        'User-Agent': 'CFT-SignalCartel-Proxy/1.0'
      }
    });

    console.log(chalk.green('🌐 External API Proxy initialized'));
    console.log(chalk.dim('📊 Rate limiting enabled for all external APIs'));
  }

  /**
   * Get cached data or fetch new data
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * Store data in cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get market price data for AI components
   */
  async getMarketPrice(symbol: string): Promise<PriceData | null> {
    const cacheKey = `price_${symbol}`;
    const cached = this.getCached<PriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Convert symbols to Binance format
      const binanceSymbol = this.convertToBinanceSymbol(symbol);

      await this.binanceRateLimit.throttle();

      const response = await this.binanceClient.get('/ticker/24hr', {
        params: { symbol: binanceSymbol }
      });

      const data = response.data;
      const priceData: PriceData = {
        symbol,
        price: parseFloat(data.lastPrice),
        volume: parseFloat(data.volume),
        change24h: parseFloat(data.priceChangePercent),
        timestamp: Date.now()
      };

      this.setCache(cacheKey, priceData);
      return priceData;

    } catch (error) {
      console.error(chalk.red(`Failed to fetch price for ${symbol}:`), error.message);
      return null;
    }
  }

  /**
   * Get sentiment data for AI components
   */
  async getSentimentData(symbol: string): Promise<SentimentData | null> {
    const cacheKey = `sentiment_${symbol}`;
    const cached = this.getCached<SentimentData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get basic crypto info from CoinGecko
      const coinId = this.convertToCoinGeckoId(symbol);

      await this.coinGeckoRateLimit.throttle();

      const response = await this.coinGeckoClient.get(`/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: true,
          developer_data: false,
          sparkline: false
        }
      });

      const data = response.data;

      // Calculate sentiment based on available data
      const sentiment = this.calculateSentimentScore(data);

      const sentimentData: SentimentData = {
        symbol,
        sentiment: sentiment.score,
        confidence: sentiment.confidence,
        keywords: sentiment.keywords,
        socialTrend: sentiment.trend,
        timestamp: Date.now()
      };

      this.setCache(cacheKey, sentimentData);
      return sentimentData;

    } catch (error) {
      console.error(chalk.red(`Failed to fetch sentiment for ${symbol}:`), error.message);

      // Return neutral sentiment as fallback (not fake data, just neutral)
      return {
        symbol,
        sentiment: 0.5,
        confidence: 0.3,
        keywords: [],
        socialTrend: 'neutral',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get multiple market prices efficiently
   */
  async getMultipleMarketPrices(symbols: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();

    // Process symbols in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);

      const promises = batch.map(async (symbol) => {
        const data = await this.getMarketPrice(symbol);
        if (data) {
          results.set(symbol, data);
        }
      });

      await Promise.all(promises);

      // Small delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  /**
   * Convert symbol to Binance format
   */
  private convertToBinanceSymbol(symbol: string): string {
    // Most symbols are already compatible
    return symbol;
  }

  /**
   * Convert symbol to CoinGecko coin ID
   */
  private convertToCoinGeckoId(symbol: string): string {
    const mapping: { [key: string]: string } = {
      'BTCUSDT': 'bitcoin',
      'ETHUSDT': 'ethereum',
      'BNBUSDT': 'binancecoin',
      'SOLUSDT': 'solana',
      'AVAXUSDT': 'avalanche-2',
      'DOTUSDT': 'polkadot',
      'ADAUSDT': 'cardano',
      'XRPUSDT': 'ripple',
      'LINKUSDT': 'chainlink',
      'UNIUSDT': 'uniswap'
    };

    return mapping[symbol] || 'bitcoin'; // Default to bitcoin
  }

  /**
   * Calculate sentiment score from CoinGecko data
   */
  private calculateSentimentScore(data: any): {
    score: number;
    confidence: number;
    keywords: string[];
    trend: 'bullish' | 'bearish' | 'neutral';
  } {
    let score = 0.5; // Start neutral
    let confidence = 0.5;
    const keywords: string[] = [];

    try {
      const marketData = data.market_data;
      const communityData = data.community_data;

      // Price change indicators
      if (marketData) {
        const change24h = marketData.price_change_percentage_24h;
        const change7d = marketData.price_change_percentage_7d;

        if (change24h > 5) {
          score += 0.2;
          keywords.push('strong_rally');
        } else if (change24h < -5) {
          score -= 0.2;
          keywords.push('strong_decline');
        }

        if (change7d > 10) {
          score += 0.15;
          keywords.push('weekly_uptrend');
        } else if (change7d < -10) {
          score -= 0.15;
          keywords.push('weekly_downtrend');
        }

        confidence += 0.2;
      }

      // Community indicators
      if (communityData) {
        const twitterFollowers = communityData.twitter_followers;
        const redditSubscribers = communityData.reddit_subscribers;

        // Strong community presence = slight bullish bias
        if (twitterFollowers > 1000000 || redditSubscribers > 100000) {
          score += 0.05;
          keywords.push('strong_community');
          confidence += 0.1;
        }
      }

      // Market cap rank influence
      if (data.market_cap_rank <= 10) {
        score += 0.05; // Top 10 coins get slight bullish bias
        keywords.push('top_tier');
        confidence += 0.1;
      }

    } catch (error) {
      console.error(chalk.yellow('Error calculating sentiment:'), error.message);
    }

    // Clamp values
    score = Math.max(0, Math.min(1, score));
    confidence = Math.max(0.3, Math.min(0.9, confidence));

    // Determine trend
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (score > 0.6) trend = 'bullish';
    else if (score < 0.4) trend = 'bearish';

    return { score, confidence, keywords, trend };
  }

  /**
   * Health check for all external APIs
   */
  async healthCheck(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};

    // Test Binance API
    try {
      await this.binanceRateLimit.throttle();
      const response = await this.binanceClient.get('/ping');
      results.binance = response.status === 200;
    } catch (error) {
      results.binance = false;
    }

    // Test CoinGecko API
    try {
      await this.coinGeckoRateLimit.throttle();
      const response = await this.coinGeckoClient.get('/ping');
      results.coingecko = response.status === 200;
    } catch (error) {
      results.coingecko = false;
    }

    return results;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log(chalk.dim('🗑️ API proxy cache cleared'));
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance for the entire CFT system
export const externalAPIProxy = new ExternalAPIProxy();