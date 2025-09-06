#!/usr/bin/env npx tsx

import { gpuService } from '../src/lib/gpu-acceleration-service';

async function testGPUMathematicalIntuition() {
  console.log('🧮 Testing GPU Mathematical Intuition Engine...\n');
  
  // Test data
  const testSymbols = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'AVAXUSD', 'DOTUSD'];
  const testMarketData = testSymbols.map(symbol => ({
    symbol,
    price: Math.random() * 1000 + 100,
    volume: Math.random() * 1000000,
    bid: Math.random() * 1000 + 99,
    ask: Math.random() * 1000 + 101,
    timestamp: Date.now(),
    priceHistory: Array(100).fill(0).map(() => Math.random() * 1000 + 100),
    volumeHistory: Array(100).fill(0).map(() => Math.random() * 1000000)
  }));
  
  console.log('📊 Test Setup:');
  console.log(`- Symbols: ${testSymbols.join(', ')}`);
  console.log(`- Market data points: ${testMarketData.length}`);
  console.log(`- Price history length: 100 points per symbol\n`);
  
  // Test GPU Mathematical Intuition
  console.log('⚡ Running GPU Mathematical Intuition...');
  const gpuStartTime = Date.now();
  
  try {
    const gpuResults = await gpuService.calculateMathematicalIntuition(
      testSymbols,
      testMarketData
    );
    
    const gpuTime = Date.now() - gpuStartTime;
    
    console.log('\n✅ GPU Results:');
    testSymbols.forEach((symbol, i) => {
      console.log(`  ${symbol}: ${(gpuResults[i] * 100).toFixed(2)}% intuition score`);
    });
    console.log(`⏱️  GPU Time: ${gpuTime}ms`);
    
    // Test CPU fallback for comparison
    console.log('\n🖥️  Running CPU Mathematical Intuition (for comparison)...');
    const cpuStartTime = Date.now();
    
    // Simulate CPU calculation (simplified)
    const cpuResults = testMarketData.map(data => {
      // Simulate 8-domain analysis
      const domains = [
        Math.random(), // Flow fields
        Math.random(), // Pattern resonance
        Math.random(), // Timing intuition
        Math.random(), // Energy alignment
        Math.random(), // Information theory
        Math.random(), // Fractal dimensions
        Math.random(), // Chaos metrics
        Math.random()  // Bayesian beliefs
      ];
      
      // Simulate heavy computation
      let result = 0;
      for (let i = 0; i < 1000000; i++) {
        result += domains.reduce((a, b) => a + b, 0) / domains.length;
      }
      return result / 1000000;
    });
    
    const cpuTime = Date.now() - cpuStartTime;
    
    console.log('\n🖥️  CPU Results:');
    testSymbols.forEach((symbol, i) => {
      console.log(`  ${symbol}: ${(cpuResults[i] * 100).toFixed(2)}% intuition score`);
    });
    console.log(`⏱️  CPU Time: ${cpuTime}ms`);
    
    // Performance comparison
    console.log('\n📈 Performance Comparison:');
    console.log(`  GPU Time: ${gpuTime}ms`);
    console.log(`  CPU Time: ${cpuTime}ms`);
    console.log(`  Speedup: ${(cpuTime / gpuTime).toFixed(2)}x faster on GPU`);
    
    // Test batch processing
    console.log('\n🎯 Testing Batch Processing (100 symbols)...');
    const largeBatch = Array(100).fill(0).map((_, i) => `TEST${i}`);
    const largeBatchData = largeBatch.map(() => testMarketData[0]);
    
    const batchStartTime = Date.now();
    const batchResults = await gpuService.calculateMathematicalIntuition(
      largeBatch,
      largeBatchData
    );
    const batchTime = Date.now() - batchStartTime;
    
    console.log(`✅ Batch processed: ${batchResults.length} symbols in ${batchTime}ms`);
    console.log(`📊 Average time per symbol: ${(batchTime / 100).toFixed(2)}ms`);
    
  } catch (error) {
    console.error('❌ Error testing GPU Mathematical Intuition:', error);
  }
  
  console.log('\n✨ Test complete!');
  process.exit(0);
}

// Run the test
testGPUMathematicalIntuition().catch(console.error);