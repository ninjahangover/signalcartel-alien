#!/usr/bin/env node

/**
 * Test Kraken Position Price Fetcher
 * 
 * This script tests the new Kraken-based price fetching for open positions
 * and compares it with the existing multi-source price fetcher
 */

import { testKrakenPositionPriceFetch } from './src/lib/kraken-position-price-fetcher';
import { testRealPriceFetch } from './src/lib/real-time-price-fetcher';
import { testCoinGeckoBatchFetch } from './src/lib/coingecko-batch-fetcher';

async function main() {
  console.log('🧪 PRICE FETCHER COMPARISON TEST');
  console.log('='.repeat(60));
  
  console.log('\n1️⃣ Testing Kraken Position Price Fetcher (for open positions):');
  console.log('-'.repeat(60));
  try {
    await testKrakenPositionPriceFetch(['BTCUSD', 'ETHUSD', 'SOLUSD']);
  } catch (error) {
    console.error('❌ Kraken test failed:', error.message);
  }
  
  console.log('\n2️⃣ Testing Multi-Source Price Fetcher (for Smart Hunter):');
  console.log('-'.repeat(60));
  try {
    await testRealPriceFetch();
  } catch (error) {
    console.error('❌ Multi-source test failed:', error.message);
  }
  
  console.log('\n3️⃣ Testing CoinGecko Batch Fetcher (conservative API usage):');
  console.log('-'.repeat(60));
  try {
    await testCoinGeckoBatchFetch();
  } catch (error) {
    console.error('❌ CoinGecko batch test failed:', error.message);
  }
  
  console.log('\n✅ PRICE FETCHER SYSTEM SUMMARY:');
  console.log('='.repeat(60));
  console.log('🔵 Kraken: For open position prices (live trading accuracy)');
  console.log('🔄 Multi-source: For Smart Hunter opportunities (fallback redundancy)');
  console.log('📊 CoinGecko Batch: For market data (rate-limit compliant)');
  console.log('\nThis hybrid approach ensures:');
  console.log('• Maximum accuracy for live positions via Kraken');
  console.log('• Broad market coverage for profit hunting');
  console.log('• Respectful API usage to avoid blacklisting');
}

if (require.main === module) {
  main().catch(console.error);
}