#!/usr/bin/env node

import { krakenApiService } from './src/lib/kraken-api-service';

async function main() {
  const apiKey = "DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR";
  const apiSecret = "p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==";
  
  console.log('Testing account info...');
  await krakenApiService.authenticate(apiKey, apiSecret);
  
  try {
    console.log('Trying AccountInfo endpoint...');
    const accountInfo = await krakenApiService.makeRequest('AccountInfo');
    console.log('AccountInfo result:', accountInfo);
  } catch (error) {
    console.log('AccountInfo failed:', (error as Error).message);
  }

  try {
    console.log('Trying OpenOrders endpoint...');
    const orders = await krakenApiService.getOpenOrders();
    console.log('OpenOrders result:', orders);
  } catch (error) {
    console.log('OpenOrders failed:', (error as Error).message);
  }
}

main().catch(console.error);