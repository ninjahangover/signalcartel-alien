#!/usr/bin/env node
/**
 * Test System Guardian Process Detection
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testProcessDetection(): Promise<void> {
  console.log('🧪 Testing System Guardian Process Detection');
  
  try {
    // Test current pattern
    const { stdout } = await execAsync('ps aux | grep "production-trading-multi-pair.ts" | grep -v grep');
    const processCount = stdout.trim().split('\n').filter(line => line.trim()).length;
    
    console.log(`✅ Process detection test: Found ${processCount} processes`);
    console.log('📋 Processes:');
    stdout.trim().split('\n').forEach((line, i) => {
      if (line.trim()) {
        console.log(`   ${i+1}: ${line.substring(0, 100)}...`);
      }
    });
    
    const isRunning = stdout.trim().length > 0;
    console.log(`🔍 Process Running: ${isRunning}`);
    
    // Test log activity
    const fs = require('fs').promises;
    const logPath = '/tmp/signalcartel-logs/production-trading.log';
    
    try {
      const stats = await fs.stat(logPath);
      const logAge = Date.now() - stats.mtime.getTime();
      const isLogActive = logAge <= 120000; // 2 minutes
      
      console.log(`📝 Log Activity Test:`);
      console.log(`   Last Modified: ${stats.mtime}`);
      console.log(`   Age: ${Math.round(logAge/1000)}s`);
      console.log(`   Active (< 2min): ${isLogActive}`);
    } catch (error) {
      console.log(`❌ Log check failed: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Process detection failed: ${error.message}`);
  }
}

testProcessDetection();