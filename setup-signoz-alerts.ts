#!/usr/bin/env node

// SigNoz Alert Setup for Trading Performance Monitoring
const SIGNOZ_URL = 'https://monitor.pixelraidersystems.com';

async function createTradingAlerts() {
  try {
    console.log('🚨 Creating SigNoz alerts for trading performance...');

    // Alert 1: Session P&L drops below -$25
    const pnlAlert = {
      alert: "trading_session_loss",
      expr: 'sum(rate(trading_pnl_total[5m])) < -25',
      for: '2m',
      labels: {
        severity: 'warning',
        service: 'quantum-forge-trading'
      },
      annotations: {
        summary: 'Trading session losing money',
        description: 'Session P&L has dropped below -$25. Consider tuning parameters.'
      }
    };

    // Alert 2: Win rate drops below 65%
    const winRateAlert = {
      alert: "low_win_rate",
      expr: 'trading_win_rate < 0.65',
      for: '5m',
      labels: {
        severity: 'warning',
        service: 'quantum-forge-trading'
      },
      annotations: {
        summary: 'Win rate dropping',
        description: 'Trading win rate has fallen below 65%. Mathematical Intuition may need tuning.'
      }
    };

    // Alert 3: System stopped trading (no new trades in 10 minutes)
    const inactivityAlert = {
      alert: "trading_system_inactive",
      expr: 'increase(trading_trades_total[10m]) == 0',
      for: '10m',
      labels: {
        severity: 'critical',
        service: 'quantum-forge-trading'
      },
      annotations: {
        summary: 'Trading system inactive',
        description: 'No new trades detected in 10+ minutes. System may be stuck.'
      }
    };

    const alerts = [pnlAlert, winRateAlert, inactivityAlert];

    for (const alert of alerts) {
      console.log(`📊 Creating alert: ${alert.alert}`);
      
      const response = await fetch(`${SIGNOZ_URL}/api/v1/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert)
      });

      if (response.ok) {
        console.log(`✅ Alert ${alert.alert} created successfully`);
      } else {
        console.error(`❌ Failed to create alert ${alert.alert}:`, response.status);
        const error = await response.text();
        console.error('Response:', error);
      }
    }

    console.log('🎯 SigNoz alerts setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up SigNoz alerts:', error);
  }
}

createTradingAlerts();