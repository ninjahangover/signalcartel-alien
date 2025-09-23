/**
 * ByBit Dual Client - Public + Authenticated APIs
 * Public API: Market data (no IP restrictions)
 * CFT API: Trade execution (when IP whitelist resolved)
 */

import axios, { AxiosInstance } from 'axios';
import { ByBitCFTClient, createByBitCFTClient } from './bybit-cft-client';
import chalk from 'chalk';

export class ByBitDualClient {
  private publicClient: AxiosInstance;
  private cftClient: ByBitCFTClient | null = null;
  private cftAvailable: boolean = false;

  constructor() {
    // Public API client (no authentication required)
    this.publicClient = axios.create({
      baseURL: 'https://api.bybit.com',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Try to initialize CFT client
    this.initializeCFTClient();

    console.log(chalk.cyan('🔄 ByBit Dual Client Initialized'));
    console.log(chalk.green('✅ Public API: Market data access'));
    console.log(this.cftAvailable ?
      chalk.green('✅ CFT API: Trade execution ready') :
      chalk.yellow('⚠️  CFT API: Will retry when IP whitelist resolved')
    );
  }

  /**
   * Initialize CFT client (gracefully handle failures)
   */
  private async initializeCFTClient() {
    try {
      this.cftClient = createByBitCFTClient();

      // Test CFT connection
      const connected = await this.cftClient.testConnection();
      this.cftAvailable = connected;

      if (connected) {
        console.log(chalk.green('✅ CFT API ready for trade execution'));
      } else {
        console.log(chalk.yellow('⚠️  CFT API not ready - using public API only'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  CFT API initialization failed - using public API only'));
      this.cftAvailable = false;
    }
  }

  /**
   * Get market price using public API
   */
  async getMarketPrice(symbol: string): Promise<number> {
    try {
      const response = await this.publicClient.get('/v5/market/tickers', {
        params: {
          category: 'linear',
          symbol
        }
      });

      if (response.data.retCode !== 0) {
        throw new Error(`ByBit API Error: ${response.data.retMsg}`);
      }

      const ticker = response.data.result.list[0];
      if (!ticker) {
        throw new Error(`No market data for ${symbol}`);
      }

      return parseFloat(ticker.lastPrice);
    } catch (error: any) {
      console.error(chalk.red(`Failed to get price for ${symbol}:`), error.message);
      throw error;
    }
  }

  /**
   * Get all available trading pairs using public API
   */
  async getAvailablePairs(): Promise<any[]> {
    try {
      const response = await this.publicClient.get('/v5/market/instruments-info', {
        params: {
          category: 'linear'
        }
      });

      if (response.data.retCode !== 0) {
        throw new Error(`ByBit API Error: ${response.data.retMsg}`);
      }

      return response.data.result.list.map((instrument: any) => ({
        symbol: instrument.symbol,
        baseCoin: instrument.baseCoin,
        quoteCoin: instrument.quoteCoin,
        status: instrument.status,
        launchTime: instrument.launchTime,
        minPrice: instrument.priceFilter?.minPrice || '0',
        maxPrice: instrument.priceFilter?.maxPrice || '0',
        minOrderQty: instrument.lotSizeFilter?.minOrderQty || '0',
        maxOrderQty: instrument.lotSizeFilter?.maxOrderQty || '0'
      }));
    } catch (error: any) {
      console.error(chalk.red('Failed to fetch trading pairs:'), error.message);
      throw error;
    }
  }

  /**
   * Get market data for multiple symbols using public API
   */
  async getBulkMarketData(symbols: string[]): Promise<Map<string, any>> {
    try {
      const marketData = new Map();

      // Get tickers for all symbols at once
      const response = await this.publicClient.get('/v5/market/tickers', {
        params: {
          category: 'linear'
        }
      });

      if (response.data.retCode !== 0) {
        throw new Error(`ByBit API Error: ${response.data.retMsg}`);
      }

      const tickers = response.data.result.list;

      // Filter for requested symbols
      symbols.forEach(symbol => {
        const ticker = tickers.find((t: any) => t.symbol === symbol);
        if (ticker) {
          marketData.set(symbol, {
            symbol,
            price: parseFloat(ticker.lastPrice),
            volume24h: parseFloat(ticker.volume24h),
            priceChange24h: parseFloat(ticker.price24hPcnt) * 100,
            high24h: parseFloat(ticker.highPrice24h),
            low24h: parseFloat(ticker.lowPrice24h),
            timestamp: new Date()
          });
        }
      });

      return marketData;
    } catch (error: any) {
      console.error(chalk.red('Failed to get bulk market data:'), error.message);
      throw error;
    }
  }

  /**
   * Get 24h ticker data using public API
   */
  async get24hTicker(symbol: string): Promise<any> {
    try {
      const response = await this.publicClient.get('/v5/market/tickers', {
        params: {
          category: 'linear',
          symbol
        }
      });

      if (response.data.retCode !== 0) {
        throw new Error(`ByBit API Error: ${response.data.retMsg}`);
      }

      const ticker = response.data.result.list[0];
      if (!ticker) {
        throw new Error(`No ticker data for ${symbol}`);
      }

      return {
        symbol: ticker.symbol,
        lastPrice: parseFloat(ticker.lastPrice),
        priceChange24h: parseFloat(ticker.price24hPcnt) * 100,
        volume24h: parseFloat(ticker.volume24h),
        highPrice24h: parseFloat(ticker.highPrice24h),
        lowPrice24h: parseFloat(ticker.lowPrice24h),
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error(chalk.red(`Failed to get ticker for ${symbol}:`), error.message);
      throw error;
    }
  }

  /**
   * Get market data for category (linear/spot)
   */
  async getMarketData(category: string = 'linear'): Promise<{
    result: {
      list: Array<{
        symbol: string;
        lastPrice: string;
        turnover24h: string;
        price24hPcnt: string;
        highPrice24h: string;
        lowPrice24h: string;
        volume24h: string;
      }>;
    };
  }> {
    try {
      const response = await this.publicClient.get('/v5/market/tickers', {
        params: {
          category
        }
      });

      if (response.data.retCode !== 0) {
        throw new Error(`ByBit API Error: ${response.data.retMsg}`);
      }

      return response.data;
    } catch (error: any) {
      console.error(chalk.red(`Failed to get market data for ${category}:`), error.message);
      throw error;
    }
  }

  /**
   * Get ticker information for a symbol (compatible with CFT client)
   */
  async getTicker(symbol: string): Promise<{
    result: {
      symbol: string;
      lastPrice: string;
      turnover24h: string;
      price24hPcnt: string;
      highPrice24h: string;
      lowPrice24h: string;
    };
  } | null> {
    try {
      const response = await this.publicClient.get('/v5/market/tickers', {
        params: {
          category: 'linear',
          symbol
        }
      });

      if (response.data.retCode !== 0) {
        throw new Error(`ByBit API Error: ${response.data.retMsg}`);
      }

      const ticker = response.data.result.list[0];
      if (!ticker) {
        return null;
      }

      return {
        result: {
          symbol: ticker.symbol,
          lastPrice: ticker.lastPrice,
          turnover24h: ticker.turnover24h,
          price24hPcnt: ticker.price24hPcnt,
          highPrice24h: ticker.highPrice24h,
          lowPrice24h: ticker.lowPrice24h
        }
      };
    } catch (error: any) {
      console.error(chalk.red(`Failed to get ticker for ${symbol}:`), error.message);
      throw error;
    }
  }

  /**
   * Get order book for a symbol using public API
   */
  async getOrderBook(symbol: string, limit: number = 25): Promise<{
    s: string;
    b: Array<[string, string]>;
    a: Array<[string, string]>;
    ts: string;
  }> {
    try {
      const response = await this.publicClient.get('/v5/market/orderbook', {
        params: {
          category: 'linear',
          symbol,
          limit
        }
      });

      if (response.data.retCode !== 0) {
        throw new Error(`ByBit API Error: ${response.data.retMsg}`);
      }

      return response.data.result;
    } catch (error: any) {
      console.error(chalk.red(`Failed to get order book for ${symbol}:`), error.message);
      throw error;
    }
  }

  /**
   * Get wallet balance using public API (graceful fallback)
   */
  async getWalletBalance(): Promise<any[]> {
    // If CFT API is available, use it
    if (this.cftAvailable && this.cftClient) {
      try {
        return await this.cftClient.getWalletBalance();
      } catch (error) {
        console.warn('CFT API wallet balance failed, using fallback');
      }
    }

    // Fallback: return empty array for public API
    console.warn('Wallet balance not available via public API - using CFT default');
    return [];
  }

  // ===== CFT AUTHENTICATED METHODS =====

  /**
   * Test CFT connection and retry if needed
   */
  async testCFTConnection(): Promise<boolean> {
    if (!this.cftClient) {
      await this.initializeCFTClient();
    }

    if (this.cftClient) {
      try {
        const connected = await this.cftClient.testConnection();
        this.cftAvailable = connected;
        return connected;
      } catch (error) {
        this.cftAvailable = false;
        return false;
      }
    }

    return false;
  }

  /**
   * Get account summary using CFT API
   */
  async getAccountSummary(): Promise<any> {
    if (!this.cftAvailable || !this.cftClient) {
      throw new Error('CFT API not available - check IP whitelist');
    }

    return await this.cftClient.getAccountSummary();
  }

  /**
   * Get positions using CFT API
   */
  async getPositions(symbol?: string): Promise<any[]> {
    if (!this.cftAvailable || !this.cftClient) {
      throw new Error('CFT API not available - check IP whitelist');
    }

    return await this.cftClient.getPositions(symbol);
  }

  /**
   * Place market order using CFT API
   */
  async placeMarketOrder(
    symbol: string,
    side: 'Buy' | 'Sell',
    qty: string,
    options: any = {}
  ): Promise<any> {
    if (!this.cftAvailable || !this.cftClient) {
      throw new Error('CFT API not available - check IP whitelist');
    }

    return await this.cftClient.placeMarketOrder(symbol, side, qty, options);
  }

  /**
   * Place limit order using CFT API
   */
  async placeLimitOrder(
    symbol: string,
    side: 'Buy' | 'Sell',
    qty: string,
    price: string,
    options: any = {}
  ): Promise<any> {
    if (!this.cftAvailable || !this.cftClient) {
      throw new Error('CFT API not available - check IP whitelist');
    }

    return await this.cftClient.placeLimitOrder(symbol, side, qty, price, options);
  }

  /**
   * Cancel order using CFT API
   */
  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    if (!this.cftAvailable || !this.cftClient) {
      throw new Error('CFT API not available - check IP whitelist');
    }

    return await this.cftClient.cancelOrder(symbol, orderId);
  }

  /**
   * Emergency close all positions using CFT API
   */
  async emergencyCloseAll(): Promise<boolean> {
    if (!this.cftAvailable || !this.cftClient) {
      throw new Error('CFT API not available - check IP whitelist');
    }

    return await this.cftClient.emergencyCloseAll();
  }

  /**
   * Get client status
   */
  getStatus() {
    return {
      publicAPI: true,
      cftAPI: this.cftAvailable,
      canGetMarketData: true,
      canExecuteTrades: this.cftAvailable
    };
  }

  /**
   * Retry CFT connection
   */
  async retryCFTConnection(): Promise<boolean> {
    console.log(chalk.cyan('🔄 Retrying CFT API connection...'));
    await this.initializeCFTClient();
    return this.cftAvailable;
  }

  /**
   * Get account info - CFT evaluation mode with fixed balance
   */
  async getAccountInfo() {
    // Try real CFT API first
    if (this.cftAvailable && this.cftClient) {
      try {
        const realCftBalance = await this.cftClient.getAccountInfo();
        console.log('💰 CFT Account Balance (Real API):', JSON.stringify(realCftBalance, null, 2));
        return realCftBalance;
      } catch (error) {
        console.error('❌ CFT API call failed:', error);
        // Fall through to evaluation mode
      }
    }

    // For CFT evaluation testing when API unavailable
    const evaluationMode = process.env.CFT_EVALUATION_MODE === 'true' || process.env.CFT_MODE === 'true';
    if (evaluationMode) {
      console.log('⚠️ CFT API unavailable - using evaluation mode balance for testing');
      const evalBalance = process.env.CFT_ACCOUNT_SIZE || '10000';
      return {
        balance: {
          ZUSD: evalBalance
        },
        openOrders: {},
        tradesHistory: {},
        tradesCount: 0
      };
    }

    // Production mode - must have real API
    throw new Error('CFT API not available - cannot get real account balance. Check API credentials and IP whitelist.');
  }
}

// Factory function
export function createByBitDualClient(): ByBitDualClient {
  return new ByBitDualClient();
}