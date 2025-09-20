/**
 * FAILOVER SENTINEL - Dev1/Dev2 High Availability System
 * Ensures 100% uptime for trading contest evaluation
 * Monitors primary (dev1) and activates failover (dev2) if needed
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

interface NodeHealth {
  isHealthy: boolean;
  lastHeartbeat: Date;
  services: {
    trading: boolean;
    database: boolean;
    kraken: boolean;
    guardian: boolean;
  };
  latency: number;
}

class FailoverSentinel {
  private readonly PRIMARY_HOST = process.env.PRIMARY_HOST || 'dev1.local';
  private readonly FAILOVER_HOST = process.env.FAILOVER_HOST || 'dev2.local';
  private readonly CHECK_INTERVAL = 10000; // 10 seconds
  private readonly FAILOVER_THRESHOLD = 3; // 3 failed checks before failover

  private isPrimary = process.env.NODE_ROLE === 'primary';
  private isFailoverActive = false;
  private failedChecks = 0;
  private lastNotification = 0;

  constructor() {
    console.log(`🛡️ FAILOVER SENTINEL INITIALIZED`);
    console.log(`📍 Role: ${this.isPrimary ? 'PRIMARY (dev1)' : 'FAILOVER (dev2)'}`);
    console.log(`🔄 Health checks every ${this.CHECK_INTERVAL/1000}s`);
    console.log(`⚠️ Failover after ${this.FAILOVER_THRESHOLD} failed checks`);
  }

  async start() {
    if (this.isPrimary) {
      // Primary node broadcasts health
      await this.startHealthBroadcast();
    } else {
      // Failover node monitors primary
      await this.startHealthMonitoring();
    }
  }

  /**
   * PRIMARY NODE: Broadcast health status
   */
  private async startHealthBroadcast() {
    // Create health endpoint
    const express = require('express');
    const app = express();

    app.get('/health', async (req, res) => {
      const health = await this.checkLocalServices();
      res.json({
        status: 'healthy',
        timestamp: new Date(),
        services: health,
        node: 'primary'
      });
    });

    app.listen(3099, () => {
      console.log('💚 Health endpoint active on :3099');
    });

    // Also write health to shared file if network fails
    setInterval(async () => {
      const health = await this.checkLocalServices();
      const healthFile = '/tmp/signalcartel-primary-health.json';
      fs.writeFileSync(healthFile, JSON.stringify({
        timestamp: Date.now(),
        services: health,
        node: 'primary'
      }));
    }, 5000);
  }

  /**
   * FAILOVER NODE: Monitor primary health
   */
  private async startHealthMonitoring() {
    console.log('👁️ Monitoring primary node health...');

    setInterval(async () => {
      const isHealthy = await this.checkPrimaryHealth();

      if (!isHealthy) {
        this.failedChecks++;
        console.log(`⚠️ Primary health check failed (${this.failedChecks}/${this.FAILOVER_THRESHOLD})`);

        if (this.failedChecks >= this.FAILOVER_THRESHOLD && !this.isFailoverActive) {
          await this.activateFailover();
        }
      } else {
        if (this.failedChecks > 0) {
          console.log('✅ Primary recovered, resetting counter');
        }
        this.failedChecks = 0;

        // If we're in failover mode and primary is back, prepare for failback
        if (this.isFailoverActive) {
          await this.prepareFailback();
        }
      }
    }, this.CHECK_INTERVAL);
  }

  /**
   * Check if primary node is healthy
   */
  private async checkPrimaryHealth(): Promise<boolean> {
    try {
      // Try HTTP health check first
      const response = await axios.get(`http://${this.PRIMARY_HOST}:3099/health`, {
        timeout: 5000
      });

      if (response.data.status === 'healthy') {
        return true;
      }
    } catch (error) {
      console.log('🔴 HTTP health check failed, checking shared file...');
    }

    // Fallback to shared file check
    try {
      const healthFile = '/tmp/signalcartel-primary-health.json';
      if (fs.existsSync(healthFile)) {
        const data = JSON.parse(fs.readFileSync(healthFile, 'utf8'));
        const age = Date.now() - data.timestamp;

        // Consider healthy if updated within 30 seconds
        if (age < 30000) {
          return true;
        }
      }
    } catch (error) {
      console.log('🔴 Shared file health check failed');
    }

    return false;
  }

  /**
   * Check local service health
   */
  private async checkLocalServices() {
    const services = {
      trading: false,
      database: false,
      kraken: false,
      guardian: false
    };

    try {
      // Check trading system
      const { stdout: tradingPs } = await execAsync('pgrep -f "production-trading-multi-pair" | head -1');
      services.trading = !!tradingPs.trim();

      // Check database
      try {
        await execAsync('pg_isready -h localhost -p 5433 -U warehouse_user -d signalcartel');
        services.database = true;
      } catch {}

      // Check Kraken proxy
      try {
        await axios.get('http://localhost:3002/health', { timeout: 2000 });
        services.kraken = true;
      } catch {}

      // Check system guardian
      const { stdout: guardianPs } = await execAsync('pgrep -f "system-guardian" | head -1');
      services.guardian = !!guardianPs.trim();

    } catch (error) {
      console.error('Service check error:', error.message);
    }

    return services;
  }

  /**
   * ACTIVATE FAILOVER - Take over trading
   */
  private async activateFailover() {
    console.log('🚨 ACTIVATING FAILOVER MODE - DEV2 TAKING OVER!');

    this.isFailoverActive = true;

    // Send notification
    await this.sendNotification('🚨 FAILOVER ACTIVATED', 'Dev1 is down, Dev2 taking over trading!');

    // Start trading services on failover node
    console.log('🚀 Starting trading services...');

    try {
      // Start with database sync first
      await execAsync('cd /home/telgkb9/depot/current && ./admin/sync-from-primary.sh');

      // Start trading system
      await execAsync('cd /home/telgkb9/depot/current && ./tensor-start.sh');

      console.log('✅ FAILOVER COMPLETE - Dev2 is now primary!');

      // Update role
      process.env.NODE_ROLE = 'primary';
      this.isPrimary = true;

      // Start broadcasting our health
      await this.startHealthBroadcast();

    } catch (error) {
      console.error('❌ Failover activation failed:', error);
      await this.sendNotification('❌ FAILOVER FAILED', `Error: ${error.message}`);
    }
  }

  /**
   * PREPARE FAILBACK - Primary is back online
   */
  private async prepareFailback() {
    console.log('🔄 Primary node recovered - preparing for failback...');

    // Wait for manual confirmation or auto-failback after stability period
    setTimeout(async () => {
      if (await this.checkPrimaryHealth()) {
        console.log('📍 Initiating failback to primary...');

        // Gracefully stop local trading
        await execAsync('cd /home/telgkb9/depot/current && ./tensor-stop.sh');

        // Sync final state back to primary
        await execAsync('cd /home/telgkb9/depot/current && ./admin/sync-to-primary.sh');

        this.isFailoverActive = false;
        this.isPrimary = false;
        process.env.NODE_ROLE = 'failover';

        console.log('✅ Failback complete - Dev1 is primary again');
        await this.sendNotification('✅ FAILBACK COMPLETE', 'Dev1 has resumed primary trading role');
      }
    }, 60000); // Wait 1 minute for stability
  }

  /**
   * Send notification via ntfy
   */
  private async sendNotification(title: string, message: string) {
    if (Date.now() - this.lastNotification < 60000) return; // Rate limit

    try {
      await execAsync(`curl -H "Title: ${title}" -d "${message}" ntfy.sh/signal-cartel`);
      this.lastNotification = Date.now();
    } catch {}
  }
}

// Start the sentinel
const sentinel = new FailoverSentinel();
sentinel.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down failover sentinel...');
  process.exit(0);
});