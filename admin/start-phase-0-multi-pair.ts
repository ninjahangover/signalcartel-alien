#!/usr/bin/env npx tsx
/**
 * Start QUANTUM FORGE™ in Phase 0 - Multi-Pair Trading Mode
 * Trade USD and USDT pairs for maximum opportunities
 */

import { phaseManager } from '../src/lib/quantum-forge-phase-config';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const LOG_DIR = '/tmp/signalcartel-logs';

// High-volume pairs to trade (USD + USDT)
export const TRADING_PAIRS = [
  // USD pairs (existing)
  'BTCUSD', 'ETHUSD', 'SOLUSD',
  
  // High-volume USDT pairs (Spanish traders prefer these!)
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT',
  'ADAUSDT', 'BNBUSDT', 'XRPUSDT',
  
  // Additional profitable pairs
  'AVAXUSD', 'DOTUSD', 'MATICUSD',
  'LINKUSD', 'UNIUSD', 'AAVEUSD'
];

async function main() {
  console.log('🚀 QUANTUM FORGE™ PHASE 0 MULTI-PAIR STARTUP');
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
  console.log('');
  console.log('🔥 TRADING PAIRS ENABLED:');
  console.log(`  • USD Pairs: ${TRADING_PAIRS.filter(p => p.endsWith('USD')).length}`);
  console.log(`  • USDT Pairs: ${TRADING_PAIRS.filter(p => p.endsWith('USDT')).length}`);
  console.log(`  • Total Pairs: ${TRADING_PAIRS.length}`);
  console.log('');
  console.log('📊 Pairs: ' + TRADING_PAIRS.join(', '));
  console.log('');
  
  // Write trading pairs to environment
  process.env.TRADING_PAIRS = JSON.stringify(TRADING_PAIRS);
  
  // Start the enhanced trading engine
  console.log('🚀 Starting multi-pair production trading engine...');
  
  const tradingProcess = spawn('npx', ['tsx', 'production-trading-multi-pair.ts'], {
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public",
      ENABLE_GPU_STRATEGIES: "true",
      NTFY_TOPIC: "signal-cartel",
      FORCE_PHASE_0: "true",
      TRADING_PAIRS: JSON.stringify(TRADING_PAIRS)
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
  
  console.log('\n✅ SYSTEM RUNNING IN PHASE 0 MULTI-PAIR MODE');
  console.log('📁 Logs: /tmp/signalcartel-logs/production-trading.log');
  console.log('');
  console.log('Press Ctrl+C to stop all processes');
}

main().catch(console.error);