#!/usr/bin/env npx tsx

// Test telemetry connection to external monitoring server
import { initializeTelemetry, shutdownTelemetry } from './src/lib/telemetry/opentelemetry-config';
import { trace, metrics } from '@opentelemetry/api';

async function testTelemetryConnection() {
  console.log('🧪 Testing telemetry connection to external monitoring server...');
  
  // Initialize telemetry
  initializeTelemetry();
  
  // Create a test trace
  const tracer = trace.getTracer('test-connection', '1.0.0');
  const span = tracer.startSpan('test-telemetry-connection');
  
  span.setAttributes({
    'test.type': 'connection-test',
    'test.timestamp': Date.now(),
    'test.server': '174.72.187.118',
    'service.name': 'quantum-forge-trading'
  });
  
  console.log('📊 Sending test trace and metrics...');
  
  // Create a test metric
  const meter = metrics.getMeter('test-connection', '1.0.0');
  const testCounter = meter.createCounter('test_connection_attempts', {
    description: 'Number of test connection attempts'
  });
  
  testCounter.add(1, { test_type: 'external_monitoring' });
  
  // End the span
  span.end();
  
  // Wait a bit for export
  console.log('⏳ Waiting for telemetry export...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log('✅ Test completed. Check your SigNoz dashboard for telemetry data.');
  
  // Shutdown
  await shutdownTelemetry();
  process.exit(0);
}

testTelemetryConnection().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});