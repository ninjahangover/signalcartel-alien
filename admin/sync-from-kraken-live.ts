/**
 * V3.14.3 CRITICAL FIX: Sync database from ACTUAL Kraken API
 *
 * User feedback: "not sure why you don't query the actual kraken api for balances and positions"
 * CORRECT - Kraken API is primary source of truth, database is secondary
 */

import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function syncFromKrakenAPI() {
  console.log('🔄 V3.14.3: Syncing database from ACTUAL Kraken API');
  console.log('='.repeat(60));

  try {
    // Step 1: Get actual balance from Kraken
    console.log('\n📊 Step 1: Fetching ACTUAL balance from Kraken API...');

    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('Missing KRAKEN_API_KEY or KRAKEN_API_SECRET');
    }

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

    if (!balanceResponse.ok) {
      throw new Error(`Balance API failed: ${balanceResponse.statusText}`);
    }

    const balanceData = await balanceResponse.json();
    console.log('✅ Balance response:', JSON.stringify(balanceData, null, 2));

    if (balanceData.error && balanceData.error.length > 0) {
      throw new Error(`Kraken error: ${balanceData.error.join(', ')}`);
    }

    const balances = balanceData.result || {};
    const usdBalance = parseFloat(balances['ZUSD'] || balances['USD'] || '0');
    console.log(`💰 Actual USD Cash: $${usdBalance.toFixed(2)}`);

    // Step 2: Get actual open positions from Kraken
    console.log('\n📊 Step 2: Fetching ACTUAL positions from Kraken API...');
    const positions: any[] = [];
    let totalPositionValue = 0;

    for (const [asset, balanceStr] of Object.entries(balances)) {
      const balance = parseFloat(balanceStr as string);

      // Skip USD and very small balances
      if (asset.includes('USD') || balance < 0.0001) continue;

      // Clean asset name
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
          totalPositionValue += value;

          positions.push({
            symbol,
            quantity: balance,
            currentPrice,
            value
          });

          console.log(`  • ${symbol}: ${balance.toFixed(6)} @ $${currentPrice.toFixed(4)} = $${value.toFixed(2)}`);
        }
      } catch (err) {
        console.log(`  ⚠️ Could not get price for ${symbol}:`, err.message);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n💼 Total Position Value: $${totalPositionValue.toFixed(2)}`);
    console.log(`💰 Total Account Value: $${(usdBalance + totalPositionValue).toFixed(2)}`);

    // Step 3: Compare with database
    console.log('\n📊 Step 3: Comparing with database...');
    const dbPositions = await prisma.managedPosition.findMany({
      where: { status: 'open' }
    });

    console.log(`  Database shows: ${dbPositions.length} open positions`);
    console.log(`  Kraken shows: ${positions.length} actual holdings`);

    if (dbPositions.length !== positions.length) {
      console.log(`  ⚠️ MISMATCH: Database and Kraken are out of sync!`);
    }

    // Step 4: Show what needs to be fixed
    console.log('\n🔧 Step 4: Recommended actions:');

    if (positions.length === 0) {
      console.log('  1. Clear all open positions from database (none exist on Kraken)');
      console.log('  2. Update available balance to $' + usdBalance.toFixed(2));
    } else {
      console.log('  1. Clear current database positions');
      console.log('  2. Create positions matching Kraken holdings:');
      for (const pos of positions) {
        console.log(`     • ${pos.symbol}: ${pos.quantity} @ $${pos.currentPrice}`);
      }
    }

    console.log('\n✅ Sync analysis complete!');
    console.log('   Actual Balance: $' + usdBalance.toFixed(2));
    console.log('   Cached/DB may be wrong - USE KRAKEN AS SOURCE OF TRUTH');

  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncFromKrakenAPI();
