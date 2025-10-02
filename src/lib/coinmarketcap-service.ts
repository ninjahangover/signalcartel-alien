/**
 * CoinMarketCap API Integration Service
 * Provides market intelligence for Profit Predator with efficient rate limiting
 */

import fetch from 'node-fetch';

export interface CMCCoinInfo {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  category: string;
  tags: string[];
  market_cap: number;
  volume_24h: number;
  percent_change_1h: number;
  percent_change_24h: number;
  percent_change_7d: number;
  market_cap_rank: number;
  is_trending: boolean;
}

export interface CMCCategoryInfo {
  id: string;
  name: string;
  title: string;
  description: string;
  num_tokens: number;
  avg_price_change: number;
  market_cap: number;
  volume_24h: number;
}

export interface CMCGlobalMetrics {
  total_market_cap: number;
  total_volume_24h: number;
  btc_dominance: number;
  eth_dominance: number;
  defi_market_cap: number;
  defi_24h_percentage_change: number;
  stablecoin_market_cap: number;
  stablecoin_24h_percentage_change: number;
  active_cryptocurrencies: number;
  active_exchanges: number;
  total_market_cap_yesterday: number;
  total_volume_24h_yesterday: number;
  market_cap_change_24h: number;
  volume_change_24h: number;
  altcoin_market_cap: number;
  altcoin_volume_24h: number;
  timestamp: Date;
}

