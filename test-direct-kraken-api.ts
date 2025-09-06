import { krakenDirectAPI } from './src/lib/kraken-direct-api';

async function testDirectAPI() {
  console.log('🔧 Testing Direct Kraken API...');
  
  const apiKey = process.env.KRAKEN_API_KEY;
  const apiSecret = process.env.KRAKEN_PRIVATE_KEY;
  
  if (!apiKey || !apiSecret) {
    console.log('❌ KRAKEN CREDENTIALS NOT FOUND');
    return;
  }
  
  console.log('🔐 Authenticating with Direct API...');
  const authSuccess = await krakenDirectAPI.authenticate(apiKey, apiSecret);
  
  if (!authSuccess) {
    console.log('❌ DIRECT API AUTHENTICATION FAILED');
    return;
  }
  
  console.log('✅ DIRECT API AUTHENTICATED SUCCESSFULLY');
  
  // Test balance fetch
  console.log('💰 Fetching account balance...');
  const balanceData = await krakenDirectAPI.getAccountBalance();
  
  console.log('✅ Balance response:', JSON.stringify(balanceData, null, 2));
  
  if (balanceData.result && balanceData.result.ZUSD) {
    const usdBalance = parseFloat(balanceData.result.ZUSD);
    console.log(`💰 USD Balance: $${usdBalance.toFixed(2)}`);
  }
  
  console.log('🎯 Direct Kraken API is working! No proxy needed!');
}

testDirectAPI().catch(console.error);
