/**
 * Check for any open orders on Kraken account
 */

import { krakenApiService } from '../src/lib/kraken-api-service';

async function checkKrakenOrders() {
  console.log('🔍 Checking Kraken account for any open orders...');
  
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
    
    // Check for open orders
    console.log('📋 Fetching open orders...');
    const openOrders = await krakenApiService.getOpenOrders();
    
    console.log('📋 Open Orders Response:', JSON.stringify(openOrders, null, 2));
    
    if (openOrders.result && openOrders.result.open) {
      const orderCount = Object.keys(openOrders.result.open).length;
      console.log(`📊 Total Open Orders: ${orderCount}`);
      
      if (orderCount > 0) {
        console.log('🚨 FOUND OPEN ORDERS:');
        Object.entries(openOrders.result.open).forEach(([orderId, order]: [string, any]) => {
          console.log(`  Order ID: ${orderId}`);
          console.log(`  Pair: ${order.descr.pair}`);
          console.log(`  Type: ${order.descr.type}`);
          console.log(`  Volume: ${order.vol}`);
          console.log(`  Price: ${order.descr.price}`);
          console.log('  ---');
        });
      } else {
        console.log('✅ NO OPEN ORDERS FOUND - Account is clean');
      }
    } else {
      console.log('✅ NO OPEN ORDERS FOUND - Account is clean');
    }
    
  } catch (error) {
    console.error('🚨 Error checking Kraken orders:', error);
  }
}

checkKrakenOrders().catch(console.error);