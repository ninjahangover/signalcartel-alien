#!/usr/bin/env npx tsx
/**
 * QUANTUM FORGE™ SMART DUAL-SYSTEM LAUNCHER
 * Core Trading + Smart Profit Hunter Integration
 */

import { phaseManager } from '../src/lib/quantum-forge-phase-config';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const LOG_DIR = '/tmp/signalcartel-logs';

async function main() {
  console.log('🚀 QUANTUM FORGE™ SMART DUAL-SYSTEM STARTUP');
  console.log('=============================================');
  console.log('');
  
  // Ensure log directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  
  // Get current phase info
  await phaseManager.updateTradeCount();
  const phase = await phaseManager.getCurrentPhase();
  
  console.log(`🎯 Current Phase: ${phase.phase} - ${phase.name}`);
  console.log(`⚙️  Confidence Threshold: ${(phase.features.confidenceThreshold * 100).toFixed(1)}%`);
  console.log('');
  
  console.log('🧠 DUAL-SYSTEM ARCHITECTURE:');
  console.log('  🎯 Core Trading Engine: Pine Script strategies + 15 proven pairs');
  console.log('  🔍 Smart Profit Hunter: API-efficient opportunity detection');
  console.log('  ⚡ Integration: Hot opportunities → trading pipeline');
  console.log('  📊 Smart APIs: 4 calls vs 564 individual scans');
  console.log('');
  
  // Start the enhanced dual-system trading engine
  console.log('🚀 Starting Smart Dual-System Trading Engine...');
  
  const tradingProcess = spawn('npx', ['tsx', 'production-trading-with-scout.ts'], {
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public",
      ENABLE_GPU_STRATEGIES: "true",
      NTFY_TOPIC: "signal-cartel",
      SMART_HUNTER_MODE: "true"
    },
    stdio: 'inherit'
  });
  
  tradingProcess.on('error', (error) => {
    console.error('❌ Failed to start dual-system engine:', error);
    process.exit(1);
  });
  
  tradingProcess.on('exit', (code) => {
    console.log(`Dual-system engine exited with code ${code}`);
    process.exit(code || 0);
  });
  
  // Start monitor in separate process after delay
  setTimeout(() => {
    console.log('\\n📊 Starting Smart Hunter live monitor...');
    spawn('npx', ['tsx', 'test-smart-profit-hunter.ts'], {
      stdio: 'inherit',
      detached: false
    });
  }, 5000);
  
  console.log('\\n✅ SMART DUAL-SYSTEM RUNNING');
  console.log('🎯 Core Engine: Real Pine Script strategies');  
  console.log('🧠 Smart Hunter: Efficient profitable pair detection');
  console.log('📁 Logs: /tmp/signalcartel-logs/');
  console.log('');
  console.log('Press Ctrl+C to stop all processes');
}

main().catch(console.error);