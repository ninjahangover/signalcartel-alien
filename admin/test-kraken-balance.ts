/**
 * Test script to verify Kraken API balance fetching
 */

import { krakenApiService } from '../src/lib/kraken-api-service';

async function testKrakenBalance() {
  console.log('🔍 Testing Kraken API balance fetch...');
  
  try {
    // Get credentials from environment
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_PRIVATE_KEY;
    
    if (!apiKey || !apiSecret) {
      console.log('❌ KRAKEN CREDENTIALS NOT FOUND in environment variables');
      return;
    }
    
    console.log('🔐 Authenticating with Kraken API...');
    const authSuccess = await krakenApiService.authenticate(apiKey, apiSecret);
    
    if (!authSuccess) {
      console.log('❌ KRAKEN API AUTHENTICATION FAILED');
      return;
    }
    
    console.log('✅ KRAKEN API AUTHENTICATED SUCCESSFULLY');
    console.log('📡 Connection status:', krakenApiService.getConnectionStatus());
    
    // Try to get balance
    console.log('💰 Fetching account balance...');
    const balanceData = await krakenApiService.getAccountBalance();
    
    console.log('✅ Raw balance response:', JSON.stringify(balanceData, null, 2));
    
    if (balanceData.result && balanceData.result.ZUSD) {
      const usdBalance = parseFloat(balanceData.result.ZUSD);
      console.log(`💰 USD Balance: $${usdBalance.toFixed(2)}`);
    } else {
      console.log('❌ No ZUSD balance found in response');
    }
    
  } catch (error) {
    console.error('🚨 Error testing Kraken balance:', error);
    console.log('📋 This suggests the API credentials may not be configured');
  }
}

testKrakenBalance().catch(console.error);