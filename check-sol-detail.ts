#!/usr/bin/env node

async function checkSOLDetail() {
  const apiKey = "DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR";
  const apiSecret = "p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==";
  
  try {
    console.log('🔍 Detailed SOL Analysis\n');
    console.log('=' .repeat(50));
    
    // 1. Check current balance
    const balanceResponse = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'Balance',
        params: {},
        apiKey: apiKey,
        apiSecret: apiSecret
      }),
    });

    const balanceData = await balanceResponse.json();
    
    let solBalance = 0;
    if (balanceData.result) {
      // Check for SOL in different formats
      const possibleSolKeys = ['SOL', 'XSOL', 'SOL.S'];
      for (const key of possibleSolKeys) {
        if (balanceData.result[key]) {
          solBalance = parseFloat(balanceData.result[key]);
          console.log(`💰 Found ${key}: ${solBalance}`);
        }
      }
    }
    
    console.log(`\n📊 Current SOL Balance: ${solBalance}`);
    
    // 2. Check ALL orders (not just open)
    console.log('\n🔍 Checking Open Orders...\n');
    const ordersResponse = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'OpenOrders',
        params: {},
        apiKey: apiKey,
        apiSecret: apiSecret
      }),
    });

    const ordersData = await ordersResponse.json();
    
    let totalSolInOrders = 0;
    let solOrders = [];
    
    if (ordersData.result && ordersData.result.open) {
      for (const [orderId, order] of Object.entries(ordersData.result.open)) {
        if (order.descr?.pair?.includes('SOL')) {
          const volume = parseFloat(order.vol);
          const volumeExecuted = parseFloat(order.vol_exec || 0);
          const remaining = volume - volumeExecuted;
          
          solOrders.push({
            id: orderId,
            type: order.descr?.type,
            volume: volume,
            executed: volumeExecuted,
            remaining: remaining,
            price: order.descr?.price || order.price,
            status: order.status
          });
          
          if (order.descr?.type === 'sell') {
            totalSolInOrders += remaining;
          }
        }
      }
    }
    
    console.log('📋 SOL Orders Found:');
    for (const order of solOrders) {
      console.log(`\n  Order ${order.id}:`);
      console.log(`    Type: ${order.type}`);
      console.log(`    Original Volume: ${order.volume}`);
      console.log(`    Executed: ${order.executed}`);
      console.log(`    Remaining: ${order.remaining}`);
      console.log(`    Price: $${order.price}`);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 SUMMARY:');
    console.log(`  Current SOL Balance: ${solBalance}`);
    console.log(`  SOL in Sell Orders: ${totalSolInOrders}`);
    console.log(`  Difference: ${solBalance - totalSolInOrders}`);
    
    // The -0.61568 you see might be the NET position
    const netPosition = solBalance - totalSolInOrders;
    console.log(`\n🎯 Net Position: ${netPosition.toFixed(8)}`);
    
    if (Math.abs(netPosition + 0.61568) < 0.001) {
      console.log('  ✅ This matches the -0.61568 shown on platform!');
      console.log('\n🚨 ISSUE IDENTIFIED:');
      console.log('  You have a SELL order for more SOL than you own!');
      console.log(`  You own: ${solBalance} SOL`);
      console.log(`  Trying to sell: ${totalSolInOrders} SOL`);
      console.log(`  Shortage: ${(totalSolInOrders - solBalance).toFixed(8)} SOL`);
      console.log('\n💡 SOLUTIONS:');
      console.log('  1. Cancel the sell order');
      console.log(`  2. Buy ${(totalSolInOrders - solBalance).toFixed(8)} more SOL`);
      console.log('  3. Reduce the sell order size');
    }
    
    // 3. Check closed orders to understand history
    console.log('\n📜 Checking Recent Closed Orders...\n');
    const closedOrdersResponse = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'ClosedOrders',
        params: { trades: true },
        apiKey: apiKey,
        apiSecret: apiSecret
      }),
    });

    const closedData = await closedOrdersResponse.json();
    
    if (closedData.result && closedData.result.closed) {
      const recentSolOrders = Object.entries(closedData.result.closed)
        .filter(([_, order]: [string, any]) => order.descr?.pair?.includes('SOL'))
        .slice(0, 5);
        
      if (recentSolOrders.length > 0) {
        console.log('Recent SOL trades:');
        for (const [orderId, order] of recentSolOrders) {
          console.log(`  ${order.descr?.type} ${order.vol} @ ${order.price || 'market'} - ${order.status}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSOLDetail().catch(console.error);