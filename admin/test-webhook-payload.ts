/**
 * Test Webhook Payload Generation
 * Verify our SignalCartel signals generate correct TradingView format
 */

import { WebhookPayloadAdapter } from '../src/lib/webhook-payload-adapter';

async function testWebhookPayload() {
  console.log('🧪 TESTING WEBHOOK PAYLOAD GENERATION');
  console.log('=====================================\n');

  const adapter = new WebhookPayloadAdapter('sdfqoei1898498');

  // Test signals similar to what SignalCartel generates
  const testSignals = [
    {
      strategy: 'pine-script-rsi-enhanced',
      symbol: 'BTCUSD',
      action: 'BUY' as 'BUY' | 'SELL',
      price: 65432.10,
      confidence: 0.85,
      timestamp: new Date()
    },
    {
      strategy: 'mathematical-intuition-ai',
      symbol: 'ETHUSD',
      action: 'SELL' as 'BUY' | 'SELL',
      price: 3421.50,
      confidence: 0.92,
      timestamp: new Date()
    },
    {
      strategy: 'quantum-forge-phase3',
      symbol: 'SOLUSD',
      action: 'BUY' as 'BUY' | 'SELL',
      price: 145.75,
      confidence: 0.78,
      timestamp: new Date()
    }
  ];

  for (const signal of testSignals) {
    console.log(`📊 Testing ${signal.action} signal for ${signal.symbol}`);
    console.log(`   Strategy: ${signal.strategy}`);
    console.log(`   Price: $${signal.price}`);
    console.log(`   Confidence: ${(signal.confidence * 100).toFixed(1)}%\n`);

    // Calculate quantity (similar to PositionManager logic)
    const baseSize = 361 * 0.08; // 8% of $361 balance
    const confidenceMultiplier = 0.5 + (signal.confidence * 1.5);
    const usdAmount = baseSize * confidenceMultiplier;
    const quantity = usdAmount / signal.price;

    console.log(`   📈 Position Sizing:`);
    console.log(`   - Base Size: $${baseSize.toFixed(2)}`);
    console.log(`   - Confidence Multiplier: ${confidenceMultiplier.toFixed(2)}x`);
    console.log(`   - USD Amount: $${usdAmount.toFixed(2)}`);
    console.log(`   - Quantity: ${quantity.toFixed(8)}\n`);

    // Test the webhook payload
    try {
      const result = await adapter.sendWebhook(signal, quantity);
      
      if (result.success) {
        console.log(`   ✅ Webhook Success: ${signal.action} ${signal.symbol}`);
        if (result.response) {
          console.log(`   📄 Response:`, result.response);
        }
      } else {
        console.log(`   ❌ Webhook Failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`   🚨 Webhook Error:`, error);
    }

    console.log('\n' + '='.repeat(50) + '\n');
  }

  console.log('🎯 Test Complete - Check webhook service logs for received payloads');
}

testWebhookPayload().catch(console.error);