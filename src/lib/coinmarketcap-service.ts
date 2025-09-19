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