/**
 * DxTrade API Client for Breakout Evaluation
 * Handles authentication and trading operations through DxTrade REST API
 */

import axios, { AxiosInstance } from 'axios';
import chalk from 'chalk';

export interface DxTradeConfig {
  username: string;
  password: string;
  domain: string;
  platformUrl: string;
  apiUrl: string;
}

export interface DxTradeAuthResponse {
  token: string;
  expires: string;
  accountId: string;
}

export interface DxTradeAccount {
  id: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  currency: string;
}

export interface DxTradePosition {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  commission: number;
  swap: number;
  comment?: string;
}

export interface DxTradeOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  volume: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
}

export class DxTradeClient {
  private config: DxTradeConfig;
  private client: AxiosInstance;
  private authToken: string | null = null;
  private accountId: string | null = null;

  constructor(config: DxTradeConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SignalCartel-Breakout/1.0.0'
      }
    });

    // Add request interceptor for auth token
    this.client.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(chalk.red('DxTrade API Error:'), error.response?.data || error.message);
        throw error;
      }
    );
  }

  /**
   * Authenticate with DxTrade platform
   */
  async authenticate(): Promise<DxTradeAuthResponse> {
    try {
      console.log(chalk.cyan('🔐 Authenticating with DxTrade...'));

      const loginData = {
        login: this.config.username,
        password: this.config.password,
        domain: this.config.domain
      };

      const response = await this.client.post('/auth/login', loginData);

      if (response.data && response.data.token) {
        this.authToken = response.data.token;
        this.accountId = response.data.accountId || this.config.username;

        console.log(chalk.green('✅ DxTrade authentication successful'));
        console.log(chalk.dim(`Account ID: ${this.accountId}`));

        return response.data;
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (error: any) {
      console.error(chalk.red('❌ DxTrade authentication failed:'), error.message);
      throw error;
    }
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<DxTradeAccount> {
    try {
      const response = await this.client.get('/account');
      return response.data;
    } catch (error: any) {
      console.error(chalk.red('Failed to get account info:'), error.message);
      throw error;
    }
  }

  /**
   * Get all open positions
   */
  async getPositions(): Promise<DxTradePosition[]> {
    try {
      const response = await this.client.get('/positions');
      return response.data;
    } catch (error: any) {
      console.error(chalk.red('Failed to get positions:'), error.message);
      throw error;
    }
  }

  /**
   * Get all orders (open/pending)
   */
  async getOrders(): Promise<DxTradeOrder[]> {
    try {
      const response = await this.client.get('/orders');
      return response.data;
    } catch (error: any) {
      console.error(chalk.red('Failed to get orders:'), error.message);
      throw error;
    }
  }

  /**
   * Place a market order
   */
  async placeMarketOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    volume: number,
    stopLoss?: number,
    takeProfit?: number,
    comment?: string
  ): Promise<DxTradeOrder> {
    try {
      console.log(chalk.yellow(`📈 Placing ${side} order: ${volume} ${symbol}`));

      const orderData = {
        symbol,
        side,
        type: 'MARKET',
        volume,
        stopLoss,
        takeProfit,
        comment: comment || 'SignalCartel-Breakout'
      };

      const response = await this.client.post('/orders', orderData);

      console.log(chalk.green(`✅ Order placed: ${response.data.id}`));
      return response.data;
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to place order:'), error.message);
      throw error;
    }
  }

  /**
   * Close a position by ID
   */
  async closePosition(positionId: string): Promise<boolean> {
    try {
      console.log(chalk.yellow(`🔒 Closing position: ${positionId}`));

      await this.client.delete(`/positions/${positionId}`);

      console.log(chalk.green(`✅ Position closed: ${positionId}`));
      return true;
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to close position:'), error.message);
      throw error;
    }
  }

  /**
   * Close all positions
   */
  async closeAllPositions(): Promise<boolean> {
    try {
      console.log(chalk.yellow('🔒 Closing all positions...'));

      const positions = await this.getPositions();

      for (const position of positions) {
        await this.closePosition(position.id);
      }

      console.log(chalk.green(`✅ All ${positions.length} positions closed`));
      return true;
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to close all positions:'), error.message);
      throw error;
    }
  }

  /**
   * Cancel an order by ID
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      console.log(chalk.yellow(`❌ Cancelling order: ${orderId}`));

      await this.client.delete(`/orders/${orderId}`);

      console.log(chalk.green(`✅ Order cancelled: ${orderId}`));
      return true;
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to cancel order:'), error.message);
      throw error;
    }
  }

  /**
   * Get market data for symbol
   */
  async getMarketData(symbol: string): Promise<any> {
    try {
      const response = await this.client.get(`/market/${symbol}`);
      return response.data;
    } catch (error: any) {
      console.error(chalk.red(`Failed to get market data for ${symbol}:`), error.message);
      throw error;
    }
  }

  /**
   * Test connection to DxTrade API
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(chalk.cyan('🧪 Testing DxTrade connection...'));

      // Try to authenticate
      await this.authenticate();

      // Try to get account info
      const account = await this.getAccount();
      console.log(chalk.green('✅ Connection test successful'));
      console.log(chalk.dim(`Balance: $${account.balance.toFixed(2)}`));
      console.log(chalk.dim(`Equity: $${account.equity.toFixed(2)}`));

      return true;
    } catch (error) {
      console.error(chalk.red('❌ Connection test failed'));
      return false;
    }
  }

  /**
   * Get current equity (balance + floating P&L)
   */
  async getCurrentEquity(): Promise<{ balance: number; equity: number; floatingPnL: number }> {
    try {
      const account = await this.getAccount();
      const positions = await this.getPositions();

      let floatingPnL = 0;
      for (const position of positions) {
        floatingPnL += position.profit;
      }

      return {
        balance: account.balance,
        equity: account.equity,
        floatingPnL
      };
    } catch (error: any) {
      console.error(chalk.red('Failed to get current equity:'), error.message);
      throw error;
    }
  }
}

// Factory function to create DxTrade client from environment
export function createDxTradeClient(): DxTradeClient {
  const config: DxTradeConfig = {
    username: process.env.DXTRADE_USERNAME || '',
    password: process.env.DXTRADE_PASSWORD || '',
    domain: process.env.DXTRADE_DOMAIN || 'breakout',
    platformUrl: process.env.DXTRADE_PLATFORM_URL || 'https://breakout.dx.trade',
    apiUrl: process.env.DXTRADE_API_URL || 'https://breakout.dx.trade/api'
  };

  if (!config.username || !config.password) {
    throw new Error('DxTrade credentials not configured');
  }

  return new DxTradeClient(config);
}