import { TRADING_CONFIG } from './config';

export interface MarginOrderParams {
  pair: string;
  type: 'buy' | 'sell';  // buy = LONG, sell = SHORT
  ordertype: 'market' | 'limit';
  volume: string;
  price?: string;
  leverage?: string;  // 'none' for 1x, '2' for 2x, etc.
  validate?: boolean; // Validate only, don't place
}

export class KrakenMarginService {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = process.env.KRAKEN_API_KEY || '';
    this.apiSecret = process.env.KRAKEN_API_SECRET || process.env.KRAKEN_PRIVATE_KEY || '';
  }

  async placeMarginOrder(params: MarginOrderParams): Promise<any> {
    const crypto = await import('crypto');

    // Default to no leverage (1x) for safety
    if (!params.leverage) {
      params.leverage = 'none';
    }

    const endpoint = '/0/private/AddOrder';
    const nonce = Date.now() * 1000;

    const postData = new URLSearchParams({
      nonce: nonce.toString(),
      pair: params.pair,
      type: params.type,
      ordertype: params.ordertype,
      volume: params.volume,
      leverage: params.leverage,
      ...(params.price && { price: params.price }),
      ...(params.validate && { validate: 'true' })
    }).toString();

    // Create signature
    const message = postData + nonce + endpoint;
    const hash = crypto.createHash('sha256').update(message).digest();
    const hmac = crypto.createHmac('sha512', Buffer.from(this.apiSecret, 'base64'));
    hmac.update(endpoint, 'binary');
    hmac.update(hash, 'binary');
    const signature = hmac.digest('base64');

    // Make request
    const response = await fetch(`https://api.kraken.com${endpoint}`, {
      method: 'POST',
      headers: {
        'API-Key': this.apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: postData
    });

    const result = await response.json();

    if (result.error?.length > 0) {
      console.error('❌ Margin order error:', result.error);
      throw new Error(result.error[0]);
    }

    return result;
  }

  async getMarginBalance(): Promise<any> {
    const crypto = await import('crypto');

    const endpoint = '/0/private/TradeBalance';
    const nonce = Date.now() * 1000;

    const postData = new URLSearchParams({
      nonce: nonce.toString(),
      asset: 'ZUSD'
    }).toString();

    // Create signature
    const message = postData + nonce + endpoint;
    const hash = crypto.createHash('sha256').update(message).digest();
    const hmac = crypto.createHmac('sha512', Buffer.from(this.apiSecret, 'base64'));
    hmac.update(endpoint, 'binary');
    hmac.update(hash, 'binary');
    const signature = hmac.digest('base64');

    // Make request
    const response = await fetch(`https://api.kraken.com${endpoint}`, {
      method: 'POST',
      headers: {
        'API-Key': this.apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: postData
    });

    const result = await response.json();

    if (result.error?.length > 0) {
      console.error('❌ Margin balance error:', result.error);
      return null;
    }

    return result.result;
  }
}

export const krakenMarginService = new KrakenMarginService();
