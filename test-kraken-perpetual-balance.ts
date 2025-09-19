import { TRADING_CONFIG } from './src/lib/config';

async function testKrakenPerpetualBalance() {
  console.log('🔍 Testing Kraken Perpetual Trading Account Access...\n');

  try {
    const apiKey = TRADING_CONFIG.KRAKEN_API.API_KEY;
    const apiSecret = TRADING_CONFIG.KRAKEN_API.API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('❌ Missing Kraken API credentials');
      return;
    }

    // First, test regular spot balance
    console.log('📊 Step 1: Testing Spot Account Balance...');
    const spotBalanceResponse = await makeKrakenRequest('/0/private/Balance', {}, apiKey, apiSecret);

    if (spotBalanceResponse.error?.length > 0) {
      console.error('❌ Spot balance error:', spotBalanceResponse.error);
    } else {
      console.log('✅ Spot balances:', spotBalanceResponse.result);
    }

    // Test Futures/Perpetual endpoints
    console.log('\n📊 Step 2: Testing Perpetual/Futures Account...');

    // Try the futures wallet balance endpoint
    const futuresBalanceResponse = await makeKrakenRequest('/0/private/Wallets', {}, apiKey, apiSecret);

    if (futuresBalanceResponse.error?.length > 0) {
      console.error('❌ Wallets error:', futuresBalanceResponse.error);
    } else {
      console.log('✅ Wallet balances:', futuresBalanceResponse.result);
    }

    // Try to get trading account info (includes margin)
    console.log('\n📊 Step 3: Testing Trading Balance Info...');
    const tradeBalanceResponse = await makeKrakenRequest('/0/private/TradeBalance', {
      asset: 'USD'
    }, apiKey, apiSecret);

    if (tradeBalanceResponse.error?.length > 0) {
      console.error('❌ Trade balance error:', tradeBalanceResponse.error);
    } else {
      console.log('✅ Trade balance info:', tradeBalanceResponse.result);
    }

    // Try to get open positions (futures/margin)
    console.log('\n📊 Step 4: Checking Open Positions...');
    const openPositionsResponse = await makeKrakenRequest('/0/private/OpenPositions', {
      docalcs: true
    }, apiKey, apiSecret);

    if (openPositionsResponse.error?.length > 0) {
      if (openPositionsResponse.error[0] === 'EGeneral:Permission denied') {
        console.log('⚠️ No futures/margin permissions on this API key');
      } else {
        console.error('❌ Open positions error:', openPositionsResponse.error);
      }
    } else {
      console.log('✅ Open positions:', openPositionsResponse.result);
    }

    // Check if we can access futures-specific endpoints
    console.log('\n📊 Step 5: Testing Futures-Specific Endpoints...');
    console.log('ℹ️ Note: Kraken uses different API endpoints for futures:');
    console.log('   - Spot/Margin: api.kraken.com');
    console.log('   - Futures: futures.kraken.com');
    console.log('\n🔍 For perpetual trading, we need to:');
    console.log('   1. Use futures.kraken.com API endpoints');
    console.log('   2. Generate separate API keys for futures trading');
    console.log('   3. Implement futures-specific order types');

    // Test if current API key has margin trading enabled
    console.log('\n📊 Step 6: Checking Margin/Leverage Capabilities...');
    const assetPairsResponse = await makeKrakenRequest('/0/public/AssetPairs', {
      pair: 'XBTUSD'
    }, apiKey, apiSecret);

    if (assetPairsResponse.result?.XXBTZUSD) {
      const pairInfo = assetPairsResponse.result.XXBTZUSD;
      console.log('✅ XBTUSD pair info:');
      console.log('   - Margin trading:', pairInfo.margin_call ? 'Yes' : 'No');
      console.log('   - Leverage available:', pairInfo.leverage_buy || 'None');
    }

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

  // Add nonce
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
testKrakenPerpetualBalance().catch(console.error);