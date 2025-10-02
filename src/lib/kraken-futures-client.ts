/**
 * Kraken Futures API Client
 * Isolated module for perpetual contract trading
 * Completely separate from spot trading system
 */

import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';

export interface FuturesBalance {
  currency: string;
  balance: number;
  available: number;
  marginBalance: number;
}

export interface FuturesPosition {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

export interface FuturesOrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'lmt' | 'mkt' | 'stp' | 'take_profit';
  size: number;
  limitPrice?: number;
  stopPrice?: number;
  reduceOnly?: boolean;
}

export interface FuturesOrderResponse {
  result: string;
  orderId?: string;
  error?: string;
}

export class KrakenFuturesClient {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private axiosInstance: AxiosInstance;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor(apiKey?: string, apiSecret?: string, isDemo: boolean = false) {
    this.apiKey = apiKey || process.env.KRAKEN_FUTURES_API_KEY || '';
    this.apiSecret = apiSecret || process.env.KRAKEN_FUTURES_API_SECRET || '';

    // Use demo environment if specified or if no API keys
    this.baseUrl = isDemo || !this.apiKey
      ? 'https://demo-futures.kraken.com/derivatives/api/v3'
      : 'https://futures.kraken.com/derivatives/api/v3';

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log(`🚀 Kraken Futures Client initialized (${isDemo ? 'DEMO' : 'LIVE'} mode)`);
  }

  /**
   * Generate authentication signature for Kraken Futures API
   * Updated for 2025 compliance: uses URL-encoded parameters
   *
   * New method (post-2025):
   * 1. Concatenate: postData (URL-encoded) + nonce + endpointPath
   * 2. Hash with SHA-256
   * 3. Base64-decode API secret
   * 4. HMAC-SHA-512 with decoded secret
   * 5. Base64-encode result
   */
  private generateAuthSignature(endpoint: string, postData: string, nonce: string): string {
    // 2025 Update: postData should already be URL-encoded from URLSearchParams
    // Concatenate: postData + nonce + endpoint
    const message = postData + nonce + endpoint;

    // Step 2: SHA-256 hash
    const hash = crypto.createHash('sha256').update(message).digest();

    // Step 3 & 4: HMAC-SHA512 with base64-decoded secret
    const secretBuffer = Buffer.from(this.apiSecret, 'base64');
    const signature = crypto.createHmac('sha512', secretBuffer).update(hash).digest('base64');

    // Step 5: Return base64-encoded signature
    return signature;
  }

