#!/usr/bin/env node

import * as fs from 'fs';

const CACHE_FILE = '/tmp/kraken-balance-cache.json';
const CACHE_DURATION = 300000; // 5 minutes cache for dashboard
const STALE_CACHE_DURATION = 1800000; // 30 minutes - use stale data if API fails

interface CachedBalance {
  data: any;
  timestamp: number;
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

async function main() {
  try {
    // Check cache first
    const cached = getCachedBalance(true); // Always allow stale for dashboard
    
    if (cached && cached.data && cached.data.result) {
      let totalUSD = 0;
      
      // Calculate total USD value
      for (const [asset, amount] of Object.entries(cached.data.result)) {
        const numericAmount = parseFloat(amount as string);
        if (numericAmount > 0) {
          // For USD assets, add directly
          if (asset === 'ZUSD' || asset === 'USD') {
            totalUSD += numericAmount;
          }
        }
      }
      
      console.log(totalUSD.toFixed(2));
    } else {
      console.log("0.00");
    }
  } catch (error) {
    console.log("0.00");
  }
}

main().catch(() => console.log("0.00"));