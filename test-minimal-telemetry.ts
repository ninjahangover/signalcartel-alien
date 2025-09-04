#!/usr/bin/env npx tsx

// Minimal telemetry test using basic HTTP requests
import { trace } from '@opentelemetry/api';

async function testMinimalTelemetryConnection() {
  console.log('🧪 Testing telemetry connection to external monitoring server...');
  
  // Test basic HTTP connectivity to the OTLP endpoint
  const externalServer = 'http://174.72.187.118:4317';
  const httpEndpoint = 'http://174.72.187.118:4318';
  
  console.log(`📡 Testing connectivity to gRPC endpoint: ${externalServer}`);
  console.log(`📡 Testing connectivity to HTTP endpoint: ${httpEndpoint}`);
  
  try {
    // Test HTTP endpoint
    const response = await fetch(httpEndpoint + '/v1/traces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resourceSpans: [{
          resource: {
            attributes: [{
              key: "service.name",
              value: { stringValue: "quantum-forge-trading" }
            }]
          },
          instrumentationLibrarySpans: [{
            instrumentationLibrary: { name: "test-telemetry", version: "1.0.0" },
            spans: [{
              traceId: "12345678901234567890123456789012",
              spanId: "1234567890123456",
              name: "test-connection",
              kind: 1,
              startTimeUnixNano: Date.now() * 1000000,
              endTimeUnixNano: (Date.now() + 1000) * 1000000,
              attributes: [{
                key: "test.type",
                value: { stringValue: "connection-test" }
              }]
            }]
          }]
        }]
      })
    });
    
    console.log(`📊 HTTP Response Status: ${response.status}`);
    console.log(`📊 HTTP Response OK: ${response.ok}`);
    
    if (response.ok) {
      console.log('✅ Successfully connected to external monitoring server!');
    } else {
      console.log(`❌ HTTP request failed with status: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
  
  console.log('🔗 Your SigNoz dashboard should be available at: http://174.72.187.118:3301');
  console.log('💡 If you see data there, your telemetry is working correctly.');
  
  process.exit(0);
}

testMinimalTelemetryConnection().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});