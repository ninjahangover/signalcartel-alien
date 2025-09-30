#!/usr/bin/env npx tsx

/**
 * Manual position adjustment script for profit taking and loss cutting
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function adjustPositions() {
  console.log('🎯 MANUAL POSITION ADJUSTMENT SCRIPT');
  console.log('=====================================');

  try {
    // Use Kraken proxy for API calls
    const PROXY_URL = 'http://localhost:3002/api/kraken';

    // Get current positions from database
    const positions = await prisma.livePosition.findMany({
      where: { status: 'open' },
      orderBy: { unrealizedPnL: 'desc' }
    });

    console.log(`\n📊 Current Open Positions:`);
    positions.forEach(pos => {
      console.log(`   ${pos.symbol}: ${pos.quantity} @ ${pos.entryPrice} | P&L: $${pos.unrealizedPnL?.toFixed(2)}`);
    });

    // 1. PARTIAL PROFIT TAKING: Close 30% of BNBUSD
    const bnbPosition = positions.find(p => p.symbol === 'BNBUSD');
    if (bnbPosition) {
      const closeQuantity = Number((bnbPosition.quantity * 0.3).toFixed(4));
      console.log(`\n💰 PROFIT TAKING: Closing 30% of BNBUSD (${closeQuantity} BNB)`);

      try {
        const orderResult = await axios.post(`${PROXY_URL}/AddOrder`, {
          pair: 'BNBUSD',
          type: 'sell',
          ordertype: 'market',
          volume: closeQuantity.toString()
        });

        const result = orderResult.data;
        if (result.error && result.error.length > 0) {
          console.log(`   ❌ Order failed: ${result.error.join(', ')}`);
        } else {
          console.log(`   ✅ Partial close order placed: ${JSON.stringify(result.result)}`);

          // Update position in database
          await prisma.livePosition.update({
            where: { id: bnbPosition.id },
            data: {
              quantity: bnbPosition.quantity - closeQuantity,
              positionNotes: `Partial profit taken: ${closeQuantity} BNB @ market`
            }
          });
        }
      } catch (error) {
        console.log(`   ❌ Error closing BNBUSD: ${error.message}`);
      }
    }

    // 2. LOSS CUTTING: Close 100% of DOTUSD
    const dotPosition = positions.find(p => p.symbol === 'DOTUSD');
    if (dotPosition) {
      console.log(`\n✂️ LOSS CUTTING: Closing 100% of DOTUSD (${dotPosition.quantity} DOT)`);

      try {
        const orderResult = await axios.post(`${PROXY_URL}/AddOrder`, {
          pair: 'DOTUSD',
          type: 'sell',
          ordertype: 'market',
          volume: dotPosition.quantity.toString()
        });

        const result = orderResult.data;
        if (result.error && result.error.length > 0) {
          console.log(`   ❌ Order failed: ${result.error.join(', ')}`);
        } else {
          console.log(`   ✅ Loss cut order placed: ${JSON.stringify(result.result)}`);

          // Update position in database
          await prisma.livePosition.update({
            where: { id: dotPosition.id },
            data: {
              status: 'closed',
              exitTime: new Date(),
              exitPrice: dotPosition.currentPrice,
              realizedPnL: dotPosition.unrealizedPnL,
              positionNotes: `Loss cut at -${Math.abs(dotPosition.unrealizedPnL || 0).toFixed(2)}`
            }
          });
        }
      } catch (error) {
        console.log(`   ❌ Error closing DOTUSD: ${error.message}`);
      }
    }

    // Get account balance to show freed capital
    try {
      const balance = await axios.post(`${PROXY_URL}/TradeBalance`, {});
      console.log(`\n💵 Available Capital: $${balance.data.result?.free_margin || 'Unknown'}`);
    } catch (error) {
      console.log(`\n⚠️ Could not fetch balance: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the adjustment
adjustPositions()
  .then(() => console.log('\n✅ Position adjustment complete'))
  .catch(err => console.error('❌ Fatal error:', err));