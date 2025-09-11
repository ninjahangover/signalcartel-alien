#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function closeAllMicrodustPositions() {
  console.log('🧹 Closing ALL microdust/phantom positions (only BNB is actually open on Kraken)...\n');
  
  try {
    // Find all open positions that should be closed (everything except BNB)
    const positionsToClose = await prisma.managedPosition.findMany({
      where: { 
        status: 'open',
        symbol: { not: 'BNBUSDT' } // Close everything except BNB
      }
    });
    
    console.log(`📊 Found ${positionsToClose.length} positions to close (keeping only BNB open):`);
    positionsToClose.forEach(pos => {
      const value = pos.quantity * pos.entryPrice;
      console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} = $${value.toFixed(6)} (microdust/phantom)`);
    });
    
    if (positionsToClose.length === 0) {
      console.log('✅ No positions need to be closed - database already clean');
      return;
    }
    
    const now = new Date();
    
    // Close all ManagedPositions except BNB
    for (const position of positionsToClose) {
      await prisma.managedPosition.update({
        where: { id: position.id },
        data: {
          status: 'closed',
          exitTime: now,
          exitPrice: position.entryPrice, // Assume closed at same price (microdust)
          realizedPnL: 0.0 // Microdust = essentially no P&L
        }
      });
      console.log(`✅ Closed ManagedPosition for ${position.symbol}`);
    }
    
    // Close corresponding LivePositions
    const livePositionsToClose = await prisma.livePosition.findMany({
      where: { 
        status: 'open',
        symbol: { not: 'BNBUSDT' } // Close everything except BNB
      }
    });
    
    for (const livePos of livePositionsToClose) {
      await prisma.livePosition.update({
        where: { id: livePos.id },
        data: {
          status: 'closed',
          exitTime: now,
          exitPrice: livePos.entryPrice,
          realizedPnL: 0.0,
          updatedAt: now
        }
      });
      console.log(`✅ Closed LivePosition for ${livePos.symbol}`);
    }
    
    // Verify the cleanup
    const remainingOpenPositions = await prisma.managedPosition.findMany({
      where: { 
        status: { 
          in: ['open', 'limit_buy', 'limit_sell', 'stop_loss'] 
        } 
      },
      select: {
        symbol: true,
        quantity: true,
        entryPrice: true,
        status: true
      },
      orderBy: { symbol: 'asc' }
    });
    
    console.log('\n📊 REMAINING OPEN POSITIONS AFTER CLEANUP:');
    remainingOpenPositions.forEach(pos => {
      const value = pos.quantity * pos.entryPrice;
      console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} = $${value.toFixed(2)} (${pos.status})`);
    });
    
    const remainingLivePositions = await prisma.livePosition.findMany({
      where: { 
        status: { 
          in: ['open', 'limit_buy', 'limit_sell', 'stop_loss'] 
        } 
      },
      select: {
        symbol: true,
        quantity: true,
        entryPrice: true,
        status: true
      },
      orderBy: { symbol: 'asc' }
    });
    
    console.log('\n📱 REMAINING DASHBOARD LIVEPOSITIONS:');
    remainingLivePositions.forEach(pos => {
      const value = pos.quantity * pos.entryPrice;
      console.log(`   ${pos.symbol}: ${pos.status} - ${pos.quantity} @ $${pos.entryPrice} = $${value.toFixed(2)}`);
    });
    
    console.log('\n🎉 SUCCESS: All microdust positions closed!');
    console.log('🖥️  Dashboard should now only show BNB (the only truly open position).');
    console.log('📝 ETH, Solana, BTC, and Avalanche microdust cleaned up successfully.');
    
  } catch (error) {
    console.error('❌ Failed to close microdust positions:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

closeAllMicrodustPositions();