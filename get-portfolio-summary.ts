#!/usr/bin/env node

// Quick portfolio summary for dashboard - optimized for speed
async function main() {
  const apiKey = "DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR";
  const apiSecret = "p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==";
  
  try {
    // Get balance from Kraken
    const response = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'Balance',
        params: {},
        apiKey: apiKey,
        apiSecret: apiSecret
      }),
    });

    const data = await response.json();
    
    if (data.error && data.error.length > 0) {
      console.error('❌ Error:', data.error);
      return;
    }

    if (!data.result) {
      console.error('❌ No balance data');
      return;
    }

    let usdBalance = 0;
    let totalEstimate = 0;
    
    // Get USD balance
    const zusd = parseFloat(data.result['ZUSD'] || '0');
    const usd = parseFloat(data.result['USD'] || '0');
    usdBalance = zusd + usd;
    
    // Quick estimate for major holdings (rough calculations for speed)
    const majorHoldings = {
      'XXBT': 110000,    // Bitcoin ~$110k
      'XETH': 4300,      // Ethereum ~$4.3k
      'DOT': 3.8,        // Polkadot ~$3.8
      'WLFI': 0.19,      // WLFI ~$0.19
      'CQT': 0.002       // CQT ~$0.002
    };
    
    let cryptoEstimate = 0;
    for (const [asset, price] of Object.entries(majorHoldings)) {
      const amount = parseFloat(data.result[asset] || '0');
      if (amount > 0) {
        cryptoEstimate += amount * price;
      }
    }
    
    totalEstimate = usdBalance + cryptoEstimate;
    
    console.log(`USD Balance: $${usdBalance.toFixed(2)}`);
    console.log(`Portfolio Estimate: $${totalEstimate.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main().catch(console.error);