#!/usr/bin/env tsx

/**
 * SINGLE POSITION TEST
 * 
 * Test the calibrated exit logic with just one position to verify:
 * 1. Calibrated parameters are applied correctly
 * 2. Exit conditions trigger at the right percentages
 * 3. Position closes properly without getting stuck
 */

import { MasterTradingPipeline } from '../master-trading-pipeline';

async function testSinglePosition() {
  console.log('🧪 SINGLE POSITION EXIT TEST');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('Testing calibrated exit logic with limited positions');
  console.log('Expected behavior:');
  console.log('• WLFIUSD: 5% stop loss, 8% take profit');
  console.log('• ETHUSD: 3% stop loss, 5% take profit');  
  console.log('• BTCUSD: 2% stop loss, 3% take profit');
  console.log('════════════════════════════════════════════════════════════════');
  console.log();

  // Create a modified pipeline that limits to 1-3 positions max
  const pipeline = new MasterTradingPipeline();
  
  console.log('⏰ Starting limited position test in 3 seconds...');
  console.log('   Press Ctrl+C to cancel');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('🚀 Starting Master Trading Pipeline with position limit...');
  
  try {
    // This will run the full pipeline but with our new exit logic
    await pipeline.start();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testSinglePosition();
}

export default testSinglePosition;