#!/usr/bin/env tsx

/**
 * CRASH DETECTION & AUTO-LIQUIDATION SERVICE
 * Monitors trading engine and automatically liquidates on crash/stall
 */

import { emergencyLiquidation } from './emergency-liquidation';
import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = '/tmp/signalcartel-logs/production-trading.log';
const CHECK_INTERVAL = 30000; // Check every 30 seconds
const STALL_THRESHOLD = 180000; // 3 minutes without activity = stall

class CrashDetectionService {
  private lastActivity: Date = new Date();
  private isMonitoring = false;
  private checkTimer?: NodeJS.Timeout;

  start() {
    console.log('🛡️ CRASH DETECTION SERVICE STARTED');
    console.log(`📊 Monitoring: ${LOG_FILE}`);
    console.log(`⏰ Check interval: ${CHECK_INTERVAL / 1000}s`);
    console.log(`⚠️ Stall threshold: ${STALL_THRESHOLD / 1000}s`);
    
    this.isMonitoring = true;
    this.startMonitoring();
  }

  stop() {
    console.log('🛑 Stopping crash detection service...');
    this.isMonitoring = false;
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
    }
  }

  private startMonitoring() {
    this.checkTimer = setTimeout(async () => {
      if (!this.isMonitoring) return;

      try {
        await this.checkSystemHealth();
      } catch (error) {
        console.error('❌ Error in crash detection:', error);
      }

      // Schedule next check
      if (this.isMonitoring) {
        this.startMonitoring();
      }
    }, CHECK_INTERVAL);
  }

  private async checkSystemHealth() {
    try {
      // 1. Check if log file exists and is being written to
      if (!fs.existsSync(LOG_FILE)) {
        console.log('⚠️ Log file not found - system may not be running');
        return;
      }

      // 2. Check log file modification time
      const stats = fs.statSync(LOG_FILE);
      const lastModified = stats.mtime;
      const timeSinceLastActivity = Date.now() - lastModified.getTime();

      // 3. Check for recent trading activity
      const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
      const lines = logContent.split('\n').slice(-100); // Last 100 lines
      
      let hasRecentActivity = false;
      const now = new Date();
      
      // Look for recent timestamps in logs
      for (const line of lines.reverse()) {
        if (line.includes('Trading Cycle') || 
            line.includes('POSITION OPENED') || 
            line.includes('EXIT:') ||
            line.includes('GPU PINE SCRIPT')) {
          
          // Try to extract timestamp (basic check)
          const timestampMatch = line.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/);
          if (timestampMatch) {
            const logTime = new Date(timestampMatch[0]);
            if (now.getTime() - logTime.getTime() < STALL_THRESHOLD) {
              hasRecentActivity = true;
              break;
            }
          }
        }
      }

      // 4. Check for error patterns indicating crash
      const hasErrors = logContent.includes('Error:') || 
                       logContent.includes('ECONNREFUSED') ||
                       logContent.includes('fetch failed') ||
                       logContent.includes('Maximum call stack');

      const isStalled = timeSinceLastActivity > STALL_THRESHOLD && !hasRecentActivity;

      // 5. Status reporting
      if (isStalled || hasErrors) {
        console.log(`🚨 SYSTEM ISSUE DETECTED:`);
        console.log(`   Stalled: ${isStalled} (${Math.floor(timeSinceLastActivity / 1000)}s since last log)`);
        console.log(`   Errors: ${hasErrors}`);
        console.log(`   Recent activity: ${hasRecentActivity}`);
        
        // 6. Trigger emergency liquidation
        console.log('\n🚨 TRIGGERING EMERGENCY LIQUIDATION...');
        await emergencyLiquidation();
        
        console.log('\n📧 NOTIFICATION: System crash detected and positions liquidated');
        
      } else {
        // System is healthy
        const activityAge = Math.floor(timeSinceLastActivity / 1000);
        console.log(`✅ System healthy - last activity ${activityAge}s ago`);
      }

    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }
}

// Auto-start if run directly
if (require.main === module) {
  const service = new CrashDetectionService();
  
  // Start monitoring
  service.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down...');
    service.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    service.stop();
    process.exit(0);
  });
  
  console.log('🛡️ Crash detection service running. Press Ctrl+C to stop.');
}

export { CrashDetectionService };