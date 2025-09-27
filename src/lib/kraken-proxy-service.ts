/**
 * KRAKEN PROXY SERVICE™
 * Provides a unified interface for Kraken market data
 * Compatible with existing trading system requirements
 */

import { krakenRealTimeService } from './kraken-real-time-service';
import { priceLogger } from './price-logger';

export interface TickerData {
  symbol: string;
  price: string;
  bid: string;
  ask: string;
  volume: string;
  high: string;
  low: string;
  priceChangePercent?: string;
  timestamp: Date;
}

class KrakenProxyService {
  private static instance: KrakenProxyService;
  private tickerCache: Map<string, TickerData> = new Map();
  private lastCacheUpdate = 0;
  private cacheValidityMs = 5000; // 5 seconds

  private constructor() {}

  static getInstance(): KrakenProxyService {
    if (!this.instance) {
      this.instance = new KrakenProxyService();
    }
    return this.instance;
  }

  /**
   * Get ticker data for a specific symbol
   */
  async getTicker(symbol: string): Promise<TickerData> {
    try {
      priceLogger.info(`📊 Getting ticker for ${symbol}...`);

      const priceData = await krakenRealTimeService.getRealTimePrice(symbol);

      if (!priceData) {
        throw new Error(`No price data available for ${symbol}`);
      }

      const ticker: TickerData = {
        symbol,
        price: priceData.price.toString(),
        bid: priceData.bid.toString(),
        ask: priceData.ask.toString(),
        volume: priceData.volume24h.toString(),
        high: priceData.high24h.toString(),
        low: priceData.low24h.toString(),
        timestamp: priceData.timestamp
      };

      // Calculate price change if we have cached data
      const cached = this.tickerCache.get(symbol);
      if (cached) {
        const oldPrice = parseFloat(cached.price);
        const newPrice = parseFloat(ticker.price);
        const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;
        ticker.priceChangePercent = changePercent.toFixed(4);
      }

      // Update cache
      this.tickerCache.set(symbol, ticker);

      priceLogger.success(`✅ Got ticker for ${symbol}: $${ticker.price}`);
      return ticker;

    } catch (error) {
      priceLogger.error(`❌ Failed to get ticker for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get 24hr ticker data for all USD pairs
   */
  async get24hrTickers(): Promise<TickerData[]> {
    try {
      priceLogger.info(`📊 Getting 24hr tickers for all USD pairs...`);

      // Common USD trading pairs on Kraken
      const commonUsdPairs = [
        'BTCUSD', 'ETHUSD', 'SOLUSD', 'ADAUSD', 'DOTUSD', 'LINKUSD',
        'AVAXUSD', 'MATICUSD', 'ATOMUSD', 'ALGOUSD', 'XTZUSD', 'FILUSD',
        'SANDUSD', 'MANAUSD', 'ENJUSD', 'CHZUSD', 'GRTUSD', 'LRCUSD',
        'BNBUSD', 'TRXUSD', 'XLMUSD', 'XRPUSD', 'LTCUSD', 'BCHUSD',
        'DASHUSD', 'ZECUSD', 'XMRUSD', 'ETCUSD', 'FETUSD', 'OPUSD',
        'ARBUSD', 'NEARUSD', 'FLOWUSD', 'ICPUSD', 'APTUSD', 'YFIUSD',
        'UNIUSD', 'AAVEUSD', 'SNXUSD', 'COMPUSD', 'MKRUSD', 'CRPUSD',
        'BATUSD', 'ZRXUSD', 'RLCUSD', 'MLNUSD', 'STORJUSD', 'GNTUSD'
      ];

      const tickers: TickerData[] = [];
      const batchSize = 5; // Process in batches to avoid rate limiting

      for (let i = 0; i < commonUsdPairs.length; i += batchSize) {
        const batch = commonUsdPairs.slice(i, i + batchSize);

        const batchPromises = batch.map(async (symbol) => {
          try {
            return await this.getTicker(symbol);
          } catch (error) {
            // Skip pairs that don't exist or have issues
            priceLogger.warn(`⏭️ Skipping ${symbol}: ${error.message}`);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);

        // Add successful results
        batchResults.forEach(result => {
          if (result) {
            tickers.push(result);
          }
        });

        // Small delay between batches
        if (i + batchSize < commonUsdPairs.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Sort by volume (highest first)
      tickers.sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume));

      priceLogger.success(`✅ Got ${tickers.length} tickers`);
      return tickers;

    } catch (error) {
      priceLogger.error(`❌ Failed to get 24hr tickers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear ticker cache
   */
  clearCache(): void {
    this.tickerCache.clear();
    this.lastCacheUpdate = 0;
    priceLogger.info(`🧹 Ticker cache cleared`);
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { size: number; lastUpdate: number; age: number } {
    return {
      size: this.tickerCache.size,
      lastUpdate: this.lastCacheUpdate,
      age: Date.now() - this.lastCacheUpdate
    };
  }
}

export const krakenProxyService = KrakenProxyService.getInstance();