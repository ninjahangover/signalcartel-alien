#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config();

async function testSimpleMargin() {
  console.log('🧪 Testing Simple Margin Trading via Regular API...\n');

  const apiKey = process.env.KRAKEN_API_KEY || '';
  const apiSecret = process.env.KRAKEN_API_SECRET || process.env.KRAKEN_PRIVATE_KEY || '';

  if (!apiKey || !apiSecret) {
    console.error('❌ Missing API credentials');
    return;
  }

  try {
    // First check regular balance
    console.log('📊 Checking regular account balance...');

    const crypto = await import('crypto');
    const endpoint = '/0/private/Balance';
    const nonce = Date.now() * 1000;

    const postData = new URLSearchParams({
      nonce: nonce.toString()
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

    const result = await response.json();

    if (result.error?.length > 0) {
      console.error('❌ Balance check error:', result.error);
      return;
    }

    console.log('✅ Account balances:', Object.keys(result.result || {}));

    const usdBalance = result.result?.ZUSD || result.result?.USD || '0';
    console.log('   USD Balance:', usdBalance);

    // Now test placing a SHORT order with leverage
    console.log('\n📊 Testing SHORT order placement (validate only)...');

    // Get current BTC price first
    const tickerResponse = await fetch('https://api.kraken.com/0/public/Ticker?pair=XBTUSD');
    const tickerData = await tickerResponse.json();
    const currentPrice = parseFloat(tickerData.result?.XXBTZUSD?.a[0] || '0');
    console.log('   Current BTC price: $' + currentPrice);

    // Try to place a SHORT order with leverage
    const orderEndpoint = '/0/private/AddOrder';
    const orderNonce = Date.now() * 1000;

    const orderData = new URLSearchParams({
      nonce: orderNonce.toString(),
      pair: 'XBTUSD',
      type: 'sell',        // This is a SHORT
      ordertype: 'limit',
      volume: '0.0001',    // Minimum size
      price: (currentPrice * 1.02).toFixed(1), // 2% above market
      leverage: '2',       // 2x leverage
      validate: 'true'     // Just validate, don't place
    }).toString();

    const orderMessage = orderData + orderNonce + orderEndpoint;
    const orderHash = crypto.createHash('sha256').update(orderMessage).digest();
    const orderHmac = crypto.createHmac('sha512', Buffer.from(apiSecret, 'base64'));
    orderHmac.update(orderEndpoint, 'binary');
    orderHmac.update(orderHash, 'binary');
    const orderSignature = orderHmac.digest('base64');

    const orderResponse = await fetch(`https://api.kraken.com${orderEndpoint}`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'API-Sign': orderSignature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: orderData
    });

    const orderResult = await orderResponse.json();

    if (orderResult.error?.length > 0) {
      console.log('❌ Margin not available with these keys:', orderResult.error[0]);

      // Try without leverage
      console.log('\n📊 Testing regular SHORT (no leverage)...');

      const regularNonce = Date.now() * 1000;
      const regularData = new URLSearchParams({
        nonce: regularNonce.toString(),
        pair: 'XBTUSD',
        type: 'sell',
        ordertype: 'limit',
        volume: '0.0001',
        price: (currentPrice * 1.02).toFixed(1),
        validate: 'true'
      }).toString();

      const regularMessage = regularData + regularNonce + orderEndpoint;
      const regularHash = crypto.createHash('sha256').update(regularMessage).digest();
      const regularHmac = crypto.createHmac('sha512', Buffer.from(apiSecret, 'base64'));
      regularHmac.update(orderEndpoint, 'binary');
      regularHmac.update(regularHash, 'binary');
      const regularSignature = regularHmac.digest('base64');

      const regularResponse = await fetch(`https://api.kraken.com${orderEndpoint}`, {
        method: 'POST',
        headers: {
          'API-Key': apiKey,
          'API-Sign': regularSignature,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: regularData
      });

      const regularResult = await regularResponse.json();

      if (regularResult.error?.length > 0) {
        console.log('   Regular SHORT also failed:', regularResult.error[0]);
        console.log('\n⚠️  You cannot SHORT with spot trading accounts');
        console.log('   Options:');
        console.log('   1. Create a Kraken Futures account for perpetuals');
        console.log('   2. Generate API keys with margin trading permissions');
      } else {
        console.log('✅ Regular SHORT order validated!');
        console.log('   Description:', regularResult.result?.descr?.order);
      }

    } else {
      console.log('✅ Margin SHORT order validated successfully!');
      console.log('   Description:', orderResult.result?.descr?.order);
      console.log('\n🎉 Your account CAN place margin SHORT orders!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSimpleMargin().catch(console.error);