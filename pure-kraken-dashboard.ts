/**
 * Pure Kraken API Dashboard - No database dependency, only real-time Kraken data
 */

import express from 'express';

const app = express();
const PORT = 3004;

const KRAKEN_API_KEY = 'DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR';
const KRAKEN_PRIVATE_KEY = 'p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==';

interface KrakenBalance {
  [key: string]: string;
}

interface KrakenTicker {
  [key: string]: {
    c: [string, string]; // last price
  };
}

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

async function getPureKrakenData() {
  try {
    console.log('🔄 Fetching fresh data from Kraken API...');

    // Get all data in parallel
    const [balance, openOrders, ticker] = await Promise.all([
      krakenApiCall('Balance'),
      krakenApiCall('OpenOrders'),
      krakenApiCall('Ticker', {
        pair: 'XXBTZUSD,XETHZUSD,BNBUSD,AVAXUSD,ADAUSD,DOTUSD'
      })
    ]);

    if (!balance) throw new Error('Failed to get balance');

    // Define significant holdings (more than $10 worth roughly)
    const significantAssets = [
      { symbol: 'XXBT', name: 'Bitcoin', pair: 'XXBTZUSD' },
      { symbol: 'XETH', name: 'Ethereum', pair: 'XETHZUSD' },
      { symbol: 'BNB', name: 'BNB', pair: 'BNBUSD' },
      { symbol: 'AVAX', name: 'Avalanche', pair: 'AVAXUSD' },
      { symbol: 'ADA', name: 'Cardano', pair: 'ADAUSD' },
      { symbol: 'DOT', name: 'Polkadot', pair: 'DOTUSD' }
    ];

    const positions = [];
    let totalValue = 0;

    for (const asset of significantAssets) {
      const quantity = parseFloat(balance[asset.symbol] || '0');
      if (quantity > 0.001) { // Only show if we have meaningful amount
        const price = parseFloat(ticker?.[asset.pair]?.c?.[0] || '0');
        const value = quantity * price;

        positions.push({
          symbol: asset.symbol,
          name: asset.name,
          quantity: quantity,
          price: price,
          value: value
        });

        totalValue += value;
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
        orders.push({
          id: orderId,
          pair: (order as any).descr.pair,
          type: (order as any).descr.type,
          volume: parseFloat((order as any).vol),
          price: parseFloat((order as any).descr.price || '0'),
          value: parseFloat((order as any).vol) * parseFloat((order as any).descr.price || '0')
        });
      }
    }

    return {
      positions,
      totalPositionValue: totalValue,
      cash: totalCash,
      totalPortfolio: totalValue + totalCash,
      orders,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error fetching Kraken data:', error);
    return null;
  }
}

app.get('/', async (req, res) => {
  const data = await getPureKrakenData();

  if (!data) {
    return res.status(500).send('Error fetching data from Kraken API');
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>🔥 PURE KRAKEN API DASHBOARD</title>
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
        .container { max-width: 1200px; margin: 0 auto; }
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
            color: #00ff00;
        }
        .meta {
            color: #666;
            font-size: 0.9em;
            text-align: center;
            margin-top: 20px;
        }
    </style>
    <script>
        setTimeout(() => location.reload(), 30000); // Auto-refresh every 30 seconds
    </script>
</head>
<body>
    <button class="refresh" onclick="location.reload()">🔄 Refresh</button>

    <div class="container">
        <div class="header">
            <h1>🔥 PURE KRAKEN API DASHBOARD</h1>
            <p>Live data directly from Kraken API - No database sync issues!</p>
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
                <div>📈 Open Orders</div>
                <div class="summary-value">${data.orders.length}</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 LIVE POSITIONS (from Kraken Balance API)</h2>
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
                            <td>$${pos.price.toFixed(2)}</td>
                            <td>$${pos.value.toFixed(2)}</td>
                            <td>${((pos.value / data.totalPortfolio) * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${data.orders.length > 0 ? `
        <div class="section">
            <h2>📋 OPEN ORDERS (from Kraken OpenOrders API)</h2>
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
                            <td>${order.type.toUpperCase()}</td>
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
            📡 Data source: Live Kraken API calls<br>
            🕐 Last updated: ${new Date(data.timestamp).toLocaleString()}<br>
            🔄 Auto-refresh: Every 30 seconds
        </div>
    </div>
</body>
</html>
  `;

  res.send(html);
});

app.listen(PORT, () => {
  console.log(`🔥 PURE KRAKEN API DASHBOARD running at http://localhost:${PORT}`);
  console.log('📡 Pulling data directly from Kraken API - no database sync issues!');
  console.log('🔄 Auto-refreshes every 30 seconds with live data');
});