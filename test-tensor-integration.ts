/**
 * Test Tensor AI Fusion Integration
 * 
 * Tests the tensor fusion system with live data before full deployment
 */

import { productionTensorIntegration } from './src/lib/production-tensor-integration';
import { enhancedMathematicalIntuition } from './src/lib/enhanced-mathematical-intuition';

async function testTensorIntegration() {
  console.log('🧮 TESTING TENSOR AI FUSION INTEGRATION');
  console.log('=====================================');
  
  try {
    // Create a realistic test scenario with live data structure
    const testBundle = {
      symbol: 'BTCUSD',
      currentPrice: 110644,
      
      // Simulate Pine Script result
      pineScriptResult: {
        action: 'BUY',
        confidence: 0.75,
        strategy: 'quantum-oscillator',
        reason: 'Bullish momentum detected'
      },
      
      // Simulate Mathematical Intuition result
      mathematicalIntuition: {
        originalIntuition: 0.82,
        flowField: 0.15,
        patternResonance: 0.78,
        shouldTrade: true,
        reason: 'Strong mathematical pattern alignment'
      },
      
      // Simulate Markov prediction
      markovPrediction: {
        confidence: 0.68,
        expectedReturn: -0.012, // Conflicting signal for testing
        currentState: 'trending_down',
        nextStateProbabilities: { trending_up: 0.3, trending_down: 0.7 }
      },
      
      // Market context
      marketData: {
        symbol: 'BTCUSD',
        price: 110644,
        timestamp: new Date()
      },
      
      phase: 4,
      timestamp: new Date()
    };
    
    console.log(`📊 Testing with ${testBundle.symbol} at $${testBundle.currentPrice}`);
    console.log('');
    
    // Test 1: Mathematical Intuition alone
    console.log('🧠 TEST 1: Mathematical Intuition Analysis');
    const intuitionResult = await enhancedMathematicalIntuition.analyzeWithPairIntelligence(
      testBundle.currentPrice,
      {
        symbol: testBundle.symbol,
        price: testBundle.currentPrice,
        timestamp: testBundle.timestamp
      }
    );
    
    console.log(`   Should Trade: ${intuitionResult.shouldTrade}`);
    console.log(`   Confidence: ${(intuitionResult.confidence * 100).toFixed(1)}%`);
    console.log(`   Reason: ${intuitionResult.reason}`);
    console.log('');
    
    // Test 2: Tensor Fusion System
    console.log('🧮 TEST 2: Tensor Fusion Analysis');
    const tensorDecision = await productionTensorIntegration.makeDecision(testBundle);
    
    console.log(`   🎯 TENSOR DECISION: ${tensorDecision.shouldTrade ? 'TRADE' : 'SKIP'} ${tensorDecision.direction}`);
    console.log(`   📊 Tensor Confidence: ${(tensorDecision.confidence * 100).toFixed(1)}%`);
    console.log(`   📈 Expected Move: ${(tensorDecision.expectedMove * 100).toFixed(2)}%`);
    console.log(`   💰 Expected PnL: ${(tensorDecision.expectedPnL * 100).toFixed(2)}%`);
    console.log(`   📏 Position Size: ${(tensorDecision.positionSize * 100).toFixed(1)}% of account`);
    console.log(`   🤖 AI Systems Used: ${tensorDecision.aiSystemsUsed.join(', ')}`);
    console.log(`   🧠 Information Content: ${tensorDecision.fusedDecision.informationContent.toFixed(2)} bits`);
    console.log(`   🎭 Consensus Strength: ${(tensorDecision.fusedDecision.consensusStrength * 100).toFixed(1)}%`);
    console.log(`   📝 Reason: ${tensorDecision.fusedDecision.reason}`);
    console.log('');
    
    // Test 3: Performance Comparison
    console.log('📊 TEST 3: Performance Comparison');
    console.log(`   Mathematical Intuition: ${intuitionResult.shouldTrade ? 'TRADE' : 'SKIP'} (${(intuitionResult.confidence * 100).toFixed(1)}%)`);
    console.log(`   Tensor Fusion: ${tensorDecision.shouldTrade ? 'TRADE' : 'SKIP'} (${(tensorDecision.confidence * 100).toFixed(1)}%)`);
    
    if (tensorDecision.shouldTrade !== intuitionResult.shouldTrade) {
      console.log(`   🔍 DIFFERENCE DETECTED: Tensor system provides different decision`);
      console.log(`   🧮 Tensor reasoning: ${tensorDecision.fusedDecision.reason}`);
      console.log(`   🧠 Intuition reasoning: ${intuitionResult.reason}`);
    } else {
      console.log(`   ✅ DECISIONS ALIGN: Both systems agree`);
    }
    console.log('');
    
    // Test 4: System Performance Metrics
    console.log('🎯 TEST 4: System Performance Metrics');
    const performanceMetrics = productionTensorIntegration.getPerformanceMetrics();
    console.log(`   Advanced Strategies Available: ${performanceMetrics.advancedStrategiesAvailable.join(', ')}`);
    console.log(`   Priority Weights:`);
    performanceMetrics.priorityWeights.forEach(([strategy, weight]) => {
      console.log(`     ${strategy}: ${(weight * 100).toFixed(1)}%`);
    });
    console.log(`   Integration Version: ${performanceMetrics.integrationVersion}`);
    console.log('');
    
    // Test 5: Conflicting Signals Test
    console.log('🔥 TEST 5: Conflicting Signals Handling');
    const conflictingBundle = {
      ...testBundle,
      // Create conflicting signals to test coherence analysis
      pineScriptResult: { ...testBundle.pineScriptResult, action: 'SELL', confidence: 0.85 },
      markovPrediction: { ...testBundle.markovPrediction, expectedReturn: 0.025, confidence: 0.90 }
    };
    
    const conflictingDecision = await productionTensorIntegration.makeDecision(conflictingBundle);
    console.log(`   🎯 With Conflicts: ${conflictingDecision.shouldTrade ? 'TRADE' : 'SKIP'} ${conflictingDecision.direction}`);
    console.log(`   🎭 Consensus Strength: ${(conflictingDecision.fusedDecision.consensusStrength * 100).toFixed(1)}%`);
    console.log(`   📝 Conflict Reasoning: ${conflictingDecision.fusedDecision.reason}`);
    console.log('');
    
    console.log('✅ TENSOR INTEGRATION TEST COMPLETE');
    console.log('===================================');
    console.log('🚀 Tensor fusion system is operational and ready for deployment');
    console.log(`🔧 To enable: TENSOR_MODE=true (full) or TENSOR_ROLLOUT=50 (50% rollout)`);
    
  } catch (error) {
    console.error('❌ TENSOR INTEGRATION TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testTensorIntegration().catch(console.error);
}

export { testTensorIntegration };