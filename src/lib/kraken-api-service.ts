import { TRADING_CONFIG } from './config';

class KrakenApiService {
  private apiKey: string | null = null;
  private apiSecret: string | null = null;
  private isAuthenticated = false;
  private requestQueue: Promise<any> = Promise.resolve();
  private lastRequestTime = 0;

  async authenticate(apiKey: string, apiSecret: string): Promise<boolean> {
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;

        // Try to make a test call to verify credentials
        const accountInfo = await this.getAccountBalance();
        if (accountInfo) {
          this.isAuthenticated = true;
          console.log(`✅ Kraken authentication successful on attempt ${attempt}`);
          return true;
        }
        return false;
      } catch (error: any) {
        lastError = error;
        console.error(`Authentication attempt ${attempt} failed:`, error?.message || error);
        
        // If rate limited, wait longer before retry
        if (error?.message?.includes('Rate limit')) {
          const waitTime = Math.min(30000, attempt * 10000); // 10s, 20s, 30s
          console.log(`⏳ Rate limited - waiting ${waitTime/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // Regular retry with exponential backoff
          const waitTime = Math.min(5000, attempt * 2000); // 2s, 4s, 5s
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    console.error(`❌ Authentication failed after ${maxRetries} attempts:`, lastError);
    this.isAuthenticated = false;
    return false;
  }

  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    const currentRequest = this.requestQueue.then(async () => {
      // Enforce rate limiting based on config
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const minDelay = TRADING_CONFIG.KRAKEN_API.REQUEST_RATE_LIMIT;
      if (timeSinceLastRequest < minDelay) {
        await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
      }

      const result = await requestFn();
      this.lastRequestTime = Date.now();
      return result;
    });

    this.requestQueue = currentRequest.catch(() => {}); // Don't let failed requests break the queue
    return currentRequest;
  }

  private async makeRequest(endpoint: string, params: any = {}): Promise<any> {
    return this.queueRequest(async () => {
      console.log(`🔄 Kraken Proxy: Making API call to ${endpoint}`, {
        hasApiKey: !!this.apiKey,
        hasApiSecret: !!this.apiSecret,
        endpoint,
        params
      });

      try {
        if (!this.apiKey || !this.apiSecret) {
          throw new Error('API credentials not set');
        }

        // Use the working proxy server approach
        const requestBody = {
          endpoint,
          params: params || {},
          apiKey: this.apiKey,
          apiSecret: this.apiSecret,
        };

        console.log(`🔄 Kraken Proxy: Request for ${endpoint}`);

        const response = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log(`🔄 Kraken Proxy: Response status ${response.status} for ${endpoint}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`🔄 Kraken Proxy: Failed with ${response.status}:`, errorText);
          throw new Error(`Proxy request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`✅ Kraken Proxy: SUCCESS for ${endpoint}`);

        // Check for Kraken API errors
        if (data.error && data.error.length > 0) {
          console.error(`🔄 Kraken Proxy: Kraken returned errors for ${endpoint}:`, data.error);
          throw new Error(`Kraken API error: ${data.error.join(', ')}`);
        }

        return data;
      } catch (error) {
        console.error(`❌ Kraken Proxy: FAILED for ${endpoint}:`, error);
        throw new Error(`Proxy API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  private getMockData(endpoint: string): any {
    const mockData: { [key: string]: any } = {
      'Balance': {
        result: {
          XXBT: '1.25847392',
          ZUSD: '15234.67',
          XETH: '8.50492817',
          XXRP: '2500.00000000',
          XLTC: '15.75000000',
          XDOGE: '10000.00000000'
        }
      },
      'OpenOrders': {
        result: {
          open: {
            'O7QAFX-DYHRG-BTPVEM': {
              refid: null,
              userref: 0,
              status: 'open',
              opentm: 1699877234.1234,
              starttm: 0,
              expiretm: 0,
              descr: {
                pair: 'XBTUSD',
                type: 'buy',
                ordertype: 'limit',
                price: '35000.0',
                price2: '0',
                leverage: 'none',
                order: 'buy 0.1 XBTUSD @ limit 35000.0',
                close: ''
              },
              vol: '0.10000000',
              vol_exec: '0.00000000',
              cost: '0.00000000',
              fee: '0.00000000',
              price: '0.00000000',
              stopprice: '0.00000000',
              limitprice: '0.00000000',
              misc: '',
              oflags: 'fciq',
              trades: []
            },
            'A8XBCR-ZYKDE-MNVHJT': {
              refid: null,
              userref: 0,
              status: 'open',
              opentm: 1699876534.5678,
              starttm: 0,
              expiretm: 0,
              descr: {
                pair: 'ETHUSD',
                type: 'sell',
                ordertype: 'limit',
                price: '2200.0',
                price2: '0',
                leverage: 'none',
                order: 'sell 2.0 ETHUSD @ limit 2200.0',
                close: ''
              },
              vol: '2.00000000',
              vol_exec: '0.00000000',
              cost: '0.00000000',
              fee: '0.00000000',
              price: '0.00000000',
              stopprice: '0.00000000',
              limitprice: '0.00000000',
              misc: '',
              oflags: 'fciq',
              trades: []
            }
          }
        }
      },
      'TradesHistory': {
        result: {
          trades: {
            'TGBHKL-MNOPQ-RSTUVW': {
              ordertxid: 'ORDERID1',
              postxid: 'TKH2SE-M7IF5-CFI7AT',
              pair: 'XBTUSD',
              time: 1699870000.1234,
              type: 'buy',
              ordertype: 'market',
              price: '36500.0',
              cost: '3650.00',
              fee: '9.49',
              vol: '0.10000000',
              margin: '0.00000000',
              misc: ''
            },
            'HIJKLM-NOPQR-STUVWX': {
              ordertxid: 'ORDERID2',
              postxid: 'TKH2SE-M7IF5-CFI7BS',
              pair: 'ETHUSD',
              time: 1699869000.5678,
              type: 'sell',
              ordertype: 'limit',
              price: '2150.0',
              cost: '4300.00',
              fee: '11.18',
              vol: '2.00000000',
              margin: '0.00000000',
              misc: ''
            },
            'ABCDEF-GHIJK-LMNOPQ': {
              ordertxid: 'ORDERID3',
              postxid: 'TKH2SE-M7IF5-CFI7CT',
              pair: 'XRPUSD',
              time: 1699868000.9012,
              type: 'buy',
              ordertype: 'market',
              price: '0.65',
              cost: '1625.00',
              fee: '4.23',
              vol: '2500.00000000',
              margin: '0.00000000',
              misc: ''
            }
          },
          count: 3
        }
      }
    };

    return mockData[endpoint] || { result: {} };
  }

  async getAccountBalance(): Promise<any> {
    return this.makeRequest('Balance');
  }

  async getOpenOrders(): Promise<any> {
    return this.makeRequest('OpenOrders');
  }

  async getTradesHistory(): Promise<any> {
    return this.makeRequest('TradesHistory');
  }

  async getAccountInfo(): Promise<any> {
    console.log('🔍 KrakenAPI: Getting account info...');
    
    const balance = await this.getAccountBalance();
    console.log('🔍 KrakenAPI: Raw balance response:', balance);
    
    const openOrders = await this.getOpenOrders();
    const tradesHistory = await this.getTradesHistory();

    const result = {
      balance: balance.result || {},
      openOrders: openOrders.result?.open || {},
      tradesHistory: tradesHistory.result?.trades || {},
      tradesCount: tradesHistory.result?.count || 0
    };
    
    console.log('🔍 KrakenAPI: Final account info:', result);
    return result;
  }

  disconnect(): void {
    this.apiKey = null;
    this.apiSecret = null;
    this.isAuthenticated = false;
  }

  async placeOrder(params: {
    pair: string;
    type: 'buy' | 'sell';
    ordertype: 'market' | 'limit';
    volume: string;
    price?: string;
    leverage?: string;
    validate?: boolean;
  }): Promise<any> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with Kraken API');
    }

    console.log(`🔥 Kraken API: Placing ${params.validate ? 'TEST' : 'LIVE'} order:`, params);

    // 💰 CASH VALIDATION: Check USD availability for buy orders
    if (params.type === 'buy' && !params.validate) {
      try {
        const balance = await this.getAccountBalance();
        const usdCash = parseFloat(balance?.result?.ZUSD || '0') + parseFloat(balance?.result?.USDT || '0');
        const estimatedOrderValue = parseFloat(params.volume) * (parseFloat(params.price || '0') || 50); // Conservative estimate
        
        console.log(`💰 USD Cash Check: Available $${usdCash.toFixed(2)}, Order needs ~$${estimatedOrderValue.toFixed(2)}`);
        
        if (usdCash < estimatedOrderValue) {
          const error = new Error(`Insufficient USD cash: $${usdCash.toFixed(2)} available, $${estimatedOrderValue.toFixed(2)} required`);
          console.error(`❌ ${error.message}`);
          throw error;
        }
        
        console.log(`✅ Cash validation passed: Sufficient USD for buy order`);
      } catch (error) {
        if (error.message.includes('Insufficient USD')) {
          throw error; // Re-throw cash validation errors
        }
        console.log(`⚠️ Cash validation failed (API error), proceeding: ${error.message}`);
      }
    }

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
      const result = await this.makeRequest('AddOrder', orderParams);
      console.log(`🔥 Kraken API: Order result:`, result);
      return result;
    } catch (error) {
      console.error(`🔥 Kraken API: Order placement failed:`, error);
      throw error;
    }
  }

  async cancelOrder(txid: string): Promise<any> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with Kraken API');
    }

    console.log(`🔥 Kraken API: Cancelling order:`, txid);
    return this.makeRequest('CancelOrder', { txid });
  }

  async getClosedOrders(): Promise<any> {
    return this.makeRequest('ClosedOrders');
  }

  async getOrderInfo(txid: string): Promise<any> {
    return this.makeRequest('QueryOrders', { txid });
  }

  getConnectionStatus(): boolean {
    return this.isAuthenticated;
  }
}

export const krakenApiService = new KrakenApiService();
