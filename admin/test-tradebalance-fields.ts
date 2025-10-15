/**
 * Test script to investigate TradeBalance API fields
 * V3.14.11: Determine which field represents available cash for orders
 */

import { krakenApiService } from '../src/lib/kraken-api-service';

async function testTradeBalanceFields() {
  console.log('🔍 Investigating TradeBalance API fields...\n');

  try {
    // Get TradeBalance
    const tradeBalance = await krakenApiService.makeRequest('TradeBalance');
    console.log('📊 TradeBalance API Response:');
    console.log(JSON.stringify(tradeBalance, null, 2));
    console.log('');

    if (tradeBalance?.result) {
      const result = tradeBalance.result;
      console.log('💰 Field Breakdown:');
      console.log(`  eb (equivalent balance):    ${result.eb || 'N/A'} USD`);
      console.log(`  tb (trade balance):         ${result.tb || 'N/A'} USD`);
      console.log(`  m  (margin amount):         ${result.m || 'N/A'} USD`);
      console.log(`  n  (unrealized net P&L):    ${result.n || 'N/A'} USD`);
      console.log(`  c  (cost basis):            ${result.c || 'N/A'} USD`);
      console.log(`  v  (current value):         ${result.v || 'N/A'} USD`);
      console.log(`  e  (equity):                ${result.e || 'N/A'} USD`);
      console.log(`  mf (free margin):           ${result.mf || 'N/A'} USD`);
      console.log(`  ml (margin level):          ${result.ml || 'N/A'}`);
      console.log('');

      // Get Balance for comparison
      const balance = await krakenApiService.getAccountBalance();
      console.log('💵 Balance API Response:');
      console.log(`  ZUSD: ${balance?.result?.ZUSD || 'N/A'} USD`);
      console.log(`  USDT: ${balance?.result?.USDT || 'N/A'} USD`);
      console.log('');

      // Calculate what should be available
      const eb = parseFloat(result.eb || '0');
      const tb = parseFloat(result.tb || '0');
      const mf = parseFloat(result.mf || '0');
      const zusd = parseFloat(balance?.result?.ZUSD || '0');

      console.log('🧮 Analysis:');
      console.log(`  Total equity (eb):          $${eb.toFixed(2)}`);
      console.log(`  Trade balance (tb):         $${tb.toFixed(2)}`);
      console.log(`  Free margin (mf):           $${mf.toFixed(2)}`);
      console.log(`  Raw ZUSD balance:           $${zusd.toFixed(2)}`);
      console.log('');
      console.log('💡 Interpretation:');
      console.log('  - eb: Total account value (cash + positions)');
      console.log('  - tb: eb + unrealized P&L + credit - margin');
      console.log('  - mf: Available for new margin positions');
      console.log('  - ZUSD: Raw USD cash balance');
      console.log('');
      console.log('🎯 For SPOT trading (no margin), we should use:');
      console.log(`  → ZUSD balance: $${zusd.toFixed(2)}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTradeBalanceFields().catch(console.error);
