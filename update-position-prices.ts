#!/usr/bin/env npx tsx

/**
 * Real-time Position Price Update Service
 * Updates current prices and unrealized P&L for open positions
 * Now with Adaptive Learning feedback integration
 */

import { PrismaClient } from '@prisma/client';
import { adaptiveProfitBrain } from './src/lib/adaptive-profit-brain';

const prisma = new PrismaClient();

interface PriceData {
  symbol: string;
  price: number;
  timestamp: Date;
}

async function getCurrentPrices(symbols: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  for (const symbol of symbols) {
    try {
      // Use Kraken public API directly for price data
      const krakenSymbol = symbol.replace('USD', '/USD'); // Convert BTCUSD to BTC/USD
      const response = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${krakenSymbol}`);
      const data = await response.json();

      if (data.result && Object.keys(data.result).length > 0) {
        const tickerKey = Object.keys(data.result)[0];
        const tickerData = data.result[tickerKey];
        const price = parseFloat(tickerData.c[0]); // Last price

        prices.set(symbol, price);
        console.log(`✅ ${symbol}: $${price.toFixed(4)}`);
      } else {
        console.log(`⚠️ ${symbol}: No price data available`);
      }
    } catch (error) {
      console.log(`❌ ${symbol}: Error fetching price - ${error.message}`);
    }

    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return prices;
}

async function updatePositionPrices() {
  console.log('🔄 Starting position price update...');

  try {
    // Get all open positions
    const openPositions = await prisma.livePosition.findMany({
      where: { status: 'open' },
      select: { id: true, symbol: true, side: true, quantity: true, entryPrice: true }
    });

    if (openPositions.length === 0) {
      console.log('📊 No open positions to update');
      return;
    }

    console.log(`📊 Found ${openPositions.length} open positions to update`);

    // Get unique symbols
    const symbols = [...new Set(openPositions.map(pos => pos.symbol))];
    console.log(`💱 Fetching prices for: ${symbols.join(', ')}`);

    // Fetch current prices
    const currentPrices = await getCurrentPrices(symbols);

    // Update each position
    for (const position of openPositions) {
      const currentPrice = currentPrices.get(position.symbol);

      if (!currentPrice) {
        console.log(`⏭️ Skipping ${position.symbol} - no current price`);
        continue;
      }

      // Calculate unrealized P&L
      const priceDiff = currentPrice - position.entryPrice;
      const unrealizedPnL = position.side === 'long'
        ? priceDiff * position.quantity
        : -priceDiff * position.quantity;

      // Calculate holding hours
      const entryTime = new Date(position['entryTime' as keyof typeof position] || Date.now());
      const holdingHours = (Date.now() - entryTime.getTime()) / (1000 * 60 * 60);

      // Record significant P&L changes for adaptive learning (>$5 movement or position closed)
      const positionValue = position.quantity * position.entryPrice;
      const returnPercent = (unrealizedPnL / positionValue) * 100;

      if (Math.abs(unrealizedPnL) > 5.0) {
        try {
          // Get real historical data from AdaptiveLearningPerformance for this symbol
          const symbolPerf = await prisma.adaptiveLearningPerformance.findUnique({
            where: {
              category_symbol: {
                category: position.side,
                symbol: position.symbol
              }
            }
          });

          // Use real data from database, no hardcoded fallbacks for learning
          const expectedReturn = symbolPerf?.avgPnL || returnPercent; // Use actual avg or current
          const winProbability = symbolPerf?.accuracy || (unrealizedPnL > 0 ? 1.0 : 0.0); // Real accuracy or actual outcome
          const convictionLevel = symbolPerf?.confidence || 0.5; // Real confidence or neutral

          await adaptiveProfitBrain.recordTradeOutcome({
            symbol: position.symbol,
            expectedReturn: expectedReturn,
            actualReturn: returnPercent,
            winProbability: winProbability,
            actualWin: unrealizedPnL > 0,
            decisionFactors: {
              timeHeld: holdingHours,
              marketRegime: 'normal',
              convictionLevel: convictionLevel,
              opportunityCost: 0,
              rotationScore: symbolPerf?.recentStreak || 0
            },
            profitImpact: unrealizedPnL,
            timestamp: new Date()
          });

          if (Math.abs(returnPercent) > 10) {
            console.log(`🧠 Adaptive Learning: Recorded ${position.symbol} outcome (${returnPercent.toFixed(1)}% return, $${unrealizedPnL.toFixed(2)} P&L) [${symbolPerf ? 'historical data' : 'live data'}]`);
          }
        } catch (error) {
          // Don't fail position update if learning fails
          console.error(`⚠️ Adaptive learning recording failed for ${position.symbol}:`, error.message);
        }
      }

      // Update position
      await prisma.livePosition.update({
        where: { id: position.id },
        data: {
          currentPrice: currentPrice,
          unrealizedPnL: unrealizedPnL,
          updatedAt: new Date()
        }
      });

      const pnlColor = unrealizedPnL >= 0 ? '💚' : '🔴';
      console.log(`${pnlColor} ${position.symbol}: $${position.entryPrice.toFixed(4)} → $${currentPrice.toFixed(4)} | P&L: $${unrealizedPnL.toFixed(2)}`);
    }

    // Calculate total unrealized P&L
    const totalUnrealized = await prisma.livePosition.aggregate({
      where: { status: 'open' },
      _sum: { unrealizedPnL: true }
    });

    console.log(`\n📈 POSITION UPDATE COMPLETE:`);
    console.log(`   Positions updated: ${openPositions.length}`);
    console.log(`   Total unrealized P&L: $${(totalUnrealized._sum.unrealizedPnL || 0).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Position update failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run continuous updates if script is executed directly
if (require.main === module) {
  console.log('🚀 Starting real-time position price update service...');

  // Update immediately
  updatePositionPrices()
    .then(() => {
      console.log('✅ Initial position update completed');

      // Set up periodic updates every 60 seconds
      setInterval(() => {
        updatePositionPrices().catch(error => {
          console.error('🚨 Scheduled update failed:', error);
        });
      }, 60000);

      console.log('🔄 Scheduled updates every 60 seconds');
    })
    .catch((error) => {
      console.error('💥 Initial update failed:', error);
      process.exit(1);
    });
}

export { updatePositionPrices };