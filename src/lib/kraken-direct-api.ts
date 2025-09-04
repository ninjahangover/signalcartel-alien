/**
 * Direct Kraken API Client - No Proxy Required
 * Connects directly to Kraken API using official endpoints
 */

import * as crypto from 'crypto';
import axios from 'axios';

export class KrakenDirectAPI {
  private apiKey: string;
  private apiSecret: string;
  private apiUrl = 'https://api.kraken.com';
  private lastRequestTime = 0;
  private requestDelay = 2000; // 2 second rate limit

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  private getMessageSignature(path: string, request: any, secret: string, nonce: number) {
    const message = request;
    const secret_buffer = Buffer.from(secret, 'base64');
    const hash = crypto.createHash('sha256');
    const hmac = crypto.createHmac('sha512', secret_buffer);
    const hash_digest = hash.update(nonce + message).digest();
    const hmac_digest = hmac.update(path + hash_digest, 'binary').digest('base64');
    return hmac_digest;
  }

  async publicMethod(method: string, params: any = {}) {
    await this.rateLimit();
    
    try {
      const url = `${this.apiUrl}/0/public/${method}`;
      const response = await axios.get(url, { params });
      
      if (response.data.error && response.data.error.length > 0) {
        throw new Error(`Kraken API Error: ${response.data.error.join(', ')}`);
      }
      
      return response.data.result;
    } catch (error: any) {
      console.error(`❌ Kraken public API error (${method}):`, error.message);
      throw error;
    }
  }

  async privateMethod(method: string, params: any = {}) {
    await this.rateLimit();
    
    try {
      if (!this.apiKey || !this.apiSecret) {
        throw new Error('API credentials not set');
      }

      const path = `/0/private/${method}`;
      const url = `${this.apiUrl}${path}`;
      const nonce = new Date().getTime() * 1000;

      const postData = new URLSearchParams({
        nonce: nonce.toString(),
        ...params
      }).toString();

      const signature = this.getMessageSignature(path, postData, this.apiSecret, nonce);

      const headers = {
        'API-Key': this.apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      const response = await axios.post(url, postData, { headers });

      if (response.data.error && response.data.error.length > 0) {
        throw new Error(`Kraken API Error: ${response.data.error.join(', ')}`);
      }

      return response.data;
    } catch (error: any) {
      console.error(`❌ Kraken private API error (${method}):`, error.message);
      throw error;
    }
  }

  async authenticate(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      this.apiKey = apiKey;
      this.apiSecret = apiSecret;
      
      // Test authentication with balance call
      const balance = await this.getAccountBalance();
      return balance && balance.result !== undefined;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  async getAccountBalance() {
    return this.privateMethod('Balance');
  }

  async getOpenOrders() {
    return this.privateMethod('OpenOrders');
  }

  async getClosedOrders() {
    return this.privateMethod('ClosedOrders');
  }

  async getTradesHistory() {
    return this.privateMethod('TradesHistory');
  }

  async getAccountInfo() {
    console.log('🔍 KrakenAPI: Getting account info...');
    
    const [balance, openOrders, tradesHistory] = await Promise.all([
      this.getAccountBalance(),
      this.getOpenOrders(),
      this.getTradesHistory()
    ]);

    const result = {
      balance: balance.result || {},
      openOrders: openOrders.result?.open || {},
      tradesHistory: tradesHistory.result?.trades || {},
      tradesCount: tradesHistory.result?.count || 0
    };
    
    console.log('🔍 KrakenAPI: Final account info:', result);
    return result;
  }

  async placeOrder(params: {
    pair: string;
    type: 'buy' | 'sell';
    ordertype: 'market' | 'limit';
    volume: string;
    price?: string;
    leverage?: string;
    validate?: boolean;
  }) {
    console.log(`🔥 Kraken Direct API: Placing ${params.validate ? 'TEST' : 'LIVE'} order:`, params);

    const orderParams: Record<string, string> = {
      pair: params.pair,
      type: params.type,
      ordertype: params.ordertype,
      volume: params.volume,
    };

    if (params.price && params.ordertype === 'limit') {
      orderParams.price = params.price;
    }

    if (params.leverage) {
      orderParams.leverage = params.leverage;
    }

    if (params.validate) {
      orderParams.validate = 'true';
    }

    try {
      const result = await this.privateMethod('AddOrder', orderParams);
      console.log(`✅ Kraken Direct API: Order ${params.validate ? 'validated' : 'placed'} successfully:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Kraken Direct API: Order failed:`, error);
      throw error;
    }
  }

  async cancelOrder(txid: string) {
    console.log(`🔥 Kraken Direct API: Cancelling order:`, txid);
    return this.privateMethod('CancelOrder', { txid });
  }

  async getOrderInfo(txid: string) {
    return this.privateMethod('QueryOrders', { txid });
  }

  getConnectionStatus(): boolean {
    return !!this.apiKey && !!this.apiSecret;
  }

  disconnect(): void {
    this.apiKey = '';
    this.apiSecret = '';
  }
}

// Export singleton instance
export const krakenDirectAPI = new KrakenDirectAPI(
  process.env.KRAKEN_API_KEY || '',
  process.env.KRAKEN_PRIVATE_KEY || ''
);