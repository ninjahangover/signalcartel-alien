#!/usr/bin/env npx tsx
/**
 * Start QUANTUM FORGE™ PROFIT PREDATOR - Ultimate 564-Pair Hunting System
 * Dynamically hunts the most profitable opportunities across ALL Kraken pairs
 */

import { phaseManager } from '../src/lib/quantum-forge-phase-config';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const LOG_DIR = '/tmp/signalcartel-logs';

async function main() {
  console.log('🐅 QUANTUM FORGE™ PROFIT PREDATOR STARTUP');
  console.log('=========================================');
  console.log('');
  
  // Ensure log directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  
  // Force Phase 0 for maximum hunting
  console.log('🎯 Setting system to Phase 0 (Maximum hunting mode)...');
  phaseManager.setManualPhase(0);
  const phase = await phaseManager.getCurrentPhase();
  
  console.log(`✅ Phase set to: ${phase.name}`);
  console.log(`📊 Confidence threshold: ${(phase.features.confidenceThreshold * 100).toFixed(1)}%`);
  console.log('');
  console.log('🚀 PROFIT PREDATOR FEATURES ACTIVATED:');
  console.log('  • 564-pair continuous scanning (every 5 seconds)');
  console.log('  • AI-driven opportunity scoring');
  console.log('  • Real-time sentiment analysis');
  console.log('  • Order book intelligence');
  console.log('  • Dynamic pair selection (top 15+ most profitable)');
  console.log('  • Manipulation pattern detection');
  console.log('  • Volume surge identification');
  console.log('  • Momentum tracking');
  console.log('  • Multi-strategy hunting');
  console.log('');
  console.log('🎯 HUNTING STRATEGY:');
  console.log('  → Scan ALL 564 pairs for opportunities');
  console.log('  → Score each pair using 6 AI algorithms');
  console.log('  → Trade top 3-5 opportunities simultaneously');
  console.log('  → Dynamically switch pairs as opportunities change');
  console.log('  → Never miss a profitable move on any pair!');
  console.log('');
  
  // Start the profit predator engine
  console.log('🐅 Starting PROFIT PREDATOR engine...');
  
  const predatorProcess = spawn('npx', ['tsx', 'production-trading-profit-predator.ts'], {
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public",
      ENABLE_GPU_STRATEGIES: "true",
      NTFY_TOPIC: "signal-cartel",
      FORCE_PHASE_0: "true"
    },
    stdio: 'inherit'
  });
  
  predatorProcess.on('error', (error) => {
    console.error('❌ Failed to start Profit Predator:', error);
    process.exit(1);
  });
  
  predatorProcess.on('exit', (code) => {
    console.log(`Profit Predator exited with code ${code}`);
    process.exit(code || 0);
  });
  
  // Start monitor in separate process
  setTimeout(() => {
    console.log('\n📊 Starting live profit monitor...');
    spawn('npx', ['tsx', '-r', 'dotenv/config', 'admin/quantum-forge-live-monitor.ts'], {
      stdio: 'inherit',
      detached: false
    });
  }, 3000);
  
  console.log('\n✅ PROFIT PREDATOR HUNTING SYSTEM ACTIVE!');
  console.log('📁 Hunt logs: /tmp/signalcartel-logs/profit-predator.log');
  console.log('📁 Main logs: /tmp/signalcartel-logs/production-trading.log');
  console.log('');
  console.log('🐅 The predator is now hunting across 564 pairs...');
  console.log('💰 Expect maximum profit extraction!');
  console.log('');
  console.log('Press Ctrl+C to stop hunting');
}

main().catch(console.error);