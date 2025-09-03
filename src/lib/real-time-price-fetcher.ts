/**
 * Real-Time Price Fetcher
 * 
 * ONLY fetches REAL prices from REAL APIs
 * NO MOCK DATA - if APIs fail, we show that clearly
 */

export interface RealPriceData {
  symbol: string;
  price: number;
  timestamp: Date;
  source: string;
  success: boolean;
  error?: string;
}

interface PriceRange {
  min: number;
  max: number;
}

// Price validation ranges (realistic price bounds for major cryptocurrencies)
// Includes both USD and USDT pairs for comprehensive coverage
const PRICE_VALIDATION_RANGES: { [symbol: string]: PriceRange } = {
  // Major cryptocurrencies (USD and USDT)
  'BTCUSD': { min: 20000, max: 200000 },      'BTCUSDT': { min: 20000, max: 200000 },
  'ETHUSD': { min: 1000, max: 50000 },        'ETHUSDT': { min: 1000, max: 50000 },
  'BNBUSD': { min: 200, max: 2000 },          'BNBUSDT': { min: 200, max: 2000 },
  'SOLUSD': { min: 10, max: 1000 },           'SOLUSDT': { min: 10, max: 1000 },
  'XRPUSD': { min: 0.1, max: 50 },            'XRPUSDT': { min: 0.1, max: 50 },
  'ADAUSD': { min: 0.1, max: 10 },            'ADAUSDT': { min: 0.1, max: 10 },
  'AVAXUSD': { min: 5, max: 500 },            'AVAXUSDT': { min: 5, max: 500 },
  'LINKUSD': { min: 2, max: 200 },            'LINKUSDT': { min: 2, max: 200 },
  'MATICUSD': { min: 0.1, max: 10 },          'MATICUSDT': { min: 0.1, max: 10 },
  'POLUSD': { min: 0.1, max: 10 },            'POLUSDT': { min: 0.1, max: 10 },
  'DOGEUSD': { min: 0.01, max: 5 },           'DOGEUSDT': { min: 0.01, max: 5 },
  'TRXUSD': { min: 0.01, max: 1 },            'TRXUSDT': { min: 0.01, max: 1 },
  
  // Layer 1 & Layer 2 tokens
  'DOTUSD': { min: 2, max: 100 },             'DOTUSDT': { min: 2, max: 100 },
  'ATOMUSD': { min: 2, max: 100 },            'ATOMUSDT': { min: 2, max: 100 },
  'NEARUSD': { min: 0.5, max: 50 },           'NEARUSDT': { min: 0.5, max: 50 },
  'ALGOUSD': { min: 0.05, max: 5 },           'ALGOUSDT': { min: 0.05, max: 5 },
  'FTMUSD': { min: 0.1, max: 10 },            'FTMUSDT': { min: 0.1, max: 10 },
  'ONEUSD': { min: 0.005, max: 1 },           'ONEUSDT': { min: 0.005, max: 1 },
  'LUNAУSD': { min: 0.01, max: 100 },         'LUNAUSDT': { min: 0.01, max: 100 },
  'ICPUSD': { min: 2, max: 500 },             'ICPUSDT': { min: 2, max: 500 },
  
  // DeFi tokens
  'UNIUSD': { min: 2, max: 100 },             'UNIUSDT': { min: 2, max: 100 },
  'AAVEUSD': { min: 20, max: 1000 },          'AAVEUSDT': { min: 20, max: 1000 },
  'SUSHIUSD': { min: 0.2, max: 20 },          'SUSHIUSDT': { min: 0.2, max: 20 },
  'COMPUSD': { min: 10, max: 1000 },          'COMPUSDT': { min: 10, max: 1000 },
  'CRVUSD': { min: 0.1, max: 10 },            'CRVUSDT': { min: 0.1, max: 10 },
  'YFIUSD': { min: 1000, max: 100000 },       'YFIUSDT': { min: 1000, max: 100000 },
  '1INCHUSD': { min: 0.1, max: 10 },          '1INCHUSDT': { min: 0.1, max: 10 },
  
  // Meme & Community tokens
  'SHIBУSD': { min: 0.000005, max: 0.01 },    'SHIBUSDT': { min: 0.000005, max: 0.01 },
  'PEPEUSD': { min: 0.0000001, max: 0.001 },  'PEPEUSDT': { min: 0.0000001, max: 0.001 },
  'FLOKIUSD': { min: 0.00001, max: 0.01 },    'FLOKIUSDT': { min: 0.00001, max: 0.01 },
  'BONKUSD': { min: 0.0000001, max: 0.01 },   'BONKUSDT': { min: 0.0000001, max: 0.01 },
  'PENGUUSD': { min: 0.001, max: 1 },         'PENGUUSDT': { min: 0.001, max: 1 },
  
  // AI & Gaming tokens
  'FETUSD': { min: 0.1, max: 10 },            'FETUSDT': { min: 0.1, max: 10 },
  'RENDRUSD': { min: 0.5, max: 50 },          'RENDRUSDT': { min: 0.5, max: 50 },
  'OCEANUSد': { min: 0.1, max: 10 },          'OCEANUSDT': { min: 0.1, max: 10 },
  'AXSUSD': { min: 1, max: 200 },             'AXSUSDT': { min: 1, max: 200 },
  'SANDUSD': { min: 0.1, max: 10 },           'SANDUSDT': { min: 0.1, max: 10 },
  'MANAUSD': { min: 0.1, max: 10 },           'MANAUSDT': { min: 0.1, max: 10 },
  
  // Exchange tokens
  'CAKEUSD': { min: 0.5, max: 50 },           'CAKEUSDT': { min: 0.5, max: 50 },
  'KNCUSD': { min: 0.2, max: 20 },            'KNCUSDT': { min: 0.2, max: 20 },
  
  // Stablecoins
  'USDCUSD': { min: 0.95, max: 1.05 },        'USDCUSDT': { min: 0.95, max: 1.05 },
  'DAIUSD': { min: 0.95, max: 1.05 },         'DAIUSDT': { min: 0.95, max: 1.05 },
  'BUSDUSD': { min: 0.95, max: 1.05 },        'BUSDUSDT': { min: 0.95, max: 1.05 },
  'FDUSD': { min: 0.95, max: 1.05 },          'FDUSDT': { min: 0.95, max: 1.05 },
  
  // Liquid staking & ETH variants
  'STETHUSD': { min: 1000, max: 50000 },      'STETHUSDT': { min: 1000, max: 50000 },
  'LTIUSD': { min: 1000, max: 50000 },        'LIDOUSDT': { min: 1000, max: 50000 },
  'RETHUSД': { min: 1000, max: 50000 },       'RETHUSDT': { min: 1000, max: 50000 },
  
  // Newer/emerging tokens (wider ranges for volatility)
  'DOLOUSD': { min: 0.0001, max: 10 },        'DOLOPUSDT': { min: 0.0001, max: 10 },
  'APTUSD': { min: 1, max: 100 },             'APTUSDT': { min: 1, max: 100 },
  'SUIUSD': { min: 0.2, max: 20 },            'SUIUSDT': { min: 0.2, max: 20 },
  'ARBUSD': { min: 0.2, max: 20 },            'ARBUSDT': { min: 0.2, max: 20 },
  'OPUSD': { min: 0.5, max: 50 },             'OPUSDT': { min: 0.5, max: 50 },
};

