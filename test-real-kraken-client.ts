#!/usr/bin/env node

import { KrakenClient } from './src/lib/live-trading/kraken-client';

async function main() {
  const apiKey = "DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR";
  const privateKey = "p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==";
  
  console.log('🔍 Testing KrakenClient...');
  const client = new KrakenClient({
    apiKey,
    privateKey,
    isLive: true
  });
  
  try {
    console.log('💰 Getting balance...');
    const balance = await client.getBalance();
    console.log('✅ Balance result:', balance);
    
    if (balance.ZUSD) {
      const usdBalance = parseFloat(balance.ZUSD);
      console.log(`💰 USD Balance: $${usdBalance.toFixed(2)}`);
    }
    
    console.log('📊 Getting formatted balance...');
    const formatted = await client.getFormattedBalance();
    console.log('📊 Formatted balance:', formatted);
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

main();