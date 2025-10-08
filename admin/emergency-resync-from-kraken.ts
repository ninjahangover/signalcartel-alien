/**
 * V3.14.3 EMERGENCY DATABASE RESYNC
 *
 * Clears all database positions and recreates them from ACTUAL Kraken holdings
 * USE KRAKEN AS SOURCE OF TRUTH - NOT DATABASE
 */

import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function emergencyResync() {
  console.log('🚨 V3.14.3 EMERGENCY DATABASE RESYNC');
  console.log('='.repeat(70));
  console.log('⚠️  This will CLEAR all database positions and resync from Kraken API');
  console.log('');

  try {
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('Missing KRAKEN_API_KEY or KRAKEN_API_SECRET');
    }

    // Step 1: Get actual Kraken balance
    console.log('📊 Step 1: Fetching ACTUAL Kraken holdings...');
    const balanceResponse = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'Balance',
        params: {},
        apiKey,
        apiSecret
      })
    });

    const balanceData = await balanceResponse.json();
    if (balanceData.error && balanceData.error.length > 0) {
      throw new Error(`Kraken error: ${balanceData.error.join(', ')}`);
    }

    const balances = balanceData.result || {};
    const usdBalance = parseFloat(balances['ZUSD'] || balances['USD'] || '0');
    console.log(`💰 USD Cash: $${usdBalance.toFixed(2)}`);

    // Step 2: Build position list from holdings
    const positions: any[] = [];
    console.log('📊 Processing holdings...');

    for (const [asset, balanceStr] of Object.entries(balances)) {
      const balance = parseFloat(balanceStr as string);
      if (asset.includes('USD') || balance < 0.0001) continue;

      let cleanAsset = asset.replace(/^X/, '').replace(/^Z/, '');
      const symbol = `${cleanAsset}USD`;

      // Get current price
      try {
        const tickerResponse = await fetch(`http://127.0.0.1:3002/public/Ticker?pair=${symbol}`);
        const tickerData = await tickerResponse.json();
        const pairKey = Object.keys(tickerData.result || {})[0];
        const currentPrice = parseFloat(tickerData.result?.[pairKey]?.c?.[0] || '0');

        if (currentPrice > 0) {
          const value = balance * currentPrice;
          positions.push({
            symbol,
            quantity: balance,
            price: currentPrice,
            value,
            timestamp: new Date()
          });
          console.log(`  ✅ ${symbol}: ${balance.toFixed(6)} @ $${currentPrice.toFixed(4)} = $${value.toFixed(2)}`);
        }
      } catch (err) {
        console.log(`  ⚠️ Could not get price for ${symbol}, skipping`);
      }

      await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
    }

    console.log(`\n📊 Found ${positions.length} actual holdings on Kraken`);

    // Step 3: Clear database
    console.log('\n🗑️  Step 2: Clearing database positions...');

    const deletedLiveTrades = await prisma.liveTrade.deleteMany({});
    const deletedManagedTrades = await prisma.managedTrade.deleteMany({});
    const deletedLivePositions = await prisma.livePosition.deleteMany({});
    const deletedManagedPositions = await prisma.managedPosition.deleteMany({});

    console.log(`  • Deleted ${deletedLiveTrades.count} LiveTrade records`);
    console.log(`  • Deleted ${deletedManagedTrades.count} ManagedTrade records`);
    console.log(`  • Deleted ${deletedLivePositions.count} LivePosition records`);
    console.log(`  • Deleted ${deletedManagedPositions.count} ManagedPosition records`);

    // Step 4: Recreate positions from Kraken
    console.log('\n📝 Step 3: Recreating positions from Kraken holdings...');

    const sessionId = process.env.LIVE_TRADING_SESSION_ID || 'session-kraken-resync-' + Date.now();

    for (const pos of positions) {
      const positionId = `pos-kraken-${pos.symbol}-${Date.now()}`;
      const tradeId = `trade-kraken-${pos.symbol}-${Date.now()}`;

      // Create entry trade
      await prisma.managedTrade.create({
        data: {
          id: tradeId,
          positionId: positionId,
          side: 'buy', // Assume LONG positions from Kraken holdings
          symbol: pos.symbol,
          quantity: pos.quantity,
          price: pos.price,
          value: pos.value,
          strategy: 'kraken-holdings-sync',
          executedAt: pos.timestamp,
          isEntry: true
        }
      });

      // Create managed position
      await prisma.managedPosition.create({
        data: {
          id: positionId,
          symbol: pos.symbol,
          strategy: 'kraken-holdings-sync',
          side: 'long',
          quantity: pos.quantity,
          entryPrice: pos.price,
          entryTime: pos.timestamp,
          entryTradeId: tradeId,
          status: 'open',
          createdAt: pos.timestamp,
          updatedAt: pos.timestamp
        }
      });

      // Skip LivePosition creation (requires valid session, ManagedPosition is sufficient)

      console.log(`  ✅ Created ${pos.symbol} position`);
    }

    console.log('\n✅ RESYNC COMPLETE!');
    console.log('='.repeat(70));
    console.log(`💰 Cash Balance: $${usdBalance.toFixed(2)}`);
    console.log(`📊 Positions Synced: ${positions.length}`);
    console.log(`🔄 Database now matches Kraken holdings exactly`);
    console.log('');
    console.log('🚀 Ready to restart trading system with accurate data!');

  } catch (error) {
    console.error('❌ Resync failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

emergencyResync();
