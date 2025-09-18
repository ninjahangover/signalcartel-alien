/**
 * SIMPLE BALANCE DASHBOARD - Just shows Kraken account balance
 * No complicated methods, just raw balance data
 */

import express from 'express';
import axios from 'axios';

const app = express();

// Hardcoded credentials that work
const KRAKEN_API_KEY = 'DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR';
const KRAKEN_PRIVATE_KEY = 'p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==';

// Simple function to get balance
async function getKrakenBalance() {
  try {
    const response = await axios.post('http://localhost:3002/api/kraken-proxy', {
      endpoint: 'Balance',
      params: {},
      apiKey: KRAKEN_API_KEY,
      apiSecret: KRAKEN_PRIVATE_KEY
    });

    return response.data.result || {};
  } catch (error) {
    console.error('Failed to get balance:', error.message);
    return {};
  }
}

// Get direct portfolio value from Kraken TradeBalance API
async function getTradeBalance() {
  try {
    const response = await axios.post('http://localhost:3002/api/kraken-proxy', {
      endpoint: 'TradeBalance',
      params: {},
      apiKey: KRAKEN_API_KEY,
      apiSecret: KRAKEN_PRIVATE_KEY
    });

    if (response.data.result && response.data.result.eb) {
      return parseFloat(response.data.result.eb);
    }
    throw new Error('No TradeBalance result');
  } catch (error) {
    console.error('TradeBalance failed:', error.message);
    return null;
  }
}

// Calculate portfolio value (fallback method)
async function calculatePortfolioValue(balances: any) {
  let totalValue = 0;

  for (const [asset, balance] of Object.entries(balances)) {
    const bal = parseFloat(balance as string);
    if (bal <= 0) continue;

    if (asset === 'ZUSD') {
      totalValue += bal;
    } else if (asset === 'USDT') {
      totalValue += bal; // USDT = $1.00
    } else {
      // Get price for crypto assets
      try {
        let symbol = asset;
        if (asset === 'XXBT') symbol = 'XBTUSD';
        else if (asset === 'XETH') symbol = 'XETHUSD';
        else if (asset === 'ADA') symbol = 'ADAUSD';
        else if (asset === 'DOT') symbol = 'DOTUSD';
        else if (asset === 'AVAX') symbol = 'AVAXUSD';
        else if (asset === 'BNB') symbol = 'BNBUSD';
        else symbol = asset + 'USD';

        const priceResponse = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${symbol}`);
        if (priceResponse.data.result && priceResponse.data.result[symbol]) {
          const price = parseFloat(priceResponse.data.result[symbol].c[0]);
          totalValue += bal * price;
        }
      } catch (error) {
        console.log(`Could not get price for ${asset}`);
      }
    }
  }

  return totalValue;
}

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Simple Balance Dashboard</title>
    <style>
        body { font-family: monospace; background: #000; color: #0f0; padding: 20px; }
        .balance { margin: 10px 0; }
        .total { font-size: 24px; color: #ff0; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>📊 Simple Kraken Balance Dashboard</h1>
    <div id="data">Loading...</div>

    <script>
        async function loadData() {
            try {
                const response = await fetch('/api/balance');
                const data = await response.json();

                let html = '<div class="total">Total Portfolio: $' + data.total.toFixed(2) + '</div>';
                html += '<h3>Individual Balances:</h3>';

                for (const [asset, balance] of Object.entries(data.balances)) {
                    if (parseFloat(balance) > 0) {
                        html += '<div class="balance">' + asset + ': ' + balance + '</div>';
                    }
                }

                document.getElementById('data').innerHTML = html;
            } catch (error) {
                document.getElementById('data').innerHTML = 'Error loading data: ' + error.message;
            }
        }

        loadData();
        setInterval(loadData, 30000);
    </script>
</body>
</html>
  `);
});

app.get('/api/balance', async (req, res) => {
  try {
    // Try TradeBalance API first for accurate portfolio value
    let total = await getTradeBalance();

    // Get balances for display
    const balances = await getKrakenBalance();

    // If TradeBalance failed, fallback to manual calculation
    if (total === null) {
      total = await calculatePortfolioValue(balances);
    }

    res.json({
      balances: balances,
      total: total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3005;
app.listen(PORT, () => {
  console.log(`✅ Simple Balance Dashboard running at http://localhost:${PORT}`);
  console.log('📊 Shows raw Kraken balance data - no complications');
});