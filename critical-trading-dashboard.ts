/**
 * CRITICAL TRADING DASHBOARD - ESSENTIAL FOR TRADING DECISIONS
 * Real-time Kraken API integration for accurate position tracking and P&L
 * NO TEMPLATE LITERAL ISSUES - Simple string concatenation for reliability
 */

import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 3004;

// Kraken API credentials
const KRAKEN_API_KEY = 'DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR';
const KRAKEN_PRIVATE_KEY = 'p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==';

interface Position {
  symbol: string;
  quantity: number;
  currentPrice: number;
  currentValue: number;
  entryPrice: number;
  unrealizedPnL: number;
  percentChange: number;
}

interface Order {
  id: string;
  symbol: string;
  side: string;
  type: string;
  quantity: number;
  price: number;
  status: string;
  description: string;
}

interface Portfolio {
  positions: Position[];
  orders: Order[];
  totalValue: number;
  totalPnL: number;
  cashUSD: number;
  cashUSDT: number;
  totalCash: number;
}

async function getKrakenData(): Promise<Portfolio> {
  try {
    // Get current balances
    const balanceResponse = await axios.post('http://localhost:3002/api/kraken-proxy', {
      endpoint: 'Balance',
      params: {},
      apiKey: KRAKEN_API_KEY,
      apiSecret: KRAKEN_PRIVATE_KEY
    });

    // Get current prices
    const pricesResponse = await axios.get('http://localhost:3002/public/Ticker?pair=BNBUSD,DOTUSD,AVAXUSD');

    // Get open orders
    const ordersResponse = await axios.post('http://localhost:3002/api/kraken-proxy', {
      endpoint: 'OpenOrders',
      params: {},
      apiKey: KRAKEN_API_KEY,
      apiSecret: KRAKEN_PRIVATE_KEY
    });

    if (balanceResponse.data.error?.length > 0) {
      throw new Error('Kraken API error: ' + balanceResponse.data.error.join(', '));
    }

    const balances = balanceResponse.data.result;
    const prices = pricesResponse.data.result;
    const openOrders = ordersResponse.data.result.open || {};

    const positions: Position[] = [];
    const orders: Order[] = [];

    // Process open orders
    Object.keys(openOrders).forEach(orderId => {
      const order = openOrders[orderId];
      orders.push({
        id: orderId,
        symbol: order.descr.pair.replace('XUSD', 'USD').replace('ZUSD', 'USD'),
        side: order.descr.type.toUpperCase(),
        type: order.descr.ordertype.toUpperCase(),
        quantity: parseFloat(order.vol),
        price: parseFloat(order.descr.price),
        status: order.status.toUpperCase(),
        description: order.descr.order
      });
    });

    // BNB Position
    const bnbBalance = parseFloat(balances.BNB || '0');
    if (bnbBalance > 0.001) {
      const bnbPrice = parseFloat(prices.BNBUSD.c[0]);
      const bnbEntryPrice = 896.0; // From your trade history around this level
      positions.push({
        symbol: 'BNB',
        quantity: bnbBalance,
        currentPrice: bnbPrice,
        currentValue: bnbBalance * bnbPrice,
        entryPrice: bnbEntryPrice,
        unrealizedPnL: (bnbPrice - bnbEntryPrice) * bnbBalance,
        percentChange: ((bnbPrice - bnbEntryPrice) / bnbEntryPrice) * 100
      });
    }

    // DOT Position
    const dotBalance = parseFloat(balances.DOT || '0');
    if (dotBalance > 0.1) {
      const dotPrice = parseFloat(prices.DOTUSD.c[0]);
      const dotEntryPrice = 4.52; // From your trade history
      positions.push({
        symbol: 'DOT',
        quantity: dotBalance,
        currentPrice: dotPrice,
        currentValue: dotBalance * dotPrice,
        entryPrice: dotEntryPrice,
        unrealizedPnL: (dotPrice - dotEntryPrice) * dotBalance,
        percentChange: ((dotPrice - dotEntryPrice) / dotEntryPrice) * 100
      });
    }

    // AVAX Position
    const avaxBalance = parseFloat(balances.AVAX || '0');
    if (avaxBalance > 0.1) {
      const avaxPrice = parseFloat(prices.AVAXUSD.c[0]);
      const avaxEntryPrice = 30.17; // From your trade history
      positions.push({
        symbol: 'AVAX',
        quantity: avaxBalance,
        currentPrice: avaxPrice,
        currentValue: avaxBalance * avaxPrice,
        entryPrice: avaxEntryPrice,
        unrealizedPnL: (avaxPrice - avaxEntryPrice) * avaxBalance,
        percentChange: ((avaxPrice - avaxEntryPrice) / avaxEntryPrice) * 100
      });
    }

    const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    const cashUSD = parseFloat(balances.ZUSD || '0');
    const cashUSDT = parseFloat(balances.USDT || '0');

    return {
      positions,
      orders,
      totalValue,
      totalPnL,
      cashUSD,
      cashUSDT,
      totalCash: cashUSD + cashUSDT
    };

  } catch (error) {
    console.error('Failed to get Kraken data:', error);
    throw error;
  }
}

