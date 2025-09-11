#!/usr/bin/env npx tsx

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const PORT = 3004; // Different port to avoid conflicts

// Enable CORS for dashboard integration
app.use(cors());
app.use(express.json());

// Handle CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }
  
  next();
});

interface TradeData {
  orderId: string;
  symbol: string;
  side: string;
  quantity: number;
  pnl: number;
  timestamp: string;
  type: 'close' | 'open';
}

async function extractLivePnLData(): Promise<{
  totalPnL: number;
  trades: TradeData[];
  stats: {
    totalTrades: number;
    closedTrades: number;
    winRate: number;
    todayTrades: number;
    biggestWin: number;
    biggestLoss: number;
    profitableSymbols: string[];
  };
  positions: any[];
}> {
  console.log('🔍 Extracting live P&L data...');
  
  const trades: TradeData[] = [];
  let totalPnL = 0;
  
  try {
    // Extract closed trades with P&L from recent logs
    const closeCommand = `grep -E "KRAKEN CLOSE ORDER.*P&L:" /tmp/signalcartel-logs/production-trading.log | tail -100`;
    
    try {
      const { stdout: closeStdout } = await execAsync(closeCommand);
      const closeLines = closeStdout.split('\n').filter(line => line.trim());
      
      for (const line of closeLines) {
        // Parse: [2025-09-11T06:33:57.895Z] ✅ KRAKEN CLOSE ORDER: O6AOEQ-RLQZF-NLNHD6 | SELL 0.00043756054744075216 BTCUSD | P&L: $0.03
        const match = line.match(/\[([^\]]+)\].*KRAKEN CLOSE ORDER: (\S+) \| (\w+) ([\d.]+) (\w+) \| P&L: \$([+-]?[\d.]+)/);
        if (match) {
          const [, timestamp, orderId, side, quantity, symbol, pnl] = match;
          const pnlAmount = parseFloat(pnl);
          
          trades.push({
            orderId,
            symbol,
            side,
            quantity: parseFloat(quantity),
            pnl: pnlAmount,
            timestamp: new Date(timestamp).toISOString(),
            type: 'close'
          });
          
          totalPnL += pnlAmount;
        }
      }
    } catch (error) {
      console.log('⚠️ No close order logs found');
    }
    
    // Extract recent entry orders
    const openCommand = `grep -E "KRAKEN ORDER CONFIRMED.*LONG|SHORT" /tmp/signalcartel-logs/production-trading.log | tail -50`;
    
    try {
      const { stdout: openStdout } = await execAsync(openCommand);
      const openLines = openStdout.split('\n').filter(line => line.trim());
      
      for (const line of openLines) {
        // Parse: [2025-09-11T06:33:57.895Z] ✅ KRAKEN ORDER CONFIRMED: OTOIPF-Q6YQ5-5D3WXE | LONG 0.000438 BTCUSD
        const match = line.match(/\[([^\]]+)\].*KRAKEN ORDER CONFIRMED: (\S+) \| (\w+) ([\d.]+) (\w+)/);
        if (match) {
          const [, timestamp, orderId, direction, quantity, symbol] = match;
          
          trades.push({
            orderId,
            symbol,
            side: direction === 'LONG' ? 'BUY' : 'SELL',
            quantity: parseFloat(quantity),
            pnl: 0,
            timestamp: new Date(timestamp).toISOString(),
            type: 'open'
          });
        }
      }
    } catch (error) {
      console.log('⚠️ No entry order logs found');
    }
    
  } catch (error) {
    console.error('❌ Error extracting P&L data:', error);
  }
  
  // Calculate statistics
  const closedTrades = trades.filter(t => t.type === 'close');
  const winningTrades = closedTrades.filter(t => t.pnl > 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  
  const today = new Date().toDateString();
  const todayTrades = trades.filter(trade => 
    new Date(trade.timestamp).toDateString() === today
  ).length;
  
  const pnlValues = closedTrades.map(t => t.pnl);
  const biggestWin = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
  const biggestLoss = pnlValues.length > 0 ? Math.min(...pnlValues) : 0;
  
  // Calculate profitable symbols
  const symbolPnL: { [key: string]: number } = {};
  closedTrades.forEach(trade => {
    symbolPnL[trade.symbol] = (symbolPnL[trade.symbol] || 0) + trade.pnl;
  });
  const profitableSymbols = Object.entries(symbolPnL)
    .filter(([, pnl]) => pnl > 0)
    .map(([symbol]) => symbol);
  
  // Mock current positions (you'd get these from Kraken API in real implementation)
  const positions: any[] = [];
  
  return {
    totalPnL,
    trades: trades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50),
    stats: {
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      winRate,
      todayTrades,
      biggestWin,
      biggestLoss,
      profitableSymbols
    },
    positions
  };
}

