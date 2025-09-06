#!/usr/bin/env tsx

/**
 * Cancel stuck open orders that are locking up the balance
 */

import { config } from 'dotenv';
config();

interface KrakenResponse {
  error: string[];
  result?: any;
}

async function callKrakenProxy(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  const response = await fetch('http://127.0.0.1:3002/kraken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endpoint,
      params,
      apiKey: process.env.KRAKEN_API_KEY!,
      apiSecret: process.env.KRAKEN_PRIVATE_KEY!
    })
  });
  
  const data = await response.json();
  if (!response.ok || (data.error && data.error.length > 0)) {
    throw new Error(`Kraken API error: ${data.error?.join(', ') || response.statusText}`);
  }
  
  return data.result;
}

async function main() {
  console.log('🔍 Checking for stuck open orders...');
  
  try {
    // Get open orders
    const openOrders = await callKrakenProxy('OpenOrders');
    console.log('📋 Open Orders Response:', JSON.stringify(openOrders, null, 2));
    
    if (openOrders.open && Object.keys(openOrders.open).length > 0) {
      console.log(`\n🚨 Found ${Object.keys(openOrders.open).length} open orders!`);
      
      // Cancel each open order
      for (const [orderId, orderData] of Object.entries(openOrders.open)) {
        console.log(`\n🗑️ Canceling order ${orderId}...`);
        console.log('   Order details:', JSON.stringify(orderData, null, 2));
        
        try {
          const cancelResult = await callKrakenProxy('CancelOrder', { txid: orderId });
          console.log(`✅ Successfully canceled order ${orderId}`);
          console.log('   Cancel result:', JSON.stringify(cancelResult, null, 2));
        } catch (error) {
          console.error(`❌ Failed to cancel order ${orderId}:`, error);
        }
      }
    } else {
      console.log('✅ No open orders found - balance should be free');
    }
    
    // Check balance after cancellation
    console.log('\n💰 Checking balance after order cancellation...');
    const balance = await callKrakenProxy('Balance');
    console.log('Current balance:', JSON.stringify(balance, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main().catch(console.error);