class RealTimePriceFetcher {
  private static instance: RealTimePriceFetcher | null = null;
  private cache: Map<string, { price: number; timestamp: Date }> = new Map();
  private readonly CACHE_DURATION = 300000; // 5 minutes cache (much longer for trading stability)
  
  // Circuit breaker for API failures
  private circuitBreakers: Map<string, {
    failures: number;
    lastFailure: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    nextAttempt: number;
  }> = new Map();
  
  // Rate limiting
  private lastCoinGeckoRequest: number = 0;
  private lastBinanceRequest: number = 0;
  private lastCryptoCompareRequest: number = 0;
  private readonly COINGECKO_RATE_LIMIT_MS = 20000; // 20 seconds between requests
  private readonly BINANCE_RATE_LIMIT_MS = 3000; // 3 seconds between requests
  private readonly CRYPTOCOMPARE_RATE_LIMIT_MS = 2000; // 2 seconds between requests
  
  // Circuit breaker thresholds
  private readonly CIRCUIT_BREAKER_THRESHOLD = 3; // Failures before opening circuit
  private readonly CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes before trying again
  private readonly MAX_BACKOFF = 60000; // Maximum backoff time (1 minute)

  private constructor() {
    this.initializeCircuitBreakers();
  }

  private initializeCircuitBreakers(): void {
    const apis = ['coingecko', 'binance', 'cryptocompare', 'coinbase'];
    apis.forEach(api => {
      this.circuitBreakers.set(api, {
        failures: 0,
        lastFailure: 0,
        state: 'CLOSED',
        nextAttempt: 0
      });
    });
  }

  private getCircuitBreakerState(api: string): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    const breaker = this.circuitBreakers.get(api);
    if (!breaker) return 'CLOSED';

    const now = Date.now();
    
    if (breaker.state === 'OPEN') {
      if (now >= breaker.nextAttempt) {
        breaker.state = 'HALF_OPEN';
        console.log(`🔓 Circuit breaker HALF_OPEN for ${api} - testing recovery`);
      }
    }
    
