/**
 * PRICE LOGGING UTILITY
 * Dedicated logger for price fetching to reduce noise in main trading logs
 */

import fs from 'fs';
import path from 'path';

class PriceLogger {
  private static instance: PriceLogger;
  private logPath: string;

  private constructor() {
    this.logPath = '/tmp/signalcartel-logs/price-fetching.log';
    this.ensureLogDirectory();
  }

  static getInstance(): PriceLogger {
    if (!this.instance) {
      this.instance = new PriceLogger();
    }
    return this.instance;
  }

  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private writeLog(level: string, message: string): void {
    const timestamp = this.formatTimestamp();
    const logEntry = `[${timestamp}] ${level}: ${message}\n`;

    try {
      fs.appendFileSync(this.logPath, logEntry);
    } catch (error) {
      // Fallback to console if file logging fails
      console.log(`${level}: ${message}`);
    }
  }

  info(message: string): void {
    this.writeLog('INFO', message);
  }

  success(message: string): void {
    this.writeLog('SUCCESS', message);
  }

  warn(message: string): void {
    this.writeLog('WARN', message);
  }

  error(message: string): void {
    this.writeLog('ERROR', message);
  }

  // For backwards compatibility, also log to console for critical errors
  critical(message: string): void {
    this.writeLog('CRITICAL', message);
    console.error(`⚠️ PRICE: ${message}`);
  }
}

export const priceLogger = PriceLogger.getInstance();