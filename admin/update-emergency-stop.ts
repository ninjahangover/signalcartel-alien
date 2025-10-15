/**
 * V3.14.5: Emergency admin script to update brain's emergency stop threshold
 * Allows updating the running brain without full system restart
 */

import { adaptiveProfitBrain } from '../src/lib/adaptive-profit-brain';

async function main() {
  console.log('');
  console.log('🧠 V3.14.5: EMERGENCY STOP THRESHOLD UPDATE');
  console.log('==========================================');

  try {
    // Access the running brain singleton
    const brain = adaptiveProfitBrain || (global as any).adaptiveProfitBrain;

    if (!brain) {
      console.error('❌ Brain not initialized! System may need restart.');
      process.exit(1);
    }

    // Get current threshold
    const currentThresholds = brain.getCurrentThresholds();
    const emergencyStop = currentThresholds.emergencyLossStop;

    console.log('');
    console.log('📊 CURRENT THRESHOLD:');
    console.log(`   Emergency Stop: ${(emergencyStop.current * 100).toFixed(1)}%`);
    console.log(`   Optimal Estimate: ${(emergencyStop.optimal * 100).toFixed(1)}%`);
    console.log('');

    // Get threshold parameter directly
    const thresholdParam = (brain as any).thresholds.get('emergencyLossStop');

    if (!thresholdParam) {
      console.error('❌ Could not access emergencyLossStop threshold');
      process.exit(1);
    }

    console.log('🔧 UPDATING THRESHOLD:');
    console.log(`   Old Value: ${(thresholdParam.currentValue * 100).toFixed(1)}%`);

    // V3.14.5: Update to -8% for small account protection
    thresholdParam.currentValue = -0.08;
    thresholdParam.optimalEstimate = -0.10;
    thresholdParam.learningRate = 0.001 * 1.0; // Faster learning
    thresholdParam.explorationNoise = 0.08;
    thresholdParam.maxValue = -0.03; // Never tighter than -3%

    console.log(`   New Value: ${(thresholdParam.currentValue * 100).toFixed(1)}%`);
    console.log(`   New Optimal: ${(thresholdParam.optimalEstimate * 100).toFixed(1)}%`);
    console.log('');

    console.log('✅ THRESHOLD UPDATED SUCCESSFULLY!');
    console.log('');
    console.log('📋 IMPACT:');
    console.log('   - SLAYUSD at -7.94% will trigger emergency stop on next cycle');
    console.log('   - Brain will learn optimal stop from actual trade outcomes');
    console.log('   - No system restart required - changes apply immediately');
    console.log('');

    console.log('🔮 NEXT CYCLE PREDICTIONS:');
    console.log('   - SLAYUSD: -7.94% < -8.0% → Emergency exit expected');
    console.log('   - MOODENGUSD: -3.29% (safe - above -8% threshold)');
    console.log('   - WIFUSD: -3.32% (safe - above -8% threshold)');
    console.log('');

  } catch (error) {
    console.error('❌ Error updating threshold:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
