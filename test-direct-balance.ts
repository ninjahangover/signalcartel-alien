#!/usr/bin/env node

import { KrakenDirectAPI } from './src/lib/kraken-direct-api';

async function testDirectBalance() {
  console.log('🔍 Testing Direct Kraken API Balance...');
  
  const apiKey = process.env.KRAKEN_API_KEY;
  const apiSecret = process.env.KRAKEN_PRIVATE_KEY;
  
  if (!apiKey || !apiSecret) {
    console.log('❌ KRAKEN_API_KEY or KRAKEN_API_SECRET/KRAKEN_PRIVATE_KEY not found in environment');
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('KRAKEN')));
    process.exit(1);
  }
  
  try {
    console.log('🔐 Creating direct Kraken API client...');
    const kraken = new KrakenDirectAPI(apiKey, apiSecret);
    
    console.log('💰 Fetching account balance...');
    const balanceResponse = await kraken.getAccountBalance();
    
    console.log('🎯 Raw Balance Response:');
    console.log(JSON.stringify(balanceResponse, null, 2));
    
    if (balanceResponse?.result) {
      const usdBalance = balanceResponse.result.ZUSD || '0';
      console.log(`💰 USD Balance: $${parseFloat(usdBalance).toFixed(2)}`);
      
      // Show all balances
      console.log('\n📊 All Balances:');
      for (const [currency, amount] of Object.entries(balanceResponse.result)) {
        if (parseFloat(amount as string) > 0) {
          console.log(`  ${currency}: ${amount}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error fetching balance:', error);
  }
}

testDirectBalance();