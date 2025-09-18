import crypto from 'crypto';

interface FuturesOrderParams {
  symbol: string;      // e.g., 'PI_XBTUSD' for BTC perpetual
  side: 'buy' | 'sell'; // buy = LONG, sell = SHORT
  orderType: 'lmt' | 'mkt';
  size: number;        // Contract size
  limitPrice?: number;
  reduceOnly?: boolean;
}

export class KrakenFuturesService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://futures.kraken.com';

  constructor() {
    this.apiKey = process.env.KRAKEN_API_KEY || '';
    this.apiSecret = process.env.KRAKEN_API_SECRET || process.env.KRAKEN_PRIVATE_KEY || '';
  }

  private createAuthHeaders(endpoint: string, postData: string = ''): Record<string, string> {
    const nonce = Date.now().toString();
    const message = postData + nonce + endpoint;

    const hash = crypto
      .createHmac('sha256', Buffer.from(this.apiSecret, 'base64'))
      .update(message)
      .digest('base64');

    return {
      'APIKey': this.apiKey,
      'Nonce': nonce,
      'Authent': hash,
      'Content-Type': 'application/x-www-form-urlencoded'
    };
  }

  async getAccounts(): Promise<any> {
    const endpoint = '/derivatives/api/v3/accounts';
    const headers = this.createAuthHeaders(endpoint);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers
      });

      const data = await response.json();

      if (data.result === 'success') {
        console.log('✅ Futures account connected');
        return data.accounts;
      } else {
        console.error('❌ Futures account error:', data.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to get futures accounts:', error);
      return null;
    }
  }

  async getWallets(): Promise<any> {
    const endpoint = '/derivatives/api/v3/wallets';
    const headers = this.createAuthHeaders(endpoint);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers
      });

      const data = await response.json();

      if (data.result === 'success') {
        return data.wallets;
      } else {
        console.error('❌ Wallets error:', data.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to get wallets:', error);
      return null;
    }
  }

  async placeOrder(params: FuturesOrderParams): Promise<any> {
    const endpoint = '/derivatives/api/v3/sendorder';

    const orderData = new URLSearchParams({
      orderType: params.orderType,
      symbol: params.symbol,
      side: params.side,
      size: params.size.toString(),
      ...(params.limitPrice && { limitPrice: params.limitPrice.toString() }),
      ...(params.reduceOnly && { reduceOnly: 'true' })
    }).toString();

    const headers = this.createAuthHeaders(endpoint, orderData);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: orderData
      });

      const data = await response.json();

      if (data.result === 'success') {
        console.log('✅ Futures order placed:', data.sendStatus);
        return data.sendStatus;
      } else {
        console.error('❌ Order error:', data.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to place order:', error);
      return null;
    }
  }

  async getOpenPositions(): Promise<any> {
    const endpoint = '/derivatives/api/v3/openpositions';
    const headers = this.createAuthHeaders(endpoint);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers
      });

      const data = await response.json();

      if (data.result === 'success') {
        return data.openPositions || [];
      } else {
        console.error('❌ Positions error:', data.error);
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to get positions:', error);
      return [];
    }
  }

  async getTickers(): Promise<any> {
    // Public endpoint - no auth needed
    try {
      const response = await fetch(`${this.baseUrl}/derivatives/api/v3/tickers`);
      const data = await response.json();

      if (data.result === 'success') {
        return data.tickers;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get tickers:', error);
      return null;
    }
  }

  // Convert spot symbol to futures symbol
  convertToFuturesSymbol(spotSymbol: string): string {
    const symbolMap: Record<string, string> = {
      'BTCUSD': 'PI_XBTUSD',    // BTC perpetual
      'ETHUSD': 'PI_ETHUSD',    // ETH perpetual
      'SOLUSD': 'PI_SOLUSD',    // SOL perpetual
      'AVAXUSD': 'PI_AVAXUSD',  // AVAX perpetual
      'ADAUSD': 'PI_ADAUSD',    // ADA perpetual
      'DOTUSD': 'PI_DOTUSD',    // DOT perpetual
      'MATICUSD': 'PI_MATICUSD', // MATIC perpetual
      'LINKUSD': 'PI_LINKUSD',  // LINK perpetual
      'UNIUSD': 'PI_UNIUSD',    // UNI perpetual
      'LTCUSD': 'PI_LTCUSD',    // LTC perpetual
    };

    return symbolMap[spotSymbol] || spotSymbol;
  }

  // Calculate position size based on USD value and current price
  async calculateContractSize(symbol: string, usdValue: number): Promise<number> {
    const tickers = await this.getTickers();
    if (!tickers) return 0;

    const ticker = tickers.find((t: any) => t.symbol === symbol);
    if (!ticker) return 0;

    const price = parseFloat(ticker.last);

    // For BTC perpetuals, 1 contract = 1 USD
    // For other perpetuals, check the contract multiplier
    if (symbol === 'PI_XBTUSD') {
      return Math.floor(usdValue); // 1 contract = 1 USD
    } else {
      // Most other perpetuals: 1 contract = 1 unit of the asset
      return parseFloat((usdValue / price).toFixed(4));
    }
  }
}

export const krakenFuturesService = new KrakenFuturesService();