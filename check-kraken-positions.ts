#!/usr/bin/env node

import { krakenApiService } from './src/lib/kraken-api-service';

async function checkKrakenPositions() {
  console.log('🔍 Checking actual Kraken open positions...');
  
  const kraken = krakenApiService;
  
  // Check if we have API credentials from environment
  const apiKey = process.env.KRAKEN_API_KEY;
  const apiSecret = process.env.KRAKEN_API_SECRET || process.env.KRAKEN_PRIVATE_KEY;
  
  if (!apiKey || !apiSecret) {
    console.log('❌ KRAKEN_API_KEY or KRAKEN_API_SECRET/KRAKEN_PRIVATE_KEY not found in environment');
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('KRAKEN')));
    process.exit(1);
  }
  
  try {
    console.log('🔐 Authenticating with Kraken...');
    const authenticated = await kraken.authenticate(apiKey, apiSecret);
    
    if (!authenticated) {
      console.log('❌ Failed to authenticate with Kraken API');
      process.exit(1);
    }
    
    console.log('✅ Authenticated successfully');
    
    // Get open positions
    console.log('📊 Fetching open positions...');
    const openPositions = await kraken.getOpenPositions();
    
    console.log('🎯 Open Positions on Kraken:');
    console.log(JSON.stringify(openPositions, null, 2));
    
    // Also get account balance to verify connection
    const balance = await kraken.getAccountBalance();
    console.log('💰 Account Balance:');
    console.log(JSON.stringify(balance, null, 2));
    
  } catch (error) {
    console.error('❌ Error checking Kraken positions:', error);
  }
}

checkKrakenPositions();