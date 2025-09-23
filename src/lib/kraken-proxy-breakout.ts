/**
 * Kraken Proxy Server
 * Handles API signature generation and request forwarding to Kraken
 */

import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const KRAKEN_API_URL = 'https://api.kraken.com';
const KRAKEN_SANDBOX_URL = 'https://api.demo.kraken.com';
const PORT = 3002;

// Helper function to generate Kraken API signature
function getKrakenSignature(path: string, request: string, secret: string, nonce: number): string {
  const secret_buffer = Buffer.from(secret, 'base64');
  const hash = crypto.createHash('sha256');
  const hmac = crypto.createHmac('sha512', secret_buffer);
  
  // Create the message for SHA256: nonce + postdata
  const message = nonce.toString() + request;
  const hash_digest = hash.update(message).digest();
  
  // Create the message for HMAC: path + hash_digest (separate updates like website)
  hmac.update(path);
  hmac.update(hash_digest);
  const hmac_digest = hmac.digest('base64');
  return hmac_digest;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Kraken proxy server is running' });
});

// Order book endpoint for profit predator
app.get('/api/order-book', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Symbol parameter required' });
    }

    // Map to Kraken format and call depth endpoint
    const krakenPair = symbol; // Assuming symbol is already in Kraken format (e.g., BTCUSD)
    const url = `https://api.kraken.com/0/public/Depth?pair=${krakenPair}&count=10`;

    console.log(`📊 Order book request: ${url}`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.error && data.error.length > 0) {
      return res.json({ success: false, error: data.error });
    }

    // Extract the order book data (Kraken returns nested structure)
    const pairData = data.result[Object.keys(data.result)[0]];
    const orderBook = {
      bids: pairData.bids.map(([price, volume]: [string, string]) => [parseFloat(price), parseFloat(volume)]),
      asks: pairData.asks.map(([price, volume]: [string, string]) => [parseFloat(price), parseFloat(volume)]),
      midPrice: 0, // Will be calculated below
      spreadPercent: 0 // Will be calculated below
    };

    // Calculate mid price and spread
    if (orderBook.bids.length > 0 && orderBook.asks.length > 0) {
      const bestBid = orderBook.bids[0][0];
      const bestAsk = orderBook.asks[0][0];
      orderBook.midPrice = (bestBid + bestAsk) / 2;
      orderBook.spreadPercent = ((bestAsk - bestBid) / orderBook.midPrice) * 100;
    }

    res.json({ success: true, data: orderBook });
  } catch (error) {
    console.error('❌ Order book API error:', error);
    res.status(500).json({ success: false, error: 'Order book fetch failed' });
  }
});

// Public API endpoints for trading system compatibility
app.get('/public/:endpoint', async (req, res) => {
  try {
    const { endpoint } = req.params;
    const queryParams = req.query;

    // Build Kraken public API URL
    let url = `https://api.kraken.com/0/public/${endpoint}`;
    if (Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams(queryParams as any);
      url += `?${params.toString()}`;
    }

    console.log(`📡 Public API call: ${url}`);

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error('❌ Public API error:', error);
    res.status(500).json({ error: ['Public API call failed'] });
  }
});

// Main proxy endpoint
app.post('/api/kraken-proxy', async (req, res) => {
  try {
    const { endpoint, params = {}, apiKey, apiSecret } = req.body;
    
    console.log(`🔄 Proxy request for ${endpoint}`, {
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      params: Object.keys(params)
    });

    if (!endpoint || !apiKey || !apiSecret) {
      return res.status(400).json({ 
        error: ['Missing required parameters: endpoint, apiKey, or apiSecret'] 
      });
    }

    // Determine if this is a public or private endpoint
    const isPrivate = !['Time', 'Assets', 'AssetPairs', 'Ticker', 'OHLC', 'Depth', 'Trades', 'Spread'].includes(endpoint);
    
    if (isPrivate) {
      // Private endpoint - requires authentication
      const nonce = Date.now() * 1000;
      const path = `/0/private/${endpoint}`;
      
      console.log(`🔐 Auth details: nonce=${nonce}, path=${path}, endpoint=${endpoint}`);
      
      // Build the POST data
      const postData = new URLSearchParams({
        nonce: nonce.toString(),
        ...params
      }).toString();
      
      console.log(`📝 POST data: ${postData}`);

      // Generate the signature
      const signature = getKrakenSignature(path, postData, apiSecret, nonce);

      // Make the request to Kraken
      const response = await axios.post(`${KRAKEN_API_URL}${path}`, postData, {
        headers: {
          'API-Key': apiKey,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SignalCartel-Kraken-Proxy/1.0'
        },
        timeout: 10000
      });

      const hasResult = !!response.data.result;
      const hasError = !!(response.data.error && response.data.error.length > 0);

      console.log(`✅ Kraken API ${endpoint} success:`, {
        hasResult,
        hasError,
        errorDetails: hasError ? response.data.error : null
      });

      // 🛡️ BULLETPROOF: Log suspicious responses for debugging
      if (!hasResult && !hasError) {
        console.log(`⚠️ Suspicious response for ${endpoint}: no result and no error`);
        console.log(`📋 Full response:`, JSON.stringify(response.data, null, 2));
      }

      return res.json(response.data);
    } else {
      // Public endpoint - no authentication needed
      const path = `/0/public/${endpoint}`;
      const response = await axios.get(`${KRAKEN_API_URL}${path}`, {
        params,
        timeout: 10000
      });

      console.log(`✅ Kraken public API ${endpoint} success`);
      return res.json(response.data);
    }
  } catch (error: any) {
    console.error(`❌ Kraken proxy error:`, error.message);
    
    if (error.response) {
      // Kraken returned an error
      return res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // Request was made but no response
      return res.status(502).json({ 
        error: ['Failed to reach Kraken API'] 
      });
    } else {
      // Something else went wrong
      return res.status(500).json({ 
        error: [error.message || 'Internal server error'] 
      });
    }
  }
});

// Start the server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Kraken Proxy Server running on http://127.0.0.1:${PORT}`);
  console.log(`📡 Ready to forward requests to Kraken API`);
  console.log(`🔐 Handles signature generation for private endpoints`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Kraken Proxy Server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Kraken Proxy Server shutting down...');
  process.exit(0);
});