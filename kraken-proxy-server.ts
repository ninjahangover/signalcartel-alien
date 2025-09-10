/**
 * Kraken Proxy Server V2.6 with GPU-Accelerated Queue Management
 * Handles API signature generation and request forwarding to Kraken
 * Features intelligent request prioritization and rate limiting using CUDA acceleration
 */

import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import cors from 'cors';
import { gpuQueueManager, RequestPriority } from './src/lib/gpu-accelerated-queue-manager';

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

// Determine request priority based on endpoint
function getRequestPriority(endpoint: string): RequestPriority {
  // Critical trading operations
  if (['AddOrder', 'CancelOrder', 'CancelAll'].includes(endpoint)) {
    return RequestPriority.CRITICAL;
  }
  // High priority for position/balance management
  if (['Balance', 'OpenOrders', 'ClosedOrders', 'OpenPositions'].includes(endpoint)) {
    return RequestPriority.HIGH;
  }
  // Medium priority for trading data
  if (['TradesHistory', 'Ticker', 'OHLC', 'OrderBook'].includes(endpoint)) {
    return RequestPriority.MEDIUM;
  }
  // Low priority for general info
  return RequestPriority.LOW;
}

// GPU Queue Stats endpoint
app.get('/api/queue-stats', (req, res) => {
  const stats = gpuQueueManager.getStats();
  res.json({
    ...stats,
    status: 'GPU-Accelerated Queue V2.6 Active',
    timestamp: new Date().toISOString()
  });
});

// Main proxy endpoint with GPU queue integration
app.post('/api/kraken-proxy', async (req, res) => {
  try {
    const { endpoint, params = {}, apiKey, apiSecret } = req.body;
    
    console.log(`🔄 Kraken Proxy: Request for ${endpoint}`, {
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      endpoint: endpoint,
      params: Object.keys(params)
    });

    if (!endpoint || !apiKey || !apiSecret) {
      return res.status(400).json({ 
        error: ['Missing required parameters: endpoint, apiKey, or apiSecret'] 
      });
    }

    // Determine request priority for GPU queue
    const priority = getRequestPriority(endpoint);
    
    console.log(`🎯 Queue priority: ${priority} for ${endpoint}`);

    // Enqueue request through GPU-accelerated queue manager
    const result = await gpuQueueManager.enqueueRequest(
      `kraken-${endpoint}`,
      'POST',
      { endpoint, params, apiKey, apiSecret },
      priority,
      15000 // 15 second timeout
    );

    // Process the actual API call
    const apiResult = await processKrakenRequest(endpoint, params, apiKey, apiSecret);
    
    console.log(`✅ Kraken Proxy: SUCCESS for ${endpoint}`);
    res.json(apiResult);

  } catch (error: any) {
    console.log(`🔄 Kraken Proxy: Failed with ${error.status || 500}: ${error.message || ''}`);
    console.error(`❌ Kraken Proxy: FAILED for ${req.body.endpoint}: ${error}`);
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      return res.status(502).json({ 
        error: ['Failed to reach Kraken API through GPU queue'] 
      });
    } else {
      return res.status(500).json({ 
        error: [error.message || 'GPU queue processing error'] 
      });
    }
  }
});

// Actual Kraken API request processing (extracted from main handler)
async function processKrakenRequest(endpoint: string, params: any, apiKey: string, apiSecret: string) {
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
        'User-Agent': 'SignalCartel-Kraken-Proxy-V2.6-GPU-Queue/1.0'
      },
      timeout: 15000 // Extended timeout for queue processing
    });

    console.log(`✅ Kraken API ${endpoint} success:`, {
      hasResult: !!response.data.result,
      hasError: !!(response.data.error && response.data.error.length > 0)
    });

    return response.data;
  } else {
    // Public endpoint - no authentication needed
    const path = `/0/public/${endpoint}`;
    const response = await axios.get(`${KRAKEN_API_URL}${path}`, {
      params,
      timeout: 15000
    });

    console.log(`✅ Kraken public API ${endpoint} success`);
    return response.data;
  }
}

// Start the server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Kraken Proxy Server V2.6 with GPU Queue running on http://127.0.0.1:${PORT}`);
  console.log(`📡 Ready to forward requests to Kraken API through GPU-accelerated queue`);
  console.log(`🔐 Handles signature generation for private endpoints`);
  console.log(`⚡ GPU-accelerated request prioritization and rate limiting active`);
  console.log(`🎯 Priority system: CRITICAL > HIGH > MEDIUM > LOW`);
  console.log(`📊 Queue stats available at: http://127.0.0.1:${PORT}/api/queue-stats`);
});

// Handle graceful shutdown with GPU queue cleanup
process.on('SIGINT', async () => {
  console.log('\n🛑 Kraken Proxy Server shutting down...');
  console.log('🔥 Shutting down GPU-accelerated queue manager...');
  await gpuQueueManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Kraken Proxy Server shutting down...');
  console.log('🔥 Shutting down GPU-accelerated queue manager...');
  await gpuQueueManager.shutdown();
  process.exit(0);
});