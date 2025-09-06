#!/usr/bin/env node

import { KrakenDirectAPI } from './src/lib/kraken-direct-api';

export async function getRealKrakenBalance(): Promise<number> {
  console.log('💰 Getting real Kraken balance...');
  
  // Method 1: Try Direct Kraken API
  try {
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_PRIVATE_KEY;
    
    if (apiKey && apiSecret) {
      console.log('🔐 Trying direct Kraken API...');
      const kraken = new KrakenDirectAPI(apiKey, apiSecret);
      const balanceResponse = await kraken.getAccountBalance();
      
      if (balanceResponse?.result?.ZUSD) {
        const balance = parseFloat(balanceResponse.result.ZUSD);
        console.log(`✅ Direct API Balance: $${balance.toFixed(2)}`);
        return balance;
      }
    }
  } catch (error) {
    console.log('⚠️ Direct API failed:', (error as Error).message);
  }
  
  // Method 2: Parse production logs
  try {
    const fs = require('fs');
    if (fs.existsSync('/tmp/signalcartel-logs/production-trading.log')) {
      const logContent = fs.readFileSync('/tmp/signalcartel-logs/production-trading.log', 'utf8');
      const lines = logContent.split('\n').reverse(); // Start from most recent
      
      for (const line of lines) {
        if (line.includes('REAL AVAILABLE BALANCE: $')) {
          const match = line.match(/REAL AVAILABLE BALANCE: \$([0-9.]+)/);
          if (match) {
            const balance = parseFloat(match[1]);
            console.log(`✅ Production Log Balance: $${balance.toFixed(2)}`);
            return balance;
          }
        }
        
        if (line.includes('Kraken Balance: $')) {
          const match = line.match(/Kraken Balance: \$([0-9.]+)/);
          if (match) {
            const balance = parseFloat(match[1]);
            console.log(`✅ Log Balance: $${balance.toFixed(2)}`);
            return balance;
          }
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Log parsing failed:', (error as Error).message);
  }
  
  console.log('⚠️ Using conservative fallback balance');
  return 300.00; // Conservative fallback
}

// If called directly
if (require.main === module) {
  (async () => {
    const balance = await getRealKrakenBalance();
    console.log(`💰 Final Balance: $${balance.toFixed(2)}`);
  })();
}