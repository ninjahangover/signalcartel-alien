#!/usr/bin/env tsx
/**
 * Cancel all open Kraken orders
 */

import axios from 'axios';

const KRAKEN_PROXY_URL = 'http://localhost:3002/api/kraken-proxy';
const API_KEY = process.env.KRAKEN_API_KEY || "DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR";
const API_SECRET = process.env.KRAKEN_PRIVATE_KEY || "p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==";

async function cancelAllOrders() {
  try {
    console.log('🔍 Checking for open orders...');

    // Get open orders
    const openOrdersResponse = await axios.post(KRAKEN_PROXY_URL, {
      endpoint: 'OpenOrders',
      params: {},
      apiKey: API_KEY,
      apiSecret: API_SECRET
    });

    const openOrders = openOrdersResponse.data?.result?.open || {};
    const orderIds = Object.keys(openOrders);

    if (orderIds.length === 0) {
      console.log('✅ No open orders to cancel');
      return;
    }

    console.log(`📊 Found ${orderIds.length} open orders:`);
    orderIds.forEach(orderId => {
      const order = openOrders[orderId];
      console.log(`   - ${orderId}: ${order.descr?.type} ${order.vol} ${order.descr?.pair} @ ${order.descr?.price}`);
    });

    console.log('');
    console.log('🗑️  Cancelling all open orders...');

    // Cancel all orders
    const cancelResponse = await axios.post(KRAKEN_PROXY_URL, {
      endpoint: 'CancelAll',
      params: {},
      apiKey: API_KEY,
      apiSecret: API_SECRET
    });

    if (cancelResponse.data?.error && cancelResponse.data.error.length > 0) {
      console.error('❌ Error cancelling orders:', cancelResponse.data.error);
    } else {
      const count = cancelResponse.data?.result?.count || orderIds.length;
      console.log(`✅ Successfully cancelled ${count} orders`);
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

cancelAllOrders();
