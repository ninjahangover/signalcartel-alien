/**
 * Get REAL trade history from Kraken API to calculate actual P&L
 * No hard-coding - everything from API calls
 */

import axios from 'axios';

async function main() {
  console.log('🔍 Fetching REAL trade history and P&L from Kraken API...');

  try {
    // Get trade history
    const tradesResponse = await axios.post('http://localhost:3002/api/kraken-proxy', {
      endpoint: 'TradesHistory',
      params: {},
      apiKey: 'DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR',
      apiSecret: 'p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg=='
    });

    console.log('✅ REAL Trade History Response:');
    console.log(JSON.stringify(tradesResponse.data, null, 2));

    // Get current balances
    const balanceResponse = await axios.post('http://localhost:3002/api/kraken-proxy', {
      endpoint: 'Balance',
      params: {},
      apiKey: 'DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR',
      apiSecret: 'p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg=='
    });

    console.log('\\n✅ REAL Current Balances:');
    console.log(JSON.stringify(balanceResponse.data, null, 2));

    // Get current prices for P&L calculation
    const tickerResponse = await axios.get('http://localhost:3002/public/Ticker?pair=BNBUSD,DOTUSD,AVAXUSD');

    console.log('\\n✅ REAL Current Prices:');
    console.log(JSON.stringify(tickerResponse.data, null, 2));

    console.log('\\n🎯 NOW we can calculate REAL P&L from actual trade data!');

  } catch (error) {
    console.error('❌ Failed to get real data:', error.response?.data || error.message);
  }
}

main().catch(console.error);