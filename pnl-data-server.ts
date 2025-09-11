#!/usr/bin/env npx tsx

import express from 'express';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = 3005;

// Serve static files
app.use(express.static(path.join(__dirname)));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

interface TradeData {
  time: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  pnl: number;
  status: string;
}

interface PositionData {
  symbol: string;
  side: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  status: string;
}

interface PnLSummary {
  totalPnL: number;
  trades: TradeData[];
  positions: PositionData[];
  stats: {
    todayTrades: number;
    winRate: number;
  };
}

async function extractPnLFromLogs(): Promise<{ trades: TradeData[], totalPnL: number }> {
  const trades: TradeData[] = [];
  let totalPnL = 0;

  try {
    // Read recent trading logs to extract P&L data
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    // Extract P&L data from recent logs
    const logCommand = `grep -E "KRAKEN CLOSE ORDER.*P&L:" /tmp/signalcartel-logs/production-trading.log | tail -50`;
    
    try {
      const { stdout } = await execAsync(logCommand);
      const lines = stdout.split('\n').filter((line: string) => line.trim());

      for (const line of lines) {
        // Parse: ✅ KRAKEN CLOSE ORDER: OXDIC5-7GROX-I4IQLJ | BUY 0.1541538461538462 BNBUSDT | P&L: $-37.80
        const match = line.match(/KRAKEN CLOSE ORDER: (\S+) \| (\w+) ([\d.]+) (\w+) \| P&L: \$([+-]?[\d.]+)/);
        if (match) {
          const [, orderId, side, quantity, symbol, pnl] = match;
          const pnlAmount = parseFloat(pnl);
          
          trades.push({
            time: new Date().toISOString(), // Approximate time
            symbol: symbol,
            side: side,
            quantity: parseFloat(quantity),
            price: 0, // Not available in close logs
            pnl: pnlAmount,
            status: 'closed'
          });

          totalPnL += pnlAmount;
        }
      }
    } catch (error) {
      console.log('No trading logs found, this might be expected');
    }

    // Also try to extract from recent order confirmations
    const orderCommand = `grep -E "KRAKEN ORDER CONFIRMED.*LONG|SHORT" /tmp/signalcartel-logs/production-trading.log | tail -20`;
    
    try {
      const { stdout } = await execAsync(orderCommand);
      const orderLines = stdout.split('\n').filter((line: string) => line.trim());

      for (const line of orderLines) {
        // Parse: ✅ KRAKEN ORDER CONFIRMED: OTOIPF-Q6YQ5-5D3WXE | LONG 0.000438 BTCUSD
        const match = line.match(/KRAKEN ORDER CONFIRMED: (\S+) \| (\w+) ([\d.]+) (\w+)/);
        if (match) {
          const [, orderId, side, quantity, symbol] = match;
          
          // These are entry orders, so P&L is 0 initially
          trades.push({
            time: new Date().toISOString(),
            symbol: symbol,
            side: side,
            quantity: parseFloat(quantity),
            price: 0,
            pnl: 0,
            status: 'open'
          });
        }
      }
    } catch (error) {
      console.log('No order logs found');
    }

  } catch (error) {
    console.error('Error extracting P&L from logs:', error);
  }

  return { trades, totalPnL };
}

async function getCurrentPositions(): Promise<PositionData[]> {
  try {
    // Get current positions from database
    const positions = await prisma.managedPosition.findMany({
      where: { status: 'open' },
      select: {
        symbol: true,
        side: true,
        quantity: true,
        entryPrice: true,
        updatedAt: true
      }
    });

    return positions.map(pos => ({
      symbol: pos.symbol,
      side: pos.side,
      quantity: pos.quantity,
      entryPrice: pos.entryPrice,
      currentPrice: pos.entryPrice, // TODO: Get real current price
      unrealizedPnL: 0, // TODO: Calculate based on current price
      status: 'open'
    }));
  } catch (error) {
    console.error('Error getting positions:', error);
    return [];
  }
}

app.get('/api/pnl-data', async (req, res) => {
  try {
    console.log('📊 Fetching P&L data...');
    
    // Extract trading data from logs and database
    const { trades, totalPnL } = await extractPnLFromLogs();
    const positions = await getCurrentPositions();

    // Calculate stats
    const today = new Date().toDateString();
    const todayTrades = trades.filter(trade => 
      new Date(trade.time).toDateString() === today
    ).length;

    const closedTrades = trades.filter(trade => trade.status === 'closed');
    const winningTrades = closedTrades.filter(trade => trade.pnl > 0);
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

    const response: PnLSummary = {
      totalPnL,
      trades: trades.slice(-20), // Last 20 trades
      positions,
      stats: {
        todayTrades,
        winRate
      }
    };

    console.log(`✅ P&L Summary: Total ${totalPnL.toFixed(2)}, ${trades.length} trades, ${positions.length} positions`);
    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching P&L data:', error);
    res.status(500).json({
      error: 'Failed to fetch P&L data: ' + error.message,
      totalPnL: 0,
      trades: [],
      positions: [],
      stats: { todayTrades: 0, winRate: 0 }
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pnl-dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 P&L Dashboard Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api/pnl-data`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});