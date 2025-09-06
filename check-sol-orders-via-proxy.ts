#!/usr/bin/env node

async function checkSOLOrders() {
  const apiKey = "DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR";
  const apiSecret = "p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==";
  
  try {
    console.log('🔍 Checking for open orders on Kraken...\n');
    
    // Get open orders
    const ordersResponse = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: 'OpenOrders',
        params: {},
        apiKey: apiKey,
        apiSecret: apiSecret
      }),
    });

    const ordersData = await ordersResponse.json();
    
    if (ordersData.error && ordersData.error.length > 0) {
      console.error('❌ Error fetching orders:', ordersData.error);
      return;
    }

    let solOrderFound = false;
    
    if (ordersData.result && ordersData.result.open) {
      const orderIds = Object.keys(ordersData.result.open);
      console.log(`📊 Found ${orderIds.length} open order(s):\n`);
      
      for (const orderId of orderIds) {
        const order = ordersData.result.open[orderId];
        const pair = order.descr?.pair || '';
        
        console.log(`Order ID: ${orderId}`);
        console.log(`  Pair: ${pair}`);
        console.log(`  Type: ${order.descr?.type} ${order.descr?.ordertype}`);
        console.log(`  Volume: ${order.vol} (executed: ${order.vol_exec})`);
        console.log(`  Price: ${order.descr?.price || order.price || 'market'}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Order description: ${order.descr?.order}`);
        
        // Check if this is SOL related
        if (pair.includes('SOL')) {
          solOrderFound = true;
          console.log('\n⚠️  THIS IS A SOL ORDER!');
          
          if (order.descr?.type === 'sell') {
            console.log('🚨 This is a SELL order in SPOT market!');
            console.log('   IMPORTANT: In SPOT markets, you cannot sell assets you don\'t own.');
            console.log('   If this is stuck, you may need to:');
            console.log('   1. Cancel the sell order');
            console.log('   2. OR buy SOL first to fulfill the sell order');
          }
        }
        console.log('---\n');
      }
      
      if (!solOrderFound) {
        console.log('✅ No SOL-related orders found\n');
      }
    } else {
      console.log('✅ No open orders found\n');
    }
    
    // Check balance for SOL
    console.log('💰 Checking account balance for SOL...\n');
    
    const balanceResponse = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
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

    const balanceData = await balanceResponse.json();
    
    if (balanceData.error && balanceData.error.length > 0) {
      console.error('❌ Error fetching balance:', balanceData.error);
      return;
    }
    
    if (balanceData.result) {
      const solAssets = Object.keys(balanceData.result).filter(key => 
        key.includes('SOL') || key === 'XSOL'
      );
      
      if (solAssets.length > 0) {
        console.log('🪙 SOL Balance:');
        for (const asset of solAssets) {
          const amount = parseFloat(balanceData.result[asset]);
          console.log(`  ${asset}: ${amount}`);
          if (amount > 0 && solOrderFound) {
            console.log('  ✅ You have SOL to potentially fulfill sell orders');
          }
        }
      } else {
        console.log('  ❌ No SOL balance found (0 SOL owned)');
        if (solOrderFound) {
          console.log('  🚨 WARNING: You have SOL orders but no SOL balance!');
          console.log('  This could cause the order to be stuck.');
        }
      }
      
      // Show USD balance too
      const usdAssets = Object.keys(balanceData.result).filter(key => 
        key.includes('USD') || key === 'ZUSD'
      );
      if (usdAssets.length > 0) {
        console.log('\n💵 USD Balance:');
        for (const asset of usdAssets) {
          console.log(`  ${asset}: $${parseFloat(balanceData.result[asset]).toFixed(2)}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSOLOrders().catch(console.error);