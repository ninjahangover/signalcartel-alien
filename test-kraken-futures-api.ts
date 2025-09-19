#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config();

async function testKrakenFuturesAPI() {
  console.log('🔍 Testing Kraken Futures API Access...\n');

  const apiKey = process.env.KRAKEN_API_KEY;
  const apiSecret = process.env.KRAKEN_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('❌ Missing API credentials');
    return;
  }

  console.log('📊 Testing Different Kraken API Endpoints:\n');

  // Test 1: Regular Spot API
  console.log('1️⃣ Testing Regular Spot API (api.kraken.com)...');
  try {
    const spotResult = await testEndpoint(
      'https://api.kraken.com',
      '/0/private/Balance',
      apiKey,
      apiSecret
    );
    if (spotResult.error?.length > 0) {
      console.log('   ❌ Spot API:', spotResult.error[0]);
    } else {
      console.log('   ✅ Spot API works!', Object.keys(spotResult.result || {}));
    }
  } catch (e: any) {
    console.log('   ❌ Spot API error:', e.message);
  }

  // Test 2: Futures API
  console.log('\n2️⃣ Testing Futures API (futures.kraken.com)...');
  try {
    const futuresResult = await testFuturesEndpoint(
      'https://futures.kraken.com',
      '/derivatives/api/v3/accounts',
      apiKey,
      apiSecret
    );
    console.log('   Futures response:', futuresResult);
  } catch (e: any) {
    console.log('   ❌ Futures API error:', e.message);
  }

  // Test 3: Check what type of key this is
  console.log('\n3️⃣ Determining API Key Type...');
  console.log('   Key starts with:', apiKey.substring(0, 4));
  console.log('   Key length:', apiKey.length);

  if (apiKey.startsWith('UT')) {
    console.log('   📌 This appears to be a Futures/Derivatives API key');
    console.log('   💡 Use futures.kraken.com endpoints');
  } else if (apiKey.startsWith('DX')) {
    console.log('   📌 This appears to be a Spot Trading API key');
    console.log('   💡 Use api.kraken.com endpoints');
  }

  // Test 4: Try Futures-specific authentication
  console.log('\n4️⃣ Testing Futures Authentication...');
  try {
    const authHeader = createFuturesAuthHeader(
      '/derivatives/api/v3/accounts',
      '',
      apiSecret
    );

    const response = await fetch('https://futures.kraken.com/derivatives/api/v3/accounts', {
      headers: {
        'APIKey': apiKey,
        'Authent': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await response.json();

    if (data.result === 'success') {
      console.log('   ✅ Futures authentication successful!');
      console.log('   Account info:', data.accounts);
    } else {
      console.log('   ❌ Futures auth failed:', data);
    }
  } catch (e: any) {
    console.log('   ❌ Futures auth error:', e.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  console.log('\nBased on the API key prefix "UT", these are likely:');
  console.log('✅ Kraken FUTURES API keys (not spot/margin)');
  console.log('\nFor futures trading:');
  console.log('- Use endpoint: https://futures.kraken.com');
  console.log('- Different API structure than spot/margin');
  console.log('- Can trade perpetual contracts (including shorts)');
  console.log('\nFor margin trading on spot:');
  console.log('- Would need regular Kraken API keys (not futures)');
  console.log('- Would use api.kraken.com with margin parameters');
}

async function testEndpoint(
  baseUrl: string,
  endpoint: string,
  apiKey: string,
  apiSecret: string
): Promise<any> {
  const crypto = await import('crypto');
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

  const response = await fetch(`${baseUrl}${endpoint}`, {
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

async function testFuturesEndpoint(
  baseUrl: string,
  endpoint: string,
  apiKey: string,
  apiSecret: string
): Promise<any> {
  // Futures API uses different auth
  const crypto = await import('crypto');
  const nonce = Date.now().toString();
  const authent = crypto
    .createHash('sha256')
    .update(nonce + endpoint)
    .digest('base64');

  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'APIKey': apiKey,
      'Nonce': nonce,
      'Authent': authent
    }
  });

  return response.json();
}

function createFuturesAuthHeader(
  endpoint: string,
  postData: string,
  apiSecret: string
): string {
  const crypto = require('crypto');
  const nonce = Date.now().toString();
  const message = postData + nonce + endpoint;
  const hash = crypto
    .createHmac('sha256', Buffer.from(apiSecret, 'base64'))
    .update(message)
    .digest('base64');
  return hash;
}

testKrakenFuturesAPI().catch(console.error);