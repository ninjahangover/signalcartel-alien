#!/usr/bin/env npx tsx

import express from 'express';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { krakenApiService } from './src/lib/kraken-api-service';

const prisma = new PrismaClient();
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

interface OpenPosition {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  duration: string;
  status: 'OPEN' | 'LIMIT_ORDER' | 'STOP_ORDER';
  confidence?: number;
  targetProfit?: number;
  stopLoss?: number;
}

interface LimitOrder {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'LIMIT' | 'STOP_LIMIT' | 'MARKET';
  quantity: number;
  limitPrice: number;
  stopPrice?: number;
  status: 'PENDING' | 'PARTIALLY_FILLED' | 'OPEN';
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  createdAt: string;
  expiresAt?: string;
  value: number;
  description: string;
}

interface PnLSummary {
  totalPnL: number;
  portfolioValue: number;
  trades: TradeData[];
  openPositions: OpenPosition[];
  limitOrders: LimitOrder[];
  stats: {
    totalTrades: number;
    closedTrades: number;
    openTrades: number;
    pendingOrders: number;
    winRate: number;
    todayTrades: number;
    biggestWin: number;
    biggestLoss: number;
    totalUnrealizedPnL: number;
  };
  symbolStats: { [key: string]: { pnl: number, trades: number, winRate: number } };
}

