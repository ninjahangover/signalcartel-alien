#!/usr/bin/env npx tsx
/**
 * SMART PROFIT HUNTER BACKGROUND SERVICE
 * Runs continuously and logs profitable opportunities to file for main trading engine
 */

import { smartProfitHunter } from './src/lib/smart-profit-hunter';
import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = '/tmp/signalcartel-logs';
const PROFIT_PREDATOR_LOG = path.join(LOG_DIR, 'profit-predator.log');
const OPPORTUNITIES_FILE = path.join(LOG_DIR, 'smart-hunter-opportunities.json');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  console.log(`[HUNTER] ${message}`);
  fs.appendFileSync(PROFIT_PREDATOR_LOG, logEntry);
}

async function runSmartHunter() {
  log('🧠 Smart Profit Hunter Service started');
  log('📁 Logging to: ' + PROFIT_PREDATOR_LOG);
  log('💾 Opportunities file: ' + OPPORTUNITIES_FILE);
  log('');
  
  while (true) {
    try {
      const startTime = Date.now();
      log('🔍 Scanning for profitable opportunities...');
      
      const opportunities = await smartProfitHunter.findProfitableOpportunities();
      
      const duration = Date.now() - startTime;
      log(`⚡ Scan completed in ${duration}ms`);
      log(`🎯 Found ${opportunities.length} opportunities`);
      
      if (opportunities.length > 0) {
        // Log top opportunities
        log('🚀 TOP OPPORTUNITIES:');
        opportunities.slice(0, 8).forEach((opp, i) => {
          log(`   ${i + 1}. ${opp.symbol}: ${opp.score.toFixed(1)}% (${opp.source}) - ${opp.reasons[0]}`);
        });
        
        // Save to file for main trading engine
        const opportunityData = {
          timestamp: new Date().toISOString(),
          scanDuration: duration,
          opportunities: opportunities,
          topOpportunities: opportunities.slice(0, 10),
          highUrgency: opportunities.filter(opp => opp.score >= 85),
          mediumUrgency: opportunities.filter(opp => opp.score >= 75 && opp.score < 85)
        };
        
        fs.writeFileSync(OPPORTUNITIES_FILE, JSON.stringify(opportunityData, null, 2));
        log(`💾 Saved ${opportunities.length} opportunities to file`);
        
        // Log urgent opportunities
        const urgentOpps = opportunities.filter(opp => opp.score >= 80);
        if (urgentOpps.length > 0) {
          log(`🚨 ${urgentOpps.length} HIGH-PRIORITY OPPORTUNITIES:`);
          urgentOpps.forEach(opp => {
            log(`   🔥 ${opp.symbol}: ${opp.score.toFixed(1)}% score, ${(opp.confidence * 100).toFixed(1)}% confidence`);
            if (opp.metrics.priceChange24h) {
              log(`      📊 24h change: ${opp.metrics.priceChange24h.toFixed(2)}%`);
            }
            if (opp.metrics.volume24h) {
              log(`      💰 Volume: $${formatNumber(opp.metrics.volume24h)}`);
            }
          });
        }
        
      } else {
        log('📊 No profitable opportunities detected this scan');
      }
      
      log('');
      log('⏱️  Next scan in 60 seconds...');
      log('');
      
      // Wait 60 seconds before next scan
      await new Promise(resolve => setTimeout(resolve, 60000));
      
    } catch (error) {
      log(`❌ Smart Hunter error: ${error.message}`);
      // Wait longer on errors
      await new Promise(resolve => setTimeout(resolve, 120000));
    }
  }
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('🛑 Smart Hunter Service shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('🛑 Smart Hunter Service shutting down...');
  process.exit(0);
});

// Start the service
runSmartHunter().catch(error => {
  console.error('💥 Fatal error in Smart Hunter Service:', error);
  process.exit(1);
});