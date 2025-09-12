import * as fs from 'fs';
import * as path from 'path';

interface TradeMetrics {
  totalTrades: number;
  todayTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  todayPnL: number;
  totalPnL: number;
  biggestWin: number;
  biggestLoss: number;
  avgWin: number;
  avgLoss: number;
}

class LogTradeAnalyzer {
  private logDir = '/tmp/signalcartel-logs';
  
  async analyzeTradesFromLogs(): Promise<TradeMetrics> {
    console.log('🔍 Analyzing trades from SignalCartel logs...');
    
    const metrics: TradeMetrics = {
      totalTrades: 0,
      todayTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      todayPnL: 0,
      totalPnL: 0,
      biggestWin: 0,
      biggestLoss: 0,
      avgWin: 0,
      avgLoss: 0
    };
    
    try {
      // Parse quantum-forge-trades.log for basic trade counts
      const tradeLogPath = path.join(this.logDir, 'quantum-forge-trades.log');
      if (fs.existsSync(tradeLogPath)) {
        const tradeLogContent = fs.readFileSync(tradeLogPath, 'utf8');
        metrics.totalTrades = this.extractTradeCount(tradeLogContent);
        metrics.todayTrades = this.extractTodayTradeCount(tradeLogContent);
        console.log(`📊 Found ${metrics.totalTrades} total trades, ${metrics.todayTrades} today`);
      }
      
      // Parse main production log for P&L patterns
      const prodLogPath = path.join(this.logDir, 'production-trading.log');
      if (fs.existsSync(prodLogPath)) {
        const pnlData = this.analyzePnLFromLog(prodLogPath);
        Object.assign(metrics, pnlData);
        console.log(`💰 P&L Analysis: ${metrics.winningTrades} wins, ${metrics.losingTrades} losses`);
      }
      
      // Calculate win rate
      const totalPnLTrades = metrics.winningTrades + metrics.losingTrades;
      if (totalPnLTrades > 0) {
        metrics.winRate = (metrics.winningTrades / totalPnLTrades) * 100;
      }
      
      // Calculate averages
      if (metrics.winningTrades > 0) {
        metrics.avgWin = metrics.totalPnL > 0 ? metrics.totalPnL / metrics.winningTrades : 0;
      }
      if (metrics.losingTrades > 0) {
        metrics.avgLoss = metrics.totalPnL < 0 ? Math.abs(metrics.totalPnL) / metrics.losingTrades : 0;
      }
      
    } catch (error) {
      console.error('❌ Error analyzing logs:', error.message);
    }
    
    return metrics;
  }
  
  private extractTradeCount(logContent: string): number {
    // Look for patterns like "X new trades generated" or "total: X"
    const tradePatterns = [
      /(\d+)\s+new\s+trades\s+generated/gi,
      /total:\s*(\d+)/gi,
      /(\d+)\s+positions\s+opened/gi
    ];
    
    let maxTrades = 0;
    
    for (const pattern of tradePatterns) {
      const matches = logContent.matchAll(pattern);
      for (const match of matches) {
        const count = parseInt(match[1]);
        if (count > maxTrades) {
          maxTrades = count;
        }
      }
    }
    
    return maxTrades;
  }
  
  private extractTodayTradeCount(logContent: string): number {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayLines = logContent.split('\n').filter(line => line.includes(today));
    
    let todayTrades = 0;
    for (const line of todayLines) {
      const match = line.match(/(\d+)\s+new\s+trades\s+generated/i);
      if (match) {
        todayTrades += parseInt(match[1]);
      }
    }
    
    return todayTrades;
  }
  
  private analyzePnLFromLog(logPath: string): Partial<TradeMetrics> {
    const result: Partial<TradeMetrics> = {
      winningTrades: 0,
      losingTrades: 0,
      totalPnL: 0,
      todayPnL: 0,
      biggestWin: 0,
      biggestLoss: 0
    };
    
    try {
      // Read last 10000 lines for performance (recent trading activity)
      const logContent = fs.readFileSync(logPath, 'utf8');
      const lines = logContent.split('\n').slice(-10000);
      
      const pnlPatterns = [
        /profit[:\s]+[\$]?([+-]?\d+\.?\d*)/gi,
        /loss[:\s]+[\$]?([+-]?\d+\.?\d*)/gi,
        /pnl[:\s]+[\$]?([+-]?\d+\.?\d*)/gi,
        /gain[:\s]+[\$]?([+-]?\d+\.?\d*)/gi,
        /realized[:\s]+[\$]?([+-]?\d+\.?\d*)/gi
      ];
      
      const today = new Date().toISOString().split('T')[0];
      
      for (const line of lines) {
        const isToday = line.includes(today);
        
        for (const pattern of pnlPatterns) {
          const matches = line.matchAll(pattern);
          for (const match of matches) {
            const amount = parseFloat(match[1]);
            if (!isNaN(amount) && Math.abs(amount) > 0.01) { // Filter out tiny amounts
              
              result.totalPnL += amount;
              if (isToday) {
                result.todayPnL += amount;
              }
              
              if (amount > 0) {
                result.winningTrades++;
                if (amount > result.biggestWin) {
                  result.biggestWin = amount;
                }
              } else {
                result.losingTrades++;
                if (Math.abs(amount) > Math.abs(result.biggestLoss)) {
                  result.biggestLoss = amount;
                }
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.log('⚠️ P&L analysis partial:', error.message);
    }
    
    return result;
  }
}

// Create and export the analyzer function
export async function analyzeLogMetrics(): Promise<TradeMetrics> {
  const analyzer = new LogTradeAnalyzer();
  return analyzer.analyzeTradesFromLogs();
}

// For direct execution
if (require.main === module) {
  analyzeLogMetrics().then(metrics => {
    console.log('\n🎯 TRADING METRICS FROM LOGS:');
    console.log('=' .repeat(50));
    console.log(`📊 Total Trades: ${metrics.totalTrades}`);
    console.log(`📈 Today's Trades: ${metrics.todayTrades}`);
    console.log(`🏆 Win Rate: ${metrics.winRate.toFixed(1)}%`);
    console.log(`💰 Total P&L: $${metrics.totalPnL.toFixed(2)}`);
    console.log(`📅 Today's P&L: $${metrics.todayPnL.toFixed(2)}`);
    console.log(`🎯 Biggest Win: $${metrics.biggestWin.toFixed(2)}`);
    console.log(`📉 Biggest Loss: $${metrics.biggestLoss.toFixed(2)}`);
    console.log(`✅ Winning Trades: ${metrics.winningTrades}`);
    console.log(`❌ Losing Trades: ${metrics.losingTrades}`);
  });
}