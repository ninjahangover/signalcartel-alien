#!/usr/bin/env npx tsx

/**
 * Warehouse OHLC Data Population Script
 *
 * Fetches real OHLC candle data from Kraken and populates the warehouse
 * MarketData table for historical backtesting and AI training.
 *
 * Features:
 * - Fetches 5-minute OHLC candles from Kraken public API
 * - Respects Kraken API rate limits (1 call per 2 seconds)
 * - Populates warehouse with proper OHLC data (not flat candles)
 * - Supports multiple trading pairs
 * - Progress tracking and error handling
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
const PAIRS_TO_FETCH = [
  'BTCUSD',   // Bitcoin
  'ETHUSD',   // Ethereum
  'AVAXUSD',  // Avalanche
  'SOLUSD',   // Solana
  'ADAUSD',   // Cardano
  'DOTUSD',   // Polkadot
  'LINKUSD',  // Chainlink
  'MATICUSD', // Polygon (if available)
  'UNIUSD',   // Uniswap
  'ATOMUSD',  // Cosmos
  'XLMUSD',   // Stellar
  'XRPUSD',   // Ripple
  'LTCUSD',   // Litecoin
  'BNBUSD',   // Binance Coin (if available on Kraken)
];

const CANDLE_INTERVAL = 5; // 5-minute candles
const LOOKBACK_DAYS = 7;   // Fetch last 7 days of data
const API_DELAY_MS = 2000; // 2 seconds between API calls to respect limits

// Map trading symbols to Kraken pair names
function mapToKrakenPair(symbol: string): string {
  const mapping: Record<string, string> = {
    'BTCUSD': 'XXBTZUSD',
    'ETHUSD': 'XETHZUSD',
    'XRPUSD': 'XXRPZUSD',
    'LTCUSD': 'XLTCZUSD',
  };
  return mapping[symbol] || symbol;
}

// Fetch OHLC data from Kraken
async function fetchKrakenOHLC(symbol: string): Promise<any[]> {
  const krakenPair = mapToKrakenPair(symbol);
  const since = Math.floor(Date.now() / 1000) - (LOOKBACK_DAYS * 24 * 60 * 60);

  try {
    console.log(`📊 Fetching OHLC for ${symbol} (Kraken: ${krakenPair})...`);

    const url = `https://api.kraken.com/0/public/OHLC?pair=${krakenPair}&interval=${CANDLE_INTERVAL}&since=${since}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error && data.error.length > 0) {
      console.error(`❌ Kraken API error for ${symbol}:`, data.error);
      return [];
    }

    if (!data.result || !data.result[krakenPair]) {
      console.warn(`⚠️  No OHLC data found for ${symbol}`);
      return [];
    }

    const candles = data.result[krakenPair];
    console.log(`✅ Fetched ${candles.length} candles for ${symbol}`);

    return candles.map((c: any[]) => ({
      symbol,
      timestamp: new Date(c[0] * 1000),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[6]),
    }));

  } catch (error: any) {
    console.error(`❌ Failed to fetch OHLC for ${symbol}:`, error.message);
    return [];
  }
}

// Store OHLC data in warehouse
async function storeOHLCData(candleData: any[]): Promise<void> {
  if (candleData.length === 0) return;

  const symbol = candleData[0].symbol;
  console.log(`💾 Storing ${candleData.length} candles for ${symbol}...`);

  let stored = 0;
  let updated = 0;
  let skipped = 0;

  for (const candle of candleData) {
    try {
      // Use upsert to avoid duplicates (based on symbol + timeframe + timestamp)
      await prisma.marketData.upsert({
        where: {
          symbol_timeframe_timestamp: {
            symbol: candle.symbol,
            timeframe: `${CANDLE_INTERVAL}m`,
            timestamp: candle.timestamp,
          }
        },
        create: {
          symbol: candle.symbol,
          timeframe: `${CANDLE_INTERVAL}m`,
          timestamp: candle.timestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        },
        update: {
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        }
      });

      // Check if it was an insert or update by querying
      const existing = await prisma.marketData.findFirst({
        where: {
          symbol: candle.symbol,
          timeframe: `${CANDLE_INTERVAL}m`,
          timestamp: candle.timestamp,
          createdAt: {
            gte: new Date(Date.now() - 1000) // Created in last second = new
          }
        }
      });

      if (existing) {
        stored++;
      } else {
        updated++;
      }

    } catch (error: any) {
      // Likely a duplicate or constraint error
      skipped++;
    }
  }

  console.log(`✅ ${symbol}: ${stored} new, ${updated} updated, ${skipped} skipped`);
}

// Main population function
async function populateWarehouse(): Promise<void> {
  console.log('🚀 Starting OHLC Warehouse Population');
  console.log('=====================================');
  console.log(`📊 Pairs to fetch: ${PAIRS_TO_FETCH.length}`);
  console.log(`⏰ Lookback period: ${LOOKBACK_DAYS} days`);
  console.log(`📈 Candle interval: ${CANDLE_INTERVAL} minutes`);
  console.log(`⏱️  API delay: ${API_DELAY_MS}ms between calls`);
  console.log('');

  let totalCandles = 0;
  let successfulPairs = 0;
  let failedPairs = 0;

  for (let i = 0; i < PAIRS_TO_FETCH.length; i++) {
    const symbol = PAIRS_TO_FETCH[i];
    console.log(`\n[${i + 1}/${PAIRS_TO_FETCH.length}] Processing ${symbol}...`);

    try {
      // Fetch OHLC data from Kraken
      const candleData = await fetchKrakenOHLC(symbol);

      if (candleData.length > 0) {
        // Store in warehouse
        await storeOHLCData(candleData);
        totalCandles += candleData.length;
        successfulPairs++;
      } else {
        failedPairs++;
      }

      // Respect API rate limits (wait between requests)
      if (i < PAIRS_TO_FETCH.length - 1) {
        console.log(`⏳ Waiting ${API_DELAY_MS}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, API_DELAY_MS));
      }

    } catch (error: any) {
      console.error(`❌ Failed to process ${symbol}:`, error.message);
      failedPairs++;
    }
  }

  console.log('\n');
  console.log('✅ OHLC Warehouse Population Complete');
  console.log('======================================');
  console.log(`📊 Total candles stored: ${totalCandles}`);
  console.log(`✅ Successful pairs: ${successfulPairs}`);
  console.log(`❌ Failed pairs: ${failedPairs}`);
  console.log('');

  // Verify warehouse data
  console.log('📊 Verifying warehouse data...');
  const stats = await prisma.marketData.groupBy({
    by: ['symbol'],
    _count: {
      symbol: true
    },
    orderBy: {
      _count: {
        symbol: 'desc'
      }
    },
    take: 10
  });

  console.log('\n📈 Top 10 pairs by candle count:');
  for (const stat of stats) {
    console.log(`   ${stat.symbol}: ${stat._count.symbol} candles`);
  }
}

// Run the population script
populateWarehouse()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
