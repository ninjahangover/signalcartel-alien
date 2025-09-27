/**
 * Test Capital Efficiency Optimizer with current portfolio
 */

import { capitalEfficiencyOptimizer, PositionAnalysis, OpportunityAnalysis } from './src/lib/capital-efficiency-optimizer';

// Current portfolio positions (from dashboard data)
const currentPositions: PositionAnalysis[] = [
  {
    symbol: 'AVAX',
    currentValue: 24.65,
    unrealizedPnL: 0.49,
    actualReturn: 2.0,
    expectedReturn: 2.0, // Estimate based on current performance
    holdingDays: 7, // Estimated
    aiConfidence: 65, // Medium confidence
    mathematicalProof: 0.7,
    exitScore: 0, // Will be calculated
    efficiency: 1.0
  },
  {
    symbol: 'BNB',
    currentValue: 246.42,
    unrealizedPnL: 4.93,
    actualReturn: 2.0,
    expectedReturn: 2.0,
    holdingDays: 7,
    aiConfidence: 65,
    mathematicalProof: 0.7,
    exitScore: 0,
    efficiency: 1.0
  },
  {
    symbol: 'BTC',
    currentValue: 19.10,
    unrealizedPnL: 0.38,
    actualReturn: 2.0,
    expectedReturn: 2.0,
    holdingDays: 7,
    aiConfidence: 70, // Slightly higher for BTC
    mathematicalProof: 0.75,
    exitScore: 0,
    efficiency: 1.0
  }
];

// New opportunities (from Profit Predator logs)
const newOpportunities: OpportunityAnalysis[] = [
  {
    symbol: 'PEPEUSD',
    expectedReturn: 16.42,
    winProbability: 30.9,
    signalStrength: 0.85,
    requiredCapital: 20, // Estimated minimum position size
    rotationPriority: 0 // Will be calculated
  },
  {
    symbol: 'CATUSD',
    expectedReturn: 14.27,
    winProbability: 30.8,
    signalStrength: 0.80,
    requiredCapital: 25,
    rotationPriority: 0
  },
  {
    symbol: 'BONKUSD',
    expectedReturn: 15.92,
    winProbability: 31.5,
    signalStrength: 0.82,
    requiredCapital: 22,
    rotationPriority: 0
  },
  {
    symbol: 'SHIBUSD',
    expectedReturn: 16.10,
    winProbability: 32.3,
    signalStrength: 0.83,
    requiredCapital: 23,
    rotationPriority: 0
  }
];

async function testCapitalEfficiency() {
  console.log('🧮 CAPITAL EFFICIENCY OPTIMIZATION TEST');
  console.log('=====================================');

  // Portfolio summary
  console.log('\n📊 CURRENT PORTFOLIO:');
  const totalValue = currentPositions.reduce((sum, pos) => sum + pos.currentValue, 0);
  const totalPnL = currentPositions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  console.log(`Total Value: $${totalValue.toFixed(2)}`);
  console.log(`Total P&L: +$${totalPnL.toFixed(2)} (+${((totalPnL/totalValue)*100).toFixed(1)}%)`);

  currentPositions.forEach(pos => {
    console.log(`  ${pos.symbol}: $${pos.currentValue.toFixed(2)} (+$${pos.unrealizedPnL.toFixed(2)}, +${pos.actualReturn.toFixed(1)}%)`);
  });

  // Calculate exit scores for current positions
  console.log('\n🎯 EXIT SCORE ANALYSIS:');
  const bestNewOpportunity = Math.max(...newOpportunities.map(o => o.expectedReturn));

  currentPositions.forEach(pos => {
    pos.exitScore = capitalEfficiencyOptimizer.calculateExitScore({
      symbol: pos.symbol,
      currentReturn: pos.actualReturn,
      expectedReturn: pos.expectedReturn,
      holdingDays: pos.holdingDays,
      recentVelocity: 0.1, // Estimated low volatility
      historicalVol: 2.0, // Estimated volatility
      aiConfidence: pos.aiConfidence,
      mathProof: pos.mathematicalProof
    }, { expectedReturn: bestNewOpportunity });

    console.log(`  ${pos.symbol}: Exit Score = ${pos.exitScore.toFixed(2)} ${pos.exitScore > 1.5 ? '🔄 ROTATE' : '✋ HOLD'}`);
  });

  // Calculate rotation priorities
  console.log('\n🚀 NEW OPPORTUNITIES:');
  newOpportunities.forEach(opp => {
    opp.rotationPriority = capitalEfficiencyOptimizer.calculateRotationPriority(opp);
    console.log(`  ${opp.symbol}: ${opp.expectedReturn.toFixed(1)}% expected (${opp.winProbability.toFixed(1)}% win) | Priority: ${opp.rotationPriority.toFixed(2)}`);
  });

  // Run optimization
  console.log('\n🧮 OPTIMIZATION RECOMMENDATIONS:');
  const availableCapital = 165.24; // From dashboard data
  const recommendations = capitalEfficiencyOptimizer.optimizeCapitalAllocation(
    currentPositions,
    newOpportunities,
    availableCapital,
    totalValue + availableCapital
  );

  console.log('\n📤 EXIT RECOMMENDATIONS:');
  recommendations.exitRecommendations.forEach(symbol => {
    console.log(`  🔄 EXIT ${symbol}`);
  });

  console.log('\n📥 ENTRY RECOMMENDATIONS:');
  recommendations.entryRecommendations.forEach(symbol => {
    console.log(`  ✅ ENTER ${symbol}`);
  });

  console.log('\n💭 REASONING:');
  recommendations.reasoning.forEach(reason => {
    console.log(`  ${reason}`);
  });

  // Mathematical conviction overrides
  console.log('\n🧠 MATHEMATICAL CONVICTION OVERRIDES:');
  currentPositions.forEach(pos => {
    const shouldOverride = capitalEfficiencyOptimizer.shouldOverrideWithConviction(pos);
    if (shouldOverride) {
      console.log(`  🛡️ ${pos.symbol}: Mathematical conviction overrides rotation (${pos.aiConfidence}% confidence, ${pos.mathematicalProof} proof)`);
    }
  });

  // Optimal position sizing for new opportunities
  console.log('\n💰 OPTIMAL POSITION SIZING:');
  newOpportunities.slice(0, 2).forEach(opp => {
    const optimalSize = capitalEfficiencyOptimizer.calculateOptimalPositionSize(
      opp,
      totalValue + availableCapital,
      0.15 // 15% risk tolerance
    );
    console.log(`  ${opp.symbol}: $${optimalSize.toFixed(2)} (${((optimalSize/(totalValue + availableCapital))*100).toFixed(1)}% of portfolio)`);
  });

  console.log('\n🎯 SUMMARY:');
  console.log(`Current Portfolio ROI: +${((totalPnL/totalValue)*100).toFixed(1)}%`);
  console.log(`Best New Opportunity: ${newOpportunities[0].symbol} (+${newOpportunities[0].expectedReturn.toFixed(1)}%)`);
  console.log(`Potential Efficiency Gain: ${(newOpportunities[0].expectedReturn / 2.0).toFixed(1)}x`);
}

// Run the test
testCapitalEfficiency().catch(console.error);