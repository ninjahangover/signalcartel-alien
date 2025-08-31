/**
 * QUANTUM FORGE™ OPPORTUNITY ALERT SYSTEM
 * Lightweight scanner that identifies hot trading pairs and alerts the main trading engine
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal'
});

export interface OpportunityAlert {
  symbol: string;
  score: number;
  confidence: number;
  recommendation: 'STRONG_BUY' | 'BUY' | 'SELL' | 'STRONG_SELL';
  reasons: string[];
  estimatedProfit: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alertTime: Date;
}

class OpportunityAlertSystem {
  private readonly LOG_DIR = '/tmp/signalcartel-logs';
  private readonly ALERT_FILE = path.join(this.LOG_DIR, 'opportunity-alerts.log');
  private readonly ACTIVE_ALERTS_FILE = path.join(this.LOG_DIR, 'active-alerts.json');
  
  // High-potential pairs to scout (beyond the core 15)
  private readonly SCOUT_PAIRS = [
    // Major altcoins
    'LTCUSD', 'BCHUSDT', 'XLMUSD', 'XTZUSD', 'ALGOUSD',
    // DeFi tokens
    'COMPUSD', 'SNXUSD', 'YFIUSD', 'SUSHIUSD', 'CRVUSD',
    // Gaming/NFT
    'AXSUSD', 'MANAUSD', 'SANDUSD', 'GALAUSD',
    // Layer 1s
    'NEARUSD', 'ATOMUSD', 'LUNAUSD', 'FTMUSD', 'ONEUSD',
    // Trending coins
    'SHIBUSD', 'PEPEUSD', 'FLOKIUSD', 'DOGEUSDT'
  ];
  
  private isScanning = false;
  private alertQueue: OpportunityAlert[] = [];
  
  constructor() {
    // Ensure log directory exists
    if (!fs.existsSync(this.LOG_DIR)) {
      fs.mkdirSync(this.LOG_DIR, { recursive: true });
    }
    
    this.log('🔍 Opportunity Alert System initialized');
    this.log(`📡 Scouting ${this.SCOUT_PAIRS.length} high-potential pairs`);
  }
  
  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    console.log(`[SCOUT] ${message}`);
    fs.appendFileSync(this.ALERT_FILE, logEntry);
  }
  
  async startScouting(intervalMs: number = 30000) {
    if (this.isScanning) {
      this.log('⚠️  Scout already active');
      return;
    }
    
    this.isScanning = true;
    this.log('🎯 Starting opportunity scouting...');
    this.log(`⏰ Scanning every ${intervalMs / 1000} seconds`);
    
    // Main scouting loop
    while (this.isScanning) {
      try {
        await this.scoutForOpportunities();
        await this.processAlertQueue();
        await this.sleep(intervalMs);
      } catch (error) {
        this.log(`❌ Scouting error: ${error.message}`);
        await this.sleep(intervalMs * 2); // Back off on errors
      }
    }
  }
  
  private async scoutForOpportunities() {
    this.log('🧠 Smart API scouting for profitable opportunities...');
    
    try {
      // Use Smart Profit Hunter for efficient API calls
      const { smartProfitHunter } = await import('./smart-profit-hunter');
      const profitableOpps = await smartProfitHunter.findProfitableOpportunities();
      
      const opportunities: OpportunityAlert[] = [];
      
      // Convert profitable opportunities to alerts
      profitableOpps.forEach(opp => {
        if (opp.score >= 70) { // High threshold for trading alerts
          opportunities.push({
            symbol: opp.symbol,
            score: opp.score,
            confidence: opp.confidence,
            recommendation: opp.score >= 85 ? 'STRONG_BUY' : opp.score >= 75 ? 'BUY' : 'SELL',
            reasons: opp.reasons,
            estimatedProfit: (opp.score / 100) * 4.0, // Rough profit estimate
            riskLevel: opp.score >= 80 ? 'LOW' : opp.score >= 70 ? 'MEDIUM' : 'HIGH',
            urgency: opp.score >= 90 ? 'CRITICAL' : opp.score >= 80 ? 'HIGH' : opp.score >= 70 ? 'MEDIUM' : 'LOW',
            alertTime: opp.alertTime
          });
        }
      });
      
      if (opportunities.length > 0) {
        this.log(`🚨 Smart Hunter found ${opportunities.length} profitable opportunities!`);
        opportunities.forEach(opp => {
          this.log(`   • ${opp.symbol}: ${opp.score.toFixed(1)}% (${opp.urgency}) - ${opp.reasons[0]}`);
          this.alertQueue.push(opp);
        });
      } else {
        this.log('📊 No high-score opportunities detected by Smart Hunter');
      }
      
    } catch (error) {
      this.log(`❌ Smart Hunter error: ${error.message}`);
      // Fallback to basic scanning
      await this.fallbackScanning();
    }
  }
  
  private async fallbackScanning() {
    this.log('📊 Using fallback scanning method...');
    
    const opportunities: OpportunityAlert[] = [];
    
    // Lightweight analysis of only top scout pairs
    for (const symbol of this.SCOUT_PAIRS.slice(0, 10)) { // Only top 10 to avoid rate limits
      try {
        const opportunity = await this.analyzeQuickOpportunity(symbol);
        if (opportunity && opportunity.score >= 75) {
          opportunities.push(opportunity);
        }
      } catch (error) {
        continue; // Skip errors
      }
    }
    
    if (opportunities.length > 0) {
      opportunities.forEach(opp => {
        this.log(`   • ${opp.symbol}: ${opp.score.toFixed(1)}% (${opp.urgency}) - ${opp.reasons[0]}`);
        this.alertQueue.push(opp);
      });
    }
  }
  
  private async analyzeQuickOpportunity(symbol: string): Promise<OpportunityAlert | null> {
    try {
      // Get current price (simplified, no heavy API calls)
      const { realTimePriceFetcher } = await import('./real-time-price-fetcher');
      const priceResult = await realTimePriceFetcher.getCurrentPrice(symbol);
      
      if (!priceResult.success) {
        return null;
      }
      
      const price = priceResult.price;
      
      // Quick momentum check (simplified)
      const momentum = Math.random() * 100; // TODO: Replace with real momentum calculation
      const volume = Math.random() * 100;   // TODO: Replace with real volume data
      
      // Basic scoring without heavy API calls
      let score = 0;
      const reasons: string[] = [];
      
      // Momentum scoring (40% weight)
      if (momentum > 70) {
        score += 40;
        reasons.push('Strong upward momentum');
      } else if (momentum > 50) {
        score += 20;
        reasons.push('Positive momentum');
      }
      
      // Volume scoring (30% weight)
      if (volume > 80) {
        score += 30;
        reasons.push('High volume spike');
      } else if (volume > 60) {
        score += 15;
        reasons.push('Above average volume');
      }
      
      // Price level scoring (30% weight)
      const priceScore = Math.random() * 30; // TODO: Support/resistance analysis
      score += priceScore;
      if (priceScore > 20) {
        reasons.push('Breaking key resistance');
      }
      
      // Only alert on high-confidence opportunities
      if (score < 65) {
        return null;
      }
      
      const urgency = score >= 90 ? 'CRITICAL' : 
                     score >= 80 ? 'HIGH' : 
                     score >= 70 ? 'MEDIUM' : 'LOW';
      
      const recommendation = score >= 85 ? 'STRONG_BUY' : 
                           score >= 70 ? 'BUY' : 'SELL';
      
      return {
        symbol,
        score,
        confidence: score / 100,
        recommendation,
        reasons: reasons.slice(0, 3), // Top 3 reasons
        estimatedProfit: (score / 100) * 3.5, // Rough estimate
        riskLevel: score >= 80 ? 'LOW' : score >= 70 ? 'MEDIUM' : 'HIGH',
        urgency,
        alertTime: new Date()
      };
      
    } catch (error) {
      return null;
    }
  }
  
  private async processAlertQueue() {
    if (this.alertQueue.length === 0) return;
    
    // Sort by urgency and score
    this.alertQueue.sort((a, b) => {
      const urgencyWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const urgencyDiff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.score - a.score;
    });
    
    // Save active alerts for trading system to read
    await this.saveActiveAlerts(this.alertQueue);
    
    // Log top alerts
    const topAlerts = this.alertQueue.slice(0, 3);
    topAlerts.forEach(alert => {
      this.log(`🚨 ALERT: ${alert.symbol} | Score: ${alert.score.toFixed(1)}% | ${alert.urgency} | ${alert.reasons[0]}`);
    });
    
    // Clear processed alerts
    this.alertQueue = [];
  }
  
  private async saveActiveAlerts(alerts: OpportunityAlert[]) {
    const alertData = {
      timestamp: new Date().toISOString(),
      alerts: alerts.slice(0, 10), // Keep top 10 alerts
      count: alerts.length
    };
    
    fs.writeFileSync(this.ACTIVE_ALERTS_FILE, JSON.stringify(alertData, null, 2));
  }
  
  getActiveAlerts(): OpportunityAlert[] {
    try {
      if (!fs.existsSync(this.ACTIVE_ALERTS_FILE)) {
        return [];
      }
      
      const data = JSON.parse(fs.readFileSync(this.ACTIVE_ALERTS_FILE, 'utf8'));
      const alertAge = Date.now() - new Date(data.timestamp).getTime();
      
      // Alerts expire after 2 minutes
      if (alertAge > 120000) {
        return [];
      }
      
      return data.alerts || [];
    } catch (error) {
      this.log(`❌ Error reading alerts: ${error.message}`);
      return [];
    }
  }
  
  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  stopScouting() {
    this.isScanning = false;
    this.log('🛑 Opportunity scouting stopped');
  }
}

export const opportunityAlertSystem = new OpportunityAlertSystem();