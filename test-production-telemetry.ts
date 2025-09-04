#!/usr/bin/env npx tsx

/**
 * Test Production Telemetry Integration
 * This script simulates the telemetry calls that your production system will make
 */

import { initProductionTelemetry } from './src/lib/telemetry/production-telemetry';

async function testProductionTelemetry() {
  console.log('🧪 Testing Production Telemetry Integration...\n');
  
  // Initialize telemetry
  const telemetry = initProductionTelemetry({
    serviceName: 'quantum-forge-production-trading-test',
    environment: 'development',
    externalMonitoringServer: 'http://174.72.187.118:3301'
  });
  
  console.log('📊 Simulating trading system telemetry events...\n');
  
  // Simulate various trading events
  console.log('1. Simulating trade opening...');
  telemetry.trackTrade({
    strategy: 'phase-2-ai-enhanced-mathematical-intuition',
    symbol: 'BTCUSD',
    side: 'BUY',
    amount: 0.001,
    price: 67500.50,
    success: true,
    confidence: 0.89
  });
  
  console.log('2. Simulating AI analysis...');
  telemetry.trackAI({
    system: 'enhanced-mathematical-intuition',
    responseTime: 2,
    confidence: 0.89,
    prediction: 'TRADE',
    success: true
  });
  
  console.log('3. Simulating database query...');
  telemetry.trackDatabase({
    queryType: 'INSERT_POSITION',
    latency: 45,
    success: true,
    recordCount: 1
  });
  
  console.log('4. Simulating system performance...');
  telemetry.trackSystem({
    memory: 45.2,
    cpu: 12.3,
    activeStrategies: 3,
    openPositions: 5
  });
  
  console.log('5. Simulating phase information...');
  telemetry.trackPhase({
    phase: 2,
    completedTrades: 99,
    winRate: 0.875,
    totalPnL: 1247.83
  });
  
  console.log('6. Simulating market data...');
  telemetry.trackMarket({
    symbol: 'BTCUSD',
    price: 67500.50,
    volume: 12500000,
    volatility: 0.024,
    trend: 'BULLISH'
  });
  
  console.log('7. Simulating position closure...');
  telemetry.trackTrade({
    strategy: 'phase-2-ai-enhanced-mathematical-intuition',
    symbol: 'BTCUSD',
    side: 'SELL',
    amount: 0.001,
    price: 67620.25,
    success: true,
    pnl: 119.75
  });
  
  console.log('8. Simulating error condition...');
  telemetry.trackError({
    component: 'kraken-api',
    error: 'Rate limit exceeded',
    severity: 'warning',
    context: { retryIn: 5000 }
  });
  
  console.log('9. Health check...');
  telemetry.healthCheck();
  
  console.log('\n✅ Production telemetry test complete!');
  console.log('🔗 These events would be visible in your SigNoz dashboard at: http://174.72.187.118:3301');
  console.log('📋 Log output above shows what your production system will emit when running with telemetry');
  console.log('\n📊 Your production system is now configured to send telemetry data to your external monitoring server.');
  console.log('🚀 Start your production trading system and monitor the telemetry on your SigNoz dashboard!');
  
  process.exit(0);
}

testProductionTelemetry().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});