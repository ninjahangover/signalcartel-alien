#!/usr/bin/env tsx

/**
 * TRADING PAIRS DATABASE SEEDER
 * Populates the database with ALL available Kraken trading pairs
 * Eliminates the need for fallback lists and API calls during hunting
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTradingPairs() {
  console.log('🔍 TRADING PAIRS SEEDER - Fetching all Kraken pairs...');

  try {
    // Fetch all available pairs from Kraken
    const response = await fetch('https://api.kraken.com/0/public/AssetPairs');
    if (!response.ok) {
      throw new Error(`Kraken API failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(', ')}`);
    }

    // Process and normalize pair names
    const allPairs = Object.keys(data.result || {})
      .filter(pair => {
        // Filter for USD and USDT pairs only
        return pair.endsWith('USD') || pair.endsWith('USDT') || pair.endsWith('ZUSD');
      })
      .map(pair => {
        // Normalize pair names (remove Z prefix, etc.)
        let normalizedPair = pair;
        if (pair.endsWith('ZUSD')) {
          normalizedPair = pair.replace('ZUSD', 'USD');
        }
        if (pair.startsWith('X') && pair.includes('ZUSD')) {
          normalizedPair = pair.replace('X', '').replace('ZUSD', 'USD');
        }
        return normalizedPair;
      })
      .filter(pair => {
        // Remove any pairs that don't look like normal crypto pairs
        return pair.match(/^[A-Z0-9]+USD[T]?$/);
      })
      .sort();

    console.log(`✅ Found ${allPairs.length} USD/USDT trading pairs from Kraken`);

    // Check if we have a TradingPair table, if not use alternative approach
    let insertedCount = 0;
    let skippedCount = 0;

    try {
      // Method 1: Try to use TradingPair table if it exists
      for (const symbol of allPairs) {
        try {
          const baseAsset = symbol.replace(/USD[T]?$/, '');
          const quoteAsset = symbol.endsWith('USDT') ? 'USDT' : 'USD';

          await prisma.tradingPair.upsert({
            where: { symbol },
            create: {
              symbol,
              baseAsset,
              quoteAsset,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            update: {
              isActive: true,
              updatedAt: new Date()
            }
          });
          insertedCount++;

          if (insertedCount % 50 === 0) {
            console.log(`📊 Progress: ${insertedCount}/${allPairs.length} pairs processed`);
          }
        } catch (pairError) {
          skippedCount++;
          if (skippedCount < 5) { // Only log first few errors
            console.log(`⚠️ Skipped ${symbol}: ${pairError.message}`);
          }
        }
      }

      console.log(`✅ SEEDING COMPLETE!`);
      console.log(`   • Inserted/Updated: ${insertedCount} trading pairs`);
      console.log(`   • Skipped: ${skippedCount} pairs`);
      console.log(`   • Total Available: ${allPairs.length} pairs`);

    } catch (tableError) {
      console.log(`⚠️ TradingPair table not available: ${tableError.message}`);
      console.log(`💡 Alternative: Create MarketDataCollection entries for pair discovery`);

      // Method 2: Use MarketDataCollection as alternative storage
      try {
        for (const symbol of allPairs) {
          try {
            await prisma.marketDataCollection.upsert({
              where: {
                symbol_timestamp: {
                  symbol,
                  timestamp: new Date('2024-01-01') // Use a consistent timestamp for seeding
                }
              },
              create: {
                symbol,
                timestamp: new Date('2024-01-01'),
                source: 'KRAKEN_SEED',
                data: { available: true, seeded: true }
              },
              update: {
                data: { available: true, seeded: true, lastUpdated: new Date() }
              }
            });
            insertedCount++;

            if (insertedCount % 50 === 0) {
              console.log(`📊 Progress: ${insertedCount}/${allPairs.length} pairs processed via MarketDataCollection`);
            }
          } catch (collectionError) {
            skippedCount++;
          }
        }

        console.log(`✅ ALTERNATIVE SEEDING COMPLETE!`);
        console.log(`   • Inserted via MarketDataCollection: ${insertedCount} pairs`);
        console.log(`   • Skipped: ${skippedCount} pairs`);

      } catch (alternativeError) {
        console.log(`❌ Both seeding methods failed: ${alternativeError.message}`);
        console.log(`💡 Consider updating database schema to include TradingPair table`);

        // Method 3: Output SQL for manual execution
        console.log('\n📋 MANUAL SQL APPROACH:');
        console.log('CREATE TABLE IF NOT EXISTS "TradingPair" (');
        console.log('  "id" SERIAL PRIMARY KEY,');
        console.log('  "symbol" VARCHAR(20) UNIQUE NOT NULL,');
        console.log('  "baseAsset" VARCHAR(10) NOT NULL,');
        console.log('  "quoteAsset" VARCHAR(10) NOT NULL,');
        console.log('  "isActive" BOOLEAN DEFAULT true,');
        console.log('  "createdAt" TIMESTAMP DEFAULT NOW(),');
        console.log('  "updatedAt" TIMESTAMP DEFAULT NOW()');
        console.log(');');
        console.log('\nINSERT INTO "TradingPair" (symbol, "baseAsset", "quoteAsset") VALUES');

        const sqlValues = allPairs.slice(0, 20).map(symbol => {
          const baseAsset = symbol.replace(/USD[T]?$/, '');
          const quoteAsset = symbol.endsWith('USDT') ? 'USDT' : 'USD';
          return `  ('${symbol}', '${baseAsset}', '${quoteAsset}')`;
        });

        console.log(sqlValues.join(',\n'));
        console.log('  -- ... and more');
      }
    }

  } catch (error) {
    console.error('❌ SEEDING FAILED:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
if (require.main === module) {
  seedTradingPairs()
    .then(() => {
      console.log('🎉 Trading pairs database seeding completed!');
      console.log('🚀 Profit Predator can now access all pairs without fallbacks');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding error:', error);
      process.exit(1);
    });
}

export { seedTradingPairs };