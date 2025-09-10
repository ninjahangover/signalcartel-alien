#!/usr/bin/env node
/**
 * SYSTEM GUARDIAN FIXED - Trading System Heartbeat Monitor & Auto-Restart Service
 * 
 * Simplified and robust version that will definitely work
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SystemHealth {
  processRunning: boolean;
  logActivity: boolean;
  lastLogTime: Date | null;
  consecutiveFailures: number;
}

class SystemGuardianFixed {
  private health: SystemHealth = {
    processRunning: false,
    logActivity: false,
    lastLogTime: null,
    consecutiveFailures: 0
  };
  
  private readonly logPath = '/tmp/signalcartel-logs/production-trading.log';
  private readonly incidentLogPath = '/tmp/signalcartel-logs/system-guardian.log';
  private isRunning = false;

  constructor() {
    this.logIncident('🚀 SYSTEM GUARDIAN FIXED - Trading System Protection Active');
  }

  /**
   * Log incidents to guardian log file
   */
  private logIncident(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    console.log(logMessage);
    
    // Append to log file
    try {
      require('fs').appendFileSync(this.incidentLogPath, logMessage + '\n');
    } catch (error) {
      console.error('Failed to write to incident log:', error.message);
    }
  }

  /**
   * Check if trading process is running
   */
  private async isProcessRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('ps aux | grep "production-trading-multi-pair.ts" | grep -v grep');
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if log shows recent activity (within 2 minutes)
   */
  private async checkLogActivity(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.logPath);
      const logAge = Date.now() - stats.mtime.getTime();
      this.health.lastLogTime = stats.mtime;
      return logAge <= 120000; // 2 minutes
    } catch (error) {
      this.health.lastLogTime = null;
      return false;
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    const timestamp = new Date().toISOString();
    
    try {
      this.health.processRunning = await this.isProcessRunning();
      this.health.logActivity = await this.checkLogActivity();
      
      const systemHealthy = this.health.processRunning && this.health.logActivity;
      
      if (!systemHealthy) {
        this.health.consecutiveFailures++;
        
        this.logIncident(`🚨 SYSTEM FAILURE DETECTED at ${timestamp}:`);
        this.logIncident(`   Process Running: ${this.health.processRunning}`);
        this.logIncident(`   Log Activity: ${this.health.logActivity} (last: ${this.health.lastLogTime})`);
        this.logIncident(`   Consecutive Failures: ${this.health.consecutiveFailures}`);
        
        if (this.health.consecutiveFailures >= 12) {
          this.logIncident(`🚨 CRITICAL: Trading system has failed ${this.health.consecutiveFailures} times. Manual intervention required!`);
          this.logIncident('🔴 SYSTEM GUARDIAN ENTERING ESCALATION MODE');
        }
        
        // Attempt restart
        if (this.health.consecutiveFailures <= 5) {
          this.logIncident('🔄 ATTEMPTING RESTART #1');
          await this.restartTradingSystem();
        }
      } else {
        // System is healthy - reset failure counter
        if (this.health.consecutiveFailures > 0) {
          this.logIncident(`✅ SYSTEM RECOVERED - Resetting failure count (was ${this.health.consecutiveFailures})`);
          this.health.consecutiveFailures = 0;
        }
      }
      
    } catch (error) {
      this.logIncident(`❌ Health check error: ${error.message}`);
    }
  }

  /**
   * Restart the trading system
   */
  private async restartTradingSystem(): Promise<void> {
    try {
      // Kill existing processes
      await execAsync('pkill -f "production-trading-multi-pair.ts" || true');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start new process
      const command = `TENSOR_MODE=true DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" ENABLE_GPU_STRATEGIES=true NTFY_TOPIC="signal-cartel" NODE_OPTIONS="--max-old-space-size=4096" TRADING_MODE="LIVE" nohup npx tsx production-trading-multi-pair.ts > /dev/null 2>&1 &`;
      
      await execAsync(command);
      
      this.logIncident('✅ RESTART SUCCESSFUL - Trading system operational');
      
    } catch (error) {
      this.logIncident(`❌ RESTART FAILED: ${error.message}`);
    }
  }

  /**
   * Start monitoring
   */
  async start(): Promise<void> {
    this.isRunning = true;
    this.logIncident('🛡️ SYSTEM GUARDIAN STARTED - Monitoring trading system health');
    
    // Perform health checks every 30 seconds
    while (this.isRunning) {
      await this.performHealthCheck();
      
      // Wait 30 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.isRunning = false;
    this.logIncident('🛡️ SYSTEM GUARDIAN STOPPED');
  }
}

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down System Guardian gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down System Guardian gracefully...');
  process.exit(0);
});

// Start the guardian
const guardian = new SystemGuardianFixed();
guardian.start().catch(error => {
  console.error('❌ System Guardian failed to start:', error.message);
  process.exit(1);
});

console.log('🛡️ SYSTEM GUARDIAN RUNNING - Press Ctrl+C to stop');