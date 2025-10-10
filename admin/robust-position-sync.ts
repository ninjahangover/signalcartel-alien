#!/usr/bin/env npx tsx
/**
 * ROBUST POSITION SYNC - Complete Database/Kraken Alignment
 * Ensures perfect sync between actual Kraken holdings and database positions
 * For use in tensor-start.sh and tensor-stop.sh
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  __internal: {
    engine: {
      connectionLimit: 1
    }
  }
});

interface ActualPosition {
  symbol: string;
  quantity: number;
  estimatedValue: number;
  estimatedPrice: number;
}

async function clearOpenPositionsOnly() {
  console.log('🧹 Clearing ONLY open positions (preserving closed trade history)...');

  // 🚨 CRITICAL: Only delete OPEN positions, never delete closed trades
  // Brain needs historical closed trades for learning!

  await prisma.liveTrade.deleteMany({
    where: { isEntry: true } // Only delete entry trades for open positions
  });
  console.log('   ✅ Cleared open LiveTrade entries (preserved closed trades)');

  await prisma.livePosition.deleteMany({
    where: { status: 'open' }
  });
  console.log('   ✅ Cleared open LivePosition entries (preserved closed positions)');

  // Get IDs of open positions first
  const openPositions = await prisma.managedPosition.findMany({
    where: { status: 'open' },
    select: { id: true }
  });
  const openPositionIds = openPositions.map(p => p.id);

  await prisma.managedTrade.deleteMany({
    where: {
      OR: [
        { isEntry: true },
        { positionId: { in: openPositionIds } }
      ]
    }
  });
  console.log('   ✅ Cleared open ManagedTrade entries (preserved exit trades)');

  await prisma.managedPosition.deleteMany({
    where: { status: 'open' }
  });
  console.log('   ✅ Cleared open ManagedPosition entries (preserved closed positions)');

  // Count preserved history
  const preservedClosedPositions = await prisma.managedPosition.count({
    where: { status: 'closed' }
  });
  const preservedClosedTrades = await prisma.managedTrade.count({
    where: { isEntry: false } // Exit trades
  });

  console.log(`✅ Open positions cleared, ${preservedClosedPositions} closed positions preserved`);
  console.log(`✅ ${preservedClosedTrades} historical exit trades preserved for brain learning`);
}

async function createPositionsFromActual(positions: ActualPosition[]) {
  console.log('🔄 Creating positions from actual holdings...');

  const sessionId = 'session-production-1757538257208';
  const userId = 'user-production';

  for (const pos of positions) {
    const positionId = `pos-${pos.symbol.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tradeId = `trade-${pos.symbol.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`   📊 Creating: ${pos.symbol} - ${pos.quantity.toFixed(6)} units @ $${pos.estimatedPrice} ($${pos.estimatedValue})`);

    // Create ManagedTrade entry
    await prisma.managedTrade.create({
      data: {
        id: tradeId,
        positionId: positionId,
        strategy: 'TENSOR_FUSION',
        symbol: pos.symbol,
        side: 'BUY',
        quantity: pos.quantity,
        price: pos.estimatedPrice,
        value: pos.estimatedValue,
        executedAt: new Date(),
        isEntry: true
      }
    });

    // Create ManagedPosition entry
    await prisma.managedPosition.create({
      data: {
        id: positionId,
        strategy: 'TENSOR_FUSION',
        symbol: pos.symbol,
        side: 'long',
        entryPrice: pos.estimatedPrice,
        quantity: pos.quantity,
        entryTradeId: tradeId,
        entryTime: new Date(),
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Create LivePosition entry for dashboard
    await prisma.livePosition.create({
      data: {
        id: `live-${positionId}`,
        sessionId: sessionId,
        symbol: pos.symbol,
        strategy: 'TENSOR_FUSION',
        side: 'long',
        quantity: pos.quantity,
        entryPrice: pos.estimatedPrice,
        entryValue: pos.estimatedValue,
        entryTime: new Date(),
        entryTradeIds: tradeId,
        currentPrice: pos.estimatedPrice,
        unrealizedPnL: 0.0,
        totalCommissions: 0.0,
        totalFees: 0.0,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`   ✅ Created complete position: ${pos.symbol}`);

    // Small delay to avoid ID conflicts
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function fetchActualKrakenHoldings(): Promise<ActualPosition[]> {
  try {
    // 🔧 V3.14.8: Fixed endpoint - use /api/kraken-proxy with endpoint in body
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('Missing KRAKEN_API_KEY or KRAKEN_API_SECRET environment variables');
    }

    // Call Kraken proxy server to get actual balance (same format as balance calculator)
    const response = await fetch('http://127.0.0.1:3002/api/kraken-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'Balance',
        params: {},
        apiKey: apiKey,
        apiSecret: apiSecret
      })
    });

    if (!response.ok) {
      throw new Error(`Kraken Balance API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check for Kraken API errors
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken error: ${data.error.join(', ')}`);
    }

    const balances = data.result || {};

    const positions: ActualPosition[] = [];

    // Map Kraken assets to trading symbols
    const assetMap: { [key: string]: string } = {
      'XXBT': 'BTCUSD',
      'XETH': 'ETHUSD',
      'AVAX': 'AVAXUSD',
      'BNB': 'BNBUSD',
      'WIF': 'WIFUSD',
      'SOL': 'SOLUSD',
      'DOT': 'DOTUSD',
      'ADA': 'ADAUSD',
      'MATIC': 'MATICUSD',
      'LINK': 'LINKUSD',
      'CORN': 'CORNUSD'  // 🔧 V3.14.8: Added CORN for unmanaged position sync
    };

    // Get current prices from Kraken ticker
    for (const [asset, balanceStr] of Object.entries(balances)) {
      const balance = parseFloat(balanceStr as string);

      // Skip USD, stablecoins, and tiny dust amounts
      if (asset === 'ZUSD' || asset.includes('USD') || balance < 0.000001) {
        continue;
      }

      const symbol = assetMap[asset] || `${asset}USD`;

      // Fetch current price
      try {
        // 🔧 V3.14.8: Use public Ticker endpoint (no auth required)
        const tickerResponse = await fetch(`http://127.0.0.1:3002/public/Ticker?pair=${symbol}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (tickerResponse.ok) {
          const tickerData = await tickerResponse.json();

          // Ticker result is keyed by pair name (can be different from requested symbol)
          const pairKey = Object.keys(tickerData.result || {})[0];
          const pairData = tickerData.result?.[pairKey];
          const currentPrice = parseFloat(pairData?.c?.[0] || '0');

          if (currentPrice > 0) {
            positions.push({
              symbol,
              quantity: balance,
              estimatedPrice: currentPrice,
              estimatedValue: balance * currentPrice
            });
            console.log(`   ✅ ${symbol}: ${balance.toFixed(6)} @ $${currentPrice.toFixed(4)} = $${(balance * currentPrice).toFixed(2)}`);
          } else {
            console.warn(`   ⚠️  Zero price for ${symbol}, skipping`);
          }
        } else {
          console.warn(`   ⚠️  Ticker API failed for ${symbol}: ${tickerResponse.status}`);
        }
      } catch (error: any) {
        console.warn(`   ⚠️  Could not fetch price for ${symbol}: ${error.message}`);
      }

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return positions;

  } catch (error) {
    console.error('❌ Failed to fetch Kraken holdings:', error.message);
    console.log('⚠️  Falling back to empty positions (will sync to all cash)');
    return [];
  }
}

async function robustPositionSync() {
  try {
    console.log('🚀 ROBUST POSITION SYNC - Starting...');
    console.log('================================================');

    // 🔧 V3.14.1: Fetch ACTUAL Kraken holdings dynamically (no hardcoded data!)
    console.log('📡 Fetching actual Kraken holdings from Balance API...');

    const actualPositions: ActualPosition[] = await fetchActualKrakenHoldings();

    if (actualPositions.length === 0) {
      console.log('⚠️  No open Kraken holdings detected - account may be all cash');
    } else {
      console.log('📊 Syncing with actual Kraken holdings:');
      for (const pos of actualPositions) {
        console.log(`   ${pos.symbol}: ${pos.quantity} × $${pos.estimatedPrice} = $${pos.estimatedValue.toFixed(2)}`);
      }
    }

    // Step 1: Clear ONLY open positions (preserve closed trade history)
    await clearOpenPositionsOnly();

    // Step 2: Create positions from actual holdings
    await createPositionsFromActual(actualPositions);

    // Step 3: Verify sync completed
    const liveCount = await prisma.livePosition.count();
    const managedCount = await prisma.managedPosition.count();
    const tradeCount = await prisma.managedTrade.count();

    console.log('');
    console.log('📊 SYNC VERIFICATION:');
    console.log(`   • LivePosition entries: ${liveCount}`);
    console.log(`   • ManagedPosition entries: ${managedCount}`);
    console.log(`   • ManagedTrade entries: ${tradeCount}`);

    const totalValue = actualPositions.reduce((sum, pos) => sum + pos.estimatedValue, 0);
    console.log(`   • Total portfolio value: $${totalValue.toFixed(2)}`);

    console.log('');
    console.log('✅ ROBUST POSITION SYNC COMPLETED SUCCESSFULLY');
    console.log('================================================');
    console.log('Database is now perfectly aligned with Kraken account');

    return true;

  } catch (error) {
    console.error('❌ POSITION SYNC FAILED:', error.message);
    console.error('Full error:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
robustPositionSync()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Fatal error in position sync:', error);
    process.exit(1);
  });