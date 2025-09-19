#!/usr/bin/env node

import { krakenApiService } from './src/lib/kraken-api-service';

async function checkRealKrakenStatus() {
  try {
    console.log('🔍 CHECKING REAL KRAKEN ACCOUNT STATUS (DIRECT API)\n');

    // Get real account balance
    console.log('💰 ACCOUNT BALANCE:');
    console.log('='.repeat(60));
    const balance = await krakenApiService.getAccountBalance();

    for (const [asset, amount] of Object.entries(balance)) {
      if (parseFloat(amount) > 0.001) { // Only show non-zero balances
        console.log(`${asset}: ${amount}`);
      }
    }

    // Get real open orders
    console.log('\n📋 OPEN ORDERS:');
    console.log('='.repeat(60));
    const openOrders = await krakenApiService.getOpenOrders();

    if (Object.keys(openOrders).length === 0) {
      console.log('✅ No open orders');
    } else {
      for (const [orderId, order] of Object.entries(openOrders)) {
        console.log(`${orderId}: ${order.descr.type} ${order.vol} ${order.descr.pair} @ ${order.descr.price || 'market'}`);
      }
    }

    // Get recent trades (last 10)
    console.log('\n📈 RECENT TRADES (Last 10):');
    console.log('='.repeat(60));
    const trades = await krakenApiService.getTradesHistory({ count: 10 });

    if (Object.keys(trades.trades).length === 0) {
      console.log('✅ No recent trades');
    } else {
      // Sort by time (most recent first)
      const sortedTrades = Object.entries(trades.trades).sort(([,a], [,b]) => b.time - a.time);

      for (const [tradeId, trade] of sortedTrades) {
        const date = new Date(trade.time * 1000).toISOString();
        console.log(`${trade.pair}: ${trade.type} ${trade.vol} @ $${trade.price} | Fee: $${trade.fee} | ${date}`);
      }
    }

    // Get trade balance summary
    console.log('\n📊 TRADE BALANCE SUMMARY:');
    console.log('='.repeat(60));
    const tradeBalance = await krakenApiService.getTradeBalance();

    console.log(`Equivalent Balance: $${parseFloat(tradeBalance.eb).toFixed(2)}`);
    console.log(`Trade Balance: $${parseFloat(tradeBalance.tb).toFixed(2)}`);
    console.log(`Margin: $${parseFloat(tradeBalance.m || '0').toFixed(2)}`);
    console.log(`Unrealized P&L: $${parseFloat(tradeBalance.n || '0').toFixed(2)}`);
    console.log(`Cost Basis: $${parseFloat(tradeBalance.c || '0').toFixed(2)}`);
    console.log(`Floating Valuation: $${parseFloat(tradeBalance.v || '0').toFixed(2)}`);
    console.log(`Equity: $${parseFloat(tradeBalance.e || '0').toFixed(2)}`);
    console.log(`Free Margin: $${parseFloat(tradeBalance.mf || '0').toFixed(2)}`);

    console.log('\n✅ Real Kraken status check complete');

  } catch (error) {
    console.error('❌ Error checking Kraken status:', error);
  }
}

checkRealKrakenStatus();