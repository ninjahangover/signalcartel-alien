#!/usr/bin/env npx tsx

import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const PORT = 3004;

// Simple CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

app.use(express.json());

async function extractRealPnLData() {
  console.log('🔍 Extracting real P&L data from logs...');
  
  const trades = [];
  let totalPnL = 0;
  
  try {
    // Get closed trades with P&L
    const closeCommand = `grep -E "KRAKEN CLOSE ORDER.*P&L:" /tmp/signalcartel-logs/production-trading.log | tail -50`;
    const { stdout } = await execAsync(closeCommand);
    const lines = stdout.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Parse: [timestamp] ✅ KRAKEN CLOSE ORDER: ORDER_ID | SIDE quantity SYMBOL | P&L: $amount
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
          timestamp: new Date(timestamp).toISOString()
        });
        
        totalPnL += pnlAmount;
      }
    }
    
    console.log(`✅ Found ${trades.length} trades with total P&L: $${totalPnL.toFixed(2)}`);
    
  } catch (error) {
    console.log('⚠️ No trading logs found:', error.message);
  }
  
  // Calculate stats
  const winningTrades = trades.filter(t => t.pnl > 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  
  const today = new Date().toDateString();
  const todayTrades = trades.filter(t => 
    new Date(t.timestamp).toDateString() === today
  ).length;
  
  return {
    totalPnL,
    trades: trades.slice(0, 20), // Last 20 trades
    stats: {
      totalTrades: trades.length,
      winRate,
      todayTrades,
      biggestWin: trades.length > 0 ? Math.max(...trades.map(t => t.pnl)) : 0,
      biggestLoss: trades.length > 0 ? Math.min(...trades.map(t => t.pnl)) : 0
    }
  };
}

// Main API endpoint
app.get('/api/live-pnl', async (req, res) => {
  try {
    console.log('📊 API Request received...');
    const data = await extractRealPnLData();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: data
    });
    
    console.log(`✅ API Response sent: $${data.totalPnL.toFixed(2)} total P&L`);
    
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        totalPnL: 0,
        trades: [],
        stats: { totalTrades: 0, winRate: 0, todayTrades: 0, biggestWin: 0, biggestLoss: 0 }
      }
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

// Test endpoint to verify API is working
app.get('/test', async (req, res) => {
  try {
    const data = await extractRealPnLData();
    res.json({
      message: "✅ API is working!",
      data: {
        totalPnL: data.totalPnL,
        totalTrades: data.stats.totalTrades,
        recentTrades: data.trades.slice(0, 5)
      }
    });
  } catch (error) {
    res.json({
      message: "⚠️ API working but no trade data",
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log('🚀 ====== SIMPLE P&L API SERVER ======');
  console.log(`📊 Server: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api/live-pnl`);
  console.log(`🧪 Test: http://localhost:${PORT}/test`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log('✅ Ready to serve real P&L data!');
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down...');
  process.exit(0);
});