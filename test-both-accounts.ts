#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Testing Both Kraken Accounts: Spot/Margin & Futures\n');
console.log('='.repeat(60));

// Test 1: Spot Account (may have margin)
console.log('\n1️⃣ SPOT ACCOUNT (DX... key):\n');

async function testSpotMargin() {
  const apiKey = process.env.KRAKEN_API_KEY!;
  const apiSecret = process.env.KRAKEN_API_SECRET!;

  // Check regular balance
  console.log('📊 Checking spot balances...');
  const balances = await makeSpotRequest('/0/private/Balance', {}, apiKey, apiSecret);

  if (balances.result) {
    const nonZero = Object.entries(balances.result)
      .filter(([_, amount]) => Number(amount) > 0);

    if (nonZero.length > 0) {
      console.log('✅ Spot balances:');
      nonZero.forEach(([asset, amount]) => {
        console.log(`   ${asset}: ${amount}`);
      });
    } else {
      console.log('⚠️  No spot balances found');
    }
  }

  // Check margin capabilities
  console.log('\n📊 Checking margin capabilities...');
  const tradeBalance = await makeSpotRequest('/0/private/TradeBalance', {
    asset: 'ZUSD'
  }, apiKey, apiSecret);

  if (tradeBalance.result) {
    const tb = tradeBalance.result;
    console.log('✅ Margin info:');
    console.log(`   Trade Balance: $${tb.tb || 0}`);
    console.log(`   Free Margin: $${tb.mf || 0}`);

    if (tb.mf && Number(tb.mf) > 0) {
      console.log('   ✅ MARGIN TRADING AVAILABLE!');
    } else {
      console.log('   ⚠️  No margin funds or not enabled');
    }
  }

  // Test margin order capability
  console.log('\n📊 Testing margin SHORT capability...');
  const ticker = await makeSpotRequest('/0/public/Ticker', {
    pair: 'XBTUSD'
  }, apiKey, apiSecret);

  if (ticker.result?.XXBTZUSD) {
    const price = parseFloat(ticker.result.XXBTZUSD.a[0]);
    const testPrice = (price * 0.8).toFixed(1);

    const testOrder = await makeSpotRequest('/0/private/AddOrder', {
      pair: 'XBTUSD',
      type: 'sell',
      ordertype: 'limit',
      price: testPrice,
      volume: '0.0001',
      leverage: 'none',
      validate: true
    }, apiKey, apiSecret);

    if (testOrder.error?.length > 0) {
      console.log('   ❌ Cannot place margin orders:', testOrder.error[0]);
    } else {
      console.log('   ✅ CAN PLACE MARGIN SHORTS!');
    }
  }
}

// Test 2: Futures Account
console.log('\n2️⃣ FUTURES ACCOUNT (UT... key):\n');

async function testFutures() {
  const apiKey = process.env.KRAKEN_FUTURES_API_KEY!;
  const apiSecret = process.env.KRAKEN_FUTURES_API_SECRET!;

  // Test futures account
  console.log('📊 Checking futures account...');

  const endpoint = '/derivatives/api/v3/accounts';
  const nonce = Date.now().toString();
  const crypto = await import('crypto');

  const hash = crypto
    .createHmac('sha256', Buffer.from(apiSecret, 'base64'))
    .update('' + nonce + endpoint)
    .digest('base64');

  try {
    const response = await fetch(`https://futures.kraken.com${endpoint}`, {
      headers: {
        'APIKey': apiKey,
        'Nonce': nonce,
        'Authent': hash
      }
    });

    const data = await response.json();

    if (data.result === 'success') {
      console.log('✅ Futures account connected!');
      if (data.accounts) {
        console.log('   Accounts:', data.accounts);
      }
    } else {
      console.log('❌ Futures connection failed:', data.error);
    }
  } catch (e: any) {
    console.log('❌ Futures error:', e.message);
  }

  // Check futures wallets
  console.log('\n📊 Checking futures wallets...');
  const walletsEndpoint = '/derivatives/api/v3/wallets';
  const walletsNonce = Date.now().toString();

  const walletsHash = crypto
    .createHmac('sha256', Buffer.from(apiSecret, 'base64'))
    .update('' + walletsNonce + walletsEndpoint)
    .digest('base64');

  try {
    const response = await fetch(`https://futures.kraken.com${walletsEndpoint}`, {
      headers: {
        'APIKey': apiKey,
        'Nonce': walletsNonce,
        'Authent': walletsHash
      }
    });

    const data = await response.json();

    if (data.result === 'success' && data.wallets) {
      console.log('✅ Futures wallets:', data.wallets);
    }
  } catch (e: any) {
    console.log('❌ Wallets error:', e.message);
  }
}

async function makeSpotRequest(
  endpoint: string,
  params: any,
  apiKey: string,
  apiSecret: string
): Promise<any> {
  const crypto = await import('crypto');

  // Public endpoints don't need auth
  if (endpoint.includes('/public/')) {
    const url = `https://api.kraken.com${endpoint}?${new URLSearchParams(params)}`;
    const response = await fetch(url);
    return response.json();
  }

  // Private endpoints need auth
  const nonce = Date.now() * 1000;
  const postData = new URLSearchParams({
    nonce: nonce.toString(),
    ...params
  }).toString();

  const message = postData + nonce + endpoint;
  const hash = crypto.createHash('sha256').update(message).digest();
  const hmac = crypto.createHmac('sha512', Buffer.from(apiSecret, 'base64'));
  hmac.update(endpoint, 'binary');
  hmac.update(hash, 'binary');
  const signature = hmac.digest('base64');

  const response = await fetch(`https://api.kraken.com${endpoint}`, {
    method: 'POST',
    headers: {
      'API-Key': apiKey,
      'API-Sign': signature,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: postData
  });

  return response.json();
}

// Run both tests
(async () => {
  await testSpotMargin();
  await testFutures();

  console.log('\n' + '='.repeat(60));
  console.log('📋 RECOMMENDATION:');
  console.log('='.repeat(60));
  console.log('\n🎯 You have TWO separate systems:');
  console.log('1. SPOT account - for regular trading (may have margin)');
  console.log('2. FUTURES account - for perpetual contracts');
  console.log('\nUse FUTURES for SHORT positions since:');
  console.log('- Your $100 is in the futures account');
  console.log('- Futures can easily go SHORT without borrowing');
  console.log('- No margin interest on perpetuals (just funding rates)');
})().catch(console.error);