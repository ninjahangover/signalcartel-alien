/**
 * REAL TRADER DASHBOARD - Shows actual trading data for position management
 * - Current positions from database
 * - Real-time P&L from Kraken API
 * - Open orders and pending trades
 * - Trading performance metrics
 * - Account balance and cash available
 */

import { PrismaClient } from '@prisma/client';
import * as http from 'http';
import * as url from 'url';

const prisma = new PrismaClient();

// Hardcoded credentials that work
const KRAKEN_API_KEY = 'DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR';
const KRAKEN_PRIVATE_KEY = 'p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==';

// Kraken API call function
async function krakenApiCall(endpoint: string, params: any = {}) {
  try {
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

// Get current positions from database
async function getCurrentPositions() {
  try {
    const positions = await prisma.managedPosition.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' }
    });

    // Get current prices for each position
    const positionsWithPnL = [];
    for (const pos of positions) {
      try {
        // Get current price from Kraken - map symbols correctly
        let krakenSymbol = pos.symbol;
        if (pos.symbol === 'BTCUSD') krakenSymbol = 'XXBTZUSD';
        if (pos.symbol === 'BNBUSD') krakenSymbol = 'BNBUSD';
        if (pos.symbol === 'AVAXUSD') krakenSymbol = 'AVAXUSD';
        if (pos.symbol === 'DOTUSD') krakenSymbol = 'DOTUSD';

        const tickerData = await krakenApiCall('Ticker', { pair: krakenSymbol });

        let currentPrice = 0;
        if (tickerData && tickerData[krakenSymbol]) {
          currentPrice = parseFloat(tickerData[krakenSymbol].c[0]);
        }

        // Calculate P&L
        const entryPrice = parseFloat(pos.entryPrice);
        const quantity = parseFloat(pos.quantity);
        const side = pos.side;

        let unrealizedPnL = 0;
        if (currentPrice > 0) {
          if (side === 'long' || side === 'BUY') {
            unrealizedPnL = (currentPrice - entryPrice) * quantity;
          } else {
            unrealizedPnL = (entryPrice - currentPrice) * quantity;
          }
        }

        positionsWithPnL.push({
          id: pos.id,
          symbol: pos.symbol,
          side: pos.side,
          quantity: quantity,
          entryPrice: entryPrice,
          currentPrice: currentPrice,
          unrealizedPnL: unrealizedPnL,
          pnlPercent: entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0,
          entryTime: pos.createdAt,
          marketValue: currentPrice * quantity
        });
      } catch (error) {
        console.error(`Failed to update position ${pos.symbol}:`, error.message);
      }
    }

    return positionsWithPnL;
  } catch (error) {
    console.error('Failed to get positions:', error);
    return [];
  }
}

// Get account balance
async function getAccountBalance() {
  const balanceData = await krakenApiCall('Balance');
  if (!balanceData) return { cash: 0, total: 0 };

  let usdBalance = 0;
  let usdtBalance = 0;

  if (balanceData.ZUSD) usdBalance = parseFloat(balanceData.ZUSD);
  if (balanceData.USDT) usdtBalance = parseFloat(balanceData.USDT);

  const totalCash = usdBalance + usdtBalance;

  // Get total portfolio value
  const tradeBalance = await krakenApiCall('TradeBalance');
  let totalPortfolioValue = totalCash;
  if (tradeBalance && tradeBalance.eb) {
    totalPortfolioValue = parseFloat(tradeBalance.eb);
  }

  return {
    cash: totalCash,
    total: totalPortfolioValue,
    usd: usdBalance,
    usdt: usdtBalance
  };
}

// Get open orders
async function getOpenOrders() {
  const ordersData = await krakenApiCall('OpenOrders');
  if (!ordersData || !ordersData.open) return [];

  const orders = [];
  for (const [orderId, order] of Object.entries(ordersData.open)) {
    orders.push({
      id: orderId,
      symbol: order.descr.pair,
      side: order.descr.type.toUpperCase(),
      orderType: order.descr.ordertype,
      quantity: parseFloat(order.vol),
      price: parseFloat(order.descr.price || order.descr.price2 || '0'),
      status: order.status,
      openTime: new Date(order.opentm * 1000)
    });
  }

  return orders;
}

// HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url!, true);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (parsedUrl.pathname === '/api/trading-data') {
    try {
      const [positions, balance, orders] = await Promise.all([
        getCurrentPositions(),
        getAccountBalance(),
        getOpenOrders()
      ]);

      const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
      const totalPositionValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        positions,
        balance,
        orders,
        summary: {
          totalPositions: positions.length,
          totalOrders: orders.length,
          totalUnrealizedPnL,
          totalPositionValue,
          cashAvailable: balance.cash,
          portfolioValue: balance.total
        },
        lastUpdate: new Date().toISOString()
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Serve HTML dashboard
  if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>Trading Dashboard</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            background: #000;
            color: #0f0;
            margin: 0;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0f0; padding-bottom: 20px; }
        .section {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #0f0;
            background: rgba(0, 255, 0, 0.05);
        }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .summary-item {
            padding: 15px;
            border: 1px solid #0f0;
            text-align: center;
            background: rgba(0, 255, 0, 0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            border: 1px solid #0f0;
            padding: 10px;
            text-align: left;
        }
        th { background: rgba(0, 255, 0, 0.2); }
        .positive { color: #0f0; }
        .negative { color: #f00; }
        .neutral { color: #ff0; }
        .loading { color: #ff0; text-align: center; padding: 50px; }
        .value { font-size: 1.2em; font-weight: bold; }
        .time { font-size: 0.9em; color: #888; }
        h1 { color: #0f0; }
        h2 { color: #0f0; border-bottom: 1px solid #0f0; padding-bottom: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>TRADING DASHBOARD</h1>
            <div class="time" id="lastUpdate">Loading...</div>
        </div>

        <div class="section">
            <h2>Portfolio Summary</h2>
            <div class="summary-grid" id="summary">
                <div class="loading">Loading portfolio data...</div>
            </div>
        </div>

        <div class="grid">
            <div class="section">
                <h2>Active Positions</h2>
                <div id="positions">
                    <div class="loading">Loading positions...</div>
                </div>
            </div>

            <div class="section">
                <h2>Open Orders</h2>
                <div id="orders">
                    <div class="loading">Loading orders...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        function formatCurrency(value) {
            return '$' + parseFloat(value).toFixed(2);
        }

        function formatPercent(value) {
            const color = value >= 0 ? 'positive' : 'negative';
            return '<span class="' + color + '">' + value.toFixed(2) + '%</span>';
        }

        function formatPnL(value) {
            const color = value >= 0 ? 'positive' : 'negative';
            const sign = value >= 0 ? '+' : '';
            return '<span class="' + color + '">' + sign + formatCurrency(value) + '</span>';
        }

        async function updateDashboard() {
            try {
                const response = await fetch('/api/trading-data');
                const data = await response.json();

                // Update summary
                const summaryHtml = \`
                    <div class="summary-item">
                        <div>Portfolio Value</div>
                        <div class="value">\${formatCurrency(data.summary.portfolioValue)}</div>
                    </div>
                    <div class="summary-item">
                        <div>Cash Available</div>
                        <div class="value">\${formatCurrency(data.summary.cashAvailable)}</div>
                    </div>
                    <div class="summary-item">
                        <div>Unrealized P&L</div>
                        <div class="value">\${formatPnL(data.summary.totalUnrealizedPnL)}</div>
                    </div>
                    <div class="summary-item">
                        <div>Active Positions</div>
                        <div class="value">\${data.summary.totalPositions}</div>
                    </div>
                    <div class="summary-item">
                        <div>Open Orders</div>
                        <div class="value">\${data.summary.totalOrders}</div>
                    </div>
                    <div class="summary-item">
                        <div>Position Value</div>
                        <div class="value">\${formatCurrency(data.summary.totalPositionValue)}</div>
                    </div>
                \`;
                document.getElementById('summary').innerHTML = summaryHtml;

                // Update positions table
                if (data.positions.length > 0) {
                    let positionsHtml = \`
                        <table>
                            <tr>
                                <th>Symbol</th>
                                <th>Side</th>
                                <th>Quantity</th>
                                <th>Entry Price</th>
                                <th>Current Price</th>
                                <th>Market Value</th>
                                <th>P&L</th>
                                <th>P&L %</th>
                                <th>Entry Time</th>
                            </tr>
                    \`;

                    data.positions.forEach(pos => {
                        positionsHtml += \`
                            <tr>
                                <td>\${pos.symbol}</td>
                                <td>\${pos.side.toUpperCase()}</td>
                                <td>\${pos.quantity.toFixed(6)}</td>
                                <td>\${formatCurrency(pos.entryPrice)}</td>
                                <td>\${formatCurrency(pos.currentPrice)}</td>
                                <td>\${formatCurrency(pos.marketValue)}</td>
                                <td>\${formatPnL(pos.unrealizedPnL)}</td>
                                <td>\${formatPercent(pos.pnlPercent)}</td>
                                <td>\${new Date(pos.entryTime).toLocaleString()}</td>
                            </tr>
                        \`;
                    });

                    positionsHtml += '</table>';
                    document.getElementById('positions').innerHTML = positionsHtml;
                } else {
                    document.getElementById('positions').innerHTML = '<div style="text-align: center; padding: 20px; color: #888;">No open positions</div>';
                }

                // Update orders table
                if (data.orders.length > 0) {
                    let ordersHtml = \`
                        <table>
                            <tr>
                                <th>Symbol</th>
                                <th>Side</th>
                                <th>Type</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Open Time</th>
                            </tr>
                    \`;

                    data.orders.forEach(order => {
                        ordersHtml += \`
                            <tr>
                                <td>\${order.symbol}</td>
                                <td>\${order.side}</td>
                                <td>\${order.orderType}</td>
                                <td>\${order.quantity.toFixed(6)}</td>
                                <td>\${formatCurrency(order.price)}</td>
                                <td>\${order.status}</td>
                                <td>\${new Date(order.openTime).toLocaleString()}</td>
                            </tr>
                        \`;
                    });

                    ordersHtml += '</table>';
                    document.getElementById('orders').innerHTML = ordersHtml;
                } else {
                    document.getElementById('orders').innerHTML = '<div style="text-align: center; padding: 20px; color: #888;">No open orders</div>';
                }

                // Update last update time
                document.getElementById('lastUpdate').textContent = 'Last updated: ' + new Date(data.lastUpdate).toLocaleString();

            } catch (error) {
                console.error('Failed to update dashboard:', error);
                document.getElementById('summary').innerHTML = '<div style="color: #f00; text-align: center;">Error loading data: ' + error.message + '</div>';
            }
        }

        // Update immediately and then every 10 seconds
        updateDashboard();
        setInterval(updateDashboard, 10000);
    </script>
</body>
</html>
    `);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = 3005;
server.listen(PORT, () => {
  console.log(`🎯 REAL Trading Dashboard running at http://localhost:${PORT}`);
  console.log('📊 Shows live positions, P&L, orders, and account balance');
  console.log('🔄 Updates every 10 seconds with real Kraken data');
});