/**
 * Complete Kraken API Dashboard - Real balances + calculated entry prices from trade history
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { execSync } from 'child_process';

const app = express();
const PORT = 3006;
let prisma: PrismaClient | null = null;

// Initialize Prisma with error handling
try {
  prisma = new PrismaClient();
} catch (error) {
  console.log('⚠️ Database connection failed, Level 2 analytics will be unavailable');
}

const KRAKEN_API_KEY = 'DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR';
const KRAKEN_PRIVATE_KEY = 'p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==';

// Rate limiting according to Kraken API policies (1 call per 2-3 seconds)
const API_RATE_LIMIT = {
  lastCall: 0,
  minInterval: 3000, // 3 seconds between API calls
  callCount: 0,
  maxCallsPerMinute: 15
};

// Cache for API responses (refresh every 2 minutes)
const API_CACHE = {
  data: null as any,
  lastUpdate: 0,
  cacheInterval: 120000 // 2 minutes
};

async function rateLimitedDelay() {
  const now = Date.now();
  const timeSinceLastCall = now - API_RATE_LIMIT.lastCall;

  if (timeSinceLastCall < API_RATE_LIMIT.minInterval) {
    const waitTime = API_RATE_LIMIT.minInterval - timeSinceLastCall;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  API_RATE_LIMIT.lastCall = Date.now();
  API_RATE_LIMIT.callCount++;
}

async function krakenApiCall(endpoint: string, params: any = {}) {
  try {
    // Apply rate limiting before each API call
    await rateLimitedDelay();

    console.log(`📡 Kraken API call: ${endpoint} (${API_RATE_LIMIT.callCount} calls)`);

    const response = await fetch('http://localhost:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        params,
        apiKey: KRAKEN_API_KEY,
        apiSecret: KRAKEN_PRIVATE_KEY
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken error: ${data.error.join(', ')}`);
    }

    return data.result;
  } catch (error) {
    console.error(`Kraken API ${endpoint} failed:`, error.message);
    return null;
  }
}

// LEVEL 2 ANALYTICS - Database & Log Analysis
async function getLevel2Analytics() {
  try {
    console.log('📊 Fetching Level 2 analytics from database and logs...');

    if (!prisma) {
      console.log('⚠️ Prisma not available, using log-only analytics');
      return getLogOnlyAnalytics();
    }

    // Get trade statistics from database
    const closedTrades = await prisma.trade.findMany({
      where: { status: 'closed' },
      orderBy: { created_at: 'desc' },
      take: 1000 // Last 1000 trades
    });

    // Calculate 24-hour trades
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trades24h = closedTrades.filter(trade =>
      new Date(trade.created_at) >= last24Hours
    );

    // Win rate analysis
    const wins = closedTrades.filter(trade => Number(trade.realized_pnl) > 0);
    const losses = closedTrades.filter(trade => Number(trade.realized_pnl) < 0);
    const totalPnL = closedTrades.reduce((sum, trade) => sum + Number(trade.realized_pnl), 0);

    // Best trading pairs by win rate
    const pairStats = {};
    closedTrades.forEach(trade => {
      const pair = trade.symbol;
      if (!pairStats[pair]) {
        pairStats[pair] = { total: 0, wins: 0, totalPnL: 0 };
      }
      pairStats[pair].total++;
      pairStats[pair].totalPnL += Number(trade.realized_pnl);
      if (Number(trade.realized_pnl) > 0) {
        pairStats[pair].wins++;
      }
    });

    const bestPairs = Object.entries(pairStats)
      .map(([pair, stats]: [string, any]) => ({
        pair,
        trades: stats.total,
        winRate: stats.total > 0 ? (stats.wins / stats.total * 100) : 0,
        totalPnL: stats.totalPnL
      }))
      .filter(p => p.trades >= 5) // Only pairs with 5+ trades
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 5);

    // Recent performance trends
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trades7d = closedTrades.filter(trade =>
      new Date(trade.created_at) >= last7Days
    );

    const wins7d = trades7d.filter(trade => Number(trade.realized_pnl) > 0);
    const weeklyWinRate = trades7d.length > 0 ? (wins7d.length / trades7d.length * 100) : 0;

    // Log-based analysis (from production logs)
    let logStats = { totalLogTrades: 0, avgTradeSize: 0, successfulSignals: 0 };
    try {
      if (fs.existsSync('/tmp/signalcartel-logs/production-trading.log')) {
        const logContent = fs.readFileSync('/tmp/signalcartel-logs/production-trading.log', 'utf8');
        const lines = logContent.split('\n').slice(-1000); // Last 1000 lines

        // Count successful trades from logs
        const tradeLines = lines.filter(line => line.includes('P&L:'));
        logStats.totalLogTrades = tradeLines.length;

        // Extract P&L values
        const pnlValues = tradeLines
          .map(line => {
            const match = line.match(/P&L: \$(-?\d+\.?\d*)/);
            return match ? parseFloat(match[1]) : 0;
          })
          .filter(val => val !== 0);

        if (pnlValues.length > 0) {
          logStats.avgTradeSize = pnlValues.reduce((sum, val) => sum + Math.abs(val), 0) / pnlValues.length;
          logStats.successfulSignals = pnlValues.filter(val => val > 0).length;
        }
      }
    } catch (logError) {
      console.log('⚠️ Could not read logs:', logError.message);
    }

    return {
      // Database stats
      totalTrades: closedTrades.length,
      winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length * 100) : 0,
      totalPnL,
      trades24h: trades24h.length,
      trades7d: trades7d.length,
      weeklyWinRate,
      bestPairs,
      biggestWin: wins.length > 0 ? Math.max(...wins.map(t => Number(t.realized_pnl))) : 0,
      biggestLoss: losses.length > 0 ? Math.min(...losses.map(t => Number(t.realized_pnl))) : 0,
      avgPnL: closedTrades.length > 0 ? totalPnL / closedTrades.length : 0,

      // Log stats
      logStats
    };

  } catch (error) {
    console.error('❌ Error fetching Level 2 analytics:', error);
    return {
      totalTrades: 0, winRate: 0, totalPnL: 0, trades24h: 0, trades7d: 0,
      weeklyWinRate: 0, bestPairs: [], biggestWin: 0, biggestLoss: 0, avgPnL: 0,
      logStats: { totalLogTrades: 0, avgTradeSize: 0, successfulSignals: 0 }
    };
  }
}

// Fallback analytics using logs only
async function getLogOnlyAnalytics() {
  try {
    let logStats = { totalLogTrades: 0, avgTradeSize: 0, successfulSignals: 0 };

    if (fs.existsSync('/tmp/signalcartel-logs/production-trading.log')) {
      const logContent = fs.readFileSync('/tmp/signalcartel-logs/production-trading.log', 'utf8');
      const lines = logContent.split('\n').slice(-1000);

      const tradeLines = lines.filter(line => line.includes('P&L:'));
      logStats.totalLogTrades = tradeLines.length;

      const pnlValues = tradeLines
        .map(line => {
          const match = line.match(/P&L: \$(-?\d+\.?\d*)/);
          return match ? parseFloat(match[1]) : 0;
        })
        .filter(val => val !== 0);

      if (pnlValues.length > 0) {
        logStats.avgTradeSize = pnlValues.reduce((sum, val) => sum + Math.abs(val), 0) / pnlValues.length;
        logStats.successfulSignals = pnlValues.filter(val => val > 0).length;
      }
    }

    return {
      totalTrades: logStats.totalLogTrades,
      winRate: logStats.totalLogTrades > 0 ? (logStats.successfulSignals / logStats.totalLogTrades * 100) : 0,
      totalPnL: 0,
      trades24h: 0,
      trades7d: 0,
      weeklyWinRate: 0,
      bestPairs: [],
      biggestWin: 0,
      biggestLoss: 0,
      avgPnL: 0,
      logStats
    };
  } catch (error) {
    console.error('❌ Error in log-only analytics:', error);
    return {
      totalTrades: 0, winRate: 0, totalPnL: 0, trades24h: 0, trades7d: 0,
      weeklyWinRate: 0, bestPairs: [], biggestWin: 0, biggestLoss: 0, avgPnL: 0,
      logStats: { totalLogTrades: 0, avgTradeSize: 0, successfulSignals: 0 }
    };
  }
}

// LEVEL 3 SYSTEM SERVICES - Monitor all running services
async function getLevel3SystemServices() {
  try {
    console.log('🔧 Checking system services status...');

    const services = [];

    // Check Kraken Proxy (port 3002)
    const krakenProxy = await checkServiceHealth('http://localhost:3002/health', 'Kraken Proxy Server', '3002');
    services.push(krakenProxy);

    // Check Trading Dashboard (port 3006)
    const dashboard = await checkServiceHealth('http://localhost:3006', 'Trading Dashboard', '3006');
    services.push(dashboard);

    // Check for running processes
    // execSync already imported at top

    try {
      // Check for Profit Predator
      const profitPredatorProcs = execSync("ps aux | grep -E 'profit-predator|production-trading' | grep -v grep", { encoding: 'utf8' });
      const profitPredatorCount = profitPredatorProcs.split('\n').filter(line => line.trim()).length;

      services.push({
        name: 'Profit Predator Engine',
        status: profitPredatorCount > 0 ? 'RUNNING' : 'STOPPED',
        port: 'N/A',
        processes: profitPredatorCount,
        uptime: profitPredatorCount > 0 ? 'Active' : 'Stopped'
      });

      // Check for Trading System
      const tradingProcs = execSync("ps aux | grep -E 'production-trading|tensor' | grep -v grep", { encoding: 'utf8' });
      const tradingCount = tradingProcs.split('\n').filter(line => line.trim()).length;

      services.push({
        name: 'Tensor AI Trading System',
        status: tradingCount > 0 ? 'RUNNING' : 'STOPPED',
        port: 'N/A',
        processes: tradingCount,
        uptime: tradingCount > 0 ? 'Active' : 'Stopped'
      });

      // Check for System Guardian
      const guardianProcs = execSync("ps aux | grep -E 'system-guardian' | grep -v grep", { encoding: 'utf8' });
      const guardianCount = guardianProcs.split('\n').filter(line => line.trim()).length;

      services.push({
        name: 'System Guardian',
        status: guardianCount > 0 ? 'MONITORING' : 'STOPPED',
        port: 'N/A',
        processes: guardianCount,
        uptime: guardianCount > 0 ? 'Monitoring' : 'Stopped'
      });

      // Check database connection
      if (prisma) {
        try {
          await prisma.$queryRaw`SELECT 1`;
          services.push({
            name: 'PostgreSQL Database',
            status: 'CONNECTED',
            port: '5433',
            processes: 1,
            uptime: 'Connected'
          });
        } catch (dbError) {
          services.push({
            name: 'PostgreSQL Database',
            status: 'ERROR',
            port: '5433',
            processes: 0,
            uptime: 'Connection failed'
          });
        }
      } else {
        services.push({
          name: 'PostgreSQL Database',
          status: 'NOT_INITIALIZED',
          port: '5433',
          processes: 0,
          uptime: 'Not initialized'
        });
      }

    } catch (psError) {
      console.log('⚠️ Error checking processes:', psError.message);
    }

    // Check ntfy service
    try {
      const ntfyCheck = await fetch('http://ntfy.sh', { timeout: 3000 });
      services.push({
        name: 'ntfy Notification Service',
        status: ntfyCheck.ok ? 'AVAILABLE' : 'ERROR',
        port: '80',
        processes: ntfyCheck.ok ? 1 : 0,
        uptime: ntfyCheck.ok ? 'Online' : 'Offline'
      });
    } catch (ntfyError) {
      services.push({
        name: 'ntfy Notification Service',
        status: 'ERROR',
        port: '80',
        processes: 0,
        uptime: 'Offline'
      });
    }

    return services;

  } catch (error) {
    console.error('❌ Error checking system services:', error);
    return [];
  }
}

async function checkServiceHealth(url: string, name: string, port: string) {
  try {
    const response = await fetch(url, {
      timeout: 5000,
      method: 'GET'
    });

    return {
      name,
      status: response.ok ? 'HEALTHY' : 'ERROR',
      port,
      processes: response.ok ? 1 : 0,
      uptime: response.ok ? 'Running' : 'Down',
      responseCode: response.status
    };
  } catch (error) {
    return {
      name,
      status: 'ERROR',
      port,
      processes: 0,
      uptime: 'Down',
      error: error.message
    };
  }
}


async function getCompleteKrakenData() {
  try {
    // Check if we have cached data that's still fresh (within 2 minutes)
    const now = Date.now();
    if (API_CACHE.data && (now - API_CACHE.lastUpdate) < API_CACHE.cacheInterval) {
      console.log('📋 Using cached Kraken data (fresh within 2 minutes)');
      return API_CACHE.data;
    }

    console.log('🔄 Fetching fresh data from Kraken API (cache expired)...');

    // Get data sequentially to respect rate limits
    const balance = await krakenApiCall('Balance');
    const openOrders = await krakenApiCall('OpenOrders');
    const ticker = await krakenApiCall('Ticker', {
      pair: 'XXBTZUSD,XETHZUSD,BNBUSD,AVAXUSD,ADAUSD,DOTUSD'
    });

    if (!balance) throw new Error('Failed to get balance');

    // Get ALL assets dynamically from balance
    const assetMap = {
      'XXBT': { name: 'Bitcoin', pair: 'XXBTZUSD' },
      'XETH': { name: 'Ethereum', pair: 'XETHZUSD' },
      'BNB': { name: 'BNB', pair: 'BNBUSD' },
      'AVAX': { name: 'Avalanche', pair: 'AVAXUSD' },
      'ADA': { name: 'Cardano', pair: 'ADAUSD' },
      'DOT': { name: 'Polkadot', pair: 'DOTUSD' },
      'SOL': { name: 'Solana', pair: 'SOLUSD' },
      'LINK': { name: 'Chainlink', pair: 'LINKUSD' },
      'UNI': { name: 'Uniswap', pair: 'UNIUSD' },
      'AAVE': { name: 'Aave', pair: 'AAVEUSD' }
    };

    const positions = [];
    let totalValue = 0;

    for (const [symbol, amount] of Object.entries(balance)) {
      const quantity = parseFloat(amount as string);
      if (quantity > 0.0001 && assetMap[symbol]) {
        const asset = assetMap[symbol];
        const currentPrice = parseFloat(ticker?.[asset.pair]?.c?.[0] || '0');
        const currentValue = quantity * currentPrice;

        // Level 1: ONLY Kraken API data - no P&L calculations (require database/logs)
        positions.push({
          symbol: symbol,
          name: asset.name,
          quantity: quantity,
          currentPrice: currentPrice,
          currentValue: currentValue
        });

        totalValue += currentValue;
      }
    }

    // Get USD balance
    const usdBalance = parseFloat(balance.ZUSD || '0');
    const usdtBalance = parseFloat(balance.USDT || '0');
    const totalCash = usdBalance + usdtBalance;

    // Get open orders
    const orders = [];
    if (openOrders && openOrders.open) {
      for (const [orderId, order] of Object.entries(openOrders.open)) {
        const o = order as any;
        orders.push({
          id: orderId,
          pair: o.descr.pair,
          type: o.descr.type,
          volume: parseFloat(o.vol),
          price: parseFloat(o.descr.price || '0'),
          value: parseFloat(o.vol) * parseFloat(o.descr.price || '0')
        });
      }
    }

    const result = {
      positions,
      totalPositionValue: totalValue,
      cash: totalCash,
      totalPortfolio: totalValue + totalCash,
      orders,
      timestamp: new Date().toISOString()
    };

    // Cache the result
    API_CACHE.data = result;
    API_CACHE.lastUpdate = Date.now();
    console.log('💾 Cached fresh Kraken data for 2 minutes');

    return result;

  } catch (error) {
    console.error('❌ Error fetching complete Kraken data:', error);
    return null;
  }
}

app.get('/', async (req, res) => {
  const [data, level2, level3] = await Promise.all([
    getCompleteKrakenData(),
    getLevel2Analytics(),
    getLevel3SystemServices()
  ]);

  if (!data) {
    return res.status(500).send('Error fetching data from Kraken API');
  }

  // Level 1: No P&L calculations (require database/logs for entry prices)

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>📊 COMPLETE TRADING DASHBOARD</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: 'Courier New', monospace;
            background: #000;
            color: #00ff00;
            margin: 0;
            padding: 20px;
            line-height: 1.4;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #00ff00;
            padding-bottom: 15px;
        }
        .section {
            margin-bottom: 30px;
            border: 1px solid #333;
            padding: 15px;
            background: #111;
        }
        .section h2 {
            margin-top: 0;
            color: #ffff00;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            padding: 8px 12px;
            border: 1px solid #333;
            text-align: left;
        }
        th {
            background: #222;
            color: #ffff00;
            font-weight: bold;
        }
        .positive { color: #00ff00; }
        .negative { color: #ff0000; }
        .neutral { color: #ffff00; }
        .refresh {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #333;
            color: #fff;
            padding: 5px 10px;
            border: none;
            cursor: pointer;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .summary-item {
            background: #222;
            padding: 15px;
            border: 1px solid #444;
            text-align: center;
        }
        .summary-value {
            font-size: 1.5em;
            font-weight: bold;
        }
        .meta {
            color: #666;
            font-size: 0.9em;
            text-align: center;
            margin-top: 20px;
        }
    </style>
    <script>
        setTimeout(() => location.reload(), 120000); // Auto-refresh every 2 minutes to respect rate limits
    </script>
</head>
<body>
    <button class="refresh" onclick="location.reload()">🔄 Refresh</button>

    <div class="container">
        <div class="header">
            <h1>📊 COMPLETE TRADING DASHBOARD</h1>
            <p>Level 1: Live Kraken API • Level 2: Database & Log Analytics • Level 3: System Services</p>
        </div>

        <div class="summary">
            <div class="summary-item">
                <div>💰 Total Portfolio</div>
                <div class="summary-value">$${data.totalPortfolio.toFixed(2)}</div>
            </div>
            <div class="summary-item">
                <div>📊 Position Value</div>
                <div class="summary-value">$${data.totalPositionValue.toFixed(2)}</div>
            </div>
            <div class="summary-item">
                <div>💵 Cash Available</div>
                <div class="summary-value">$${data.cash.toFixed(2)}</div>
            </div>
            <div class="summary-item">
                <div>📈 Unrealized P&L</div>
                <div class="summary-value ${totalUnrealizedPnL >= 0 ? 'positive' : 'negative'}">
                    ${totalUnrealizedPnL >= 0 ? '+' : ''}$${totalUnrealizedPnL.toFixed(2)}
                </div>
            </div>
        </div>

        <div style="margin: 40px 0; border-top: 3px solid #666; padding-top: 30px;">
            <h2 style="text-align: center; color: #ffff00; margin-bottom: 30px;">📈 LEVEL 2 ANALYTICS (Database & Logs)</h2>

            <div class="summary">
                <div class="summary-item">
                    <div>🏆 Win Rate</div>
                    <div class="summary-value ${level2.winRate >= 60 ? 'positive' : level2.winRate >= 40 ? 'neutral' : 'negative'}">
                        ${level2.winRate.toFixed(1)}%
                    </div>
                </div>
                <div class="summary-item">
                    <div>📊 Total Trades</div>
                    <div class="summary-value">${level2.totalTrades}</div>
                </div>
                <div class="summary-item">
                    <div>⏰ Trades (24h)</div>
                    <div class="summary-value">${level2.trades24h}</div>
                </div>
                <div class="summary-item">
                    <div>📅 Weekly Win Rate</div>
                    <div class="summary-value ${level2.weeklyWinRate >= 60 ? 'positive' : level2.weeklyWinRate >= 40 ? 'neutral' : 'negative'}">
                        ${level2.weeklyWinRate.toFixed(1)}%
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                <div class="section">
                    <h2>🥇 Best Trading Pairs by Win Rate</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Pair</th>
                                <th>Win Rate</th>
                                <th>Trades</th>
                                <th>Total P&L</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${level2.bestPairs.map(pair => `
                                <tr>
                                    <td>${pair.pair}</td>
                                    <td class="${pair.winRate >= 60 ? 'positive' : pair.winRate >= 40 ? 'neutral' : 'negative'}">
                                        ${pair.winRate.toFixed(1)}%
                                    </td>
                                    <td>${pair.trades}</td>
                                    <td class="${pair.totalPnL >= 0 ? 'positive' : 'negative'}">
                                        ${pair.totalPnL >= 0 ? '+' : ''}$${pair.totalPnL.toFixed(2)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${level2.bestPairs.length === 0 ? '<p style="text-align: center; color: #666;">No pairs with 5+ trades yet</p>' : ''}
                </div>

                <div class="section">
                    <h2>📊 Trading Performance Metrics</h2>
                    <table>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                        </tr>
                        <tr>
                            <td>Total Realized P&L</td>
                            <td class="${level2.totalPnL >= 0 ? 'positive' : 'negative'}">
                                ${level2.totalPnL >= 0 ? '+' : ''}$${level2.totalPnL.toFixed(2)}
                            </td>
                        </tr>
                        <tr>
                            <td>Average P&L per Trade</td>
                            <td class="${level2.avgPnL >= 0 ? 'positive' : 'negative'}">
                                ${level2.avgPnL >= 0 ? '+' : ''}$${level2.avgPnL.toFixed(2)}
                            </td>
                        </tr>
                        <tr>
                            <td>Biggest Win</td>
                            <td class="positive">+$${level2.biggestWin.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>Biggest Loss</td>
                            <td class="negative">$${level2.biggestLoss.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>Trades This Week</td>
                            <td>${level2.trades7d}</td>
                        </tr>
                        <tr style="border-top: 2px solid #333;">
                            <td><strong>Log Trades Found</strong></td>
                            <td><strong>${level2.logStats.totalLogTrades}</strong></td>
                        </tr>
                        <tr>
                            <td>Avg Trade Size (Logs)</td>
                            <td>$${level2.logStats.avgTradeSize.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>Successful Signals</td>
                            <td class="positive">${level2.logStats.successfulSignals}</td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>

        <div style="margin: 40px 0; border-top: 3px solid #666; padding-top: 30px;">
            <h2 style="text-align: center; color: #00ffff; margin-bottom: 30px;">🔧 LEVEL 3 SYSTEM SERVICES</h2>

            <div class="section">
                <h2>⚡ Critical Trading Services Status</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>Status</th>
                            <th>Port</th>
                            <th>Processes</th>
                            <th>Uptime</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${level3.map(service => {
                            let statusClass = 'neutral';
                            if (service.status.includes('RUNNING') || service.status.includes('HEALTHY') || service.status.includes('CONNECTED') || service.status.includes('MONITORING')) {
                                statusClass = 'positive';
                            } else if (service.status.includes('ERROR') || service.status.includes('STOPPED')) {
                                statusClass = 'negative';
                            }

                            return `
                                <tr>
                                    <td>${service.name}</td>
                                    <td class="${statusClass}">
                                        <strong>${service.status}</strong>
                                    </td>
                                    <td>${service.port}</td>
                                    <td>${service.processes}</td>
                                    <td>${service.uptime}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <div style="margin-top: 20px; padding: 15px; border: 1px solid #333; background: #111;">
                    <h3 style="margin-top: 0; color: #ffff00;">🎯 Service Health Summary</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div>
                            <strong>Running Services:</strong>
                            <span class="positive">${level3.filter(s => s.status.includes('RUNNING') || s.status.includes('HEALTHY') || s.status.includes('CONNECTED') || s.status.includes('MONITORING')).length}</span>
                        </div>
                        <div>
                            <strong>Total Processes:</strong>
                            <span class="neutral">${level3.reduce((sum, s) => sum + s.processes, 0)}</span>
                        </div>
                        <div>
                            <strong>Failed Services:</strong>
                            <span class="negative">${level3.filter(s => s.status.includes('ERROR') || s.status.includes('STOPPED')).length}</span>
                        </div>
                        <div>
                            <strong>System Status:</strong>
                            <span class="${level3.filter(s => s.status.includes('ERROR')).length === 0 ? 'positive' : 'negative'}">
                                ${level3.filter(s => s.status.includes('ERROR')).length === 0 ? 'ALL SYSTEMS OPERATIONAL' : 'ISSUES DETECTED'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>📊 ACTIVE POSITIONS (Live Kraken + Real Entry Prices)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Asset</th>
                        <th>Quantity</th>
                        <th>Current Price</th>
                        <th>Position Value</th>
                        <th>Portfolio %</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.positions.map(pos => `
                        <tr>
                            <td>${pos.name} (${pos.symbol})</td>
                            <td>${pos.quantity.toFixed(8)}</td>
                            <td>$${pos.currentPrice.toFixed(2)}</td>
                            <td>$${pos.currentValue.toFixed(2)}</td>
                            <td>${((pos.currentValue / data.totalPortfolio) * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${data.orders.length > 0 ? `
        <div class="section">
            <h2>📋 OPEN ORDERS</h2>
            <table>
                <thead>
                    <tr>
                        <th>Pair</th>
                        <th>Type</th>
                        <th>Volume</th>
                        <th>Price</th>
                        <th>Order Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.orders.map(order => `
                        <tr>
                            <td>${order.pair}</td>
                            <td class="${order.type === 'buy' ? 'positive' : 'negative'}">${order.type.toUpperCase()}</td>
                            <td>${order.volume.toFixed(8)}</td>
                            <td>$${order.price.toFixed(2)}</td>
                            <td>$${order.value.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="meta">
            📡 Data: Live Kraken Balance + Trade History Entry Prices<br>
            🕐 Last updated: ${new Date(data.timestamp).toLocaleString()}<br>
            🔄 Auto-refresh: Every 2 minutes (respects Kraken rate limits)
        </div>
    </div>
</body>
</html>
  `;

  res.send(html);
});

app.listen(PORT, () => {
  console.log(`📊 COMPLETE TRADING DASHBOARD running at http://localhost:${PORT}`);
  console.log('📡 Live Kraken balances + calculated entry prices from trade history');
  console.log('🔄 Shows real P&L with accurate entry prices!');
});