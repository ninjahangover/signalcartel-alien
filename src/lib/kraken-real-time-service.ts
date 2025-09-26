/**
 * KRAKEN REAL-TIME TRADING DATA SERVICE
 * Real-time price feeds for active positions only
 * Uses WebSocket for sub-second price updates during trading
 */

import { priceLogger } from './price-logger';
import { krakenPairValidator } from './kraken-pair-validator';

interface KrakenTicker {
  c: [string, string]; // Last trade closed array, price, lot volume
  a: [string, string, string]; // Ask array, price, whole lot volume, lot volume
  b: [string, string, string]; // Bid array, price, whole lot volume, lot volume
  v: [string, string]; // Volume array, today, last 24 hours
  p: [string, string]; // Volume weighted average price array, today, last 24 hours
  t: [number, number]; // Number of trades array, today, last 24 hours
  l: [string, string]; // Low array, today, last 24 hours
  h: [string, string]; // High array, today, last 24 hours
  o: string; // Today's opening price
}

interface RealTimePrice {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: Date;
  volume24h: number;
  high24h: number;
  low24h: number;
  spread: number;
}

class KrakenRealTimeService {
  private ws: WebSocket | null = null;
  private subscriptions = new Set<string>();
  private priceCache = new Map<string, RealTimePrice>();
  private lastRestApiCall = 0;
  private readonly REST_API_RATE_LIMIT = 1000; // 1 second between REST calls
  
  constructor() {
    console.log('🔥 Kraken Real-Time Service initialized');
  }

