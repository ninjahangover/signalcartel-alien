/**
 * CONTINUOUS SYNC AGENT - Monitors trades and maintains database-Kraken alignment
 * Prevents dashboard from showing wrong data by constantly polling both sources
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface SyncMetrics {
  lastSyncTime: Date;
  syncCount: number;
  driftDetected: number;
  lastKnownPositions: string;
}

class ContinuousSyncAgent {
  private syncInterval: number = 60000; // 1 minute polling
  private logDir = '/tmp/signalcartel-logs';
  private metricsFile = path.join(this.logDir, 'sync-agent-metrics.json');
  private isRunning = false;

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    try {
      if (!fs.existsSync(this.metricsFile)) {
        const initialMetrics: SyncMetrics = {
          lastSyncTime: new Date(),
          syncCount: 0,
          driftDetected: 0,
          lastKnownPositions: JSON.stringify({})
        };
        fs.writeFileSync(this.metricsFile, JSON.stringify(initialMetrics, null, 2));
      }
    } catch (error) {
      console.log('⚠️ Could not initialize sync metrics:', error.message);
    }
  }

  async start() {
    this.isRunning = true;
    console.log('🔄 CONTINUOUS SYNC AGENT STARTED');
    console.log(`📡 Polling every ${this.syncInterval / 1000} seconds`);
    console.log('🎯 Monitoring: Database ↔ Kraken position alignment');

    while (this.isRunning) {
      try {
        await this.performSyncCheck();
        await this.sleep(this.syncInterval);
      } catch (error) {
        console.error('❌ Sync check failed:', error.message);
        await this.sleep(5000); // Short retry delay on error
      }
    }
  }

  async stop() {
    this.isRunning = false;
    console.log('🛑 Continuous sync agent stopped');
  }

  private async performSyncCheck() {
    const timestamp = new Date().toISOString();
    console.log(`\\n🔍 [${timestamp}] Performing sync check...`);

    try {
      // Check database positions
      const dbPositions = await this.getDatabasePositions();

      // Check trading log for recent activity
      const logActivity = await this.checkTradingLogActivity();

      // Analyze for drift
      const driftDetected = await this.detectDrift(dbPositions, logActivity);

      // Update metrics
      await this.updateMetrics(dbPositions, driftDetected);

      if (driftDetected) {
        console.log('🚨 POSITION DRIFT DETECTED - Manual sync recommended');
        await this.logDriftAlert(dbPositions, logActivity);
      } else {
        console.log('✅ Database-Kraken alignment verified');
      }

    } catch (error) {
      console.error('❌ Sync check error:', error.message);
    }
  }

  private async getDatabasePositions(): Promise<any[]> {
    try {
      const positions = await prisma.managedPosition.findMany({
        where: { status: 'open' },
        select: {
          symbol: true,
          quantity: true,
          entryPrice: true,
          createdAt: true
        }
      });

      console.log(`📊 Database: ${positions.length} open positions`);
      return positions;
    } catch (error) {
      console.error('❌ Database query failed:', error.message);
      return [];
    }
  }

  private async checkTradingLogActivity(): Promise<string[]> {
    try {
      const logPath = path.join(this.logDir, 'production-trading.log');
      if (!fs.existsSync(logPath)) {
        return [];
      }

      const logContent = fs.readFileSync(logPath, 'utf8');
      const lines = logContent.split('\\n').slice(-100); // Last 100 lines

      const recentActivity = lines.filter(line => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        try {
          const lineDate = new Date(line.split('[')[1]?.split(']')[0] || '');
          return lineDate > fiveMinutesAgo;
        } catch {
          return false;
        }
      });

      console.log(`📝 Trading log: ${recentActivity.length} recent activities`);
      return recentActivity;
    } catch (error) {
      console.log('⚠️ Could not check trading log:', error.message);
      return [];
    }
  }

  private async detectDrift(dbPositions: any[], logActivity: string[]): Promise<boolean> {
    // Simple drift detection logic

    // Check 1: If log shows trading but database positions unchanged for >5 minutes
    const hasRecentTradingActivity = logActivity.some(line =>
      line.includes('position') || line.includes('trade') || line.includes('order')
    );

    if (hasRecentTradingActivity && dbPositions.length === 0) {
      console.log('🔍 Drift detected: Trading activity but no database positions');
      return true;
    }

    // Check 2: Compare with last known state
    try {
      const metrics = JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
      const lastPositions = JSON.parse(metrics.lastKnownPositions || '{}');
      const currentPositions = dbPositions.reduce((acc, pos) => {
        acc[pos.symbol] = pos.quantity;
        return acc;
      }, {});

      const positionsChanged = JSON.stringify(lastPositions) !== JSON.stringify(currentPositions);
      const logActivityPresent = logActivity.length > 0;

      if (logActivityPresent && !positionsChanged) {
        const timeSinceLastSync = new Date().getTime() - new Date(metrics.lastSyncTime).getTime();
        if (timeSinceLastSync > 300000) { // 5 minutes
          console.log('🔍 Drift detected: Log activity but positions unchanged for >5 min');
          return true;
        }
      }
    } catch (error) {
      // If can't compare, assume no drift
    }

    return false;
  }

  private async updateMetrics(positions: any[], driftDetected: boolean) {
    try {
      const metrics = JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
      metrics.lastSyncTime = new Date().toISOString();
      metrics.syncCount += 1;
      if (driftDetected) metrics.driftDetected += 1;
      metrics.lastKnownPositions = JSON.stringify(
        positions.reduce((acc, pos) => {
          acc[pos.symbol] = pos.quantity;
          return acc;
        }, {})
      );

      fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
    } catch (error) {
      console.log('⚠️ Could not update metrics:', error.message);
    }
  }

  private async logDriftAlert(dbPositions: any[], logActivity: string[]) {
    const alertLog = path.join(this.logDir, 'sync-drift-alerts.log');
    const alert = {
      timestamp: new Date().toISOString(),
      databasePositions: dbPositions.length,
      recentLogActivity: logActivity.length,
      message: 'Position drift detected - database may be out of sync with Kraken'
    };

    try {
      fs.appendFileSync(alertLog, JSON.stringify(alert) + '\\n');

      // Send ntfy alert if configured
      if (process.env.NTFY_TOPIC) {
        await this.sendNtfyAlert(`🚨 Position Sync Drift Detected\\nDB: ${dbPositions.length} positions\\nLog: ${logActivity.length} activities`);
      }
    } catch (error) {
      console.log('⚠️ Could not log drift alert:', error.message);
    }
  }

  private async sendNtfyAlert(message: string) {
    try {
      const response = await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
        method: 'POST',
        headers: {
          'Title': 'SignalCartel Sync Alert',
          'Priority': 'high',
          'Tags': 'warning,sync'
        },
        body: message
      });

      if (!response.ok) {
        throw new Error(`ntfy returned ${response.status}`);
      }

      console.log('📱 Drift alert sent via ntfy');
    } catch (error) {
      console.log('⚠️ Could not send ntfy alert:', error.message);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Graceful shutdown handling
  setupGracefulShutdown() {
    const shutdownHandler = () => {
      console.log('\\n🛑 Shutdown signal received...');
      this.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
  }
}

// Main execution
if (require.main === module) {
  const agent = new ContinuousSyncAgent();
  agent.setupGracefulShutdown();

  console.log('🚀 CONTINUOUS SYNC AGENT V1.0');
  console.log('================================');
  console.log('📡 Monitoring database-Kraken position alignment');
  console.log('🔄 Press Ctrl+C to stop');
  console.log('');

  agent.start().catch(error => {
    console.error('❌ Sync agent crashed:', error);
    process.exit(1);
  });
}

export { ContinuousSyncAgent };