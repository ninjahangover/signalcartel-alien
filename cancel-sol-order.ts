#!/usr/bin/env node

async function cancelSOLOrder() {
  const apiKey = "DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR";
  const apiSecret = "p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==";
  
  const orderToCancel = "O4IGPO-TXLQB-PWWFXX";
  
  try {
    console.log(`🚫 Canceling SOL order: ${orderToCancel}\n`);
    
    const response = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'CancelOrder',
        params: {
          txid: orderToCancel
        },
        apiKey: apiKey,
        apiSecret: apiSecret
      }),
    });

    const data = await response.json();
    
    if (data.error && data.error.length > 0) {
      console.error('❌ Error canceling order:', data.error);
      return;
    }
    
    if (data.result) {
      console.log('✅ Order cancellation result:', data.result);
      
      if (data.result.count) {
        console.log(`\n🎉 Successfully canceled ${data.result.count} order(s)`);
      }
      
      if (data.result.pending) {
        console.log(`⏳ Pending cancellations: ${data.result.pending}`);
      }
    }
    
    // Verify the order is gone
    console.log('\n🔍 Verifying cancellation...\n');
    
    const verifyResponse = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'OpenOrders',
        params: {},
        apiKey: apiKey,
        apiSecret: apiSecret
      }),
    });

    const verifyData = await verifyResponse.json();
    
    if (verifyData.result && verifyData.result.open) {
      const stillExists = Object.keys(verifyData.result.open).includes(orderToCancel);
      
      if (stillExists) {
        console.log('⚠️ Order still appears in open orders - may take a moment to process');
      } else {
        console.log('✅ Confirmed: Order no longer in open orders list');
      }
      
      // Show remaining SOL orders
      const remainingSolOrders = Object.entries(verifyData.result.open)
        .filter(([_, order]: [string, any]) => order.descr?.pair?.includes('SOL'));
      
      if (remainingSolOrders.length > 0) {
        console.log('\n📋 Remaining SOL orders:');
        for (const [id, order] of remainingSolOrders) {
          console.log(`  ${id}: ${order.descr?.order}`);
        }
      } else {
        console.log('\n✅ No SOL orders remaining');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

cancelSOLOrder().catch(console.error);