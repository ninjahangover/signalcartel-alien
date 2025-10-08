/**
 * Check actual open positions/orders from Kraken API
 */
import fetch from 'node-fetch';

async function checkKrakenPositions() {
  const apiKey = process.env.KRAKEN_API_KEY;
  const apiSecret = process.env.KRAKEN_API_SECRET;

  console.log('🔍 Checking Kraken API for open positions/orders...\n');

  // Check OpenPositions (for margin/futures)
  try {
    const posResponse = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'OpenPositions',
        params: {},
        apiKey,
        apiSecret
      })
    });
    const posData = await posResponse.json();
    console.log('📊 OpenPositions Response:', JSON.stringify(posData, null, 2));
  } catch (err) {
    console.log('⚠️ OpenPositions error:', err.message);
  }

  // Check OpenOrders
  try {
    const ordersResponse = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'OpenOrders',
        params: {},
        apiKey,
        apiSecret
      })
    });
    const ordersData = await ordersResponse.json();
    console.log('\n📊 OpenOrders Response:', JSON.stringify(ordersData, null, 2));
  } catch (err) {
    console.log('⚠️ OpenOrders error:', err.message);
  }

  // Check Balance (shows holdings)
  try {
    const balResponse = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'Balance',
        params: {},
        apiKey,
        apiSecret
      })
    });
    const balData = await balResponse.json();

    console.log('\n💰 Current Holdings (Balance API):');
    const balances = balData.result || {};
    for (const [asset, amount] of Object.entries(balances)) {
      const bal = parseFloat(amount as string);
      if (bal > 0.0001) {
        console.log(`  ${asset}: ${bal}`);
      }
    }
  } catch (err) {
    console.log('⚠️ Balance error:', err.message);
  }
}

checkKrakenPositions();