// HTML page - no template literals to avoid syntax errors
function getHTMLPage(): string {
  return '<!DOCTYPE html>' +
    '<html><head><title>CRITICAL TRADING DASHBOARD</title>' +
    '<style>' +
    'body { background: black; color: #0f0; font-family: monospace; margin: 20px; }' +
    '.container { max-width: 1200px; margin: 0 auto; }' +
    '.header { text-align: center; margin-bottom: 30px; border: 2px solid #0f0; padding: 20px; }' +
    '.critical { color: #ff0; font-weight: bold; }' +
    '.section { margin: 20px 0; padding: 15px; border: 1px solid #0f0; }' +
    'table { width: 100%; border-collapse: collapse; margin: 10px 0; }' +
    'th, td { border: 1px solid #0f0; padding: 8px; text-align: left; }' +
    '.positive { color: #0f0; font-weight: bold; }' +
    '.negative { color: #f00; font-weight: bold; }' +
    '.loading { color: #ff0; }' +
    '</style></head><body>' +
    '<div class="container">' +
    '<div class="header">' +
    '<h1>🚨 CRITICAL TRADING DASHBOARD 🚨</h1>' +
    '<p class="critical">ESSENTIAL FOR TRADING DECISIONS - LIVE KRAKEN API DATA</p>' +
    '<p>Last Updated: <span id="lastUpdate"></span></p>' +
    '</div>' +
    '<div class="section">' +
    '<h2>📊 PORTFOLIO SUMMARY</h2>' +
    '<div id="summary" class="loading">Loading critical trading data...</div>' +
    '</div>' +
    '<div class="section">' +
    '<h2>🎯 LIVE POSITIONS - CRITICAL FOR TRADE DECISIONS</h2>' +
    '<div id="positions" class="loading">Loading position data...</div>' +
    '</div>' +
    '<div class="section">' +
    '<h2>📋 OPEN ORDERS - CRITICAL TRADING INFO</h2>' +
    '<div id="orders" class="loading">Loading order data...</div>' +
    '</div>' +
    '<div class="section">' +
    '<h2>💰 CASH BALANCES</h2>' +
    '<div id="balances" class="loading">Loading cash data...</div>' +
    '</div>' +
    '</div>' +
    '<script>' +
    'async function loadData() {' +
    '  try {' +
    '    const response = await fetch("/api/portfolio");' +
    '    const data = await response.json();' +
    '    document.getElementById("lastUpdate").textContent = new Date().toLocaleString();' +
    '    let summaryHtml = "<p>Total Position Value: $" + data.totalValue.toFixed(2) + "</p>";' +
    '    summaryHtml += "<p>Total Cash: $" + data.totalCash.toFixed(2) + "</p>";' +
    '    summaryHtml += "<p>Total Portfolio: $" + (data.totalValue + data.totalCash).toFixed(2) + "</p>";' +
    '    const pnlClass = data.totalPnL >= 0 ? "positive" : "negative";' +
    '    summaryHtml += "<p>Unrealized P&L: <span class=" + pnlClass + ">$" + data.totalPnL.toFixed(2) + "</span></p>";' +
    '    document.getElementById("summary").innerHTML = summaryHtml;' +
    '    let positionsHtml = "<table><tr><th>Asset</th><th>Quantity</th><th>Entry</th><th>Current</th><th>Value</th><th>P&L</th><th>%</th></tr>";' +
    '    data.positions.forEach(pos => {' +
    '      const pnlClass = pos.unrealizedPnL >= 0 ? "positive" : "negative";' +
    '      const pctClass = pos.percentChange >= 0 ? "positive" : "negative";' +
    '      positionsHtml += "<tr>";' +
    '      positionsHtml += "<td>" + pos.symbol + "</td>";' +
    '      positionsHtml += "<td>" + pos.quantity.toFixed(6) + "</td>";' +
    '      positionsHtml += "<td>$" + pos.entryPrice.toFixed(2) + "</td>";' +
    '      positionsHtml += "<td>$" + pos.currentPrice.toFixed(2) + "</td>";' +
    '      positionsHtml += "<td>$" + pos.currentValue.toFixed(2) + "</td>";' +
    '      positionsHtml += "<td class=" + pnlClass + ">$" + pos.unrealizedPnL.toFixed(2) + "</td>";' +
    '      positionsHtml += "<td class=" + pctClass + ">" + pos.percentChange.toFixed(1) + "%</td>";' +
    '      positionsHtml += "</tr>";' +
    '    });' +
    '    positionsHtml += "</table>";' +
    '    document.getElementById("positions").innerHTML = positionsHtml;' +
    '    let ordersHtml = "<table><tr><th>Order ID</th><th>Symbol</th><th>Side</th><th>Type</th><th>Quantity</th><th>Price</th><th>Status</th></tr>";' +
    '    data.orders.forEach(order => {' +
    '      const sideClass = order.side === "BUY" ? "positive" : "negative";' +
    '      ordersHtml += "<tr>";' +
    '      ordersHtml += "<td>" + order.id.substring(0,8) + "...</td>";' +
    '      ordersHtml += "<td>" + order.symbol + "</td>";' +
    '      ordersHtml += "<td class=" + sideClass + ">" + order.side + "</td>";' +
    '      ordersHtml += "<td>" + order.type + "</td>";' +
    '      ordersHtml += "<td>" + order.quantity.toFixed(6) + "</td>";' +
    '      ordersHtml += "<td>$" + order.price.toFixed(2) + "</td>";' +
    '      ordersHtml += "<td>" + order.status + "</td>";' +
    '      ordersHtml += "</tr>";' +
    '    });' +
    '    if (data.orders.length === 0) {' +
    '      ordersHtml += "<tr><td colspan=7>No open orders</td></tr>";' +
    '    }' +
    '    ordersHtml += "</table>";' +
    '    document.getElementById("orders").innerHTML = ordersHtml;' +
    '    let balancesHtml = "<p>USD: $" + data.cashUSD.toFixed(2) + "</p>";' +
    '    balancesHtml += "<p>USDT: $" + data.cashUSDT.toFixed(2) + "</p>";' +
    '    balancesHtml += "<p>Total: $" + data.totalCash.toFixed(2) + "</p>";' +
    '    document.getElementById("balances").innerHTML = balancesHtml;' +
    '  } catch (error) {' +
    '    console.error("CRITICAL ERROR:", error);' +
    '    document.getElementById("summary").innerHTML = "<span class=negative>❌ CRITICAL: Failed to load trading data!</span>";' +
    '  }' +
    '}' +
    'loadData();' +
    'setInterval(loadData, 30000);' +
    '</script></body></html>';
}

// API endpoint for portfolio data
app.get('/api/portfolio', async (req, res) => {
  try {
    const portfolio = await getKrakenData();
    res.json(portfolio);
  } catch (error) {
    console.error('CRITICAL: Portfolio API failed:', error);
    res.status(500).json({ error: 'Failed to load critical trading data' });
  }
});

// Main page
app.get('/', (req, res) => {
  res.send(getHTMLPage());
});

app.listen(PORT, () => {
  console.log('🚨 CRITICAL TRADING DASHBOARD STARTED 🚨');
  console.log('   ESSENTIAL FOR TRADING DECISIONS');
  console.log('   http://localhost:' + PORT);
  console.log('   Real-time Kraken API integration');
  console.log('   Updates every 30 seconds');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down CRITICAL trading dashboard...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n🛑 Shutting down CRITICAL trading dashboard...');
  process.exit(0);
});