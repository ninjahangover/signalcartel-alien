#!/usr/bin/env npx tsx

import express from 'express';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const PORT = 3004;

// Enable CORS and static files
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

interface TradeData {
  orderId: string;
  symbol: string;
  side: string;
  quantity: number;
  pnl: number;
  timestamp: string;
  type: 'close' | 'open';
}

interface PnLSummary {
  totalPnL: number;
  trades: TradeData[];
  stats: {
    totalTrades: number;
    closedTrades: number;
    winRate: number;
    todayTrades: number;
    biggestWin: number;
    biggestLoss: number;
  };
  symbolStats: { [key: string]: { pnl: number, trades: number, winRate: number } };
}

async function extractRealPnLData(): Promise<PnLSummary> {
  console.log('🔍 Extracting real P&L data from logs...');
  
  const trades: TradeData[] = [];
  let totalPnL = 0;
  
  try {
    // Extract closed trades with P&L
    const closeCommand = `grep -E "KRAKEN CLOSE ORDER.*P&L:" /tmp/signalcartel-logs/production-trading.log | tail -100`;
    
    try {
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
      const { stdout } = await execAsync(openCommand);
      const openLines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of openLines) {
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
  
  // Calculate symbol statistics
  const symbolStats: { [key: string]: { pnl: number, trades: number, winRate: number } } = {};
  
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
    const symbolWins = symbolTrades.filter(t => t.pnl > 0);
    symbolStats[symbol].winRate = symbolTrades.length > 0 ? (symbolWins.length / symbolTrades.length) * 100 : 0;
  });
  
  return {
    totalPnL,
    trades: trades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    stats: {
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      winRate,
      todayTrades,
      biggestWin,
      biggestLoss
    },
    symbolStats
  };
}

// API endpoint
app.get('/api/pnl-data', async (req, res) => {
  try {
    const data = await extractRealPnLData();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalPnL: data.totalPnL,
      trades: data.trades.slice(0, 20),
      positions: [], // Mock for now
      stats: data.stats,
      symbolStats: data.symbolStats
    });
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      totalPnL: 0,
      trades: [],
      positions: [],
      stats: { totalTrades: 0, closedTrades: 0, winRate: 0, todayTrades: 0, biggestWin: 0, biggestLoss: 0 },
      symbolStats: {}
    });
  }
});

