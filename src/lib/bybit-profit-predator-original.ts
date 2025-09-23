/**
 * ByBit Profit Predator - Original Architecture Adapted
 *
 * Clean, reliable profit predator using the original proven architecture
 * Adapted for ByBit API and CFT compliance
 * NO over-engineering, NO excessive complexity
 */

import { ByBitDualClient } from './bybit-dual-client';
import { ByBitPositionManager } from './bybit-position-manager';
import { sharedMarketDataCache } from './shared-market-data-cache';

export interface ProfitHunt {
  symbol: string;
  huntType: 'volume_spike' | 'price_break' | 'sentiment_bomb' | 'momentum';
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  expectedReturn: number;
  maxDownside: number;
  signalStrength: number;
  expectancyRatio: number;
  probabilityOfProfit: number;
  uniquenessScore: number;
  maxHoldMinutes: number;
  urgency: 'low' | 'medium' | 'high';
}

export interface HuntResult {
  huntId: string;
  success: boolean;
  actualReturn?: number;
  exitReason: string;
  holdTimeMinutes: number;
  learningData: any;
}

interface MarketDataPoint {
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  timestamp: Date;
}

class ByBitProfitPredatorOriginal {
  private bybitClient: ByBitDualClient;
  private positionManager: ByBitPositionManager;
  private marketDataCache: Map<string, MarketDataPoint> = new Map();
  private lastScanTime: Date = new Date(0);

  // Simple, proven configuration
  private readonly SCAN_INTERVAL_MS = 60000; // 1 minute scans
  private readonly MIN_VOLUME_USD = 1000000; // $1M+ volume
  private readonly MIN_PRICE_CHANGE = 0.03; // 3%+ price moves
  private readonly MAX_PAIRS_TO_HUNT = 25; // Focus on top opportunities

  constructor() {
    this.bybitClient = new ByBitDualClient();
    this.positionManager = new ByBitPositionManager();
  }

  /**
   * Hunt for profit opportunities across ByBit markets
   * Simple, effective scanning without over-complexity
   */
  async huntForProfits(): Promise<ProfitHunt[]> {
    try {
      // Skip if we scanned recently
      if (Date.now() - this.lastScanTime.getTime() < this.SCAN_INTERVAL_MS) {
        return [];
      }

      console.log('🔍 Scanning ByBit markets for profit opportunities...');

      // Get fresh market data from ByBit
      const marketData = await this.fetchByBitMarketData();
      if (marketData.length === 0) {
        console.log('⚠️ No market data received from ByBit');
        return [];
      }

      console.log(`📊 Analyzing ${marketData.length} USDT perpetual pairs...`);

      const hunts: ProfitHunt[] = [];

      // Simple, proven hunting logic
      for (const data of marketData) {
        // Volume spike hunting
        if (data.volume24h > this.MIN_VOLUME_USD * 2) {
          const volumeHunt = this.createVolumeHunt(data);
          if (volumeHunt) hunts.push(volumeHunt);
        }

        // Price breakout hunting
        if (Math.abs(data.priceChange24h) > this.MIN_PRICE_CHANGE) {
          const breakoutHunt = this.createBreakoutHunt(data);
          if (breakoutHunt) hunts.push(breakoutHunt);
        }

        // Momentum hunting
        if (data.priceChange24h > 0.05) { // 5%+ up moves
          const momentumHunt = this.createMomentumHunt(data);
          if (momentumHunt) hunts.push(momentumHunt);
        }
      }

      this.lastScanTime = new Date();

      // Sort by expectancy and limit to top opportunities
      hunts.sort((a, b) => b.expectancyRatio - a.expectancyRatio);
      const topHunts = hunts.slice(0, this.MAX_PAIRS_TO_HUNT);

      if (topHunts.length > 0) {
        console.log(`🎯 Found ${topHunts.length} profit hunting opportunities:`);
        topHunts.slice(0, 5).forEach((hunt, i) => {
          console.log(`   ${i + 1}. ${hunt.symbol} - ${hunt.huntType} (Expectancy: ${hunt.expectancyRatio.toFixed(2)}:1)`);
        });
      }

      return topHunts;

    } catch (error) {
      console.error('❌ Error hunting for profits:', error.message);
      return [];
    }
  }

