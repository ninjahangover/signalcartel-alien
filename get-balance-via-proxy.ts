#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

const CACHE_FILE = '/tmp/kraken-balance-cache.json';
const CACHE_DURATION = 300000; // 5 minutes cache for dashboard
const STALE_CACHE_DURATION = 1800000; // 30 minutes - use stale data if API fails
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds between retries

interface CachedBalance {
  data: any;
  timestamp: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getCachedBalance(allowStale = false): CachedBalance | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      const now = Date.now();
      const age = now - cached.timestamp;
      
      if (age < CACHE_DURATION) {
        return cached; // Fresh cache
      }
      
      if (allowStale && age < STALE_CACHE_DURATION) {
        return cached; // Stale but usable cache when API fails
      }
    }
  } catch (error) {
    // Cache error, continue with fresh request
  }
  return null;
}

function setCachedBalance(data: any): void {
  try {
    const cached: CachedBalance = {
      data: data,
      timestamp: Date.now()
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cached));
  } catch (error) {
    // Cache write error, not critical
  }
}

async function fetchBalanceWithRetry(apiKey: string, apiSecret: string, attempt: number = 1): Promise<any> {
  try {
    console.log(`🔄 Fetching balance via proxy server (attempt ${attempt})...`);
    
    const response = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: 'Balance',
        params: {},
        apiKey: apiKey,
        apiSecret: apiSecret
      }),
    });

    const data = await response.json();
    
    if (data.error && data.error.length > 0) {
      const errorMsg = data.error[0];
      
      if (errorMsg.includes('Rate limit exceeded') && attempt < MAX_RETRIES) {
        console.log(`⚠️ Rate limited, retrying in ${RETRY_DELAY / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`);
        await sleep(RETRY_DELAY);
        return await fetchBalanceWithRetry(apiKey, apiSecret, attempt + 1);
      }
      
      throw new Error(`Kraken API error: ${errorMsg}`);
    }

    return data;
  } catch (error) {
    if (attempt < MAX_RETRIES && !error.message.includes('Rate limit exceeded')) {
      console.log(`⚠️ Request failed, retrying in ${RETRY_DELAY / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`);
      await sleep(RETRY_DELAY);
      return await fetchBalanceWithRetry(apiKey, apiSecret, attempt + 1);
    }
    throw error;
  }
}

async function main() {
  const apiKey = "DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR";
  const apiSecret = "p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==";
  
  try {
    // Check cache first
    const cached = getCachedBalance();
    let data;
    
    if (cached) {
      console.log('📋 Using cached balance data (less than 5 minutes old)');
      data = cached.data;
    } else {
      try {
        data = await fetchBalanceWithRetry(apiKey, apiSecret);
        setCachedBalance(data);
      } catch (apiError) {
        // If API fails, try using stale cache data
        const staleCached = getCachedBalance(true);
        if (staleCached) {
          console.log('⚠️ API failed, using stale cached data (up to 30 minutes old)');
          data = staleCached.data;
        } else {
          throw apiError;
        }
      }
    }

    if (data.error && data.error.length > 0) {
      console.error('❌ Kraken API error:', data.error);
      return;
    }

    if (data.result) {
      console.log('✅ Balance data received');
      let totalUSD = 0;
      
      // Calculate total USD value
      for (const [asset, amount] of Object.entries(data.result)) {
        const numericAmount = parseFloat(amount as string);
        if (numericAmount > 0) {
          console.log(`💰 ${asset}: ${numericAmount}`);
          
          // For USD assets, add directly
          if (asset === 'ZUSD' || asset === 'USD') {
            totalUSD += numericAmount;
          }
          // For other assets, we'd need price data, but for now just show the balance
        }
      }
      
      console.log(`💵 USD Balance: $${totalUSD.toFixed(2)}`);
      console.log(`📈 Total Account Balance: ~$${totalUSD.toFixed(2)} (USD assets only)`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main().catch(console.error);