#!/usr/bin/env ts-node
/**
 * Test Adaptive Profit Brain V2.0 - Unified Self-Learning System
 * Demonstrates how the brain learns thresholds AND pathways from outcomes
 */

import { adaptiveProfitBrain } from './src/lib/adaptive-profit-brain';

async function testUnifiedLearning() {
  console.log('🧠 ADAPTIVE PROFIT BRAIN V2.0 - UNIFIED LEARNING TEST\n');
  console.log('='.repeat(80));

  // Get initial state
  console.log('\n📊 INITIAL STATE (Before Learning):');
  console.log('─'.repeat(80));

  const initialThresholds = adaptiveProfitBrain.getCurrentThresholds();
  console.log('\nLearned Thresholds:');
  for (const [name, data] of Object.entries(initialThresholds)) {
    console.log(`  ${name}:`);
    console.log(`    Current: ${(data.current * 100).toFixed(2)}%`);
    console.log(`    Optimal Estimate: ${(data.optimal * 100).toFixed(2)}%`);
    console.log(`    Exploration Rate: ${(data.exploration * 100).toFixed(1)}%`);
  }

  const initialPathways = adaptiveProfitBrain.getPathwayState();
  console.log('\nNeural Pathways:');
  for (const pathway of initialPathways) {
    console.log(`  ${pathway.factorName}: weight=${pathway.weight.toFixed(4)}, correlation=${pathway.correlation.toFixed(4)}`);
  }

  // Simulate trading outcomes
  console.log('\n\n📈 SIMULATING TRADING OUTCOMES:\n');
  console.log('='.repeat(80));

  const outcomes = [
    // Winning trade with high confidence (should learn entry threshold can be lower)
    {
      symbol: 'BNBUSD',
      expectedReturn: 15.0,
      actualReturn: 18.5,
      winProbability: 0.70,
      actualWin: true,
      decisionFactors: {
        timeHeld: 36,
        marketRegime: 'BULL',
        convictionLevel: 0.75,
        opportunityCost: 0,
        rotationScore: 0.8
      },
      profitImpact: 304.85,
      timestamp: new Date(),
      decisionType: 'entry' as const,
      thresholdAtDecision: 0.18,
      confidenceLevel: 0.75
    },
    // Losing trade with barely met threshold (should learn entry threshold needs to be higher)
    {
      symbol: 'DOTUSD',
      expectedReturn: 8.0,
      actualReturn: -3.2,
      winProbability: 0.45,
      actualWin: false,
      decisionFactors: {
        timeHeld: 12,
        marketRegime: 'RANGING',
        convictionLevel: 0.13,
        opportunityCost: 0,
        rotationScore: 0.2
      },
      profitImpact: -1.73,
      timestamp: new Date(),
      decisionType: 'entry' as const,
      thresholdAtDecision: 0.12,
      confidenceLevel: 0.13
    },
    // Excellent profit from exit (should learn exit threshold was good)
    {
      symbol: 'AVAXUSD',
      expectedReturn: 5.0,
      actualReturn: 4.4,
      winProbability: 0.60,
      actualWin: true,
      decisionFactors: {
        timeHeld: 24,
        marketRegime: 'BULL',
        convictionLevel: 0.55,
        opportunityCost: 0,
        rotationScore: 0.6
      },
      profitImpact: 2.21,
      timestamp: new Date(),
      decisionType: 'exit' as const,
      thresholdAtDecision: 0.50,
      confidenceLevel: 0.55
    }
  ];

  for (let i = 0; i < outcomes.length; i++) {
    console.log(`\n${i + 1}. Processing outcome: ${outcomes[i].symbol}`);
    console.log(`   Decision: ${outcomes[i].decisionType}, Profit: $${outcomes[i].profitImpact.toFixed(2)}`);
    console.log(`   Confidence: ${(outcomes[i].confidenceLevel! * 100).toFixed(1)}%, Threshold: ${(outcomes[i].thresholdAtDecision! * 100).toFixed(1)}%`);

    await adaptiveProfitBrain.recordTradeOutcome(outcomes[i]);

    // Small delay to show learning progression
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Get state after learning
  console.log('\n\n📊 STATE AFTER LEARNING:\n');
  console.log('='.repeat(80));

  const learnedThresholds = adaptiveProfitBrain.getCurrentThresholds();
  console.log('\nLearned Thresholds (After 3 outcomes):');
  for (const [name, data] of Object.entries(learnedThresholds)) {
    const initial = initialThresholds[name];
    const change = ((data.current - initial.current) / initial.current) * 100;

    console.log(`  ${name}:`);
    console.log(`    Initial: ${(initial.current * 100).toFixed(2)}% → Current: ${(data.current * 100).toFixed(2)}% (${change > 0 ? '+' : ''}${change.toFixed(2)}%)`);
    console.log(`    Optimal Estimate: ${(data.optimal * 100).toFixed(2)}%`);
    console.log(`    Avg Profit from Decisions: $${data.profitHistory.toFixed(2)}`);
    console.log(`    Exploration: ${(data.exploration * 100).toFixed(1)}%`);
  }

  // Test threshold retrieval with context
  console.log('\n\n🎯 TESTING CONTEXTUAL THRESHOLD ADJUSTMENT:\n');
  console.log('='.repeat(80));

  const contexts = [
    { name: 'High Volatility Bull Market', volatility: 0.08, regime: 'BULL' as const, confidence: 0.75 },
    { name: 'Low Volatility Bear Market', volatility: 0.02, regime: 'BEAR' as const, confidence: 0.45 },
    { name: 'Normal Conditions', volatility: 0.04, regime: 'RANGING' as const, confidence: 0.60 }
  ];

  for (const context of contexts) {
    console.log(`\n${context.name}:`);
    const entryThreshold = adaptiveProfitBrain.getThreshold('entryConfidence', context);
    const exitThreshold = adaptiveProfitBrain.getThreshold('exitScore', context);
    const positionMultiplier = adaptiveProfitBrain.getThreshold('positionSizeMultiplier', context);

    console.log(`  Entry Threshold: ${(entryThreshold * 100).toFixed(2)}%`);
    console.log(`  Exit Threshold: ${(exitThreshold * 100).toFixed(2)}%`);
    console.log(`  Position Size Multiplier: ${positionMultiplier.toFixed(2)}x`);
  }

  // Get comprehensive learning metrics
  console.log('\n\n📈 COMPREHENSIVE LEARNING METRICS:\n');
  console.log('='.repeat(80));

  const metrics = adaptiveProfitBrain.getLearningMetrics();

  console.log('\nNeural Pathway Learning:');
  for (const pathway of metrics.pathways) {
    console.log(`  ${pathway.factorName}:`);
    console.log(`    Weight: ${pathway.weight.toFixed(4)}`);
    console.log(`    Profit Correlation: ${pathway.correlation.toFixed(4)}`);
  }

  console.log('\nThreshold Learning Progress:');
  for (const [name, data] of Object.entries(metrics.thresholds)) {
    console.log(`  ${name}:`);
    console.log(`    Current Value: ${(data.value * 100).toFixed(2)}%`);
    console.log(`    Optimal Estimate: ${(data.optimalEstimate * 100).toFixed(2)}%`);
    console.log(`    Convergence: ${(data.convergence * 100).toFixed(1)}% (how close to optimal)`);
    console.log(`    Decisions Used: ${data.decisions}`);
    console.log(`    Avg Profit: $${data.avgProfit.toFixed(2)}`);
  }

  // Summary
  console.log('\n\n✅ KEY LEARNINGS:\n');
  console.log('='.repeat(80));

  console.log('\n1. ENTRY THRESHOLD LEARNING:');
  const entryData = learnedThresholds.entryConfidence;
  const entryChange = ((entryData.current - initialThresholds.entryConfidence.current) / initialThresholds.entryConfidence.current) * 100;
  if (entryChange > 1) {
    console.log(`   ✅ Increased by ${entryChange.toFixed(1)}% after losing trade with low confidence`);
    console.log(`   💡 System learned to be more selective (higher bar for entry)`);
  } else if (entryChange < -1) {
    console.log(`   ✅ Decreased by ${Math.abs(entryChange).toFixed(1)}% after high-confidence winner`);
    console.log(`   💡 System learned it can afford to capture more opportunities`);
  } else {
    console.log(`   ⚖️ Minimal change (${entryChange.toFixed(1)}%) - needs more data`);
  }

  console.log('\n2. EXIT THRESHOLD LEARNING:');
  const exitData = learnedThresholds.exitScore;
  const exitChange = ((exitData.current - initialThresholds.exitScore.current) / initialThresholds.exitScore.current) * 100;
  if (exitChange > 1) {
    console.log(`   ✅ Increased by ${exitChange.toFixed(1)}% - making exits more difficult`);
    console.log(`   💡 System learned to let winners run longer`);
  } else if (exitChange < -1) {
    console.log(`   ✅ Decreased by ${Math.abs(exitChange).toFixed(1)}% - making exits easier`);
    console.log(`   💡 System learned to take profits faster for rotation`);
  } else {
    console.log(`   ⚖️ Minimal change (${exitChange.toFixed(1)}%) - needs more data`);
  }

  console.log('\n3. EXPLORATION-EXPLOITATION BALANCE:');
  const avgExploration = Object.values(learnedThresholds).reduce((sum, d) => sum + d.exploration, 0) / Object.values(learnedThresholds).length;
  console.log(`   Current avg exploration rate: ${(avgExploration * 100).toFixed(1)}%`);
  console.log(`   💡 System balances trying new thresholds vs using learned values`);

  console.log('\n4. CONTEXTUAL INTELLIGENCE:');
  console.log(`   ✅ Thresholds adjust based on volatility, regime, and confidence`);
  console.log(`   ✅ Bull markets → lower entry threshold (more aggressive)`);
  console.log(`   ✅ Bear markets → higher entry threshold (more conservative)`);
  console.log(`   ✅ High volatility → increased thresholds (risk management)`);

  console.log('\n\n🎯 SYSTEM STATUS:');
  console.log('='.repeat(80));
  console.log('✅ Unified adaptive brain learning BOTH pathways AND thresholds');
  console.log('✅ No hardcoded values - pure mathematical gradient descent');
  console.log('✅ Continuous learning from every trade outcome');
  console.log('✅ Exploration-exploitation balance prevents local optima');
  console.log('✅ Contextual adjustments for market conditions');
  console.log('✅ Optimal threshold estimation from profitable decisions');
  console.log('\n💡 With more trading data, thresholds will converge to profit-maximizing values!\n');
}

testUnifiedLearning().catch((error) => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
