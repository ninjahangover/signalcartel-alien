#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config();

async function testKrakenMarginAccess() {
  console.log('🔍 Testing Kraken Margin/Perpetual Access with Existing Keys...\n');

  try {
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_PRIVATE_KEY || process.env.KRAKEN_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('❌ Missing KRAKEN_API_KEY or KRAKEN_API_SECRET in .env');
      return;
    }

    console.log('✅ Found API credentials in environment\n');

    // Test 1: Check regular balance
    console.log('📊 Test 1: Checking Spot Balances...');
    const spotBalance = await makeKrakenRequest('/0/private/Balance', {}, apiKey, apiSecret);

    if (spotBalance.error?.length > 0) {
      console.error('❌ Error:', spotBalance.error);
    } else {
      const balances = spotBalance.result || {};
      console.log('✅ Spot Balances:');
      Object.entries(balances).forEach(([asset, amount]) => {
        if (Number(amount) > 0) {
          console.log(`   ${asset}: ${amount}`);
        }
      });
    }

    // Test 2: Check trade balance (includes margin info)
    console.log('\n📊 Test 2: Checking Trade Balance (Margin Info)...');
    const tradeBalance = await makeKrakenRequest('/0/private/TradeBalance', {
      asset: 'ZUSD'
    }, apiKey, apiSecret);

    if (tradeBalance.error?.length > 0) {
      console.error('❌ Error:', tradeBalance.error);
    } else if (tradeBalance.result) {
      const tb = tradeBalance.result;
      console.log('✅ Trade Balance Info:');
      console.log(`   Equity: $${tb.eb || 0}`);
      console.log(`   Trade Balance: $${tb.tb || 0}`);
      console.log(`   Margin: $${tb.m || 0}`);
      console.log(`   Free Margin: $${tb.mf || 0}`);
      console.log(`   Margin Level: ${tb.ml || 'N/A'}`);
    }

    // Test 3: Check if we can query margin pairs
    console.log('\n📊 Test 3: Checking Margin Trading Pairs...');
    const assetPairs = await makeKrakenRequest('/0/public/AssetPairs', {
      pair: 'XBTUSD,ETHUSD,SOLUSD'
    }, apiKey, apiSecret);

    if (assetPairs.result) {
      console.log('✅ Margin-enabled pairs:');
      Object.entries(assetPairs.result).forEach(([pair, info]: [string, any]) => {
        if (info.leverage_buy && info.leverage_buy.length > 0) {
          console.log(`   ${pair}: Max leverage ${Math.max(...info.leverage_buy)}x`);
        }
      });
    }

    // Test 4: Check open positions (margin/futures)
    console.log('\n📊 Test 4: Checking Open Positions (Margin)...');
    const positions = await makeKrakenRequest('/0/private/OpenPositions', {
      docalcs: true
    }, apiKey, apiSecret);

    if (positions.error?.length > 0) {
      if (positions.error[0].includes('Permission denied')) {
        console.log('⚠️  No margin trading permissions on this API key');
        console.log('   You may need to enable margin trading in your Kraken account settings');
      } else {
        console.error('❌ Error:', positions.error);
      }
    } else if (positions.result) {
      const openPos = Object.entries(positions.result);
      if (openPos.length === 0) {
        console.log('✅ No open margin positions');
      } else {
        console.log('✅ Open positions:', openPos);
      }
    }

    // Test 5: Try to place a small margin order (will cancel immediately)
    console.log('\n📊 Test 5: Testing Margin Order Capability...');
    console.log('   (Will place and immediately cancel a small limit order)\n');

    // First get current BTC price
    const ticker = await makeKrakenRequest('/0/public/Ticker', {
      pair: 'XBTUSD'
    }, apiKey, apiSecret);

    if (ticker.result?.XXBTZUSD) {
      const currentPrice = parseFloat(ticker.result.XXBTZUSD.a[0]);
      const testPrice = currentPrice * 0.8; // 20% below market (won't fill)

      console.log(`   Current BTC price: $${currentPrice}`);
      console.log(`   Test order price: $${testPrice} (20% below market)`);

      // Try to place a margin SELL order (SHORT)
      const testOrder = await makeKrakenRequest('/0/private/AddOrder', {
        pair: 'XBTUSD',
        type: 'sell',
        ordertype: 'limit',
        price: testPrice,
        volume: '0.0001',  // Minimum size
        leverage: 'none',   // No leverage (1x)
        validate: true      // Validate only, don't actually place
      }, apiKey, apiSecret);

      if (testOrder.error?.length > 0) {
        if (testOrder.error[0].includes('Insufficient')) {
          console.log('⚠️  Insufficient margin funds for test order');
          console.log('   You have margin access but need funds in margin account');
        } else if (testOrder.error[0].includes('Permission')) {
          console.log('⚠️  No margin trading permissions');
        } else {
          console.log('⚠️  Order validation error:', testOrder.error);
        }
      } else {
        console.log('✅ Margin order validation successful!');
        console.log('   You can place SHORT orders with these keys');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY:');
    console.log('='.repeat(60));

    if (tradeBalance.result?.mf && Number(tradeBalance.result.mf) > 0) {
      console.log('✅ Margin trading appears to be ENABLED');
      console.log(`✅ Free margin available: $${tradeBalance.result.mf}`);
      console.log('✅ You can likely place SHORT trades with leverage: none (1x)');
    } else {
      console.log('⚠️  Margin trading may need to be enabled in account settings');
      console.log('⚠️  Or you may need to transfer funds to margin wallet');
    }

    console.log('\n💡 Next steps:');
    console.log('   1. If margin not enabled, enable it in Kraken account settings');
    console.log('   2. Transfer some USD from spot to margin wallet in Kraken');
    console.log('   3. Use leverage: "none" for 1x (no leverage) trading');
    console.log('   4. Modify trading system to use margin orders for SHORT signals');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function makeKrakenRequest(
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

  // Create signature
  const message = postData + nonce + endpoint;
  const hash = crypto.createHash('sha256').update(message).digest();
  const hmac = crypto.createHmac('sha512', Buffer.from(apiSecret, 'base64'));
  hmac.update(endpoint, 'binary');
  hmac.update(hash, 'binary');
  const signature = hmac.digest('base64');

  // Make request
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

// Run the test
testKrakenMarginAccess().catch(console.error);