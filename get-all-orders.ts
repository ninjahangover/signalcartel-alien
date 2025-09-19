/**
 * Get ALL orders from Kraken API - all types
 */

import axios from 'axios';

async function main() {
  console.log('🔍 Fetching ALL orders from Kraken API...');

  const KRAKEN_API_KEY = 'DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR';
  const KRAKEN_PRIVATE_KEY = 'p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==';

  try {
    // Get open orders
    const openOrdersResponse = await axios.post('http://localhost:3002/api/kraken-proxy', {
      endpoint: 'OpenOrders',
      params: {},
      apiKey: KRAKEN_API_KEY,
      apiSecret: KRAKEN_PRIVATE_KEY
    });

    console.log('✅ OPEN ORDERS:');
    console.log(JSON.stringify(openOrdersResponse.data, null, 2));

    // Get closed orders (recent)
    const closedOrdersResponse = await axios.post('http://localhost:3002/api/kraken-proxy', {
      endpoint: 'ClosedOrders',
      params: { start: Math.floor(Date.now()/1000) - 86400 }, // Last 24 hours
      apiKey: KRAKEN_API_KEY,
      apiSecret: KRAKEN_PRIVATE_KEY
    });

    console.log('\\n✅ RECENT CLOSED ORDERS (24h):');
    console.log(JSON.stringify(closedOrdersResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Failed to get orders:', error.response?.data || error.message);
  }
}

main().catch(console.error);