    return breaker.state;
  }

  private recordSuccess(api: string): void {
    const breaker = this.circuitBreakers.get(api);
    if (!breaker) return;
    
    breaker.failures = 0;
    breaker.state = 'CLOSED';
    console.log(`✅ Circuit breaker CLOSED for ${api} - API recovered`);
  }

  private recordFailure(api: string): void {
    const breaker = this.circuitBreakers.get(api);
    if (!breaker) return;
    
    const now = Date.now();
    breaker.failures += 1;
    breaker.lastFailure = now;
    
    if (breaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      breaker.state = 'OPEN';
      breaker.nextAttempt = now + this.CIRCUIT_BREAKER_TIMEOUT;
      console.warn(`🚨 Circuit breaker OPEN for ${api} - too many failures (${breaker.failures}), blocked for ${this.CIRCUIT_BREAKER_TIMEOUT / 1000}s`);
    }
  }

  private calculateExponentialBackoff(attempts: number): number {
    const baseDelay = 1000; // 1 second base
    const backoff = Math.min(baseDelay * Math.pow(2, attempts), this.MAX_BACKOFF);
    const jitter = Math.random() * 0.1 * backoff; // Add 10% jitter
    return backoff + jitter;
  }

  /**
   * Validate price against expected ranges to prevent data corruption
   */
  private validatePrice(symbol: string, price: number, source: string): boolean {
    // Basic validation
    if (!price || price <= 0 || !isFinite(price)) {
      console.error(`❌ Invalid price for ${symbol}: ${price} from ${source}`);
      return false;
    }

    // Range validation if we have expected ranges
    const range = PRICE_VALIDATION_RANGES[symbol];
    if (range) {
      if (price < range.min || price > range.max) {
        console.error(`❌ Price ${price} for ${symbol} outside expected range $${range.min}-$${range.max} from ${source}`);
        console.error(`🚨 POSSIBLE DATA CORRUPTION - rejecting this price!`);
        return false;
      }
    } else {
      // For unknown symbols, apply general sanity checks
      if (price > 500000) { // No crypto should be worth more than $500K
        console.error(`❌ Suspicious high price ${price} for ${symbol} from ${source} - rejecting`);
        return false;
      }
    }

    return true;
  }

  static getInstance(): RealTimePriceFetcher {
    if (!RealTimePriceFetcher.instance) {
      RealTimePriceFetcher.instance = new RealTimePriceFetcher();
    }
    return RealTimePriceFetcher.instance;
  }

  /**
   * Fetch REAL current price for a symbol
   * NO FALLBACKS TO FAKE DATA
   */
  async getCurrentPrice(symbol: string, forceRefresh: boolean = false): Promise<RealPriceData> {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION) {
        return {
          symbol,
          price: cached.price,
          timestamp: cached.timestamp,
          source: 'cache',
          success: true
        };
      }
    }

    console.log(`📊 Fetching REAL price data for ${symbol} with circuit breaker protection...`);
    
    // Try APIs with circuit breaker protection
    const apis = [
      { name: 'coingecko', fetch: () => this.fetchFromCoinGecko(symbol) },
      { name: 'binance', fetch: () => this.fetchFromBinance(symbol) },
      { name: 'cryptocompare', fetch: () => this.fetchFromCryptoCompare(symbol) }
    ];

    for (const api of apis) {
      const state = this.getCircuitBreakerState(api.name);
      
      if (state === 'OPEN') {
        console.log(`🚫 Skipping ${api.name} for ${symbol} - circuit breaker OPEN`);
        continue;
      }
      
      try {
        const result = await api.fetch();
        if (result.success) {
          this.recordSuccess(api.name);
          this.cache.set(symbol, { price: result.price, timestamp: new Date() });
          return result;
        } else {
          this.recordFailure(api.name);
          console.log(`⚠️ ${api.name} failed for ${symbol}: ${result.error}`);
        }
      } catch (error) {
        this.recordFailure(api.name);
        console.error(`💥 ${api.name} threw error for ${symbol}:`, error);
      }
    }

    // ALL PRIMARY APIS FAILED - Try emergency fallback if circuit allows
    const coinbaseState = this.getCircuitBreakerState('coinbase');
    if (coinbaseState !== 'OPEN') {
      console.warn(`⚠️ All primary APIs failed for ${symbol}. Trying emergency Coinbase fallback...`);
      
      try {
        const response = await fetch(`https://api.coinbase.com/v2/exchange-rates?currency=${symbol.replace('USD', '')}`, {
          timeout: 5000
        });
        
        if (response.ok) {
          const data = await response.json();
          const price = parseFloat(data?.data?.rates?.USD);
          
          if (price && price > 0) {
            if (!this.validatePrice(symbol, price, 'coinbase-emergency')) {
              console.error(`Emergency price validation failed for ${symbol}: $${price}`);
              this.recordFailure('coinbase');
            } else {
              console.log(`🆘 Emergency price from Coinbase: ${symbol} = $${price.toLocaleString()}`);
              this.recordSuccess('coinbase');
              this.cache.set(symbol, { price, timestamp: new Date() });
              return {
                symbol,
                price,
                timestamp: new Date(),
                source: 'coinbase-emergency',
                success: true
              };
            }
          }
        } else {
          this.recordFailure('coinbase');
        }
      } catch (error) {
        this.recordFailure('coinbase');
        console.error(`Emergency fallback also failed for ${symbol}:`, error);
      }
    } else {
      console.log(`🚫 Emergency Coinbase blocked by circuit breaker for ${symbol}`);
    }

    // Check if we can return stale cache data as absolute last resort
    const staleCache = this.cache.get(symbol);
    if (staleCache) {
      const ageMinutes = (Date.now() - staleCache.timestamp.getTime()) / (1000 * 60);
      if (ageMinutes < 60) { // Accept up to 1 hour old data in emergencies
        console.warn(`⚠️ All APIs failed for ${symbol}, returning stale cache data (${ageMinutes.toFixed(1)} min old)`);
        return {
          symbol,
          price: staleCache.price,
          timestamp: staleCache.timestamp,
          source: 'stale-cache',
          success: true
        };
      }
    }

    // TRULY ALL OPTIONS EXHAUSTED
    const errorMsg = `All API sources failed for ${symbol} and no usable cache - system degraded`;
    console.error(`❌ ${errorMsg}`);
    
    return {
      symbol,
      price: 0,
      timestamp: new Date(),
      source: 'none',
      success: false,
      error: errorMsg
    };
  }

  /**
   * Fetch from Binance API
   */
  private async fetchFromBinance(symbol: string): Promise<RealPriceData> {
    try {
      // Rate limiting for Binance
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastBinanceRequest;
      
      if (timeSinceLastRequest < this.BINANCE_RATE_LIMIT_MS) {
        const waitTime = this.BINANCE_RATE_LIMIT_MS - timeSinceLastRequest;
        console.log(`⏳ Binance rate limit: waiting ${waitTime}ms before request for ${symbol}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.lastBinanceRequest = Date.now();
      
      const binanceSymbol = this.convertToBinanceSymbol(symbol);
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`,
        { 
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          timeout: 10000
        }
      );

      if (!response.ok) {
        throw new Error(`Binance API returned ${response.status}`);
      }

      const data = await response.json();
      const price = parseFloat(data.price);

      if (isNaN(price) || price <= 0) {
        throw new Error('Invalid price data from Binance');
      }

      // CRITICAL: Validate price before using it
      if (!this.validatePrice(symbol, price, 'binance')) {
        throw new Error(`Price validation failed for ${symbol}: $${price}`);
      }

      console.log(`✅ Real price from Binance: ${symbol} = $${price.toLocaleString()}`);

      return {
        symbol,
        price,
        timestamp: new Date(),
        source: 'binance',
        success: true
      };

    } catch (error) {
      console.error(`Binance API error for ${symbol}:`, error);
      return {
        symbol,
        price: 0,
        timestamp: new Date(),
        source: 'binance',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch from CoinGecko API with rate limiting
   */
  private async fetchFromCoinGecko(symbol: string): Promise<RealPriceData> {
    try {
      // Rate limiting: wait if needed
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastCoinGeckoRequest;
      
      if (timeSinceLastRequest < this.COINGECKO_RATE_LIMIT_MS) {
        const waitTime = this.COINGECKO_RATE_LIMIT_MS - timeSinceLastRequest;
        console.log(`⏳ CoinGecko rate limit: waiting ${waitTime}ms before request for ${symbol}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.lastCoinGeckoRequest = Date.now();
      
      const coinId = this.convertToCoinGeckoId(symbol);
      if (!coinId) {
        throw new Error(`Unknown symbol mapping for CoinGecko: ${symbol}`);
      }
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
        { 
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.status === 429) {
        throw new Error(`CoinGecko API rate limited (429) - please reduce request frequency`);
      }

      if (!response.ok) {
        throw new Error(`CoinGecko API returned ${response.status}`);
      }

      const data = await response.json();
      const price = data[coinId]?.usd;

      if (!price || price <= 0) {
        throw new Error('Invalid price data from CoinGecko');
      }

      // CRITICAL: Validate price before using it
      if (!this.validatePrice(symbol, price, 'coingecko')) {
        throw new Error(`Price validation failed for ${symbol}: $${price}`);
      }

      console.log(`✅ Real price from CoinGecko: ${symbol} = $${price.toLocaleString()}`);

      return {
        symbol,
        price,
        timestamp: new Date(),
        source: 'coingecko',
        success: true
      };

    } catch (error) {
      console.error(`CoinGecko API error for ${symbol}:`, error);
      return {
        symbol,
        price: 0,
        timestamp: new Date(),
        source: 'coingecko',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch from CryptoCompare API
   */
  private async fetchFromCryptoCompare(symbol: string): Promise<RealPriceData> {
    try {
      // Rate limiting for CryptoCompare
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastCryptoCompareRequest;
      
      if (timeSinceLastRequest < this.CRYPTOCOMPARE_RATE_LIMIT_MS) {
        const waitTime = this.CRYPTOCOMPARE_RATE_LIMIT_MS - timeSinceLastRequest;
        console.log(`⏳ CryptoCompare rate limit: waiting ${waitTime}ms before request for ${symbol}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.lastCryptoCompareRequest = Date.now();
      
      const cryptoSymbol = this.convertToCryptoCompareSymbol(symbol);
      if (!cryptoSymbol) {
        throw new Error(`Unknown symbol mapping for CryptoCompare: ${symbol}`);
      }
      
      const response = await fetch(
        `https://min-api.cryptocompare.com/data/price?fsym=${cryptoSymbol}&tsyms=USD`,
        { 
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          timeout: 10000
        }
      );

      if (!response.ok) {
        throw new Error(`CryptoCompare API returned ${response.status}`);
      }

      const data = await response.json();
      const price = data.USD;

      if (!price || price <= 0) {
        throw new Error('Invalid price data from CryptoCompare');
      }

      // CRITICAL: Validate price before using it
      if (!this.validatePrice(symbol, price, 'cryptocompare')) {
        throw new Error(`Price validation failed for ${symbol}: $${price}`);
      }

      console.log(`✅ Real price from CryptoCompare: ${symbol} = $${price.toLocaleString()}`);

      return {
        symbol,
        price,
        timestamp: new Date(),
        source: 'cryptocompare',
        success: true
      };

    } catch (error) {
      console.error(`CryptoCompare API error for ${symbol}:`, error);
      return {
        symbol,
        price: 0,
        timestamp: new Date(),
        source: 'cryptocompare',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get prices for multiple symbols
   */
  async getMultiplePrices(symbols: string[]): Promise<RealPriceData[]> {
    const promises = symbols.map(symbol => this.getCurrentPrice(symbol));
    return Promise.all(promises);
  }

  /**
   * Symbol conversions for different APIs
   */
  private convertToBinanceSymbol(symbol: string): string {
    // Binance primarily uses USDT pairs, so convert USD to USDT
    const map: { [key: string]: string } = {
      // Major pairs
      'BTCUSD': 'BTCUSDT', 'ETHUSD': 'ETHUSDT', 'BNBUSD': 'BNBUSDT',
      'SOLUSD': 'SOLUSDT', 'XRPUSD': 'XRPUSDT', 'ADAUSD': 'ADAUSDT',
      'AVAXUSD': 'AVAXUSDT', 'LINKUSD': 'LINKUSDT', 'MATICUSD': 'MATICUSDT',
      'POLUSD': 'POLUSDT', 'DOGEUSD': 'DOGEUSDT', 'TRXUSD': 'TRXUSDT',
      
      // Layer 1 & Layer 2
      'DOTUSD': 'DOTUSDT', 'ATOMUSD': 'ATOMUSDT', 'NEARUSD': 'NEARUSDT',
      'ALGOUSD': 'ALGOUSDT', 'FTMUSD': 'FTMUSDT', 'ONEUSD': 'ONEUSDT',
      'LUNAUSD': 'LUNAUSDT', 'ICPUSD': 'ICPUSDT',
      
      // DeFi tokens
      'UNIUSD': 'UNIUSDT', 'AAVEUSD': 'AAVEUSDT', 'SUSHIUSD': 'SUSHIUSDT',
      'COMPUSD': 'COMPUSDT', 'CRVUSD': 'CRVUSDT', 'YFIUSD': 'YFIUSDT',
      '1INCHUSD': '1INCHUSDT',
      
      // Meme tokens
      'SHIBUSD': 'SHIBUSDT', 'PEPEUSD': 'PEPEUSDT', 'FLOKIUSD': 'FLOKIUSDT',
      'BONKUSD': 'BONKUSDT',
      
      // AI & Gaming
      'FETUSD': 'FETUSDT', 'RENDRUSD': 'RENDRUSDT', 'OCEANUSД': 'OCEANUSDT',
      'AXSUSD': 'AXSUSDT', 'SANDUSD': 'SANDUSDT', 'MANAUSD': 'MANAUSDT',
      
      // Stablecoins
      'USDCUSD': 'USDCUSDT', 'DAIUSD': 'DAIUSDT', 'BUSDUSD': 'BUSDUSDT',
      
      // Newer tokens
      'APTUSD': 'APTUSDT', 'SUIUSD': 'SUIUSDT', 'ARBUSD': 'ARBUSDT',
      'OPUSD': 'OPUSDT'
    };
    
    // Smart fallback: convert USD to USDT for unknown pairs
    return map[symbol] || symbol.replace('USD', 'USDT');
  }

  private convertToCoinGeckoId(symbol: string): string {
    // Comprehensive mapping for all major trading pairs (USD and USDT)
    const map: { [key: string]: string } = {
      // Major cryptocurrencies
      'BTCUSD': 'bitcoin', 'BTCUSDT': 'bitcoin',
      'ETHUSD': 'ethereum', 'ETHUSDT': 'ethereum',
      'BNBUSD': 'binancecoin', 'BNBUSDT': 'binancecoin',
      'SOLUSD': 'solana', 'SOLUSDT': 'solana',
      'XRPUSD': 'ripple', 'XRPUSDT': 'ripple',
      'ADAUSD': 'cardano', 'ADAUSDT': 'cardano',
      'AVAXUSD': 'avalanche-2', 'AVAXUSDT': 'avalanche-2',
      'LINKUSD': 'chainlink', 'LINKUSDT': 'chainlink',
      'MATICUSD': 'matic-network', 'MATICUSDT': 'matic-network',
      'POLUSD': 'polygon-ecosystem-token', 'POLUSDT': 'polygon-ecosystem-token',
      'DOGEUSD': 'dogecoin', 'DOGEUSDT': 'dogecoin',
      'TRXUSD': 'tron', 'TRXUSDT': 'tron',
      
      // Layer 1 blockchains
      'DOTUSD': 'polkadot', 'DOTUSDT': 'polkadot',
      'ATOMUSD': 'cosmos', 'ATOMUSDT': 'cosmos',
      'NEARUSD': 'near', 'NEARUSDT': 'near',
      'ALGOUSD': 'algorand', 'ALGOUSDT': 'algorand',
      'FTMUSD': 'fantom', 'FTMUSDT': 'fantom',
      'ONEUSD': 'harmony', 'ONEUSDT': 'harmony',
      'LUNAUSD': 'terra-luna-2', 'LUNAUSDT': 'terra-luna-2',
      'ICPUSD': 'internet-computer', 'ICPUSDT': 'internet-computer',
      'HBARUSD': 'hedera-hashgraph', 'HBARUSDT': 'hedera-hashgraph',
      'FILUSD': 'filecoin', 'FILUSDT': 'filecoin',
      'VETUSD': 'vechain', 'VETUSDT': 'vechain',
      'EOSУSD': 'eos', 'EOSUSDT': 'eos',
      'XLMUSD': 'stellar', 'XLMUSDT': 'stellar',
      'XTZUSD': 'tezos', 'XTZUSDT': 'tezos',
      'IOTAUSD': 'iota', 'IOTAUSDT': 'iota',
      
      // DeFi tokens
      'UNIUSD': 'uniswap', 'UNIUSDT': 'uniswap',
      'AAVEUSD': 'aave', 'AAVEUSDT': 'aave',
      'SUSHIUSD': 'sushi', 'SUSHIUSDT': 'sushi',
      'COMPUSD': 'compound-governance-token', 'COMPUSDT': 'compound-governance-token',
      'CRVUSD': 'curve-dao-token', 'CRVUSDT': 'curve-dao-token',
      'YFIUSD': 'yearn-finance', 'YFIUSDT': 'yearn-finance',
      '1INCHUSD': '1inch', '1INCHUSDT': '1inch',
      'MKRUSD': 'maker', 'MKRUSDT': 'maker',
      'SNXUSD': 'havven', 'SNXUSDT': 'havven',
      'BALUSD': 'balancer', 'BALUSDT': 'balancer',
      'ZRXUSD': '0x', 'ZRXUSDT': '0x',
      
      // Meme & Community tokens
      'SHIBUSD': 'shiba-inu', 'SHIBUSDT': 'shiba-inu',
      'PEPEUSD': 'pepe', 'PEPEUSDT': 'pepe',
      'FLOKIUSD': 'floki', 'FLOKIUSDT': 'floki',
      'BONKUSD': 'bonk', 'BONKUSDT': 'bonk',
      'PENGUUSD': 'pudgy-penguins', 'PENGUUSDT': 'pudgy-penguins',
      'WIFUSD': 'dogwifcoin', 'WIFUSDT': 'dogwifcoin',
      
      // AI & Gaming tokens
      'FETUSD': 'fetch-ai', 'FETUSDT': 'fetch-ai',
      'RENDRUSD': 'render-token', 'RENDRUSDT': 'render-token',
      'OCEANUSД': 'ocean-protocol', 'OCEANUSDT': 'ocean-protocol',
      'AXSUSD': 'axie-infinity', 'AXSUSDT': 'axie-infinity',
      'SANDUSD': 'the-sandbox', 'SANDUSDT': 'the-sandbox',
      'MANAUSD': 'decentraland', 'MANAUSDT': 'decentraland',
      'GALAUSD': 'gala', 'GALAUSDT': 'gala',
      'IMXUSD': 'immutable-x', 'IMXUSDT': 'immutable-x',
      
      // Exchange & Platform tokens
      'CAKEUSD': 'pancakeswap-token', 'CAKEUSDT': 'pancakeswap-token',
      'KNCUSD': 'kyber-network-crystal', 'KNCUSDT': 'kyber-network-crystal',
      'LRCUSD': 'loopring', 'LRCUSDT': 'loopring',
      'CHZUSD': 'chiliz', 'CHZUSDT': 'chiliz',
      'ENJUSD': 'enjincoin', 'ENJUSDT': 'enjincoin',
      'BATUSD': 'basic-attention-token', 'BATUSDT': 'basic-attention-token',
      
      // Stablecoins
      'USDCUSD': 'usd-coin', 'USDCUSDT': 'usd-coin',
      'DAIUSD': 'dai', 'DAIUSDT': 'dai',
      'BUSDUSD': 'binance-usd', 'BUSDUSDT': 'binance-usd',
      'FDUSD': 'first-digital-usd', 'FDUSDT': 'first-digital-usd',
      'FRÅXUSD': 'frax', 'FRAXUSDT': 'frax',
      'USDTUSD': 'tether', 'USDTUSDT': 'tether',
      
      // Liquid staking & ETH variants
      'STETHUSD': 'staked-ether', 'STETHUSDT': 'staked-ether',
      'LIDOUSD': 'lido-dao', 'LIDOUSDT': 'lido-dao',
      'RETHUSD': 'rocket-pool-eth', 'RETHUSDT': 'rocket-pool-eth',
      'CBETHUSD': 'coinbase-wrapped-staked-eth', 'CBETHUSDT': 'coinbase-wrapped-staked-eth',
      
      // Privacy & Utility coins
      'XMRUSD': 'monero', 'XMRUSDT': 'monero',
      'ZECUSD': 'zcash', 'ZECUSDT': 'zcash',
      'DASHUSD': 'dash', 'DASHUSDT': 'dash',
      'LTCUSD': 'litecoin', 'LTCUSDT': 'litecoin',
      'BCHUSD': 'bitcoin-cash', 'BCHUSDT': 'bitcoin-cash',
      'ETCUSD': 'ethereum-classic', 'ETCUSDT': 'ethereum-classic',
      
      // Newer/emerging Layer 2 & Alternative L1s
      'APTUSD': 'aptos', 'APTUSDT': 'aptos',
      'SUIUSD': 'sui', 'SUIUSDT': 'sui',
      'ARBUSD': 'arbitrum', 'ARBUSDT': 'arbitrum',
      'OPUSD': 'optimism', 'OPUSDT': 'optimism',
      'BLAЅTUSD': 'blast', 'BLASTUSDT': 'blast',
      'SEIUSD': 'sei-network', 'SEIUSDT': 'sei-network',
      'INJUSD': 'injective-protocol', 'INJUSDT': 'injective-protocol',
      
      // Enterprise & Professional tokens
      'QNTUSD': 'quant-network', 'QNTUSDT': 'quant-network',
      'GRTUSD': 'the-graph', 'GRTUSDT': 'the-graph',
      'ROSEUSD': 'oasis-network', 'ROSEUSDT': 'oasis-network',
      'FLOWUSD': 'flow', 'FLOWUSDT': 'flow',
      
      // Infrastructure tokens
      'ARUSD': 'arweave', 'ARUSDT': 'arweave',
      'STRKUSD': 'starknet', 'STRKUSDT': 'starknet',
      'POLYGONUSD': 'polygon-ecosystem-token', 'POLYGONUSDT': 'polygon-ecosystem-token',
      
      // Legacy/older but still traded
      'DOLOUSD': 'dolo-protocol', 'DOLOPUSDT': 'dolo-protocol'
    };
    
    // CRITICAL FIX: Don't default to bitcoin! Return null if not found
    if (!map[symbol]) {
      console.warn(`❌ Unknown symbol for CoinGecko: ${symbol} - cannot fetch price`);
      return null;
    }
    
    return map[symbol];
  }

  private convertToCryptoCompareSymbol(symbol: string): string {
    // Comprehensive mapping for CryptoCompare (uses ticker symbols)
    const map: { [key: string]: string } = {
      // Major cryptocurrencies
      'BTCUSD': 'BTC', 'BTCUSDT': 'BTC',
      'ETHUSD': 'ETH', 'ETHUSDT': 'ETH',
      'BNBUSD': 'BNB', 'BNBUSDT': 'BNB',
      'SOLUSD': 'SOL', 'SOLUSDT': 'SOL',
      'XRPUSD': 'XRP', 'XRPUSDT': 'XRP',
      'ADAUSD': 'ADA', 'ADAUSDT': 'ADA',
      'AVAXUSD': 'AVAX', 'AVAXUSDT': 'AVAX',
      'LINKUSD': 'LINK', 'LINKUSDT': 'LINK',
      'MATICUSD': 'MATIC', 'MATICUSDT': 'MATIC',
      'POLUSD': 'POL', 'POLUSDT': 'POL',
      'DOGEUSD': 'DOGE', 'DOGEUSDT': 'DOGE',
      'TRXUSD': 'TRX', 'TRXUSDT': 'TRX',
      
      // Layer 1 blockchains
      'DOTUSD': 'DOT', 'DOTUSDT': 'DOT',
      'ATOMUSD': 'ATOM', 'ATOMUSDT': 'ATOM',
      'NEARUSD': 'NEAR', 'NEARUSDT': 'NEAR',
      'ALGOUSD': 'ALGO', 'ALGOUSDT': 'ALGO',
      'FTMUSD': 'FTM', 'FTMUSDT': 'FTM',
      'ONEUSD': 'ONE', 'ONEUSDT': 'ONE',
      'LUNAUSD': 'LUNA', 'LUNAUSDT': 'LUNA',
      'ICPUSD': 'ICP', 'ICPUSDT': 'ICP',
      'HBARUSD': 'HBAR', 'HBARUSDT': 'HBAR',
      'FILUSD': 'FIL', 'FILUSDT': 'FIL',
      'VETUSD': 'VET', 'VETUSDT': 'VET',
      'EOSUSD': 'EOS', 'EOSUSDT': 'EOS',
      'XLMUSD': 'XLM', 'XLMUSDT': 'XLM',
      'XTZUSD': 'XTZ', 'XTZUSDT': 'XTZ',
      'IOTAUSD': 'IOTA', 'IOTAUSDT': 'IOTA',
      
      // DeFi tokens
      'UNIUSD': 'UNI', 'UNIUSDT': 'UNI',
      'AAVEUSD': 'AAVE', 'AAVEUSDT': 'AAVE',
      'SUSHIUSD': 'SUSHI', 'SUSHIUSDT': 'SUSHI',
      'COMPUSD': 'COMP', 'COMPUSDT': 'COMP',
      'CRVUSD': 'CRV', 'CRVUSDT': 'CRV',
      'YFIUSD': 'YFI', 'YFIUSDT': 'YFI',
      '1INCHUSD': '1INCH', '1INCHUSDT': '1INCH',
      'MKRUSD': 'MKR', 'MKRUSDT': 'MKR',
      'SNXUSD': 'SNX', 'SNXUSDT': 'SNX',
      'BALUSD': 'BAL', 'BALUSDT': 'BAL',
      'ZRXUSD': 'ZRX', 'ZRXUSDT': 'ZRX',
      
      // Meme tokens
      'SHIBUSD': 'SHIB', 'SHIBUSDT': 'SHIB',
      'PEPEUSD': 'PEPE', 'PEPEUSDT': 'PEPE',
      'FLOKIUSD': 'FLOKI', 'FLOKIUSDT': 'FLOKI',
      'BONKUSD': 'BONK', 'BONKUSDT': 'BONK',
      'PENGUUSD': 'PENGU', 'PENGUUSDT': 'PENGU',
      'WIFUSD': 'WIF', 'WIFUSDT': 'WIF',
      
      // AI & Gaming tokens
      'FETUSD': 'FET', 'FETUSDT': 'FET',
      'RENDRUSD': 'RNDR', 'RENDRUSDT': 'RNDR',
      'OCEANUSД': 'OCEAN', 'OCEANUSDT': 'OCEAN',
      'AXSUSD': 'AXS', 'AXSUSDT': 'AXS',
      'SANDUSD': 'SAND', 'SANDUSDT': 'SAND',
      'MANAUSD': 'MANA', 'MANAUSDT': 'MANA',
      'GALAUSD': 'GALA', 'GALAUSDT': 'GALA',
      'IMXUSD': 'IMX', 'IMXUSDT': 'IMX',
      
      // Exchange tokens
      'CAKEUSD': 'CAKE', 'CAKEUSDT': 'CAKE',
      'KNCUSD': 'KNC', 'KNCUSDT': 'KNC',
      'LRCUSD': 'LRC', 'LRCUSDT': 'LRC',
      'CHZUSD': 'CHZ', 'CHZUSDT': 'CHZ',
      'ENJUSD': 'ENJ', 'ENJUSDT': 'ENJ',
      'BATUSD': 'BAT', 'BATUSDT': 'BAT',
      
      // Stablecoins
      'USDCUSD': 'USDC', 'USDCUSDT': 'USDC',
      'DAIUSD': 'DAI', 'DAIUSDT': 'DAI',
      'BUSDUSD': 'BUSD', 'BUSDUSDT': 'BUSD',
      'FDUSD': 'FDUSD', 'FDUSDT': 'FDUSD',
      'FRAXUSD': 'FRAX', 'FRAXUSDT': 'FRAX',
      'USDTUSD': 'USDT', 'USDTUSDT': 'USDT',
      
      // Liquid staking & ETH variants
      'STETHUSD': 'STETH', 'STETHUSDT': 'STETH',
      'LIDOUSD': 'LDO', 'LIDOUSDT': 'LDO',
      'RETHUSD': 'RETH', 'RETHUSDT': 'RETH',
      'CBETHUSD': 'CBETH', 'CBETHUSDT': 'CBETH',
      
      // Privacy & Utility coins
      'XMRUSD': 'XMR', 'XMRUSDT': 'XMR',
      'ZECUSD': 'ZEC', 'ZECUSDT': 'ZEC',
      'DASHUSD': 'DASH', 'DASHUSDT': 'DASH',
      'LTCUSD': 'LTC', 'LTCUSDT': 'LTC',
      'BCHUSD': 'BCH', 'BCHUSDT': 'BCH',
      'ETCUSD': 'ETC', 'ETCUSDT': 'ETC',
      
      // Newer/emerging tokens
      'APTUSD': 'APT', 'APTUSDT': 'APT',
      'SUIUSD': 'SUI', 'SUIUSDT': 'SUI',
      'ARBUSD': 'ARB', 'ARBUSDT': 'ARB',
      'OPUSD': 'OP', 'OPUSDT': 'OP',
      'BLASTUSD': 'BLAST', 'BLASTUSDT': 'BLAST',
      'SEIUSD': 'SEI', 'SEIUSDT': 'SEI',
      'INJUSD': 'INJ', 'INJUSDT': 'INJ',
      
      // Enterprise & Professional
      'QNTUSD': 'QNT', 'QNTUSDT': 'QNT',
      'GRTUSD': 'GRT', 'GRTUSDT': 'GRT',
      'ROSEUSD': 'ROSE', 'ROSEUSDT': 'ROSE',
      'FLOWUSD': 'FLOW', 'FLOWUSDT': 'FLOW',
      
      // Infrastructure
      'ARUSD': 'AR', 'ARUSDT': 'AR',
      'STRKUSD': 'STRK', 'STRKUSDT': 'STRK',
      
      // Legacy/special cases
      'DOLOUSD': 'DOLO', 'DOLUSDT': 'DOLO'
    };
    
    // SAFER FALLBACK: Only use simple USD removal if symbol is reasonable
    if (!map[symbol]) {
      const fallback = symbol.replace(/USDT?$/, ''); // Remove USD or USDT
      if (fallback.length >= 2 && fallback.length <= 6 && /^[A-Z0-9]+$/.test(fallback)) {
        console.warn(`⚠️ Using fallback symbol for CryptoCompare: ${symbol} -> ${fallback}`);
        return fallback;
      } else {
        console.warn(`❌ Cannot convert symbol for CryptoCompare: ${symbol}`);
        return null;
      }
    }
    
    return map[symbol];
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Price cache cleared');
  }

  /**
   * Get current cache status
   */
  getCacheStatus(): { symbol: string; price: number; age: number }[] {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([symbol, data]) => ({
      symbol,
      price: data.price,
      age: Math.round((now - data.timestamp.getTime()) / 1000) // age in seconds
    }));
  }
}

// Export singleton instance
export const realTimePriceFetcher = RealTimePriceFetcher.getInstance();

// Helper functions for cache management
export function clearPriceCache(): void {
  realTimePriceFetcher.clearCache();
}

export function getPriceCacheStatus(): { symbol: string; price: number; age: number }[] {
  return realTimePriceFetcher.getCacheStatus();
}

// Test function to verify APIs are working
export async function testRealPriceFetch(): Promise<void> {
  console.log('🧪 Testing real price fetching...');
  
  const symbols = ['BTCUSD', 'ETHUSD', 'SOLUSD'];
  const results = await realTimePriceFetcher.getMultiplePrices(symbols);
  
  console.log('📊 Real Price Test Results:');
  for (const result of results) {
    if (result.success) {
      console.log(`✅ ${result.symbol}: $${result.price.toLocaleString()} (from ${result.source})`);
    } else {
      console.log(`❌ ${result.symbol}: Failed - ${result.error}`);
    }
  }
}

// Auto-test on load in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    testRealPriceFetch().catch(console.error);
  }, 2000);
}