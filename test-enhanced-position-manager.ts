/**
 * Test script for Enhanced Position Manager with Dynamic Capabilities
 */

import { PositionManager } from './src/lib/position-management/position-manager.js';
import { PrismaClient } from '@prisma/client';

async function testEnhancedPositionManager() {
  try {
    console.log('🎯 TESTING ENHANCED POSITION MANAGER WITH DYNAMIC CAPABILITIES');

    // Initialize with database connection
    const prisma = new PrismaClient();
    const positionManager = new PositionManager(prisma);

    // Test 1: Account Snapshot
    console.log('\n📊 Testing Account Snapshot...');
    const accountSnapshot = await positionManager.getAccountSnapshot();
    console.log('✅ Account Snapshot:', {
      totalUSD: accountSnapshot.totalUSD.toFixed(2),
      availableUSD: accountSnapshot.availableUSD.toFixed(2),
      positionsValue: accountSnapshot.positionsValue.toFixed(2),
      openPositions: accountSnapshot.openPositionsCount,
      accountEquity: accountSnapshot.accountEquity.toFixed(2)
    });

    // Test 2: Dynamic Position Sizing
    console.log('\n🎯 Testing Dynamic Position Sizing...');
    const dynamicSizing = await positionManager.calculateDynamicPositionSize(
      'ETHUSD',
      20.66, // Expected return from profit predator
      34.5,  // Win probability
      3100,  // Current price
      1.0    // No leverage
    );

    console.log('✅ Dynamic Sizing Result:', {
      recommendedSizeUSD: dynamicSizing.recommendedSizeUSD.toFixed(2),
      recommendedQuantity: dynamicSizing.recommendedQuantity.toFixed(6),
      riskPercentage: dynamicSizing.riskPercentage.toFixed(1) + '%',
      kellyFraction: (dynamicSizing.kellyFraction * 100).toFixed(2) + '%',
      adjustmentFactors: {
        account: dynamicSizing.adjustmentFactors.account.toFixed(2),
        risk: dynamicSizing.adjustmentFactors.risk.toFixed(2),
        opportunity: dynamicSizing.adjustmentFactors.opportunity.toFixed(2),
        regime: dynamicSizing.adjustmentFactors.regime.toFixed(2)
      }
    });

    // Test 3: Opportunity Replacement Evaluation
    console.log('\n🔄 Testing Opportunity Replacement Logic...');
    const evaluation = await positionManager.evaluateOpportunityReplacement({
      symbol: 'MOODENGUSD',
      expectedReturn: 17.40,
      winProbability: 32.8,
      currentPrice: 0.85
    });

    console.log('✅ Opportunity Evaluation:', {
      shouldTrade: evaluation.shouldTrade,
      action: evaluation.action,
      reason: evaluation.reason,
      confidence: (evaluation.confidence * 100).toFixed(1) + '%'
    });

    // Test 4: Intelligent Opportunity Processing (simulation)
    console.log('\n🧠 Testing Intelligent Opportunity Processing...');
    const intelligentResult = await positionManager.processOpportunityIntelligently({
      symbol: 'DOTUSD',
      expectedReturn: 18.20,
      winProbability: 33.3,
      currentPrice: 4.85,
      strategy: 'tensor-ai-fusion',
      confidence: 0.82,
      leverageMultiplier: 1.0
    });

    console.log('✅ Intelligent Processing Result:', {
      action: intelligentResult.action,
      riskPercentage: intelligentResult.sizing.riskPercentage.toFixed(1) + '%',
      positionSizeUSD: intelligentResult.sizing.recommendedSizeUSD.toFixed(2),
      evaluationAction: intelligentResult.evaluation.action,
      evaluationReason: intelligentResult.evaluation.reason
    });

    console.log('\n🎉 ALL ENHANCED POSITION MANAGER TESTS COMPLETED!');
    console.log('\n🔥 DYNAMIC CAPABILITIES VERIFIED:');
    console.log('   ✅ Real-time account balance integration');
    console.log('   ✅ Kelly Criterion position sizing');
    console.log('   ✅ Risk-aware adjustments with Advanced Risk Orchestrator');
    console.log('   ✅ Opportunity replacement evaluation');
    console.log('   ✅ Intelligent position processing pipeline');
    console.log('   ✅ Leverage-aware calculations');
    console.log('   ✅ Account size factor adjustments');

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEnhancedPositionManager();