#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config();

import { krakenMarginService } from './src/lib/kraken-margin-service';

async function testMarginTrading() {
  console.log('🧪 Testing Kraken Margin Trading (SHORT position)...\n');

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
        console.log('\n⚠️  Insufficient margin funds. Transfer funds to margin wallet first.');
        return;
      }
    } else {
      console.log('❌ Could not fetch margin balance');
      return;
    }

    // Step 2: Get current BTC price
    console.log('\n📊 Getting current BTC price...');
    const tickerResponse = await fetch('https://api.kraken.com/0/public/Ticker?pair=XBTUSD');
    const tickerData = await tickerResponse.json();

    if (tickerData.result?.XXBTZUSD) {
      const currentPrice = parseFloat(tickerData.result.XXBTZUSD.a[0]);
      console.log('   Current BTC price: $' + currentPrice);

      // Step 3: Place a test SHORT order (validate only)
      console.log('\n📊 Testing SHORT order (validate only)...');
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
        console.log('\n💡 To enable in production:');
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
