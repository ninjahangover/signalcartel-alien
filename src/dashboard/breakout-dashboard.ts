import express from 'express';
import { PrismaClient } from '@prisma/client';
import { BREAKOUT_CONFIG } from '../../breakout-config';
import { drawdownCalculator } from '../lib/breakout-drawdown-calculator';
import { tradingAssistant } from '../lib/manual-trading-assistant';
import chalk from 'chalk';

const app = express();
const prisma = new PrismaClient();
const PORT = BREAKOUT_CONFIG.DASHBOARD_PORT;

app.use(express.static('public'));
app.use(express.json());

// CORS for localhost
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Main dashboard page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Breakout Evaluation Dashboard</title>
        <style>
            body {
                font-family: 'Courier New', monospace;
                background: #0a0e15;
                color: #00ff88;
                margin: 0;
                padding: 20px;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #00ff88;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .status-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 30px;
            }
            .card {
                background: #1a1f2b;
                border: 1px solid #00ff88;
                border-radius: 8px;
                padding: 20px;
            }
            .metric {
                margin: 10px 0;
                display: flex;
                justify-content: space-between;
            }
            .green { color: #00ff88; }
            .red { color: #ff3366; }
            .yellow { color: #ffaa00; }
            .progress-bar {
                width: 100%;
                height: 20px;
                background: #333;
                border-radius: 10px;
                overflow: hidden;
                margin: 10px 0;
            }
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #00ff88, #00cc66);
                transition: width 0.3s ease;
            }
            .warning {
                background: #ff3366;
                color: white;
                padding: 10px;
                border-radius: 5px;
                margin: 10px 0;
                text-align: center;
                font-weight: bold;
            }
            .safe {
                background: #00ff88;
                color: #0a0e15;
                padding: 10px;
                border-radius: 5px;
                margin: 10px 0;
                text-align: center;
                font-weight: bold;
            }
        </style>
        <script>
            function updateDashboard() {
                fetch('/api/status')
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('current-equity').textContent = '$' + data.currentEquity.toFixed(2);
                        document.getElementById('total-pnl').textContent =
                            (data.totalPnL >= 0 ? '+' : '') + '$' + data.totalPnL.toFixed(2);
                        document.getElementById('daily-pnl').textContent =
                            (data.dailyPnL >= 0 ? '+' : '') + '$' + data.dailyPnL.toFixed(2);

                        document.getElementById('daily-remaining').textContent = '$' + data.dailyLossRemaining.toFixed(2);
                        document.getElementById('drawdown-remaining').textContent = '$' + data.maxDrawdownRemaining.toFixed(2);

                        // Progress bars
                        const profitProgress = (data.totalPnL / 500) * 100;
                        document.getElementById('profit-progress').style.width = Math.max(0, Math.min(100, profitProgress)) + '%';

                        // Status indicator
                        const statusEl = document.getElementById('status-indicator');
                        if (data.riskStatus === 'BREACHED') {
                            statusEl.className = 'warning';
                            statusEl.textContent = '🚨 EVALUATION BREACHED - TRADING STOPPED';
                        } else if (data.riskStatus === 'CRITICAL') {
                            statusEl.className = 'warning';
                            statusEl.textContent = '⚠️ CRITICAL - APPROACHING LIMITS';
                        } else if (data.riskStatus === 'WARNING') {
                            statusEl.className = 'warning';
                            statusEl.textContent = '⚠️ WARNING - MONITOR CLOSELY';
                        } else {
                            statusEl.className = 'safe';
                            statusEl.textContent = '✅ SAFE - TRADING ALLOWED';
                        }
                    })
                    .catch(error => {
                        console.error('Dashboard update failed:', error);
                    });
            }

            // Update every 5 seconds
            setInterval(updateDashboard, 5000);
            updateDashboard(); // Initial load
        </script>
    </head>
    <body>
        <div class="header">
            <h1>🎯 BREAKOUT EVALUATION DASHBOARD</h1>
            <h2>$5,000 Challenge • 1-Step Evaluation</h2>
        </div>

        <div id="status-indicator" class="safe">
            ✅ SAFE - TRADING ALLOWED
        </div>

        <div class="status-grid">
            <div class="card">
                <h3>💰 ACCOUNT STATUS</h3>
                <div class="metric">
                    <span>Current Equity:</span>
                    <span id="current-equity" class="green">$5,000.00</span>
                </div>
                <div class="metric">
                    <span>Total P&L:</span>
                    <span id="total-pnl" class="green">$0.00</span>
                </div>
                <div class="metric">
                    <span>Daily P&L:</span>
                    <span id="daily-pnl" class="green">$0.00</span>
                </div>

                <h4>🎯 Profit Target Progress</h4>
                <div class="progress-bar">
                    <div id="profit-progress" class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="metric">
                    <span>Target:</span>
                    <span>$500 (10%)</span>
                </div>
            </div>

            <div class="card">
                <h3>⚠️ RISK LIMITS</h3>
                <div class="metric">
                    <span>Daily Loss Remaining:</span>
                    <span id="daily-remaining" class="green">$200.00</span>
                </div>
                <div class="metric">
                    <span>Drawdown Remaining:</span>
                    <span id="drawdown-remaining" class="green">$300.00</span>
                </div>
                <div class="metric">
                    <span>Next Reset:</span>
                    <span class="yellow">00:30 UTC Tomorrow</span>
                </div>

                <h4>📊 Rules Reminder</h4>
                <div style="font-size: 12px; color: #888;">
                    • Max Daily Loss: 4% ($200)
                    • Max Drawdown: 6% ($300)
                    • Based on EQUITY (includes floating P&L)
                    • Daily reset: 00:30 UTC
                </div>
            </div>
        </div>

        <div class="card">
            <h3>🔍 SYSTEM INFO</h3>
            <div class="metric">
                <span>Evaluation System:</span>
                <span class="green">Port 3005 (Separate from main)</span>
            </div>
            <div class="metric">
                <span>Main System:</span>
                <span class="yellow">Port 3004 (Unaffected)</span>
            </div>
            <div class="metric">
                <span>Database Schema:</span>
                <span>breakout_eval</span>
            </div>
            <div class="metric">
                <span>Logs:</span>
                <span>/tmp/breakout-logs/</span>
            </div>
        </div>
    </body>
    </html>
  `);
});

// API endpoint for dashboard data
app.get('/api/status', async (req, res) => {
  try {
    const status = await drawdownCalculator.calculateDrawdownStatus();

    res.json({
      currentEquity: status.currentEquity,
      currentBalance: status.currentBalance,
      totalPnL: status.currentEquity - status.startingBalance,
      dailyPnL: status.currentDailyPnL,
      dailyLossRemaining: status.dailyLossRemaining,
      maxDrawdownRemaining: status.maxDrawdownRemaining,
      profitTarget: 500,
      riskStatus: status.breachType === 'NONE' ?
        (status.dailyLossRemaining < 50 || status.maxDrawdownRemaining < 50) ? 'CRITICAL' :
        (status.dailyLossRemaining < 100 || status.maxDrawdownRemaining < 100) ? 'WARNING' : 'SAFE'
        : 'BREACHED',
      canTrade: status.canTrade,
      nextReset: status.nextResetTime
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Breakout dashboard running',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(chalk.cyan(`🎯 Breakout Evaluation Dashboard started on port ${PORT}`));
  console.log(chalk.green(`📊 Dashboard: http://localhost:${PORT}`));
  console.log(chalk.dim(`🔧 API: http://localhost:${PORT}/api/status`));
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log(chalk.yellow('Shutting down dashboard...'));
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('Shutting down dashboard...'));
  process.exit(0);
});