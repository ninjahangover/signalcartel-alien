import { krakenApiService } from './src/lib/kraken-api-service';

async function checkRealBalances() {
  console.log('🔍 Fetching real Kraken balances...\n');
  
  try {
    // Authenticate first
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_PRIVATE_KEY;
    
    if (!apiKey || !apiSecret) {
      console.log('❌ KRAKEN CREDENTIALS NOT FOUND');
      return;
    }
    
    await krakenApiService.authenticate(apiKey, apiSecret);
    const balanceResponse = await krakenApiService.getAccountBalance();
    const balances = balanceResponse?.result || {};
    
    const prices: Record<string, number> = {};
    const pairs = ['XBTUSD', 'ETHUSD', 'SOLUSD', 'DOTUSD', 'AVAXUSD', 'BNBUSD'];
    
    // Fetch current prices
    for (const pair of pairs) {
      try {
        const ticker = await krakenApiService.getTicker(pair);
        const price = parseFloat(ticker.a[0]); // Ask price
        prices[pair] = price;
      } catch (e) {
        console.log(`Failed to get price for ${pair}`);
      }
    }
    
    console.log('📊 KRAKEN ACCOUNT BALANCES:');
    console.log('=' .repeat(60));
    
    let totalValue = 0;
    const usdBalance = parseFloat(balances.ZUSD || '0');
    
    console.log(`💵 USD: $${usdBalance.toFixed(2)}`);
    totalValue += usdBalance;
    
    // Map balances to our symbols and calculate values
    const positionValues: Array<{symbol: string, balance: number, price: number, value: number}> = [];
    
    if (balances.XXBT) {
      const balance = parseFloat(balances.XXBT);
      const price = prices.XBTUSD || 0;
      const value = balance * price;
      positionValues.push({symbol: 'BTC', balance, price, value});
      totalValue += value;
    }
    
    if (balances.XETH) {
      const balance = parseFloat(balances.XETH);
      const price = prices.ETHUSD || 0;
      const value = balance * price;
      positionValues.push({symbol: 'ETH', balance, price, value});
      totalValue += value;
    }
    
    if (balances.SOL) {
      const balance = parseFloat(balances.SOL);
      const price = prices.SOLUSD || 0;
      const value = balance * price;
      positionValues.push({symbol: 'SOL', balance, price, value});
      totalValue += value;
    }
    
    if (balances.DOT) {
      const balance = parseFloat(balances.DOT);
      const price = prices.DOTUSD || 0;
      const value = balance * price;
      positionValues.push({symbol: 'DOT', balance, price, value});
      totalValue += value;
    }
    
    if (balances.AVAX) {
      const balance = parseFloat(balances.AVAX);
      const price = prices.AVAXUSD || 0;
      const value = balance * price;
      positionValues.push({symbol: 'AVAX', balance, price, value});
      totalValue += value;
    }
    
    if (balances.BNB) {
      const balance = parseFloat(balances.BNB);
      const price = prices.BNBUSD || 0;
      const value = balance * price;
      positionValues.push({symbol: 'BNB', balance, price, value});
      totalValue += value;
    }
    
    console.log('\n📈 POSITIONS:');
    for (const pos of positionValues) {
      console.log(`${pos.symbol}: ${pos.balance} @ $${pos.price.toFixed(2)} = $${pos.value.toFixed(2)}`);
    }
    
    const positionsTotal = positionValues.reduce((sum, p) => sum + p.value, 0);
    
    console.log('\n' + '=' .repeat(60));
    console.log(`💰 TOTAL PORTFOLIO VALUE: $${totalValue.toFixed(2)}`);
    console.log(`   USD Balance: $${usdBalance.toFixed(2)}`);
    console.log(`   Positions Value: $${positionsTotal.toFixed(2)}`);
    
    console.log('\n⚠️  DASHBOARD vs KRAKEN COMPARISON:');
    console.log(`   Dashboard shows: $733.24`);
    console.log(`   Kraken actual: $${totalValue.toFixed(2)}`);
    console.log(`   Difference: $${(733.24 - totalValue).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error fetching balances:', error);
  }
}

checkRealBalances();