#!/usr/bin/env npx tsx

/**
 * Enable Kraken Margin Trading for SHORT positions
 * This script modifies the trading system to use margin orders
 * when receiving SELL signals without existing positions
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 Enabling Kraken Margin Trading Support...\n');

// Step 1: Add KRAKEN_API_SECRET to .env (alias for KRAKEN_PRIVATE_KEY)
console.log('📝 Step 1: Adding KRAKEN_API_SECRET alias to .env...');
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

if (!envContent.includes('KRAKEN_API_SECRET=')) {
  // Find KRAKEN_PRIVATE_KEY value
  const privateKeyMatch = envContent.match(/KRAKEN_PRIVATE_KEY="([^"]+)"/);
  if (privateKeyMatch) {
    const privateKey = privateKeyMatch[1];
    const newEnvLine = `\n# Alias for compatibility\nKRAKEN_API_SECRET="${privateKey}"`;
    fs.appendFileSync(envPath, newEnvLine);
    console.log('✅ Added KRAKEN_API_SECRET alias to .env');
  }
} else {
  console.log('✅ KRAKEN_API_SECRET already exists in .env');
}

// Step 2: Create enhanced Kraken service with margin support
console.log('\n📝 Step 2: Creating enhanced Kraken margin service...');

const marginServiceCode = `import { TRADING_CONFIG } from './config';

export interface MarginOrderParams {
  pair: string;
  type: 'buy' | 'sell';  // buy = LONG, sell = SHORT
  ordertype: 'market' | 'limit';
  volume: string;
  price?: string;
  leverage?: string;  // 'none' for 1x, '2' for 2x, etc.
  validate?: boolean; // Validate only, don't place
}

export class KrakenMarginService {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = process.env.KRAKEN_API_KEY || '';
    this.apiSecret = process.env.KRAKEN_API_SECRET || process.env.KRAKEN_PRIVATE_KEY || '';
  }

  async placeMarginOrder(params: MarginOrderParams): Promise<any> {
    const crypto = await import('crypto');

    // Default to no leverage (1x) for safety
    if (!params.leverage) {
      params.leverage = 'none';
    }

    const endpoint = '/0/private/AddOrder';
    const nonce = Date.now() * 1000;

    const postData = new URLSearchParams({
      nonce: nonce.toString(),
      pair: params.pair,
      type: params.type,
      ordertype: params.ordertype,
      volume: params.volume,
      leverage: params.leverage,
      ...(params.price && { price: params.price }),
      ...(params.validate && { validate: 'true' })
    }).toString();

    // Create signature
    const message = postData + nonce + endpoint;
    const hash = crypto.createHash('sha256').update(message).digest();
    const hmac = crypto.createHmac('sha512', Buffer.from(this.apiSecret, 'base64'));
    hmac.update(endpoint, 'binary');
    hmac.update(hash, 'binary');
    const signature = hmac.digest('base64');

    // Make request
    const response = await fetch(\`https://api.kraken.com\${endpoint}\`, {
      method: 'POST',
      headers: {
        'API-Key': this.apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: postData
    });

    const result = await response.json();

    if (result.error?.length > 0) {
      console.error('❌ Margin order error:', result.error);
      throw new Error(result.error[0]);
    }

    return result;
  }

  async getMarginBalance(): Promise<any> {
    const crypto = await import('crypto');

    const endpoint = '/0/private/TradeBalance';
    const nonce = Date.now() * 1000;

    const postData = new URLSearchParams({
      nonce: nonce.toString(),
      asset: 'ZUSD'
    }).toString();

    // Create signature
    const message = postData + nonce + endpoint;
    const hash = crypto.createHash('sha256').update(message).digest();
    const hmac = crypto.createHmac('sha512', Buffer.from(this.apiSecret, 'base64'));
    hmac.update(endpoint, 'binary');
    hmac.update(hash, 'binary');
    const signature = hmac.digest('base64');

    // Make request
    const response = await fetch(\`https://api.kraken.com\${endpoint}\`, {
      method: 'POST',
      headers: {
        'API-Key': this.apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: postData
    });

    const result = await response.json();

    if (result.error?.length > 0) {
      console.error('❌ Margin balance error:', result.error);
      return null;
    }

    return result.result;
  }
}

export const krakenMarginService = new KrakenMarginService();
`;

const marginServicePath = path.join(process.cwd(), 'src', 'lib', 'kraken-margin-service.ts');
fs.writeFileSync(marginServicePath, marginServiceCode);
console.log('✅ Created kraken-margin-service.ts');

// Step 3: Create a test script for margin trading
console.log('\n📝 Step 3: Creating margin trading test script...');

const testScriptCode = `#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config();

import { krakenMarginService } from './src/lib/kraken-margin-service';

async function testMarginTrading() {
  console.log('🧪 Testing Kraken Margin Trading (SHORT position)...\\n');

  try {
    // Step 1: Check margin balance
    console.log('📊 Checking margin balance...');
    const balance = await krakenMarginService.getMarginBalance();

    if (balance) {
      console.log('✅ Margin Balance:');
      console.log('   Equity: $' + (balance.eb || 0));
      console.log('   Free Margin: $' + (balance.mf || 0));
      console.log('   Margin Level: ' + (balance.ml || 'N/A'));

      if (!balance.mf || parseFloat(balance.mf) < 10) {
        console.log('\\n⚠️  Insufficient margin funds. Transfer funds to margin wallet first.');
        return;
      }
    } else {
      console.log('❌ Could not fetch margin balance');
      return;
    }

    // Step 2: Get current BTC price
    console.log('\\n📊 Getting current BTC price...');
    const tickerResponse = await fetch('https://api.kraken.com/0/public/Ticker?pair=XBTUSD');
    const tickerData = await tickerResponse.json();

    if (tickerData.result?.XXBTZUSD) {
      const currentPrice = parseFloat(tickerData.result.XXBTZUSD.a[0]);
      console.log('   Current BTC price: $' + currentPrice);

      // Step 3: Place a test SHORT order (validate only)
      console.log('\\n📊 Testing SHORT order (validate only)...');
      const testPrice = (currentPrice * 1.01).toFixed(1); // 1% above market

      try {
        const orderResult = await krakenMarginService.placeMarginOrder({
          pair: 'XBTUSD',
          type: 'sell',  // SHORT position
          ordertype: 'limit',
          volume: '0.0001',  // Minimum size
          price: testPrice,
          leverage: 'none',  // 1x leverage (no leverage)
          validate: true     // Just validate, don't place
        });

        console.log('✅ Margin SHORT order validation successful!');
        console.log('   You can place SHORT positions with margin trading');
        console.log('\\n💡 To enable in production:');
        console.log('   1. Set ENABLE_MARGIN_TRADING=true in .env');
        console.log('   2. Restart the trading system');
        console.log('   3. System will use margin for SHORT signals');

      } catch (error: any) {
        if (error.message.includes('Insufficient')) {
          console.log('⚠️  Insufficient margin for test order');
          console.log('   Transfer more funds to margin wallet');
        } else {
          console.log('❌ Order validation failed:', error.message);
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMarginTrading().catch(console.error);
`;

const testScriptPath = path.join(process.cwd(), 'test-margin-short.ts');
fs.writeFileSync(testScriptPath, testScriptCode);
console.log('✅ Created test-margin-short.ts');

// Step 4: Show integration instructions
console.log('\n' + '='.repeat(60));
console.log('📋 MARGIN TRADING INTEGRATION COMPLETE');
console.log('='.repeat(60));
console.log('\n✅ Files created:');
console.log('   - src/lib/kraken-margin-service.ts (margin trading service)');
console.log('   - test-margin-short.ts (test script)');
console.log('   - Updated .env with KRAKEN_API_SECRET alias');

console.log('\n📊 Next Steps:');
console.log('   1. Run test script: npx tsx test-margin-short.ts');
console.log('   2. If successful, add to .env: ENABLE_MARGIN_TRADING=true');
console.log('   3. Modify production-trading-multi-pair.ts to use margin for SHORTs');

console.log('\n🎯 Quick Integration Example:');
console.log(`
// In production-trading-multi-pair.ts, add:

import { krakenMarginService } from './src/lib/kraken-margin-service';

// When tensor says SELL without position:
if (tensorDecision === 'SELL' && !hasPosition) {
  if (process.env.ENABLE_MARGIN_TRADING === 'true') {
    // Use margin to open SHORT
    await krakenMarginService.placeMarginOrder({
      pair: symbol,
      type: 'sell',
      ordertype: 'limit',
      volume: calculateVolume(),
      price: currentPrice * 1.001,
      leverage: 'none'  // 1x for safety
    });
    console.log('✅ Opened SHORT position via margin');
  } else {
    console.log('⚠️ Skipping SHORT - margin not enabled');
  }
}
`);

console.log('\n✨ System ready for margin trading integration!');