/**
 * Quick test script to verify Kraken Futures API connectivity
 * Run: npx tsx test-futures-api.ts
 */

import * as dotenv from 'dotenv';
dotenv.config(); // Load .env file

import { getKrakenFuturesClient } from './src/lib/kraken-futures-client';

async function testFuturesAPI() {
  console.log('🔍 Testing Kraken Futures API Connection...');
  console.log('==========================================\n');

  const client = getKrakenFuturesClient(false); // Use live API

  try {
    // Test 1: Get available instruments
    console.log('📊 Test 1: Fetching available instruments...');
    const instruments = await client.getInstruments();
    console.log(`✅ Found ${instruments.length} instruments`);

    // Show first 5 perpetuals
    const perpetuals = instruments.filter(i => i.tradeable && i.type === 'flexible_futures').slice(0, 5);
    console.log('\n   Sample perpetual contracts:');
    for (const inst of perpetuals) {
      console.log(`   • ${inst.symbol}: ${inst.underlying || 'N/A'}`);
    }

    // Test 2: Get ticker for Bitcoin
    console.log('\n📈 Test 2: Fetching BTC ticker...');
    const ticker = await client.getTicker('PF_XBTUSD');
    if (ticker) {
      console.log(`✅ BTC Price: $${parseFloat(ticker.last).toFixed(2)}`);
      console.log(`   Bid: $${parseFloat(ticker.bid).toFixed(2)} | Ask: $${parseFloat(ticker.ask).toFixed(2)}`);
      console.log(`   24h Volume: ${parseFloat(ticker.vol24h || '0').toFixed(2)}`);
    }

    // Test 3: Get account balance (requires authentication)
    console.log('\n💰 Test 3: Fetching account balance...');
    const balances = await client.getBalance();

    if (balances.length > 0) {
      console.log('✅ Authentication successful!');
      for (const bal of balances) {
        console.log(`   ${bal.currency}:`);
        console.log(`     • Balance: $${bal.balance.toFixed(2)}`);
        console.log(`     • Available: $${bal.available.toFixed(2)}`);
        console.log(`     • Margin: $${bal.marginBalance.toFixed(2)}`);
      }
    } else {
      console.log('⚠️  No balances found (account might be empty)');
    }

    // Test 4: Get open positions
    console.log('\n📊 Test 4: Checking for open positions...');
    const positions = await client.getOpenPositions();

    if (positions.length > 0) {
      console.log(`✅ Found ${positions.length} open positions:`);
      for (const pos of positions) {
        console.log(`   ${pos.symbol}: ${pos.side.toUpperCase()} ${pos.size} @ $${pos.entryPrice}`);
        console.log(`     • Mark Price: $${pos.markPrice}`);
        console.log(`     • Unrealized P&L: $${pos.unrealizedPnl.toFixed(2)}`);
        console.log(`     • Leverage: ${pos.leverage}x`);
      }
    } else {
      console.log('✅ No open positions (ready to trade)');
    }

    console.log('\n==========================================');
    console.log('✅ ALL TESTS PASSED!');
    console.log('==========================================\n');
    console.log('Your Kraken Futures API is configured correctly.');
    console.log('You can now start futures trading with:');
    console.log('  ./futures-start.sh\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED!');
    console.error('==========================================');
    console.error(`Error: ${error.message}\n`);

    if (error.message.includes('Authentication') || error.message.includes('Invalid')) {
      console.error('💡 Troubleshooting:');
      console.error('   1. Verify API keys in .env are correct');
      console.error('   2. Ensure keys have futures trading permissions');
      console.error('   3. Check if keys are for the correct account\n');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      console.error('💡 Network issue - check internet connection\n');
    } else {
      console.error('💡 Check the error message above for details\n');
    }

    process.exit(1);
  }
}

testFuturesAPI();