// Serve the dashboard HTML
app.get('/', (req, res) => {
  const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 SIGNALCARTEL QUANTUM FORGE™ - Real P&L Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
            color: #00ff88;
            padding: 20px;
            min-height: 100vh;
            animation: backgroundShift 10s ease-in-out infinite alternate;
        }
        
        @keyframes backgroundShift {
            0% { background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%); }
            100% { background: linear-gradient(135deg, #16213e 0%, #1a1a2e 50%, #0a0a0a 100%); }
        }
        
        .header {
            text-align: center;
            border: 3px solid #00ff88;
            padding: 30px;
            margin-bottom: 30px;
            background: rgba(0, 255, 136, 0.05);
            border-radius: 15px;
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
            animation: glow 2s ease-in-out infinite alternate;
        }
        
        @keyframes glow {
            from { box-shadow: 0 0 20px rgba(0, 255, 136, 0.2); }
            to { box-shadow: 0 0 40px rgba(0, 255, 136, 0.4); }
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 0 0 20px #00ff88;
            background: linear-gradient(45deg, #00ff88, #00d4ff, #ff6b6b, #ffd93d);
            background-size: 400% 400%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: rainbow 3s ease-in-out infinite;
        }
        
        @keyframes rainbow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .status-box {
            border: 2px solid #00ff88;
            padding: 25px;
            text-align: center;
            background: rgba(0, 20, 20, 0.8);
            border-radius: 12px;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }
        
        .status-box:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0, 255, 136, 0.3);
        }
        
        .status-box h3 {
            font-size: 1.2em;
            margin-bottom: 15px;
            color: #00d4ff;
        }
        
        .status-value {
            font-size: 2em;
            font-weight: bold;
            text-shadow: 0 0 10px currentColor;
        }
        
        .profit { color: #00ff88; }
        .loss { color: #ff6b6b; }
        .neutral { color: #ffd93d; }
        .info { color: #00d4ff; }
        
        .controls {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .btn {
            background: linear-gradient(45deg, #00ff88, #00d4ff);
            color: #000;
            border: none;
            padding: 12px 30px;
            margin: 0 10px;
            border-radius: 25px;
            font-size: 1em;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
        }
        
        .btn:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 20px rgba(0, 255, 136, 0.4);
        }
        
        .section {
            background: rgba(0, 20, 20, 0.9);
            border: 2px solid #00ff88;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
        }
        
        .section h3 {
            font-size: 1.5em;
            margin-bottom: 20px;
            color: #00d4ff;
            text-align: center;
            text-shadow: 0 0 10px #00d4ff;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        th, td {
            border: 1px solid #00ff88;
            padding: 12px;
            text-align: left;
        }
        
        th {
            background: rgba(0, 255, 136, 0.2);
            color: #00d4ff;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        tr:nth-child(even) {
            background: rgba(0, 255, 136, 0.05);
        }
        
        tr:hover {
            background: rgba(0, 255, 136, 0.1);
        }
        
        .loading {
            text-align: center;
            color: #ffd93d;
            font-size: 1.2em;
            padding: 40px;
            animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
        
        .error {
            color: #ff6b6b;
            border: 2px solid #ff6b6b;
            background: rgba(255, 107, 107, 0.1);
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        
        .timestamp {
            text-align: center;
            color: #888;
            font-size: 0.9em;
            margin-top: 20px;
            font-style: italic;
        }
        
        .symbol-stats {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .symbol-card {
            background: rgba(0, 30, 30, 0.8);
            border: 1px solid #00ff88;
            border-radius: 10px;
            padding: 15px;
            text-align: center;
        }
        
        .symbol-card h4 {
            color: #00d4ff;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 SIGNALCARTEL QUANTUM FORGE™</h1>
        <h2>REAL-TIME KRAKEN TRADING PERFORMANCE</h2>
        <p style="color: #00d4ff; font-size: 1.1em; margin-top: 10px;">
            🔮 Mathematical Conviction Engine • 💎 Tensor AI Fusion • ⚡ GPU Accelerated
        </p>
    </div>

    <div class="status-grid">
        <div class="status-box">
            <h3>💰 TOTAL P&L</h3>
            <div id="totalPnL" class="status-value neutral">Loading...</div>
        </div>
        <div class="status-box">
            <h3>📊 WIN RATE</h3>
            <div id="winRate" class="status-value info">Loading...</div>
        </div>
        <div class="status-box">
            <h3>🎯 TODAY'S TRADES</h3>
            <div id="todayTrades" class="status-value info">Loading...</div>
        </div>
        <div class="status-box">
            <h3>📈 CLOSED TRADES</h3>
            <div id="closedTrades" class="status-value info">Loading...</div>
        </div>
    </div>

    <div class="controls">
        <button class="btn" onclick="refreshData()">🔄 REFRESH DATA</button>
        <button class="btn" onclick="toggleAutoRefresh()">⏱️ AUTO-REFRESH: <span id="autoStatus">OFF</span></button>
    </div>

    <div class="section">
        <h3>🏆 SYMBOL PERFORMANCE</h3>
        <div id="symbolStats" class="symbol-stats">
            <div class="loading">🔄 Loading symbol performance...</div>
        </div>
    </div>

    <div class="section">
        <h3>📊 RECENT TRADING ACTIVITY</h3>
        <div id="tradesTable">
            <div class="loading">🔄 Loading trading data from Kraken...</div>
        </div>
    </div>

    <div class="timestamp" id="lastUpdate">Last updated: Never</div>

    <script>
        let autoRefreshInterval = null;
        let autoRefreshEnabled = false;

        function formatCurrency(amount) {
            const num = parseFloat(amount);
            if (isNaN(num)) return '$0.00';
            return '$' + num.toFixed(2);
        }

        function formatPercent(rate) {
            const num = parseFloat(rate);
            if (isNaN(num)) return '0.0%';
            return num.toFixed(1) + '%';
        }

        function getPnLClass(amount) {
            const num = parseFloat(amount);
            if (num > 0) return 'profit';
            if (num < 0) return 'loss';
            return 'neutral';
        }

        function formatTime(timestamp) {
            return new Date(timestamp).toLocaleString();
        }

        function updateDashboard(response) {
            if (!response.success) {
                document.getElementById('totalPnL').innerHTML = '<div class="error">' + response.error + '</div>';
                return;
            }

            const data = response;

            // Update main stats
            document.getElementById('totalPnL').className = 'status-value ' + getPnLClass(data.totalPnL);
            document.getElementById('totalPnL').textContent = formatCurrency(data.totalPnL);
            
            document.getElementById('winRate').textContent = formatPercent(data.stats.winRate);
            document.getElementById('todayTrades').textContent = data.stats.todayTrades;
            document.getElementById('closedTrades').textContent = data.stats.closedTrades;

            // Update symbol performance
            let symbolHtml = '';
            if (data.symbolStats && Object.keys(data.symbolStats).length > 0) {
                Object.entries(data.symbolStats)
                    .sort(([,a], [,b]) => b.pnl - a.pnl)
                    .forEach(([symbol, stats]) => {
                        const pnlClass = getPnLClass(stats.pnl);
                        const avgPnL = stats.pnl / stats.trades;
                        
                        symbolHtml += \`
                            <div class="symbol-card">
                                <h4>\${symbol}</h4>
                                <div class="\${pnlClass}" style="font-size: 1.3em; font-weight: bold;">
                                    \${formatCurrency(stats.pnl)}
                                </div>
                                <div style="font-size: 0.9em; margin-top: 5px;">
                                    \${stats.trades} trades • \${formatPercent(stats.winRate)} win rate
                                </div>
                                <div style="font-size: 0.8em; color: #888;">
                                    Avg: \${formatCurrency(avgPnL)}
                                </div>
                            </div>
                        \`;
                    });
            } else {
                symbolHtml = '<div class="loading">No symbol data available</div>';
            }
            document.getElementById('symbolStats').innerHTML = symbolHtml;

            // Update trades table
            let tradesHtml = \`
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Symbol</th>
                            <th>Side</th>
                            <th>Quantity</th>
                            <th>P&L</th>
                            <th>Order ID</th>
                        </tr>
                    </thead>
                    <tbody>
            \`;

            if (data.trades && data.trades.length > 0) {
                data.trades.slice(0, 15).forEach(trade => {
                    if (trade.type === 'close') {
                        tradesHtml += \`
                            <tr>
                                <td>\${formatTime(trade.timestamp)}</td>
                                <td><strong>\${trade.symbol}</strong></td>
                                <td>\${trade.side}</td>
                                <td>\${trade.quantity}</td>
                                <td class="\${getPnLClass(trade.pnl)}" style="font-weight: bold;">
                                    \${formatCurrency(trade.pnl)}
                                </td>
                                <td style="font-size: 0.8em; color: #888;">\${trade.orderId}</td>
                            </tr>
                        \`;
                    }
                });
            } else {
                tradesHtml += '<tr><td colspan="6" style="text-align: center;">No recent trades found</td></tr>';
            }

            tradesHtml += '</tbody></table>';
            document.getElementById('tradesTable').innerHTML = tradesHtml;

            // Update timestamp
            document.getElementById('lastUpdate').textContent = 'Last updated: ' + new Date().toLocaleString();
        }

        async function refreshData() {
            document.getElementById('lastUpdate').textContent = 'Refreshing...';
            
            try {
                const response = await fetch('/api/pnl-data');
                const data = await response.json();
                updateDashboard(data);
            } catch (error) {
                console.error('Failed to fetch data:', error);
                document.getElementById('totalPnL').innerHTML = '<div class="error">Failed to load data</div>';
            }
        }

        function toggleAutoRefresh() {
            if (autoRefreshEnabled) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
                autoRefreshEnabled = false;
                document.getElementById('autoStatus').textContent = 'OFF';
            } else {
                autoRefreshInterval = setInterval(refreshData, 30000);
                autoRefreshEnabled = true;
                document.getElementById('autoStatus').textContent = 'ON (30s)';
            }
        }

        // Initial load
        refreshData();
    </script>
</body>
</html>
  `;
  
  res.send(dashboardHTML);
});

app.listen(PORT, () => {
  console.log('🚀 ====== PRETTY P&L DASHBOARD ======');
  console.log(`📊 Beautiful Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 API Endpoint: http://localhost:${PORT}/api/pnl-data`);
  console.log('');
  console.log('✨ Features:');
  console.log('   • Terminal-style design with animations');
  console.log('   • Real P&L data from Kraken trading logs');
  console.log('   • Symbol performance breakdown');
  console.log('   • Auto-refresh capability');
  console.log('   • Responsive layout');
  console.log('');
  console.log('🎯 Navigate to the dashboard to see your real trading performance!');
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Pretty P&L Dashboard...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down Pretty P&L Dashboard...');
  process.exit(0);
});