// Main API endpoint for dashboard
app.get('/api/live-pnl', async (req, res) => {
  try {
    console.log('📊 API Request: Fetching live P&L data...');
    
    const data = await extractLivePnLData();
    
    console.log(`✅ API Response: Total P&L: $${data.totalPnL.toFixed(2)}, ${data.trades.length} trades, Win Rate: ${data.stats.winRate.toFixed(1)}%`);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        totalPnL: data.totalPnL,
        trades: data.trades,
        positions: data.positions,
        stats: {
          totalTrades: data.stats.totalTrades,
          closedTrades: data.stats.closedTrades,
          winRate: data.stats.winRate,
          todayTrades: data.stats.todayTrades,
          biggestWin: data.stats.biggestWin,
          biggestLoss: data.stats.biggestLoss,
          profitableSymbols: data.stats.profitableSymbols
        }
      }
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        totalPnL: 0,
        trades: [],
        positions: [],
        stats: {
          totalTrades: 0,
          closedTrades: 0,
          winRate: 0,
          todayTrades: 0,
          biggestWin: 0,
          biggestLoss: 0,
          profitableSymbols: []
        }
      }
    });
  }
});

// Enhanced summary endpoint
app.get('/api/trading-summary', async (req, res) => {
  try {
    const data = await extractLivePnLData();
    
    // Calculate symbol-specific performance
    const symbolStats: { [key: string]: { pnl: number, trades: number, winRate: number } } = {};
    
    const closedTrades = data.trades.filter(t => t.type === 'close');
    closedTrades.forEach(trade => {
      if (!symbolStats[trade.symbol]) {
        symbolStats[trade.symbol] = { pnl: 0, trades: 0, winRate: 0 };
      }
      symbolStats[trade.symbol].pnl += trade.pnl;
      symbolStats[trade.symbol].trades += 1;
    });
    
    // Calculate win rates for each symbol
    Object.keys(symbolStats).forEach(symbol => {
      const symbolTrades = closedTrades.filter(t => t.symbol === symbol);
      const winningTrades = symbolTrades.filter(t => t.pnl > 0);
      symbolStats[symbol].winRate = symbolTrades.length > 0 ? (winningTrades.length / symbolTrades.length) * 100 : 0;
    });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        overallPerformance: {
          totalPnL: data.totalPnL,
          totalTrades: data.stats.totalTrades,
          winRate: data.stats.winRate,
          profitFactor: data.stats.biggestWin / Math.abs(data.stats.biggestLoss) || 0
        },
        symbolPerformance: Object.entries(symbolStats)
          .sort(([,a], [,b]) => b.pnl - a.pnl)
          .map(([symbol, stats]) => ({
            symbol,
            pnl: stats.pnl,
            trades: stats.trades,
            winRate: stats.winRate,
            avgPnL: stats.pnl / stats.trades
          })),
        recentActivity: data.trades.slice(0, 10)
      }
    });
    
  } catch (error) {
    console.error('❌ Summary API Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'live-pnl-api-server'
  });
});

// Handle CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }
  
  next();
});

app.listen(PORT, () => {
  console.log('🚀 ====== LIVE P&L API SERVER ======');
  console.log(`📊 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Main API: http://localhost:${PORT}/api/live-pnl`);
  console.log(`📈 Summary API: http://localhost:${PORT}/api/trading-summary`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📋 Integration Instructions:');
  console.log('   1. Add this API to your existing dashboard on port 3001');
  console.log('   2. Replace fake data with calls to /api/live-pnl');
  console.log('   3. Real P&L data will be served from actual trading logs');
  console.log('✅ Ready to serve real P&L data!');
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Live P&L API server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down Live P&L API server...');
  process.exit(0);
});