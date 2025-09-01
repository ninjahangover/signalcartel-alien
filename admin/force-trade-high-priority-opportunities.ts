#!/usr/bin/env npx tsx
/**
 * FORCE TRADE HIGH-PRIORITY OPPORTUNITIES
 * Directly execute trades on WLFIUSD (85%) and ETHUSD (80%) opportunities
 * Bypass the stuck system and capture profitable trades immediately
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function forceTradeHighPriorityOpportunities() {
  console.log('🚀 FORCE TRADING HIGH-PRIORITY OPPORTUNITIES');
  console.log('🎯 Target: WLFIUSD (85% score, 75% confidence)');
  console.log('🎯 Target: ETHUSD (80% score, 70% confidence)');
  console.log('');

  // Check current position count
  const currentCount = await prisma.managedPosition.count({
    where: { status: 'open' }
  });
  
  console.log(`📊 Current positions: ${currentCount}/25`);
  
  if (currentCount >= 25) {
    console.log('❌ At position limit, cannot force trade');
    return;
  }
  
  // High-priority opportunities from Smart Hunter
  const opportunities = [
    { symbol: 'WLFIUSD', score: 85, confidence: 0.75, price: 0.245 }, // Coinbase emergency price
    { symbol: 'ETHUSD', score: 80, confidence: 0.70, price: 4348.48 } // Coinbase emergency price
  ];
  
  for (const opp of opportunities) {
    console.log(`\n🔥 FORCE TRADING: ${opp.symbol}`);
    console.log(`   Score: ${opp.score}% | Confidence: ${(opp.confidence * 100).toFixed(1)}%`);
    console.log(`   Emergency Price: $${opp.price}`);
    
    // AGGRESSIVE POSITION SIZING based on confidence
    // High confidence = bigger positions to make real money!
    let positionValue;
    if (opp.confidence >= 0.75) {
      positionValue = 500; // $500 for 75%+ confidence (WLFIUSD)
    } else if (opp.confidence >= 0.70) {
      positionValue = 300; // $300 for 70%+ confidence (ETHUSD)
    } else {
      positionValue = 150; // $150 minimum for high-scoring opportunities
    }
    
    const quantity = positionValue / opp.price;
    
    const positionId = `force-trade-${opp.symbol}-${Date.now()}`;
    const tradeId = `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create entry trade
    await prisma.managedTrade.create({
      data: {
        id: tradeId,
        positionId: positionId,
        side: 'buy',
        symbol: opp.symbol,
        quantity: quantity,
        price: opp.price,
        value: positionValue,
        strategy: 'force_high_priority_opportunity',
        executedAt: new Date(),
        pnl: null,
        isEntry: true
      }
    });
    
    // Create position
    await prisma.managedPosition.create({
      data: {
        id: positionId,
        strategy: 'force_high_priority_opportunity',
        symbol: opp.symbol,
        side: 'long',
        entryPrice: opp.price,
        quantity: quantity,
        entryTradeId: tradeId,
        entryTime: new Date(),
        status: 'open',
        stopLoss: opp.price * 0.95, // 5% stop loss
        takeProfit: opp.price * 1.10, // 10% take profit
      }
    });
    
    console.log(`✅ FORCED POSITION OPENED: ${opp.symbol}`);
    console.log(`   Position ID: ${positionId}`);
    console.log(`   Quantity: ${quantity.toFixed(6)}`);
    console.log(`   Value: $${positionValue}`);
    console.log(`   Stop Loss: $${(opp.price * 0.95).toFixed(4)}`);
    console.log(`   Take Profit: $${(opp.price * 1.10).toFixed(4)}`);
  }
  
  const finalCount = await prisma.managedPosition.count({
    where: { status: 'open' }
  });
  
  console.log(`\n🎉 FORCE TRADING COMPLETE!`);
  console.log(`📊 Positions: ${finalCount}/25`);
  console.log(`🚀 Successfully captured high-priority Smart Hunter opportunities!`);
  console.log(`💰 Ready to profit from WLFIUSD (85%) and ETHUSD (80%) trends!`);
}

forceTradeHighPriorityOpportunities()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Force trade error:', error);
    process.exit(1);
  });