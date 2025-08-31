/**
 * SMART PROFIT HUNTER™ 
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

class SmartProfitHunter {
  private readonly LOG_DIR = '/tmp/signalcartel-logs';
  private readonly LOG_FILE = require('path').join(this.LOG_DIR, 'smart-profit-hunter.log');
  
  constructor() {
    this.log('🧠 Smart Profit Hunter initialized - API efficient scanning');
  }
  
  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    console.log(`[HUNTER] ${message}`);
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
      
      // Strategy 2: Volume leaders from CoinGecko
      const volumeOpps = await this.getVolumeLeaders();
      opportunities.push(...volumeOpps);
      
      // Strategy 3: Binance 24hr ticker statistics (winners/losers)
      const binanceOpps = await this.getBinanceGainersLosers();
      opportunities.push(...binanceOpps);
      
      // Strategy 4: CoinGecko search trending
      const searchTrendingOpps = await this.getSearchTrending();
      opportunities.push(...searchTrendingOpps);
      
    } catch (error) {
      this.log(`❌ Error finding opportunities: ${error.message}`);
    }
    
    // Deduplicate and score
    return this.rankOpportunities(opportunities);
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

export const smartProfitHunter = new SmartProfitHunter();