  /**
   * Get current real-time price for active trading pairs
   * Uses WebSocket if available, falls back to REST API with rate limiting
   */
  async getRealTimePrice(symbol: string): Promise<RealTimePrice | null> {
    try {
      // Check cache first (WebSocket updates this)
      const cached = this.priceCache.get(symbol);
      if (cached && (Date.now() - cached.timestamp.getTime()) < 5000) { // 5 second freshness
        return cached;
      }

      // Subscribe to WebSocket for this symbol if not already subscribed
      await this.subscribeToSymbol(symbol);

      // If WebSocket not connected or no recent data, use REST API
      return await this.fetchFromRestAPI(symbol);
      
    } catch (error) {
      console.error(`❌ Failed to get real-time price for ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Start real-time WebSocket connection for active positions
   */
  async connectWebSocket(activeSymbols: string[]): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      console.log('🔗 Connecting to Kraken WebSocket for real-time data...');
      
      this.ws = new WebSocket('wss://ws.kraken.com/');
      
      this.ws.onopen = () => {
        console.log('✅ Kraken WebSocket connected');
        // Subscribe to all active symbols
        activeSymbols.forEach(symbol => this.subscribeToSymbol(symbol));
      };

      this.ws.onmessage = (event) => {
        // Handle async WebSocket messages
        this.handleWebSocketMessage(event.data).catch(error => {
          console.error('❌ Error handling WebSocket message:', error);
        });
      };

      this.ws.onclose = () => {
        console.log('🔌 Kraken WebSocket disconnected - will reconnect on next request');
        this.ws = null;
      };

      this.ws.onerror = (error) => {
        console.error('❌ Kraken WebSocket error:', error);
      };

    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error);
    }
  }

  /**
   * Subscribe to real-time ticker for a symbol
   */
  private async subscribeToSymbol(symbol: string): Promise<void> {
    if (this.subscriptions.has(symbol)) {
      return; // Already subscribed
    }

    const krakenPair = await krakenPairValidator.getKrakenPair(symbol);
    if (!krakenPair) {
      console.warn(`⚠️ Cannot map ${symbol} to Kraken pair`);
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscription = {
        event: 'subscribe',
        pair: [krakenPair],
        subscription: { name: 'ticker' }
      };

      this.ws.send(JSON.stringify(subscription));
      this.subscriptions.add(symbol);
      console.log(`📡 Subscribed to real-time data for ${symbol} (${krakenPair})`);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleWebSocketMessage(data: string): Promise<void> {
    try {
      const message = JSON.parse(data);

      // Handle ticker updates
      if (Array.isArray(message) && message.length >= 4) {
        const [channelID, tickerData, channelName, pair] = message;

        if (channelName === 'ticker') {
          const symbol = await krakenPairValidator.getSymbolFromKrakenPair(pair);
          if (symbol && typeof tickerData === 'object') {
            this.updatePriceCache(symbol, tickerData);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }

  /**
   * Update price cache with WebSocket data
   */
  private updatePriceCache(symbol: string, tickerData: any): void {
    try {
      const price = parseFloat(tickerData.c?.[0] || '0');
      const bid = parseFloat(tickerData.b?.[0] || '0');
      const ask = parseFloat(tickerData.a?.[0] || '0');
      
      if (price > 0) {
        const priceData: RealTimePrice = {
          symbol,
          price,
          bid,
          ask,
          timestamp: new Date(),
          volume24h: parseFloat(tickerData.v?.[1] || '0'),
          high24h: parseFloat(tickerData.h?.[1] || '0'),
          low24h: parseFloat(tickerData.l?.[1] || '0'),
          spread: ask - bid
        };

        this.priceCache.set(symbol, priceData);
        console.log(`⚡ Updated ${symbol}: $${price.toFixed(6)} (spread: $${priceData.spread.toFixed(6)})`);
      }
    } catch (error) {
      console.error(`❌ Error updating price cache for ${symbol}:`, error);
    }
  }

  /**
   * Fetch from REST API with rate limiting
   */
  private async fetchFromRestAPI(symbol: string): Promise<RealTimePrice | null> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastRestApiCall;
    
    // Rate limit: Max 1 call per second
    if (timeSinceLastCall < this.REST_API_RATE_LIMIT) {
      await new Promise(resolve => setTimeout(resolve, this.REST_API_RATE_LIMIT - timeSinceLastCall));
    }

    try {
      const krakenPair = await krakenPairValidator.getKrakenPair(symbol);
      if (!krakenPair) {
        return null;
      }

      priceLogger.info(`📊 Fetching ${symbol} from Kraken REST API...`);
      this.lastRestApiCall = Date.now();
      
      const response = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${krakenPair}`, {
        headers: {
          'User-Agent': 'SignalCartel-Trading-Bot/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Kraken API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error && data.error.length > 0) {
        throw new Error(`Kraken API error: ${data.error[0]}`);
      }

      const tickerKey = Object.keys(data.result || {})[0];
      if (!tickerKey) {
        throw new Error('No ticker data returned');
      }

      const ticker: KrakenTicker = data.result[tickerKey];
      const price = parseFloat(ticker.c[0]);
      const bid = parseFloat(ticker.b[0]);
      const ask = parseFloat(ticker.a[0]);

      const priceData: RealTimePrice = {
        symbol,
        price,
        bid,
        ask,
        timestamp: new Date(),
        volume24h: parseFloat(ticker.v[1]),
        high24h: parseFloat(ticker.h[1]),
        low24h: parseFloat(ticker.l[1]),
        spread: ask - bid
      };

      // Cache for WebSocket fallback
      this.priceCache.set(symbol, priceData);
      
      priceLogger.success(`✅ ${symbol}: $${price.toFixed(6)} (REST API)`);
      return priceData;

    } catch (error) {
      console.error(`❌ REST API fetch failed for ${symbol}: ${error.message}`);
      return null;
    }
  }

  // Old hardcoded mapping functions removed - now using dynamic KrakenPairValidator

  /**
   * Check if we have access to authenticated endpoints
   */
  async checkAccountAccess(): Promise<boolean> {
    // For now, we're using public endpoints only
    // TODO: Add API key authentication for private trading endpoints
    console.log('📋 Using public Kraken endpoints - authenticated trading not yet configured');
    return false;
  }

  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.subscriptions.clear();
      console.log('🔌 Kraken WebSocket disconnected');
    }
  }
}

export const krakenRealTimeService = new KrakenRealTimeService();
export default krakenRealTimeService;