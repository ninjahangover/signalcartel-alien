#!/usr/bin/env npx tsx
/**
 * CFT SYSTEM GUARDIAN - Process monitoring with ntfy alerts
 * Monitors CFT evaluation system and sends alerts when processes fail
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import chalk from 'chalk';

const execAsync = promisify(exec);

interface ProcessConfig {
  name: string;
  processPattern: string;
  pidFile?: string;
  healthCheck?: () => Promise<boolean>;
  restartCommand?: string;
  logFile?: string;
  critical: boolean;
}

const NTFY_TOPIC = process.env.NTFY_TOPIC || 'cft-evaluation';
const CHECK_INTERVAL = 30000; // 30 seconds
const RESTART_COOLDOWN = 60000; // 1 minute cooldown between restarts

// CFT processes to monitor
const MONITORED_PROCESSES: ProcessConfig[] = [
  {
    name: 'CFT Evaluation Trader',
    processPattern: 'cft-evaluation-trader.ts',
    pidFile: '/tmp/cft-logs/trader.pid',
    logFile: '/tmp/cft-logs/trader.log',
    critical: true,
    restartCommand: 'cd /home/telgkb9/depot/signalcartel-breakout && nohup npx tsx cft-evaluation-trader.ts > /tmp/cft-logs/trader.log 2>&1 &',
    healthCheck: async () => {
      try {
        // Check if trader is generating signals (look for recent log entries)
        const { stdout } = await execAsync('tail -20 /tmp/cft-logs/trader.log | grep -c "System Status\\|Signal\\|Ready" || echo "0"');
        return parseInt(stdout.trim()) > 0;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'ByBit Profit Predator',
    processPattern: 'bybit-profit-predator',
    pidFile: '/tmp/cft-logs/predator.pid',
    logFile: '/tmp/cft-logs/profit-predator.log',
    critical: false,
    restartCommand: 'cd /home/telgkb9/depot/signalcartel-breakout && nohup npx tsx -e "import { ByBitProfitPredator } from \'./src/lib/bybit-profit-predator.js\'; const predator = new ByBitProfitPredator(); predator.startHunting();" > /tmp/cft-logs/profit-predator.log 2>&1 &'
  }
];

class CFTSystemGuardian {
  private lastRestartTime: Map<string, number> = new Map();
  private alertsSent: Map<string, number> = new Map();
  private isRunning: boolean = false;

  constructor() {
    console.log(chalk.cyan('🛡️ CFT SYSTEM GUARDIAN STARTED'));
    console.log(chalk.white(`Monitoring ${MONITORED_PROCESSES.length} CFT processes`));
    console.log(chalk.white(`ntfy topic: ${NTFY_TOPIC}`));
    console.log(chalk.white(`Check interval: ${CHECK_INTERVAL/1000}s`));
  }

  async start() {
    this.isRunning = true;
    await this.sendAlert('🛡️ CFT System Guardian Started', 'CFT evaluation monitoring active');

    // Initial system check
    await this.checkAllProcesses();

    // Start monitoring loop
    setInterval(async () => {
      if (this.isRunning) {
        await this.checkAllProcesses();
      }
    }, CHECK_INTERVAL);

    console.log(chalk.green('✅ CFT System Guardian monitoring active'));
  }

  async checkAllProcesses() {
    for (const process of MONITORED_PROCESSES) {
      await this.checkProcess(process);
    }
  }

  async checkProcess(processConfig: ProcessConfig) {
    try {
      const isRunning = await this.isProcessRunning(processConfig);
      const isHealthy = isRunning && (processConfig.healthCheck ? await processConfig.healthCheck() : true);

      if (!isRunning) {
        console.log(chalk.red(`❌ ${processConfig.name}: Process not running`));
        await this.handleProcessFailure(processConfig, 'Process not running');
      } else if (!isHealthy) {
        console.log(chalk.yellow(`⚠️ ${processConfig.name}: Health check failed`));
        await this.handleProcessFailure(processConfig, 'Health check failed');
      } else {
        // Process is healthy - clear any alerts
        this.alertsSent.delete(processConfig.name);
        console.log(chalk.dim(`✅ ${processConfig.name}: Healthy`));
      }
    } catch (error: any) {
      console.error(chalk.red(`Error checking ${processConfig.name}:`), error.message);
    }
  }

  async isProcessRunning(processConfig: ProcessConfig): Promise<boolean> {
    try {
      // Check if process is running by pattern
      const { stdout } = await execAsync(`pgrep -f "${processConfig.processPattern}" | wc -l`);
      const processCount = parseInt(stdout.trim());

      // Also check PID file if available
      if (processConfig.pidFile) {
        try {
          const { stdout: pidOutput } = await execAsync(`cat ${processConfig.pidFile} 2>/dev/null || echo ""`);
          const pid = pidOutput.trim();
          if (pid) {
            const { stdout: pidCheck } = await execAsync(`kill -0 ${pid} 2>/dev/null && echo "alive" || echo "dead"`);
            return pidCheck.trim() === 'alive';
          }
        } catch {
          // PID file check failed, rely on process pattern
        }
      }

      return processCount > 0;
    } catch {
      return false;
    }
  }

  async handleProcessFailure(processConfig: ProcessConfig, reason: string) {
    const now = Date.now();
    const lastRestart = this.lastRestartTime.get(processConfig.name) || 0;
    const lastAlert = this.alertsSent.get(processConfig.name) || 0;

    // Send alert if we haven't sent one recently
    if (now - lastAlert > 5 * 60 * 1000) { // 5 minutes
      await this.sendAlert(
        `🚨 CFT Process Failed: ${processConfig.name}`,
        `Reason: ${reason}\n${processConfig.critical ? 'CRITICAL PROCESS' : 'Non-critical process'}\nAttempting restart...`
      );
      this.alertsSent.set(processConfig.name, now);
    }

    // Attempt restart if cooldown period has passed
    if (processConfig.restartCommand && (now - lastRestart > RESTART_COOLDOWN)) {
      console.log(chalk.yellow(`🔄 Attempting to restart ${processConfig.name}...`));

      try {
        await execAsync(processConfig.restartCommand);
        this.lastRestartTime.set(processConfig.name, now);

        // Wait a bit and check if restart was successful
        await new Promise(resolve => setTimeout(resolve, 5000));

        const isRunning = await this.isProcessRunning(processConfig);
        if (isRunning) {
          console.log(chalk.green(`✅ ${processConfig.name} restarted successfully`));
          await this.sendAlert(
            `✅ CFT Process Restored: ${processConfig.name}`,
            'Process restarted successfully'
          );
        } else {
          console.log(chalk.red(`❌ Failed to restart ${processConfig.name}`));
          if (processConfig.critical) {
            await this.sendAlert(
              `🚨 CRITICAL: CFT Process Restart Failed`,
              `${processConfig.name} failed to restart. Manual intervention required!`
            );
          }
        }
      } catch (error: any) {
        console.error(chalk.red(`Failed to restart ${processConfig.name}:`), error.message);
      }
    }
  }

  async sendAlert(title: string, message: string) {
    try {
      const priority = title.includes('CRITICAL') ? 5 :
                     title.includes('Failed') ? 4 : 3;

      // Clean title for HTTP header compatibility
      const cleanTitle = title.replace(/[^\w\s\-\.]/g, '').trim();

      await axios.post(`https://ntfy.sh/${NTFY_TOPIC}`, message, {
        headers: {
          'Title': cleanTitle,
          'Priority': priority.toString(),
          'Tags': 'cft,trading,alert'
        }
      });

      console.log(chalk.cyan(`📱 Alert sent: ${cleanTitle}`));
    } catch (error) {
      console.error(chalk.red('Failed to send ntfy alert:'), error);
    }
  }

  async getSystemStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      processes: [] as any[]
    };

    for (const process of MONITORED_PROCESSES) {
      const isRunning = await this.isProcessRunning(process);
      const isHealthy = isRunning && (process.healthCheck ? await process.healthCheck() : true);

      status.processes.push({
        name: process.name,
        running: isRunning,
        healthy: isHealthy,
        critical: process.critical,
        lastRestart: this.lastRestartTime.get(process.name) || null
      });
    }

    return status;
  }

  stop() {
    this.isRunning = false;
    console.log(chalk.yellow('🛑 CFT System Guardian stopped'));
  }
}

// Start guardian if run directly
if (require.main === module) {
  const guardian = new CFTSystemGuardian();
  guardian.start().catch(console.error);

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    guardian.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    guardian.stop();
    process.exit(0);
  });

  // Keep process alive
  setInterval(() => {
    // Health check - do nothing, just keep alive
  }, 30000);
}

export { CFTSystemGuardian };