// Real Kraken API price fetching for 100% accuracy
async function fetchRealKrakenPrice(symbol: string): Promise<number> {
  try {
    // Map our symbols to Kraken API pairs
    const symbolMap: { [key: string]: string } = {
      'BTCUSD': 'XXBTZUSD',
      'ETHUSD': 'XETHZUSD',
      'SOLUSD': 'SOLUSD',
      'AVAXUSD': 'AVAXUSD',
      'BNBUSDT': 'BNBUSDT'
    };
    
    const krakenPair = symbolMap[symbol] || symbol;
    
    console.log(`🔍 Fetching REAL price for ${symbol} (${krakenPair}) from Kraken API`);
    
    const response = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${krakenPair}`, {
      headers: {
        'User-Agent': 'SignalCartel-Dashboard/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Kraken API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(', ')}`);
    }
    
    // Get the current price (last trade price)
    const pairData = Object.values(data.result)[0] as any;
    const currentPrice = parseFloat(pairData?.c?.[0] || '0');
    
    if (currentPrice === 0) {
      throw new Error(`No price data found for ${symbol}`);
    }
    
    console.log(`✅ REAL price fetched for ${symbol}: $${currentPrice.toFixed(2)}`);
    return currentPrice;
    
  } catch (error) {
    console.error(`❌ Error fetching real price for ${symbol}:`, error);
    
    // CRITICAL: For real money trading, we NEVER use fallback prices
    // Instead, we should use the last known good price from database or throw error
    throw new Error(`Failed to fetch real price for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Initialize Kraken API
let krakenInitialized = false;

async function initializeKrakenApi(): Promise<boolean> {
  if (krakenInitialized) return true;
  
  try {
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_PRIVATE_KEY;
    
    if (apiKey && apiSecret) {
      const success = await krakenApiService.authenticate(apiKey, apiSecret);
      if (success) {
        krakenInitialized = true;
        console.log('✅ Kraken API initialized for limit orders');
        return true;
      }
    }
  } catch (error) {
    console.log('⚠️ Kraken API not available:', error.message);
  }
  
  return false;
}

// Fetch account balance from Kraken
async function fetchAccountBalance(): Promise<any> {
  try {
    if (!krakenInitialized) {
      const initialized = await initializeKrakenApi();
      if (!initialized) return {};
    }
    
    const balanceResponse = await krakenApiService.getAccountBalance();
    const balance = balanceResponse?.result || {};
    
    console.log(`💰 Fetched account balance from Kraken`);
    return balance;
    
  } catch (error) {
    console.log('⚠️ Failed to fetch account balance:', error.message);
    return {};
  }
}

// Fetch limit orders from Kraken
async function fetchLimitOrders(): Promise<LimitOrder[]> {
  try {
    if (!krakenInitialized) {
      const initialized = await initializeKrakenApi();
      if (!initialized) return [];
    }
    
    const openOrdersResponse = await krakenApiService.getOpenOrders();
    const orders = openOrdersResponse?.result?.open || {};
    
    const limitOrders: LimitOrder[] = [];
    
    for (const [orderId, order] of Object.entries(orders)) {
      const orderData = order as any;
      const desc = orderData.descr || {};
      
      // Convert Kraken pair to our format (XBTUSD -> BTCUSD)
      let symbol = desc.pair || '';
      if (symbol.startsWith('X') && symbol.endsWith('USD')) {
        symbol = symbol.substring(1);
      }
      if (symbol === 'XBTUSD') symbol = 'BTCUSD';
      if (symbol === 'XETHUSD') symbol = 'ETHUSD';
      
      const quantity = parseFloat(orderData.vol || '0');
      const limitPrice = parseFloat(desc.price || '0');
      
      limitOrders.push({
        orderId,
        symbol,
        side: (desc.type || '').toUpperCase() as 'BUY' | 'SELL',
        orderType: (desc.ordertype || '').toUpperCase() as 'LIMIT',
        quantity,
        limitPrice,
        value: quantity * limitPrice,
        status: 'OPEN',
        timeInForce: 'GTC',
        createdAt: new Date(orderData.opentm * 1000).toISOString(),
        description: desc.order || `${desc.type} ${quantity} ${symbol} @ ${desc.ordertype} ${limitPrice}`
      });
    }
    
    console.log(`📋 Fetched ${limitOrders.length} limit orders from Kraken`);
    return limitOrders;
    
  } catch (error) {
    console.log('⚠️ Failed to fetch limit orders:', error.message);
    return [];
  }
}

async function extractRealPnLData(): Promise<PnLSummary> {
  console.log('🔍 Extracting real P&L data from database after Kraken sync...');
  
  const trades: TradeData[] = [];
  const openPositions: OpenPosition[] = [];
  let totalPnL = 0;
  let totalUnrealizedPnL = 0;
  
  // Fetch account balance from Kraken
  const accountBalance = await fetchAccountBalance();
  
  try {
    // Get all positions from database
    const allPositions = await prisma.managedPosition.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Found ${allPositions.length} total positions in database`);
    
    // Process closed positions for trade history
    const closedPositions = allPositions.filter(pos => pos.status === 'closed');
    console.log(`✅ Processing ${closedPositions.length} closed positions`);
    
    for (const position of closedPositions) {
      if (position.realizedPnL !== null) {
        trades.push({
          orderId: position.exitTradeId || position.entryTradeId || position.id,
          symbol: position.symbol,
          side: position.side,
          quantity: position.quantity,
          pnl: position.realizedPnL,
          timestamp: position.exitTime?.toISOString() || position.createdAt.toISOString(),
          type: 'close'
        });
        totalPnL += position.realizedPnL;
      }
    }
    
    // Process open positions for live tracking
    const activePositions = allPositions.filter(pos => pos.status === 'open');
    console.log(`🔓 Processing ${activePositions.length} open positions`);
    
    for (const position of activePositions) {
      // For now, use the last known unrealized P&L from database
      // In production, this would fetch current market prices from Kraken API
      const unrealizedPnL = position.unrealizedPnL || 0;
      const entryValue = position.entryPrice * position.quantity;
      const unrealizedPnLPercent = entryValue > 0 ? (unrealizedPnL / entryValue) * 100 : 0;
      
      // Calculate duration since entry
      const duration = ((Date.now() - position.entryTime.getTime()) / 1000 / 60).toFixed(0) + 'min';
      
      // Fetch REAL current price from Kraken API for 100% accuracy
      const currentPrice = await fetchRealKrakenPrice(position.symbol);
      const realTimeUnrealizedPnL = (currentPrice - position.entryPrice) * position.quantity * (['BUY', 'LONG'].includes(position.side.toUpperCase()) ? 1 : -1);
      const realTimeUnrealizedPnLPercent = (realTimeUnrealizedPnL / entryValue) * 100;
      
      openPositions.push({
        id: position.id,
        symbol: position.symbol,
        side: position.side.toUpperCase(),
        quantity: position.quantity,
        entryPrice: position.entryPrice,
        currentPrice: currentPrice,
        unrealizedPnL: realTimeUnrealizedPnL,
        unrealizedPnLPercent: realTimeUnrealizedPnLPercent,
        duration,
        status: 'OPEN',
        confidence: undefined,
        targetProfit: position.takeProfit,
        stopLoss: position.stopLoss
      });
      
      totalUnrealizedPnL += realTimeUnrealizedPnL;
    }
    
  } catch (error) {
    console.error('❌ Error extracting P&L data from database:', error);
  }
  
  // Fetch limit orders from Kraken
  const limitOrders = await fetchLimitOrders();
  
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
  
  // Add closed trades to symbol stats
  closedTrades.forEach(trade => {
    if (!symbolStats[trade.symbol]) {
      symbolStats[trade.symbol] = { pnl: 0, trades: 0, winRate: 0 };
    }
    symbolStats[trade.symbol].pnl += trade.pnl;
    symbolStats[trade.symbol].trades += 1;
  });
  
  // Add open positions to symbol stats (with unrealized P&L)
  openPositions.forEach(position => {
    if (!symbolStats[position.symbol]) {
      symbolStats[position.symbol] = { pnl: 0, trades: 0, winRate: 0 };
    }
    symbolStats[position.symbol].pnl += position.unrealizedPnL;
    symbolStats[position.symbol].trades += 1;
  });
  
  // Calculate win rates for each symbol
  Object.keys(symbolStats).forEach(symbol => {
    const symbolTrades = closedTrades.filter(t => t.symbol === symbol);
    const symbolWins = symbolTrades.filter(t => t.pnl > 0);
    const symbolOpenPositions = openPositions.filter(p => p.symbol === symbol && p.unrealizedPnL > 0);
    const totalWins = symbolWins.length + symbolOpenPositions.length;
    const totalTrades = symbolTrades.length + openPositions.filter(p => p.symbol === symbol).length;
    symbolStats[symbol].winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
  });
  
  // Parse account balance
  const usdBalance = parseFloat(accountBalance.ZUSD || '0');
  
  // Calculate portfolio value from position values  
  const positionValue = openPositions.reduce((total, pos) => {
    return total + (pos.quantity * pos.currentPrice);
  }, 0);
  
  const portfolioValue = usdBalance + positionValue;
  
  // Create balance breakdown
  const balanceBreakdown = {
    availableUSD: usdBalance,
    positionsValue: positionValue,
    totalPortfolioValue: portfolioValue,
    positions: openPositions.map(pos => ({
      symbol: pos.symbol,
      quantity: pos.quantity,
      currentPrice: pos.currentPrice,
      positionValue: pos.quantity * pos.currentPrice,
      unrealizedPnL: pos.unrealizedPnL
    }))
  };
  
  return {
    totalPnL,
    portfolioValue,
    trades: trades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    openPositions,
    limitOrders,
    balanceBreakdown,
    stats: {
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      openTrades: openPositions.length,
      pendingOrders: limitOrders.length,
      winRate,
      todayTrades,
      biggestWin,
      biggestLoss,
      totalUnrealizedPnL
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
      portfolioValue: data.portfolioValue,
      trades: data.trades.slice(0, 20),
      openPositions: data.openPositions,
      limitOrders: data.limitOrders,
      balanceBreakdown: data.balanceBreakdown,
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
      openPositions: [],
      limitOrders: [],
      stats: { totalTrades: 0, closedTrades: 0, winRate: 0, todayTrades: 0, biggestWin: 0, biggestLoss: 0, pendingOrders: 0 },
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
            <h3>💰 SYSTEM P&L</h3>
            <div id="totalPnL" class="status-value neutral">Loading...</div>
        </div>
        <div class="status-box">
            <h3>💼 PORTFOLIO VALUE</h3>
            <div id="portfolioValue" class="status-value info">Loading...</div>
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
        <div class="status-box">
            <h3>🔓 OPEN POSITIONS</h3>
            <div id="openTrades" class="status-value info">Loading...</div>
        </div>
        <div class="status-box">
            <h3>📋 PENDING ORDERS</h3>
            <div id="pendingOrders" class="status-value info">Loading...</div>
        </div>
        <div class="status-box">
            <h3>📊 UNREALIZED P&L</h3>
            <div id="unrealizedPnL" class="status-value neutral">Loading...</div>
        </div>
    </div>

    <div class="controls">
        <button class="btn" onclick="refreshData()">🔄 REFRESH DATA</button>
        <button class="btn" onclick="toggleAutoRefresh()">⏱️ AUTO-REFRESH: <span id="autoStatus">OFF</span></button>
    </div>

    <div class="section">
        <h3>🔓 LIVE OPEN POSITIONS</h3>
        <div id="openPositionsTable">
            <div class="loading">🔄 Loading open positions...</div>
        </div>
    </div>

    <div class="section">
        <h3>💰 ACCOUNT BALANCE & ALLOCATION</h3>
        <div id="balanceBreakdown">
            <div class="loading">🔄 Loading account balance from Kraken...</div>
        </div>
    </div>

    <div class="section">
        <h3>📋 PENDING LIMIT ORDERS</h3>
        <div id="limitOrdersTable">
            <div class="loading">🔄 Loading pending orders from Kraken...</div>
        </div>
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
            
            document.getElementById('portfolioValue').textContent = formatCurrency(data.portfolioValue);
            
            document.getElementById('winRate').textContent = formatPercent(data.stats.winRate);
            document.getElementById('todayTrades').textContent = data.stats.todayTrades;
            document.getElementById('closedTrades').textContent = data.stats.closedTrades;
            document.getElementById('openTrades').textContent = data.stats.openTrades || 0;
            document.getElementById('pendingOrders').textContent = data.stats.pendingOrders || 0;
            
            // Update unrealized P&L
            const unrealizedPnL = data.stats.totalUnrealizedPnL || 0;
            document.getElementById('unrealizedPnL').className = 'status-value ' + getPnLClass(unrealizedPnL);
            document.getElementById('unrealizedPnL').textContent = formatCurrency(unrealizedPnL);

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

            // Update balance breakdown
            let balanceHtml = '';
            if (data.balanceBreakdown) {
                const breakdown = data.balanceBreakdown;
                const availablePercent = breakdown.totalPortfolioValue > 0 ? (breakdown.availableUSD / breakdown.totalPortfolioValue * 100) : 0;
                const positionsPercent = breakdown.totalPortfolioValue > 0 ? (breakdown.positionsValue / breakdown.totalPortfolioValue * 100) : 0;
                
                balanceHtml = \`
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div class="status-box">
                            <h4 style="color: #00d4ff;">💵 Available USD</h4>
                            <div class="status-value info" style="font-size: 1.5em;">\${formatCurrency(breakdown.availableUSD)}</div>
                            <div style="color: #888; font-size: 0.9em;">\${availablePercent.toFixed(1)}% of portfolio</div>
                        </div>
                        <div class="status-box">
                            <h4 style="color: #00d4ff;">🏪 Positions Value</h4>
                            <div class="status-value info" style="font-size: 1.5em;">\${formatCurrency(breakdown.positionsValue)}</div>
                            <div style="color: #888; font-size: 0.9em;">\${positionsPercent.toFixed(1)}% of portfolio</div>
                        </div>
                        <div class="status-box">
                            <h4 style="color: #00d4ff;">💎 Total Portfolio</h4>
                            <div class="status-value info" style="font-size: 1.5em;">\${formatCurrency(breakdown.totalPortfolioValue)}</div>
                            <div style="color: #888; font-size: 0.9em;">Live from Kraken</div>
                        </div>
                    </div>
                \`;
                
                if (breakdown.positions && breakdown.positions.length > 0) {
                    balanceHtml += \`
                        <table>
                            <thead>
                                <tr style="background: rgba(0, 255, 136, 0.3);">
                                    <th>Asset</th>
                                    <th>Quantity</th>
                                    <th>Current Price</th>
                                    <th>Position Value</th>
                                    <th>Unrealized P&L</th>
                                    <th>% of Portfolio</th>
                                </tr>
                            </thead>
                            <tbody>
                    \`;
                    
                    breakdown.positions.forEach(position => {
                        const pnlClass = getPnLClass(position.unrealizedPnL);
                        const portfolioPercent = breakdown.totalPortfolioValue > 0 ? (position.positionValue / breakdown.totalPortfolioValue * 100) : 0;
                        
                        balanceHtml += \`
                            <tr>
                                <td style="font-weight: bold;">\${position.symbol}</td>
                                <td>\${position.quantity.toFixed(6)}</td>
                                <td>\${formatCurrency(position.currentPrice)}</td>
                                <td>\${formatCurrency(position.positionValue)}</td>
                                <td class="\${pnlClass}">\${formatCurrency(position.unrealizedPnL)}</td>
                                <td>\${portfolioPercent.toFixed(1)}%</td>
                            </tr>
                        \`;
                    });
                    
                    balanceHtml += '</tbody></table>';
                }
            } else {
                balanceHtml = '<div class="loading">Balance data not available</div>';
            }
            document.getElementById('balanceBreakdown').innerHTML = balanceHtml;

            // Update open positions table - CRITICAL FOR TRADING DECISIONS
            let openPositionsHtml = '';
            if (data.openPositions && data.openPositions.length > 0) {
                openPositionsHtml = \`
                    <table style="margin-bottom: 20px;">
                        <thead>
                            <tr style="background: rgba(0, 255, 136, 0.3);">
                                <th>Symbol</th>
                                <th>Side</th>
                                <th>Size</th>
                                <th>Entry Price</th>
                                <th>Current Price</th>
                                <th>P&L</th>
                                <th>P&L %</th>
                                <th>Duration</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                \`;
                
                data.openPositions.forEach(position => {
                    const pnlClass = getPnLClass(position.unrealizedPnL);
                    const pnlPercentClass = getPnLClass(position.unrealizedPnLPercent);
                    
                    openPositionsHtml += \`
                        <tr style="background: rgba(0, 255, 136, 0.08); border-left: 3px solid \${position.unrealizedPnL >= 0 ? '#00ff88' : '#ff6b6b'};">
                            <td><strong>\${position.symbol}</strong></td>
                            <td style="color: \${position.side === 'BUY' ? '#00ff88' : '#ff6b6b'}; font-weight: bold;">\${position.side}</td>
                            <td>\${position.quantity.toFixed(6)}</td>
                            <td>\$\${position.entryPrice.toFixed(2)}</td>
                            <td>\$\${position.currentPrice.toFixed(2)}</td>
                            <td class="\${pnlClass}" style="font-weight: bold; font-size: 1.1em;">
                                \${formatCurrency(position.unrealizedPnL)}
                            </td>
                            <td class="\${pnlPercentClass}" style="font-weight: bold; font-size: 1.1em;">
                                \${position.unrealizedPnLPercent >= 0 ? '+' : ''}\${position.unrealizedPnLPercent.toFixed(2)}%
                            </td>
                            <td>\${position.duration}</td>
                            <td style="color: #ffd93d; font-weight: bold;">\${position.status}</td>
                        </tr>
                    \`;
                });
                
                openPositionsHtml += '</tbody></table>';
            } else {
                openPositionsHtml = '<div style="text-align: center; padding: 30px; color: #888; font-size: 1.1em;">📭 No open positions currently</div>';
            }
            document.getElementById('openPositionsTable').innerHTML = openPositionsHtml;

            // Update limit orders table
            let limitOrdersHtml = '';
            if (data.limitOrders && data.limitOrders.length > 0) {
                limitOrdersHtml = \`
                    <table>
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Side</th>
                                <th>Type</th>
                                <th>Quantity</th>
                                <th>Limit Price</th>
                                <th>Order Value</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                \`;
                
                data.limitOrders.forEach(order => {
                    const sideColor = order.side === 'BUY' ? '#00ff88' : '#ff6b6b';
                    const orderValue = formatCurrency(order.value);
                    const createdTime = new Date(order.createdAt).toLocaleString();
                    
                    limitOrdersHtml += \`
                        <tr style="background: rgba(0, 212, 255, 0.08); border-left: 3px solid \${sideColor};">
                            <td><strong>\${order.symbol}</strong></td>
                            <td style="color: \${sideColor}; font-weight: bold;">\${order.side}</td>
                            <td style="color: #00d4ff; font-weight: bold;">\${order.orderType}</td>
                            <td>\${order.quantity.toFixed(6)}</td>
                            <td>\$\${order.limitPrice.toFixed(2)}</td>
                            <td style="color: #ffd93d; font-weight: bold;">\${orderValue}</td>
                            <td style="color: #00ff88; font-weight: bold;">\${order.status}</td>
                            <td style="font-size: 0.9em;">\${createdTime}</td>
                            <td style="font-size: 0.8em; color: #888; max-width: 200px; text-overflow: ellipsis; overflow: hidden;">\${order.description}</td>
                        </tr>
                    \`;
                });
                
                limitOrdersHtml += '</tbody></table>';
            } else {
                limitOrdersHtml = '<div style="text-align: center; padding: 30px; color: #888; font-size: 1.1em;">📋 No pending limit orders</div>';
            }
            document.getElementById('limitOrdersTable').innerHTML = limitOrdersHtml;

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

        // Initial load and enable auto-refresh for real-time trading data
        refreshData();
        
        // Auto-enable 30-second refresh for traders
        setTimeout(() => {
            if (!autoRefreshEnabled) {
                toggleAutoRefresh(); // Enable auto-refresh automatically
            }
        }, 2000);
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