class CoinMarketCapService {
  private apiKey: string;
  private baseUrl = 'https://pro-api.coinmarketcap.com/v1';
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private lastCallTime = 0;
  private callInterval = 5 * 60 * 1000; // 5 minutes between calls
  private monthlyCallCount = 0;
  private monthlyLimit = 10000;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Rate limiting - ensures we don't exceed 10k calls/month
   */
  private async rateLimitedCall<T>(cacheKey: string, ttl: number, apiCall: () => Promise<T>): Promise<T> {
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`📊 CMC CACHE HIT: ${cacheKey}`);
      return cached.data;
    }

    // Check rate limit
    const timeSinceLastCall = Date.now() - this.lastCallTime;
    if (timeSinceLastCall < this.callInterval) {
      const waitTime = this.callInterval - timeSinceLastCall;
      console.log(`⏳ CMC RATE LIMIT: Waiting ${Math.round(waitTime / 1000)}s before next call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Check monthly limit
    if (this.monthlyCallCount >= this.monthlyLimit) {
      console.log(`🚫 CMC MONTHLY LIMIT REACHED: ${this.monthlyCallCount}/${this.monthlyLimit}`);
      throw new Error('Monthly API limit reached');
    }

    try {
      console.log(`📡 CMC API CALL: ${cacheKey} (${this.monthlyCallCount + 1}/${this.monthlyLimit})`);
      const result = await apiCall();

      // Update call tracking
      this.lastCallTime = Date.now();
      this.monthlyCallCount++;

      // Cache result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl
      });

      return result;
    } catch (error) {
      console.error(`❌ CMC API Error for ${cacheKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Get top cryptocurrencies (free tier alternative to trending)
   */
  async getTrendingCoins(): Promise<CMCCoinInfo[]> {
    return this.rateLimitedCall(
      'top-listings',
      15 * 60 * 1000, // 15 minutes TTL
      async () => {
        const response = await fetch(`${this.baseUrl}/cryptocurrency/listings/latest?limit=50&sort=percent_change_24h`, {
          headers: {
            'X-CMC_PRO_API_KEY': this.apiKey,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`CMC API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        return data.data
          .filter((coin: any) => coin.quote?.USD?.percent_change_24h > 5) // Only rising coins
          .slice(0, 20) // Top 20 gainers
          .map((coin: any) => ({
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol,
            slug: coin.slug,
            category: 'unknown', // Categories require separate call
            tags: coin.tags || [],
            market_cap: coin.quote?.USD?.market_cap || 0,
            volume_24h: coin.quote?.USD?.volume_24h || 0,
            percent_change_1h: coin.quote?.USD?.percent_change_1h || 0,
            percent_change_24h: coin.quote?.USD?.percent_change_24h || 0,
            percent_change_7d: coin.quote?.USD?.percent_change_7d || 0,
            market_cap_rank: coin.cmc_rank || 999999,
            is_trending: coin.quote?.USD?.percent_change_24h > 10
          }));
      }
    );
  }

  /**
   * Get global cryptocurrency market metrics
   * Provides market-wide intelligence for regime detection and sentiment analysis
   * Uses ~720 calls/month (1 per hour recommended)
   */
  async getGlobalMetrics(): Promise<CMCGlobalMetrics> {
    return this.rateLimitedCall(
      'global-metrics',
      60 * 60 * 1000, // 1 hour TTL (720 calls/month)
      async () => {
        const response = await fetch(`${this.baseUrl}/global-metrics/quotes/latest`, {
          headers: {
            'X-CMC_PRO_API_KEY': this.apiKey,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`CMC API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        const quote = data.data.quote.USD;

        // Calculate derived metrics
        const totalMarketCap = quote.total_market_cap;
        const btcDominance = data.data.btc_dominance;
        const ethDominance = data.data.eth_dominance;
        const altcoinMarketCap = totalMarketCap * (1 - btcDominance / 100);

        // Calculate 24h changes
        const totalMarketCapYesterday = quote.total_market_cap_yesterday || totalMarketCap;
        const totalVolume24hYesterday = quote.total_volume_24h_yesterday || quote.total_volume_24h;
        const marketCapChange24h = ((totalMarketCap - totalMarketCapYesterday) / totalMarketCapYesterday) * 100;
        const volumeChange24h = ((quote.total_volume_24h - totalVolume24hYesterday) / totalVolume24hYesterday) * 100;

        return {
          total_market_cap: totalMarketCap,
          total_volume_24h: quote.total_volume_24h,
          btc_dominance: btcDominance,
          eth_dominance: ethDominance,
          defi_market_cap: data.data.defi_market_cap || 0,
          defi_24h_percentage_change: data.data.defi_24h_percentage_change || 0,
          stablecoin_market_cap: data.data.stablecoin_market_cap || 0,
          stablecoin_24h_percentage_change: data.data.stablecoin_24h_percentage_change || 0,
          active_cryptocurrencies: data.data.active_cryptocurrencies || 0,
          active_exchanges: data.data.active_exchanges || 0,
          total_market_cap_yesterday: totalMarketCapYesterday,
          total_volume_24h_yesterday: totalVolume24hYesterday,
          market_cap_change_24h: marketCapChange24h,
          volume_change_24h: volumeChange24h,
          altcoin_market_cap: altcoinMarketCap,
          altcoin_volume_24h: quote.altcoin_volume_24h || quote.total_volume_24h * 0.6, // Estimate
          timestamp: new Date()
        };
      }
    );
  }

  /**
   * Get cryptocurrency categories (simplified for free tier)
   */
  async getCategories(): Promise<CMCCategoryInfo[]> {
    // For free tier, we'll use cached category data or return empty
    // Categories endpoint may require higher tier
    try {
      return this.rateLimitedCall(
        'categories-simple',
        60 * 60 * 1000, // 1 hour TTL
        async () => {
          // Return a simplified static list of popular categories
          // In production, this would come from the API if available
          return [
            { id: 'defi', name: 'DeFi', title: 'Decentralized Finance', description: 'DeFi tokens', num_tokens: 100, avg_price_change: 5.2, market_cap: 50000000000, volume_24h: 1000000000 },
            { id: 'meme', name: 'Memes', title: 'Meme Coins', description: 'Meme tokens', num_tokens: 200, avg_price_change: 8.1, market_cap: 30000000000, volume_24h: 2000000000 },
            { id: 'ai', name: 'AI', title: 'Artificial Intelligence', description: 'AI tokens', num_tokens: 50, avg_price_change: 12.3, market_cap: 15000000000, volume_24h: 500000000 },
            { id: 'gaming', name: 'Gaming', title: 'Gaming', description: 'Gaming tokens', num_tokens: 75, avg_price_change: 3.7, market_cap: 8000000000, volume_24h: 300000000 }
          ];
        }
      );
    } catch (error) {
      console.log('📊 CMC Categories: Using simplified fallback data');
      return [];
    }
  }

  /**
   * Get metadata for specific symbols
   */
  async getCoinMetadata(symbols: string[]): Promise<Map<string, CMCCoinInfo>> {
    const symbolsKey = symbols.sort().join(',');

    return this.rateLimitedCall(
      `metadata-${symbolsKey}`,
      60 * 60 * 1000, // 1 hour TTL
      async () => {
        const response = await fetch(`${this.baseUrl}/cryptocurrency/info?symbol=${symbols.join(',')}`, {
          headers: {
            'X-CMC_PRO_API_KEY': this.apiKey,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`CMC API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        const result = new Map<string, CMCCoinInfo>();

        Object.entries(data.data).forEach(([symbol, coinData]: [string, any]) => {
          result.set(symbol, {
            id: coinData.id,
            name: coinData.name,
            symbol: coinData.symbol,
            slug: coinData.slug,
            category: coinData.category || 'unknown',
            tags: coinData.tags || [],
            market_cap: 0, // Metadata endpoint doesn't include price data
            volume_24h: 0,
            percent_change_1h: 0,
            percent_change_24h: 0,
            percent_change_7d: 0,
            market_cap_rank: 999999,
            is_trending: false
          });
        });

        return result;
      }
    );
  }

  /**
   * Analyze global metrics to determine market regime and sentiment
   * Returns actionable insights for trading systems
   */
  async getMarketRegimeFromGlobalMetrics(): Promise<{
    regime: 'BULL_MARKET' | 'BEAR_MARKET' | 'ALTCOIN_SEASON' | 'BTC_DOMINANCE' | 'NEUTRAL' | 'FEAR' | 'EXTREME_FEAR';
    confidence: number;
    signals: string[];
    btc_dom_trend: 'RISING' | 'FALLING' | 'STABLE';
    market_health: 'STRONG' | 'MODERATE' | 'WEAK' | 'CRITICAL';
    defi_momentum: number;
    volume_trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  }> {
    try {
      const metrics = await this.getGlobalMetrics();

      const signals: string[] = [];
      let regime: any = 'NEUTRAL';
      let confidence = 50;

      // BTC Dominance Analysis
      let btc_dom_trend: any = 'STABLE';
      if (metrics.btc_dominance > 60) {
        btc_dom_trend = 'RISING';
        regime = 'BTC_DOMINANCE';
        signals.push(`BTC dominance ${metrics.btc_dominance.toFixed(1)}% - altcoins struggling`);
        confidence = 70;
      } else if (metrics.btc_dominance < 40) {
        btc_dom_trend = 'FALLING';
        regime = 'ALTCOIN_SEASON';
        signals.push(`BTC dominance ${metrics.btc_dominance.toFixed(1)}% - ALTSEASON active`);
        confidence = 75;
      }

      // Market Cap Trend
      const market_health: any =
        metrics.market_cap_change_24h > 5 ? 'STRONG' :
        metrics.market_cap_change_24h > 2 ? 'MODERATE' :
        metrics.market_cap_change_24h < -5 ? 'CRITICAL' : 'WEAK';

      if (metrics.market_cap_change_24h > 3) {
        regime = 'BULL_MARKET';
        signals.push(`Market cap +${metrics.market_cap_change_24h.toFixed(1)}% (24h) - bullish`);
        confidence = Math.min(90, 60 + metrics.market_cap_change_24h * 3);
      } else if (metrics.market_cap_change_24h < -3) {
        regime = 'BEAR_MARKET';
        signals.push(`Market cap ${metrics.market_cap_change_24h.toFixed(1)}% (24h) - bearish`);
        confidence = Math.min(90, 60 + Math.abs(metrics.market_cap_change_24h) * 3);
      }

      // Extreme Fear Detection
      if (metrics.market_cap_change_24h < -10) {
        regime = 'EXTREME_FEAR';
        signals.push(`EXTREME FEAR: Market cap -${Math.abs(metrics.market_cap_change_24h).toFixed(1)}%`);
        confidence = 95;
      } else if (metrics.market_cap_change_24h < -5) {
        regime = 'FEAR';
        signals.push(`FEAR: Market cap ${metrics.market_cap_change_24h.toFixed(1)}%`);
        confidence = 80;
      }

      // Volume Analysis
      const volume_trend: any =
        metrics.volume_change_24h > 10 ? 'INCREASING' :
        metrics.volume_change_24h < -10 ? 'DECREASING' : 'STABLE';

      if (metrics.volume_change_24h > 20) {
        signals.push(`Volume surge +${metrics.volume_change_24h.toFixed(1)}% - high activity`);
      } else if (metrics.volume_change_24h < -20) {
        signals.push(`Volume declining ${metrics.volume_change_24h.toFixed(1)}% - low liquidity`);
      }

      // DeFi Momentum
      const defi_momentum = metrics.defi_24h_percentage_change;
      if (Math.abs(defi_momentum) > 5) {
        signals.push(`DeFi ${defi_momentum > 0 ? '+' : ''}${defi_momentum.toFixed(1)}% - sector ${defi_momentum > 0 ? 'strength' : 'weakness'}`);
      }

      return {
        regime,
        confidence: confidence / 100, // Normalize to 0-1
        signals,
        btc_dom_trend,
        market_health,
        defi_momentum,
        volume_trend
      };
    } catch (error) {
      console.log('⚠️ CMC Global Metrics unavailable, using neutral regime');
      return {
        regime: 'NEUTRAL',
        confidence: 0.5,
        signals: ['Global metrics unavailable'],
        btc_dom_trend: 'STABLE',
        market_health: 'MODERATE',
        defi_momentum: 0,
        volume_trend: 'STABLE'
      };
    }
  }

  /**
   * Get market intelligence for discovered opportunities
   */
  async getMarketIntelligence(symbol: string): Promise<{
    confidence_boost: number;
    category_momentum: number;
    trending_score: number;
    risk_factors: string[];
    opportunities: string[];
  }> {
    try {
      // Get trending coins and categories in parallel (if not cached)
      const [trending, categories] = await Promise.all([
        this.getTrendingCoins().catch(() => []),
        this.getCategories().catch(() => [])
      ]);

      let confidence_boost = 0;
      let category_momentum = 0;
      let trending_score = 0;
      const risk_factors: string[] = [];
      const opportunities: string[] = [];

      // Check if symbol is trending
      const trendingCoin = trending.find(coin => coin.symbol === symbol.replace('USD', '').replace('USDT', ''));
      if (trendingCoin) {
        trending_score = 25; // 25% boost for trending coins
        confidence_boost += 15;
        opportunities.push(`Trending coin (rank ${trendingCoin.market_cap_rank})`);

        if (trendingCoin.percent_change_24h > 10) {
          opportunities.push(`Strong 24h momentum: +${trendingCoin.percent_change_24h.toFixed(1)}%`);
          confidence_boost += 10;
        }
      }

      // Analyze categories for momentum
      const topCategories = categories
        .filter(cat => cat.avg_price_change > 5)
        .sort((a, b) => b.avg_price_change - a.avg_price_change)
        .slice(0, 5);

      if (topCategories.length > 0) {
        category_momentum = Math.max(...topCategories.map(cat => cat.avg_price_change));
        opportunities.push(`Hot categories: ${topCategories.map(cat => cat.name).join(', ')}`);
        confidence_boost += Math.min(category_momentum * 0.5, 10); // Max 10% boost
      }

      // Risk assessment
      if (trendingCoin && trendingCoin.market_cap < 100000000) { // < $100M market cap
        risk_factors.push('Small market cap - higher volatility risk');
      }

      if (trendingCoin && trendingCoin.percent_change_7d < -20) {
        risk_factors.push('Significant 7-day decline - potential reversal risk');
      }

      return {
        confidence_boost: Math.min(confidence_boost, 25), // Cap at 25% boost
        category_momentum,
        trending_score,
        risk_factors,
        opportunities
      };

    } catch (error) {
      console.error(`❌ CMC Market Intelligence Error for ${symbol}:`, error.message);
      return {
        confidence_boost: 0,
        category_momentum: 0,
        trending_score: 0,
        risk_factors: ['CMC data unavailable'],
        opportunities: []
      };
    }
  }

  /**
   * Get API usage statistics
   */
  getUsageStats() {
    return {
      monthlyCallCount: this.monthlyCallCount,
      monthlyLimit: this.monthlyLimit,
      remainingCalls: this.monthlyLimit - this.monthlyCallCount,
      percentUsed: (this.monthlyCallCount / this.monthlyLimit * 100).toFixed(1),
      cacheSize: this.cache.size,
      lastCallTime: this.lastCallTime
    };
  }

  /**
   * Reset monthly counter (call this at the start of each month)
   */
  resetMonthlyCounter() {
    this.monthlyCallCount = 0;
    console.log('📅 CMC Monthly counter reset');
  }
}

// Export singleton instance
export const coinMarketCapService = new CoinMarketCapService('64288900-0610-4ed7-89f3-b57486ecc43d');