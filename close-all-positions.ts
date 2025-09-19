/**
 * POSITION CLOSURE SCRIPT
 * Closes all existing positions (ADA, AVAX, BNB, SOL, ETH, BTC) to USD
 * Frees up capital for unified trading system fresh start
 */

import { PrismaClient } from '@prisma/client';
import { krakenApiService } from './src/lib/kraken-api-service';

const prisma = new PrismaClient();

async function closeAllPositions() {
  console.log('🔄 CLOSING ALL POSITIONS: Converting 6 positions to USD for fresh start...');

  try {
    // Get all open positions from database
    const openPositions = await prisma.managedPosition.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Found ${openPositions.length} open positions to close`);

    // Target symbols to close
    const targetSymbols = ['ADAUSD', 'AVAXUSD', 'BNBUSD', 'SOLUSD', 'ETHUSD', 'BTCUSD'];

    for (const position of openPositions) {
      if (targetSymbols.includes(position.symbol)) {
        console.log(`💰 Closing ${position.symbol}: ${position.quantity} @ $${position.entryPrice}`);

        try {
          // Place market sell order to close position
          const orderResult = await krakenApiService.placeOrder({
            symbol: position.symbol,
            side: 'sell', // Selling to convert to USD
            type: 'market',
            quantity: position.quantity,
            leverage: 'none'
          });

          if (orderResult.success) {
            console.log(`✅ Successfully closed ${position.symbol} - Order ID: ${orderResult.orderId}`);

            // Update database position status
            await prisma.managedPosition.update({
              where: { id: position.id },
              data: {
                status: 'closed',
                closedAt: new Date(),
                metadata: {
                  closureType: 'unified_system_reset',
                  closureOrderId: orderResult.orderId,
                  closedAt: new Date()
                }
              }
            });

            // Small delay between orders for API compliance
            await new Promise(resolve => setTimeout(resolve, 2000));

          } else {
            console.error(`❌ Failed to close ${position.symbol}:`, orderResult.error);
          }

        } catch (error) {
          console.error(`💥 Error closing ${position.symbol}:`, error.message);
        }
      }
    }

    // Check final account balance
    console.log('\n💰 Checking final account balance...');
    const balanceResult = await krakenApiService.getAccountBalance();

    if (balanceResult.success) {
      console.log('📊 FINAL ACCOUNT BALANCE:');
      Object.entries(balanceResult.balances).forEach(([asset, balance]) => {
        if (parseFloat(balance as string) > 0.001) {
          console.log(`   ${asset}: ${balance}`);
        }
      });
    }

    console.log('\n🎯 POSITION CLOSURE COMPLETE - Ready for unified system fresh start!');

  } catch (error) {
    console.error('❌ Position closure failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

closeAllPositions();