  /**
   * Rate limiting - Kraken Futures allows ~60 requests per second
   * Conservative limit of 30 req/sec
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Reset counter every second
    if (timeSinceLastRequest > 1000) {
      this.requestCount = 0;
    }

    // Limit to 30 requests per second
    if (this.requestCount >= 30) {
      const waitTime = 1000 - timeSinceLastRequest;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
      }
    }

    this.requestCount++;
    this.lastRequestTime = Date.now();
  }

  /**
   * Make authenticated request to Kraken Futures API
   */
  private async authenticatedRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    postData: Record<string, any> = {}
  ): Promise<any> {
    await this.rateLimit();

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Kraken Futures API credentials not configured');
    }

    const nonce = Date.now().toString();
    const postDataString = new URLSearchParams(postData).toString();

    // Full endpoint path for signature (includes /derivatives/api/v3)
    const fullEndpointPath = `/derivatives/api/v3${endpoint}`;
    const authent = this.generateAuthSignature(fullEndpointPath, postDataString, nonce);

    try {
      const config = {
        headers: {
          'APIKey': this.apiKey,
          'Authent': authent,
          'Nonce': nonce
        }
      };

      const response = method === 'GET'
        ? await this.axiosInstance.get(endpoint, config)
        : await this.axiosInstance.post(endpoint, postDataString, config);

      if (response.data.result === 'error') {
        throw new Error(`Futures API Error: ${response.data.error}`);
      }

      return response.data;
    } catch (error: any) {
      console.error(`❌ Futures API Request Failed: ${endpoint}`, error.message);
      throw error;
    }
  }

  /**
   * Get account balance and margin info
   */
  async getBalance(): Promise<FuturesBalance[]> {
    const response = await this.authenticatedRequest('/accounts', 'GET');

    const balances: FuturesBalance[] = [];

    if (response.accounts) {
      for (const account of response.accounts) {
        balances.push({
          currency: account.currency || 'USD',
          balance: parseFloat(account.balance || '0'),
          available: parseFloat(account.available_margin || '0'),
          marginBalance: parseFloat(account.margin_balance || '0')
        });
      }
    }

    return balances;
  }

  /**
   * Get all open positions
   */
  async getOpenPositions(): Promise<FuturesPosition[]> {
    const response = await this.authenticatedRequest('/openpositions');

    const positions: FuturesPosition[] = [];

    if (response.openPositions) {
      for (const pos of response.openPositions) {
        positions.push({
          symbol: pos.symbol,
          side: parseFloat(pos.size) > 0 ? 'long' : 'short',
          size: Math.abs(parseFloat(pos.size)),
          entryPrice: parseFloat(pos.price),
          markPrice: parseFloat(pos.markPrice || pos.price),
          liquidationPrice: parseFloat(pos.liquidationPrice || '0'),
          unrealizedPnl: parseFloat(pos.pnl || '0'),
          leverage: parseFloat(pos.leverage || '1')
        });
      }
    }

    return positions;
  }

  /**
   * Get available instruments (perpetuals and futures)
   */
  async getInstruments(): Promise<any[]> {
    await this.rateLimit();

    try {
      const response = await this.axiosInstance.get('/instruments');
      return response.data.instruments || [];
    } catch (error: any) {
      console.error('❌ Failed to get futures instruments:', error.message);
      return [];
    }
  }

  /**
   * Get ticker data for a symbol
   */
  async getTicker(symbol: string): Promise<any> {
    await this.rateLimit();

    try {
      // Kraken Futures uses /tickers endpoint, filter by symbol
      const response = await this.axiosInstance.get('/tickers');
      const tickers = response.data.tickers || [];
      const ticker = tickers.find((t: any) => t.symbol === symbol);
      return ticker || null;
    } catch (error: any) {
      console.error(`❌ Failed to get ticker for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Place a market order
   */
  async placeMarketOrder(
    symbol: string,
    side: 'buy' | 'sell',
    size: number
  ): Promise<FuturesOrderResponse> {
    const orderData = {
      orderType: 'mkt',
      symbol: symbol,
      side: side,
      size: size.toString()
    };

    try {
      const response = await this.authenticatedRequest('/sendorder', orderData);

      return {
        result: response.result,
        orderId: response.sendStatus?.order_id,
        error: response.error
      };
    } catch (error: any) {
      return {
        result: 'error',
        error: error.message
      };
    }
  }

  /**
   * Place a limit order
   */
  async placeLimitOrder(
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    limitPrice: number
  ): Promise<FuturesOrderResponse> {
    const orderData = {
      orderType: 'lmt',
      symbol: symbol,
      side: side,
      size: size.toString(),
      limitPrice: limitPrice.toString()
    };

    try {
      const response = await this.authenticatedRequest('/sendorder', orderData);

      return {
        result: response.result,
        orderId: response.sendStatus?.order_id,
        error: response.error
      };
    } catch (error: any) {
      return {
        result: 'error',
        error: error.message
      };
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const response = await this.authenticatedRequest('/cancelorder', {
        order_id: orderId
      });

      return response.result === 'success';
    } catch (error: any) {
      console.error(`❌ Failed to cancel order ${orderId}:`, error.message);
      return false;
    }
  }

  /**
   * Get order history
   */
  async getOrderHistory(): Promise<any[]> {
    try {
      const response = await this.authenticatedRequest('/recentorders');
      return response.orders || [];
    } catch (error: any) {
      console.error('❌ Failed to get order history:', error.message);
      return [];
    }
  }

  /**
   * Close a position (market order in opposite direction)
   */
  async closePosition(symbol: string, side: 'long' | 'short', size: number): Promise<FuturesOrderResponse> {
    // To close a long, we sell; to close a short, we buy
    const closeSide = side === 'long' ? 'sell' : 'buy';

    return this.placeMarketOrder(symbol, closeSide, size);
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const instruments = await this.getInstruments();
      return instruments.length > 0;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
let futuresClientInstance: KrakenFuturesClient | null = null;

export function getKrakenFuturesClient(isDemo: boolean = false): KrakenFuturesClient {
  if (!futuresClientInstance) {
    futuresClientInstance = new KrakenFuturesClient(
      process.env.KRAKEN_FUTURES_API_KEY,
      process.env.KRAKEN_FUTURES_API_SECRET,
      isDemo
    );
  }
  return futuresClientInstance;
}
