#!/usr/bin/env node

interface AssetBalance {
  asset: string;
  amount: number;
  usdPrice: number;
  usdValue: number;
}

async function getPrice(tradingPair: string): Promise<number> {
  try {
    const response = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'Ticker',
        params: { pair: tradingPair },
        apiKey: "DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR",
        apiSecret: "p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg=="
      }),
    });

    const data = await response.json();
    if (data.result && Object.keys(data.result).length > 0) {
      const pairData = Object.values(data.result)[0] as any;
      return parseFloat(pairData.c[0]); // Current price
    }
    return 0;
  } catch (error) {
    console.error(`❌ Error fetching price for ${tradingPair}:`, error);
    return 0;
  }
}

async function main() {
  const apiKey = "DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR";
  const apiSecret = "p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==";
  
  try {
    console.log('💰 Fetching complete portfolio balance...');
    
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
      console.error('❌ Kraken API error:', data.error);
      return;
    }

    if (!data.result) {
      console.error('❌ No balance data received');
      return;
    }

    // Asset mapping to trading pairs
    const assetMappings: { [key: string]: string } = {
      'XXBT': 'XBTUSD',       // Bitcoin
      'XETH': 'XETHZUSD',     // Ethereum  
      'XXRP': 'XXRPZUSD',     // XRP
      'XLTC': 'XLTCZUSD',     // Litecoin
      'XXDG': 'XDGUSD',       // Dogecoin
      'ADA': 'ADAUSD',        // Cardano
      'SOL': 'SOLUSD',        // Solana
      'ALGO': 'ALGOUSD',      // Algorand
      'LINK': 'LINKUSD',      // Chainlink
      'CQT': 'CQTUSD',        // Covalent
      'DOT': 'DOTUSD',        // Polkadot
      'AVAX': 'AVAXUSD',      // Avalanche
      'USDT': 'USDTZUSD',     // Tether
      'WLFI': 'WLFIUSD',      // World Liberty Financial
      'UNI': 'UNIUSD',        // Uniswap
      'MATIC': 'MATICUSD',    // Polygon
      'AAVE': 'AAVEUSD',      // Aave
      'QTUM': 'QTUMUSD',      // Qtum
      'EOS': 'EOSUSD',        // EOS
      'FIL': 'FILUSD',        // Filecoin
      'KSM': 'KSMUSD',        // Kusama
      'XZEC': 'ZECUSD',       // Zcash
      'SHIB': 'SHIBUSD',      // Shiba Inu
      'PROMPT': 'PROMPTUSD'   // Prompt (if exists)
    };

    const holdings: AssetBalance[] = [];
    let totalUSD = 0;
    let cryptoUSD = 0;
    let fiatUSD = 0;

    console.log('\n📊 COMPLETE PORTFOLIO BREAKDOWN:');
    console.log('═══════════════════════════════════════');

    // Process each asset
    for (const [asset, amount] of Object.entries(data.result)) {
      const numericAmount = parseFloat(amount as string);
      
      if (numericAmount <= 0.00000001) continue; // Skip dust amounts
      
      let usdPrice = 0;
      let usdValue = 0;
      
      if (asset === 'ZUSD' || asset === 'USD') {
        // Fiat USD
        usdPrice = 1;
        usdValue = numericAmount;
        fiatUSD += usdValue;
        console.log(`💵 ${asset.replace('Z', '')}: ${numericAmount.toFixed(2)} @ $${usdPrice.toFixed(2)} = $${usdValue.toFixed(2)} [FIAT]`);
      } else {
        // Cryptocurrency - get current price
        const tradingPair = assetMappings[asset];
        if (tradingPair) {
          console.log(`🔍 Fetching price for ${asset} (${tradingPair})...`);
          usdPrice = await getPrice(tradingPair);
          usdValue = numericAmount * usdPrice;
          cryptoUSD += usdValue;
          
          if (usdPrice > 0) {
            console.log(`🪙 ${asset}: ${numericAmount.toFixed(8)} @ $${usdPrice.toFixed(4)} = $${usdValue.toFixed(2)} [CRYPTO]`);
          } else {
            console.log(`⚠️ ${asset}: ${numericAmount.toFixed(8)} @ $0.0000 = $0.00 [NO PRICE]`);
          }
        } else {
          console.log(`❓ ${asset}: ${numericAmount.toFixed(8)} [UNMAPPED]`);
        }
      }
      
      if (usdValue > 0.01) { // Only include assets worth more than 1 cent
        holdings.push({
          asset: asset,
          amount: numericAmount,
          usdPrice: usdPrice,
          usdValue: usdValue
        });
      }
      
      totalUSD += usdValue;
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('═══════════════════════════════════════');
    console.log('\n💎 PORTFOLIO SUMMARY:');
    console.log(`💰 Fiat Holdings: $${fiatUSD.toFixed(2)}`);
    console.log(`🚀 Crypto Holdings: $${cryptoUSD.toFixed(2)}`);
    console.log(`🎯 TOTAL PORTFOLIO VALUE: $${totalUSD.toFixed(2)}`);
    
    // Show percentage breakdown
    const fiatPct = totalUSD > 0 ? (fiatUSD / totalUSD * 100) : 0;
    const cryptoPct = totalUSD > 0 ? (cryptoUSD / totalUSD * 100) : 0;
    console.log(`📈 Allocation: ${fiatPct.toFixed(1)}% Fiat, ${cryptoPct.toFixed(1)}% Crypto`);
    
    // Show top holdings
    const topHoldings = holdings
      .filter(h => h.usdValue > 1) // Only show holdings > $1
      .sort((a, b) => b.usdValue - a.usdValue)
      .slice(0, 10);
      
    if (topHoldings.length > 0) {
      console.log('\n🏆 TOP HOLDINGS (>$1):');
      topHoldings.forEach((holding, i) => {
        const pct = totalUSD > 0 ? (holding.usdValue / totalUSD * 100) : 0;
        console.log(`${(i + 1).toString().padStart(2)}. ${holding.asset.padEnd(8)} $${holding.usdValue.toFixed(2).padStart(8)} (${pct.toFixed(1)}%)`);
      });
    }

    // Final balance line for easy parsing
    console.log(`\n✅ Final Complete Balance: $${totalUSD.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main().catch(console.error);