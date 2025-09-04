#!/usr/bin/env npx tsx

// Test simple telemetry connection to external monitoring server
import { initSimpleTelemetry, logMetrics, shutdownSimpleTelemetry } from './src/lib/telemetry/simple-signoz-telemetry';

async function testSimpleTelemetryConnection() {
  console.log('🧪 Testing simple telemetry connection to external monitoring server...');
  
  // Initialize telemetry
  const sdk = initSimpleTelemetry();
  
  if (!sdk) {
    console.error('❌ Failed to initialize telemetry');
    return;
  }
  
  console.log('📊 Sending test metrics and traces...');
  
  // Test various metrics
  logMetrics.trackTrade('test-strategy', 'BTCUSD', 'BUY', 100, 50000, true);
  logMetrics.trackAI('test-ai-system', 150, 0.85, 0.72);
  logMetrics.trackDatabase('SELECT', 25, true);
  logMetrics.trackSystem(45.2, 12.3, 4);
  logMetrics.trackPhase(3);
  
  console.log('⏳ Waiting for telemetry export to external server...');
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  console.log('✅ Test completed. Check your SigNoz dashboard at the external monitoring server.');
  console.log('🔗 Dashboard should be available at: http://174.72.187.118:3301');
  
  // Shutdown
  await shutdownSimpleTelemetry(sdk);
  console.log('🔭 Telemetry shutdown complete');
  process.exit(0);
}

testSimpleTelemetryConnection().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});