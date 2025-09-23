#!/usr/bin/env npx tsx
/**
 * CFT SYSTEM GUARDIAN - Process monitoring with ntfy alerts
 * Monitors critical CFT processes and sends alerts when they fail
 * Based on SignalCartel main system guardian but adapted for CFT evaluation
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

const NTFY_TOPIC = process.env.NTFY_TOPIC || 'cft-evaluation';
const CHECK_INTERVAL = 30000; // 30 seconds
const PERFORMANCE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// CFT Processes to monitor - adapted from tensor-start.sh for CFT system
const MONITORED_PROCESSES: ProcessConfig[] = [
  {
    name: 'CFT Enhanced Trading System',
    processPattern: 'cft-production-trading-enhanced.ts',
    restartCommand: 'nohup env CFT_MODE=true DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" NTFY_TOPIC="cft-evaluation" NODE_OPTIONS="--max-old-space-size=4096" TRADING_MODE="CFT_EVALUATION" npx tsx cft-production-trading-enhanced.ts > /tmp/cft-logs/cft-production-enhanced.log 2>&1 &',
    logValidation: async () => {
      try {
        const logContent = await import('fs').then(fs => fs.promises.readFile('/tmp/cft-logs/cft-production-enhanced.log', 'utf8'));
        const hasInit = logContent.includes('CFT Enhanced Trading System') || logContent.includes('ByBit Dual Client Initialized');
        const hasRecentActivity = logContent.includes('Phase 1:') &&
                                 logContent.includes('Phase 2:') &&
                                 logContent.includes('Profit Predator:');
        return hasInit && hasRecentActivity;
      } catch {
        return false;
      }
    }
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
        'Tags': 'warning,cft,trading'
      }
    });
    console.log(`🚨 CFT ALERT SENT: ${title}`);
  } catch (error) {
    console.error('❌ Failed to send CFT ntfy alert:', error.message);
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
    const command = `cd /home/telgkb9/depot/signalcartel-breakout && ${config.restartCommand}`;
    await execAsync(command);

    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 10000));

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
      `CFT Process ${config.name} is not running!\nPattern: ${config.processPattern}\nAttempting automatic restart...`,
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
        `CFT Process ${config.name} is running but failing health checks!\nPort: ${config.port}\nAttempting restart...`,
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

async function runCFTPerformanceCheck(): Promise<boolean> {
  try {
    console.log('📊 Running CFT performance and compliance check...');

    const logContent = await import('fs').then(fs => fs.promises.readFile('/tmp/cft-logs/cft-production-enhanced.log', 'utf8'));

    // Check for compliance violations
    const hasComplianceViolations = logContent.includes('COMPLIANCE VIOLATION') ||
                                   logContent.includes('RISK LIMIT EXCEEDED') ||
                                   logContent.includes('DAILY LOSS LIMIT');

    // Check for AI system performance
    const hasAIErrors = logContent.includes('Phase 1:') &&
                       logContent.includes('Phase 2:') &&
                       logContent.includes('Phase 3:') &&
                       logContent.includes('Phase 4:') &&
                       logContent.includes('Phase 5:') &&
                       logContent.includes('Phase 6:');

    // Check for Profit Predator activity
    const hasProfitPredatorActivity = logContent.includes('Profit Predator: Scanning for opportunities');

    if (hasComplianceViolations) {
      await sendNtfyAlert(
        '🚨 CFT COMPLIANCE ALERT',
        'CFT system has detected compliance violations! Check logs immediately.',
        'urgent'
      );
      return false;
    }

    if (!hasAIErrors) {
      await sendNtfyAlert(
        '⚠️ CFT AI SYSTEM ISSUES',
        'CFT AI systems may not be functioning properly - missing phase logs.',
        'high'
      );
      return false;
    }

    if (!hasProfitPredatorActivity) {
      console.log('ℹ️ Profit Predator activity not detected (may be normal during low volatility)');
    }

    console.log('✅ CFT performance check completed successfully');
    return true;

  } catch (error) {
    console.error('❌ CFT performance check error:', error.message);
    await sendNtfyAlert(
      '⚠️ CFT Performance Check Failed',
      `CFT performance monitoring failed: ${error.message}`,
      'high'
    );
    return false;
  }
}

async function monitoringLoop() {
  const processStatus = new Map<string, boolean>();
  let lastPerformanceCheck = 0;

  console.log('🛡️ CFT SYSTEM GUARDIAN STARTED - ntfy alerts active');
  console.log(`📱 CFT Alerts will be sent to: https://ntfy.sh/${NTFY_TOPIC}`);
  console.log('📊 Monitoring CFT Processes:');
  MONITORED_PROCESSES.forEach(p => console.log(`  • ${p.name} (${p.processPattern})`));
  console.log('📊 Enhanced monitoring: Compliance, AI systems, Performance');
  console.log('');

  while (true) {
    // Check if performance check is needed (every 5 minutes)
    const currentTime = Date.now();
    if (currentTime - lastPerformanceCheck >= PERFORMANCE_CHECK_INTERVAL) {
      const performanceOK = await runCFTPerformanceCheck();
      if (performanceOK) {
        lastPerformanceCheck = currentTime;
      }
      // Always update lastPerformanceCheck to prevent spamming on failures
      lastPerformanceCheck = currentTime;
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
          `CFT Process ${config.name} is back online and healthy!`,
          'default'
        );
        console.log(`✅ ${config.name} RECOVERED - Alert sent`);
      } else if (isHealthy) {
        console.log(`✅ ${config.name} healthy`);
      }

      processStatus.set(config.name, isHealthy);
    }

    const nextPerformanceMinutes = Math.round((PERFORMANCE_CHECK_INTERVAL - (currentTime - lastPerformanceCheck)) / 60000);
    console.log(`⏰ Next CFT check in ${CHECK_INTERVAL / 1000}s | Next performance check in ${nextPerformanceMinutes}min\n`);
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 CFT System Guardian shutting down...');
  await sendNtfyAlert(
    '🛑 CFT System Guardian Offline',
    'CFT System Guardian has been shut down. No more CFT alerts will be sent.',
    'default'
  );
  process.exit(0);
});

// Send startup notification
sendNtfyAlert(
  '🛡️ CFT System Guardian Online',
  'CFT System Guardian is now monitoring your CFT evaluation trading system.',
  'default'
);

// Start monitoring
monitoringLoop().catch(async (error) => {
  console.error('❌ CFT System Guardian error:', error.message);
  await sendNtfyAlert(
    '💥 CFT System Guardian ERROR',
    `CFT System Guardian encountered an error: ${error.message}`,
    'urgent'
  );
  process.exit(1);
});