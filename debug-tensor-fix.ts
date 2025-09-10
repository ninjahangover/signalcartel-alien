#!/usr/bin/env node

/**
 * Debug script to test tensor fusion and identify the 50% confidence issue
 */

import { productionTensorIntegration } from './src/lib/production-tensor-integration';

async function debugTensorFusion() {
  console.log('🧪 DEBUGGING TENSOR FUSION ISSUE');
  
  // Create a test bundle similar to what's being passed in production
  const testBundle = {
    symbol: 'BTCUSD',
    currentPrice: 113000,
    
    // Test AI system outputs (based on actual log data)
    mathematicalIntuition: {
      intuitive: {
        overallFeeling: 2.18, // 218% confidence from logs
        recommendation: 'SELL',
        flowFieldStrength: 0.753,
        reasoning: 'Test mathematical intuition'
      },
      predictedMove: -0.753
    },
    
    bayesianProbability: {
      confidence: 0.95, // 95% from logs  
      mostLikelyRegime: 'BEAR',
      regimeProbability: 0.95,
      expectedReturn: -0.701
    },
    
    markovPrediction: {
      confidence: 0.10, // 10% from logs
      expectedReturn: 0.0,
      currentState: 0,
      mostLikelyNextState: 1
    },
    
    adaptiveLearning: {
      confidence: 0.138, // 13.8% from logs
      directionBias: 'HOLD'
    },
    
    orderBookAIResult: {
      confidence: 0.60, // 60% from logs
      marketPressure: 'RANGING'
    },
    
    sentimentAnalysis: {
      confidence: 0.001, // 0.1% from logs
      sentiment: 'NEUTRAL',
      overallScore: 0.5
    },
    
    marketData: {
      symbol: 'BTCUSD',
      price: 113000,
      volume: 1000,
      timestamp: new Date()
    },
    
    phase: 0,
    timestamp: new Date()
  };
  
  try {
    console.log('📊 Testing with sample AI bundle...');
    const decision = await productionTensorIntegration.makeDecision(testBundle);
    
    console.log('🎯 TENSOR DECISION RESULT:');
    console.log(`   Should Trade: ${decision.shouldTrade}`);
    console.log(`   Direction: ${decision.direction}`);
    console.log(`   Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
    console.log(`   Expected Move: ${(decision.expectedMove * 100).toFixed(2)}%`);
    console.log(`   Position Size: ${(decision.positionSize * 100).toFixed(1)}%`);
    console.log(`   AI Systems Used: ${decision.aiSystemsUsed.join(', ')}`);
    
    if (decision.confidence === 0.5) {
      console.log('🚨 ISSUE CONFIRMED: Tensor fusion returning 50% confidence fallback');
      console.log('🔍 INVESTIGATION NEEDED: Check why tensor fusion is failing');
    } else {
      console.log('✅ SUCCESS: Tensor fusion working correctly with dynamic confidence');
    }
    
  } catch (error) {
    console.log('❌ ERROR in tensor decision:', error.message);
  }
}

debugTensorFusion();