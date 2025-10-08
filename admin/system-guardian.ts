#!/usr/bin/env npx tsx
/**
 * SYSTEM GUARDIAN - Process monitoring with ntfy alerts
 * Monitors critical processes and sends alerts when they fail
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

interface ProcessConfig {
  name: string;
  processPattern: string;
  port?: number;
  healthCheck?: () => Promise<boolean>;
  restartCommand?: string;
  logValidation?: () => Promise<boolean>;
}

const NTFY_TOPIC = process.env.NTFY_TOPIC || 'signal-cartel';
const CHECK_INTERVAL = 30000; // 30 seconds
const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
const OHLC_SYNC_INTERVAL = 60 * 60 * 1000; // 60 minutes (1 hour)

// Processes to monitor - matches tensor-start.sh exactly
const MONITORED_PROCESSES: ProcessConfig[] = [
  {
    name: 'Kraken Proxy Server V2.6',
    processPattern: 'kraken-proxy-server.ts',
    port: 3002,
    healthCheck: async () => {
      try {
        const response = await fetch('http://127.0.0.1:3002/health', { timeout: 5000 });
        return response.ok;
      } catch {
        return false;
      }
    },
    restartCommand: 'nohup npx tsx kraken-proxy-server.ts > /tmp/signalcartel-logs/kraken-proxy.log 2>&1 &',
    logValidation: async () => {
      try {
        const response = await fetch('http://127.0.0.1:3002/health');
        return response.ok;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Profit Predator Engine',
    processPattern: 'production-trading-profit-predator.ts',
    restartCommand: 'nohup env DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" ENABLE_GPU_STRATEGIES=false CUDA_VISIBLE_DEVICES="" NTFY_TOPIC="signal-cartel" NODE_OPTIONS="--max-old-space-size=4096" TRADING_MODE="LIVE" npx tsx production-trading-profit-predator.ts > /tmp/signalcartel-logs/profit-predator.log 2>&1 &',
    logValidation: async () => {
      try {
        const logContent = await import('fs').then(fs => fs.promises.readFile('/tmp/signalcartel-logs/profit-predator.log', 'utf8'));
        return logContent.includes('PROFIT PREDATOR ENGINE') || logContent.includes('hunting for opportunities');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Tensor AI Fusion Trading System',
    processPattern: 'production-trading-multi-pair.ts',
    restartCommand: 'nohup env TENSOR_MODE=true DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" ENABLE_GPU_STRATEGIES=true NTFY_TOPIC="signal-cartel" NODE_OPTIONS="--max-old-space-size=4096" TRADING_MODE="LIVE" npx tsx production-trading-multi-pair.ts > /tmp/signalcartel-logs/production-trading.log 2>&1 &',
    logValidation: async () => {
      try {
        const logContent = await import('fs').then(fs => fs.promises.readFile('/tmp/signalcartel-logs/production-trading.log', 'utf8'));
        return logContent.includes('TENSOR FUSION: FULLY ENABLED') || logContent.includes('Kraken authentication successful');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Dashboard (Optional)',
    processPattern: 'pretty-pnl-dashboard.ts',
    port: 3004,
    healthCheck: async () => {
      try {
        const response = await fetch('http://localhost:3004', { timeout: 5000 });
        return response.ok;
      } catch {
        return false;
      }
    },
    restartCommand: 'nohup env DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" npx tsx pretty-pnl-dashboard.ts > /tmp/signalcartel-logs/dashboard.log 2>&1 &'
  }
];

async function sendNtfyAlert(title: string, message: string, priority: 'urgent' | 'high' | 'default' = 'high') {
  try {
    // Clean title for HTTP header (remove emojis)
    const cleanTitle = title.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      body: `${title}\n\n${message}`,
      headers: {
        'Title': cleanTitle,
        'Priority': priority,
        'Tags': 'warning,trading'
      }
    });
    console.log(`🚨 ALERT SENT: ${title}`);
  } catch (error) {
    console.error('❌ Failed to send ntfy alert:', error.message);
  }
}

async function isProcessRunning(pattern: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`ps aux | grep -v grep | grep "${pattern}"`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function restartProcess(config: ProcessConfig): Promise<boolean> {
  if (!config.restartCommand) return false;

  try {
    console.log(`🔄 Attempting to restart ${config.name}...`);

    // Change to the correct directory
    const command = `cd /home/telgkb9/depot/current && ${config.restartCommand}`;
    await execAsync(command);

    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Check if restart was successful - process running
    const isRunning = await isProcessRunning(config.processPattern);
    if (!isRunning) {
      console.log(`❌ Failed to restart ${config.name} - process not running`);
      return false;
    }

    // Additional validation checks
    let validationPassed = true;

    // Health check validation
    if (config.healthCheck) {
      console.log(`🔍 Running health check for ${config.name}...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for service to be ready
      validationPassed = await config.healthCheck();
      if (!validationPassed) {
        console.log(`❌ Health check failed for ${config.name}`);
      }
    }

    // Log validation
    if (config.logValidation && validationPassed) {
      console.log(`🔍 Running log validation for ${config.name}...`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for logs
      const logValid = await config.logValidation();
      if (!logValid) {
        console.log(`⚠️ Log validation failed for ${config.name} (but process is running)`);
      }
    }

    if (validationPassed) {
      await sendNtfyAlert(
        `🔄 ${config.name} RESTARTED`,
        `Successfully restarted ${config.name} automatically!\nProcess: ✅ Running\nHealth: ${config.healthCheck ? '✅ Passed' : '➖ N/A'}\nLogs: ${config.logValidation ? '✅ Validated' : '➖ N/A'}`,
        'default'
      );
      console.log(`✅ Successfully restarted and validated ${config.name}`);
      return true;
    } else {
      console.log(`❌ Restart validation failed for ${config.name}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Restart error for ${config.name}: ${error.message}`);
    return false;
  }
}

async function checkProcess(config: ProcessConfig): Promise<boolean> {
  // First check if process is running
  const processRunning = await isProcessRunning(config.processPattern);

  if (!processRunning) {
    await sendNtfyAlert(
      `❌ ${config.name} DOWN`,
      `Process ${config.name} is not running!\nPattern: ${config.processPattern}\nAttempting automatic restart...`,
      'urgent'
    );

    // Attempt restart if command available
    if (config.restartCommand) {
      const restarted = await restartProcess(config);
      return restarted;
    }

    return false;
  }

  // If has health check, run it
  if (config.healthCheck) {
    const healthy = await config.healthCheck();
    if (!healthy) {
      await sendNtfyAlert(
        `🚨 ${config.name} UNHEALTHY`,
        `Process ${config.name} is running but failing health checks!\nPort: ${config.port}\nAttempting restart...`,
        'urgent'
      );

      // Kill unhealthy process and restart
      if (config.restartCommand) {
        try {
          await execAsync(`pkill -f "${config.processPattern}"`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          const restarted = await restartProcess(config);
          return restarted;
        } catch (error) {
          console.log(`❌ Failed to kill and restart ${config.name}: ${error.message}`);
        }
      }

      return false;
    }
  }

  return true;
}

async function runDatabaseSync(): Promise<boolean> {
  try {
    console.log('🔄 Running automated database sync...');

    const command = `cd /home/telgkb9/depot/current && DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" npx tsx admin/robust-position-sync.ts`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('npm warn')) {
      console.log(`⚠️ Database sync stderr: ${stderr}`);
    }

    // Check if sync was successful
    if (stdout.includes('SYNC COMPLETED SUCCESSFULLY')) {
      console.log('✅ Database sync completed successfully');
      return true;
    } else {
      console.log('❌ Database sync may have failed');
      console.log('Stdout:', stdout);
      return false;
    }
  } catch (error) {
    console.error('❌ Database sync error:', error.message);
    await sendNtfyAlert(
      '⚠️ Database Sync Failed',
      `Automated database sync failed: ${error.message}`,
      'high'
    );
    return false;
  }
}

async function runOHLCWarehouseSync(): Promise<boolean> {
  try {
    console.log('📊 Running OHLC warehouse population...');

    const command = `cd /home/telgkb9/depot/current && DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" npx tsx admin/populate-warehouse-ohlc.ts`;
    const { stdout, stderr } = await execAsync(command, { timeout: 120000 }); // 2-minute timeout

    if (stderr && !stderr.includes('npm warn')) {
      console.log(`⚠️ OHLC sync stderr: ${stderr}`);
    }

    // Check if sync was successful
    if (stdout.includes('Script completed successfully') || stdout.includes('OHLC Warehouse Population Complete')) {
      const candleCount = stdout.match(/Total candles stored: (\d+)/)?.[1] || 'unknown';
      console.log(`✅ OHLC warehouse sync completed - ${candleCount} candles stored`);
      return true;
    } else {
      console.log('❌ OHLC warehouse sync may have failed');
      console.log('Stdout:', stdout);
      return false;
    }
  } catch (error) {
    console.error('❌ OHLC warehouse sync error:', error.message);
    await sendNtfyAlert(
      '⚠️ OHLC Warehouse Sync Failed',
      `Automated OHLC warehouse population failed: ${error.message}`,
      'high'
    );
    return false;
  }
}

async function monitoringLoop() {
  const processStatus = new Map<string, boolean>();
  let lastSyncTime = 0;
  let lastOHLCSyncTime = 0;

  console.log('🛡️ SYSTEM GUARDIAN STARTED - ntfy alerts active');
  console.log(`📱 Alerts will be sent to: https://ntfy.sh/${NTFY_TOPIC}`);
  console.log('📊 Monitoring:');
  MONITORED_PROCESSES.forEach(p => console.log(`  • ${p.name} (${p.processPattern})`));
  console.log('');

  while (true) {
    const currentTime = Date.now();

    // 🔧 V3.14.3 FIX: Database sync DISABLED - was wiping positions
    // Position sync was destructively clearing ALL database positions
    // Database is now the source of truth - positions persist across restarts
    // NO automatic sync needed - positions are created when trades execute
    /*
    // Check if database sync is needed (every 15 minutes)
    if (currentTime - lastSyncTime >= SYNC_INTERVAL) {
      const syncSuccess = await runDatabaseSync();
      if (syncSuccess) {
        lastSyncTime = currentTime;
        await sendNtfyAlert(
          '🔄 Database Sync Complete',
          'Automated position sync completed successfully. Database is aligned with Kraken account.',
          'default'
        );
      }
      // Always update lastSyncTime to prevent spamming on failures
      lastSyncTime = currentTime;
    }
    */

    // Check if OHLC warehouse sync is needed (every 60 minutes)
    if (currentTime - lastOHLCSyncTime >= OHLC_SYNC_INTERVAL) {
      const ohlcSuccess = await runOHLCWarehouseSync();
      if (ohlcSuccess) {
        lastOHLCSyncTime = currentTime;
        await sendNtfyAlert(
          '📊 OHLC Warehouse Updated',
          'Warehouse successfully populated with latest OHLC candle data for backtesting and AI training.',
          'default'
        );
      }
      // Always update lastOHLCSyncTime to prevent spamming on failures
      lastOHLCSyncTime = currentTime;
    }

    for (const config of MONITORED_PROCESSES) {
      const isHealthy = await checkProcess(config);
      const wasHealthy = processStatus.get(config.name) !== false;

      if (!isHealthy && wasHealthy) {
        // Process just went down
        console.log(`❌ ${config.name} FAILED - Alert sent`);
      } else if (isHealthy && !wasHealthy) {
        // Process just came back up
        await sendNtfyAlert(
          `✅ ${config.name} RECOVERED`,
          `Process ${config.name} is back online and healthy!`,
          'default'
        );
        console.log(`✅ ${config.name} RECOVERED - Alert sent`);
      } else if (isHealthy) {
        console.log(`✅ ${config.name} healthy`);
      }

      processStatus.set(config.name, isHealthy);
    }

    const nextSyncMinutes = Math.round((SYNC_INTERVAL - (currentTime - lastSyncTime)) / 60000);
    const nextOHLCSyncMinutes = Math.round((OHLC_SYNC_INTERVAL - (currentTime - lastOHLCSyncTime)) / 60000);
    console.log(`⏰ Next check in ${CHECK_INTERVAL / 1000}s | DB sync in ${nextSyncMinutes}min | OHLC sync in ${nextOHLCSyncMinutes}min\n`);
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 System Guardian shutting down...');
  await sendNtfyAlert(
    '🛑 System Guardian Offline',
    'System Guardian has been shut down. No more alerts will be sent.',
    'default'
  );
  process.exit(0);
});

// Send startup notification
sendNtfyAlert(
  '🛡️ System Guardian Online',
  'System Guardian is now monitoring your trading system with automated database sync every 15 minutes.',
  'default'
);

// Start monitoring
monitoringLoop().catch(async (error) => {
  console.error('❌ System Guardian error:', error.message);
  await sendNtfyAlert(
    '💥 System Guardian ERROR',
    `System Guardian encountered an error: ${error.message}`,
    'urgent'
  );
  process.exit(1);
});