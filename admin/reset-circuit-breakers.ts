#!/usr/bin/env tsx

/**
 * Reset Circuit Breakers - Emergency Fix
 * Resets all external API circuit breakers to CLOSED state
 */

import { realTimePriceFetcher } from '../src/lib/real-time-price-fetcher';

async function resetCircuitBreakers() {
  console.log('🔄 Resetting all circuit breakers...');
  
  // Get the singleton instance
  const priceFetcher = realTimePriceFetcher;
  
  // Access private circuitBreakers property through reflection
  const circuitBreakers = (priceFetcher as any).circuitBreakers;
  
  if (circuitBreakers && circuitBreakers instanceof Map) {
    const apis = ['coingecko', 'binance', 'cryptocompare', 'coinbase'];
    
    apis.forEach(api => {
      circuitBreakers.set(api, {
        failures: 0,
        lastFailure: 0,
        isOpen: false
      });
      console.log(`✅ Reset circuit breaker for ${api}`);
    });
    
    console.log('🎉 All circuit breakers reset to CLOSED state');
    
    // Test fetch to verify functionality
    console.log('🧪 Testing circuit breaker reset...');
    try {
      const testPrice = await priceFetcher.getCurrentPrice('BTCUSD');
      console.log(`✅ Test successful - BTC price: $${testPrice}`);
    } catch (error) {
      console.log(`⚠️ Test failed but circuit breakers are reset: ${error}`);
    }
  } else {
    console.error('❌ Could not access circuit breakers');
  }
}

resetCircuitBreakers().catch(console.error);