  /**
   * Fetch market data from ByBit public API
   * Focused on USDT perpetual pairs only for CFT compliance
   */
  private async fetchByBitMarketData(): Promise<MarketDataPoint[]> {
    try {
      // Use the dual client's public API
      const response = await this.bybitClient.getMarketData('linear'); // USDT perpetuals

      if (!response || !response.result || !response.result.list) {
        console.log('⚠️ Invalid ByBit market data response');
        return [];
      }

      const marketData: MarketDataPoint[] = response.result.list
        .filter((ticker: any) =>
          ticker.symbol.endsWith('USDT') && // Only USDT pairs
          parseFloat(ticker.turnover24h) > this.MIN_VOLUME_USD // Minimum volume
        )
        .map((ticker: any) => ({
          symbol: ticker.symbol,
          price: parseFloat(ticker.lastPrice),
          volume24h: parseFloat(ticker.turnover24h), // ByBit uses turnover for volume
          priceChange24h: parseFloat(ticker.price24hPcnt),
          high24h: parseFloat(ticker.highPrice24h),
          low24h: parseFloat(ticker.lowPrice24h),
          timestamp: new Date()
        }));

      // Update cache
      marketData.forEach(data => {
        this.marketDataCache.set(data.symbol, data);
      });

      return marketData;

    } catch (error) {
      console.error('❌ Error fetching ByBit market data:', error.message);

      // Fallback to cached data if available
      if (this.marketDataCache.size > 0) {
        console.log(`🔄 Using cached market data (${this.marketDataCache.size} pairs)`);
        return Array.from(this.marketDataCache.values());
      }

      return [];
    }
  }

  /**
   * Create volume spike hunt
   */
  private createVolumeHunt(data: MarketDataPoint): ProfitHunt | null {
    const volumeRatio = data.volume24h / this.MIN_VOLUME_USD;
    if (volumeRatio < 2) return null;

    return {
      symbol: data.symbol,
      huntType: 'volume_spike',
      direction: data.priceChange24h > 0 ? 'BUY' : 'SELL',
      entryPrice: data.price,
      expectedReturn: Math.min(0.08, volumeRatio * 0.02), // Cap at 8%
      maxDownside: 0.03, // 3% max loss
      signalStrength: Math.min(1.0, volumeRatio / 5), // Normalize to 1.0
      expectancyRatio: Math.min(0.08, volumeRatio * 0.02) / 0.03, // Return/Risk
      probabilityOfProfit: 0.6, // Conservative estimate
      uniquenessScore: 0.8,
      maxHoldMinutes: 240, // 4 hours max
      urgency: volumeRatio > 5 ? 'high' : 'medium'
    };
  }

  /**
   * Create breakout hunt
   */
  private createBreakoutHunt(data: MarketDataPoint): ProfitHunt | null {
    const priceMove = Math.abs(data.priceChange24h);
    if (priceMove < this.MIN_PRICE_CHANGE) return null;

    return {
      symbol: data.symbol,
      huntType: 'price_break',
      direction: data.priceChange24h > 0 ? 'BUY' : 'SELL',
      entryPrice: data.price,
      expectedReturn: Math.min(0.06, priceMove * 0.5), // Half the move
      maxDownside: 0.025, // 2.5% max loss
      signalStrength: Math.min(1.0, priceMove / 0.1), // Normalize to 10%
      expectancyRatio: Math.min(0.06, priceMove * 0.5) / 0.025,
      probabilityOfProfit: 0.55,
      uniquenessScore: 0.7,
      maxHoldMinutes: 180, // 3 hours max
      urgency: priceMove > 0.08 ? 'high' : 'medium'
    };
  }

  /**
   * Create momentum hunt
   */
  private createMomentumHunt(data: MarketDataPoint): ProfitHunt | null {
    if (data.priceChange24h <= 0.05) return null;

    return {
      symbol: data.symbol,
      huntType: 'momentum',
      direction: 'BUY',
      entryPrice: data.price,
      expectedReturn: Math.min(0.05, data.priceChange24h * 0.3), // 30% of current move
      maxDownside: 0.02, // 2% max loss
      signalStrength: Math.min(1.0, data.priceChange24h / 0.15), // Normalize to 15%
      expectancyRatio: Math.min(0.05, data.priceChange24h * 0.3) / 0.02,
      probabilityOfProfit: 0.65,
      uniquenessScore: 0.6,
      maxHoldMinutes: 120, // 2 hours max
      urgency: data.priceChange24h > 0.1 ? 'high' : 'medium'
    };
  }

  /**
   * Get current market price for a symbol
   */
  async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const cached = this.marketDataCache.get(symbol);
      if (cached && Date.now() - cached.timestamp.getTime() < 60000) {
        return cached.price;
      }

      // Fetch fresh price from ByBit
      const ticker = await this.bybitClient.getTicker(symbol);
      if (ticker && ticker.result) {
        return parseFloat(ticker.result.lastPrice);
      }

