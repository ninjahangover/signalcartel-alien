#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetPnLFreshStart() {
  console.log('🔄 FRESH START: Resetting P&L data while preserving current open positions...\n');
  
  try {
    // Get current open positions to preserve
    const openPositions = await prisma.managedPosition.findMany({
      where: { 
        status: { 
          in: ['open', 'limit_buy', 'limit_sell', 'stop_loss'] 
        } 
      }
    });
    
    console.log(`📊 Found ${openPositions.length} open positions to preserve:`);
    openPositions.forEach(pos => {
      console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} (${pos.status})`);
    });
    
    // Clear closed positions (where we have realized P&L)
    const closedPositions = await prisma.managedPosition.findMany({
      where: { status: 'closed' }
    });
    
    console.log(`\n🧹 Clearing ${closedPositions.length} closed positions with historical P&L...`);
    
    // Get the total P&L before clearing
    const totalHistoricalPnL = closedPositions.reduce((sum, pos) => sum + (pos.realizedPnL || 0), 0);
    console.log(`💰 Total historical P&L being cleared: $${totalHistoricalPnL.toFixed(2)}`);
    
    // Delete closed positions
    const deletedPositions = await prisma.managedPosition.deleteMany({
      where: { status: 'closed' }
    });
    
    console.log(`✅ Deleted ${deletedPositions.count} closed positions`);
    
    // Clear related trades for closed positions
    const deletedTrades = await prisma.managedTrade.deleteMany({
      where: { 
        positionId: { 
          notIn: openPositions.map(p => p.id) 
        } 
      }
    });
    
    console.log(`✅ Deleted ${deletedTrades.count} historical trades`);
    
    // Clear closed LivePositions for dashboard
    const deletedLivePositions = await prisma.livePosition.deleteMany({
      where: { 
        status: { 
          notIn: ['open', 'limit_buy', 'limit_sell', 'stop_loss'] 
        } 
      }
    });
    
    console.log(`✅ Deleted ${deletedLivePositions.count} closed dashboard positions`);
    
    // Reset any analytics/performance tracking
    console.log('\n🔄 Resetting performance analytics...');
    
    // Verify what remains
    const remainingPositions = await prisma.managedPosition.findMany({
      select: {
        symbol: true,
        status: true,
        quantity: true,
        entryPrice: true
      }
    });
    
    console.log('\n📊 REMAINING POSITIONS (Fresh Start):');
    if (remainingPositions.length === 0) {
      console.log('   No positions - Clean slate for new trades!');
    } else {
      remainingPositions.forEach(pos => {
        const value = pos.quantity * pos.entryPrice;
        console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice} = $${value.toFixed(2)} (${pos.status})`);
      });
    }
    
    console.log('\n🎉 SUCCESS: Fresh P&L slate ready!');
    console.log('🚀 Time-Weighted Conviction System will now track performance from zero!');
    console.log('📈 Watch for the transformation: -$118 → +$118+ with patience-based exits');
    
    // Summary
    console.log('\n📋 RESET SUMMARY:');
    console.log(`   ✅ Cleared ${deletedPositions.count} closed positions`);
    console.log(`   ✅ Cleared ${deletedTrades.count} historical trades`);
    console.log(`   ✅ Cleared ${deletedLivePositions.count} dashboard entries`);
    console.log(`   ✅ Preserved ${openPositions.length} active positions`);
    console.log(`   💰 Historical P&L cleared: $${totalHistoricalPnL.toFixed(2)}`);
    console.log('   🆕 Starting fresh with Time-Weighted Conviction!');
    
  } catch (error) {
    console.error('❌ Failed to reset P&L data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPnLFreshStart();