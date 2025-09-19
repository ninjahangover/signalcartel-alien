/**
 * Test BNB display in dashboard
 */

const KRAKEN_API_KEY = 'DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR';
const KRAKEN_PRIVATE_KEY = 'p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==';

async function krakenApiCall(endpoint: string, params: any = {}) {
  try {
    const response = await fetch('http://localhost:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        params,
        apiKey: KRAKEN_API_KEY,
        apiSecret: KRAKEN_PRIVATE_KEY
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken error: ${data.error.join(', ')}`);
    }

    return data.result;
  } catch (error) {
    console.error(`Kraken API ${endpoint} failed:`, error.message);
    return null;
  }
}

async function testBNBDisplay() {
  console.log('🔍 Testing BNB display issue...\n');

  // Get balance and ticker data
  const [balance, ticker] = await Promise.all([
    krakenApiCall('Balance'),
    krakenApiCall('Ticker', { pair: 'BNBUSD' })
  ]);

  console.log('=== BALANCE DATA ===');
  console.log('BNB Balance:', balance?.BNB);
  console.log('Full balance object:', balance);

  console.log('\n=== TICKER DATA ===');
  console.log('BNBUSD Ticker:', ticker?.BNBUSD);
  console.log('Full ticker object:', ticker);

  // Simulate dashboard logic
  if (balance?.BNB) {
    const quantity = parseFloat(balance.BNB);
    console.log('\n=== DASHBOARD SIMULATION ===');
    console.log('Parsed quantity:', quantity);
    console.log('Is quantity > 0.001?', quantity > 0.001);

    if (quantity > 0.001) {
      const price = parseFloat(ticker?.BNBUSD?.c?.[0] || '0');
      const value = quantity * price;

      console.log('Price from ticker:', price);
      console.log('Calculated value:', value);
      console.log('Should show in dashboard: YES');

      console.log('\nPosition object would be:');
      console.log({
        symbol: 'BNB',
        name: 'BNB',
        quantity: quantity,
        price: price,
        value: value
      });
    } else {
      console.log('Should show in dashboard: NO (quantity too small)');
    }
  } else {
    console.log('\n=== NO BNB FOUND ===');
    console.log('BNB not found in balance response');
  }
}

testBNBDisplay().catch(console.error);