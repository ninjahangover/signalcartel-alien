/**
 * Test CoinMarketCap Integration
 */

import { coinMarketCapService } from './src/lib/coinmarketcap-service';

async function testCMCIntegration() {
  console.log('🧪 Testing CoinMarketCap Integration...\n');

  try {
    // Test 1: Get trending coins
    console.log('📈 Test 1: Getting trending coins...');
    const trending = await coinMarketCapService.getTrendingCoins();
    console.log(`✅ Found ${trending.length} trending coins`);

    if (trending.length > 0) {
      const top3 = trending.slice(0, 3);
      console.log('🔥 Top 3 trending:');
      top3.forEach((coin, i) => {
        console.log(`  ${i + 1}. ${coin.symbol}: ${coin.percent_change_24h.toFixed(2)}% (24h), Rank: ${coin.market_cap_rank}`);
      });
    }

    console.log('\n📊 Test 2: Getting categories...');
    const categories = await coinMarketCapService.getCategories();
    console.log(`✅ Found ${categories.length} categories`);

    const hotCategories = categories
      .filter(cat => cat.avg_price_change > 2)
      .sort((a, b) => b.avg_price_change - a.avg_price_change)
      .slice(0, 3);

    if (hotCategories.length > 0) {
      console.log('🔥 Hot categories:');
      hotCategories.forEach((cat, i) => {
        console.log(`  ${i + 1}. ${cat.name}: +${cat.avg_price_change.toFixed(2)}% avg change`);
      });
    }

    console.log('\n🎯 Test 3: Market intelligence for discovered opportunities...');
    const testSymbols = ['BTCUSD', 'DOGUSD', 'SHIBUSDT'];

    for (const symbol of testSymbols) {
      console.log(`\n🔍 Analyzing ${symbol}:`);
      const intelligence = await coinMarketCapService.getMarketIntelligence(symbol);

      console.log(`  Confidence boost: ${intelligence.confidence_boost.toFixed(1)}%`);
      console.log(`  Trending score: ${intelligence.trending_score}`);
      console.log(`  Category momentum: ${intelligence.category_momentum.toFixed(1)}%`);

      if (intelligence.opportunities.length > 0) {
        console.log(`  Opportunities: ${intelligence.opportunities.join(', ')}`);
      }

      if (intelligence.risk_factors.length > 0) {
        console.log(`  Risk factors: ${intelligence.risk_factors.join(', ')}`);
      }
    }

    console.log('\n📊 API Usage Stats:');
    const stats = coinMarketCapService.getUsageStats();
    console.log(`  Calls used: ${stats.monthlyCallCount}/${stats.monthlyLimit} (${stats.percentUsed}%)`);
    console.log(`  Cache size: ${stats.cacheSize} entries`);

    console.log('\n✅ CMC Integration test completed successfully!');

  } catch (error) {
    console.error('❌ CMC Integration test failed:', error.message);
  }
}

testCMCIntegration();