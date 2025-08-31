#!/usr/bin/env npx tsx
/**
 * Start QUANTUM FORGE™ in Phase 0 - Simplified Maximum Profit Mode
 * Based on the data: Phase 0 was the ONLY profitable phase!
 */

import { phaseManager } from '../src/lib/quantum-forge-phase-config';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const LOG_DIR = '/tmp/signalcartel-logs';

async function main() {
  console.log('🚀 QUANTUM FORGE™ PHASE 0 SIMPLIFIED STARTUP');
  console.log('============================================');
  console.log('');
  
  // Ensure log directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  
  // Force Phase 0
  console.log('🎯 Setting system to Phase 0...');
  phaseManager.setManualPhase(0);
  const phase = await phaseManager.getCurrentPhase();
  
  console.log(`✅ Phase set to: ${phase.name}`);
  console.log(`📊 Confidence threshold: ${(phase.features.confidenceThreshold * 100).toFixed(1)}%`);
  console.log(`💰 Position size: ${(phase.features.positionSizing * 100).toFixed(1)}% per trade`);
  console.log(`🛡️ Stop loss: ${phase.features.stopLossPercent}%`);
  console.log(`🎯 Take profit: ${phase.features.takeProfitPercent}%`);
  console.log('');
  console.log('🔥 KEY ADVANTAGES OF PHASE 0:');
  console.log('  • Ultra-low 10% confidence threshold = MORE TRADES');
  console.log('  • No complex AI restrictions = FASTER DECISIONS');
  console.log('  • Proven profitable: +$332.59 in testing');
  console.log('  • Simple technical analysis = RELIABLE');
  console.log('');
  
  // Start the trading engine
  console.log('🚀 Starting production trading engine...');
  
  const tradingProcess = spawn('npx', ['tsx', 'production-trading-with-positions.ts'], {
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public",
      ENABLE_GPU_STRATEGIES: "true",
      NTFY_TOPIC: "signal-cartel",
      FORCE_PHASE_0: "true"
    },
    stdio: 'inherit'
  });
  
  tradingProcess.on('error', (error) => {
    console.error('❌ Failed to start trading engine:', error);
    process.exit(1);
  });
  
  tradingProcess.on('exit', (code) => {
    console.log(`Trading engine exited with code ${code}`);
    process.exit(code || 0);
  });
  
  // Start monitor in separate process
  setTimeout(() => {
    console.log('\n📊 Starting live monitor dashboard...');
    spawn('npx', ['tsx', '-r', 'dotenv/config', 'admin/quantum-forge-live-monitor.ts'], {
      stdio: 'inherit',
      detached: false
    });
  }, 3000);
  
  console.log('\n✅ SYSTEM RUNNING IN PHASE 0 SIMPLIFIED MODE');
  console.log('📁 Logs: /tmp/signalcartel-logs/production-trading.log');
  console.log('');
  console.log('Press Ctrl+C to stop all processes');
}

main().catch(console.error);