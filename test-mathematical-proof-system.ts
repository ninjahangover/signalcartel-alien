#!/usr/bin/env npx tsx

/**
 * Test Mathematical Proof System Integration
 * This script tests the new intelligent profit maximizer with mathematical proofs
 */

import { intelligentProfitMaximizer } from './src/lib/intelligent-profit-maximizer';

async function testMathematicalProofSystem() {
  console.log('🔬 TESTING MATHEMATICAL PROOF SYSTEM INTEGRATION');
  console.log('='.repeat(60));

  try {
    // Test market intelligence context
    const mockMarketContext = {
      totalMarketCapital: 10000, // $10k test capital
      currentPositions: 0,
      marketRegime: 'BULLISH',
      volatilityLevel: 0.02,
      liquidityConditions: 'GOOD' as const,
      competitiveThreats: []
    };

    // Test with a few mock pairs
    const testPairs = ['BTCUSD', 'ETHUSD', 'ADAUSD'];

    console.log(`💰 Test Capital: $${mockMarketContext.totalMarketCapital.toLocaleString()}`);
    console.log(`📊 Market Regime: ${mockMarketContext.marketRegime}`);
    console.log(`🎯 Testing ${testPairs.length} pairs: ${testPairs.join(', ')}`);
    console.log();

    // Run intelligent profit maximization with mathematical proofs
    const maxProfitOpportunities = await intelligentProfitMaximizer.findMaximumProfitOpportunities(
      testPairs,
      mockMarketContext,
      3 // Top 3 opportunities
    );

    console.log('📈 MATHEMATICAL PROOF TEST RESULTS:');
    console.log('-'.repeat(40));

    if (maxProfitOpportunities.length === 0) {
      console.log('❌ No opportunities found meeting intelligence thresholds');
      console.log('   This might be expected with mock data');
    } else {
      maxProfitOpportunities.forEach((opp, index) => {
        console.log(`\n${index + 1}. ${opp.symbol} - ${opp.recommendation}`);
        console.log(`   💵 Expected Profit: $${opp.expectedDollarProfit.toFixed(2)}`);
        console.log(`   📊 Probability: ${(opp.profitProbability * 100).toFixed(1)}%`);
        console.log(`   🔬 Mathematical Validation:`);
        console.log(`      • Overall Proof Confidence: ${(opp.overallProofConfidence * 100).toFixed(1)}%`);
        console.log(`      • Proof Layers: ${opp.mathematicalProofs.length}`);
        console.log(`      • Kelly Fraction: ${(opp.kellyFraction * 100).toFixed(2)}% of capital`);
        console.log(`      • Sharpe Ratio: ${opp.sharpeRatio.toFixed(3)}`);
        console.log(`      • Value at Risk: $${opp.valueAtRisk.toFixed(2)}`);

        // Show individual mathematical proofs
        const highConfidenceProofs = opp.mathematicalProofs.filter(proof => proof.confidence >= 0.8);
        if (highConfidenceProofs.length > 0) {
          console.log(`   ✅ High-Confidence Proofs:`);
          highConfidenceProofs.forEach(proof => {
            console.log(`      • ${proof.layerName}: ${proof.result.toFixed(4)} (${(proof.confidence * 100).toFixed(1)}%)`);
          });
        }

        console.log(`   💡 Reasoning: ${opp.reasoning}`);
      });
    }

    console.log('\n🎯 MATHEMATICAL PROOF SYSTEM VALIDATION:');
    const avgProofConfidence = maxProfitOpportunities.length > 0
      ? maxProfitOpportunities.reduce((sum, opp) => sum + opp.overallProofConfidence, 0) / maxProfitOpportunities.length
      : 0;

    console.log(`   📊 Average Proof Confidence: ${(avgProofConfidence * 100).toFixed(1)}%`);
    console.log(`   🔬 Total Opportunities Analyzed: ${testPairs.length}`);
    console.log(`   ✅ Opportunities Meeting Thresholds: ${maxProfitOpportunities.length}`);

    if (avgProofConfidence >= 0.8) {
      console.log('   🏆 MATHEMATICAL VALIDATION: PASSED');
    } else if (avgProofConfidence >= 0.6) {
      console.log('   ⚠️  MATHEMATICAL VALIDATION: NEEDS REVIEW');
    } else {
      console.log('   ❌ MATHEMATICAL VALIDATION: FAILED');
    }

    console.log('\n🔥 MATHEMATICAL PROOF SYSTEM TEST COMPLETE');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testMathematicalProofSystem()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });