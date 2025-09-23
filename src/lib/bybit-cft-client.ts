/**
 * ByBit API Client for Crypto Fund Trader Evaluation
 * Integrates with CFT evaluation account via ByBit API
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import chalk from 'chalk';

export interface ByBitConfig {
  apiKey: string;
  apiSecret: string;
  baseURL: string;
  recvWindow: number;
}

export interface ByBitBalance {
  coin: string;
  walletBalance: string;
  transferBalance: string;
  bonus: string;
}

export interface ByBitPosition {
  symbol: string;
  side: 'Buy' | 'Sell';
  size: string;
  positionValue: string;
  entryPrice: string;
  markPrice: string;
  liqPrice: string;
  unrealisedPnl: string;
  cumRealisedPnl: string;
  createdTime: string;
  updatedTime: string;
}

export interface ByBitOrder {
  orderId: string;
  orderLinkId: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: string;
  qty: string;
  price: string;
  timeInForce: string;
  orderStatus: string;
  createdTime: string;
  updatedTime: string;
}

export interface ByBitOrderRequest {
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  qty: string;
  price?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  orderLinkId?: string;
  takeProfit?: string;
  stopLoss?: string;
  tpTriggerBy?: string;
  slTriggerBy?: string;
}

export class ByBitCFTClient {
  private config: ByBitConfig;
  private client: AxiosInstance;

  constructor(config: ByBitConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-BAPI-API-KEY': config.apiKey
      }
    });

    console.log(chalk.cyan('🚀 ByBit CFT Client Initialized'));
    console.log(chalk.dim(`Base URL: ${config.baseURL}`));
    console.log(chalk.dim(`API Key: ${config.apiKey.substring(0, 8)}...`));
  }

  /**
   * Generate signature for ByBit API requests
   */
  private generateSignature(timestamp: number, parameters: string): string {
    const queryString = timestamp + this.config.apiKey + this.config.recvWindow + parameters;
    return crypto.createHmac('sha256', this.config.apiSecret).update(queryString).digest('hex');
  }

  /**
   * Make authenticated request to ByBit API
   */
  private async makeRequest(
    method: 'GET' | 'POST',
    endpoint: string,
    params: any = {}
  ): Promise<any> {
    try {
      const timestamp = Date.now();
      const queryString = method === 'GET' ?
        new URLSearchParams(params).toString() :
        JSON.stringify(params);

      const signature = this.generateSignature(timestamp, queryString);

      const headers = {
        'X-BAPI-TIMESTAMP': timestamp.toString(),
        'X-BAPI-RECV-WINDOW': this.config.recvWindow.toString(),
        'X-BAPI-SIGN': signature
      };

      let response;
      if (method === 'GET') {
        response = await this.client.get(endpoint, {
          params,
          headers
        });
      } else {
        response = await this.client.post(endpoint, params, { headers });
      }

      if (response.data.retCode !== 0) {
        throw new Error(`ByBit API Error: ${response.data.retMsg} (${response.data.retCode})`);
      }

      return response.data.result;
    } catch (error: any) {
      console.error(chalk.red('ByBit API Error:'), error.message);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(chalk.cyan('🧪 Testing ByBit API connection...'));

      const balance = await this.getWalletBalance();
      console.log(chalk.green('✅ ByBit API connection successful'));
      console.log(chalk.dim(`Account has ${balance.length} coin balances`));

      return true;
    } catch (error) {
      console.error(chalk.red('❌ ByBit API connection failed'));
      return false;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<ByBitBalance[]> {
    const result = await this.makeRequest('GET', '/v5/account/wallet-balance', {
      accountType: 'UNIFIED'
    });
    return result.list[0]?.coin || [];
  }

  /**
   * Get current positions
   */
  async getPositions(symbol?: string): Promise<ByBitPosition[]> {
    const params: any = {
      category: 'linear'
    };
    if (symbol) {
      params.symbol = symbol;
    }

    const result = await this.makeRequest('GET', '/v5/position/list', params);
    return result.list || [];
  }

  /**
   * Get order history
   */
  async getOrders(symbol?: string, limit: number = 20): Promise<ByBitOrder[]> {
    const params: any = {
      category: 'linear',
      limit
    };
    if (symbol) {
      params.symbol = symbol;
    }

    const result = await this.makeRequest('GET', '/v5/order/history', params);
    return result.list || [];
  }

  /**
   * Place market order
   */
  async placeMarketOrder(
    symbol: string,
    side: 'Buy' | 'Sell',
    qty: string,
    options: {
      takeProfit?: string;
      stopLoss?: string;
      orderLinkId?: string;
    } = {}
  ): Promise<ByBitOrder> {
    console.log(chalk.yellow(`📈 Placing ${side} market order: ${qty} ${symbol}`));

    const orderRequest: ByBitOrderRequest = {
      category: 'linear',
      symbol,
      side,
      orderType: 'Market',
      qty,
      ...options
    };

    const result = await this.makeRequest('POST', '/v5/order/create', orderRequest);

    console.log(chalk.green(`✅ Order placed: ${result.orderId}`));
    return result;
  }

  /**
   * Place limit order
   */
  async placeLimitOrder(
    symbol: string,
    side: 'Buy' | 'Sell',
    qty: string,
    price: string,
    options: {
      timeInForce?: 'GTC' | 'IOC' | 'FOK';
      takeProfit?: string;
      stopLoss?: string;
      orderLinkId?: string;
    } = {}
  ): Promise<ByBitOrder> {
    console.log(chalk.yellow(`📈 Placing ${side} limit order: ${qty} ${symbol} @ ${price}`));

    const orderRequest: ByBitOrderRequest = {
      category: 'linear',
      symbol,
      side,
      orderType: 'Limit',
      qty,
      price,
      timeInForce: options.timeInForce || 'GTC',
      ...options
    };

    const result = await this.makeRequest('POST', '/v5/order/create', orderRequest);

    console.log(chalk.green(`✅ Limit order placed: ${result.orderId}`));
    return result;
  }

  /**
   * Cancel order
   */
  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      console.log(chalk.yellow(`❌ Cancelling order: ${orderId}`));

      await this.makeRequest('POST', '/v5/order/cancel', {
        category: 'linear',
        symbol,
        orderId
      });

      console.log(chalk.green(`✅ Order cancelled: ${orderId}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`Failed to cancel order ${orderId}:`), error);
      return false;
    }
  }

  /**
   * Set leverage for a symbol
   */
  async setLeverage(symbol: string, leverage: number): Promise<boolean> {
    try {
      console.log(chalk.cyan(`⚙️ Setting leverage ${leverage}x for ${symbol}`));

      const result = await this.makeRequest('POST', '/v5/position/set-leverage', {
        category: 'linear',
        symbol,
        buyLeverage: leverage.toString(),
        sellLeverage: leverage.toString()
      });

      console.log(chalk.green(`✅ Leverage set to ${leverage}x for ${symbol}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`Failed to set leverage for ${symbol}:`), error);
      return false;
    }
  }

  /**
   * Set margin mode for a symbol
   */
  async setMarginMode(symbol: string, marginMode: 'ISOLATED_MARGIN' | 'CROSS_MARGIN' = 'CROSS_MARGIN'): Promise<boolean> {
    try {
      console.log(chalk.cyan(`⚙️ Setting margin mode ${marginMode} for ${symbol}`));

      await this.makeRequest('POST', '/v5/position/switch-margin', {
        category: 'linear',
        symbol,
        tradeMode: marginMode === 'CROSS_MARGIN' ? 0 : 1,
        buyLeverage: '1',
        sellLeverage: '1'
      });

      console.log(chalk.green(`✅ Margin mode set to ${marginMode} for ${symbol}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`Failed to set margin mode for ${symbol}:`), error);
      return false;
    }
  }

  /**
   * Close position
   */
  async closePosition(symbol: string): Promise<boolean> {
    try {
      const positions = await this.getPositions(symbol);
      const openPosition = positions.find(p => parseFloat(p.size) > 0);

      if (!openPosition) {
        console.log(chalk.yellow(`No open position for ${symbol}`));
        return true;
      }

      const closeSide = openPosition.side === 'Buy' ? 'Sell' : 'Buy';

      await this.placeMarketOrder(symbol, closeSide, openPosition.size);

      console.log(chalk.green(`✅ Position closed: ${symbol}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`Failed to close position for ${symbol}:`), error);
      return false;
    }
  }

  /**
   * Get current market price
   */
  async getMarketPrice(symbol: string): Promise<number> {
    const result = await this.makeRequest('GET', '/v5/market/tickers', {
      category: 'linear',
      symbol
    });

    const ticker = result.list[0];
    if (!ticker) {
      throw new Error(`No market data for ${symbol}`);
    }

    return parseFloat(ticker.lastPrice);
  }

  /**
   * Get ticker information for a symbol
   */
  async getTicker(symbol: string): Promise<{
    symbol: string;
    lastPrice: string;
    bid1Price: string;
    ask1Price: string;
    volume24h: string;
    turnover24h: string;
    price24hPcnt: string;
    highPrice24h: string;
    lowPrice24h: string;
  }> {
    const result = await this.makeRequest('GET', '/v5/market/tickers', {
      category: 'linear',
      symbol
    });

    const ticker = result.list[0];
    if (!ticker) {
      throw new Error(`No ticker data for ${symbol}`);
    }

    return {
      symbol: ticker.symbol,
      lastPrice: ticker.lastPrice,
      bid1Price: ticker.bid1Price,
      ask1Price: ticker.ask1Price,
      volume24h: ticker.volume24h,
      turnover24h: ticker.turnover24h,
      price24hPcnt: ticker.price24hPcnt,
      highPrice24h: ticker.highPrice24h,
      lowPrice24h: ticker.lowPrice24h
    };
  }

  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol: string, limit: number = 25): Promise<{
    symbol: string;
    bids: Array<[string, string]>;
    asks: Array<[string, string]>;
    ts: string;
  }> {
    const result = await this.makeRequest('GET', '/v5/market/orderbook', {
      category: 'linear',
      symbol,
      limit
    });

    return {
      symbol: result.s,
      bids: result.b || [],
      asks: result.a || [],
      ts: result.ts
    };
  }

  /**
   * Get all available trading pairs (public endpoint, no auth required)
   */
  async getAvailablePairs(): Promise<{
    symbol: string;
    baseCoin: string;
    quoteCoin: string;
    status: string;
    launchTime: string;
    minPrice: string;
    maxPrice: string;
    minOrderQty: string;
    maxOrderQty: string;
  }[]> {
    try {
      // Use public endpoint without authentication
      const response = await this.client.get('/v5/market/instruments-info', {
        params: {
          category: 'linear'
        }
      });

      if (response.data.retCode !== 0) {
        throw new Error(`ByBit API Error: ${response.data.retMsg} (${response.data.retCode})`);
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
      console.error(chalk.red('Failed to fetch instruments:'), error.message);
      throw error;
    }
  }

  /**
   * Get account P&L summary
   */
  async getAccountSummary(): Promise<{
    totalEquity: number;
    totalUnrealizedPnl: number;
    totalRealizedPnl: number;
    availableBalance: number;
  }> {
    const balance = await this.getWalletBalance();
    const positions = await this.getPositions();

    let totalEquity = 0;
    let totalUnrealizedPnl = 0;
    let availableBalance = 0;

    // Sum USDT balance
    const usdtBalance = balance.find(b => b.coin === 'USDT');
    if (usdtBalance) {
      totalEquity = parseFloat(usdtBalance.walletBalance);
      availableBalance = parseFloat(usdtBalance.transferBalance);
    }

    // Sum unrealized P&L from positions
    for (const position of positions) {
      totalUnrealizedPnl += parseFloat(position.unrealisedPnl);
    }

    // Total realized P&L would need separate calculation
    const totalRealizedPnl = 0; // Placeholder

    return {
      totalEquity,
      totalUnrealizedPnl,
      totalRealizedPnl,
      availableBalance
    };
  }

  /**
   * Emergency stop - close all positions
   */
  async emergencyCloseAll(): Promise<boolean> {
    try {
      console.log(chalk.red('🚨 EMERGENCY STOP - Closing all positions'));

      const positions = await this.getPositions();
      const openPositions = positions.filter(p => parseFloat(p.size) > 0);

      for (const position of openPositions) {
        await this.closePosition(position.symbol);
      }

      console.log(chalk.green(`✅ Emergency stop complete - ${openPositions.length} positions closed`));
      return true;
    } catch (error) {
      console.error(chalk.red('❌ Emergency stop failed:'), error);
      return false;
    }
  }
}

// Factory function for CFT integration
export function createByBitCFTClient(): ByBitCFTClient {
  const config: ByBitConfig = {
    apiKey: process.env.BYBIT_API_KEY || '',
    apiSecret: process.env.BYBIT_API_SECRET || '',
    baseURL: 'https://api.bybit.com',
    recvWindow: 5000
  };

  if (!config.apiKey || !config.apiSecret) {
    throw new Error('ByBit API credentials not configured');
  }

  return new ByBitCFTClient(config);
}