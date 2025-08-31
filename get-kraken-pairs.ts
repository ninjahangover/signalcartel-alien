/**
 * Get actual Kraken trading pairs for QUANTUM FORGE™ Profit Predator
 */

interface KrakenPair {
  altname: string;
  wsname: string;
  status: string;
  leverage_buy?: number[];
  leverage_sell?: number[];
}

interface KrakenResponse {
  error: string[];
  result: Record<string, KrakenPair>;
}

async function getKrakenPairs(): Promise<void> {
  try {
    const response = await fetch('https://api.kraken.com/0/public/AssetPairs');
    const data: KrakenResponse = await response.json();

    if (data.error.length > 0) {
      console.error('Kraken API Error:', data.error);
      return;
    }

    // Filter for USD pairs only (most liquid)
    const usdPairs = Object.entries(data.result)
      .filter(([, pair]) => 
        pair.status === 'online' && 
        (pair.altname.endsWith('USD') || pair.altname.endsWith('USDT') || pair.altname.endsWith('USDC'))
      )
      .map(([symbol, pair]) => ({
        symbol: pair.altname,
        wsname: pair.wsname,
        leverage: pair.leverage_buy?.length > 0 ? Math.max(...pair.leverage_buy) : 1,
        baseAsset: pair.altname.replace(/(USD|USDT|USDC)$/, ''),
        quoteAsset: pair.altname.match(/(USD|USDT|USDC)$/)?.[0] || 'USD'
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    console.log(`🚀 Found ${usdPairs.length} active USD trading pairs on Kraken:`);
    console.log('\n📊 TOP LEVERAGE OPPORTUNITIES:');
    
    // Show pairs with leverage (most important for profit predator)
    const leveragePairs = usdPairs.filter(p => p.leverage > 1);
    console.log(`   💪 ${leveragePairs.length} pairs support leverage trading:`);
    
    leveragePairs.slice(0, 20).forEach(pair => {
      console.log(`      ${pair.symbol.padEnd(12)} - ${pair.leverage}x leverage (${pair.wsname})`);
    });

    console.log('\n🎯 KEY CRYPTO PAIRS FOR PROFIT HUNTING:');
    const majorCryptos = ['BTC', 'ETH', 'ADA', 'DOT', 'LINK', 'UNI', 'AAVE', 'DOGE', 'XRP', 'SOL'];
    majorCryptos.forEach(crypto => {
      const pairs = usdPairs.filter(p => p.baseAsset === crypto || p.symbol.startsWith(crypto));
      if (pairs.length > 0) {
        console.log(`   ${crypto}: ${pairs.map(p => p.symbol).join(', ')}`);
      }
    });

    // Export for use in our system
    const exportData = {
      totalPairs: usdPairs.length,
      leveragePairs: leveragePairs.length,
      pairs: usdPairs.map(p => p.symbol),
      leverageMap: Object.fromEntries(leveragePairs.map(p => [p.symbol, p.leverage]))
    };

    console.log('\n💾 Exporting pairs data...');
    console.log(JSON.stringify(exportData, null, 2));

  } catch (error) {
    console.error('❌ Failed to fetch Kraken pairs:', error);
  }
}

if (require.main === module) {
  getKrakenPairs();
}