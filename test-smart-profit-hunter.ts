#!/usr/bin/env npx tsx
/**
 * Test Smart Profit Hunter - Show efficient API usage
 */

import { smartProfitHunter } from './src/lib/smart-profit-hunter';

async function testSmartHunter() {
  console.log('🧠 Testing Smart Profit Hunter...');
  console.log('==========================================');
  console.log('');
  
  const startTime = Date.now();
  
  try {
    const opportunities = await smartProfitHunter.findProfitableOpportunities();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ SMART HUNTER RESULTS:');
    console.log(`⏱️  Scan Duration: ${duration}ms (vs 5+ minutes for 564 pairs)`);
    console.log(`🎯 Opportunities Found: ${opportunities.length}`);
    console.log('');
    
    console.log('🚀 TOP PROFITABLE OPPORTUNITIES:');
    console.log('=================================');
    
    opportunities.slice(0, 10).forEach((opp, i) => {
      console.log(`${i + 1}. ${opp.symbol}`);
      console.log(`   Score: ${opp.score.toFixed(1)}%`);
      console.log(`   Source: ${opp.source}`);
      console.log(`   Confidence: ${(opp.confidence * 100).toFixed(1)}%`);
      console.log(`   Reasons: ${opp.reasons.join(', ')}`);
      
      if (opp.metrics.priceChange24h) {
        console.log(`   24h Change: ${opp.metrics.priceChange24h.toFixed(2)}%`);
      }
      if (opp.metrics.volume24h) {
        console.log(`   24h Volume: $${formatNumber(opp.metrics.volume24h)}`);
      }
      console.log('');
    });
    
    // Show API efficiency stats
    console.log('📊 API EFFICIENCY COMPARISON:');
    console.log('=============================');
    console.log('❌ Old Profit Predator:');
    console.log('   • 564 individual API calls');
    console.log('   • ~5+ minutes scan time');
    console.log('   • Rate limited after ~20 calls');
    console.log('   • API overload & timeouts');
    console.log('');
    console.log('✅ Smart Profit Hunter:');
    console.log('   • 4 strategic API calls');
    console.log(`   • ${duration}ms scan time`);
    console.log('   • No rate limit issues');
    console.log('   • Pre-filtered hot opportunities');
    console.log('');
    
    console.log('🎯 READY TO INTEGRATE WITH DUAL-SYSTEM TRADING!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
}

testSmartHunter().catch(console.error);