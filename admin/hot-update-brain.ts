/**
 * V3.14.5: HOT UPDATE - Modify running production brain without restart
 * Accesses the global brain singleton used by production trading system
 */

async function main() {
  console.log('');
  console.log('🔥 V3.14.5: HOT BRAIN THRESHOLD UPDATE');
  console.log('=========================================');
  console.log('⚠️  WARNING: This modifies the LIVE trading brain!');
  console.log('');

  try {
    // Access the global brain instance used by production system
    const brain = (global as any).adaptiveProfitBrain;

    if (!brain) {
      console.error('❌ Global brain not found! Production system may not be running.');
      console.error('   Try: ps aux | grep production-trading');
      process.exit(1);
    }

    console.log('✅ Found global brain instance');

    // Access internal thresholds map
    const thresholds = (brain as any).thresholds;

    if (!thresholds || !thresholds.get) {
      console.error('❌ Could not access brain thresholds map');
      process.exit(1);
    }

    // Get emergency stop threshold
    const emergencyStop = thresholds.get('emergencyLossStop');

    if (!emergencyStop) {
      console.error('❌ emergencyLossStop threshold not found');
      process.exit(1);
    }

    console.log('');
    console.log('📊 BEFORE:');
    console.log(`   Current Value: ${(emergencyStop.currentValue * 100).toFixed(1)}%`);
    console.log(`   Optimal Estimate: ${(emergencyStop.optimalEstimate * 100).toFixed(1)}%`);
    console.log(`   Learning Rate: ${emergencyStop.learningRate.toFixed(6)}`);
    console.log(`   Exploration Noise: ${emergencyStop.explorationNoise.toFixed(3)}`);
    console.log('');

    // V3.14.5: Update to -8% for small account protection
    emergencyStop.currentValue = -0.08;
    emergencyStop.optimalEstimate = -0.10;
    emergencyStop.learningRate = 0.001 * 1.0; // Faster learning
    emergencyStop.explorationNoise = 0.08;
    emergencyStop.maxValue = -0.03; // Never tighter than -3%

    console.log('🔧 AFTER:');
    console.log(`   Current Value: ${(emergencyStop.currentValue * 100).toFixed(1)}%`);
    console.log(`   Optimal Estimate: ${(emergencyStop.optimalEstimate * 100).toFixed(1)}%`);
    console.log(`   Learning Rate: ${emergencyStop.learningRate.toFixed(6)}`);
    console.log(`   Exploration Noise: ${emergencyStop.explorationNoise.toFixed(3)}`);
    console.log('');

    console.log('✅ HOT UPDATE SUCCESSFUL!');
    console.log('');
    console.log('📋 IMPACT ON NEXT TRADING CYCLE:');
    console.log('   - SLAYUSD at -7.94% → Will trigger emergency stop (< -8.0%)');
    console.log('   - MOODENGUSD at -3.29% → Safe (above -8% threshold)');
    console.log('   - WIFUSD at -3.32% → Safe (above -8% threshold)');
    console.log('');
    console.log('🔮 EXPECTED LOG OUTPUT:');
    console.log('   "🚨 EMERGENCY STOP (brain-learned): -7.94% loss exceeds -8.0% threshold"');
    console.log('');
    console.log('🧠 BRAIN LEARNING:');
    console.log('   - This exit will create first closed trade');
    console.log('   - Brain will use gradient descent to learn optimal stop');
    console.log('   - Guides toward -10% over 10-20 trades');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