      return null;
    } catch (error) {
      console.error(`❌ Error getting price for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Execute a profit hunt
   */
  async executeHunt(hunt: ProfitHunt): Promise<HuntResult> {
    const huntId = `${hunt.symbol}_${Date.now()}`;

    try {
      console.log(`🎯 Executing ${hunt.huntType} hunt on ${hunt.symbol}`);

      // Calculate position size based on risk
      const accountSize = 10000; // CFT account size
      const riskAmount = accountSize * hunt.maxDownside;
      const positionSize = riskAmount / (hunt.entryPrice * hunt.maxDownside);

      // Execute trade via position manager
      const success = await this.positionManager.openPosition({
        symbol: hunt.symbol,
        side: hunt.direction,
        size: positionSize,
        price: hunt.entryPrice,
        stopLoss: hunt.direction === 'BUY' ?
          hunt.entryPrice * (1 - hunt.maxDownside) :
          hunt.entryPrice * (1 + hunt.maxDownside),
        takeProfit: hunt.direction === 'BUY' ?
          hunt.entryPrice * (1 + hunt.expectedReturn) :
          hunt.entryPrice * (1 - hunt.expectedReturn)
      });

      return {
        huntId,
        success,
        exitReason: success ? 'executed' : 'failed_to_execute',
        holdTimeMinutes: 0,
        learningData: {
          huntType: hunt.huntType,
          signalStrength: hunt.signalStrength,
          expectancyRatio: hunt.expectancyRatio
        }
      };

    } catch (error) {
      console.error(`❌ Error executing hunt ${huntId}:`, error.message);
      return {
        huntId,
        success: false,
        exitReason: 'execution_error',
        holdTimeMinutes: 0,
        learningData: { error: error.message }
      };
    }
  }

  /**
   * Analyze opportunity for a specific symbol (CFT interface compatibility)
   */
  async analyzeOpportunity(params: { symbol: string; price: number; timestamp: Date }): Promise<any> {
    try {
      const { symbol, price } = params;

      // Get market data for this symbol
      const marketData = this.marketDataCache.get(symbol);
      if (!marketData) {
        // Try to fetch it
        const freshData = await this.fetchSingleMarketData(symbol);
        if (!freshData) {
          return null;
        }
      }

      const data = this.marketDataCache.get(symbol);
      if (!data) return null;

      // Create a profit hunt for this symbol
      let hunt: ProfitHunt | null = null;

      // Check for volume spike
      if (data.volume24h > this.MIN_VOLUME_USD * 2) {
        hunt = this.createVolumeHunt(data);
      }

      // Check for price breakout
      if (!hunt && Math.abs(data.priceChange24h) > this.MIN_PRICE_CHANGE) {
        hunt = this.createBreakoutHunt(data);
      }

      // Check for momentum
      if (!hunt && data.priceChange24h > 0.05) {
        hunt = this.createMomentumHunt(data);
      }

      if (!hunt) {
        return null;
      }

      return {
        signal: hunt.direction,
        confidence: hunt.signalStrength,
        expectedReturn: hunt.expectedReturn,
        maxRisk: hunt.maxDownside,
        huntType: hunt.huntType,
        urgency: hunt.urgency,
        expectancyRatio: hunt.expectancyRatio
      };

    } catch (error) {
      console.error(`❌ Error analyzing opportunity for ${params.symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Scan for opportunities across multiple pairs (CFT interface compatibility)
   */
  async scanForOpportunities(symbols: string[]): Promise<any[]> {
    try {
      const hunts = await this.huntForProfits();

      // Filter to only requested symbols if provided
      const filteredHunts = symbols && symbols.length > 0 ?
        hunts.filter(hunt => symbols.includes(hunt.symbol)) :
        hunts;

      return filteredHunts.map(hunt => ({
        symbol: hunt.symbol,
        signal: hunt.direction,
        confidence: hunt.signalStrength,
        expectedReturn: hunt.expectedReturn,
        maxRisk: hunt.maxDownside,
        huntType: hunt.huntType,
        urgency: hunt.urgency,
        expectancyRatio: hunt.expectancyRatio,
        price: this.marketDataCache.get(hunt.symbol)?.price || 0
      }));

    } catch (error) {
      console.error('❌ Error scanning for opportunities:', error.message);
      return [];
    }
  }

  /**
   * Fetch market data for a single symbol
   */
  private async fetchSingleMarketData(symbol: string): Promise<MarketDataPoint | null> {
    try {
      const response = await this.bybitClient.getTicker(symbol);
      if (response && response.result) {
        const ticker = response.result;
        const data: MarketDataPoint = {
          symbol: ticker.symbol,
          price: parseFloat(ticker.lastPrice),
          volume24h: parseFloat(ticker.turnover24h),
          priceChange24h: parseFloat(ticker.price24hPcnt),
          high24h: parseFloat(ticker.highPrice24h),
          low24h: parseFloat(ticker.lowPrice24h),
          timestamp: new Date()
        };

        this.marketDataCache.set(symbol, data);
        return data;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error fetching single market data for ${symbol}:`, error.message);
      return null;
    }
  }
}

// Export singleton instance
export const bybitProfitPredatorOriginal = new ByBitProfitPredatorOriginal();