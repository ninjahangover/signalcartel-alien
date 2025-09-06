import axios from 'axios';

async function testProxyServer() {
  console.log('🔧 Testing Kraken Proxy Server...');
  
  const apiKey = process.env.KRAKEN_API_KEY;
  const apiSecret = process.env.KRAKEN_PRIVATE_KEY;
  
  if (!apiKey || !apiSecret) {
    console.log('❌ KRAKEN CREDENTIALS NOT FOUND');
    return;
  }
  
  try {
    // Test the health endpoint first
    console.log('🔍 Testing health endpoint...');
    const healthResponse = await axios.get('http://127.0.0.1:3002/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test balance fetch through proxy
    console.log('💰 Testing Balance API through proxy...');
    const balanceResponse = await axios.post('http://127.0.0.1:3002/api/kraken-proxy', {
      endpoint: 'Balance',
      params: {},
      apiKey: apiKey,
      apiSecret: apiSecret
    });
    
    console.log('✅ Balance response:', JSON.stringify(balanceResponse.data, null, 2));
    
    if (balanceResponse.data.result && balanceResponse.data.result.ZUSD) {
      const usdBalance = parseFloat(balanceResponse.data.result.ZUSD);
      console.log(`💰 USD Balance: $${usdBalance.toFixed(2)}`);
    }
    
    // Test open orders
    console.log('📋 Testing OpenOrders API through proxy...');
    const ordersResponse = await axios.post('http://127.0.0.1:3002/api/kraken-proxy', {
      endpoint: 'OpenOrders',
      params: {},
      apiKey: apiKey,
      apiSecret: apiSecret
    });
    
    console.log('✅ OpenOrders response:', JSON.stringify(ordersResponse.data, null, 2));
    
    console.log('🎯 Kraken Proxy Server is working correctly!');
    
  } catch (error: any) {
    console.error('❌ Proxy server test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testProxyServer().catch(console.error);