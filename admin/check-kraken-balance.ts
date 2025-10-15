/**
 * V3.14.12: Investigate Kraken balance mismatch
 * Check Balance API, OpenOrders, and actual available funds
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { krakenApiService } from '../src/lib/kraken-api-service';

async function investigateBalance() {
  console.log('🔍 V3.14.12: Investigating Kraken Balance Mismatch\n');
  console.log('='.repeat(60));

  try {
    // Authenticate first
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('Missing API credentials in environment');
    }

    console.log('🔐 Authenticating with Kraken...');
    await krakenApiService.authenticate(apiKey, apiSecret);
    console.log('✅ Authenticated\n');

    // 1. Get Balance
    console.log('💰 STEP 1: Checking Balance API');
    console.log('-'.repeat(60));
    const balance = await krakenApiService.getAccountBalance();

    if (balance?.result) {
      const zusd = parseFloat(balance.result.ZUSD || '0');
      const usdt = parseFloat(balance.result.USDT || '0');
      console.log(`  ZUSD: $${zusd.toFixed(2)}`);
      console.log(`  USDT: $${usdt.toFixed(2)}`);
      console.log(`  Total USD: $${(zusd + usdt).toFixed(2)}`);

      // Show all holdings
      console.log('\n  Other Assets:');
      for (const [asset, amount] of Object.entries(balance.result)) {
        if (asset !== 'ZUSD' && asset !== 'USDT') {
          const bal = parseFloat(amount as string);
          if (bal > 0) {
            console.log(`    ${asset}: ${bal}`);
          }
        }
      }
    }

    // 2. Get TradeBalance
    console.log('\n💰 STEP 2: Checking TradeBalance API');
    console.log('-'.repeat(60));
    const tradeBalance = await krakenApiService.makeRequest('TradeBalance');

    if (tradeBalance?.result) {
      const tb = tradeBalance.result;
      console.log(`  eb (equivalent balance):  $${parseFloat(tb.eb || '0').toFixed(2)}`);
      console.log(`  tb (trade balance):       $${parseFloat(tb.tb || '0').toFixed(2)}`);
      console.log(`  m  (margin amount):       $${parseFloat(tb.m || '0').toFixed(2)}`);
      console.log(`  n  (unrealized P&L):      $${parseFloat(tb.n || '0').toFixed(2)}`);
      console.log(`  c  (cost basis):          $${parseFloat(tb.c || '0').toFixed(2)}`);
      console.log(`  v  (floating value):      $${parseFloat(tb.v || '0').toFixed(2)}`);
      console.log(`  e  (equity):              $${parseFloat(tb.e || '0').toFixed(2)}`);
      console.log(`  mf (free margin):         $${parseFloat(tb.mf || '0').toFixed(2)}`);
      console.log(`  ml (margin level):        ${tb.ml || 'N/A'}`);
    }

    // 3. Get OpenOrders
    console.log('\n📋 STEP 3: Checking Open Orders');
    console.log('-'.repeat(60));
    const openOrders = await krakenApiService.getOpenOrders();

    if (openOrders?.result?.open) {
      const orders = Object.entries(openOrders.result.open);
      console.log(`  Found ${orders.length} open orders:`);

      let totalReserved = 0;
      for (const [txid, order] of orders) {
        const o = order as any;
        const vol = parseFloat(o.vol || '0');
        const price = parseFloat(o.descr?.price || '0');
        const orderValue = vol * price;
        totalReserved += orderValue;

        console.log(`    ${txid.substring(0, 8)}... ${o.descr?.type} ${vol} ${o.descr?.pair} @ $${price.toFixed(2)} = $${orderValue.toFixed(2)}`);
      }

      console.log(`\n  💸 Total Reserved in Orders: $${totalReserved.toFixed(2)}`);
    } else {
      console.log('  No open orders');
    }

    // 4. Calculate actual available
    console.log('\n🧮 STEP 4: Calculating Actual Available Balance');
    console.log('-'.repeat(60));

    const zusd = parseFloat(balance?.result?.ZUSD || '0');
    const usdt = parseFloat(balance?.result?.USDT || '0');
    const totalCash = zusd + usdt;

    const openOrdersReserved = openOrders?.result?.open
      ? Object.values(openOrders.result.open).reduce((sum, o: any) => {
          return sum + (parseFloat(o.vol || '0') * parseFloat(o.descr?.price || '0'));
        }, 0)
      : 0;

    const actualAvailable = totalCash - openOrdersReserved;

    console.log(`  Total Cash (ZUSD + USDT):     $${totalCash.toFixed(2)}`);
    console.log(`  Reserved in Open Orders:      $${openOrdersReserved.toFixed(2)}`);
    console.log(`  Actual Available:             $${actualAvailable.toFixed(2)}`);

    // 5. Try a small test order (validate only)
    console.log('\n🧪 STEP 5: Testing Small Order (Validate Mode)');
    console.log('-'.repeat(60));

    try {
      const testAmount = 0.001; // Very small amount
      const testPrice = 3800; // Example price for ETH
      const testValue = testAmount * testPrice;

      console.log(`  Attempting to validate $${testValue.toFixed(2)} order...`);

      const testOrder = await krakenApiService.placeOrder({
        pair: 'ETHUSD',
        type: 'buy',
        ordertype: 'limit',
        volume: testAmount.toString(),
        price: testPrice.toString(),
        validate: true // VALIDATE ONLY - doesn't actually place order
      });

      console.log('  ✅ Test order validation result:', testOrder);
    } catch (testError) {
      console.log('  ❌ Test order validation failed:', testError.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 CONCLUSION:');
    console.log('='.repeat(60));
    console.log(`Our V3.14.11 validation checks: $${totalCash.toFixed(2)}`);
    console.log(`Kraken actually available:      $${actualAvailable.toFixed(2)}`);
    console.log(`Difference:                     $${(totalCash - actualAvailable).toFixed(2)} (reserved)`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

investigateBalance().catch(console.error);
