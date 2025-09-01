/**
 * PROFIT PREDATOR™ 
 * The badass profit hunting machine that devours the most profitable opportunities
 * Uses efficient APIs to find "most profitable", "highest volume", "best performance" 
 * pairs without scanning all 564 individually
 */

export interface ProfitableOpportunity {
  symbol: string;
  source: 'VOLUME' | 'GAINERS' | 'MOMENTUM' | 'TRENDING';
  score: number;
  confidence: number;
  reasons: string[];
  metrics: {
    volume24h?: number;
    priceChange24h?: number;
    priceChange7d?: number;
    momentum?: number;
    volatility?: number;
  };
  alertTime: Date;
}

class ProfitPredator {
  private readonly LOG_DIR = '/tmp/signalcartel-logs';
  private readonly LOG_FILE = require('path').join(this.LOG_DIR, 'profit-predator.log');
  
  constructor() {
    this.log('🐅 PROFIT PREDATOR™ initialized - Badass profit hunting machine');
  }
  
  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    console.log(`[PREDATOR] ${message}`);
    require('fs').appendFileSync(this.LOG_FILE, logEntry);
  }
  
  /**
   * Find profitable opportunities using smart APIs
   */
  async findProfitableOpportunities(): Promise<ProfitableOpportunity[]> {
    const opportunities: ProfitableOpportunity[] = [];
    
    try {
      // Strategy 1: CoinGecko trending coins (pre-filtered hot pairs)
      const trendingOpps = await this.getTrendingCoins();
      opportunities.push(...trendingOpps);
      
      // Rate limit protection: wait 3 seconds between CoinGecko calls
      this.log('⏳ Rate limit protection: waiting 3000ms before volume leaders...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Strategy 2: Volume leaders from CoinGecko
      const volumeOpps = await this.getVolumeLeaders();
      opportunities.push(...volumeOpps);
      
      // Rate limit protection: wait 3 seconds between CoinGecko calls
      this.log('⏳ Rate limit protection: waiting 3000ms before top gainers...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Strategy 3: Top gainers by 24h percentage (CoinGecko)
      const gainersOpps = await this.getTopGainers();
      opportunities.push(...gainersOpps);
      
      // Rate limit protection: wait 3 seconds between CoinGecko calls
      this.log('⏳ Rate limit protection: waiting 3000ms before top performers...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Strategy 4: Top performers by market cap + performance combo
      const performersOpps = await this.getTopPerformers();
      opportunities.push(...performersOpps);
      
      // Rate limit protection: wait 2 seconds before switching to Binance
      this.log('⏳ Rate limit protection: waiting 2000ms before Binance...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Strategy 5: Binance 24hr ticker statistics (winners/losers)
      const binanceOpps = await this.getBinanceGainersLosers();
      opportunities.push(...binanceOpps);
      
    } catch (error) {
      this.log(`❌ Error finding opportunities: ${error.message}`);
    }
    
    // Deduplicate and score
    return this.rankOpportunities(opportunities);
  }
  
  /**
   * Get most profitable opportunities (highest % gains)
   */
  private async getMostProfitable(): Promise<ProfitableOpportunity[]> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h', {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`CoinGecko most profitable failed: ${response.status}`);
      }
      
      const data = await response.json();
      return this.processOpportunities(data, 'PROFIT', 'Most profitable by 24h gains');
      
    } catch (error) {
      this.log(`❌ Most profitable error: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get highest volume opportunities 
   */
  private async getHighestVolume(): Promise<ProfitableOpportunity[]> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h', {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`CoinGecko highest volume failed: ${response.status}`);
      }
      
      const data = await response.json();
      return this.processOpportunities(data, 'VOLUME', 'Highest trading volume');
      
    } catch (error) {
      this.log(`❌ Highest volume error: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get top 10 market cap opportunities
   */
  private async getTop10MarketCap(): Promise<ProfitableOpportunity[]> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h', {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`CoinGecko top 10 failed: ${response.status}`);
      }
      
      const data = await response.json();
      return this.processOpportunities(data, 'TOP10', 'Top 10 by market cap');
      
    } catch (error) {
      this.log(`❌ Top 10 error: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get most increased value opportunities (price appreciation)
   */
  private async getMostIncreasedValue(): Promise<ProfitableOpportunity[]> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=15&page=1&sparkline=false&price_change_percentage=24h,7d', {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`CoinGecko most increased failed: ${response.status}`);
      }
      
      const data = await response.json();
      // Filter for substantial price increases (>5%)
      const filtered = data.filter((coin: any) => (coin.price_change_percentage_24h || 0) > 5);
      return this.processOpportunities(filtered.slice(0, 8), 'VALUE', 'Most increased value');
      
    } catch (error) {
      this.log(`❌ Most increased value error: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Process opportunities from CoinGecko data
   */
  private processOpportunities(data: any[], source: string, description: string): ProfitableOpportunity[] {
    const opportunities: ProfitableOpportunity[] = [];
    
    data.slice(0, 8).forEach((coin: any, index: number) => {
      const symbol = this.convertToKrakenSymbol(coin.symbol);
      if (symbol) {
        const priceChange24h = coin.price_change_percentage_24h || 0;
        const volume24h = coin.total_volume || 0;
        const marketCap = coin.market_cap || 0;
        
        // Source-based scoring
        const sourceBonus = this.getSourceBonus(source);
        const performanceScore = Math.abs(priceChange24h) * 2;
        const volumeScore = Math.log(volume24h) / 10;
        const baseScore = 75 + sourceBonus + performanceScore + volumeScore - (index * 2);
        
        opportunities.push({
          symbol,
          source,
          score: Math.min(Math.max(baseScore, 65), 95),
          confidence: 0.75 + (Math.abs(priceChange24h) > 8 ? 0.15 : 0) + (index < 3 ? 0.05 : 0),
          reasons: [
            `#${index + 1} ${description}`,
            `24h change: ${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(2)}%`,
            `Volume: $${this.formatNumber(volume24h)}`,
            `Market cap: $${this.formatNumber(marketCap)}`
          ],
          metrics: {
            priceChange24h,
            volume24h,
            momentum: priceChange24h / 100,
            volatility: Math.abs(priceChange24h) / 100
          },
          alertTime: new Date()
        });
      }
    });
    
    this.log(`💎 Found ${opportunities.length} ${description} opportunities`);
    return opportunities;
  }
  
  /**
   * Get source bonus points for scoring
   */
  private getSourceBonus(source: string): number {
    const bonuses: { [key: string]: number } = {
      'PROFIT': 15,    // High profit = high priority
      'VOLUME': 12,    // Volume = liquidity
      'TOP10': 8,      // Stability bonus
      'VALUE': 18      // Value appreciation = momentum
    };
    return bonuses[source] || 5;
  }

  /**
   * Get trending coins from CoinGecko (API efficient - single call)
   */
  private async getTrendingCoins(): Promise<ProfitableOpportunity[]> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/search/trending', {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`CoinGecko trending failed: ${response.status}`);
      }
      
      const data = await response.json();
      const opportunities: ProfitableOpportunity[] = [];
      
      // Process trending coins (top 7)
      data.coins?.slice(0, 7).forEach((coin: any, index: number) => {
        const symbol = this.convertToKrakenSymbol(coin.item.symbol);
        if (symbol) {
          opportunities.push({
            symbol,
            source: 'TRENDING',
            score: 85 - (index * 5), // Higher score for higher rank
            confidence: 0.75 - (index * 0.05),
            reasons: [`#${index + 1} trending on CoinGecko`, `Market cap rank: ${coin.item.market_cap_rank || 'N/A'}`],
            metrics: {
              momentum: 0.8 - (index * 0.1)
            },
            alertTime: new Date()
          });
        }
      });
      
      this.log(`📈 Found ${opportunities.length} trending opportunities from CoinGecko`);
      return opportunities;
      
    } catch (error) {
      this.log(`❌ Trending coins error: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get volume leaders (API efficient - single call)
   */
  private async getVolumeLeaders(): Promise<ProfitableOpportunity[]> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=10&page=1', {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`CoinGecko volume leaders failed: ${response.status}`);
      }
      
      const data = await response.json();
      const opportunities: ProfitableOpportunity[] = [];
      
      data.slice(0, 8).forEach((coin: any, index: number) => {
        const symbol = this.convertToKrakenSymbol(coin.symbol);
        if (symbol) {
          const priceChange24h = coin.price_change_percentage_24h || 0;
          const volume24h = coin.total_volume || 0;
          
          opportunities.push({
            symbol,
            source: 'VOLUME',
            score: 80 + (priceChange24h > 0 ? 10 : -5) - (index * 2),
            confidence: 0.70 + (Math.abs(priceChange24h) > 5 ? 0.15 : 0),
            reasons: [
              `Top ${index + 1} by volume`,
              `24h volume: $${this.formatNumber(volume24h)}`,
              `24h change: ${priceChange24h.toFixed(2)}%`
            ],
            metrics: {
              volume24h,
              priceChange24h,
              volatility: Math.abs(priceChange24h) / 100
            },
            alertTime: new Date()
          });
        }
      });
      
      this.log(`💰 Found ${opportunities.length} volume leader opportunities`);
      return opportunities;
      
    } catch (error) {
      this.log(`❌ Volume leaders error: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get top gainers by 24h percentage (CoinGecko)
   */
  private async getTopGainers(): Promise<ProfitableOpportunity[]> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=10&page=1', {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`CoinGecko top gainers failed: ${response.status}`);
      }
      
      const data = await response.json();
      const opportunities: ProfitableOpportunity[] = [];
      
      data.slice(0, 10).forEach((coin: any, index: number) => {
        const symbol = this.convertToKrakenSymbol(coin.symbol);
        if (symbol) {
          const priceChange24h = coin.price_change_percentage_24h || 0;
          const volume24h = coin.total_volume || 0;
          const marketCap = coin.market_cap || 0;
          
          opportunities.push({
            symbol,
            source: 'GAINERS',
            score: 90 + (priceChange24h > 10 ? 10 : 0) - (index * 2),
            confidence: 0.80 + (priceChange24h > 15 ? 0.15 : 0),
            reasons: [
              `#${index + 1} top gainer`,
              `24h gain: +${priceChange24h.toFixed(2)}%`,
              `Volume: $${this.formatNumber(volume24h)}`
            ],
            metrics: {
              priceChange24h,
              volume24h,
              momentum: Math.min(priceChange24h / 10, 2)
            },
            alertTime: new Date()
          });
        }
      });
      
      this.log(`🚀 Found ${opportunities.length} top gainer opportunities`);
      return opportunities;
      
    } catch (error) {
      this.log(`❌ Top gainers error: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get top performers (market cap + performance combo)
   */
  private async getTopPerformers(): Promise<ProfitableOpportunity[]> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h,7d', {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`CoinGecko top performers failed: ${response.status}`);
      }
      
      const data = await response.json();
      const opportunities: ProfitableOpportunity[] = [];
      
      // Filter for top 50 by market cap, then rank by performance
      const performers = data
        .filter((coin: any) => coin.price_change_percentage_24h > 2) // Positive performers
        .sort((a: any, b: any) => {
          // Score = (24h % + 7d % / 7) * volume factor
          const scoreA = (a.price_change_percentage_24h + (a.price_change_percentage_7d || 0) / 7) * Math.log(a.total_volume || 1);
          const scoreB = (b.price_change_percentage_24h + (b.price_change_percentage_7d || 0) / 7) * Math.log(b.total_volume || 1);
          return scoreB - scoreA;
        })
        .slice(0, 8);
      
      performers.forEach((coin: any, index: number) => {
        const symbol = this.convertToKrakenSymbol(coin.symbol);
        if (symbol) {
          const priceChange24h = coin.price_change_percentage_24h || 0;
          const priceChange7d = coin.price_change_percentage_7d || 0;
          const volume24h = coin.total_volume || 0;
          const marketCap = coin.market_cap || 0;
          
          opportunities.push({
            symbol,
            source: 'MOMENTUM',
            score: 85 - (index * 2) + (priceChange24h > 5 ? 5 : 0),
            confidence: 0.75 + (priceChange24h > 5 && priceChange7d > 0 ? 0.15 : 0),
            reasons: [
              `Top performer #${index + 1}`,
              `24h: +${priceChange24h.toFixed(2)}%, 7d: +${priceChange7d.toFixed(2)}%`,
              `Market cap rank: ${coin.market_cap_rank}`
            ],
            metrics: {
              priceChange24h,
              priceChange7d,
              volume24h,
              momentum: (priceChange24h + priceChange7d / 7) / 10
            },
            alertTime: new Date()
          });
        }
      });
      
      this.log(`⭐ Found ${opportunities.length} top performer opportunities`);
      return opportunities;
      
    } catch (error) {
      this.log(`❌ Top performers error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get Binance 24hr ticker statistics (winners/losers)
   */
  private async getBinanceGainersLosers(): Promise<ProfitableOpportunity[]> {
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Binance 24hr ticker failed: ${response.status}`);
      }
      
      const data = await response.json();
      const opportunities: ProfitableOpportunity[] = [];
      
      // Filter for USD/USDT pairs and sort by price change
      const relevantPairs = data
        .filter((ticker: any) => 
          (ticker.symbol.endsWith('USDT') || ticker.symbol.endsWith('USD')) &&
          Math.abs(parseFloat(ticker.priceChangePercent)) > 3 // Significant moves
        )
        .sort((a: any, b: any) => Math.abs(parseFloat(b.priceChangePercent)) - Math.abs(parseFloat(a.priceChangePercent)))
        .slice(0, 10); // Top 10 movers
      
      relevantPairs.forEach((ticker: any, index: number) => {
        const symbol = this.convertBinanceToKraken(ticker.symbol);
        if (symbol) {
          const priceChangePercent = parseFloat(ticker.priceChangePercent);
          const volume = parseFloat(ticker.volume);
          const isGainer = priceChangePercent > 0;
          
          opportunities.push({
            symbol,
            source: 'GAINERS',
            score: 75 + (Math.abs(priceChangePercent) * 2) - (index * 3),
            confidence: 0.65 + (Math.abs(priceChangePercent) > 8 ? 0.2 : 0.1),
            reasons: [
              `${isGainer ? 'Top gainer' : 'Big mover'}: ${priceChangePercent.toFixed(2)}%`,
              `24h volume: ${this.formatNumber(volume)}`,
              `High volatility opportunity`
            ],
            metrics: {
              priceChange24h: priceChangePercent,
              volume24h: volume,
              momentum: priceChangePercent / 100,
              volatility: Math.abs(priceChangePercent) / 100
            },
            alertTime: new Date()
          });
        }
      });
      
      this.log(`🚀 Found ${opportunities.length} Binance mover opportunities`);
      return opportunities;
      
    } catch (error) {
      this.log(`❌ Binance gainers/losers error: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get search trending (social sentiment)
   */
  private async getSearchTrending(): Promise<ProfitableOpportunity[]> {
    try {
      // This would normally use trending search queries, but for now use a simplified approach
      const popularCoins = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX'];
      const opportunities: ProfitableOpportunity[] = [];
      
      popularCoins.forEach((coin, index) => {
        const symbol = this.convertToKrakenSymbol(coin);
        if (symbol) {
          opportunities.push({
            symbol,
            source: 'TRENDING',
            score: 70 - (index * 5),
            confidence: 0.60,
            reasons: ['High search volume', 'Social media buzz', 'Market attention'],
            metrics: {
              momentum: 0.6 - (index * 0.05)
            },
            alertTime: new Date()
          });
        }
      });
      
      return opportunities;
      
    } catch (error) {
      this.log(`❌ Search trending error: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Rank and deduplicate opportunities
   */
  private rankOpportunities(opportunities: ProfitableOpportunity[]): ProfitableOpportunity[] {
    // Deduplicate by symbol
    const uniqueOpps = new Map<string, ProfitableOpportunity>();
    
    opportunities.forEach(opp => {
      const existing = uniqueOpps.get(opp.symbol);
      if (!existing || opp.score > existing.score) {
        // If multiple sources mention same symbol, combine reasons
        if (existing) {
          opp.reasons = [...existing.reasons, ...opp.reasons];
          opp.score = Math.max(opp.score, existing.score) + 5; // Boost for multiple mentions
        }
        uniqueOpps.set(opp.symbol, opp);
      }
    });
    
    // Sort by score and return top opportunities
    return Array.from(uniqueOpps.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 15); // Top 15 opportunities
  }
  
  /**
   * Convert various symbol formats to Kraken format
   */
  private convertToKrakenSymbol(symbol: string): string | null {
    const symbolMap: { [key: string]: string } = {
      'BTC': 'BTCUSD',
      'ETH': 'ETHUSD', 
      'SOL': 'SOLUSD',
      'ADA': 'ADAUSD',
      'DOT': 'DOTUSD',
      'AVAX': 'AVAXUSD',
      'LINK': 'LINKUSD',
      'UNI': 'UNIUSD',
      'AAVE': 'AAVEUSD',
      'MATIC': 'MATICUSD',
      'ALGO': 'ALGOUSD',
      'ATOM': 'ATOMUSD',
      'XRP': 'XRPUSD'
    };
    
    const upperSymbol = symbol.toUpperCase();
    return symbolMap[upperSymbol] || `${upperSymbol}USD`;
  }
  
  /**
   * Convert Binance symbols to Kraken format
   */
  private convertBinanceToKraken(binanceSymbol: string): string | null {
    if (binanceSymbol.endsWith('USDT')) {
      const base = binanceSymbol.replace('USDT', '');
      return `${base}USDT`; // Keep USDT pairs as-is
    }
    
    if (binanceSymbol.endsWith('USD')) {
      return binanceSymbol; // Already correct format
    }
    
    return null;
  }
  
  /**
   * Format large numbers
   */
  private formatNumber(num: number): string {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toFixed(0);
  }
}

export const profitPredator = new ProfitPredator();

// Legacy export for compatibility
export const smartProfitHunter = profitPredator;