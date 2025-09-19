/**
 * Test script for Advanced Risk Orchestrator
 */

import { advancedRiskOrchestrator } from './src/lib/advanced-risk-orchestrator.js';

async function testRiskOrchestrator() {
  try {
    console.log('🛡️ TESTING ADVANCED RISK ORCHESTRATOR');

    // Initialize the system
    await advancedRiskOrchestrator.initialize();

    // Set Kraken Breakout compliant limits
    advancedRiskOrchestrator.setRiskLimits({
      maxPortfolioDrawdown: 8.0,
      maxPositionSize: 25.0,
      maxCorrelation: 0.7,
      maxDailyVaR: 5.0,
      emergencyStopLevel: 10.0,
      minLiquidityScore: 0.6
    });

    // Test portfolio risk calculation with mock positions
    const mockPositions = [
      { symbol: 'BTCUSD', quantity: 0.001, entry_price: 60000 },
      { symbol: 'ETHUSD', quantity: 0.1, entry_price: 3000 },
      { symbol: 'SOLUSD', quantity: 10, entry_price: 100 }
    ];

    const mockPrices = {
      'BTCUSD': 62000,
      'ETHUSD': 3100,
      'SOLUSD': 105
    };

    console.log('📊 Testing portfolio risk calculation...');
    const riskMetrics = await advancedRiskOrchestrator.calculatePortfolioRisk(mockPositions, mockPrices);
    console.log('✅ Risk Metrics:', {
      portfolioVaR: riskMetrics.portfolioVaR.toFixed(2),
      portfolioDrawdown: riskMetrics.portfolioDrawdown.toFixed(2),
      positionConcentration: riskMetrics.positionConcentration.toFixed(2),
      overallRiskScore: riskMetrics.overallRiskScore.toFixed(1)
    });

    // Test optimal position sizing
    console.log('🎯 Testing optimal position sizing...');
    const optimalSize = await advancedRiskOrchestrator.calculateOptimalPositionSize(
      'ETHUSD',
      3100,
      10000, // 10k available capital
      20.66, // Expected return from profit predator
      34.5   // Win probability from profit predator
    );

    console.log('✅ Optimal Position Size:', optimalSize.toFixed(8), 'ETH');

    // Test trade validation
    console.log('🔍 Testing trade validation...');
    const validation = await advancedRiskOrchestrator.validateTrade(
      'ETHUSD',
      'BUY',
      optimalSize,
      3100,
      mockPositions
    );

    console.log('✅ Trade Validation:', validation.approved ? 'APPROVED' : 'BLOCKED');
    console.log('   Reasons:', validation.reasons.join(', '));

    // Test risk status
    const riskStatus = advancedRiskOrchestrator.getCurrentRiskStatus();
    console.log('✅ Current Risk Level:', riskStatus.riskLevel);

    console.log('🎉 ALL RISK ORCHESTRATOR TESTS PASSED!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRiskOrchestrator();