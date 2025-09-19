import { krakenApiService } from './src/lib/kraken-api-service';

async function checkAllBalances() {
  console.log('🔍 Checking all Kraken balances including USDT...\n');
  
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
    
    console.log('📊 ALL KRAKEN BALANCES:');
    console.log('=' .repeat(50));
    
    let totalValue = 0;
    
    for (const [asset, balance] of Object.entries(balances)) {
      const balanceNum = parseFloat(balance as string);
      if (balanceNum > 0.0001) { // Only show significant balances
        console.log(`${asset}: ${balance}`);
        
        // For USD assets, add directly to total
        if (asset === 'ZUSD' || asset === 'USDT') {
          totalValue += balanceNum;
          console.log(`  -> Adding $${balanceNum.toFixed(2)} to portfolio`);
        }
      }
    }
    
    console.log('=' .repeat(50));
    console.log(`💰 Total USD + USDT: $${totalValue.toFixed(2)}`);
    
    // Check current dashboard calculation
    console.log('\n🔍 CURRENT DASHBOARD LOGIC:');
    console.log('Only counting ZUSD:', balances.ZUSD || '0');
    console.log('Ignoring USDT:', balances.USDT || '0');
    
    if (balances.USDT && parseFloat(balances.USDT) > 0) {
      const usdtValue = parseFloat(balances.USDT);
      console.log(`\n💡 SOLUTION: Dashboard should include USDT balance of $${usdtValue.toFixed(2)}`);
      console.log(`   Current dashboard total: $526.00`);
      console.log(`   With USDT added: $${(526.00 + usdtValue).toFixed(2)}`);
      console.log(`   Kraken total: $542.85`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAllBalances();